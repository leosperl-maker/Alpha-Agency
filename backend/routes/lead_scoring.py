"""
Lead Scoring & Churn Alert System
Intelligent scoring and predictive alerts for CRM

Features:
- Automatic lead scoring based on engagement, behavior, and profile
- Churn risk detection for existing clients
- Automated alerts and recommendations
- AI-powered insights
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging
import os

from .database import db, get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics & Scoring"])
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# ===========================================
# MODELS
# ===========================================

class LeadScore(BaseModel):
    contact_id: str
    score: int  # 0-100
    grade: str  # A, B, C, D, F
    factors: Dict[str, int]
    recommendations: List[str]
    last_updated: str

class ChurnRisk(BaseModel):
    contact_id: str
    risk_level: str  # low, medium, high, critical
    risk_score: int  # 0-100
    warning_signs: List[str]
    recommended_actions: List[str]
    days_since_contact: int
    last_updated: str

class ScoringConfig(BaseModel):
    engagement_weight: int = 30
    profile_weight: int = 25
    activity_weight: int = 25
    timing_weight: int = 20

# ===========================================
# SCORING FACTORS
# ===========================================

SCORING_FACTORS = {
    # Profile completeness
    "has_email": 10,
    "has_phone": 10,
    "has_company": 15,
    "has_budget": 20,
    
    # Engagement
    "opened_emails": 5,  # per email
    "clicked_links": 10,  # per click
    "replied_to_email": 15,
    "scheduled_meeting": 25,
    "attended_meeting": 30,
    
    # Activity
    "quote_requested": 20,
    "quote_approved": 40,
    "invoice_paid": 50,
    "repeat_purchase": 30,
    
    # Timing
    "recent_contact_7d": 15,
    "recent_contact_30d": 10,
    "recent_contact_90d": 5,
    
    # Negative factors
    "no_response_30d": -15,
    "no_response_60d": -25,
    "cancelled_meeting": -20,
    "rejected_quote": -15,
}

GRADE_THRESHOLDS = {
    "A": 80,  # Hot lead, ready to buy
    "B": 60,  # Warm lead, engaged
    "C": 40,  # Cool lead, needs nurturing
    "D": 20,  # Cold lead, low priority
    "F": 0,   # Dead lead
}

CHURN_THRESHOLDS = {
    "critical": 80,
    "high": 60,
    "medium": 40,
    "low": 0,
}

# ===========================================
# HELPER FUNCTIONS
# ===========================================

def get_user_id(user: dict) -> str:
    return user.get("user_id") or user.get("id") or str(user.get("_id", ""))

def calculate_grade(score: int) -> str:
    """Convert score to letter grade"""
    for grade, threshold in GRADE_THRESHOLDS.items():
        if score >= threshold:
            return grade
    return "F"

def get_churn_level(score: int) -> str:
    """Convert churn score to risk level"""
    for level, threshold in CHURN_THRESHOLDS.items():
        if score >= threshold:
            return level
    return "low"

async def calculate_lead_score(contact: dict) -> Dict[str, Any]:
    """Calculate lead score based on multiple factors"""
    factors = {}
    total_score = 0
    
    # Profile completeness
    if contact.get("email"):
        factors["has_email"] = SCORING_FACTORS["has_email"]
        total_score += SCORING_FACTORS["has_email"]
    
    if contact.get("phone"):
        factors["has_phone"] = SCORING_FACTORS["has_phone"]
        total_score += SCORING_FACTORS["has_phone"]
    
    if contact.get("company"):
        factors["has_company"] = SCORING_FACTORS["has_company"]
        total_score += SCORING_FACTORS["has_company"]
    
    if contact.get("budget"):
        factors["has_budget"] = SCORING_FACTORS["has_budget"]
        total_score += SCORING_FACTORS["has_budget"]
    
    # Check activity (invoices, quotes)
    contact_id = contact.get("id")
    
    # Quotes
    quotes = await db.invoices.find(
        {"contact_id": contact_id, "type": "devis"},
        {"_id": 0, "status": 1}
    ).to_list(100)
    
    if quotes:
        factors["quote_requested"] = SCORING_FACTORS["quote_requested"]
        total_score += SCORING_FACTORS["quote_requested"]
        
        approved = [q for q in quotes if q.get("status") in ["approved", "accepted", "paid"]]
        if approved:
            factors["quote_approved"] = SCORING_FACTORS["quote_approved"]
            total_score += SCORING_FACTORS["quote_approved"]
        
        rejected = [q for q in quotes if q.get("status") == "rejected"]
        if rejected:
            factors["rejected_quote"] = SCORING_FACTORS["rejected_quote"]
            total_score += SCORING_FACTORS["rejected_quote"]
    
    # Invoices
    invoices = await db.invoices.find(
        {"contact_id": contact_id, "type": "facture"},
        {"_id": 0, "status": 1}
    ).to_list(100)
    
    paid_invoices = [i for i in invoices if i.get("status") == "paid"]
    if paid_invoices:
        factors["invoice_paid"] = SCORING_FACTORS["invoice_paid"]
        total_score += SCORING_FACTORS["invoice_paid"]
        
        if len(paid_invoices) > 1:
            factors["repeat_purchase"] = SCORING_FACTORS["repeat_purchase"]
            total_score += SCORING_FACTORS["repeat_purchase"]
    
    # Check timing
    now = datetime.now(timezone.utc)
    created_at = contact.get("created_at", "")
    updated_at = contact.get("updated_at", created_at)
    
    try:
        if updated_at:
            last_activity = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            days_since = (now - last_activity).days
            
            if days_since <= 7:
                factors["recent_contact_7d"] = SCORING_FACTORS["recent_contact_7d"]
                total_score += SCORING_FACTORS["recent_contact_7d"]
            elif days_since <= 30:
                factors["recent_contact_30d"] = SCORING_FACTORS["recent_contact_30d"]
                total_score += SCORING_FACTORS["recent_contact_30d"]
            elif days_since <= 90:
                factors["recent_contact_90d"] = SCORING_FACTORS["recent_contact_90d"]
                total_score += SCORING_FACTORS["recent_contact_90d"]
            elif days_since > 60:
                factors["no_response_60d"] = SCORING_FACTORS["no_response_60d"]
                total_score += SCORING_FACTORS["no_response_60d"]
            elif days_since > 30:
                factors["no_response_30d"] = SCORING_FACTORS["no_response_30d"]
                total_score += SCORING_FACTORS["no_response_30d"]
    except:
        pass
    
    # Appointments
    appointments = await db.appointments.find(
        {"contact_id": contact_id},
        {"_id": 0, "status": 1}
    ).to_list(100)
    
    if appointments:
        factors["scheduled_meeting"] = SCORING_FACTORS["scheduled_meeting"]
        total_score += SCORING_FACTORS["scheduled_meeting"]
        
        completed = [a for a in appointments if a.get("status") == "completed"]
        if completed:
            factors["attended_meeting"] = SCORING_FACTORS["attended_meeting"]
            total_score += SCORING_FACTORS["attended_meeting"]
        
        cancelled = [a for a in appointments if a.get("status") == "cancelled"]
        if cancelled:
            factors["cancelled_meeting"] = SCORING_FACTORS["cancelled_meeting"]
            total_score += SCORING_FACTORS["cancelled_meeting"]
    
    # Normalize score to 0-100
    final_score = max(0, min(100, total_score))
    
    return {
        "score": final_score,
        "grade": calculate_grade(final_score),
        "factors": factors
    }

async def calculate_churn_risk(contact: dict) -> Dict[str, Any]:
    """Calculate churn risk for a contact/client"""
    warning_signs = []
    risk_score = 0
    
    contact_id = contact.get("id")
    now = datetime.now(timezone.utc)
    
    # Check last activity
    updated_at = contact.get("updated_at", contact.get("created_at", ""))
    days_since_contact = 0
    
    try:
        if updated_at:
            last_activity = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            days_since_contact = (now - last_activity).days
            
            if days_since_contact > 90:
                warning_signs.append(f"Aucun contact depuis {days_since_contact} jours")
                risk_score += 30
            elif days_since_contact > 60:
                warning_signs.append(f"Contact inactif depuis {days_since_contact} jours")
                risk_score += 20
            elif days_since_contact > 30:
                warning_signs.append(f"Pas de contact récent ({days_since_contact} jours)")
                risk_score += 10
    except:
        pass
    
    # Check invoice patterns
    invoices = await db.invoices.find(
        {"contact_id": contact_id, "type": "facture"},
        {"_id": 0, "status": 1, "created_at": 1, "total": 1}
    ).sort("created_at", -1).to_list(10)
    
    if invoices:
        # Check for overdue invoices
        overdue = [i for i in invoices if i.get("status") in ["overdue", "pending"]]
        if overdue:
            warning_signs.append(f"{len(overdue)} facture(s) impayée(s)")
            risk_score += 20
        
        # Check for declining revenue
        if len(invoices) >= 2:
            recent_total = sum(i.get("total", 0) for i in invoices[:2])
            older_total = sum(i.get("total", 0) for i in invoices[2:4]) if len(invoices) >= 4 else recent_total
            
            if older_total > 0 and recent_total < older_total * 0.7:
                warning_signs.append("Baisse des commandes de plus de 30%")
                risk_score += 25
    
    # Check cancelled appointments
    cancelled = await db.appointments.count_documents({
        "contact_id": contact_id,
        "status": "cancelled"
    })
    
    if cancelled >= 2:
        warning_signs.append(f"{cancelled} RDV annulés")
        risk_score += 15
    
    # Check rejected quotes
    rejected_quotes = await db.invoices.count_documents({
        "contact_id": contact_id,
        "type": "devis",
        "status": "rejected"
    })
    
    if rejected_quotes >= 2:
        warning_signs.append(f"{rejected_quotes} devis refusés")
        risk_score += 15
    
    # Normalize
    risk_score = min(100, risk_score)
    
    return {
        "risk_score": risk_score,
        "risk_level": get_churn_level(risk_score),
        "warning_signs": warning_signs,
        "days_since_contact": days_since_contact
    }

def get_recommendations(score_data: dict, contact: dict) -> List[str]:
    """Generate recommendations based on score"""
    recommendations = []
    score = score_data.get("score", 0)
    factors = score_data.get("factors", {})
    
    if score >= 80:
        recommendations.append("🔥 Lead chaud - Proposer un RDV rapidement")
        recommendations.append("💰 Préparer une offre commerciale personnalisée")
    elif score >= 60:
        recommendations.append("📞 Planifier un appel de suivi")
        recommendations.append("📧 Envoyer des contenus pertinents")
    elif score >= 40:
        recommendations.append("📝 Compléter le profil (email, téléphone, budget)")
        recommendations.append("🎯 Qualifier davantage le besoin")
    else:
        recommendations.append("⏰ Planifier une relance dans 2 semaines")
        recommendations.append("🔍 Vérifier si le lead est encore actif")
    
    # Specific recommendations based on missing factors
    if "has_phone" not in factors:
        recommendations.append("📱 Obtenir le numéro de téléphone")
    if "has_budget" not in factors:
        recommendations.append("💶 Qualifier le budget")
    if "has_company" not in factors and not contact.get("company"):
        recommendations.append("🏢 Identifier l'entreprise")
    
    if factors.get("no_response_30d"):
        recommendations.append("⚠️ Relancer - pas de réponse depuis 30+ jours")
    
    return recommendations[:5]  # Limit to 5 recommendations

def get_churn_actions(churn_data: dict) -> List[str]:
    """Generate recommended actions for churn risk"""
    actions = []
    risk_level = churn_data.get("risk_level", "low")
    
    if risk_level == "critical":
        actions.append("🚨 URGENT: Appeler le client immédiatement")
        actions.append("🎁 Proposer une offre de fidélisation")
        actions.append("📋 Organiser un RDV de bilan")
    elif risk_level == "high":
        actions.append("📞 Planifier un appel de suivi cette semaine")
        actions.append("📧 Envoyer un email personnalisé")
        actions.append("🎯 Proposer un nouveau service/produit")
    elif risk_level == "medium":
        actions.append("📅 Programmer une relance dans les 2 semaines")
        actions.append("📊 Analyser l'historique des interactions")
    else:
        actions.append("✅ Maintenir le contact régulier")
        actions.append("💡 Proposer des upsells pertinents")
    
    return actions

# ===========================================
# API ENDPOINTS
# ===========================================

@router.get("/lead-scores")
async def get_all_lead_scores(
    min_score: int = 0,
    max_score: int = 100,
    grade: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get lead scores for all contacts"""
    # Get all leads
    query = {"status": {"$in": ["lead", "prospect", "qualified"]}}
    contacts = await db.contacts.find(query, {"_id": 0}).limit(limit).to_list(limit)
    
    scored_leads = []
    for contact in contacts:
        score_data = await calculate_lead_score(contact)
        
        # Filter by score range
        if score_data["score"] < min_score or score_data["score"] > max_score:
            continue
        
        # Filter by grade
        if grade and score_data["grade"] != grade.upper():
            continue
        
        recommendations = get_recommendations(score_data, contact)
        
        scored_leads.append({
            "contact_id": contact.get("id"),
            "contact_name": f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
            "company": contact.get("company"),
            "email": contact.get("email"),
            "score": score_data["score"],
            "grade": score_data["grade"],
            "factors": score_data["factors"],
            "recommendations": recommendations
        })
    
    # Sort by score descending
    scored_leads.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "count": len(scored_leads),
        "leads": scored_leads,
        "summary": {
            "grade_A": len([l for l in scored_leads if l["grade"] == "A"]),
            "grade_B": len([l for l in scored_leads if l["grade"] == "B"]),
            "grade_C": len([l for l in scored_leads if l["grade"] == "C"]),
            "grade_D": len([l for l in scored_leads if l["grade"] == "D"]),
            "grade_F": len([l for l in scored_leads if l["grade"] == "F"]),
        }
    }

@router.get("/lead-score/{contact_id}")
async def get_lead_score(
    contact_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get lead score for a specific contact"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    
    score_data = await calculate_lead_score(contact)
    recommendations = get_recommendations(score_data, contact)
    
    return {
        "contact_id": contact_id,
        "contact_name": f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
        "company": contact.get("company"),
        "score": score_data["score"],
        "grade": score_data["grade"],
        "factors": score_data["factors"],
        "recommendations": recommendations,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@router.get("/churn-alerts")
async def get_churn_alerts(
    risk_level: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get churn alerts for clients at risk"""
    # Get all clients
    query = {"status": {"$in": ["client", "active", "vip"]}}
    clients = await db.contacts.find(query, {"_id": 0}).limit(limit).to_list(limit)
    
    at_risk = []
    for client in clients:
        churn_data = await calculate_churn_risk(client)
        
        # Filter by risk level
        if risk_level and churn_data["risk_level"] != risk_level.lower():
            continue
        
        # Only include if there's actual risk
        if churn_data["risk_score"] > 20 or churn_data["warning_signs"]:
            actions = get_churn_actions(churn_data)
            
            at_risk.append({
                "contact_id": client.get("id"),
                "contact_name": f"{client.get('first_name', '')} {client.get('last_name', '')}".strip(),
                "company": client.get("company"),
                "email": client.get("email"),
                "risk_level": churn_data["risk_level"],
                "risk_score": churn_data["risk_score"],
                "warning_signs": churn_data["warning_signs"],
                "recommended_actions": actions,
                "days_since_contact": churn_data["days_since_contact"]
            })
    
    # Sort by risk score descending
    at_risk.sort(key=lambda x: x["risk_score"], reverse=True)
    
    return {
        "count": len(at_risk),
        "alerts": at_risk,
        "summary": {
            "critical": len([a for a in at_risk if a["risk_level"] == "critical"]),
            "high": len([a for a in at_risk if a["risk_level"] == "high"]),
            "medium": len([a for a in at_risk if a["risk_level"] == "medium"]),
            "low": len([a for a in at_risk if a["risk_level"] == "low"]),
        }
    }

@router.get("/churn-risk/{contact_id}")
async def get_churn_risk(
    contact_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get churn risk for a specific contact"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    
    churn_data = await calculate_churn_risk(contact)
    actions = get_churn_actions(churn_data)
    
    return {
        "contact_id": contact_id,
        "contact_name": f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
        "company": contact.get("company"),
        "risk_level": churn_data["risk_level"],
        "risk_score": churn_data["risk_score"],
        "warning_signs": churn_data["warning_signs"],
        "recommended_actions": actions,
        "days_since_contact": churn_data["days_since_contact"],
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@router.get("/dashboard")
async def get_analytics_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive analytics dashboard"""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Lead stats
    total_leads = await db.contacts.count_documents({"status": {"$in": ["lead", "prospect"]}})
    new_leads_month = await db.contacts.count_documents({
        "status": {"$in": ["lead", "prospect"]},
        "created_at": {"$gte": month_start}
    })
    
    # Client stats
    total_clients = await db.contacts.count_documents({"status": {"$in": ["client", "active", "vip"]}})
    
    # Revenue stats
    pipeline = [
        {"$match": {"type": "facture", "status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.invoices.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Get top leads (quick calculation)
    leads = await db.contacts.find(
        {"status": {"$in": ["lead", "prospect"]}},
        {"_id": 0}
    ).limit(10).to_list(10)
    
    hot_leads = []
    for lead in leads:
        score_data = await calculate_lead_score(lead)
        if score_data["score"] >= 60:
            hot_leads.append({
                "name": f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip(),
                "company": lead.get("company"),
                "score": score_data["score"],
                "grade": score_data["grade"]
            })
    
    # Get churn alerts (quick)
    clients = await db.contacts.find(
        {"status": {"$in": ["client", "active"]}},
        {"_id": 0}
    ).limit(10).to_list(10)
    
    churn_alerts = []
    for client in clients:
        churn_data = await calculate_churn_risk(client)
        if churn_data["risk_level"] in ["high", "critical"]:
            churn_alerts.append({
                "name": f"{client.get('first_name', '')} {client.get('last_name', '')}".strip(),
                "company": client.get("company"),
                "risk_level": churn_data["risk_level"],
                "risk_score": churn_data["risk_score"]
            })
    
    return {
        "leads": {
            "total": total_leads,
            "new_this_month": new_leads_month,
            "hot_leads": sorted(hot_leads, key=lambda x: x["score"], reverse=True)[:5]
        },
        "clients": {
            "total": total_clients,
            "at_risk": len(churn_alerts),
            "churn_alerts": churn_alerts[:5]
        },
        "revenue": {
            "total": total_revenue,
            "currency": "EUR"
        },
        "generated_at": now.isoformat()
    }
