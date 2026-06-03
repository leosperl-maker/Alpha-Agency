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


def email_button(text: str, url: str) -> str:
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">'
        f'<tr><td style="border-radius:10px;background:#E11D2E;">'
        f'<a href="{url}" style="display:inline-block;padding:13px 26px;color:#ffffff;'
        f'text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;">{text}</a>'
        f'</td></tr></table>'
    )


def email_rows(pairs) -> str:
    """pairs = liste de (label, valeur) -> tableau d'infos propre."""
    rows = ""
    for label, value in pairs:
        if value in (None, "", "—"):
            continue
        rows += (
            f'<tr><td style="padding:7px 0;color:#6b7280;font-size:13px;width:130px;vertical-align:top;">{label}</td>'
            f'<td style="padding:7px 0;color:#111827;font-size:14px;font-weight:600;">{value}</td></tr>'
        )
    return f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0;">{rows}</table>'


def email_shell(title: str, inner_html: str, preheader: str = "") -> str:
    """Enveloppe brandée Alpha Agency (responsive, compatible clients mail)."""
    return f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 28px rgba(0,0,0,.07);">
        <tr><td style="background:linear-gradient(135deg,#E11D2E 0%,#9A1230 55%,#3A0A1B 100%);padding:30px 34px;">
          <div style="color:#ffffff;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;opacity:.85;font-weight:700;">Alpha&nbsp;Agency</div>
          <div style="color:#ffffff;font-size:23px;font-weight:700;margin-top:8px;line-height:1.25;">{title}</div>
        </td></tr>
        <tr><td style="padding:30px 34px;color:#1f2937;font-size:15px;line-height:1.65;">{inner_html}</td></tr>
        <tr><td style="padding:22px 34px;background:#0A0507;color:#9ca3af;font-size:12px;line-height:1.7;">
          <strong style="color:#ffffff;">Alpha Agency</strong> &middot; Communication digitale &middot; Guadeloupe<br>
          3 Bd du Marquisat de Houëlbourg, Jarry 97122 Baie-Mahault<br>
          <a href="mailto:leo.sperl@alphagency.fr" style="color:#FF6B7E;text-decoration:none;">leo.sperl@alphagency.fr</a> &middot; +596 696 44 73 53 &middot; <a href="https://www.alphagency.fr" style="color:#FF6B7E;text-decoration:none;">alphagency.fr</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


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
