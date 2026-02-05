"""
Societe.com API Integration for MoltBot CRM
- Search companies by person name (dirigeant)
- Get company info by SIRET/SIREN
- Fetch financial data (bilans publics)
- WhatsApp integration
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import logging
import httpx

from .database import db
from .auth import get_current_user

router = APIRouter(prefix="/societe", tags=["Societe.com"])
logger = logging.getLogger(__name__)

# API Configuration
SOCIETE_API_KEY = os.environ.get('SOCIETE_API_KEY', '')
SOCIETE_BASE_URL = "https://api.societe.com/api/v1"

# ==================== MODELS ====================

class CompanySearchResult(BaseModel):
    siren: str
    siret: Optional[str] = None
    nom: str
    forme_juridique: Optional[str] = None
    adresse: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    dirigeants: Optional[List[str]] = []
    activite: Optional[str] = None
    date_creation: Optional[str] = None

class FinancialData(BaseModel):
    annee: int
    chiffre_affaires: Optional[float] = None
    resultat_net: Optional[float] = None
    marge_brute: Optional[float] = None
    resultat_exploitation: Optional[float] = None
    ebitda: Optional[float] = None
    effectif: Optional[int] = None

class CompanyDetails(BaseModel):
    siren: str
    siret: Optional[str] = None
    nom: str
    forme_juridique: Optional[str] = None
    adresse_complete: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    code_naf: Optional[str] = None
    activite: Optional[str] = None
    date_creation: Optional[str] = None
    capital_social: Optional[float] = None
    dirigeants: List[Dict[str, Any]] = []
    bilans: List[FinancialData] = []
    etablissements: Optional[int] = None
    tranche_effectif: Optional[str] = None

class PersonSearchRequest(BaseModel):
    prenom: Optional[str] = None
    nom: str
    ville: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

async def societe_api_request(endpoint: str, params: dict = None) -> dict:
    """Make a request to Societe.com API"""
    if not SOCIETE_API_KEY:
        raise HTTPException(status_code=500, detail="Clé API Societe.com non configurée")
    
    # Add token to params
    if params is None:
        params = {}
    params["token"] = SOCIETE_API_KEY
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{SOCIETE_BASE_URL}/{endpoint}",
                params=params
            )
            
            logger.info(f"Societe.com API: {response.status_code} for {endpoint}")
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                raise HTTPException(status_code=401, detail="Clé API Societe.com invalide")
            elif response.status_code == 404:
                return {"results": [], "total": 0}
            else:
                logger.error(f"Societe.com API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Erreur API: {response.text}")
                
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Timeout API Societe.com")


def format_company_from_api(data: dict) -> dict:
    """Format company data from Societe.com API response"""
    return {
        "siren": data.get("siren", ""),
        "siret": data.get("siret", data.get("siege", {}).get("siret", "")),
        "nom": data.get("denomination", data.get("nom", "")),
        "forme_juridique": data.get("forme_juridique", ""),
        "adresse": data.get("siege", {}).get("adresse", data.get("adresse", "")),
        "code_postal": data.get("siege", {}).get("code_postal", data.get("code_postal", "")),
        "ville": data.get("siege", {}).get("ville", data.get("ville", "")),
        "code_naf": data.get("code_naf", ""),
        "activite": data.get("activite", data.get("libelle_naf", "")),
        "date_creation": data.get("date_creation", ""),
        "capital_social": data.get("capital", 0),
        "tranche_effectif": data.get("tranche_effectif", ""),
    }


def format_financial_data(bilans: list) -> List[FinancialData]:
    """Format financial data from API response"""
    result = []
    for bilan in bilans[:5]:  # Last 5 years max
        result.append(FinancialData(
            annee=int(bilan.get("annee", bilan.get("date_cloture", "")[:4])),
            chiffre_affaires=bilan.get("chiffre_affaires", bilan.get("ca")),
            resultat_net=bilan.get("resultat_net", bilan.get("resultat")),
            marge_brute=bilan.get("marge_brute"),
            resultat_exploitation=bilan.get("resultat_exploitation"),
            ebitda=bilan.get("ebitda", bilan.get("ebe")),
            effectif=bilan.get("effectif")
        ))
    return result


# ==================== API ENDPOINTS ====================

@router.get("/search/company")
async def search_company_by_name(
    q: str = Query(..., description="Nom de l'entreprise"),
    ville: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Search companies by name"""
    params = {"nom": q}
    if ville:
        params["ville"] = ville
    
    try:
        # API Societe.com endpoint: entreprise/search
        data = await societe_api_request("entreprise/search", params)
        
        companies = []
        for item in data.get("resultats", data.get("results", data.get("entreprises", [])))[:10]:
            companies.append(format_company_from_api(item))
        
        return {
            "success": True,
            "count": len(companies),
            "companies": companies
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Company search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/dirigeant")
async def search_company_by_person(
    request: PersonSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search companies by dirigeant (manager) name"""
    params = {"nom": request.nom}
    if request.prenom:
        params["prenom"] = request.prenom
    if request.ville:
        params["ville"] = request.ville
    
    try:
        # Search dirigeants
        data = await societe_api_request("dirigeants/recherche", params)
        
        companies = []
        for item in data.get("resultats", data.get("results", []))[:10]:
            # Each result links to companies
            company_info = item.get("entreprise", item)
            formatted = format_company_from_api(company_info)
            
            # Add dirigeant info
            formatted["dirigeant_trouve"] = f"{item.get('prenom', '')} {item.get('nom', '')}".strip()
            formatted["fonction"] = item.get("fonction", item.get("qualite", ""))
            
            companies.append(formatted)
        
        return {
            "success": True,
            "count": len(companies),
            "search_person": f"{request.prenom or ''} {request.nom}".strip(),
            "companies": companies
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dirigeant search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/company/{siret_or_siren}")
async def get_company_details(
    siret_or_siren: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed company information by SIRET or SIREN"""
    # Clean input
    clean_id = siret_or_siren.replace(" ", "").replace(".", "")
    
    # Determine if SIREN (9 digits) or SIRET (14 digits)
    endpoint = "entreprises/siren" if len(clean_id) == 9 else "entreprises/siret"
    
    try:
        data = await societe_api_request(f"{endpoint}/{clean_id}")
        
        if not data or data.get("error"):
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        
        # Format basic company info
        company = format_company_from_api(data)
        
        # Get dirigeants
        dirigeants = []
        for d in data.get("dirigeants", []):
            dirigeants.append({
                "nom": f"{d.get('prenom', '')} {d.get('nom', '')}".strip(),
                "fonction": d.get("fonction", d.get("qualite", "")),
                "date_prise_poste": d.get("date_prise_poste", "")
            })
        
        # Get financial data (bilans)
        bilans_raw = data.get("bilans", data.get("comptes", []))
        bilans = format_financial_data(bilans_raw)
        
        return {
            "success": True,
            "company": {
                **company,
                "dirigeants": dirigeants,
                "bilans": [b.dict() for b in bilans],
                "etablissements": data.get("nombre_etablissements", 1)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Company details error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/company/{siret_or_siren}/financials")
async def get_company_financials(
    siret_or_siren: str,
    current_user: dict = Depends(get_current_user)
):
    """Get only financial data for a company"""
    clean_id = siret_or_siren.replace(" ", "").replace(".", "")
    endpoint = "entreprises/siren" if len(clean_id) == 9 else "entreprises/siret"
    
    try:
        data = await societe_api_request(f"{endpoint}/{clean_id}/bilans")
        
        bilans = format_financial_data(data.get("bilans", data.get("results", [])))
        
        # Calculate variations if we have 2+ years
        variations = []
        if len(bilans) >= 2:
            current = bilans[0]
            previous = bilans[1]
            
            def calc_variation(curr, prev):
                if prev and prev > 0:
                    return round(((curr - prev) / prev) * 100, 2)
                return None
            
            variations = {
                "annees": f"{current.annee} vs {previous.annee}",
                "chiffre_affaires": calc_variation(current.chiffre_affaires or 0, previous.chiffre_affaires),
                "resultat_net": calc_variation(current.resultat_net or 0, previous.resultat_net),
                "marge_brute": calc_variation(current.marge_brute or 0, previous.marge_brute),
                "resultat_exploitation": calc_variation(current.resultat_exploitation or 0, previous.resultat_exploitation),
                "ebitda": calc_variation(current.ebitda or 0, previous.ebitda)
            }
        
        return {
            "success": True,
            "siret": clean_id,
            "bilans": [b.dict() for b in bilans],
            "variations": variations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Financials error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CRM INTEGRATION ====================

@router.post("/contact/{contact_id}/link-company")
async def link_company_to_contact(
    contact_id: str,
    siret_or_siren: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Link a company (by SIRET/SIREN) to a CRM contact and fetch company info"""
    clean_id = siret_or_siren.replace(" ", "").replace(".", "")
    
    # Fetch company details
    endpoint = "entreprises/siren" if len(clean_id) == 9 else "entreprises/siret"
    
    try:
        data = await societe_api_request(f"{endpoint}/{clean_id}")
        
        if not data or data.get("error"):
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        
        company = format_company_from_api(data)
        
        # Update contact with company info
        update_data = {
            "siret": company.get("siret") or clean_id,
            "siren": clean_id[:9] if len(clean_id) >= 9 else clean_id,
            "company": company.get("nom"),
            "company_address": f"{company.get('adresse', '')} {company.get('code_postal', '')} {company.get('ville', '')}".strip(),
            "company_forme_juridique": company.get("forme_juridique"),
            "company_activite": company.get("activite"),
            "company_capital": company.get("capital_social"),
            "company_date_creation": company.get("date_creation"),
            "company_data_fetched_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Update in MongoDB
        result = await db.contacts.update_one(
            {"$or": [{"id": contact_id}, {"_id": contact_id}]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Contact non trouvé")
        
        logger.info(f"Linked company {company.get('nom')} to contact {contact_id}")
        
        return {
            "success": True,
            "message": f"Entreprise {company.get('nom')} liée au contact",
            "company": company
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Link company error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== WHATSAPP INTEGRATION ====================

async def search_company_for_whatsapp(query: str, search_type: str = "auto") -> dict:
    """
    Search company for WhatsApp MoltBot.
    search_type: "dirigeant", "company", "siret", "auto"
    """
    if not SOCIETE_API_KEY:
        return {"success": False, "error": "API Societe.com non configurée"}
    
    query = query.strip()
    
    try:
        # Auto-detect search type
        if search_type == "auto":
            # Check if it looks like a SIRET/SIREN
            clean_query = query.replace(" ", "").replace(".", "")
            if clean_query.isdigit() and len(clean_query) in [9, 14]:
                search_type = "siret"
            else:
                # Assume it's a person or company name
                search_type = "dirigeant" if " " in query else "company"
        
        if search_type == "siret":
            # Direct SIRET/SIREN lookup
            clean_id = query.replace(" ", "").replace(".", "")
            endpoint = "entreprises/siren" if len(clean_id) == 9 else "entreprises/siret"
            
            data = await societe_api_request(f"{endpoint}/{clean_id}")
            
            if data and not data.get("error"):
                company = format_company_from_api(data)
                bilans = format_financial_data(data.get("bilans", []))
                
                return {
                    "success": True,
                    "type": "company_details",
                    "company": company,
                    "bilans": [b.dict() for b in bilans[:3]],
                    "dirigeants": [
                        f"{d.get('prenom', '')} {d.get('nom', '')} ({d.get('fonction', '')})"
                        for d in data.get("dirigeants", [])[:3]
                    ]
                }
            else:
                return {"success": False, "error": "Entreprise non trouvée"}
        
        elif search_type == "dirigeant":
            # Search by person name
            parts = query.split()
            if len(parts) >= 2:
                params = {"prenom": parts[0], "nom": " ".join(parts[1:])}
            else:
                params = {"nom": query}
            
            data = await societe_api_request("dirigeants/recherche", params)
            
            results = data.get("resultats", data.get("results", []))[:5]
            if results:
                companies = []
                for item in results:
                    company_info = item.get("entreprise", item)
                    companies.append({
                        "nom": company_info.get("denomination", company_info.get("nom", "")),
                        "siren": company_info.get("siren", ""),
                        "fonction": item.get("fonction", item.get("qualite", "")),
                        "ville": company_info.get("siege", {}).get("ville", company_info.get("ville", ""))
                    })
                
                return {
                    "success": True,
                    "type": "dirigeant_search",
                    "person": query,
                    "companies": companies
                }
            else:
                return {"success": False, "error": f"Aucune entreprise trouvée pour {query}"}
        
        else:  # company name search
            data = await societe_api_request("entreprises/recherche", {"q": query})
            
            results = data.get("resultats", data.get("results", []))[:5]
            if results:
                companies = []
                for item in results:
                    companies.append({
                        "nom": item.get("denomination", item.get("nom", "")),
                        "siren": item.get("siren", ""),
                        "ville": item.get("siege", {}).get("ville", item.get("ville", "")),
                        "activite": item.get("activite", item.get("libelle_naf", ""))[:50]
                    })
                
                return {
                    "success": True,
                    "type": "company_search",
                    "query": query,
                    "companies": companies
                }
            else:
                return {"success": False, "error": f"Aucune entreprise trouvée pour '{query}'"}
                
    except Exception as e:
        logger.error(f"WhatsApp company search error: {e}")
        return {"success": False, "error": str(e)}


async def get_company_financial_summary_for_whatsapp(siret_or_siren: str) -> dict:
    """Get formatted financial summary for WhatsApp"""
    clean_id = siret_or_siren.replace(" ", "").replace(".", "")
    
    if not clean_id.isdigit() or len(clean_id) not in [9, 14]:
        return {"success": False, "error": "SIRET/SIREN invalide"}
    
    try:
        endpoint = "entreprises/siren" if len(clean_id) == 9 else "entreprises/siret"
        data = await societe_api_request(f"{endpoint}/{clean_id}")
        
        if not data or data.get("error"):
            return {"success": False, "error": "Entreprise non trouvée"}
        
        company_name = data.get("denomination", data.get("nom", "Entreprise"))
        bilans = data.get("bilans", data.get("comptes", []))
        
        if not bilans:
            return {
                "success": True,
                "company": company_name,
                "message": "Aucun bilan public disponible pour cette entreprise."
            }
        
        # Format financial summary
        summary_lines = [f"📊 **{company_name}**\n"]
        
        for bilan in bilans[:3]:
            annee = bilan.get("annee", bilan.get("date_cloture", "")[:4])
            ca = bilan.get("chiffre_affaires", bilan.get("ca"))
            resultat = bilan.get("resultat_net", bilan.get("resultat"))
            effectif = bilan.get("effectif")
            
            line = f"**{annee}:**"
            if ca:
                line += f" CA: {ca/1000:.0f}k€"
            if resultat:
                emoji = "📈" if resultat > 0 else "📉"
                line += f" | Résultat: {emoji} {resultat/1000:.1f}k€"
            if effectif:
                line += f" | Effectif: {effectif}"
            
            summary_lines.append(line)
        
        # Calculate variation if 2+ years
        if len(bilans) >= 2:
            current = bilans[0]
            previous = bilans[1]
            
            ca_curr = current.get("chiffre_affaires", current.get("ca", 0)) or 0
            ca_prev = previous.get("chiffre_affaires", previous.get("ca", 0)) or 0
            
            if ca_prev > 0:
                variation = ((ca_curr - ca_prev) / ca_prev) * 100
                emoji = "🟢" if variation > 0 else "🔴"
                summary_lines.append(f"\n{emoji} Variation CA: {variation:+.1f}%")
        
        return {
            "success": True,
            "company": company_name,
            "siren": clean_id[:9],
            "summary": "\n".join(summary_lines)
        }
        
    except Exception as e:
        logger.error(f"Financial summary error: {e}")
        return {"success": False, "error": str(e)}
