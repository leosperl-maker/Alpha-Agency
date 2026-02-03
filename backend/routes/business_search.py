"""
Business Search API - Search for company information (SIRET, Kbis, etc.)
Uses web search and public APIs to find business information
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import httpx
import logging
import re

router = APIRouter(prefix="/business", tags=["Business Search"])
logger = logging.getLogger(__name__)

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
    raw_data: Optional[Dict[str, Any]] = None

@router.get("/search")
async def search_company(
    query: str,
    search_type: str = "name"  # name, siret, siren
) -> CompanySearchResult:
    """
    Search for company information by name, SIRET, or SIREN
    Uses French government API (entreprise.data.gouv.fr)
    """
    try:
        # Clean query
        query = query.strip()
        
        # Determine search type
        if search_type == "siret" or (len(query.replace(" ", "")) == 14 and query.replace(" ", "").isdigit()):
            return await search_by_siret(query.replace(" ", ""))
        elif search_type == "siren" or (len(query.replace(" ", "")) == 9 and query.replace(" ", "").isdigit()):
            return await search_by_siren(query.replace(" ", ""))
        else:
            return await search_by_name(query)
            
    except Exception as e:
        logger.error(f"Error searching company: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def search_by_siret(siret: str) -> CompanySearchResult:
    """Search company by SIRET number using French government API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Use entreprise.data.gouv.fr API
        url = f"https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/{siret}"
        
        try:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                etablissement = data.get("etablissement", {})
                unite_legale = etablissement.get("unite_legale", {})
                adresse = etablissement.get("adresse", {})
                
                return CompanySearchResult(
                    found=True,
                    company_name=unite_legale.get("denomination") or f"{unite_legale.get('prenom_1', '')} {unite_legale.get('nom', '')}".strip(),
                    siren=unite_legale.get("siren"),
                    siret=etablissement.get("siret"),
                    legal_form=get_legal_form(unite_legale.get("categorie_juridique")),
                    creation_date=unite_legale.get("date_creation"),
                    address=f"{adresse.get('numero_voie', '')} {adresse.get('type_voie', '')} {adresse.get('libelle_voie', '')}".strip(),
                    city=adresse.get("libelle_commune"),
                    postal_code=adresse.get("code_postal"),
                    activity=etablissement.get("activite_principale"),
                    naf_code=etablissement.get("activite_principale"),
                    employee_count=get_employee_range(etablissement.get("tranche_effectifs")),
                    source="entreprise.data.gouv.fr",
                    raw_data=data
                )
            elif response.status_code == 404:
                return CompanySearchResult(found=False)
            else:
                logger.warning(f"API returned status {response.status_code}")
                return CompanySearchResult(found=False)
                
        except httpx.TimeoutException:
            logger.error("API timeout")
            return CompanySearchResult(found=False)

async def search_by_siren(siren: str) -> CompanySearchResult:
    """Search company by SIREN number"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales/{siren}"
        
        try:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                unite_legale = data.get("unite_legale", {})
                
                # Get the main establishment (siege)
                siege_siret = unite_legale.get("etablissement_siege", {}).get("siret")
                
                return CompanySearchResult(
                    found=True,
                    company_name=unite_legale.get("denomination") or f"{unite_legale.get('prenom_1', '')} {unite_legale.get('nom', '')}".strip(),
                    siren=unite_legale.get("siren"),
                    siret=siege_siret,
                    legal_form=get_legal_form(unite_legale.get("categorie_juridique")),
                    creation_date=unite_legale.get("date_creation"),
                    activity=unite_legale.get("activite_principale"),
                    naf_code=unite_legale.get("activite_principale"),
                    employee_count=get_employee_range(unite_legale.get("tranche_effectifs")),
                    source="entreprise.data.gouv.fr",
                    raw_data=data
                )
            elif response.status_code == 404:
                return CompanySearchResult(found=False)
            else:
                return CompanySearchResult(found=False)
                
        except httpx.TimeoutException:
            return CompanySearchResult(found=False)

async def search_by_name(name: str) -> CompanySearchResult:
    """Search company by name"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        # URL encode the name
        url = f"https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales?denomination={name}&per_page=1"
        
        try:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                unites = data.get("unites_legales", [])
                
                if unites:
                    unite_legale = unites[0]
                    
                    return CompanySearchResult(
                        found=True,
                        company_name=unite_legale.get("denomination") or f"{unite_legale.get('prenom_1', '')} {unite_legale.get('nom', '')}".strip(),
                        siren=unite_legale.get("siren"),
                        legal_form=get_legal_form(unite_legale.get("categorie_juridique")),
                        creation_date=unite_legale.get("date_creation"),
                        activity=unite_legale.get("activite_principale"),
                        naf_code=unite_legale.get("activite_principale"),
                        source="entreprise.data.gouv.fr",
                        raw_data=data
                    )
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
        "5499": "Société à responsabilité limitée (SARL)",
        "5498": "EURL",
        "5499": "SARL",
        "5710": "SAS (Société par actions simplifiée)",
        "5720": "SASU",
        "6540": "Société civile",
        "5510": "SA (Société anonyme)",
    }
    
    return forms.get(code, f"Code {code}")

def get_employee_range(code: str) -> str:
    """Convert employee count code to human-readable range"""
    if not code:
        return None
    
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

@router.get("/siret/{siret}")
async def get_company_by_siret(siret: str) -> CompanySearchResult:
    """Get company information by SIRET number"""
    return await search_by_siret(siret.replace(" ", ""))

@router.get("/siren/{siren}")
async def get_company_by_siren(siren: str) -> CompanySearchResult:
    """Get company information by SIREN number"""
    return await search_by_siren(siren.replace(" ", ""))
