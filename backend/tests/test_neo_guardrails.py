"""
Tests unitaires des garde-fous de la couche outils de Néo (AUCUNE base réelle :
la db Motor est remplacée par un faux en mémoire). Couvre :
  - whitelists lecture (_CRM_READONLY) et écriture (_CRM_WRITABLE)
  - crm_delete : refus si filtre vide / 0 match / >1 matches, suppression par id si 1 match
  - crm_create / crm_update : validation des entrées
  - execute_tool : outil inconnu, validation humaine (pending) avant action sensible
  - collections sensibles exclues des whitelists

Lancement :
  cd backend && ../.venv-backend/bin/python -m pytest tests/test_neo_guardrails.py -q
"""
import os
import sys
import asyncio
from pathlib import Path

import pytest

# Env factice AVANT l'import du backend (aucune connexion réelle : Motor est lazy)
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "unit_test_fake")
os.environ.setdefault("JWT_SECRET", "unit-test-secret")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import neo_assistant as neo  # noqa: E402
from tests.fakes import FakeDB  # noqa: E402


@pytest.fixture()
def fake_db(monkeypatch):
    fdb = FakeDB()
    monkeypatch.setattr(neo, "db", fdb)
    return fdb


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ==================== Whitelists ====================

SENSITIVE = [
    "users", "settings", "gmail_credentials", "drive_credentials", "qonto_tokens",
    "instagram_credentials", "meta_connections", "bank_transactions",
    "payment_transactions", "transfers", "subscriptions", "ai_usage",
    "neo_memory", "neo_action_log", "neo_pending_actions", "pdf_tokens", "counters",
]


@pytest.mark.parametrize("coll", SENSITIVE)
def test_collections_sensibles_hors_whitelists(coll):
    assert coll not in neo._CRM_WRITABLE, f"{coll} ne doit JAMAIS être inscriptible par Néo"
    assert coll not in neo._CRM_READONLY, f"{coll} ne doit pas être lisible via crm_query"


def test_crm_query_refuse_collection_non_listee(fake_db):
    res = run(neo._exec_crm_query({"collection": "users"}, "u1"))
    assert res["success"] is False


def test_crm_query_lit_collection_autorisee(fake_db):
    run(fake_db["contacts"].insert_one({"id": "c1", "first_name": "Ana"}))
    res = run(neo._exec_crm_query({"collection": "contacts", "filter": {"id": "c1"}}, "u1"))
    assert res["success"] is True and res["count"] == 1


# ==================== crm_create / crm_update ====================

def test_crm_create_refuse_collection_sensible(fake_db):
    for coll in ("users", "transfers", "bank_transactions", "qonto_tokens"):
        res = run(neo._exec_crm_create({"collection": coll, "data": {"x": 1}}, "u1"))
        assert res["success"] is False, coll
    assert fake_db["users"].docs == []


def test_crm_create_exige_des_donnees(fake_db):
    res = run(neo._exec_crm_create({"collection": "contacts", "data": {}}, "u1"))
    assert res["success"] is False


def test_crm_create_genere_id_et_tracabilite(fake_db):
    res = run(neo._exec_crm_create({"collection": "contacts", "data": {"first_name": "Bob", "_id": "hack"}}, "leo"))
    assert res["success"] is True
    doc = fake_db["contacts"].docs[0]
    assert doc["id"] and doc["created_by"] == "leo" and doc["created_at"]
    assert "_id" not in doc  # _id fourni par le modèle est ignoré


def test_crm_update_exige_filtre_et_updates(fake_db):
    assert run(neo._exec_crm_update({"collection": "contacts", "filter": {}, "updates": {"a": 1}}, "u"))["success"] is False
    assert run(neo._exec_crm_update({"collection": "contacts", "filter": {"id": "x"}, "updates": {}}, "u"))["success"] is False


def test_crm_update_protege_les_champs_id(fake_db):
    run(fake_db["contacts"].insert_one({"id": "c1", "name": "Ana"}))
    res = run(neo._exec_crm_update({"collection": "contacts", "filter": {"id": "c1"},
                                    "updates": {"id": "AUTRE", "_id": "AUTRE", "name": "Ana B."}}, "u"))
    assert res["success"] is True
    doc = fake_db["contacts"].docs[0]
    assert doc["id"] == "c1" and doc["name"] == "Ana B."


# ==================== crm_delete (anti-incident de juin) ====================

def test_crm_delete_refuse_filtre_vide(fake_db):
    run(fake_db["invoices"].insert_one({"id": "i1"}))
    res = run(neo._exec_crm_delete({"collection": "invoices", "filter": {}}, "u"))
    assert res["success"] is False
    assert len(fake_db["invoices"].docs) == 1


def test_crm_delete_zero_match_ne_supprime_rien(fake_db):
    run(fake_db["invoices"].insert_one({"id": "i1", "client_name": "ACME"}))
    res = run(neo._exec_crm_delete({"collection": "invoices", "filter": {"client_name": "Inconnu"}}, "u"))
    assert res["success"] is False and res.get("deleted") == 0
    assert len(fake_db["invoices"].docs) == 1


def test_crm_delete_refuse_si_plusieurs_matches(fake_db):
    run(fake_db["invoices"].insert_one({"id": "i1", "client_name": "ACME", "invoice_number": "FAC-1"}))
    run(fake_db["invoices"].insert_one({"id": "i2", "client_name": "ACME", "invoice_number": "FAC-2"}))
    res = run(neo._exec_crm_delete({"collection": "invoices", "filter": {"client_name": "ACME"}}, "u"))
    assert res["success"] is False and res.get("ambiguous") is True
    assert len(res["candidates"]) == 2
    assert len(fake_db["invoices"].docs) == 2  # RIEN supprimé


def test_crm_delete_unique_match_supprime_par_id(fake_db):
    run(fake_db["invoices"].insert_one({"id": "i1", "client_name": "ACME", "invoice_number": "FAC-1"}))
    run(fake_db["invoices"].insert_one({"id": "i2", "client_name": "Beta"}))
    res = run(neo._exec_crm_delete({"collection": "invoices", "filter": {"client_name": "ACME"}}, "u"))
    assert res["success"] is True and res["result"]["deleted"] == 1
    restants = [d["id"] for d in fake_db["invoices"].docs]
    assert restants == ["i2"]


def test_crm_delete_refuse_collection_sensible(fake_db):
    res = run(neo._exec_crm_delete({"collection": "users", "filter": {"id": "u1"}}, "u"))
    assert res["success"] is False


# ==================== execute_tool : validation humaine ====================

def test_execute_tool_inconnu(fake_db):
    res = run(neo.execute_tool("outil_qui_nexiste_pas", {}, "leo"))
    assert res["success"] is False


def test_action_sensible_passe_en_pending_sans_confirmation(fake_db):
    res = run(neo.execute_tool("crm_delete", {"collection": "invoices", "filter": {"id": "i1"}}, "leo"))
    assert res.get("pending") is True and res.get("action_id")
    # L'action est journalisée en attente, rien n'est exécuté
    assert len(fake_db["neo_pending_actions"].docs) == 1
    assert fake_db["neo_pending_actions"].docs[0]["status"] == "pending"


def test_action_sensible_confirmee_est_executee(fake_db):
    run(fake_db["invoices"].insert_one({"id": "i1", "invoice_number": "FAC-1"}))
    res = run(neo.execute_tool("crm_delete", {"collection": "invoices", "filter": {"id": "i1"}}, "leo", confirmed=True))
    assert res["success"] is True
    assert fake_db["invoices"].docs == []
    # Journal d'audit alimenté
    kinds = [d["kind"] for d in fake_db["neo_action_log"].docs]
    assert "executed" in kinds


def test_outils_a_validation_declares():
    """send_followup, merge_contacts et crm_delete doivent exiger une validation humaine."""
    for name in ("send_followup", "merge_contacts", "crm_delete"):
        assert neo._SPEC[name]["validation"] is True, name


# ==================== Mémoire ====================

def test_remember_type_invalide_retombe_sur_client_fact(fake_db):
    res = run(neo._exec_remember({"type": "n_importe_quoi", "content": "Léo préfère les devis en TTC"}, "leo"))
    assert res["success"] is True
    assert fake_db["neo_memory"].docs[0]["type"] == "client_fact"


def test_remember_tronque_a_2000(fake_db):
    run(neo._exec_remember({"type": "rule", "content": "x" * 5000}, "leo"))
    assert len(fake_db["neo_memory"].docs[0]["content"]) == 2000
