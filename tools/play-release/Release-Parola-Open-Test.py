#!/usr/bin/env python3
"""Explicit QA-gated release of an already uploaded PAROLA AAB to Google Play OPEN testing.
Does not touch production; never called by the default upload workflow.
"""
from __future__ import annotations
import argparse, datetime, hashlib, importlib.util, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
uploader_path = pathlib.Path(__file__).with_name("Upload-Parola-Play.py")
spec = importlib.util.spec_from_file_location("parola_play_uploader", uploader_path)
play = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(play)

def track_codes(track):
    return [int(v) for r in track.get("releases", []) for v in r.get("versionCodes", [])]

def main():
    p = argparse.ArgumentParser()
    actions = p.add_mutually_exclusive_group(required=True)
    actions.add_argument("--check", action="store_true")
    actions.add_argument("--publish", action="store_true")
    p.add_argument("--qa-approved", action="store_true",
                   help="Explicit approval after real Android Google Sign-In and vault tests")
    args = p.parse_args()
    if args.publish and not args.qa_approved:
        raise RuntimeError("Open test release blocked: --qa-approved is required after real-device QA")
    code, name, file = play.release()
    token = play.access_token()
    edit_id = None
    try:
        edit_id = str(play.request(play.BASE, token, "POST", {})["id"])
        url = play.BASE + "/" + edit_id
        bundles = play.request(url + "/bundles", token).get("bundles", [])
        bundle = next((b for b in bundles if int(b["versionCode"]) == code), None)
        if not bundle:
            raise RuntimeError(f"VersionCode {code} not uploaded to Google Play yet")
        tracks = play.request(url + "/tracks", token).get("tracks", [])
        beta = next((t for t in tracks if t.get("track") == "beta"), {"track": "beta", "releases": []})
        production = next((t for t in tracks if t.get("track") == "production"), {"track": "production", "releases": []})
        previous_production = track_codes(production)
        old_beta = track_codes(beta)
        play.log(f"PLAY_PRODUCTION_CODES={previous_production}")
        play.log(f"PLAY_OPEN_TEST_CODES={old_beta}")
        play.log(f"CANDIDATE={name} VERSION_CODE={code}")
        if args.check:
            play.log(f"CAN_PROMOTE_OPEN_TEST={str(code not in old_beta).lower()}")
            play.log("PREFLIGHT_ONLY_NO_TRACK_CHANGE=TRUE")
            return 0
        if code in old_beta:
            raise RuntimeError("Candidate already assigned to the open test")
        digest = play.verify_aab(file)
        if bundle.get("sha256") and bundle["sha256"].lower() != digest:
            raise RuntimeError("Local signed AAB does not match the uploaded Play bundle")
        if previous_production and code <= max(previous_production):
            raise RuntimeError("Refusing open test release older than production")
        payload = {"track": "beta",
                   "releases": [{"name": f"{code} ({name}) – Google-Anmeldung",
                                 "versionCodes": [str(code)], "status": "completed"}]}
        play.request(url + "/tracks/beta", token, "PUT", payload)
        play.request(url + ":validate", token, "POST", {})
        play.request(url + ":commit", token, "POST", {})
        edit_id = None
        confirmed_id = str(play.request(play.BASE, token, "POST", {})["id"])
        edit_id = confirmed_id
        verify_url = play.BASE + "/" + edit_id
        track = play.request(verify_url + "/tracks/beta", token)
        prod = play.request(verify_url + "/tracks/production", token)
        if code not in track_codes(track):
            raise RuntimeError("Google Play committed the edit but new beta code not confirmed")
        if track_codes(prod) != previous_production:
            raise RuntimeError("Production codes changed unexpectedly; inspect Play Console")
        report = pathlib.Path(__file__).parent / "out" / f"parola-open-test-release-vc{code}.json"
        report.write_text(json.dumps({
            "status": "open-test-released",
            "package": play.APP, "versionCode": code, "versionName": name,
            "timestampUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "productionUnchanged": True
        }, indent=2) + "\n", encoding="utf-8")
        play.log("OPEN_TEST_RELEASE_COMMITTED=TRUE")
        play.log("PRODUCTION_TRACK_UNCHANGED=TRUE")
        return 0
    finally:
        if edit_id:
            try: play.request(play.BASE + "/" + edit_id, token, "DELETE")
            except Exception: play.log("WARNING_TEMP_EDIT_CLEANUP_FAILED")

if __name__ == "__main__":
    try: sys.exit(main())
    except Exception as ex:
        play.log("OPEN_TEST_RELEASE_ERROR=" + type(ex).__name__ + ": " + str(ex))
        sys.exit(1)
