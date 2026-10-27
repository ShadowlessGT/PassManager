#!/usr/bin/env python3
"""Parola website deployment: verified FTPS + incremental SHA-256 release manifests.

No additional Python packages required. No deletion of remote files.
The manifest is the single source of truth for the last completed deployment.
"""
from __future__ import annotations

import argparse
import ftplib
import hashlib
import io
import json
from pathlib import Path
import socket
import ssl
import sys

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / "deploy.local.env"
DIST = ROOT / "site-dist"
MANIFEST = "parola-deploy-manifest.json"
APP = "parola"
SCHEMA = 1
MAX_REMOTE_MANIFEST_BYTES = 2_000_000


def load_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}
    result = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        result[key.strip()] = value.strip().strip('"').strip("'")
    return result


def check_target(value: str) -> str:
    target = value.strip().replace("\\", "/").strip("/")
    parts = target.split("/")
    if (not target or target in {".", "public_html"} or
            any(part in {"", ".", ".."} for part in parts) or
            "parola" not in target.lower()):
        raise ValueError(
            "HOSTINGER_FTP_TARGET muss das geprüfte Parola-Verzeichnis sein; "
            "keine fremden Website-Roots oder relativen Umwege."
        )
    return target


def build_manifest(directory: Path = DIST, root: Path = ROOT) -> dict:
    if not (directory / "index.html").is_file() or not (directory / "delete-account.html").is_file():
        raise RuntimeError("Website-Build fehlt. Erst npm run build:site ausführen.")
    files = {}
    for path in sorted(directory.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(directory).as_posix()
        if relative == MANIFEST:
            continue
        if any(p in {"", ".", ".."} for p in relative.split("/")):
            raise RuntimeError("Ungültiger Website-Dateiname: " + relative)
        data = path.read_bytes()
        files[relative] = {"sha256": hashlib.sha256(data).hexdigest(), "size": len(data)}
    version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
    digest_source = json.dumps({"version": version, "files": files}, sort_keys=True, separators=(",", ":"))
    release = hashlib.sha256(digest_source.encode("utf-8")).hexdigest()[:16]
    return {"schema": SCHEMA, "application": APP, "version": version,
            "releaseId": release, "files": files}


def encoded_manifest(manifest: dict) -> bytes:
    return (json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def compare(local: dict, remote: dict | None) -> tuple[list[str], list[str], bool]:
    previous = remote.get("files", {}) if remote else {}
    changed = [name for name, info in local["files"].items()
               if previous.get(name) != info]
    unchanged = [name for name in local["files"] if name not in changed]
    metadata_changed = not remote or any(
        local[key] != remote.get(key) for key in ("version", "releaseId", "files")
    )
    return changed, unchanged, metadata_changed


def sorted_uploads(changed: list[str]) -> list[str]:
    # Upload hashed/immutable assets first, then pages, then index.html last.
    return sorted(changed, key=lambda name: (0 if name.startswith("assets/") else
                                             2 if name == "index.html" else 1, name))


def read_remote_file(ftp: ftplib.FTP, name: str, max_bytes: int) -> bytes:
    buf = io.BytesIO()
    def append(chunk: bytes) -> None:
        if buf.tell() + len(chunk) > max_bytes:
            raise RuntimeError(f"Remote file too large: {name}")
        buf.write(chunk)
    ftp.retrbinary("RETR " + name, append)
    return buf.getvalue()


def read_manifest(ftp: ftplib.FTP) -> dict | None:
    try:
        data = read_remote_file(ftp, MANIFEST, MAX_REMOTE_MANIFEST_BYTES)
    except ftplib.error_perm as error:
        if str(error).startswith("550"):
            return None  # First deployment, with no existing manifest.
        raise
    try:
        result = json.loads(data)
        if (not isinstance(result, dict) or result.get("schema") != SCHEMA or
                result.get("application") != APP or
                not isinstance(result.get("files"), dict)):
            raise ValueError("unexpected manifest schema or app")
        for name, item in result["files"].items():
            if (not isinstance(name, str) or name.startswith("/") or
                    any(p in {"", ".", ".."} for p in name.split("/")) or
                    not isinstance(item, dict) or not isinstance(item.get("sha256"), str) or
                    not isinstance(item.get("size"), int)):
                raise ValueError("invalid manifest entry")
        return result
    except (json.JSONDecodeError, ValueError) as error:
        raise RuntimeError(
            "Remote-Versionsdatei ist ungültig. Upload gestoppt, um "
            "keine falschen Dateien zu überschreiben."
        ) from error


def goto_target(ftp: ftplib.FTP, target: str) -> str:
    for part in target.split("/"):
        ftp.cwd(part)  # Only enter an existing, explicitly configured directory.
    return ftp.pwd()


def ftp_client(host: str, port: int, protocol: str, env: dict) -> ftplib.FTP:
    if protocol not in {"ftps", "ftps-legacy", "ftp"}:
        raise RuntimeError("Ungültiges FTP-Protokoll.")
    if protocol == "ftp" and env.get("HOSTINGER_ALLOW_INSECURE_FTP") != "true":
        raise RuntimeError("Unverschlüsseltes FTP blockiert. FTPS verwenden.")
    if protocol == "ftp":
        return ftplib.FTP(timeout=30)
    ctx = ssl.create_default_context()
    if protocol == "ftps":
        return ftplib.FTP_TLS(context=ctx, timeout=30)
    return ImplicitFTP_TLS(context=ctx, timeout=30)


class ImplicitFTP_TLS(ftplib.FTP_TLS):
    """Optional implicit TLS; only for verified hostnames on the correct port."""
    def connect(self, host="", port=0, timeout=-999, source_address=None):
        if host:
            self.host = host
        if port:
            self.port = port
        if timeout != -999:
            self.timeout = timeout
        if source_address is not None:
            self.source_address = source_address
        self.sock = socket.create_connection(
            (self.host, self.port), self.timeout, source_address=self.source_address
        )
        self.af = self.sock.family
        self.sock = self.context.wrap_socket(self.sock, server_hostname=self.host)
        self.file = self.sock.makefile("r", encoding=self.encoding)
        self.welcome = self.getresp()
        return self.welcome


def ftp_connect(ftp: ftplib.FTP, host: str, port: int, user: str,
                password: str, protocol: str) -> None:
    try:
        ftp.connect(host, port)
        if protocol == "ftps-legacy":
            ftplib.FTP.login(ftp, user, password)
        else:
            ftp.login(user, password)
        if isinstance(ftp, ftplib.FTP_TLS):
            ftp.prot_p()
        ftp.set_pasv(True)
    except ssl.SSLCertVerificationError as error:
        raise RuntimeError(
            "FTPS-Zertifikat stimmt nicht mit HOSTINGER_FTP_HOST überein. "
            f"Host: {host}. Die TLS-Prüfung bleibt aktiv. "
            "Bitte in Hostinger hPanel > Websites > Dashboard > "
            "Plan Details / Dateien > FTP Accounts den OFFIZIELLEN "
            "Server-Hostnamen (ggf. *.hstgr.io) nachschlagen und "
            "HOSTINGER_FTP_HOST entsprechend ändern. "
            "Nicht auf unverschlüsseltes FTP umstellen. "
            f"Details: {error}"
        ) from error


def upload(ftp: ftplib.FTP, target_root: str,
           local: dict, remote: dict | None, directory: Path = DIST) -> tuple[int, int]:
    changed, unchanged, manifest_changed = compare(local, remote)
    print(f"Aktueller Stand: {remote.get('version','unbekannt') if remote else 'kein Manifest'}"
          f" -> {local['version']} ({local['releaseId']})")
    print(f"Neu/geändert: {len(changed)} | unverändert: {len(unchanged)}")
    if not manifest_changed:
        print("Alles aktuell. Kein Upload notwendig.")
        return 0, len(unchanged)
    for name in sorted_uploads(changed):
        path = directory.joinpath(*name.split("/"))
        if not path.is_file():
            raise RuntimeError("Fehlende lokale Datei: " + name)
        parts = name.split("/")
        ftp.cwd(target_root)
        for part in parts[:-1]:
            try:
                ftp.cwd(part)
            except ftplib.error_perm:
                ftp.mkd(part)
                ftp.cwd(part)
        # Replaced only if the SHA-256 has actually changed.
        with path.open("rb") as handle:
            ftp.storbinary("STOR " + parts[-1], handle)
        # Verify bytes retrieved from the server; do not commit a manifest if corrupt.
        received = read_remote_file(ftp, parts[-1], local["files"][name]["size"] + 1)
        if hashlib.sha256(received).hexdigest() != local["files"][name]["sha256"]:
            raise RuntimeError("Remote-Dateiprüfung fehlgeschlagen: " + name)
        print("Aktualisiert: " + name)
    ftp.cwd(target_root)
    data = encoded_manifest(local)
    # Keep immutable historical versions for diagnostics/recovery.
    try:
        ftp.cwd("deploy-history")
    except ftplib.error_perm:
        ftp.mkd("deploy-history")
        ftp.cwd("deploy-history")
    historic_name = f"v{local['version']}-{local['releaseId']}.json"
    ftp.storbinary("STOR " + historic_name, io.BytesIO(data))
    ftp.cwd(target_root)
    # The main version file is written LAST, after all file verifications.
    ftp.storbinary("STOR " + MANIFEST, io.BytesIO(data))
    if read_remote_file(ftp, MANIFEST, MAX_REMOTE_MANIFEST_BYTES) != data:
        raise RuntimeError("Remote-Versionsdatei konnte nicht bestätigt werden.")
    print(f"Deploy erfolgreich: {len(changed)} geänderte Dateien, "
          f"{len(unchanged)} unverändert; Versionsdatei zuletzt aktualisiert.")
    return len(changed), len(unchanged)


def main() -> int:
    parser = argparse.ArgumentParser(description="Parola: versionierter FTPS-Upload")
    parser.add_argument("--publish", action="store_true", help="Nur geänderte Dateien hochladen")
    parser.add_argument("--probe", action="store_true", help="Read-only FTPS & Manifest vergleichen")
    args = parser.parse_args()
    if args.probe and args.publish:
        raise RuntimeError("--probe und --publish dürfen nicht kombiniert werden.")

    local = build_manifest()
    env = load_env(ENV)
    required = ["HOSTINGER_FTP_HOST", "HOSTINGER_FTP_USER", "HOSTINGER_FTP_PASSWORD",
                "HOSTINGER_FTP_TARGET"]
    missing = [key for key in required if not env.get(key)]
    if not args.probe and not args.publish:
        print(f"Parola Website {local['version']} | Release-ID {local['releaseId']}")
        print(f"SHA-256-Versionsdatei: {MANIFEST}")
        print(f"Zu prüfende Website-Dateien: {len(local['files'])}")
        for name in local["files"]:
            print(f"  {name} ({local['files'][name]['sha256'][:12]})")
        if missing:
            print("FTPS-Einstellungen fehlen: " + ", ".join(missing))
            print("DEPLOY_SITE.cmd setup öffnet die lokale Konfiguration.")
        else:
            print("Mit DEPLOY_SITE.cmd probe den Serverstand lesend vergleichen.")
        print("Trockenlauf: keine FTP-Verbindung, keine Dateien verändert.")
        return 0
    if missing:
        raise RuntimeError(
            "FTPS-Konfiguration unvollständig: " + ", ".join(missing) +
            ". DEPLOY_SITE.cmd setup verwenden; es wurde nichts hochgeladen."
        )
    host = env["HOSTINGER_FTP_HOST"].strip()
    user = env["HOSTINGER_FTP_USER"].strip()
    password = env["HOSTINGER_FTP_PASSWORD"]
    target = check_target(env["HOSTINGER_FTP_TARGET"])
    protocol = env.get("HOSTINGER_FTP_PROTOCOL", "ftps").strip().lower()
    try:
        port = int(env.get("HOSTINGER_FTP_PORT") or "21")
    except ValueError as error:
        raise RuntimeError("HOSTINGER_FTP_PORT muss eine Zahl sein.") from error

    ftp = ftp_client(host, port, protocol, env)
    try:
        print(f"Prüfe {host}:{port}, Ziel {target} ({protocol})")
        ftp_connect(ftp, host, port, user, password, protocol)
        base = goto_target(ftp, target)
        print("Parola-Zielverzeichnis bestätigt: " + base)
        remote = read_manifest(ftp)
        changed, unchanged, meta = compare(local, remote)
        print(f"Serverstand: {remote.get('version') if remote else 'noch kein Manifest'}"
              f" -> lokal {local['version']}")
        print(f"Neue/geänderte Dateien: {len(changed)} | unverändert: {len(unchanged)}")
        for name in sorted_uploads(changed):
            print("  Änderungsbedarf: " + name)
        if args.probe:
            print("Verbindungstest abgeschlossen. Es wurde nichts hochgeladen.")
            return 0
        upload(ftp, base, local, remote)
        return 0
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print("Deployment fehlgeschlagen: " + str(error), file=sys.stderr)
        sys.exit(1)
