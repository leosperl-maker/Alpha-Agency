"""
Shared database and configuration module for all routers
"""
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
import logging
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'alpha-agency-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer(auto_error=False)

# Company Info
COMPANY_INFO = {
    "name": "ALPHA DIGITAL",
    "commercial_name": "ALPHAGENCY",
    "tagline": "",
    "address": "3 Boulevard du Marquisat de Houelbourg",
    "city": "97122 Baie-Mahault",
    "region": "Guadeloupe",
    "phone": "0690 05 34 44",
    "email": "comptabilite@alphagency.fr",
    "contact_email": "leo.sperl@alphagency.fr",
    "siret": "91255383100013",
    "siren": "912553831",
    "naf": "7311Z",
    "tva_intra": "FR47912553831",
    "rcs": "Pointe-à-Pitre",
    "capital": "100",
    "legal_form": "SASU",
    "logo_url": "https://customer-assets.emergentagent.com/job_46adb236-f8e1-4856-a9f0-1ea29ce009cd/artifacts/kpvir23o_LOGO%20DEVIS%20FACTURES.png"
}

# Brevo Config
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')

# Cloudinary Config
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

# NewsAPI Config
NEWSAPI_KEY = os.environ.get('NEWSAPI_KEY', '')

# Perplexity Config
PERPLEXITY_API_KEY = os.environ.get('PERPLEXITY_API_KEY', '')

# Emergent LLM Key (for GPT-4o, Gemini, Claude)
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Meta Config
META_APP_ID = os.environ.get('META_APP_ID', '')
META_APP_SECRET = os.environ.get('META_APP_SECRET', '')

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return current user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
            return user
    except:
        pass
    
    return None
