"""Tests du renseignement entreprise data.gouv + heuristique de crédit (company_finance.py)."""
import os
import sys
import asyncio
from pathlib import Path

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "unit_test_fake")
os.environ.setdefault("JWT_SECRET", "unit-test-secret")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import company_finance as cf  # noqa: E402
from tests.fakes import FakeDB  # noqa: E402

LEO = {"id": "leo", "email": "leo.sperl@alphagency.fr"}


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ==================== Heuristique de crédit (règles transparentes) ====================

def test_introuvable_avance_uniquement():
    c = cf.compute_credit_advice(None)
    assert c["level"] == "rouge" and c["limit"] == 0


def test_radiee_avance_uniquement():
    c = cf.compute_credit_advice({"actif": False, "finances": {"2024": {"ca": 1e9, "resultat_net": 1e8}}})
    assert c["level"] == "rouge" and c["limit"] == 0


def test_comptes_non_publies_acompte():
    c = cf.compute_credit_advice({"actif": True, "date_creation": "2015-01-01", "finances": None})
    assert c["level"] == "orange" and c["limit"] == 500


def test_resultat_negatif_encours_borne():
    c = cf.compute_credit_advice({"actif": True, "date_creation": "2015-01-01",
                                  "finances": {"2024": {"ca": 500000, "resultat_net": -20000}}})
    assert c["level"] == "orange"
    assert c["limit"] == 1000  # 1 % de 500k = 5000 mais plafonné à 1000


def test_sain_30j_et_plafond():
    c = cf.compute_credit_advice({"actif": True, "date_creation": "2015-01-01",
                                  "finances": {"2024": {"ca": 400000, "resultat_net": 40000}}})
    # 0,5 % × 400k + 5 % × 40k = 2000 + 2000 = 4000
    assert c["level"] == "vert" and c["limit"] == 4000
    c2 = cf.compute_credit_advice({"actif": True, "date_creation": "2010-01-01",
                                   "finances": {"2024": {"ca": 20_000_000, "resultat_net": 2_000_000}}})
    assert c2["limit"] == 5000  # plafond global


def test_jeune_entreprise_reduit_de_moitie():
    from datetime import datetime, timezone
    this_year = datetime.now(timezone.utc).year
    c = cf.compute_credit_advice({"actif": True, "date_creation": f"{this_year}-01-01",
                                  "finances": {"2024": {"ca": 400000, "resultat_net": 40000}}})
    assert c["limit"] == 2000  # 4000 × 0,5


def test_derniere_annee_retenue():
    c = cf.compute_credit_advice({"actif": True, "date_creation": "2015-01-01",
                                  "finances": {"2022": {"ca": 100, "resultat_net": -5},
                                               "2024": {"ca": 400000, "resultat_net": 40000}}})
    assert c["year"] == "2024" and c["level"] == "vert"


# ==================== Parsing API ====================

@pytest.fixture()
def api_mock(monkeypatch):
    payload = {"results": [{
        "siren": "306138900", "nom_complet": "DECATHLON", "etat_administratif": "A",
        "date_creation": "1976-07-09", "activite_principale": "47.64Z",
        "tranche_effectif_salarie": "53",
        "siege": {"adresse": "4 BD DE MONS 59650 VILLENEUVE-D'ASCQ"},
        "dirigeants": [{"nom": "X", "prenoms": "Y", "qualite": "Président"}],
        "finances": {"2024": {"ca": 16207285000, "resultat_net": 1144531000}},
    }]}

    async def fake_fetch(query):
        return payload

    monkeypatch.setattr(cf, "_fetch_raw", fake_fetch)
    return payload


def test_fetch_normalise(api_mock):
    c = run(cf.fetch_company_data("decathlon"))
    assert c["nom"] == "DECATHLON" and c["actif"] is True
    assert c["effectif"] == "10000+"
    assert c["finances"]["2024"]["ca"] == 16207285000
    assert c["source"].endswith("api.gouv.fr")


def test_fetch_vide(monkeypatch):
    async def fake_fetch(query):
        return {"results": []}
    monkeypatch.setattr(cf, "_fetch_raw", fake_fetch)
    assert run(cf.fetch_company_data("zzz")) is None


def test_api_en_panne_ne_casse_rien(monkeypatch):
    async def fake_fetch(query):
        raise RuntimeError("down")
    monkeypatch.setattr(cf, "_fetch_raw", fake_fetch)
    assert run(cf.fetch_company_data("x")) is None
    advice = cf.compute_credit_advice(None)
    assert advice["level"] == "rouge"


# ==================== Cache sur la fiche contact ====================

def test_refresh_contact_insights(api_mock, monkeypatch):
    fdb = FakeDB()
    monkeypatch.setattr(cf, "db", fdb)
    run(fdb["contacts"].insert_one({"id": "c1", "company": "Decathlon"}))
    res = run(cf.refresh_contact_insights("c1", current_user=LEO))
    assert res["success"] is True and res["cached"] is True
    doc = run(fdb["contacts"].find_one({"id": "c1"}))
    assert doc["company_insights"]["nom"] == "DECATHLON"
    assert doc["company_credit"]["level"] == "vert"
    assert doc["company_insights_at"]


def test_refresh_sans_entreprise(monkeypatch):
    fdb = FakeDB()
    monkeypatch.setattr(cf, "db", fdb)
    run(fdb["contacts"].insert_one({"id": "c1", "first_name": "Ana"}))
    res = run(cf.refresh_contact_insights("c1", current_user=LEO))
    assert res["success"] is False
