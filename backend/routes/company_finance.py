"""
Renseignement entreprise via data.gouv (API recherche-entreprises, publique, sans clé).

Objectif commercial : quand Léo regarde une fiche contact, il voit tout de suite
qui est l'entreprise (ancienneté, effectif, dirigeants, état) et — si elle a
publié ses comptes — son CA et son résultat net, avec un CONSEIL DE CRÉDIT
indicatif : acompte obligatoire, paiement à 30 j acceptable, plafond d'encours.

L'heuristique de crédit est VOLONTAIREMENT simple et lisible (voir
compute_credit_advice) : c'est une aide à la décision, pas une notation bancaire.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import logging
import httpx

from .database import db, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/societe", tags=["Company Finance"])

API_URL = "https://recherche-entreprises.api.gouv.fr/search"

# Tranches d'effectif INSEE → libellé lisible
_EFFECTIF = {
    "NN": None, "00": "0 salarié", "01": "1-2", "02": "3-5", "03": "6-9",
    "11": "10-19", "12": "20-49", "21": "50-99", "22": "100-199",
    "31": "200-249", "32": "250-499", "41": "500-999", "42": "1000-1999",
    "51": "2000-4999", "52": "5000-9999", "53": "10000+",
}


async def _fetch_raw(query: str) -> dict:
    """Appel HTTP isolé (mocké dans les tests)."""
    async with httpx.AsyncClient(timeout=8.0) as client:
        r = await client.get(API_URL, params={"q": query, "page": 1, "per_page": 1})
        r.raise_for_status()
        return r.json()


async def fetch_company_data(query: str) -> dict | None:
    """Recherche l'entreprise (SIRET/SIREN/nom) et normalise les infos utiles."""
    query = (query or "").strip()
    if not query:
        return None
    try:
        data = await _fetch_raw(query)
    except Exception as e:
        logger.warning(f"company_finance: API data.gouv KO pour '{query}': {e}")
        return None
    results = data.get("results") or []
    if not results:
        return None
    r = results[0]
    siege = r.get("siege") or {}
    finances = r.get("finances") or None
    dirigeants = [
        {"nom": " ".join(filter(None, [d.get("prenoms"), d.get("nom")])) or d.get("denomination"),
         "qualite": d.get("qualite")}
        for d in (r.get("dirigeants") or [])[:5]
    ]
    return {
        "siren": r.get("siren"),
        "nom": r.get("nom_complet") or r.get("nom_raison_sociale"),
        "actif": (r.get("etat_administratif") == "A"),
        "date_creation": r.get("date_creation"),
        "activite_code": r.get("activite_principale"),
        "effectif": _EFFECTIF.get(r.get("tranche_effectif_salarie") or "NN"),
        "adresse": siege.get("adresse"),
        "dirigeants": dirigeants,
        "finances": finances,  # {année: {ca, resultat_net}} ou None si comptes non publiés
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source": "recherche-entreprises.api.gouv.fr",
    }


def compute_credit_advice(company: dict | None) -> dict:
    """Conseil de crédit INDICATIF, règles transparentes :

    - entreprise introuvable / radiée      → paiement d'avance, encours 0
    - comptes non publiés                  → acompte 50 % minimum, encours prudent 500 €
    - résultat net négatif                 → acompte obligatoire, encours ≤ 1 % du CA (max 1 000 €)
    - résultat positif                     → encours = 0,5 % CA + 5 % résultat (plafond 5 000 €),
                                             réduit de moitié si < 2 ans d'existence
    Niveaux : rouge (avance) / orange (acompte) / vert (30 j acceptable).
    """
    now_year = datetime.now(timezone.utc).year

    if not company:
        return {"level": "rouge", "limit": 0,
                "advice": "Entreprise introuvable sur data.gouv : paiement d'avance uniquement."}
    if not company.get("actif"):
        return {"level": "rouge", "limit": 0,
                "advice": "Entreprise radiée/cessée administrativement : paiement d'avance uniquement."}

    age_years = None
    try:
        age_years = now_year - int((company.get("date_creation") or "")[:4])
    except Exception:
        pass

    finances = company.get("finances") or {}
    if not finances:
        return {"level": "orange", "limit": 500,
                "advice": "Comptes non publiés : demander 50 % d'acompte, encours prudent (≤ 500 €)."}

    latest_year = max(finances.keys())
    latest = finances[latest_year] or {}
    ca = latest.get("ca") or 0
    rn = latest.get("resultat_net")

    if rn is not None and rn <= 0:
        limit = int(min(ca * 0.01, 1000) // 100 * 100)
        return {"level": "orange", "limit": limit, "year": latest_year, "ca": ca, "resultat_net": rn,
                "advice": f"Résultat {latest_year} négatif : acompte obligatoire, encours ≤ {limit} €."}

    limit = ca * 0.005 + (rn or 0) * 0.05
    if age_years is not None and age_years < 2:
        limit *= 0.5
    limit = int(min(limit, 5000) // 100 * 100)
    level = "vert" if limit >= 1000 else "orange"
    advice = (f"Comptes {latest_year} sains : paiement à 30 j acceptable jusqu'à {limit} € d'encours."
              if level == "vert" else
              f"Structure modeste : privilégier un acompte, encours ≤ {limit} €.")
    return {"level": level, "limit": limit, "year": latest_year, "ca": ca, "resultat_net": rn,
            "advice": advice}


async def get_company_insights(query: str) -> dict:
    """Données + conseil, format unique consommé par l'API, le front et Néo."""
    company = await fetch_company_data(query)
    return {"success": True, "found": bool(company), "company": company,
            "credit": compute_credit_advice(company)}


# ==================== ROUTES ====================

@router.get("/insights")
async def societe_insights(q: str, current_user: dict = Depends(get_current_user)):
    """Renseignement entreprise à la volée (SIRET, SIREN ou nom)."""
    if not (q or "").strip():
        raise HTTPException(status_code=400, detail="Paramètre q requis (SIRET/SIREN/nom).")
    return await get_company_insights(q)


@router.post("/contacts/{contact_id}/refresh-insights")
async def refresh_contact_insights(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Rafraîchit et CACHE le renseignement entreprise sur la fiche contact."""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact introuvable.")
    query = (contact.get("siret") or contact.get("siren") or contact.get("company") or "").strip()
    if not query:
        return {"success": False, "error": "Ni SIRET ni nom d'entreprise sur la fiche."}
    insights = await get_company_insights(query)
    await db.contacts.update_one(
        {"id": contact_id},
        {"$set": {"company_insights": insights["company"],
                  "company_credit": insights["credit"],
                  "company_insights_at": datetime.now(timezone.utc).isoformat()}})
    return {**insights, "cached": True}


# ==================== Outil Néo ====================

async def _exec_company_finances(args, uid):
    """Outil Néo : renseignement financier data.gouv sur une entreprise."""
    q = (args.get("query") or "").strip()
    if not q:
        return {"success": False, "error": "query requis (SIRET, SIREN ou nom d'entreprise)."}
    res = await get_company_insights(q)
    if not res["found"]:
        return {"success": True, "found": False,
                "message": f"Aucune entreprise trouvée sur data.gouv pour « {q} »."}
    return res


def register_neo_tool():
    """Ajoute l'outil company_finances au registre de Néo (idempotent)."""
    from . import neo_assistant as na
    if "company_finances" in na._SPEC:
        return
    tool = {
        "name": "company_finances", "validation": False,
        "run": lambda a, u: _exec_company_finances(a, u),
        "description": ("Renseignement OFFICIEL data.gouv sur une entreprise française (SIRET/SIREN/nom) : "
                        "CA et résultat net publiés, ancienneté, effectif, dirigeants, état administratif, "
                        "+ conseil de crédit indicatif (acompte/30j/plafond). À utiliser pour qualifier un "
                        "prospect, préparer une négo ou décider des conditions de paiement."),
        "params": na._obj({"query": na._STR}, ["query"]),
    }
    na.TOOLS.append(tool)
    na._SPEC["company_finances"] = tool


register_neo_tool()
