"""Offline regression checks for Parola incremental FTPS upload."""
from __future__ import annotations
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import ftplib
import hashlib
from io import BytesIO
from pathlib import PurePosixPath

module_path = Path(__file__).with_name("deploy-site.py")
spec = importlib.util.spec_from_file_location("parola_deploy", module_path)
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class FakeFTP:
    def __init__(self):
        self.cwd_path = "/"
        self.dirs = {"/", "/parola"}
        self.files = {}
        self.stor_calls = []

    def _path(self, name):
        if name.startswith("/"):
            return str(PurePosixPath(name))
        return str(PurePosixPath(self.cwd_path) / name)

    def cwd(self, name):
        p = self._path(name)
        if p not in self.dirs:
            raise ftplib.error_perm("550 No such directory")
        self.cwd_path = p

    def pwd(self):
        return self.cwd_path

    def mkd(self, name):
        self.dirs.add(self._path(name))

    def storbinary(self, command, stream):
        assert command.startswith("STOR ")
        name = command[5:]
        dest = self._path(name)
        self.files[dest] = stream.read()
        self.stor_calls.append(dest)

    def retrbinary(self, command, callback):
        assert command.startswith("RETR ")
        dest = self._path(command[5:])
        if dest not in self.files:
            raise ftplib.error_perm("550 File not found")
        callback(self.files[dest])


class DeployManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.site = self.root / "site-dist"
        self.site.mkdir()
        (self.root / "package.json").write_text('{"version":"0.6.8"}')
        (self.site / "index.html").write_text("<title>Parola</title>")
        (self.site / "delete-account.html").write_text("<h1>Delete</h1>")
        (self.site / "privacy.html").write_text("<h1>Privacy</h1>")
        (self.site / "assets").mkdir()
        (self.site / "assets" / "style-123.css").write_text("body{color:blue}")
        self.ftp = FakeFTP()
        self.ftp.cwd("parola")

    def tearDown(self):
        self.temp.cleanup()

    def local(self):
        return deploy.build_manifest(self.site, self.root)

    def test_manifest_stable_and_sha256_correct(self):
        a = self.local()
        b = self.local()
        self.assertEqual(a, b)
        self.assertEqual(a["version"], "0.6.8")
        self.assertEqual(a["files"]["index.html"]["sha256"],
                         hashlib.sha256((self.site / "index.html").read_bytes()).hexdigest())
        self.assertFalse("parola-deploy-manifest.json" in a["files"])

    def test_first_sync_then_noop_then_single_change(self):
        a = self.local()
        self.assertIsNone(deploy.read_manifest(self.ftp))
        changed, skipped = deploy.upload(self.ftp, self.ftp.pwd(), a, None, self.site)
        self.assertEqual(changed, 4)
        self.assertEqual(skipped, 0)
        self.assertEqual(deploy.read_manifest(self.ftp), a)
        self.assertIn("/parola/deploy-history/v0.6.8-" + a["releaseId"] + ".json",
                      self.ftp.files)
        previous_count = len(self.ftp.stor_calls)
        changed, skipped = deploy.upload(self.ftp, self.ftp.pwd(), a,
                                         deploy.read_manifest(self.ftp), self.site)
        self.assertEqual((changed, skipped), (0, 4))
        self.assertEqual(len(self.ftp.stor_calls), previous_count)
        (self.site / "index.html").write_text("<title>Parola – New</title>")
        b = self.local()
        changed, skipped = deploy.upload(self.ftp, self.ftp.pwd(), b,
                                         deploy.read_manifest(self.ftp), self.site)
        self.assertEqual((changed, skipped), (1, 3))
        self.assertEqual(self.ftp.stor_calls[-3:],
                         ["/parola/index.html",
                          "/parola/deploy-history/v0.6.8-" + b["releaseId"] + ".json",
                          "/parola/parola-deploy-manifest.json"])
        self.assertEqual(deploy.read_manifest(self.ftp), b)

    def test_changed_asset_uploaded_before_html(self):
        order = deploy.sorted_uploads(["index.html", "delete-account.html", "assets/style.css"])
        self.assertEqual(order, ["assets/style.css", "delete-account.html", "index.html"])

    def test_corrupt_remote_manifest_fails_closed(self):
        self.ftp.files["/parola/parola-deploy-manifest.json"] = b"<not-json>"
        with self.assertRaisesRegex(RuntimeError, "ungültig"):
            deploy.read_manifest(self.ftp)

    def test_target_validation_blocks_other_sites(self):
        for path in ["", "/", "../parola", "public_html", "other-domain/public_html",
                     "parola/../somewhere"]:
            with self.subTest(path=path):
                with self.assertRaises(ValueError):
                    deploy.check_target(path)
        self.assertEqual(deploy.check_target("parola"), "parola")


if __name__ == "__main__":
    unittest.main(verbosity=2)
