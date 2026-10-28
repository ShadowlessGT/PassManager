"""No-network security and compatibility tests for Parola SFTP transport."""
from __future__ import annotations
import base64
import errno
import hashlib
import io
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
from unittest import TestCase, main
from unittest.mock import patch

from parola_sftp import VerifiedSFTP, sha256_host_key


class Key:
    def asbytes(self):
        return b"verified-fixture-host-key-data"


class FakeTransport:
    auth_count = 0
    def __init__(self, endpoint):
        self.endpoint = endpoint
        self.closed = False
    def start_client(self, timeout=25):
        return
    def get_remote_server_key(self):
        return Key()
    def auth_password(self, username, password):
        FakeTransport.auth_count += 1
    def close(self):
        self.closed = True


class Stream(io.BytesIO):
    def __init__(self, store, name, mode):
        super().__init__(store.get(name, b"") if "r" in mode else b"")
        self.store = store
        self.name_on_server = name
        self.mode = mode
    def close(self):
        if "w" in self.mode:
            self.store[self.name_on_server] = self.getvalue()
        super().close()


class FakeSFTP:
    def __init__(self):
        self.store = {}
        self.directories = {"/", "/home", "/home/parola"}
        self.closed = False
    def normalize(self, name):
        import posixpath
        return posixpath.normpath(name if name.startswith("/") else "/home/" + name)
    def stat(self, name):
        import stat
        if name not in self.directories:
            raise FileNotFoundError(errno.ENOENT, "missing")
        return SimpleNamespace(st_mode=stat.S_IFDIR | 0o755)
    def mkdir(self, name):
        self.directories.add(name)
    def open(self, name, mode):
        if "r" in mode and name not in self.store:
            raise FileNotFoundError(errno.ENOENT, "missing")
        return Stream(self.store, name, mode)
    def close(self):
        self.closed = True


class SFTPTests(TestCase):
    def setUp(self):
        FakeTransport.auth_count = 0
        self.sftp = FakeSFTP()
        self.fakeparamiko = SimpleNamespace(
            Transport=FakeTransport,
            SFTPClient=SimpleNamespace(from_transport=lambda connection: self.sftp)
        )
        self.patch = patch.dict(sys.modules, {"paramiko": self.fakeparamiko})
        self.patch.start()
    def tearDown(self):
        self.patch.stop()

    def test_unverified_server_never_receives_credentials(self):
        client = VerifiedSFTP("")
        with self.assertRaisesRegex(RuntimeError, "SSH-Fingerabdruck"):
            client.connect("191.96.63.25", 65002)
        self.assertEqual(FakeTransport.auth_count, 0)

    def test_wrong_host_key_never_receives_credentials(self):
        client = VerifiedSFTP("SHA256:not-a-match")
        with self.assertRaisesRegex(RuntimeError, "SSH-Fingerabdruck"):
            client.connect("191.96.63.25", 65002)
        self.assertEqual(FakeTransport.auth_count, 0)

    def test_pinned_key_allows_login_and_file_operations(self):
        expected = sha256_host_key(Key())
        client = VerifiedSFTP(expected)
        self.assertIn("verifiziert", client.connect("191.96.63.25", 65002))
        self.assertEqual(FakeTransport.auth_count, 0)
        client.login("sshuser", "private-password")
        self.assertEqual(FakeTransport.auth_count, 1)
        self.assertEqual(client.cwd("parola"), "/home/parola")
        client.mkd("assets")
        self.assertEqual(client.cwd("assets"), "/home/parola/assets")
        client.storbinary("STOR test.txt", io.BytesIO(b"hello"))
        parts = []
        client.retrbinary("RETR test.txt", parts.append)
        self.assertEqual(b"".join(parts), b"hello")
        import ftplib
        with self.assertRaises(ftplib.error_perm):
            client.retrbinary("RETR missing.txt", parts.append)
        client.close()
        self.assertTrue(self.sftp.closed)


if __name__ == "__main__":
    main(verbosity=2)
