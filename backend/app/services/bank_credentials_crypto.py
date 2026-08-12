import base64
import json
import os
from typing import Any, Dict, Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


_KEY_ENV = "BANK_CREDENTIALS_ENCRYPTION_KEY"
_PREFIX = "v1:"
_AAD = b"portabilidade-pro:bank-credentials:v1"


class BankCredentialsCryptoError(RuntimeError):
    """Erro seguro relacionado ao cofre de credenciais bancárias."""


def _get_key() -> bytes:
    raw_key = (os.getenv(_KEY_ENV) or "").strip()

    if not raw_key:
        raise BankCredentialsCryptoError(
            f"{_KEY_ENV} não está configurada."
        )

    try:
        key = base64.urlsafe_b64decode(
            raw_key.encode("ascii")
        )
    except Exception as exc:
        raise BankCredentialsCryptoError(
            f"{_KEY_ENV} possui formato inválido."
        ) from exc

    if len(key) != 32:
        raise BankCredentialsCryptoError(
            f"{_KEY_ENV} deve representar exatamente 32 bytes."
        )

    return key


def encrypt_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    plaintext = str(value).encode("utf-8")

    key = _get_key()
    nonce = os.urandom(12)

    cipher = AESGCM(key)
    ciphertext = cipher.encrypt(
        nonce,
        plaintext,
        _AAD,
    )

    payload = base64.urlsafe_b64encode(
        nonce + ciphertext
    ).decode("ascii")

    return f"{_PREFIX}{payload}"


def decrypt_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    if not isinstance(value, str):
        raise BankCredentialsCryptoError(
            "Credencial criptografada inválida."
        )

    if not value.startswith(_PREFIX):
        raise BankCredentialsCryptoError(
            "Versão da credencial criptografada inválida."
        )

    encoded = value[len(_PREFIX):]

    try:
        payload = base64.urlsafe_b64decode(
            encoded.encode("ascii")
        )

        if len(payload) <= 12:
            raise ValueError("payload insuficiente")

        nonce = payload[:12]
        ciphertext = payload[12:]

        cipher = AESGCM(_get_key())

        plaintext = cipher.decrypt(
            nonce,
            ciphertext,
            _AAD,
        )

        return plaintext.decode("utf-8")

    except BankCredentialsCryptoError:
        raise
    except Exception as exc:
        raise BankCredentialsCryptoError(
            "Não foi possível descriptografar a credencial."
        ) from exc


def encrypt_json(
    value: Optional[Dict[str, Any]],
) -> Optional[str]:
    if value is None:
        return None

    serialized = json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )

    return encrypt_text(serialized)


def decrypt_json(
    value: Optional[str],
) -> Optional[Dict[str, Any]]:
    if value is None:
        return None

    plaintext = decrypt_text(value)

    try:
        parsed = json.loads(plaintext)
    except Exception as exc:
        raise BankCredentialsCryptoError(
            "Dados extras criptografados são inválidos."
        ) from exc

    if not isinstance(parsed, dict):
        raise BankCredentialsCryptoError(
            "Dados extras devem ser um objeto JSON."
        )

    return parsed