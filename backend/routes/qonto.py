"""
Qonto API Integration Routes
Synchronisation des données bancaires avec Qonto
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import httpx
import os
import base64
from pymongo import MongoClient

router = APIRouter(prefix="/qonto", tags=["Qonto"])

# Qonto API Configuration - OAuth2
QONTO_API_BASE = "https://thirdparty.qonto.com/v2"
QONTO_CLIENT_ID = os.environ.get("QONTO_CLIENT_ID", "e140adc5-560d-4bed-8dbf-8500767bd49c")
QONTO_CLIENT_SECRET = os.environ.get("QONTO_CLIENT_SECRET", "S3vc0ir927G37S8AOZSU2SzQpD")
QONTO_OAUTH_URL = "https://oauth.qonto.com/oauth2/token"

async def get_oauth_token():
    """Get OAuth2 access token from Qonto"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                QONTO_OAUTH_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": QONTO_CLIENT_ID,
                    "client_secret": QONTO_CLIENT_SECRET,
                    "scope": "read"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code == 200:
                return response.json().get("access_token")
            return None
        except Exception as e:
            print(f"OAuth error: {e}")
            return None

def get_qonto_headers(token: str = None):
    """Generate authentication headers for Qonto API (Bearer token)"""
    return {
        "Authorization": f"Bearer {token}" if token else "",
        "Content-Type": "application/json"
    }

# MongoDB connection for this module
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'alpha_agency')
_client = MongoClient(mongo_url)
_db = _client[db_name]

qonto_transactions_collection = _db["qonto_transactions"]
qonto_accounts_collection = _db["qonto_accounts"]
qonto_sync_collection = _db["qonto_sync_logs"]


class QontoAccount(BaseModel):
    slug: str
    iban: str
    bic: str
    currency: str
    balance: float
    balance_cents: int
    authorized_balance: float
    authorized_balance_cents: int
    name: Optional[str] = None
    updated_at: Optional[str] = None


class QontoTransaction(BaseModel):
    transaction_id: str
    amount: float
    amount_cents: int
    local_amount: float
    local_amount_cents: int
    side: str  # credit or debit
    operation_type: str
    currency: str
    local_currency: str
    label: str
    settled_at: Optional[str] = None
    emitted_at: str
    status: str
    note: Optional[str] = None
    reference: Optional[str] = None
    vat_amount: Optional[float] = None
    vat_rate: Optional[float] = None
    category: Optional[str] = None
    attachment_ids: Optional[List[str]] = []


@router.get("/status")
async def get_qonto_status():
    """Check Qonto API connection status"""
    try:
        token = await get_oauth_token()
        if not token:
            return {"connected": False, "error": "Impossible d'obtenir le token OAuth2"}
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{QONTO_API_BASE}/organization",
                headers=get_qonto_headers(token)
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "connected": True,
                    "organization": data.get("organization", {}).get("name", "Unknown"),
                    "slug": data.get("organization", {}).get("slug", "Unknown")
                }
            elif response.status_code == 401:
                return {"connected": False, "error": "Token expiré ou invalide"}
            else:
                return {"connected": False, "error": f"Erreur API: {response.status_code}"}
    except Exception as e:
        return {"connected": False, "error": str(e)}


@router.get("/organization")
async def get_organization():
    """Get organization details from Qonto"""
    try:
        token = await get_oauth_token()
        if not token:
            raise HTTPException(status_code=401, detail="Impossible d'obtenir le token OAuth2")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{QONTO_API_BASE}/organization",
                headers=get_qonto_headers(token)
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="Erreur Qonto API")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Erreur de connexion: {str(e)}")


@router.get("/accounts")
async def get_bank_accounts():
    """Get all bank accounts from Qonto"""
    try:
        token = await get_oauth_token()
        if not token:
            raise HTTPException(status_code=401, detail="Impossible d'obtenir le token OAuth2")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # First get organization to get the slug
            org_response = await client.get(
                f"{QONTO_API_BASE}/organization",
                headers=get_qonto_headers(token)
            )
            
            if org_response.status_code != 200:
                raise HTTPException(status_code=org_response.status_code, detail="Erreur lors de la récupération de l'organisation")
            
            org_data = org_response.json()
            org_slug = org_data.get("organization", {}).get("slug")
            bank_accounts = org_data.get("organization", {}).get("bank_accounts", [])
            
            # Store accounts in MongoDB
            for account in bank_accounts:
                account["_id"] = account.get("slug")
                account["synced_at"] = datetime.utcnow().isoformat()
                qonto_accounts_collection.update_one(
                    {"_id": account["_id"]},
                    {"$set": account},
                    upsert=True
                )
            
            # Calculate total balance
            total_balance = sum(acc.get("balance", 0) for acc in bank_accounts)
            
            return {
                "organization_slug": org_slug,
                "accounts": bank_accounts,
                "total_balance": total_balance,
                "currency": bank_accounts[0].get("currency", "EUR") if bank_accounts else "EUR"
            }
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Erreur de connexion: {str(e)}")


@router.get("/transactions")
async def get_transactions(
    account_slug: Optional[str] = None,
    status: Optional[str] = None,  # pending, declined, completed
    side: Optional[str] = None,  # credit, debit
    page: int = 1,
    per_page: int = 100,
    settled_at_from: Optional[str] = None,
    settled_at_to: Optional[str] = None
):
    """Get transactions from Qonto"""
    try:
        token = await get_oauth_token()
        if not token:
            raise HTTPException(status_code=401, detail="Impossible d'obtenir le token OAuth2")
        
        # Get organization and accounts first
        async with httpx.AsyncClient(timeout=30.0) as client:
            org_response = await client.get(
                f"{QONTO_API_BASE}/organization",
                headers=get_qonto_headers(token)
            )
            
            if org_response.status_code != 200:
                raise HTTPException(status_code=org_response.status_code, detail="Erreur organisation")
            
            org_data = org_response.json()
            bank_accounts = org_data.get("organization", {}).get("bank_accounts", [])
            
            if not bank_accounts:
                return {"transactions": [], "meta": {"total_count": 0}}
            
            # Use first account if not specified
            target_slug = account_slug or bank_accounts[0].get("slug")
            target_iban = None
            for acc in bank_accounts:
                if acc.get("slug") == target_slug:
                    target_iban = acc.get("iban")
                    break
            
            if not target_iban:
                target_iban = bank_accounts[0].get("iban")
            
            # Build query params
            params = {
                "slug": target_slug,
                "iban": target_iban,
                "current_page": page,
                "per_page": min(per_page, 100)
            }
            
            if status:
                params["status[]"] = status
            if side:
                params["side"] = side
            if settled_at_from:
                params["settled_at_from"] = settled_at_from
            if settled_at_to:
                params["settled_at_to"] = settled_at_to
            
            # Get transactions
            tx_response = await client.get(
                f"{QONTO_API_BASE}/transactions",
                headers=get_qonto_headers(token),
                params=params
            )
            
            if tx_response.status_code != 200:
                # Return empty if error (might be no transactions)
                return {"transactions": [], "meta": {"total_count": 0, "error": tx_response.text}}
            
            tx_data = tx_response.json()
            transactions = tx_data.get("transactions", [])
            
            # Store transactions in MongoDB
            for tx in transactions:
                tx["_id"] = tx.get("transaction_id")
                tx["synced_at"] = datetime.utcnow().isoformat()
                qonto_transactions_collection.update_one(
                    {"_id": tx["_id"]},
                    {"$set": tx},
                    upsert=True
                )
            
            return {
                "transactions": transactions,
                "meta": tx_data.get("meta", {}),
                "account_slug": target_slug
            }
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Erreur de connexion: {str(e)}")


@router.post("/sync")
async def sync_all_transactions():
    """Sync all transactions from Qonto (last 90 days)"""
    try:
        sync_start = datetime.utcnow()
        total_synced = 0
        
        # Get date range (last 90 days)
        date_to = datetime.utcnow()
        date_from = date_to - timedelta(days=90)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Get organization
            org_response = await client.get(
                f"{QONTO_API_BASE}/organization",
                headers=get_qonto_headers()
            )
            
            if org_response.status_code != 200:
                raise HTTPException(status_code=org_response.status_code, detail="Erreur organisation")
            
            org_data = org_response.json()
            bank_accounts = org_data.get("organization", {}).get("bank_accounts", [])
            
            for account in bank_accounts:
                slug = account.get("slug")
                iban = account.get("iban")
                
                # Paginate through all transactions
                page = 1
                while True:
                    params = {
                        "slug": slug,
                        "iban": iban,
                        "current_page": page,
                        "per_page": 100,
                        "settled_at_from": date_from.strftime("%Y-%m-%d"),
                        "settled_at_to": date_to.strftime("%Y-%m-%d")
                    }
                    
                    tx_response = await client.get(
                        f"{QONTO_API_BASE}/transactions",
                        headers=get_qonto_headers(),
                        params=params
                    )
                    
                    if tx_response.status_code != 200:
                        break
                    
                    tx_data = tx_response.json()
                    transactions = tx_data.get("transactions", [])
                    
                    if not transactions:
                        break
                    
                    # Store transactions
                    for tx in transactions:
                        tx["_id"] = tx.get("transaction_id")
                        tx["account_slug"] = slug
                        tx["synced_at"] = datetime.utcnow().isoformat()
                        qonto_transactions_collection.update_one(
                            {"_id": tx["_id"]},
                            {"$set": tx},
                            upsert=True
                        )
                        total_synced += 1
                    
                    # Check if more pages
                    meta = tx_data.get("meta", {})
                    if page >= meta.get("total_pages", 1):
                        break
                    page += 1
        
        # Log sync
        sync_log = {
            "started_at": sync_start.isoformat(),
            "completed_at": datetime.utcnow().isoformat(),
            "transactions_synced": total_synced,
            "date_range": {
                "from": date_from.isoformat(),
                "to": date_to.isoformat()
            }
        }
        qonto_sync_collection.insert_one(sync_log)
        
        return {
            "success": True,
            "transactions_synced": total_synced,
            "sync_duration_seconds": (datetime.utcnow() - sync_start).total_seconds()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cached/transactions")
async def get_cached_transactions(
    side: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get transactions from local cache (MongoDB)"""
    query = {}
    if side:
        query["side"] = side
    if status:
        query["status"] = status
    
    transactions = list(
        qonto_transactions_collection.find(query, {"_id": 0})
        .sort("emitted_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    total = qonto_transactions_collection.count_documents(query)
    
    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/cached/balance")
async def get_cached_balance():
    """Get cached balance from stored accounts"""
    accounts = list(qonto_accounts_collection.find({}, {"_id": 0}))
    
    if not accounts:
        # Try to fetch fresh
        try:
            result = await get_bank_accounts()
            return {
                "total_balance": result.get("total_balance", 0),
                "currency": result.get("currency", "EUR"),
                "accounts": result.get("accounts", []),
                "source": "live"
            }
        except:
            return {"total_balance": 0, "currency": "EUR", "accounts": [], "source": "none"}
    
    total_balance = sum(acc.get("balance", 0) for acc in accounts)
    
    return {
        "total_balance": total_balance,
        "currency": accounts[0].get("currency", "EUR") if accounts else "EUR",
        "accounts": accounts,
        "source": "cache",
        "last_sync": accounts[0].get("synced_at") if accounts else None
    }


@router.get("/stats")
async def get_qonto_stats():
    """Get statistics from cached transactions"""
    # Get transactions from last 30 days
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    
    pipeline = [
        {"$match": {"emitted_at": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": "$side",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    results = list(qonto_transactions_collection.aggregate(pipeline))
    
    credits = next((r for r in results if r["_id"] == "credit"), {"total": 0, "count": 0})
    debits = next((r for r in results if r["_id"] == "debit"), {"total": 0, "count": 0})
    
    return {
        "period": "30_days",
        "income": {
            "total": abs(credits.get("total", 0)),
            "count": credits.get("count", 0)
        },
        "expenses": {
            "total": abs(debits.get("total", 0)),
            "count": debits.get("count", 0)
        },
        "net_flow": abs(credits.get("total", 0)) - abs(debits.get("total", 0))
    }
