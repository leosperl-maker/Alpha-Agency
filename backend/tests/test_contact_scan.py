"""Tests du scan carte de visite → fiche contact (contact_scan.py). Vision Gemini simulée."""
import os
import sys
import base64
import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "unit_test_fake")
os.environ.setdefault("JWT_SECRET", "unit-test-secret")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import contact_scan as cs  # noqa: E402
from tests.fakes import FakeDB  # noqa: E402

LEO = {"id": "leo", "email": "leo.sperl@alphagency.fr"}
IMG = "data:image/jpeg;base64," + base64.b64encode(b"fake-jpeg-bytes").decode()

FIELDS = {"first_name": "Sonia", "last_name": "Rime", "company": "Ti Boutik",
          "poste": "Gérante", "email": "Sonia@TIBOUTIK.gp", "phone": "+590 690 11 22 33",
          "city": "Pointe-à-Pitre", "website": "tiboutik.gp", "siret": "", "notes": "boutique créole"}


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture()
def fake_db(monkeypatch):
    fdb = FakeDB()
    monkeypatch.setattr(cs, "db", fdb)
    import routes.neo_assistant as na
    monkeypatch.setattr(na, "db", fdb)  # _log de la création

    async def fake_extract(blob, mime):
        return dict(FIELDS)

    monkeypatch.setattr(cs, "_extract_with_gemini", fake_extract)
    return fdb


def test_decode_dataurl_et_mime():
    blob, mime = cs._decode_payload(cs.ScanRequest(image_base64=IMG))
    assert blob == b"fake-jpeg-bytes" and mime == "image/jpeg"


def test_decode_pdf_detecte():
    raw = base64.b64encode(b"%PDF-1.4 xxx").decode()
    blob, mime = cs._decode_payload(cs.ScanRequest(image_base64=raw))
    assert mime == "application/pdf"


def test_base64_invalide_rejete():
    with pytest.raises(HTTPException):
        cs._decode_payload(cs.ScanRequest(image_base64=""))


def test_scan_extrait_sans_creer(fake_db):
    res = run(cs.scan_card(cs.ScanRequest(image_base64=IMG), current_user=LEO))
    assert res["success"] is True
    assert res["fields"]["email"] == "sonia@tiboutik.gp"  # normalisé en minuscules
    assert res["created_id"] is None                       # par défaut : on ne crée PAS
    assert fake_db["contacts"].docs == []


def test_scan_cree_quand_demande(fake_db):
    res = run(cs.scan_card(cs.ScanRequest(image_base64=IMG, create=True), current_user=LEO))
    assert res["created_id"]
    doc = fake_db["contacts"].docs[0]
    assert doc["first_name"] == "Sonia" and doc["source"] == "scan_carte"
    assert doc["status"] == "nouveau" and doc["created_by"] == "leo"


def test_doublon_par_email_bloque_la_creation(fake_db):
    run(fake_db["contacts"].insert_one({"id": "x", "first_name": "S", "last_name": "R",
                                        "email": "sonia@tiboutik.gp"}))
    res = run(cs.scan_card(cs.ScanRequest(image_base64=IMG, create=True), current_user=LEO))
    assert res["duplicate"] and res["created_id"] is None
    assert len(fake_db["contacts"].docs) == 1  # rien créé


def test_doublon_par_telephone(fake_db):
    run(fake_db["contacts"].insert_one({"id": "x", "first_name": "S",
                                        "phone": "0690 11 22 33", "email": "autre@x.gp"}))
    res = run(cs.scan_card(cs.ScanRequest(image_base64=IMG, create=True), current_user=LEO))
    assert res["duplicate"] and res["created_id"] is None


def test_document_sans_coordonnees(fake_db, monkeypatch):
    async def empty_extract(blob, mime):
        return {k: "" for k in FIELDS}
    monkeypatch.setattr(cs, "_extract_with_gemini", empty_extract)
    res = run(cs.scan_card(cs.ScanRequest(image_base64=IMG), current_user=LEO))
    assert res["success"] is False
