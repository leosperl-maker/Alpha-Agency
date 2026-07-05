"""Tests de la réconciliation quotes → invoices (routes/quotes_legacy.py).
Garanties testées : dry-run par défaut, copie sans suppression, idempotence."""
import os
import sys
import asyncio
from pathlib import Path

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "unit_test_fake")
os.environ.setdefault("JWT_SECRET", "unit-test-secret")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import quotes_legacy as ql  # noqa: E402
from tests.fakes import FakeDB  # noqa: E402

LEO = {"id": "leo", "email": "leo.sperl@alphagency.fr"}


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture()
def fake_db(monkeypatch):
    fdb = FakeDB()
    monkeypatch.setattr(ql, "db", fdb)
    # la migration réelle journalise via neo_assistant._log → fake aussi (sinon
    # timeout Motor de 30 s vers un Mongo inexistant)
    import routes.neo_assistant as na
    monkeypatch.setattr(na, "db", fdb)
    run(fdb["quotes"].insert_one({"id": "q1", "quote_number": "DEV-2025-003", "status": "envoyé",
                                  "total": 1200, "client_name": "ACME", "contact_id": "c1",
                                  "created_at": "2025-11-02T10:00:00+00:00"}))
    run(fdb["quotes"].insert_one({"id": "q2", "number": "Q-17", "status": "brouillon",
                                  "total": 800, "client_name": "Beta"}))
    run(fdb["invoices"].insert_one({"id": "i1", "document_type": "devis", "invoice_number": "DEV-2026-001"}))
    return fdb


def test_audit(fake_db):
    res = run(ql.audit_legacy_quotes(current_user=LEO))
    assert res["legacy_total"] == 2 and res["to_migrate"] == 2 and res["already_migrated"] == 0
    assert res["invoices_devis_count"] == 1
    assert res["by_status"] == {"envoyé": 1, "brouillon": 1}


def test_migration_dry_run_par_defaut_ne_touche_rien(fake_db):
    res = run(ql.migrate_legacy_quotes(current_user=LEO))
    assert res["dry_run"] is True and res["migrated"] == 0 and res["to_migrate"] == 2
    assert len(res["plan"]) == 2
    assert len(fake_db["invoices"].docs) == 1          # rien écrit
    assert all(not d.get("migrated_to_invoices") for d in fake_db["quotes"].docs)


def test_migration_reelle_copie_sans_supprimer(fake_db):
    res = run(ql.migrate_legacy_quotes(dry_run=False, current_user=LEO))
    assert res["migrated"] == 2
    assert len(fake_db["quotes"].docs) == 2            # ORIGINAUX CONSERVÉS
    assert all(d.get("migrated_to_invoices") for d in fake_db["quotes"].docs)
    devis = [d for d in fake_db["invoices"].docs if d.get("migrated_from_quotes")]
    assert len(devis) == 2
    byq = {d["migrated_from_quotes"]: d for d in devis}
    # numéro DEV- existant conservé ; sinon numéro de migration explicite
    assert byq["q1"]["invoice_number"] == "DEV-2025-003"
    assert byq["q2"]["invoice_number"].startswith("DEV-MIG-")
    # statuts mappés vers le vocabulaire Facturation
    assert byq["q1"]["status"] == "envoyée" and byq["q2"]["status"] == "brouillon"
    assert all(d["document_type"] == "devis" for d in devis)


def test_migration_idempotente(fake_db):
    run(ql.migrate_legacy_quotes(dry_run=False, current_user=LEO))
    res2 = run(ql.migrate_legacy_quotes(dry_run=False, current_user=LEO))
    assert res2["to_migrate"] == 0 and res2["migrated"] == 0
    assert len([d for d in fake_db["invoices"].docs if d.get("migrated_from_quotes")]) == 2
