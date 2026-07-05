"""Tests unitaires de la mémoire consultable/corrigeable (routes/neo_memory_api.py)."""
import os
import sys
import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "unit_test_fake")
os.environ.setdefault("JWT_SECRET", "unit-test-secret")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import neo_memory_api as mem  # noqa: E402
from tests.fakes import FakeDB  # noqa: E402

LEO = {"id": "leo", "email": "leo.sperl@alphagency.fr"}


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture()
def fake_db(monkeypatch):
    fdb = FakeDB()
    monkeypatch.setattr(mem, "db", fdb)
    for i, (t, c) in enumerate([("rule", "Toujours des devis en TTC"),
                                ("lesson", "Ne jamais sur-affirmer un succès"),
                                ("objective", "CA 10k€/mois"),
                                ("daily_log", "Lundi : 2 relances")]):
        run(fdb["neo_memory"].insert_one({"id": f"m{i}", "type": t, "content": c,
                                          "created_at": f"2026-07-0{i+1}T10:00:00+00:00"}))
    return fdb


def test_liste_triee_et_comptee(fake_db):
    res = run(mem.list_memory(type=None, q=None, limit=200, current_user=LEO))
    assert res["success"] is True and res["count"] == 4
    assert res["items"][0]["id"] == "m3"  # plus récent d'abord
    assert res["counts"]["rule"] == 1


def test_filtre_type_et_texte(fake_db):
    res = run(mem.list_memory(type="rule", q=None, limit=200, current_user=LEO))
    assert [i["type"] for i in res["items"]] == ["rule"]
    res2 = run(mem.list_memory(type=None, q="succès", limit=200, current_user=LEO))
    assert res2["count"] == 1 and res2["items"][0]["type"] == "lesson"


def test_correction(fake_db):
    run(mem.update_memory("m0", mem.MemoryUpdate(content="Devis TTC, TVA 8,5 %"), current_user=LEO))
    doc = run(fake_db["neo_memory"].find_one({"id": "m0"}))
    assert doc["content"] == "Devis TTC, TVA 8,5 %"
    assert doc["corrected_by"] == "leo" and doc["updated_at"]


def test_correction_contenu_vide_refusee(fake_db):
    with pytest.raises(HTTPException) as e:
        run(mem.update_memory("m0", mem.MemoryUpdate(content="   "), current_user=LEO))
    assert e.value.status_code == 400


def test_oubli_par_id_uniquement(fake_db):
    run(mem.delete_memory("m1", current_user=LEO))
    assert run(fake_db["neo_memory"].find_one({"id": "m1"})) is None
    assert len(fake_db["neo_memory"].docs) == 3
    with pytest.raises(HTTPException) as e:
        run(mem.delete_memory("inexistant", current_user=LEO))
    assert e.value.status_code == 404
