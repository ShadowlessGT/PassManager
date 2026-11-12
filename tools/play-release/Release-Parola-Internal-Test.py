#!/usr/bin/env python3
"""PAROLA: explicitly release an uploaded signed AAB into INTERNAL Google Play testing.
Prepares QA of native Google Sign-In on a Play-signed Android installation.
Never changes open test / production. Does not deploy by default.
"""
from __future__ import annotations
import argparse, datetime, importlib.util, json, pathlib, sys

loc = pathlib.Path(__file__).resolve()
spec = importlib.util.spec_from_file_location("parola_uploader", loc.with_name("Upload-Parola-Play.py"))
play = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(play)

def codes(track):
    return [int(v) for release in track.get("releases", []) for v in release.get("versionCodes", [])]

def main():
    p=argparse.ArgumentParser()
    group=p.add_mutually_exclusive_group(required=True)
    group.add_argument("--check",action="store_true")
    group.add_argument("--publish",action="store_true")
    args=p.parse_args()
    code,name,file=play.release()
    token=play.access_token()
    edit_id=None
    try:
        edit_id=str(play.request(play.BASE,token,"POST",{})["id"])
        base=play.BASE+"/"+edit_id
        bundles=play.request(base+"/bundles",token).get("bundles",[])
        item=next((b for b in bundles if int(b["versionCode"])==code),None)
        if not item:raise RuntimeError(f"VersionCode {code} is not uploaded")
        tracks=play.request(base+"/tracks",token).get("tracks",[])
        internal=next((x for x in tracks if x.get("track")=="internal"),{"releases":[]})
        open_test=next((x for x in tracks if x.get("track")=="beta"),{"releases":[]})
        production=next((x for x in tracks if x.get("track")=="production"),{"releases":[]})
        old_internal=codes(internal);old_open=codes(open_test);old_production=codes(production)
        play.log("INTERNAL_BEFORE="+str(old_internal))
        play.log("OPEN_TEST_BEFORE="+str(old_open))
        play.log("PRODUCTION_BEFORE="+str(old_production))
        if args.check:
            play.log("INTERNAL_PUBLISH_POSSIBLE="+str(code not in old_internal).lower())
            play.log("CHECK_ONLY=TRUE")
            return 0
        if code in old_internal:raise RuntimeError("Version already assigned to internal testing")
        sha=play.verify_aab(file)
        if item.get("sha256") and item["sha256"].lower()!=sha:
            raise RuntimeError("Local signed bundle hash differs from Google Play")
        payload={"track":"internal","releases":[{"versionCodes":[str(code)],"status":"completed",
                  "name":f"{code} ({name}) – Google-Sign-In-Gerätetest"}]}
        play.request(base+"/tracks/internal",token,"PUT",payload)
        play.request(base+":validate",token,"POST",{})
        play.request(base+":commit",token,"POST",{})
        edit_id=None
        verify=play.request(play.BASE,token,"POST",{})
        edit_id=str(verify["id"])
        fresh=play.request(play.BASE+"/"+edit_id+"/tracks",token).get("tracks",[])
        now=lambda t:codes(next((x for x in fresh if x.get("track")==t),{"releases":[]}))
        if code not in now("internal"):
            raise RuntimeError("Google Play did not confirm internal release")
        if now("beta")!=old_open or now("production")!=old_production:
            raise RuntimeError("Unexpected open/production track change; manual Play Console review needed")
        report=loc.parent/"out"/f"parola-internal-test-release-vc{code}.json"
        report.write_text(json.dumps({"status":"internal-test-released","versionCode":code,
            "versionName":name,"openTestCodes":old_open,"productionCodes":old_production,
            "releasedUtc":datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+"\n","utf-8")
        play.log("INTERNAL_TEST_RELEASE_CONFIRMED=TRUE")
        play.log("OPEN_TEST_AND_PRODUCTION_UNCHANGED=TRUE")
        return 0
    finally:
        if edit_id:
            try:play.request(play.BASE+"/"+edit_id,token,"DELETE")
            except Exception:play.log("WARNING_TEMP_EDIT_CLEANUP_FAILED")

if __name__=="__main__":
    try:sys.exit(main())
    except Exception as ex:
        play.log("INTERNAL_RELEASE_FAILED="+type(ex).__name__+": "+str(ex))
        sys.exit(1)
