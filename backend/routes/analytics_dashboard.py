"""
Advanced Analytics Dashboard
Interactive analytics with charts, filters, comparisons
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import io
import csv

from .database import db, get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics Dashboard"])

def get_user_id(user: dict) -> str:
    return user.get("user_id") or user.get("sub") or str(user.get("_id", ""))

# ==================== MODELS ====================

class DateRange(BaseModel):
    start: str
    end: str

class ChartDataPoint(BaseModel):
    label: str
    value: float
    previous_value: Optional[float] = None

# ==================== HELPER FUNCTIONS ====================

def get_date_range(period: str = "month") -> tuple:
    """Get start and end dates for a period"""
    now = datetime.now(timezone.utc)
    
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "quarter":
        quarter = (now.month - 1) // 3
        start = now.replace(month=quarter * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    else:  # default to month
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    
    return start.isoformat(), end.isoformat()

def get_previous_period(start: str, end: str) -> tuple:
    """Get the previous period for comparison"""
    start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
    
    duration = end_dt - start_dt
    prev_end = start_dt
    prev_start = prev_end - duration
    
    return prev_start.isoformat(), prev_end.isoformat()

# ==================== MAIN DASHBOARD ====================

@router.get("/dashboard")
async def get_dashboard_data(
    period: str = Query("month", description="today, week, month, quarter, year"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive dashboard data for the analytics page
    Includes revenue, contacts, invoices, tasks with comparisons
    """
    user_id = get_user_id(current_user)
    
    start, end = get_date_range(period)
    prev_start, prev_end = get_previous_period(start, end)
    
    # ========== REVENUE ==========
    # Current period
    revenue_current = await db.invoices.aggregate([
        {"$match": {"type": "facture", "status": "paid", "created_at": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]).to_list(1)
    
    # Previous period
    revenue_previous = await db.invoices.aggregate([
        {"$match": {"type": "facture", "status": "paid", "created_at": {"$gte": prev_start, "$lt": start}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]).to_list(1)
    
    revenue = {
        "current": revenue_current[0]["total"] if revenue_current else 0,
        "previous": revenue_previous[0]["total"] if revenue_previous else 0
    }
    
    # ========== CONTACTS ==========
    contacts_current = await db.contacts.count_documents({"created_at": {"$gte": start, "$lte": end}})
    contacts_previous = await db.contacts.count_documents({"created_at": {"$gte": prev_start, "$lt": start}})
    
    contacts_by_status = await db.contacts.aggregate([
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(20)
    
    contacts = {
        "new": contacts_current,
        "previous": contacts_previous,
        "by_status": {item["_id"]: item["count"] for item in contacts_by_status if item["_id"]}
    }
    
    # ========== INVOICES & QUOTES ==========
    invoices_current = await db.invoices.count_documents({"type": "facture", "created_at": {"$gte": start}})
    quotes_current = await db.invoices.count_documents({"type": "devis", "created_at": {"$gte": start}})
    
    quote_conversion = await db.invoices.aggregate([
        {"$match": {"type": "devis", "created_at": {"$gte": start}}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "converted": {"$sum": {"$cond": [{"$eq": ["$status", "converted"]}, 1, 0]}}
        }}
    ]).to_list(1)
    
    conversion_rate = 0
    if quote_conversion and quote_conversion[0]["total"] > 0:
        conversion_rate = (quote_conversion[0]["converted"] / quote_conversion[0]["total"]) * 100
    
    documents = {
        "invoices": invoices_current,
        "quotes": quotes_current,
        "conversion_rate": round(conversion_rate, 1)
    }
    
    # ========== TASKS ==========
    tasks_completed = await db.tasks.count_documents({"status": "completed", "updated_at": {"$gte": start}})
    tasks_pending = await db.tasks.count_documents({"status": {"$in": ["todo", "in_progress"]}})
    tasks_overdue = await db.tasks.count_documents({
        "status": {"$in": ["todo", "in_progress"]},
        "due_date": {"$lt": datetime.now(timezone.utc).isoformat()}
    })
    
    tasks = {
        "completed": tasks_completed,
        "pending": tasks_pending,
        "overdue": tasks_overdue
    }
    
    # ========== APPOINTMENTS ==========
    appointments_count = await db.appointments.count_documents({"start_time": {"$gte": start}})
    
    return {
        "period": period,
        "date_range": {"start": start, "end": end},
        "revenue": revenue,
        "contacts": contacts,
        "documents": documents,
        "tasks": tasks,
        "appointments": appointments_count
    }

# ==================== REVENUE CHART ====================

@router.get("/revenue-chart")
async def get_revenue_chart(
    period: str = Query("month", description="week, month, quarter, year"),
    granularity: str = Query("day", description="day, week, month"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get revenue data for chart display
    Returns daily/weekly/monthly revenue with previous period comparison
    """
    start, end = get_date_range(period)
    prev_start, prev_end = get_previous_period(start, end)
    
    # Determine date format based on granularity
    if granularity == "day":
        date_format = "%Y-%m-%d"
        group_format = {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromString": {"dateString": "$created_at"}}}}
    elif granularity == "week":
        date_format = "%Y-W%V"
        group_format = {"$concat": [
            {"$toString": {"$year": {"$dateFromString": {"dateString": "$created_at"}}}},
            "-W",
            {"$toString": {"$week": {"$dateFromString": {"dateString": "$created_at"}}}}
        ]}
    else:  # month
        date_format = "%Y-%m"
        group_format = {"$dateToString": {"format": "%Y-%m", "date": {"$dateFromString": {"dateString": "$created_at"}}}}
    
    # Current period revenue
    current_data = await db.invoices.aggregate([
        {"$match": {"type": "facture", "status": "paid", "created_at": {"$gte": start, "$lte": end}}},
        {"$group": {
            "_id": group_format,
            "total": {"$sum": "$total"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]).to_list(100)
    
    # Previous period revenue
    previous_data = await db.invoices.aggregate([
        {"$match": {"type": "facture", "status": "paid", "created_at": {"$gte": prev_start, "$lt": start}}},
        {"$group": {
            "_id": group_format,
            "total": {"$sum": "$total"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]).to_list(100)
    
    return {
        "period": period,
        "granularity": granularity,
        "current": [{"date": d["_id"], "revenue": d["total"], "invoices": d["count"]} for d in current_data],
        "previous": [{"date": d["_id"], "revenue": d["total"], "invoices": d["count"]} for d in previous_data],
        "total_current": sum(d["total"] for d in current_data),
        "total_previous": sum(d["total"] for d in previous_data)
    }

# ==================== LEADS FUNNEL ====================

@router.get("/leads-funnel")
async def get_leads_funnel(
    period: str = Query("month"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get leads funnel data showing conversion through stages
    """
    start, end = get_date_range(period)
    
    # Get contacts by status
    pipeline = [
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    status_data = await db.contacts.aggregate(pipeline).to_list(20)
    
    # Define funnel stages
    funnel_stages = {
        "lead": "Leads",
        "qualified": "Qualifiés",
        "opportunity": "Opportunités", 
        "negotiation": "Négociation",
        "client": "Clients"
    }
    
    funnel = []
    for stage, label in funnel_stages.items():
        count = next((d["count"] for d in status_data if d["_id"] == stage), 0)
        funnel.append({"stage": stage, "label": label, "count": count})
    
    # Calculate conversion rates between stages
    for i in range(1, len(funnel)):
        if funnel[i-1]["count"] > 0:
            funnel[i]["conversion_rate"] = round((funnel[i]["count"] / funnel[i-1]["count"]) * 100, 1)
        else:
            funnel[i]["conversion_rate"] = 0
    
    return {
        "period": period,
        "funnel": funnel,
        "total_leads": sum(d["count"] for d in funnel)
    }

# ==================== TOP CLIENTS ====================

@router.get("/top-clients")
async def get_top_clients(
    period: str = Query("year"),
    limit: int = Query(10),
    current_user: dict = Depends(get_current_user)
):
    """
    Get top clients by revenue
    """
    start, end = get_date_range(period)
    
    pipeline = [
        {"$match": {"type": "facture", "status": "paid", "created_at": {"$gte": start}}},
        {"$group": {
            "_id": "$client_id",
            "client_name": {"$first": "$client_name"},
            "total_revenue": {"$sum": "$total"},
            "invoice_count": {"$sum": 1}
        }},
        {"$sort": {"total_revenue": -1}},
        {"$limit": limit}
    ]
    
    top_clients = await db.invoices.aggregate(pipeline).to_list(limit)
    
    return {
        "period": period,
        "clients": [
            {
                "client_id": c["_id"],
                "name": c["client_name"] or "Client inconnu",
                "revenue": c["total_revenue"],
                "invoices": c["invoice_count"]
            }
            for c in top_clients
        ]
    }

# ==================== ACTIVITY TIMELINE ====================

@router.get("/activity-timeline")
async def get_activity_timeline(
    limit: int = Query(20),
    current_user: dict = Depends(get_current_user)
):
    """
    Get recent activity across all modules
    """
    user_id = get_user_id(current_user)
    
    activities = []
    
    # Recent contacts
    contacts = await db.contacts.find(
        {}, {"_id": 0, "first_name": 1, "last_name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for c in contacts:
        activities.append({
            "type": "contact",
            "icon": "user",
            "message": f"Nouveau contact: {c.get('first_name', '')} {c.get('last_name', '')}",
            "date": c.get("created_at")
        })
    
    # Recent invoices
    invoices = await db.invoices.find(
        {}, {"_id": 0, "number": 1, "client_name": 1, "total": 1, "type": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for i in invoices:
        doc_type = "Facture" if i.get("type") == "facture" else "Devis"
        activities.append({
            "type": "invoice",
            "icon": "file-text",
            "message": f"{doc_type} {i.get('number', '')} - {i.get('client_name', '')} ({i.get('total', 0):.2f}€)",
            "date": i.get("created_at")
        })
    
    # Recent tasks completed
    tasks = await db.tasks.find(
        {"status": "completed"}, {"_id": 0, "title": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(5).to_list(5)
    
    for t in tasks:
        activities.append({
            "type": "task",
            "icon": "check-circle",
            "message": f"Tâche terminée: {t.get('title', '')}",
            "date": t.get("updated_at")
        })
    
    # Sort all activities by date
    activities.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return {"activities": activities[:limit]}

# ==================== KPI TRENDS ====================

@router.get("/kpi-trends")
async def get_kpi_trends(
    period: str = Query("year"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get KPI trends over time for sparkline charts
    """
    now = datetime.now(timezone.utc)
    
    # Get last 12 months data
    months_data = []
    for i in range(11, -1, -1):
        month_start = (now - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            month_end = (now - timedelta(days=(i-1)*30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            month_end = now
        
        # Revenue
        revenue = await db.invoices.aggregate([
            {"$match": {"type": "facture", "status": "paid", "created_at": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]).to_list(1)
        
        # Contacts
        contacts = await db.contacts.count_documents({
            "created_at": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
        })
        
        months_data.append({
            "month": month_start.strftime("%Y-%m"),
            "revenue": revenue[0]["total"] if revenue else 0,
            "contacts": contacts
        })
    
    return {
        "months": months_data,
        "totals": {
            "revenue": sum(m["revenue"] for m in months_data),
            "contacts": sum(m["contacts"] for m in months_data)
        }
    }

# ==================== EXPORT ====================

@router.get("/export")
async def export_analytics(
    period: str = Query("month"),
    format: str = Query("csv", description="csv or json"),
    current_user: dict = Depends(get_current_user)
):
    """
    Export analytics data to CSV or JSON
    """
    start, end = get_date_range(period)
    
    # Get all data
    contacts = await db.contacts.find(
        {"created_at": {"$gte": start}},
        {"_id": 0, "first_name": 1, "last_name": 1, "email": 1, "company": 1, "status": 1, "created_at": 1}
    ).to_list(1000)
    
    invoices = await db.invoices.find(
        {"created_at": {"$gte": start}},
        {"_id": 0, "number": 1, "client_name": 1, "type": 1, "total": 1, "status": 1, "created_at": 1}
    ).to_list(1000)
    
    if format == "json":
        return {
            "period": period,
            "date_range": {"start": start, "end": end},
            "contacts": contacts,
            "invoices": invoices
        }
    
    # CSV format
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Contacts
    writer.writerow(["=== CONTACTS ==="])
    writer.writerow(["Prénom", "Nom", "Email", "Société", "Statut", "Date création"])
    for c in contacts:
        writer.writerow([
            c.get("first_name", ""), c.get("last_name", ""), c.get("email", ""),
            c.get("company", ""), c.get("status", ""), c.get("created_at", "")
        ])
    
    writer.writerow([])
    
    # Invoices
    writer.writerow(["=== DOCUMENTS ==="])
    writer.writerow(["Numéro", "Client", "Type", "Total", "Statut", "Date création"])
    for i in invoices:
        writer.writerow([
            i.get("number", ""), i.get("client_name", ""), i.get("type", ""),
            i.get("total", 0), i.get("status", ""), i.get("created_at", "")
        ])
    
    return {
        "filename": f"analytics_{period}_{datetime.now().strftime('%Y%m%d')}.csv",
        "content": output.getvalue()
    }
