"""Verified-host-key SFTP transport compatible with Parola's incremental deployer.

Requires Paramiko for SFTP, but is imported lazily so FTPS/preview need no extras.
Authentication NEVER occurs before the SSH server host key is verified.
"""
from __future__ import annotations

import base64
import errno
import ftplib
import hashlib
import hmac
from pathlib import PurePosixPath
import stat


def sha256_host_key(key) -> str:
    digest = hashlib.sha256(key.asbytes()).digest()
    return "SHA256:" + base64.b64encode(digest).decode("ascii").rstrip("=")


class VerifiedSFTP:
    def __init__(self, expected_fingerprint: str):
        self.expected = expected_fingerprint.strip()
        self.transport = None
        self.sftp = None
        self.current = "/"

    def connect(self, host: str, port: int) -> str:
        try:
            import paramiko
        except ImportError as error:
            raise RuntimeError(
                "SFTP benötigt Paramiko. Installiere es mit: "
                'python -m pip install --user "paramiko>=3.5,<5"'
            ) from error
        try:
            self.transport = paramiko.Transport((host, port))
            self.transport.start_client(timeout=25)
            actual = sha256_host_key(self.transport.get_remote_server_key())
            expected = self.expected
            if expected and not expected.startswith("SHA256:"):
                expected = "SHA256:" + expected
            if not expected or not hmac.compare_digest(expected, actual):
                raise RuntimeError(
                    "SFTP-Hostschlüssel nicht bestätigt. "
                    f"Vom Server empfangener SSH-Fingerabdruck: {actual}. "
                    "Vergleiche ihn zuerst mit dem 'Host key fingerprint' "
                    "in Hostinger hPanel > SSH-Zugang / SSH Access. "
                    "Nur bei Übereinstimmung in deploy.local.env unter "
                    "HOSTINGER_SFTP_HOSTKEY_SHA256 eintragen. "
                    "Keine Zugangsdaten wurden an den Server gesendet."
                )
            return "SSH-Hostschlüssel verifiziert."
        except Exception:
            self.close()
            raise

    def login(self, username: str, password: str) -> None:
        if self.transport is None:
            raise RuntimeError("SSH-Verbindung fehlt.")
        try:
            self.transport.auth_password(username=username, password=password)
            import paramiko
            self.sftp = paramiko.SFTPClient.from_transport(self.transport)
            self.current = self.sftp.normalize(".")
        except Exception:
            self.close()
            raise

    def set_pasv(self, value: bool) -> None:
        # Compatibility with the FTP deployment pipeline; SFTP is SSH-based.
        return

    def pwd(self) -> str:
        return self.current

    def _resolve(self, name: str) -> str:
        return str(PurePosixPath(name if name.startswith("/") else
                                 str(PurePosixPath(self.current) / name)))

    def cwd(self, directory: str) -> str:
        import paramiko
        path = self._resolve(directory)
        try:
            attr = self.sftp.stat(path)
            if not stat.S_ISDIR(attr.st_mode):
                raise ftplib.error_perm("550 Not a directory: " + directory)
            self.current = self.sftp.normalize(path)
            return self.current
        except OSError as error:
            if getattr(error, "errno", None) in (errno.ENOENT, errno.ENOTDIR):
                raise ftplib.error_perm("550 Directory missing: " + directory) from error
            raise

    def mkd(self, directory: str) -> str:
        path = self._resolve(directory)
        self.sftp.mkdir(path)
        return path

    def retrbinary(self, command: str, callback, blocksize: int = 65536) -> str:
        if not command.startswith("RETR "):
            raise ValueError("Expected RETR command")
        path = self._resolve(command[5:])
        try:
            with self.sftp.open(path, "rb") as stream:
                while True:
                    block = stream.read(blocksize)
                    if not block:
                        break
                    callback(block)
        except OSError as error:
            if getattr(error, "errno", None) == errno.ENOENT:
                raise ftplib.error_perm("550 File not found") from error
            raise
        return "226 Transfer complete"

    def storbinary(self, command: str, stream, blocksize: int = 65536) -> str:
        if not command.startswith("STOR "):
            raise ValueError("Expected STOR command")
        path = self._resolve(command[5:])
        with self.sftp.open(path, "wb") as target:
            while True:
                data = stream.read(blocksize)
                if not data:
                    break
                target.write(data)
            target.flush()
        return "226 Transfer complete"

    def quit(self) -> None:
        self.close()

    def close(self) -> None:
        if self.sftp is not None:
            try:
                self.sftp.close()
            finally:
                self.sftp = None
        if self.transport is not None:
            try:
                self.transport.close()
            finally:
                self.transport = None
