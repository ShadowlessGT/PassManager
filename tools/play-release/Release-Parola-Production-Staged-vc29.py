#!/usr/bin/env python3
"""Parola production staged rollout, explicitly invoked, immutable preconditions.
Safeguards: 0.7.12/29 only, retain 0.7.7/24 for non-eligible users,
no other track edits, verify/validate before commit, confirm readback.
"""
import argparse,datetime,hashlib,importlib.util,json,pathlib,sys

SRC=pathlib.Path(r"N:\Shadowless Studios\Apps\PassManager\tools\play-release\Upload-Parola-Play.py")
spec=importlib.util.spec_from_file_location("parola_publisher",SRC)
play=importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(play)
EXPECTED_SHA="cdead274b290cb02f7f0deb30ceadb1ee8fc0dba6fed8a9dcbecf24b5107a83e"
STAGE=0.10
OUT=SRC.parent/"out"
REPORT=OUT/"parola-production-staged-vc29.json"
OLD=24
NEW=29

def releases(tracks,name):
    return next((track.get("releases",[]) for track in tracks if track.get("track")==name),[])

def state(rels):
    return [(r.get("status"),tuple(map(str,r.get("versionCodes",[]))),r.get("userFraction")) for r in rels]

def main():
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--validate",action="store_true")
    group.add_argument("--publish",action="store_true")
    args=parser.parse_args()
    code,name,path=play.release()
    if (code,name)!=(29,"0.7.12"):
        raise RuntimeError(f"Refusing wrong source version ({name}/{code}).")
    path=pathlib.Path(r"N:\Shadowless Studios\Apps\PassManager-Integrated-20261116\tools\play-release\out\Parola-v0.7.12-vc29-SIGNED.aab")
    digest=play.verify_aab(path)
    if digest!=EXPECTED_SHA:
        raise RuntimeError("Signed bundle digest mismatch. Refuse release.")
    token=play.access_token()
    edit=None
    committed=False
    try:
        edit=str(play.request(play.BASE,token,"POST",{})["id"])
        base=play.BASE+"/"+edit
        tracks=play.request(base+"/tracks",token).get("tracks",[])
        bundles=play.request(base+"/bundles",token).get("bundles",[])
        if not any(int(b.get("versionCode",0))==NEW for b in bundles):
            raise RuntimeError("VersionCode 29 is not registered at Play.")
        match=next(b for b in bundles if int(b.get("versionCode",0))==NEW)
        if match.get("sha256") and match["sha256"].lower()!=digest:
            raise RuntimeError("Google Play uploaded bundle does not match signed local AAB.")
        before_internal=state(releases(tracks,"internal"))
        before_beta=state(releases(tracks,"beta"))
        before_prod=state(releases(tracks,"production"))
        print("PRODUCTION_BEFORE="+repr(before_prod),flush=True)
        print("INTERNAL_BEFORE="+repr(before_internal),flush=True)
        print("BETA_BEFORE="+repr(before_beta),flush=True)
        if any(str(NEW) in r[1] for r in before_prod):
            print("PRODUCTION_ALREADY_HAS_VC29=TRUE",flush=True)
            return 0
        if before_prod!=[("completed",(str(OLD),),None)]:
            raise RuntimeError("Unexpected production state; refusing to replace existing releases.")
        if not any(str(NEW) in r[1] for r in before_internal):
            raise RuntimeError("Version 29 not in internal test; production promotion blocked.")

        old_release=releases(tracks,"production")[0]
        new_release={
          "versionCodes":[str(NEW)],
          "name":"Parola 0.7.12 – Passwort-Tresor & Kategorien",
          "status":"inProgress",
          "userFraction":STAGE,
          "releaseNotes":[
            {"language":"de-DE","text":"Neu: Kompakter Tresor mit schnellerem Zugriff auf Einträge. Kategorien als Liste oder 1–3-spaltiges Raster. Neue Sortierung nach Datum, Häufigkeit und Alphabet. Verbesserte Eintragssymbole, Bilder und Kategorieerstellung. Android-Passworterkennung zum Speichern neuer Zugänge, auf Wunsch aktivierbar."},
            {"language":"en-US","text":"New: Compact vault layout with faster access to entries. Categories in a list or a configurable 1–3-column grid. Sort by date, frequency or alphabetically. Improved entry icons, photos and in-entry category creation. Optional Android login detection to save new passwords."}
          ]
        }
        # Keep the completed release as fallback while 29 rolls out to 10%.
        payload={"track":"production","releases":[new_release,old_release]}
        play.request(base+"/tracks/production",token,"PUT",payload)
        play.request(base+":validate",token,"POST",{})
        print("PRODUCTION_STAGE_10_PERCENT_VALIDATED=TRUE",flush=True)
        if args.validate:
            print("VALIDATION_ONLY_NOT_COMMITTED=TRUE",flush=True)
            return 0
        # Actual external action: explicitly requested by owner.
        play.request(base+":commit",token,"POST",{})
        committed=True
        edit=None
        print("GOOGLE_PLAY_COMMIT_ACKNOWLEDGED=TRUE",flush=True)

        verify=str(play.request(play.BASE,token,"POST",{})["id"])
        edit=verify
        after_tracks=play.request(play.BASE+"/"+verify+"/tracks",token).get("tracks",[])
        after_prod=state(releases(after_tracks,"production"))
        after_internal=state(releases(after_tracks,"internal"))
        after_beta=state(releases(after_tracks,"beta"))
        print("PRODUCTION_AFTER="+repr(after_prod),flush=True)
        if not any(r[0]=="inProgress" and r[1]==(str(NEW),) and abs(float(r[2])-STAGE)<1e-8 for r in after_prod):
            raise RuntimeError("Production commit returned success but readback did not confirm staged 29.")
        if after_internal!=before_internal or after_beta!=before_beta:
            raise RuntimeError("Unexpected other-track changes: inspect Play Console.")
        REPORT.write_text(json.dumps({
          "status":"production-staged",
          "versionCode":NEW,
          "versionName":name,
          "userFraction":STAGE,
          "fallbackVersionCode":OLD,
          "sha256":digest,
          "internalUnchanged":True,
          "betaUnchanged":True,
          "committedUtc":datetime.datetime.now(datetime.timezone.utc).isoformat()
        },indent=2)+"\n","utf-8")
        print("PAROLA_PRODUCTION_STAGED_10_PERCENT_CONFIRMED=TRUE",flush=True)
        print("PRODUCTION_RELEASE_REPORT="+str(REPORT),flush=True)
        return 0
    finally:
        if edit:
            try:
                play.request(play.BASE+"/"+edit,token,"DELETE")
            except Exception:
                print("WARNING_PLAY_EDIT_CLEANUP_FAILED",flush=True)

if __name__=="__main__":
    try:sys.exit(main())
    except Exception as ex:
        print(f"PAROLA_PRODUCTION_RELEASE_ERROR={type(ex).__name__}: {str(ex)[:900]}",flush=True)
        sys.exit(1)
