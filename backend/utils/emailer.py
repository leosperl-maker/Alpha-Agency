"""
Helper d'envoi d'email centralisé — via Resend (remplace Brevo).
Domaine alphagency.fr vérifié dans Resend. RESEND_API_KEY + SENDER_EMAIL = variables Railway.
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)


def resend_sender(name: str = None) -> str:
    s = os.environ.get("SENDER_EMAIL") or "noreply@alphagency.fr"
    if "<" in s:
        return s
    return f"{name or 'Alpha Agency'} <{s}>"


def send_email(to, subject: str, html: str, from_name: str = None):
    """Envoie un email via Resend. `to` = str ou list. Retourne (status_code:int, text:str)."""
    key = os.environ.get("RESEND_API_KEY", "")
    if not key:
        logger.warning("RESEND_API_KEY manquant — email non envoyé")
        return 0, "no_resend_key"
    recipients = to if isinstance(to, list) else [to]
    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"from": resend_sender(from_name), "to": recipients, "subject": subject, "html": html},
            timeout=15,
        )
        if r.status_code not in (200, 201, 202):
            logger.error(f"Resend error {r.status_code}: {r.text[:200]}")
        return r.status_code, r.text[:300]
    except Exception as e:
        logger.error(f"Resend exception: {e}")
        return -1, str(e)[:200]
