"""
Web Push (PWA) — notifications poussées sur iPhone/Android même app fermée.

iOS supporte le Web Push pour les PWA installées sur l'écran d'accueil (16.4+).
Chaîne : le navigateur s'abonne (service worker) → l'abonnement est stocké ici →
_deposit_notification (Néo) appelle push_to_all → pywebpush signe avec les clés
VAPID et envoie aux endpoints Apple/Google.

Prérequis env (Railway) : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CLAIMS_EMAIL.
Sans clés : tout est inerte et silencieux (le CRM fonctionne normalement).
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import asyncio
import json
import os
import logging

from .database import db, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push", tags=["Web Push"])

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "leo.sperl@alphagency.fr")


def push_configured() -> bool:
    return bool(VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY)


class SubscriptionIn(BaseModel):
    subscription: dict           # objet PushSubscription.toJSON() du navigateur
    device_label: Optional[str] = None


@router.get("/config")
async def push_config(current_user: dict = Depends(get_current_user)):
    """Le front récupère la clé publique (et sait si le push est configuré)."""
    count = await db.push_subscriptions.count_documents({})
    return {"configured": push_configured(), "public_key": VAPID_PUBLIC_KEY,
            "subscriptions": count}


@router.post("/subscribe")
async def subscribe(payload: SubscriptionIn, current_user: dict = Depends(get_current_user)):
    sub = payload.subscription or {}
    endpoint = sub.get("endpoint")
    if not endpoint or not (sub.get("keys") or {}).get("p256dh"):
        return {"success": False, "error": "Abonnement push invalide."}
    await db.push_subscriptions.update_one(
        {"endpoint": endpoint},
        {"$set": {"endpoint": endpoint, "subscription": sub,
                  "device_label": payload.device_label,
                  "user_id": current_user.get("id") or current_user.get("email"),
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True)
    return {"success": True, "message": "Notifications push activées sur cet appareil."}


@router.post("/unsubscribe")
async def unsubscribe(payload: SubscriptionIn, current_user: dict = Depends(get_current_user)):
    endpoint = (payload.subscription or {}).get("endpoint")
    if endpoint:
        await db.push_subscriptions.delete_one({"endpoint": endpoint})
    return {"success": True}


@router.post("/test")
async def push_test(current_user: dict = Depends(get_current_user)):
    """Envoi d'un push de test à tous les appareils abonnés."""
    if not push_configured():
        return {"success": False,
                "error": "Clés VAPID absentes : définir VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY sur Railway."}
    sent = await push_to_all("Néo", "Test réussi : les notifications push fonctionnent sur cet appareil. 🎉",
                             url="/admin/neo")
    return {"success": True, "sent": sent}


def _send_one(sub: dict, payload: str) -> bool:
    """Envoi synchrone d'UN push (appelé via to_thread). True si l'abonnement est mort."""
    from pywebpush import webpush, WebPushException
    try:
        webpush(subscription_info=sub, data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"})
        return False
    except WebPushException as e:
        code = getattr(getattr(e, "response", None), "status_code", None)
        if code in (404, 410):
            return True  # abonnement expiré → à purger
        logger.warning(f"web_push: envoi KO ({code}): {e}")
        return False
    except Exception as e:
        logger.warning(f"web_push: envoi KO: {e}")
        return False


async def push_to_all(title: str, message: str, url: str = "/admin", tag: str = None) -> int:
    """Pousse à tous les appareils abonnés. Jamais bloquant, purge les abonnements morts."""
    if not push_configured():
        return 0
    subs = await db.push_subscriptions.find({}, {"_id": 0}).to_list(50)
    if not subs:
        return 0
    payload = json.dumps({"title": title, "body": message[:240], "url": url,
                          "tag": tag or "neo", "icon": "/logo192.png"})
    sent = 0
    for s in subs:
        dead = await asyncio.to_thread(_send_one, s["subscription"], payload)
        if dead:
            await db.push_subscriptions.delete_one({"endpoint": s["endpoint"]})
        else:
            sent += 1
    return sent
