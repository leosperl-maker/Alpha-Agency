"""
Contacts routes - CRUD, Import, History
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone
import csv
import io

from .database import db, get_current_user

router = APIRouter(prefix="/contacts", tags=["Contacts"])


# ==================== MODELS ====================

class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "Guadeloupe"
    notes: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = []

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    score: Optional[str] = None
    tags: Optional[List[str]] = None


# ==================== ROUTES ====================

@router.post("", response_model=dict)
async def create_contact(contact: ContactCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Create a new contact"""
    contact_id = str(uuid.uuid4())
    contact_doc = {
        "id": contact_id,
        **contact.model_dump(),
        "status": "nouveau",
        "score": "tiède",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact_doc)
    return {"id": contact_id, "message": "Contact créé avec succès"}


@router.get("", response_model=List[dict])
async def get_contacts(current_user: dict = Depends(get_current_user), status: Optional[str] = None, score: Optional[str] = None):
    """Get all contacts with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if score:
        query["score"] = score
    contacts = await db.contacts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return contacts


@router.get("/{contact_id}", response_model=dict)
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single contact by ID"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    return contact


@router.put("/{contact_id}", response_model=dict)
async def update_contact(contact_id: str, update: ContactUpdate, current_user: dict = Depends(get_current_user)):
    """Update a contact"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    return {"message": "Contact mis à jour"}


@router.delete("/{contact_id}", response_model=dict)
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a contact"""
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    return {"message": "Contact supprimé"}


@router.get("/{contact_id}/history", response_model=dict)
async def get_contact_history(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Get all quotes, invoices and tasks associated with a contact"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    
    # Get quotes for this contact
    quotes = await db.quotes.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get invoices for this contact
    invoices = await db.invoices.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get tasks for this contact
    tasks = await db.tasks.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get opportunities for this contact
    opportunities = await db.opportunities.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Calculate totals
    total_quoted = sum(q.get("total", 0) for q in quotes)
    total_invoiced = sum(i.get("total", 0) for i in invoices)
    total_paid = sum(i.get("paid_amount", 0) for i in invoices)
    
    return {
        "contact": contact,
        "quotes": quotes,
        "invoices": invoices,
        "tasks": tasks,
        "opportunities": opportunities,
        "stats": {
            "total_quotes": len(quotes),
            "total_invoices": len(invoices),
            "total_quoted": total_quoted,
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "total_pending": total_invoiced - total_paid
        }
    }


class ImportParseRequest(BaseModel):
    csv_content: str

@router.post("/import/parse", response_model=dict)
async def parse_import_csv(request: ImportParseRequest, current_user: dict = Depends(get_current_user)):
    """Parse CSV content and return preview of contacts to import"""
    try:
        reader = csv.DictReader(io.StringIO(request.csv_content))
        rows = list(reader)
        
        if not rows:
            raise HTTPException(status_code=400, detail="Fichier CSV vide")
        
        # Detect columns
        columns = list(rows[0].keys())
        
        # Map common column names
        column_mapping = {
            'nom': 'last_name',
            'prénom': 'first_name', 
            'prenom': 'first_name',
            'email': 'email',
            'mail': 'email',
            'téléphone': 'phone',
            'telephone': 'phone',
            'phone': 'phone',
            'mobile': 'phone',
            'entreprise': 'company',
            'société': 'company',
            'societe': 'company',
            'company': 'company',
            'poste': 'position',
            'fonction': 'position',
            'position': 'position',
            'adresse': 'address',
            'address': 'address',
            'ville': 'city',
            'city': 'city',
            'code postal': 'postal_code',
            'cp': 'postal_code',
            'postal_code': 'postal_code',
            'pays': 'country',
            'country': 'country',
            'notes': 'notes',
            'commentaire': 'notes',
            'source': 'source',
            'origine': 'source'
        }
        
        # Auto-detect mapping
        detected_mapping = {}
        for col in columns:
            col_lower = col.lower().strip()
            if col_lower in column_mapping:
                detected_mapping[col] = column_mapping[col_lower]
        
        # Preview first 5 rows
        preview = []
        for row in rows[:5]:
            mapped_row = {}
            for orig_col, target_col in detected_mapping.items():
                if orig_col in row:
                    mapped_row[target_col] = row[orig_col]
            preview.append(mapped_row)
        
        return {
            "total_rows": len(rows),
            "columns": columns,
            "detected_mapping": detected_mapping,
            "preview": preview
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors du parsing: {str(e)}")


class ImportExecuteRequest(BaseModel):
    csv_content: str
    column_mapping: dict
    skip_duplicates: bool = True

@router.post("/import/execute", response_model=dict)
async def execute_import(request: ImportExecuteRequest, current_user: dict = Depends(get_current_user)):
    """Execute the contact import with the provided mapping"""
    try:
        reader = csv.DictReader(io.StringIO(request.csv_content))
        rows = list(reader)
        
        imported = 0
        skipped = 0
        errors = []
        
        for i, row in enumerate(rows):
            try:
                # Map columns
                contact_data = {}
                for orig_col, target_col in request.column_mapping.items():
                    if orig_col in row and row[orig_col]:
                        contact_data[target_col] = row[orig_col].strip()
                
                # Check required fields
                if not contact_data.get('first_name') and not contact_data.get('last_name'):
                    errors.append(f"Ligne {i+2}: Nom ou prénom requis")
                    continue
                
                # Check for duplicates by email
                if request.skip_duplicates and contact_data.get('email'):
                    existing = await db.contacts.find_one({"email": contact_data['email']}, {"_id": 0})
                    if existing:
                        skipped += 1
                        continue
                
                # Create contact
                contact_id = str(uuid.uuid4())
                contact_doc = {
                    "id": contact_id,
                    "first_name": contact_data.get('first_name', ''),
                    "last_name": contact_data.get('last_name', ''),
                    "email": contact_data.get('email'),
                    "phone": contact_data.get('phone'),
                    "company": contact_data.get('company'),
                    "position": contact_data.get('position'),
                    "address": contact_data.get('address'),
                    "city": contact_data.get('city'),
                    "postal_code": contact_data.get('postal_code'),
                    "country": contact_data.get('country', 'Guadeloupe'),
                    "notes": contact_data.get('notes'),
                    "source": contact_data.get('source', 'Import CSV'),
                    "status": "nouveau",
                    "score": "tiède",
                    "tags": [],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.contacts.insert_one(contact_doc)
                imported += 1
                
            except Exception as e:
                errors.append(f"Ligne {i+2}: {str(e)}")
        
        return {
            "imported": imported,
            "skipped": skipped,
            "errors": errors[:10],  # Limit errors shown
            "total_errors": len(errors)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'import: {str(e)}")
