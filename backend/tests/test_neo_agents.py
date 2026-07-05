"""
Tests unitaires de l'architecture multi-agents (routes/neo_agents.py).
La passerelle Gemini est simulée — aucun appel réseau, aucune vraie base.

Lancement :
  cd backend && ../.venv-backend/bin/python -m pytest tests/test_neo_agents.py -q
"""
import os
import sys
import asyncio
from types import SimpleNamespace
from pathlib import Path

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "unit_test_fake")
os.environ.setdefault("JWT_SECRET", "unit-test-secret")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import neo_assistant as na  # noqa: E402
from routes import neo_agents as ag  # noqa: E402
from tests.fakes import FakeDB  # noqa: E402


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture()
def fake_db(monkeypatch):
    fdb = FakeDB()
    monkeypatch.setattr(na, "db", fdb)
    return fdb


# ==================== Registre ====================

def test_tous_les_outils_des_agents_existent():
    """Un nom d'outil inconnu dans un agent = bug silencieux. On verrouille."""
    for key, agent in ag.AGENTS.items():
        for tool in agent["tools"]:
            assert tool in na._SPEC, f"Agent {key} référence un outil inexistant : {tool}"


def test_consult_agent_enregistre_dans_neo():
    assert "consult_agent" in na._SPEC
    assert any(t["name"] == "consult_agent" for t in na.TOOLS)
    # L'enum des agents proposés au modèle correspond au registre
    enum = na._SPEC["consult_agent"]["params"]["properties"]["agent"]["enum"]
    assert set(enum) == set(ag.AGENTS)


def test_register_idempotent():
    n = len(na.TOOLS)
    ag.register()
    assert len(na.TOOLS) == n


def test_moindre_privilege():
    """Les agents d'analyse n'ont AUCUN outil d'écriture destructive."""
    for key in ("recherche", "tresorerie", "veille"):
        assert "crm_delete" not in ag.AGENTS[key]["tools"], key
        assert "crm_update" not in ag.AGENTS[key]["tools"], key
        assert "crm_create" not in ag.AGENTS[key]["tools"], key


# ==================== run_subagent : validations ====================

def test_agent_inconnu(fake_db):
    res = run(ag.run_subagent("astrologie", "prédit le CA", "leo"))
    assert res["success"] is False and "inconnu" in res["error"]


def test_mission_vide(fake_db):
    res = run(ag.run_subagent("recherche", "   ", "leo"))
    assert res["success"] is False


# ==================== run_subagent : boucle simulée ====================

def _fc(name, args=None):
    return SimpleNamespace(name=name, args=args or {})


def _resp(text=None, fcs=None):
    content = SimpleNamespace()
    return SimpleNamespace(
        text=text, function_calls=fcs or [],
        candidates=[SimpleNamespace(content=content)])


@pytest.fixture()
def gemini_simule(monkeypatch, fake_db):
    """Simule la passerelle : 1er tour = appel d'outil, 2e tour = rapport final."""
    monkeypatch.setattr(na, "_client", object())  # passerelle « disponible »
    calls = {"n": 0, "scripted": []}

    async def fake_call(contents, system, tools):
        i = min(calls["n"], len(calls["scripted"]) - 1)
        calls["n"] += 1
        return calls["scripted"][i], "gemini-simule"

    monkeypatch.setattr(ag, "_subagent_gemini_call", fake_call)

    # Part.from_function_response exige des types réels ; on neutralise la construction
    class _P:
        @staticmethod
        def from_function_response(name, response):
            return {"tool": name, "response": response}

        @staticmethod
        def from_text(text):
            return {"text": text}

    class _C:
        def __init__(self, role=None, parts=None):
            self.role, self.parts = role, parts

    fake_t = SimpleNamespace(Part=_P, Content=_C,
                             FunctionDeclaration=lambda **k: k, Tool=lambda **k: k)
    monkeypatch.setattr(ag.na, "_t", fake_t, raising=False)
    return calls


def test_boucle_outil_puis_rapport(gemini_simule, fake_db):
    run(fake_db["contacts"].insert_one({"id": "c1", "first_name": "Marie", "company": "Karibea",
                                        "status": "client"}))
    gemini_simule["scripted"] = [
        _resp(fcs=[_fc("crm_query", {"collection": "contacts", "filter": {"id": "c1"}})]),
        _resp(text="Rapport : Marie (Karibea) est cliente."),
    ]
    res = run(ag.run_subagent("recherche", "Qui est Marie ?", "leo"))
    assert res["success"] is True
    assert res["agent"] == "recherche" and "Karibea" in res["report"]
    assert res["actions_done"] == [{"tool": "crm_query"}]
    # journal d'audit alimenté (start + executed + done)
    kinds = [d["kind"] for d in fake_db["neo_action_log"].docs]
    assert "subagent_start" in kinds and "subagent_done" in kinds and "executed" in kinds


def test_outil_hors_perimetre_refuse(gemini_simule, fake_db):
    """Le sous-agent 'recherche' tente un crm_delete (hors périmètre) → refusé, rien exécuté."""
    run(fake_db["invoices"].insert_one({"id": "i1"}))
    gemini_simule["scripted"] = [
        _resp(fcs=[_fc("crm_delete", {"collection": "invoices", "filter": {"id": "i1"}})]),
        _resp(text="Compris, je n'ai pas le droit."),
    ]
    res = run(ag.run_subagent("recherche", "supprime la facture i1", "leo"))
    assert res["success"] is True
    assert res["actions_done"] == []            # rien exécuté
    assert len(fake_db["invoices"].docs) == 1   # rien supprimé
    assert fake_db["neo_pending_actions"].docs == []  # même pas de pending


def test_action_sensible_part_en_validation(gemini_simule, fake_db):
    """L'agent communication peut demander un envoi → il part en validation humaine, pas en envoi direct."""
    gemini_simule["scripted"] = [
        _resp(fcs=[_fc("send_followup", {"contact_name": "Marie"})]),
        _resp(text="Relance préparée, en attente de validation de Léo."),
    ]
    res = run(ag.run_subagent("communication", "Relance Marie", "leo"))
    assert res["success"] is True
    assert len(res["pending_actions"]) == 1
    assert res["pending_actions"][0]["tool"] == "send_followup"
    assert len(fake_db["neo_pending_actions"].docs) == 1


def test_limite_iterations(gemini_simule, fake_db):
    """Un modèle qui boucle sur des outils s'arrête à SUBAGENT_MAX_ITERS."""
    gemini_simule["scripted"] = [
        _resp(fcs=[_fc("crm_query", {"collection": "contacts", "filter": {"id": "x"}})]),
    ]  # toujours le même tour → jamais de texte final
    res = run(ag.run_subagent("recherche", "cherche en boucle", "leo"))
    assert res["success"] is True
    assert gemini_simule["n"] == ag.SUBAGENT_MAX_ITERS
    assert "limite" in res["report"]


def test_passerelle_indisponible(fake_db, monkeypatch):
    monkeypatch.setattr(na, "_client", None)
    res = run(ag.run_subagent("recherche", "mission", "leo"))
    assert res["success"] is False and "indisponible" in res["error"]
