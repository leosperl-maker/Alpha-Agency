"""
Tests unitaires du moteur de signaux proactifs (routes/neo_signals.py).
Faux Mongo en mémoire — aucun réseau, aucune vraie base.

Lancement :
  cd backend && ../.venv-backend/bin/python -m pytest tests/test_neo_signals.py -q
"""
import os
import sys
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "unit_test_fake")
os.environ.setdefault("JWT_SECRET", "unit-test-secret")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import neo_signals as ns  # noqa: E402
from tests.fakes import FakeDB  # noqa: E402

NOW = datetime.now(timezone.utc)
iso = lambda d: d.isoformat()  # noqa: E731


@pytest.fixture()
def fake_db(monkeypatch):
    fdb = FakeDB()
    monkeypatch.setattr(ns, "db", fdb)
    return fdb


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def seed_invoice(db, **kw):
    doc = {"id": "i1", "invoice_number": "FAC-2026-001", "client_name": "ACME",
           "document_type": "facture", "status": "envoyée", "total": 1200.0,
           "due_date": iso(NOW - timedelta(days=10)), "created_at": iso(NOW - timedelta(days=40))}
    doc.update(kw)
    run(db["invoices"].insert_one(doc))
    return doc


# ==================== Détections ====================

def test_facture_en_retard_detectee(fake_db):
    seed_invoice(fake_db)
    sigs = run(ns.detect_signals())
    assert len(sigs) == 1
    s = sigs[0]
    assert s["type"] == "invoice_overdue" and s["severity"] == "high"
    assert s["days"] == 10 and s["amount"] == 1200.0
    assert "FAC-2026-001" in s["neo_prompt"] and "ACME" in s["neo_prompt"]


def test_facture_payee_ou_brouillon_ignoree(fake_db):
    seed_invoice(fake_db, id="i1", status="payée")
    seed_invoice(fake_db, id="i2", status="brouillon")
    assert run(ns.detect_signals()) == []


def test_devis_jamais_en_impaye_mais_en_relance(fake_db):
    # Un devis en attente depuis 8 j → signal quote_pending, PAS invoice_overdue
    seed_invoice(fake_db, id="d1", document_type="devis", status="envoyée",
                 invoice_number="DEV-2026-014", created_at=iso(NOW - timedelta(days=8)))
    sigs = run(ns.detect_signals())
    assert [s["type"] for s in sigs] == ["quote_pending"]
    assert sigs[0]["days"] == 8


def test_devis_recent_pas_de_signal(fake_db):
    seed_invoice(fake_db, id="d1", document_type="devis", status="envoyée",
                 created_at=iso(NOW - timedelta(days=3)))
    assert run(ns.detect_signals()) == []


def test_deal_stagnant_seuil_et_gravite(fake_db):
    run(fake_db["opportunities"].insert_one({
        "id": "o1", "title": "Petit deal", "stage": "proposition", "amount": 800,
        "updated_at": iso(NOW - timedelta(days=15))}))
    run(fake_db["opportunities"].insert_one({
        "id": "o2", "title": "Gros deal", "stage": "negociation", "amount": 5000,
        "updated_at": iso(NOW - timedelta(days=20))}))
    run(fake_db["opportunities"].insert_one({
        "id": "o3", "title": "Deal actif", "stage": "closing", "amount": 9000,
        "updated_at": iso(NOW - timedelta(days=2))}))
    run(fake_db["opportunities"].insert_one({
        "id": "o4", "title": "Deal gagné", "stage": "gagne", "amount": 9000,
        "updated_at": iso(NOW - timedelta(days=90))}))
    sigs = run(ns.detect_signals())
    by_id = {s["entity_id"]: s for s in sigs}
    assert set(by_id) == {"o1", "o2"}          # actif récent et gagné exclus
    assert by_id["o2"]["severity"] == "high"    # ≥ 3000 € → prioritaire
    assert by_id["o1"]["severity"] == "normal"
    assert sigs[0]["entity_id"] == "o2"         # tri : high d'abord


def test_deal_archive_ignore(fake_db):
    run(fake_db["opportunities"].insert_one({
        "id": "o1", "title": "Vieux deal", "stage": "proposition", "amount": 5000,
        "archived": True, "updated_at": iso(NOW - timedelta(days=60))}))
    assert run(ns.detect_signals()) == []


def test_tache_en_retard(fake_db):
    run(fake_db["tasks"].insert_one({"id": "t1", "title": "Rappeler ACME", "status": "todo",
                                     "due_date": iso(NOW - timedelta(days=8))}))
    run(fake_db["tasks"].insert_one({"id": "t2", "title": "Fait", "status": "done",
                                     "due_date": iso(NOW - timedelta(days=8))}))
    sigs = run(ns.detect_signals())
    assert len(sigs) == 1 and sigs[0]["type"] == "task_overdue"
    assert sigs[0]["severity"] == "high"  # ≥ 7 j de retard


def test_lead_chaud_sans_suite(fake_db):
    run(fake_db["contacts"].insert_one({
        "id": "c1", "first_name": "Sonia", "last_name": "Rime", "company": "Ti Boutik",
        "status": "nouveau", "score": "chaud", "updated_at": iso(NOW - timedelta(days=4))}))
    run(fake_db["contacts"].insert_one({
        "id": "c2", "first_name": "Paul", "status": "nouveau", "score": "froid",
        "updated_at": iso(NOW - timedelta(days=30))}))
    run(fake_db["contacts"].insert_one({
        "id": "c3", "first_name": "Zoé", "status": "nouveau", "score_value": 85,
        "updated_at": iso(NOW - timedelta(hours=5))}))  # chaud mais traité récemment
    sigs = run(ns.detect_signals())
    assert [s["entity_id"] for s in sigs] == ["c1"]
    assert "Sonia Rime" in sigs[0]["title"]


# ==================== Règles configurables ====================

def test_regles_personnalisees_surchargent_les_defauts(fake_db):
    run(fake_db["settings"].insert_one({"type": "neo_signal_rules", "deal_stagnant_days": 30,
                                        "enabled": {"task_overdue": False}}))
    rules = run(ns.get_rules())
    assert rules["deal_stagnant_days"] == 30
    assert rules["enabled"]["task_overdue"] is False
    assert rules["quote_pending_days"] == ns.DEFAULT_RULES["quote_pending_days"]  # non touché

    # Un deal à 20 j ne déclenche plus (seuil 30), une tâche en retard non plus (désactivée)
    run(fake_db["opportunities"].insert_one({
        "id": "o1", "title": "Deal", "stage": "proposition", "amount": 5000,
        "updated_at": iso(NOW - timedelta(days=20))}))
    run(fake_db["tasks"].insert_one({"id": "t1", "title": "X", "status": "todo",
                                     "due_date": iso(NOW - timedelta(days=3))}))
    assert run(ns.detect_signals()) == []


def test_detecteur_qui_casse_ne_fait_pas_tomber_le_scan(fake_db, monkeypatch):
    seed_invoice(fake_db)  # facture en retard valide

    class Boom:
        def find(self, *a, **k):
            raise RuntimeError("boom")

    fake_db._colls["opportunities"] = Boom()
    sigs = run(ns.detect_signals())
    assert [s["type"] for s in sigs] == ["invoice_overdue"]  # les autres détecteurs survivent


# ==================== scan_and_notify ====================

def test_scan_notifie_le_prioritaire_avec_dedup(fake_db, monkeypatch):
    seed_invoice(fake_db)  # high
    run(fake_db["opportunities"].insert_one({
        "id": "o1", "title": "Petit deal", "stage": "proposition", "amount": 100,
        "updated_at": iso(NOW - timedelta(days=40))}))  # normal → pas de notif

    deposited = []

    async def fake_deposit(ntype, title, message, priority="normal", data=None, dedup_key=None):
        if any(d["dedup_key"] == dedup_key for d in deposited):
            return False
        deposited.append({"type": ntype, "title": title, "priority": priority,
                          "dedup_key": dedup_key, "data": data})
        return True

    async def fake_log(kind, payload):
        return None

    import routes.neo_assistant as na
    monkeypatch.setattr(na, "_deposit_notification", fake_deposit)
    monkeypatch.setattr(na, "_log", fake_log)

    res = run(ns.scan_and_notify())
    assert res["success"] is True and res["total"] == 2 and res["notified"] == 1
    assert deposited[0]["priority"] == "high"
    assert deposited[0]["data"]["neo_prompt"]  # l'action en 1 clic est embarquée

    # Second scan le même jour : dédupliqué
    res2 = run(ns.scan_and_notify())
    assert res2["notified"] == 0
