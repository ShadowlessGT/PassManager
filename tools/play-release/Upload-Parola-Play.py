#!/usr/bin/env python3
"""PAROLA Play Developer API: check or upload an unassigned signed AAB.
Never modifies release tracks, deploys to production, or touches user vault data.
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "tools" / "play-release" / "out"
APP = "com.shadowlessstudios.passwordmanager"
BASE = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{APP}/edits"
GCLOUD = pathlib.Path.home() / "AppData" / "Local" / "Google" / "Cloud SDK" / "google-cloud-sdk" / "bin" / "gcloud.cmd"
SERVICE_ACCOUNT = "shadowless-play-automation@shadowless-bridge.iam.gserviceaccount.com"
JARSIGNER = pathlib.Path(r"C:\Program Files\Android\Android Studio\jbr\bin\jarsigner.exe")

def log(message: str) -> None:
    print(message, flush=True)

def release() -> tuple[int, str, pathlib.Path]:
    gradle = (ROOT / "android" / "app" / "build.gradle").read_text("utf-8")
    code = re.search(r"(?m)^\s*versionCode\s+(\d+)\s*$", gradle)
    name = re.search(r'(?m)^\s*versionName\s+"(\d+(?:\.\d+)+)"\s*$', gradle)
    if not code or not name:
        raise RuntimeError("Cannot determine Gradle versionCode / versionName")
    value = int(code.group(1))
    if value < 20:
        raise RuntimeError("Refusing obsolete PAROLA versionCode")
    filename = f"Parola-v{name.group(1)}-vc{value}-SIGNED.aab"
    return value, name.group(1), OUT / filename

def request(url: str, token: str, method="GET", payload=None, timeout=55, binary=False) -> dict:
    headers = {"Authorization": "Bearer " + token}
    body = None
    if payload is not None:
        if binary:
            body = payload
            headers["Content-Type"] = "application/octet-stream"
        else:
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            headers["Content-Type"] = "application/json; charset=utf-8"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as ex:
        details = ex.read().decode("utf-8", "replace")[:1000]
        raise RuntimeError(f"Play API returned HTTP {ex.code}: {details}") from None

def access_token() -> str:
    cmd = [str(GCLOUD), "auth", "print-access-token",
           f"--impersonate-service-account={SERVICE_ACCOUNT}",
           "--scopes=https://www.googleapis.com/auth/androidpublisher"]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=50)
    value = p.stdout.strip()
    if p.returncode or len(value) < 100:
        raise RuntimeError("Service-account impersonation failed. No token disclosed.")
    return value

def verify_aab(path: pathlib.Path) -> str:
    if not path.is_file() or path.stat().st_size < 1_000_000:
        raise RuntimeError("Signed AAB missing: " + str(path))
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if not any(re.fullmatch(r"META-INF/[^/]+\.(?:RSA|DSA|EC)", x) for x in names):
            raise RuntimeError("Signed AAB has no signature block")
        plugins = json.loads(archive.read("base/assets/capacitor.plugins.json"))
        if not any(p.get("pkg") == "@capacitor-firebase/authentication" for p in plugins):
            raise RuntimeError("Native Google sign-in plugin missing")
    p = subprocess.run([str(JARSIGNER), "-verify", str(path)],
                       capture_output=True, timeout=90)
    if p.returncode:
        raise RuntimeError("AAB cryptographic signature check failed")
    return hashlib.sha256(path.read_bytes()).hexdigest()

def codes_from_track(track: dict) -> set[int]:
    return {int(v) for release in track.get("releases", []) for v in release.get("versionCodes", [])}

def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--upload", action="store_true")
    args = parser.parse_args()
    code, name, file = release()
    digest = verify_aab(file) if args.upload else None
    token = access_token()
    edit_id = None
    committed = False
    try:
        edit_id = str(request(BASE, token, "POST", {})["id"])
        edit_base = BASE + "/" + edit_id
        tracks = request(edit_base + "/tracks", token).get("tracks", [])
        bundles = request(edit_base + "/bundles", token).get("bundles", [])
        used_codes = set()
        for track in tracks:
            used_codes.update(codes_from_track(track))
        used_codes.update(int(b["versionCode"]) for b in bundles)
        highest = max(used_codes) if used_codes else 0
        match = next((b for b in bundles if int(b["versionCode"]) == code), None)
        log(f"PAROLA_CANDIDATE={name} VERSION_CODE={code}")
        log(f"PLAY_HIGHEST_KNOWN_VERSION_CODE={highest}")
        log("OPEN_TEST_CODES=" + ",".join(map(str, sorted(codes_from_track(
            next((t for t in tracks if t.get("track") == "beta"), {}))))))
        if args.check:
            log("CAN_UPLOAD_NEW_VERSION=" + str(code > highest).lower())
            log("CHECK_ONLY_NO_RELEASE_CHANGED=TRUE")
            return 0
        if match:
            if match.get("sha256", "").lower() != digest:
                raise RuntimeError("Version code already uploaded with another SHA-256; bump versionCode")
            log("BUNDLE_ALREADY_UPLOADED=TRUE")
            return 0
        if code <= highest:
            raise RuntimeError("Version code must exceed all existing Play uploads")
        log("UPLOADING_AAB_WITHOUT_TRACK_RELEASE=TRUE")
        upload_url = ("https://androidpublisher.googleapis.com/upload/androidpublisher/v3/"
                      f"applications/{APP}/edits/{edit_id}/bundles?uploadType=media")
        uploaded = request(upload_url, token, "POST", file.read_bytes(), timeout=900, binary=True)
        if int(uploaded.get("versionCode", -1)) != code:
            raise RuntimeError("Play reported unexpected versionCode")
        request(edit_base + ":commit", token, "POST", {}, timeout=100)
        edit_id = None
        committed = True
        # Independent read-back in a fresh edit, without mutating any track.
        second = request(BASE, token, "POST", {})
        edit_id = str(second["id"])
        confirm_base = BASE + "/" + edit_id
        actual = request(confirm_base + "/bundles", token).get("bundles", [])
        found = next((b for b in actual if int(b["versionCode"]) == code), None)
        if not found:
            raise RuntimeError("Play commit succeeded, but read-back did not list the new bundle")
        if found.get("sha256") and found["sha256"].lower() != digest:
            raise RuntimeError("Play bundle SHA-256 differs from local AAB")
        report = OUT / f"parola-play-upload-vc{code}.json"
        report.write_text(json.dumps({
            "status": "uploaded-unassigned",
            "packageName": APP, "versionCode": code, "versionName": name,
            "sha256": digest,
            "timestampUtc": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }, indent=2) + "\n", "utf-8")
        log("PAROLA_AAB_UPLOAD_SUCCESS=TRUE")
        log("TRACKS_UNCHANGED=TRUE")
        log("REPORT=" + str(report))
        return 0
    finally:
        if edit_id:
            try:
                request(BASE + "/" + edit_id, token, "DELETE", timeout=30)
            except Exception:
                log("WARNING_UNCOMMITTED_EDIT_CLEANUP_FAILED")
        if committed:
            log("PLAY_BUNDLE_COMMITTED_UNASSIGNED=TRUE")

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        log("PAROLA_PLAY_OPERATION_FAILED=" + type(exc).__name__ + ": " + str(exc))
        sys.exit(1)
