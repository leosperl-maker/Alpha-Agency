"""
Advanced Analytics PDF Report Generator
Generate comprehensive PDF reports for CRM analytics

Features:
- Monthly/Weekly/Custom period reports
- Revenue analysis
- Lead pipeline overview
- Client engagement metrics
- Visual charts (matplotlib)
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from io import BytesIO
import uuid
import logging
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from .database import db, get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])
logger = logging.getLogger(__name__)

# ===========================================
# MODELS
# ===========================================

class ReportPeriod(BaseModel):
    start_date: str
    end_date: str
    type: str = "custom"  # daily, weekly, monthly, quarterly, custom

class ReportRequest(BaseModel):
    period: str = "month"  # week, month, quarter, year, custom
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    include_revenue: bool = True
    include_leads: bool = True
    include_clients: bool = True
    include_tasks: bool = True

# ===========================================
# HELPER FUNCTIONS
# ===========================================

def get_user_id(user: dict) -> str:
    return user.get("user_id") or user.get("id") or str(user.get("_id", ""))

def get_period_dates(period: str, start_date: str = None, end_date: str = None) -> tuple:
    """Get start and end dates for a period"""
    now = datetime.now(timezone.utc)
    
    if period == "week":
        start = now - timedelta(days=7)
        end = now
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "quarter":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=quarter_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "custom" and start_date and end_date:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    else:
        # Default to last 30 days
        start = now - timedelta(days=30)
        end = now
    
    return start.isoformat(), end.isoformat()

async def get_revenue_stats(start_date: str, end_date: str) -> Dict[str, Any]:
    """Get revenue statistics for the period"""
    # Total invoiced
    invoiced_pipeline = [
        {"$match": {
            "type": "facture",
            "created_at": {"$gte": start_date, "$lte": end_date}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]
    invoiced = await db.invoices.aggregate(invoiced_pipeline).to_list(1)
    
    # Total paid
    paid_pipeline = [
        {"$match": {
            "type": "facture",
            "status": "paid",
            "created_at": {"$gte": start_date, "$lte": end_date}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]
    paid = await db.invoices.aggregate(paid_pipeline).to_list(1)
    
    # Quotes
    quotes_pipeline = [
        {"$match": {
            "type": "devis",
            "created_at": {"$gte": start_date, "$lte": end_date}
        }},
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$total"},
            "count": {"$sum": 1}
        }}
    ]
    quotes = await db.invoices.aggregate(quotes_pipeline).to_list(10)
    
    quotes_by_status = {q["_id"]: {"total": q["total"], "count": q["count"]} for q in quotes}
    
    return {
        "invoiced": {
            "total": invoiced[0]["total"] if invoiced else 0,
            "count": invoiced[0]["count"] if invoiced else 0
        },
        "paid": {
            "total": paid[0]["total"] if paid else 0,
            "count": paid[0]["count"] if paid else 0
        },
        "quotes": quotes_by_status,
        "conversion_rate": (
            (quotes_by_status.get("approved", {}).get("count", 0) + quotes_by_status.get("accepted", {}).get("count", 0)) /
            sum(q.get("count", 0) for q in quotes_by_status.values()) * 100
            if quotes_by_status else 0
        )
    }

async def get_lead_stats(start_date: str, end_date: str) -> Dict[str, Any]:
    """Get lead statistics for the period"""
    # New leads
    new_leads = await db.contacts.count_documents({
        "status": {"$in": ["lead", "prospect"]},
        "created_at": {"$gte": start_date, "$lte": end_date}
    })
    
    # Converted leads
    converted = await db.contacts.count_documents({
        "status": {"$in": ["client", "active"]},
        "updated_at": {"$gte": start_date, "$lte": end_date}
    })
    
    # By source
    source_pipeline = [
        {"$match": {
            "status": {"$in": ["lead", "prospect"]},
            "created_at": {"$gte": start_date, "$lte": end_date}
        }},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]
    by_source = await db.contacts.aggregate(source_pipeline).to_list(10)
    
    return {
        "new_leads": new_leads,
        "converted": converted,
        "conversion_rate": (converted / new_leads * 100) if new_leads > 0 else 0,
        "by_source": {s["_id"] or "unknown": s["count"] for s in by_source}
    }

async def get_client_stats(start_date: str, end_date: str) -> Dict[str, Any]:
    """Get client statistics"""
    total_clients = await db.contacts.count_documents({
        "status": {"$in": ["client", "active", "vip"]}
    })
    
    new_clients = await db.contacts.count_documents({
        "status": {"$in": ["client", "active", "vip"]},
        "created_at": {"$gte": start_date, "$lte": end_date}
    })
    
    # Active clients (with recent activity)
    active_threshold = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    active_clients = await db.contacts.count_documents({
        "status": {"$in": ["client", "active", "vip"]},
        "updated_at": {"$gte": active_threshold}
    })
    
    return {
        "total": total_clients,
        "new_this_period": new_clients,
        "active": active_clients,
        "retention_rate": (active_clients / total_clients * 100) if total_clients > 0 else 100
    }

async def get_task_stats(start_date: str, end_date: str) -> Dict[str, Any]:
    """Get task statistics"""
    # Tasks by status
    status_pipeline = [
        {"$match": {
            "created_at": {"$gte": start_date, "$lte": end_date}
        }},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    by_status = await db.tasks.aggregate(status_pipeline).to_list(10)
    
    completed = sum(s["count"] for s in by_status if s["_id"] in ["done", "completed"])
    total = sum(s["count"] for s in by_status)
    
    return {
        "total": total,
        "completed": completed,
        "completion_rate": (completed / total * 100) if total > 0 else 0,
        "by_status": {s["_id"] or "unknown": s["count"] for s in by_status}
    }

def create_pdf_report(
    company_name: str,
    period_label: str,
    revenue: Dict,
    leads: Dict,
    clients: Dict,
    tasks: Dict
) -> BytesIO:
    """Generate PDF report"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a1a2e')
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=16,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor('#e94560')
    )
    
    content = []
    
    # Header
    content.append(Paragraph(f"📊 Rapport Analytics", title_style))
    content.append(Paragraph(f"{company_name}", styles['Heading2']))
    content.append(Paragraph(f"Période: {period_label}", styles['Normal']))
    content.append(Paragraph(f"Généré le: {datetime.now().strftime('%d/%m/%Y à %H:%M')}", styles['Normal']))
    content.append(Spacer(1, 20))
    content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e94560')))
    content.append(Spacer(1, 20))
    
    # Revenue Section
    content.append(Paragraph("💰 Chiffre d'Affaires", section_style))
    
    revenue_data = [
        ["Métrique", "Valeur"],
        ["Facturé", f"{revenue['invoiced']['total']:.2f} € ({revenue['invoiced']['count']} factures)"],
        ["Encaissé", f"{revenue['paid']['total']:.2f} € ({revenue['paid']['count']} factures)"],
        ["Taux de paiement", f"{(revenue['paid']['total']/revenue['invoiced']['total']*100 if revenue['invoiced']['total'] > 0 else 0):.1f}%"],
    ]
    
    revenue_table = Table(revenue_data, colWidths=[200, 250])
    revenue_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e94560')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0f0f0')),
        ('GRID', (0, 0), (-1, -1), 1, colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f8f8')]),
    ]))
    content.append(revenue_table)
    content.append(Spacer(1, 20))
    
    # Quotes section
    if revenue.get('quotes'):
        content.append(Paragraph("📝 Devis", section_style))
        quotes_data = [["Statut", "Nombre", "Montant"]]
        for status, data in revenue['quotes'].items():
            quotes_data.append([status.capitalize(), str(data['count']), f"{data['total']:.2f} €"])
        
        if len(quotes_data) > 1:
            quotes_table = Table(quotes_data, colWidths=[150, 100, 150])
            quotes_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f3460')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ]))
            content.append(quotes_table)
        content.append(Spacer(1, 20))
    
    # Leads Section
    content.append(Paragraph("🎯 Leads & Prospects", section_style))
    
    leads_data = [
        ["Métrique", "Valeur"],
        ["Nouveaux leads", str(leads['new_leads'])],
        ["Convertis en clients", str(leads['converted'])],
        ["Taux de conversion", f"{leads['conversion_rate']:.1f}%"],
    ]
    
    leads_table = Table(leads_data, colWidths=[200, 250])
    leads_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16213e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
    ]))
    content.append(leads_table)
    
    # Sources
    if leads.get('by_source'):
        content.append(Spacer(1, 10))
        content.append(Paragraph("Sources des leads:", styles['Normal']))
        source_data = [["Source", "Nombre"]]
        for source, count in sorted(leads['by_source'].items(), key=lambda x: x[1], reverse=True):
            source_data.append([source.replace('_', ' ').capitalize(), str(count)])
        
        if len(source_data) > 1:
            source_table = Table(source_data, colWidths=[200, 100])
            source_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#533483')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
            ]))
            content.append(source_table)
    content.append(Spacer(1, 20))
    
    # Clients Section
    content.append(Paragraph("👥 Clients", section_style))
    
    clients_data = [
        ["Métrique", "Valeur"],
        ["Total clients", str(clients['total'])],
        ["Nouveaux cette période", str(clients['new_this_period'])],
        ["Clients actifs", str(clients['active'])],
        ["Taux de rétention", f"{clients['retention_rate']:.1f}%"],
    ]
    
    clients_table = Table(clients_data, colWidths=[200, 250])
    clients_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d4059')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
    ]))
    content.append(clients_table)
    content.append(Spacer(1, 20))
    
    # Tasks Section
    content.append(Paragraph("✅ Tâches", section_style))
    
    tasks_data = [
        ["Métrique", "Valeur"],
        ["Total tâches", str(tasks['total'])],
        ["Complétées", str(tasks['completed'])],
        ["Taux de complétion", f"{tasks['completion_rate']:.1f}%"],
    ]
    
    tasks_table = Table(tasks_data, colWidths=[200, 250])
    tasks_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#222831')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
    ]))
    content.append(tasks_table)
    
    # Footer
    content.append(Spacer(1, 40))
    content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#ddd')))
    content.append(Spacer(1, 10))
    content.append(Paragraph(
        f"Rapport généré par MoltBot CRM • {datetime.now().strftime('%Y')}",
        ParagraphStyle('Footer', parent=styles['Normal'], alignment=TA_CENTER, textColor=colors.grey)
    ))
    
    doc.build(content)
    buffer.seek(0)
    return buffer

# ===========================================
# API ENDPOINTS
# ===========================================

@router.get("/analytics-pdf")
async def generate_analytics_pdf(
    period: str = Query("month", description="week, month, quarter, year, custom"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate analytics PDF report"""
    
    # Get period dates
    start, end = get_period_dates(period, start_date, end_date)
    
    # Generate period label
    start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
    period_label = f"{start_dt.strftime('%d/%m/%Y')} - {end_dt.strftime('%d/%m/%Y')}"
    
    # Gather statistics
    revenue = await get_revenue_stats(start, end)
    leads = await get_lead_stats(start, end)
    clients = await get_client_stats(start, end)
    tasks = await get_task_stats(start, end)
    
    # Get company name from settings
    settings = await db.settings.find_one({"key": "invoice_settings"})
    company_name = settings.get("value", {}).get("company_name", "Alpha Agency") if settings else "Alpha Agency"
    
    # Generate PDF
    pdf_buffer = create_pdf_report(
        company_name=company_name,
        period_label=period_label,
        revenue=revenue,
        leads=leads,
        clients=clients,
        tasks=tasks
    )
    
    # Log generation
    await db.report_generations.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": get_user_id(current_user),
        "type": "analytics_pdf",
        "period": period,
        "start_date": start,
        "end_date": end,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    filename = f"rapport_analytics_{period}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/analytics-json")
async def get_analytics_json(
    period: str = Query("month"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get analytics data as JSON"""
    
    start, end = get_period_dates(period, start_date, end_date)
    
    revenue = await get_revenue_stats(start, end)
    leads = await get_lead_stats(start, end)
    clients = await get_client_stats(start, end)
    tasks = await get_task_stats(start, end)
    
    return {
        "period": {
            "type": period,
            "start": start,
            "end": end
        },
        "revenue": revenue,
        "leads": leads,
        "clients": clients,
        "tasks": tasks,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

@router.get("/report-history")
async def get_report_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get history of generated reports"""
    reports = await db.report_generations.find(
        {"user_id": get_user_id(current_user)},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"reports": reports, "count": len(reports)}
