"""
Quotes routes - CRUD, PDF, Send, Convert to Invoice
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone, timedelta

from .database import db, get_current_user
from .invoices import generate_professional_pdf, get_next_invoice_number

router = APIRouter(prefix="/quotes", tags=["Quotes"])


# ==================== MODELS ====================

class QuoteItemCreate(BaseModel):
    title: Optional[str] = ""
    description: str
    quantity: int = 1
    unit_price: float
    discount: Optional[float] = 0
    discountType: Optional[str] = "%"

class QuoteCreate(BaseModel):
    contact_id: str
    opportunity_id: Optional[str] = None
    items: List[QuoteItemCreate]
    valid_until: Optional[str] = None
    notes: Optional[str] = None

class QuoteUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[QuoteItemCreate]] = None
    valid_until: Optional[str] = None


# ==================== HELPERS ====================

async def get_next_quote_number():
    counter = await db.counters.find_one_and_update(
        {"name": "quote_number"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True
    )
    return f"DEV-{datetime.now().year}-{str(counter['value']).zfill(4)}"


# ==================== ROUTES ====================

@router.post("", response_model=dict)
async def create_quote(quote: QuoteCreate, current_user: dict = Depends(get_current_user)):
    """Create a new quote"""
    quote_id = str(uuid.uuid4())
    quote_number = await get_next_quote_number()
    
    items_list = [item.model_dump() for item in quote.items]
    subtotal = sum(item.quantity * item.unit_price for item in quote.items)
    tva = subtotal * 0.085
    total = subtotal + tva
    
    quote_doc = {
        "id": quote_id,
        "quote_number": quote_number,
        "contact_id": quote.contact_id,
        "opportunity_id": quote.opportunity_id,
        "items": items_list,
        "subtotal": subtotal,
        "tva": tva,
        "total": total,
        "status": "brouillon",
        "valid_until": quote.valid_until or (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "notes": quote.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quotes.insert_one(quote_doc)
    return {"id": quote_id, "quote_number": quote_number, "message": "Devis créé"}


@router.get("", response_model=List[dict])
async def get_quotes(current_user: dict = Depends(get_current_user), status: Optional[str] = None):
    """Get all quotes"""
    query = {}
    if status:
        query["status"] = status
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotes


@router.get("/{quote_id}", response_model=dict)
async def get_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single quote"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return quote


@router.put("/{quote_id}", response_model=dict)
async def update_quote(quote_id: str, update: QuoteUpdate, current_user: dict = Depends(get_current_user)):
    """Update a quote"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "items" in update_data:
        update_data["items"] = [item.model_dump() if hasattr(item, 'model_dump') else item for item in update_data["items"]]
        # Recalculate totals
        subtotal = sum(item.get('quantity', 1) * item.get('unit_price', 0) for item in update_data["items"])
        tva = subtotal * 0.085
        update_data["subtotal"] = subtotal
        update_data["tva"] = tva
        update_data["total"] = subtotal + tva
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return {"message": "Devis mis à jour"}


@router.delete("/{quote_id}", response_model=dict)
async def delete_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a quote"""
    result = await db.quotes.delete_one({"id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return {"message": "Devis supprimé"}


@router.get("/{quote_id}/pdf")
async def download_quote_pdf(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Download quote as PDF"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    contact = await db.contacts.find_one({"id": quote['contact_id']}, {"_id": 0})
    if not contact:
        contact = {"first_name": "", "last_name": "", "email": "", "company": ""}
    
    pdf_buffer = generate_professional_pdf(quote, contact, "devis")
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=devis_{quote['quote_number']}.pdf"}
    )


@router.post("/{quote_id}/convert-to-invoice", response_model=dict)
async def convert_quote_to_invoice(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Convert quote to invoice"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    invoice_id = str(uuid.uuid4())
    invoice_number = await get_next_invoice_number()
    
    invoice_doc = {
        "id": invoice_id,
        "invoice_number": invoice_number,
        "quote_id": quote_id,
        "contact_id": quote['contact_id'],
        "items": quote['items'],
        "subtotal": quote['subtotal'],
        "tva": quote['tva'],
        "total": quote['total'],
        "status": "en_attente",
        "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "document_type": "facture",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice_doc)
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "accepté"}})
    
    return {"invoice_id": invoice_id, "invoice_number": invoice_number, "message": "Facture créée à partir du devis"}
