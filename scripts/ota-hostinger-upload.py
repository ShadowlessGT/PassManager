#!/usr/bin/env python3
"""Release-gated upload of signed Parola OTA assets to the existing Hostinger site.

No website files are replaced; only <confirmed-root>/ota/android/ is writable.
Read-only by default. Requires a separate explicit publish flag and Android QA approval.
"""
from __future__ import annotations

import argparse
import ftplib
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
STAGED = ROOT / "ota-public" / "ota" / "android"
ORIGIN = "https://parola.shadowless-studios.eu"
MAX_ZIP = 80 * 1024 * 1024

spec = importlib.util.spec_from_file_location("parola_site_deploy", ROOT / "scripts" / "deploy-site.py")
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


def load_local_release() -> tuple[dict, Path]:
    path = STAGED / "stable.json"
    if not path.is_file():
        raise RuntimeError("Kein freigegebenes OTA-Manifest. Erst npm run ota:stage ausfuehren.")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    release = manifest.get("release")
    if manifest.get("schema") != 1 or not isinstance(release, dict):
        raise RuntimeError("OTA-Manifest ungueltig")
    version = release.get("version")
    url = release.get("zipUrl", "")
    if not isinstance(url, str) or not url.startswith(ORIGIN + "/ota/android/bundles/"):
        raise RuntimeError("OTA-URL zeigt nicht auf die feste Parola-Hostinger-Domain")
    name = url.rsplit("/", 1)[-1]
    if not name or not name.endswith(".zip") or "/" in name or "\\" in name:
        raise RuntimeError("Ungültiger ZIP-Dateiname")
    zip_file = STAGED / "bundles" / name
    if not zip_file.is_file() or zip_file.stat().st_size > MAX_ZIP:
        raise RuntimeError("Geprueftes ZIP fehlt oder ist zu gross")
    digest = hashlib.sha256(zip_file.read_bytes()).hexdigest()
    if digest != release.get("sha256") or zip_file.stat().st_size != release.get("sizeBytes"):
        raise RuntimeError("OTA-ZIP stimmt nicht mit dem signierten Manifest ueberein")
    if not (STAGED / ".htaccess").is_file():
        raise RuntimeError("Sichere HTTP/CORS-Header-Konfiguration fehlt")
    return manifest, zip_file


def maybe_read(ftp, name: str, maximum: int) -> bytes | None:
    try:
        return site.read_remote_file(ftp, name, maximum)
    except ftplib.error_perm as error:
        if str(error).startswith("550"):
            return None
        raise


def visit_or_create(ftp, root: str, parts: list[str], create: bool) -> str:
    ftp.cwd(root)
    for part in parts:
        try:
            ftp.cwd(part)
        except ftplib.error_perm:
            if not create:
                return ""
            ftp.mkd(part)
            ftp.cwd(part)
    return ftp.pwd()


def verify_site_identity(ftp, base: str) -> None:
    ftp.cwd(base)
    remote_manifest = site.read_manifest(ftp)
    if remote_manifest is not None:
        if remote_manifest.get("application") != "parola":
            raise RuntimeError("Zielordner ist nicht das Parola-Website-Verzeichnis")
        return
    homepage = maybe_read(ftp, "index.html", 2_000_000)
    if not homepage or "parola" not in homepage.decode("utf-8", errors="replace").lower():
        raise RuntimeError("Zielordner laesst sich nicht als Parola-Webseite bestaetigen")


def main() -> int:
    p = argparse.ArgumentParser(description="Parola signed OTA upload to Hostinger")
    p.add_argument("--probe", action="store_true", help="Read-only server and OTA status")
    p.add_argument("--publish", action="store_true", help="Upload only signed OTA files")
    p.add_argument("--version", help="Approved X.Y.Z release for --publish")
    p.add_argument("--approve-tested-android-update", action="store_true")
    args = p.parse_args()
    if args.publish == args.probe:
        raise RuntimeError("Entweder --probe oder --publish erforderlich")
    manifest, zip_file = load_local_release()
    release = manifest["release"]
    if args.publish and (args.version != release["version"] or not args.approve_tested_android_update):
        raise RuntimeError(
            "Upload gesperrt. Nur nach echtem Android-Test mit "
            "--publish --version " + str(release["version"]) + " --approve-tested-android-update"
        )
    # Independently checks the pinned key's signature, trusted origin, ZIP SHA256 and ZIP signature.
    import subprocess
    subprocess.run(
        ["node", str(ROOT / "scripts" / "ota-verify.mjs"), "--public"],
        cwd=ROOT, check=True,
    )
    config = site.load_env(site.ENV)
    required = ["HOSTINGER_FTP_HOST", "HOSTINGER_FTP_USER", "HOSTINGER_FTP_PASSWORD", "HOSTINGER_FTP_TARGET"]
    missing = [k for k in required if not config.get(k)]
    if missing:
        print("OTA-Release lokal signiert und verifiziert. Kein Server-Upload.")
        print("Hostinger-Verbindungsdaten fehlen in deploy.local.env:", ", ".join(missing))
        if args.publish:
            raise RuntimeError("Upload nicht moeglich, Hostinger-Zugang nicht eingerichtet")
        return 0
    protocol = config.get("HOSTINGER_FTP_PROTOCOL", "ftps").strip().lower()
    if protocol not in ("sftp", "ftps", "ftps-legacy"):
        raise RuntimeError("OTA-Upload erfordert verschluesseltes SFTP oder TLS-geprueftes FTPS")
    host = config["HOSTINGER_FTP_HOST"].strip()
    port = int(config.get("HOSTINGER_FTP_PORT") or ("65002" if protocol == "sftp" else "21"))
    target = site.check_target(config["HOSTINGER_FTP_TARGET"])
    ftp = site.ftp_client(host, port, protocol, config)
    try:
        site.ftp_connect(ftp, host, port, config["HOSTINGER_FTP_USER"], config["HOSTINGER_FTP_PASSWORD"], protocol)
        base = site.goto_target(ftp, target)
        verify_site_identity(ftp, base)
        android_dir = visit_or_create(ftp, base, ["ota", "android"], False)
        remote_manifest_bytes = None
        if android_dir:
            ftp.cwd(android_dir)
            remote_manifest_bytes = maybe_read(ftp, "stable.json", 8193)
        old_version = None
        if remote_manifest_bytes:
            old = json.loads(remote_manifest_bytes)
            old_version = old.get("release", {}).get("version")
            if not isinstance(old_version, str):
                raise RuntimeError("Remote-OTA-Manifest ungueltig, kein Upload")
            if args.publish:
                new_parts = tuple(int(s) for s in release["version"].split("."))
                old_parts = tuple(int(s) for s in old_version.split("."))
                if new_parts <= old_parts:
                    raise RuntimeError("OTA-Downgrade/erneutes Publizieren derselben Version verweigert")
        print(f"Hostinger Parola-Ziel bestaetigt: {base}")
        print(f"Live-OTA-Version: {old_version or 'keine'} | freigegeben lokal: {release['version']}")
        if args.probe:
            print("Nur LESEND geprueft, keine Server-Datei geaendert.")
            return 0
        android_dir = visit_or_create(ftp, base, ["ota", "android"], True)
        ftp.cwd(android_dir)
        # Write .htaccess first: CORS and no-cache must already be active before manifest.
        with (STAGED / ".htaccess").open("rb") as handle:
            ftp.storbinary("STOR .htaccess", handle)
        got_headers = maybe_read(ftp, ".htaccess", 10_000)
        if got_headers != (STAGED / ".htaccess").read_bytes():
            raise RuntimeError("Hostinger HTTP-Header-Datei wurde nicht korrekt uebertragen")
        bundles = visit_or_create(ftp, android_dir, ["bundles"], True)
        ftp.cwd(bundles)
        existing_zip = maybe_read(ftp, zip_file.name, MAX_ZIP + 1)
        if existing_zip is not None:
            if hashlib.sha256(existing_zip).hexdigest() != release["sha256"]:
                raise RuntimeError("Unveraenderliches ZIP existiert bereits mit anderem Inhalt")
            print("Signiertes ZIP bereits vorhanden; uebersprungen")
        else:
            with zip_file.open("rb") as handle:
                ftp.storbinary("STOR " + zip_file.name, handle)
            downloaded = maybe_read(ftp, zip_file.name, MAX_ZIP + 1)
            if downloaded is None or hashlib.sha256(downloaded).hexdigest() != release["sha256"]:
                raise RuntimeError("Hostinger ZIP-Upload stimmt nicht mit der Signatur ueberein")
            print("ZIP hochgeladen und per SHA-256 geprueft:", zip_file.name)
        ftp.cwd(android_dir)
        # LAST operation: a manifest is a live release; never upload before verifying ZIP.
        contents = (STAGED / "stable.json").read_bytes()
        import io
        ftp.storbinary("STOR stable.json", io.BytesIO(contents))
        if maybe_read(ftp, "stable.json", 8193) != contents:
            raise RuntimeError("Live-Manifest konnte nicht zurueckgelesen werden")
        print("OTA LIVE: " + ORIGIN + "/ota/android/stable.json")
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
        print("Hostinger-OTA-Vorgang fehlgeschlagen:", error, file=sys.stderr)
        sys.exit(1)
