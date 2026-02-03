"""
Business Search API - Search for company information (SIRET, Kbis, etc.)
Uses recherche-entreprises.api.gouv.fr (more reliable than entreprise.data.gouv.fr)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import httpx
import logging
import urllib.parse

router = APIRouter(prefix="/business", tags=["Business Search"])
logger = logging.getLogger(__name__)

# Base URL for the more reliable API
API_BASE_URL = "https://recherche-entreprises.api.gouv.fr"

class CompanySearchResult(BaseModel):
    found: bool
    company_name: Optional[str] = None
    siren: Optional[str] = None
    siret: Optional[str] = None
    legal_form: Optional[str] = None
    capital: Optional[str] = None
    creation_date: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    activity: Optional[str] = None
    naf_code: Optional[str] = None
    manager: Optional[str] = None
    employee_count: Optional[str] = None
    revenue: Optional[str] = None
    source: Optional[str] = None
    dirigeants: Optional[List[Dict[str, Any]]] = None
    raw_data: Optional[Dict[str, Any]] = None

class CompanySearchResults(BaseModel):
    found: bool
    count: int
    results: List[CompanySearchResult]

@router.get("/search")
async def search_company(
    query: str,
    search_type: str = "name"  # name, siret, siren
) -> CompanySearchResult:
    """
    Search for company information by name, SIRET, or SIREN
    Uses French government API (recherche-entreprises.api.gouv.fr)
    """
    try:
        query = query.strip()
        
        # Determine search type automatically based on query format
        clean_query = query.replace(" ", "")
        if search_type == "siret" or (len(clean_query) == 14 and clean_query.isdigit()):
            return await search_by_siret(clean_query)
        elif search_type == "siren" or (len(clean_query) == 9 and clean_query.isdigit()):
            return await search_by_siren(clean_query)
        else:
            return await search_by_name(query)
            
    except Exception as e:
        logger.error(f"Error searching company: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search/all")
async def search_companies(
    query: str,
    limit: int = 10
) -> CompanySearchResults:
    """
    Search for multiple companies by name
    Returns a list of matching companies
    """
    try:
        query = query.strip()
        encoded_query = urllib.parse.quote(query)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{API_BASE_URL}/search?q={encoded_query}&per_page={limit}"
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                companies = []
                for r in results:
                    company = parse_company_data(r)
                    if company:
                        companies.append(company)
                
                return CompanySearchResults(
                    found=len(companies) > 0,
                    count=len(companies),
                    results=companies
                )
            else:
                return CompanySearchResults(found=False, count=0, results=[])
                
    except Exception as e:
        logger.error(f"Error searching companies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def parse_company_data(data: dict) -> CompanySearchResult:
    """Parse company data from API response"""
    try:
        siege = data.get("siege", {}) or {}
        dirigeants_data = data.get("dirigeants", []) or []
        finances = data.get("finances", {}) or {}
        
        # Get latest financial data
        revenue = None
        if finances:
            for year in sorted(finances.keys(), reverse=True):
                if finances[year].get("ca"):
                    revenue = f"{finances[year]['ca']:,}€".replace(",", " ")
                    break
        
        # Build address
        address_parts = []
        if siege.get("numero_voie"):
            address_parts.append(siege.get("numero_voie"))
        if siege.get("type_voie"):
            address_parts.append(siege.get("type_voie"))
        if siege.get("libelle_voie"):
            address_parts.append(siege.get("libelle_voie"))
        address = " ".join(address_parts) if address_parts else siege.get("adresse", "")
        
        # Get manager names
        manager = None
        if dirigeants_data:
            managers = []
            for d in dirigeants_data[:2]:  # Max 2 managers
                if d.get("type_dirigeant") == "personne physique":
                    name = f"{d.get('prenoms', '')} {d.get('nom', '')}".strip()
                    if name:
                        managers.append(name)
                elif d.get("type_dirigeant") == "personne morale":
                    if d.get("denomination"):
                        managers.append(d.get("denomination"))
            manager = ", ".join(managers) if managers else None
        
        return CompanySearchResult(
            found=True,
            company_name=data.get("nom_complet") or data.get("nom_raison_sociale"),
            siren=data.get("siren"),
            siret=siege.get("siret"),
            legal_form=get_legal_form(data.get("nature_juridique")),
            creation_date=data.get("date_creation"),
            address=address,
            city=siege.get("libelle_commune"),
            postal_code=siege.get("code_postal"),
            activity=get_activity_label(data.get("activite_principale")),
            naf_code=data.get("activite_principale"),
            manager=manager,
            employee_count=get_employee_range(data.get("tranche_effectif_salarie")),
            revenue=revenue,
            dirigeants=dirigeants_data,
            source="recherche-entreprises.api.gouv.fr",
            raw_data=data
        )
    except Exception as e:
        logger.error(f"Error parsing company data: {str(e)}")
        return None

async def search_by_siret(siret: str) -> CompanySearchResult:
    """Search company by SIRET number"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{API_BASE_URL}/search?q={siret}&per_page=1"
        
        try:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                if results:
                    # Find the exact SIRET match
                    for r in results:
                        matching = r.get("matching_etablissements", []) or []
                        for m in matching:
                            if m.get("siret") == siret:
                                company = parse_company_data(r)
                                if company:
                                    company.siret = siret
                                    return company
                        
                        # Also check siege
                        siege = r.get("siege", {}) or {}
                        if siege.get("siret") == siret:
                            return parse_company_data(r)
                    
                    # Return first result if exact match not found
                    company = parse_company_data(results[0])
                    if company:
                        return company
                
                return CompanySearchResult(found=False)
            else:
                return CompanySearchResult(found=False)
                
        except httpx.TimeoutException:
            logger.error("API timeout")
            return CompanySearchResult(found=False)

async def search_by_siren(siren: str) -> CompanySearchResult:
    """Search company by SIREN number"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{API_BASE_URL}/search?q={siren}&per_page=1"
        
        try:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                # Find exact SIREN match
                for r in results:
                    if r.get("siren") == siren:
                        return parse_company_data(r)
                
                # Return first result if no exact match
                if results:
                    company = parse_company_data(results[0])
                    if company:
                        return company
                
                return CompanySearchResult(found=False)
            else:
                return CompanySearchResult(found=False)
                
        except httpx.TimeoutException:
            return CompanySearchResult(found=False)

async def search_by_name(name: str) -> CompanySearchResult:
    """Search company by name"""
    encoded_name = urllib.parse.quote(name)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{API_BASE_URL}/search?q={encoded_name}&per_page=1"
        
        try:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                if results:
                    return parse_company_data(results[0])
                else:
                    return CompanySearchResult(found=False)
            else:
                return CompanySearchResult(found=False)
                
        except httpx.TimeoutException:
            return CompanySearchResult(found=False)

def get_legal_form(code: str) -> str:
    """Convert legal form code to human-readable text"""
    if not code:
        return None
    
    forms = {
        "1000": "Entrepreneur individuel",
        "5498": "EURL (Entreprise unipersonnelle à responsabilité limitée)",
        "5499": "SARL (Société à responsabilité limitée)",
        "5710": "SAS (Société par actions simplifiée)",
        "5720": "SASU (Société par actions simplifiée unipersonnelle)",
        "5510": "SA (Société anonyme)",
        "6540": "SCI (Société civile immobilière)",
        "9220": "Association déclarée",
        "5720": "SASU",
    }
    
    return forms.get(code, f"Forme juridique {code}")

def get_employee_range(code: str) -> str:
    """Convert employee count code to human-readable range"""
    if not code or code == "NN":
        return "Non renseigné"
    
    ranges = {
        "00": "0 salarié",
        "01": "1-2 salariés",
        "02": "3-5 salariés",
        "03": "6-9 salariés",
        "11": "10-19 salariés",
        "12": "20-49 salariés",
        "21": "50-99 salariés",
        "22": "100-199 salariés",
        "31": "200-249 salariés",
        "32": "250-499 salariés",
        "41": "500-999 salariés",
        "42": "1000-1999 salariés",
        "51": "2000-4999 salariés",
        "52": "5000-9999 salariés",
        "53": "10000+ salariés",
    }
    
    return ranges.get(code, f"Code {code}")

def get_activity_label(naf_code: str) -> str:
    """Get human-readable activity label (simplified)"""
    if not naf_code:
        return None
    
    # Main activity categories
    categories = {
        "01": "Agriculture",
        "10": "Industries alimentaires",
        "18": "Imprimerie",
        "25": "Fabrication de produits métalliques",
        "41": "Construction de bâtiments",
        "43": "Travaux de construction spécialisés",
        "45": "Commerce et réparation automobile",
        "46": "Commerce de gros",
        "47": "Commerce de détail",
        "49": "Transports terrestres",
        "52": "Entreposage",
        "55": "Hébergement",
        "56": "Restauration",
        "58": "Édition",
        "60": "Programmation et diffusion",
        "62": "Programmation informatique",
        "63": "Services d'information",
        "64": "Services financiers",
        "66": "Activités auxiliaires financières",
        "68": "Activités immobilières",
        "69": "Activités juridiques et comptables",
        "70": "Conseil de gestion",
        "71": "Architecture et ingénierie",
        "72": "Recherche-développement",
        "73": "Publicité et études de marché",
        "74": "Autres activités spécialisées",
        "77": "Location et location-bail",
        "78": "Activités liées à l'emploi",
        "79": "Agences de voyage",
        "80": "Enquêtes et sécurité",
        "81": "Services relatifs aux bâtiments",
        "82": "Activités administratives",
        "85": "Enseignement",
        "86": "Activités pour la santé humaine",
        "87": "Hébergement médico-social",
        "88": "Action sociale",
        "90": "Activités créatives et artistiques",
        "91": "Bibliothèques, musées",
        "93": "Activités sportives et récréatives",
        "94": "Activités des organisations",
        "95": "Réparation",
        "96": "Autres services personnels",
    }
    
    # Get first 2 digits of NAF code
    prefix = naf_code[:2] if len(naf_code) >= 2 else naf_code
    
    return categories.get(prefix, f"Activité {naf_code}")

@router.get("/siret/{siret}")
async def get_company_by_siret(siret: str) -> CompanySearchResult:
    """Get company information by SIRET number"""
    return await search_by_siret(siret.replace(" ", ""))

@router.get("/siren/{siren}")
async def get_company_by_siren(siren: str) -> CompanySearchResult:
    """Get company information by SIREN number"""
    return await search_by_siren(siren.replace(" ", ""))
