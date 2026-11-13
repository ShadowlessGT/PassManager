#!/usr/bin/env python3
"""Refresh PAROLA Android Firebase SDK config from the already authorized Firebase CLI.
Validates package and both Play/Upload OAuth certificates before replacing local config.
Never writes a credential file or exposes Firebase API key in logs.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
APP_ID = "1:693424731365:android:38ebf69e9e60d5b0fad00c"
PROJECT = "password-manager-parola"
PACKAGE = "com.shadowlessstudios.passwordmanager"
REQUIRED_SHA1 = {"541d17691de2793ab4370b829b014b9a73af8506",
                 "61ee9cb4bcf8cf3ca7d648c7e3111d6959c2698f"}

def main():
    dest = ROOT / "android" / "app" / "google-services.json"
    with tempfile.TemporaryDirectory(prefix="parola-firebase-") as directory:
        downloaded = Path(directory) / "google-services.json"
        cmd = ["firebase.cmd", "apps:sdkconfig", "ANDROID", APP_ID,
               "--project", PROJECT, "--out", str(downloaded)]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=55)
        # Firebase Tools on Windows can occasionally terminate abnormally after writing
        # a complete config. Validate downloaded bytes, not just the subprocess exit code.
        if not downloaded.is_file() or downloaded.stat().st_size < 500:
            raise RuntimeError(f"Firebase CLI SDK config download failed (exit={result.returncode})")
        data = json.loads(downloaded.read_text(encoding="utf-8-sig"))
        clients = [c for c in data.get("client", [])
                   if c.get("client_info", {}).get("android_client_info", {}).get("package_name") == PACKAGE]
        if data.get("project_info", {}).get("project_id") != PROJECT or len(clients) != 1:
            raise RuntimeError("Firebase SDK config has unexpected project or package")
        client = clients[0]
        sha1 = {str(v.get("android_info", {}).get("certificate_hash", "")).replace(":", "").lower()
                for v in client.get("oauth_client", []) if v.get("client_type") == 1}
        has_web = any(v.get("client_type") == 3 for v in client.get("oauth_client", []))
        if not REQUIRED_SHA1.issubset(sha1) or not has_web:
            raise RuntimeError("Firebase SDK config missing Play SHA-1, upload SHA-1 or Web OAuth")
        current = dest.read_bytes() if dest.is_file() else b""
        fresh = downloaded.read_bytes()
        if current != fresh:
            backup = Path(os.environ["LOCALAPPDATA"]) / "ShadowlessPlayAutomation" / "parola-google-services.previous.json"
            backup.parent.mkdir(parents=True, exist_ok=True)
            if current:
                backup.write_bytes(current)
            staged = dest.with_name("google-services.parola-staged.tmp")
            staged.write_bytes(fresh)
            os.replace(staged, dest)
            print("PAROLA_FIREBASE_SDK_CONFIG_REFRESHED=TRUE", flush=True)
        else:
            print("PAROLA_FIREBASE_SDK_CONFIG_UNCHANGED=TRUE", flush=True)
        print("PAROLA_FIREBASE_ANDROID_OAUTH_CLIENTS=" + str(len(sha1)), flush=True)
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as ex:
        print("PAROLA_FIREBASE_CONFIG_REFRESH_FAILED=" + type(ex).__name__ + ": " + str(ex), flush=True)
        sys.exit(1)
