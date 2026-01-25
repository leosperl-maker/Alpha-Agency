"""
Shared token encryption module
Ensures consistent encryption/decryption across all files
"""

import os
import logging
from cryptography.fernet import Fernet

logger = logging.getLogger("token_encryption")

# Token encryption key - MUST be set in production via SOCIAL_ENCRYPTION_KEY env var
_ENCRYPTION_KEY = os.environ.get('SOCIAL_ENCRYPTION_KEY')

if not _ENCRYPTION_KEY:
    # WARNING: This generates a random key that will be different on each restart!
    # In production, SOCIAL_ENCRYPTION_KEY MUST be set in .env
    logger.warning("SOCIAL_ENCRYPTION_KEY not set! Generating random key - tokens will be lost on restart!")
    _ENCRYPTION_KEY = Fernet.generate_key()
else:
    # Ensure it's bytes
    if isinstance(_ENCRYPTION_KEY, str):
        _ENCRYPTION_KEY = _ENCRYPTION_KEY.encode()

# Create fernet instance
try:
    fernet = Fernet(_ENCRYPTION_KEY)
    logger.info("Token encryption initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize encryption: {e}")
    # Fallback to a new key (tokens won't decrypt but at least it won't crash)
    fernet = Fernet(Fernet.generate_key())


def encrypt_token(token: str) -> str:
    """Encrypt a token for secure storage"""
    if not token:
        return ""
    try:
        return fernet.encrypt(token.encode()).decode()
    except Exception as e:
        logger.error(f"Failed to encrypt token: {e}")
        return ""


def decrypt_token(encrypted: str) -> str:
    """Decrypt an encrypted token"""
    if not encrypted:
        return ""
    try:
        return fernet.decrypt(encrypted.encode()).decode()
    except Exception as e:
        logger.error(f"Failed to decrypt token: {e}")
        return ""


def get_account_access_token(account: dict) -> str:
    """Get the decrypted access token from an account dictionary"""
    # First try encrypted token
    encrypted_token = account.get("access_token_encrypted")
    if encrypted_token:
        decrypted = decrypt_token(encrypted_token)
        if decrypted:
            return decrypted
    
    # Fallback to plain token (for backward compatibility or sandbox accounts)
    return account.get("access_token", "")
