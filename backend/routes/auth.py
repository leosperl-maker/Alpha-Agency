"""
Authentication routes - Register, Login, Profile
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta

from .database import db, get_current_user, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str


# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ==================== ROUTES ====================

@router.post("/register", response_model=dict)
async def register(user: UserCreate, current_user: dict = Depends(get_current_user)):
    """Register a new admin user (super_admin only)"""
    # Seul un super_admin peut créer de nouveaux comptes
    existing_user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    if not existing_user or existing_user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Seul un super administrateur peut créer des comptes")
    
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "full_name": user.full_name,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return {"id": user_id, "message": "Compte administrateur créé avec succès"}


@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login and get JWT token"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    token = create_token(user['id'], user['email'], user['role'])
    return {
        "token": token, 
        "user": {
            "id": user['id'], 
            "email": user['email'], 
            "full_name": user['full_name'], 
            "role": user['role']
        }
    }


@router.get("/me", response_model=dict)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    user = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user
