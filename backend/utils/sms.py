"""
Helper SMS via Twilio (REST API, pas de dépendance supplémentaire).
Variables Railway : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
Destinataire des alertes équipe : ADMIN_NOTIFY_PHONE (ton mobile, format E.164 ex +596690...).
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)


def send_sms(to: str, body: str):
    """Envoie un SMS via Twilio. Retourne (status_code:int, text:str)."""
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    sender = os.environ.get("TWILIO_PHONE_NUMBER", "")
    if not (sid and token and sender):
        logger.warning("Twilio non configuré — SMS non envoyé")
        return 0, "twilio_not_configured"
    if not to:
        return 0, "no_recipient"
    try:
        r = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
            auth=(sid, token),
            data={"From": sender, "To": to, "Body": body[:1500]},
            timeout=15,
        )
        if r.status_code not in (200, 201):
            logger.error(f"Twilio SMS error {r.status_code}: {r.text[:200]}")
        return r.status_code, r.text[:300]
    except Exception as e:
        logger.error(f"Twilio SMS exception: {e}")
        return -1, str(e)[:200]


def notify_admin_sms(body: str):
    """SMS d'alerte vers l'équipe (ADMIN_NOTIFY_PHONE)."""
    return send_sms(os.environ.get("ADMIN_NOTIFY_PHONE", ""), body)


def to_e164(phone: str, default_cc: str = "590") -> str:
    """Normalise un numéro en E.164 (best-effort). GP/Antilles par défaut (+590)."""
    if not phone:
        return ""
    p = phone.strip().replace(" ", "").replace(".", "").replace("-", "")
    if p.startswith("+"):
        return p
    if p.startswith("00"):
        return "+" + p[2:]
    if p.startswith("0"):
        return f"+{default_cc}{p[1:]}"
    return "+" + p


def send_whatsapp(to: str, body: str):
    """Envoie un WhatsApp via Twilio. From = TWILIO_WHATSAPP_FROM (def: sandbox +14155238886)."""
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    sender = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    if not (sid and token):
        return 0, "twilio_not_configured"
    to_e = to_e164(to)
    if not to_e:
        return 0, "no_recipient"
    if not sender.startswith("whatsapp:"):
        sender = "whatsapp:" + sender
    try:
        r = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
            auth=(sid, token),
            data={"From": sender, "To": f"whatsapp:{to_e}", "Body": body[:1500]},
            timeout=15,
        )
        if r.status_code not in (200, 201):
            logger.error(f"Twilio WhatsApp error {r.status_code}: {r.text[:200]}")
        return r.status_code, r.text[:300]
    except Exception as e:
        logger.error(f"Twilio WhatsApp exception: {e}")
        return -1, str(e)[:200]
