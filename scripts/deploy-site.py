#!/usr/bin/env python3
"""Locally deploy the Parola static website. No external Python dependencies."""
from __future__ import annotations
import argparse
import ftplib
import os
from pathlib import Path
import socket
import ssl
import sys

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / "deploy.local.env"
DIST = ROOT / "site-dist"

def load_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise RuntimeError("deploy.local.env fehlt. Vorlage kopieren und lokal ausfüllen.")
    values = {}
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        s = raw.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, value = s.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values

class ImplicitFTP_TLS(ftplib.FTP_TLS):
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

def files_to_upload() -> list[Path]:
    if not (DIST / "index.html").is_file() or not (DIST / "delete-account.html").is_file():
        raise RuntimeError("Website-Build unvollständig. Erst npm run build:site ausführen.")
    return sorted(p for p in DIST.rglob("*") if p.is_file())

def check_target(target: str):
    target = target.strip().replace("\\", "/").strip("/")
    if not target or target in {".", "public_html", "/"} or ".." in target.split("/"):
        raise RuntimeError("HOSTINGER_FTP_TARGET muss ein eindeutiges, sicheres Parola-Verzeichnis sein.")
    if "parola" not in target.lower():
        raise RuntimeError("HOSTINGER_FTP_TARGET muss aus Sicherheitsgründen 'parola' enthalten.")
    return target

def main() -> int:
    parser = argparse.ArgumentParser(description="Parola Website lokal auf Hostinger bereitstellen")
    parser.add_argument("--publish", action="store_true", help="Dateien tatsächlich hochladen")
    args = parser.parse_args()
    env = load_env(ENV)
    target = check_target(env.get("HOSTINGER_FTP_TARGET", ""))
    host = env.get("HOSTINGER_FTP_HOST", "")
    port = int(env.get("HOSTINGER_FTP_PORT") or 21)
    protocol = env.get("HOSTINGER_FTP_PROTOCOL", "ftps").lower()
    if not host or protocol not in {"ftp", "ftps", "ftps-legacy"}:
        raise RuntimeError("FTP-Host oder Protokoll ungültig.")
    if protocol == "ftp" and env.get("HOSTINGER_ALLOW_INSECURE_FTP") != "true":
        raise RuntimeError("Unverschlüsseltes FTP blockiert. Bitte ftps verwenden.")
    files = files_to_upload()
    print(f"Ziel: {host}:{port}/{target} | Protokoll: {protocol}")
    print(f"Website-Dateien: {len(files)} (ohne Löschung bestehender Remote-Dateien)")
    if not args.publish:
        for path in files:
            print("  " + path.relative_to(DIST).as_posix())
        print("Nur Vorschau. Für Upload: DEPLOY_SITE.cmd publish")
        return 0
    user = env.get("HOSTINGER_FTP_USER")
    password = env.get("HOSTINGER_FTP_PASSWORD")
    if not user or not password:
        raise RuntimeError("FTP-Benutzername/Passwort fehlen in deploy.local.env.")
    context = ssl.create_default_context()
    ftp = (ImplicitFTP_TLS(context=context, timeout=30)
           if protocol == "ftps-legacy" else
           ftplib.FTP_TLS(context=context, timeout=30)
           if protocol == "ftps" else
           ftplib.FTP(timeout=30))
    try:
        ftp.connect(host, port)
        if protocol == "ftps-legacy":
            ftplib.FTP.login(ftp, user, password)
        else:
            ftp.login(user, password)
        if isinstance(ftp, ftplib.FTP_TLS):
            ftp.prot_p()
        ftp.set_pasv(True)
        # Existing remote directory only. Never mkdir, delete or change other sites.
        for segment in target.split("/"):
            ftp.cwd(segment)
        for file in files:
            parts = file.relative_to(DIST).parts
            folder = parts[:-1]
            # Asset directories can be created inside the explicitly selected Parola root.
            for segment in folder:
                try:
                    ftp.cwd(segment)
                except ftplib.error_perm:
                    ftp.mkd(segment)
                    ftp.cwd(segment)
            with file.open("rb") as stream:
                ftp.storbinary("STOR " + parts[-1], stream)
            for _ in folder:
                ftp.cwd("..")
            print("Hochgeladen: " + file.relative_to(DIST).as_posix())
        print("Parola-Website hochgeladen. Anschließend HTTPS-Seiten prüfen.")
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("Deployment fehlgeschlagen: " + str(exc), file=sys.stderr)
        sys.exit(1)
