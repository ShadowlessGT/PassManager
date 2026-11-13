#!/usr/bin/env python3
"""Read-only Firebase/Google Play OAuth preflight; fail closed on mismatched certificates.
Never prints tokens/API keys or changes live authentication settings.
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
PACKAGE = "com.shadowlessstudios.passwordmanager"
APP_ID = "1:693424731365:android:38ebf69e9e60d5b0fad00c"
PROJECT = "password-manager-parola"
REQUIRED_SHA1 = {
    "541d17691de2793ab4370b829b014b9a73af8506",  # Upload key
    "61ee9cb4bcf8cf3ca7d648c7e3111d6959c2698f",  # Google Play app-signing key, extracted from Play-generated APK 20
}
PLAY_SHA256 = "677e7ae6498f5f38513636c8189a104df7b266c957b5216e38e721c171f98dd6"

def normalize(value):
    return str(value).replace(":", "").strip().lower()

def main():
    file = ROOT / "android" / "app" / "google-services.json"
    config = json.loads(file.read_text("utf-8-sig"))
    clients = [c for c in config.get("client", [])
               if c.get("client_info", {}).get("android_client_info", {}).get("package_name") == PACKAGE]
    if len(clients) != 1:
        raise RuntimeError("google-services.json does not uniquely match PAROLA's package")
    client = clients[0]
    actual_sha1 = {
        normalize(o.get("android_info", {}).get("certificate_hash", ""))
        for o in client.get("oauth_client", []) if o.get("client_type") == 1
    }
    web_clients = [o for o in client.get("oauth_client", []) if o.get("client_type") == 3]
    if not REQUIRED_SHA1.issubset(actual_sha1) or not web_clients:
        raise RuntimeError("google-services.json lacks the Play app signing SHA-1, upload SHA-1 or Firebase Web OAuth client")
    print("LOCAL_GOOGLE_SERVICES_OAUTH_OK=TRUE", flush=True)

    # Uses already authorized Firebase CLI identity; no service-account JSON keys.
    command = ["firebase.cmd", "apps:android:sha:list", APP_ID, "--project", PROJECT, "--json"]
    result = subprocess.run(command, capture_output=True, text=True, timeout=40, shell=False)
    try:
        response = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError("Cannot parse Firebase registered certificate list") from None
    hashes = {
        normalize(item.get("shaHash", ""))
        for item in response.get("result", []) if item.get("certType") == "SHA_1"
    }
    hashes256 = {
        normalize(item.get("shaHash", ""))
        for item in response.get("result", []) if item.get("certType") == "SHA_256"
    }
    if not REQUIRED_SHA1.issubset(hashes) or PLAY_SHA256 not in hashes256:
        raise RuntimeError("Firebase does not contain both Google Play and upload signing certificate hashes")
    print("FIREBASE_PLAY_SIGNING_SHA1_REGISTERED=TRUE", flush=True)

    # Public Firebase Auth endpoint: verify Google provider responds without authenticating a user.
    api_keys = client.get("api_key", [])
    if not api_keys or not api_keys[0].get("current_key"):
        raise RuntimeError("google-services.json missing Firebase API configuration")
    key = api_keys[0]["current_key"]
    url = "https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=" + key
    data = json.dumps({"providerId": "google.com",
                       "continueUri": "https://parola.shadowless-studios.eu/"}).encode("utf-8")
    try:
        with urllib.request.urlopen(urllib.request.Request(
            url, data=data, headers={"Content-Type": "application/json"},
            method="POST"), timeout=20) as r:
            auth = json.load(r)
    except urllib.error.HTTPError as ex:
        raise RuntimeError(f"Firebase Google sign-in provider check returned HTTP {ex.code}") from None
    if auth.get("providerId") != "google.com" or not auth.get("authUri"):
        raise RuntimeError("Firebase Google provider did not return a Google OAuth authorization URI")
    print("FIREBASE_GOOGLE_SIGNIN_PROVIDER_ENABLED=TRUE", flush=True)
    print("PAROLA_GOOGLE_AUTH_PREFLIGHT_OK=TRUE", flush=True)
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("PAROLA_GOOGLE_AUTH_PREFLIGHT_FAILED=" + type(exc).__name__ + ": " + str(exc),
              flush=True)
        sys.exit(1)
