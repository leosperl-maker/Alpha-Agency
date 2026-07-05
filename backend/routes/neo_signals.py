"""
Moteur de signaux proactifs de Néo (Lot E de la refonte).

Détecte les situations qui méritent une alerte SANS que Léo demande :
  - facture en retard (impayé)
  - deal du pipeline qui stagne
  - devis en attente depuis trop longtemps (relance)
  - tâche en retard
  - lead chaud laissé sans suite

Chaque signal embarque un `neo_prompt` : la phrase à envoyer à Néo pour traiter
le signal en un clic (on réutilise toute la machinerie agentique + garde-fous
existante au lieu de dupliquer une couche d'actions).

Les seuils sont configurables (collection settings, type "neo_signal_rules").
Le scan planifié (matin/fin de journée, heure Guadeloupe) dépose des notifications
in-app dédupliquées par jour via _deposit_notification.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import logging

from .database import db, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/neo/signals", tags=["Neo Signals"])

# Statuts considérés comme réglés pour une facture
_PAID = ("payée", "payee", "payé", "paye", "annulée", "annulee", "annulé", "brouillon")
# Étapes de pipeline closes (pas de stagnation possible)
_CLOSED_STAGES = ("gagne", "perdu")
# Statuts de devis "en attente d'une réponse"
_QUOTE_PENDING = ("brouillon", "en_attente", "envoyée", "envoyee", "envoyé", "envoye")

DEFAULT_RULES = {
    "deal_stagnant_days": 14,   # deal sans mouvement au-delà → signal
    "quote_pending_days": 7,    # devis sans réponse au-delà → relance
    "hot_lead_days": 3,         # lead chaud sans suite au-delà → signal
    "big_deal_amount": 3000,    # montant à partir duquel un signal passe en priorité haute
    "backup_stale_hours": 48,   # aucune sauvegarde réussie depuis X h → alerte (leçon de juin)
    "enabled": {
        "invoice_overdue": True,
        "deal_stagnant": True,
        "quote_pending": True,
        "task_overdue": True,
        "hot_lead": True,
        "backup_stale": True,
    },
}


def _to_dt(val):
    """Parse tolérant d'une date ISO (str) ou datetime. None si invalide."""
    if not val:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    try:
        d = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _days_since(val, now):
    d = _to_dt(val)
    return int((now - d).total_seconds() // 86400) if d else None


async def get_rules() -> dict:
    """Règles effectives = défauts surchargés par settings.neo_signal_rules."""
    rules = {**DEFAULT_RULES, "enabled": dict(DEFAULT_RULES["enabled"])}
    try:
        saved = await db.settings.find_one({"type": "neo_signal_rules"}, {"_id": 0})
        if saved:
            for k in ("deal_stagnant_days", "quote_pending_days", "hot_lead_days", "big_deal_amount", "backup_stale_hours"):
                if isinstance(saved.get(k), (int, float)) and saved[k] > 0:
                    rules[k] = int(saved[k])
            if isinstance(saved.get("enabled"), dict):
                rules["enabled"].update({k: bool(v) for k, v in saved["enabled"].items()})
    except Exception as e:
        logger.warning(f"neo_signals: lecture des règles KO ({e}), défauts utilisés")
    return rules


def _signal(stype, severity, title, message, collection, entity_id, label,
            neo_prompt, amount=None, days=None):
    return {
        "id": f"{stype}:{entity_id}",
        "type": stype, "severity": severity, "title": title, "message": message,
        "collection": collection, "entity_id": entity_id, "label": label,
        "amount": amount, "days": days, "neo_prompt": neo_prompt,
    }


async def detect_signals(rules: dict = None) -> list:
    """Calcule tous les signaux. Chaque détecteur est isolé : un détecteur qui
    casse ne fait jamais tomber le scan complet."""
    rules = rules or await get_rules()
    now = datetime.now(timezone.utc)
    enabled = rules.get("enabled", {})
    signals = []

    # 1) Factures en retard
    if enabled.get("invoice_overdue", True):
        try:
            invoices = await db.invoices.find(
                {"document_type": {"$ne": "devis"}},
                {"_id": 0, "id": 1, "invoice_number": 1, "client_name": 1,
                 "status": 1, "total": 1, "due_date": 1}).to_list(2000)
            for inv in invoices:
                status = (inv.get("status") or "").lower()
                if status in _PAID:
                    continue
                due = _to_dt(inv.get("due_date"))
                if inv.get("status") == "en_retard" or (due and due < now):
                    days = _days_since(inv.get("due_date"), now) or 0
                    num = inv.get("invoice_number") or inv.get("id")
                    total = inv.get("total") or 0
                    client = inv.get("client_name") or "client inconnu"
                    signals.append(_signal(
                        "invoice_overdue", "high",
                        f"Facture en retard : {num}",
                        f"{client} — {total:.0f}€, en retard de {days} j.",
                        "invoices", inv.get("id"), num,
                        f"Prépare la relance de la facture {num} de {client} ({total:.0f}€, "
                        f"{days} jours de retard) : vérifie l'historique du contact et propose le mail de relance.",
                        amount=total, days=days))
        except Exception as e:
            logger.warning(f"neo_signals invoice_overdue KO: {e}")

    # 2) Deals qui stagnent
    if enabled.get("deal_stagnant", True):
        try:
            opps = await db.opportunities.find(
                {"archived": {"$ne": True}},
                {"_id": 0, "id": 1, "title": 1, "stage": 1, "amount": 1, "updated_at": 1}).to_list(1000)
            for o in opps:
                if (o.get("stage") or "") in _CLOSED_STAGES:
                    continue
                days = _days_since(o.get("updated_at"), now)
                if days is not None and days >= rules["deal_stagnant_days"]:
                    amount = o.get("amount") or 0
                    sev = "high" if amount >= rules["big_deal_amount"] else "normal"
                    signals.append(_signal(
                        "deal_stagnant", sev,
                        f"Deal qui stagne : {o.get('title')}",
                        f"Sans mouvement depuis {days} j (étape « {o.get('stage')} », {amount:.0f}€).",
                        "opportunities", o.get("id"), o.get("title"),
                        f"Le deal « {o.get('title')} » ({amount:.0f}€) n'a pas bougé depuis {days} jours "
                        f"(étape {o.get('stage')}). Analyse la situation et propose la prochaine action concrète.",
                        amount=amount, days=days))
        except Exception as e:
            logger.warning(f"neo_signals deal_stagnant KO: {e}")

    # 3) Devis en attente (relance)
    if enabled.get("quote_pending", True):
        try:
            quotes = await db.invoices.find(
                {"document_type": "devis"},
                {"_id": 0, "id": 1, "invoice_number": 1, "client_name": 1,
                 "status": 1, "total": 1, "created_at": 1}).to_list(2000)
            for q in quotes:
                if (q.get("status") or "").lower() not in _QUOTE_PENDING:
                    continue
                days = _days_since(q.get("created_at"), now)
                if days is not None and days >= rules["quote_pending_days"]:
                    num = q.get("invoice_number") or q.get("id")
                    total = q.get("total") or 0
                    client = q.get("client_name") or "client inconnu"
                    signals.append(_signal(
                        "quote_pending", "normal",
                        f"Devis sans réponse : {num}",
                        f"{client} — {total:.0f}€, envoyé il y a {days} j.",
                        "invoices", q.get("id"), num,
                        f"Le devis {num} de {client} ({total:.0f}€) est sans réponse depuis {days} jours. "
                        f"Prépare une relance adaptée.",
                        amount=total, days=days))
        except Exception as e:
            logger.warning(f"neo_signals quote_pending KO: {e}")

    # 4) Tâches en retard
    if enabled.get("task_overdue", True):
        try:
            tasks = await db.tasks.find(
                {"status": {"$nin": ["done", "cancelled"]}},
                {"_id": 0, "id": 1, "title": 1, "due_date": 1, "priority": 1}).to_list(500)
            for t in tasks:
                due = _to_dt(t.get("due_date"))
                if due and due < now:
                    days = _days_since(t.get("due_date"), now) or 0
                    signals.append(_signal(
                        "task_overdue", "high" if (t.get("priority") == "haute" or days >= 7) else "normal",
                        f"Tâche en retard : {t.get('title')}",
                        f"Échéance dépassée de {days} j.",
                        "tasks", t.get("id"), t.get("title"),
                        f"La tâche « {t.get('title')} » est en retard de {days} jours. "
                        f"Aide-moi à la traiter maintenant ou à la replanifier intelligemment.",
                        days=days))
        except Exception as e:
            logger.warning(f"neo_signals task_overdue KO: {e}")

    # 5) Leads chauds sans suite
    if enabled.get("hot_lead", True):
        try:
            leads = await db.contacts.find(
                {"status": "nouveau"},
                {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "company": 1,
                 "score": 1, "score_value": 1, "updated_at": 1, "created_at": 1}).to_list(2000)
            for c in leads:
                sv = c.get("score_value")
                hot = (sv >= 70) if isinstance(sv, (int, float)) else (c.get("score") in ("chaud", "chaude"))
                if not hot:
                    continue
                days = _days_since(c.get("updated_at") or c.get("created_at"), now)
                if days is not None and days >= rules["hot_lead_days"]:
                    name = " ".join(filter(None, [c.get("first_name"), c.get("last_name")])) or c.get("company") or "lead"
                    signals.append(_signal(
                        "hot_lead", "high",
                        f"Lead chaud sans suite : {name}",
                        f"Aucune action depuis {days} j.",
                        "contacts", c.get("id"), name,
                        f"Le lead chaud {name}{' (' + c['company'] + ')' if c.get('company') else ''} "
                        f"n'a pas été traité depuis {days} jours. Prépare la prise de contact.",
                        days=days))
        except Exception as e:
            logger.warning(f"neo_signals hot_lead KO: {e}")

    # 6) Sauvegardes : aucune sauvegarde réussie récente = risque majeur (incident de juin).
    if enabled.get("backup_stale", True):
        try:
            history = await db.backup_history.find({}, {"_id": 0, "started_at": 1, "status": 1,
                                                        "success": 1}).to_list(200)
            ok_runs = [h for h in history
                       if h.get("success") is True or (h.get("status") or "").lower() in ("success", "completed", "ok")]
            last_ok = max((_to_dt(h.get("started_at")) for h in ok_runs if _to_dt(h.get("started_at"))),
                          default=None)
            stale_h = rules.get("backup_stale_hours", 48)
            hours = int((now - last_ok).total_seconds() // 3600) if last_ok else None
            if last_ok is None or hours >= stale_h:
                msg = (f"Dernière sauvegarde réussie il y a {hours} h." if last_ok
                       else "Aucune sauvegarde réussie trouvée dans l'historique.")
                signals.append(_signal(
                    "backup_stale", "high",
                    "Sauvegardes en retard",
                    msg + " Après l'incident de juin, c'est le risque n°1.",
                    "backup_history", "backup", "sauvegardes",
                    "Les sauvegardes MongoDB semblent en retard. Vérifie l'état du système de "
                    "sauvegarde (page Sauvegardes) et dis-moi ce qui bloque.",
                    days=(hours // 24) if hours else None))
        except Exception as e:
            logger.warning(f"neo_signals backup_stale KO: {e}")

    # Priorité haute d'abord, puis montant décroissant, puis ancienneté
    signals.sort(key=lambda s: (0 if s["severity"] == "high" else 1,
                                -(s.get("amount") or 0), -(s.get("days") or 0)))
    return signals


async def scan_and_notify() -> dict:
    """Scan complet + dépôt de notifications in-app (dédup par jour et par signal).
    Appelé par le scheduler et par POST /neo/signals/scan. Jamais bloquant."""
    rules = await get_rules()
    signals = await detect_signals(rules)
    deposited = 0
    # Import ici pour éviter tout risque de cycle au chargement du module
    from .neo_assistant import _deposit_notification, _log
    for s in signals:
        if s["severity"] != "high":
            continue  # in-app : on ne notifie que le prioritaire, le reste vit dans la page/endpoint
        ok = await _deposit_notification(
            "neo_signal", s["title"], s["message"], priority="high",
            data={"signal": s, "neo_prompt": s["neo_prompt"]},
            dedup_key=s["id"])
        deposited += 1 if ok else 0
    try:
        await _log("signals_scan", {"total": len(signals), "notified": deposited})
    except Exception:
        pass
    return {"success": True, "total": len(signals), "notified": deposited,
            "computed_at": datetime.now(timezone.utc).isoformat()}


def register_jobs(scheduler):
    """Branche le scan sur le scheduler APScheduler existant (heure Guadeloupe).
    07:45 : avant le briefing du matin. 17:45 : avant le récap du soir."""
    try:
        from apscheduler.triggers.cron import CronTrigger
        scheduler.add_job(scan_and_notify, CronTrigger(hour=7, minute=45),
                          id="neo_signals_morning", name="Néo signaux (matin)", replace_existing=True)
        scheduler.add_job(scan_and_notify, CronTrigger(hour=17, minute=45),
                          id="neo_signals_evening", name="Néo signaux (soir)", replace_existing=True)
        logger.info("neo_signals: jobs planifiés (07:45 et 17:45, heure Guadeloupe)")
    except Exception as e:
        logger.error(f"neo_signals: échec de planification: {e}")


# ==================== ROUTES ====================

@router.get("")
async def list_signals(current_user: dict = Depends(get_current_user)):
    """Tous les signaux actuels (calcul à la demande, lecture seule)."""
    rules = await get_rules()
    signals = await detect_signals(rules)
    return {"success": True, "count": len(signals),
            "high_count": sum(1 for s in signals if s["severity"] == "high"),
            "signals": signals, "rules": rules,
            "computed_at": datetime.now(timezone.utc).isoformat()}


@router.post("/scan")
async def run_scan(current_user: dict = Depends(get_current_user)):
    """Force un scan + notifications (même chemin que le scheduler)."""
    return await scan_and_notify()


@router.put("/rules")
async def update_rules(payload: dict, current_user: dict = Depends(get_current_user)):
    """Met à jour les seuils/activations des signaux."""
    safe = {}
    for k in ("deal_stagnant_days", "quote_pending_days", "hot_lead_days", "big_deal_amount", "backup_stale_hours"):
        if isinstance(payload.get(k), (int, float)) and payload[k] > 0:
            safe[k] = int(payload[k])
    if isinstance(payload.get("enabled"), dict):
        safe["enabled"] = {k: bool(v) for k, v in payload["enabled"].items()
                           if k in DEFAULT_RULES["enabled"]}
    if not safe:
        return {"success": False, "error": "Aucun champ valide à mettre à jour."}
    await db.settings.update_one({"type": "neo_signal_rules"},
                                 {"$set": {"type": "neo_signal_rules", **safe}}, upsert=True)
    return {"success": True, "rules": await get_rules()}
