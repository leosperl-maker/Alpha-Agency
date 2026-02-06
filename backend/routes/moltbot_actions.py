"""
MoltBot CRM Actions - Toutes les actions que MoltBot peut effectuer sur le CRM
"""
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


async def create_contact(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Créer un nouveau contact"""
    contact_data = {
        "id": str(uuid.uuid4()),
        "first_name": params.get("first_name", ""),
        "last_name": params.get("last_name", ""),
        "company": params.get("company", ""),
        "email": params.get("email", ""),
        "phone": params.get("phone", ""),
        "siret": params.get("siret", ""),
        "status": params.get("status", "lead"),
        "source": "whatsapp_moltbot",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.contacts.insert_one(contact_data)
    logger.info(f"Contact créé: {contact_data['first_name']} {contact_data['last_name']}")
    return {"success": True, "contact_id": contact_data["id"], "text": f"✅ Contact créé: {contact_data['first_name']} {contact_data['last_name']}"}


async def update_contact(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Modifier un contact existant"""
    search = params.get("search", "")
    contact = await db.contacts.find_one({
        "$or": [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    })
    
    if not contact:
        return {"success": False, "text": f"❌ Contact non trouvé: {search}"}
    
    update_fields = {}
    for key in ["first_name", "last_name", "company", "email", "phone", "siret", "status"]:
        if key in params and params[key]:
            update_fields[key] = params[key]
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc)
        await db.contacts.update_one({"id": contact["id"]}, {"$set": update_fields})
        return {"success": True, "text": f"✅ Contact mis à jour: {contact.get('first_name', '')} {contact.get('last_name', '')}"}
    
    return {"success": False, "text": "⚠️ Aucune modification spécifiée"}


async def create_task(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Créer une nouvelle tâche"""
    task_data = {
        "id": str(uuid.uuid4()),
        "title": params.get("title", "Nouvelle tâche"),
        "description": params.get("description", ""),
        "status": params.get("status", "todo"),
        "priority": params.get("priority", "medium"),
        "category": params.get("category", "general"),
        "due_date": params.get("due_date"),
        "assigned_to": params.get("assigned_to"),
        "contact_id": params.get("contact_id"),
        "source": "whatsapp_moltbot",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.tasks.insert_one(task_data)
    logger.info(f"Tâche créée: {task_data['title']}")
    return {"success": True, "task_id": task_data["id"], "text": f"✅ Tâche créée: {task_data['title']} (Priorité: {task_data['priority']})"}


async def update_task(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Modifier une tâche existante"""
    search = params.get("search", "")
    task = await db.tasks.find_one({
        "$or": [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    })
    
    if not task:
        return {"success": False, "text": f"❌ Tâche non trouvée: {search}"}
    
    update_fields = {}
    for key in ["title", "description", "status", "priority", "category", "due_date"]:
        if key in params and params[key]:
            update_fields[key] = params[key]
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc)
        await db.tasks.update_one({"id": task["id"]}, {"$set": update_fields})
        return {"success": True, "text": f"✅ Tâche mise à jour: {task.get('title', '')}"}
    
    return {"success": False, "text": "⚠️ Aucune modification spécifiée"}


async def create_appointment(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Créer un nouveau rendez-vous"""
    # Parser la date
    date_str = params.get("date", "")
    time_str = params.get("time", "09:00")
    
    try:
        if date_str:
            # Essayer différents formats
            for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
                try:
                    date_obj = datetime.strptime(date_str, fmt)
                    break
                except:
                    continue
            else:
                date_obj = datetime.now() + timedelta(days=1)
        else:
            date_obj = datetime.now() + timedelta(days=1)
        
        # Ajouter l'heure
        hour, minute = map(int, time_str.split(":"))
        date_obj = date_obj.replace(hour=hour, minute=minute)
    except:
        date_obj = datetime.now() + timedelta(days=1, hours=9)
    
    appointment_data = {
        "id": str(uuid.uuid4()),
        "title": params.get("title", "Rendez-vous"),
        "description": params.get("description", ""),
        "start_time": date_obj.isoformat(),
        "end_time": (date_obj + timedelta(hours=1)).isoformat(),
        "contact_id": params.get("contact_id"),
        "contact_name": params.get("contact_name", ""),
        "location": params.get("location", ""),
        "type": params.get("type", "meeting"),
        "status": "scheduled",
        "source": "whatsapp_moltbot",
        "created_at": datetime.now(timezone.utc)
    }
    await db.appointments.insert_one(appointment_data)
    logger.info(f"RDV créé: {appointment_data['title']} le {date_obj.strftime('%d/%m/%Y à %H:%M')}")
    return {"success": True, "appointment_id": appointment_data["id"], "text": f"✅ RDV créé: {appointment_data['title']} le {date_obj.strftime('%d/%m/%Y à %H:%M')}"}


async def list_appointments(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Lister les rendez-vous"""
    limit = params.get("limit", 5)
    upcoming_only = params.get("upcoming", True)
    
    query = {}
    if upcoming_only:
        query["start_time"] = {"$gte": datetime.now(timezone.utc).isoformat()}
    
    appointments = await db.appointments.find(query).sort("start_time", 1).limit(limit).to_list(limit)
    
    if not appointments:
        return {"success": True, "text": "📅 Aucun rendez-vous à venir"}
    
    rdv_list = []
    for rdv in appointments:
        try:
            dt = datetime.fromisoformat(rdv.get("start_time", ""))
            date_str = dt.strftime("%d/%m/%Y à %H:%M")
        except:
            date_str = rdv.get("start_time", "?")
        rdv_list.append(f"- {rdv.get('title', '?')} : {date_str}")
    
    return {"success": True, "text": f"📅 Prochains rendez-vous:\n" + "\n".join(rdv_list)}


async def create_opportunity(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Créer une nouvelle affaire/opportunité dans le pipeline"""
    # Trouver la colonne par défaut
    default_column = await db.pipeline_columns.find_one({"order": 0}) or await db.pipeline_columns.find_one({})
    column_id = params.get("column_id") or (default_column.get("id") if default_column else None)
    
    opportunity_data = {
        "id": str(uuid.uuid4()),
        "title": params.get("title", "Nouvelle affaire"),
        "description": params.get("description", ""),
        "amount": float(params.get("amount", 0)),
        "probability": int(params.get("probability", 50)),
        "contact_id": params.get("contact_id"),
        "contact_name": params.get("contact_name", ""),
        "column_id": column_id,
        "status": params.get("status", "open"),
        "expected_close_date": params.get("close_date"),
        "source": "whatsapp_moltbot",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.opportunities.insert_one(opportunity_data)
    logger.info(f"Affaire créée: {opportunity_data['title']} - {opportunity_data['amount']}€")
    return {"success": True, "opportunity_id": opportunity_data["id"], "text": f"✅ Affaire créée: {opportunity_data['title']} - {opportunity_data['amount']}€ (Probabilité: {opportunity_data['probability']}%)"}


async def update_opportunity(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Modifier une affaire/opportunité"""
    search = params.get("search", "")
    opp = await db.opportunities.find_one({
        "$or": [
            {"title": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}}
        ]
    })
    
    if not opp:
        return {"success": False, "text": f"❌ Affaire non trouvée: {search}"}
    
    update_fields = {}
    for key in ["title", "description", "amount", "probability", "status", "column_id"]:
        if key in params and params[key] is not None:
            if key == "amount":
                update_fields[key] = float(params[key])
            elif key == "probability":
                update_fields[key] = int(params[key])
            else:
                update_fields[key] = params[key]
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc)
        await db.opportunities.update_one({"id": opp["id"]}, {"$set": update_fields})
        return {"success": True, "text": f"✅ Affaire mise à jour: {opp.get('title', '')}"}
    
    return {"success": False, "text": "⚠️ Aucune modification spécifiée"}


async def list_opportunities(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Lister les affaires du pipeline"""
    limit = params.get("limit", 5)
    status = params.get("status")
    
    query = {}
    if status:
        query["status"] = status
    
    opportunities = await db.opportunities.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    if not opportunities:
        return {"success": True, "text": "💼 Aucune affaire dans le pipeline"}
    
    opp_list = []
    for opp in opportunities:
        opp_list.append(f"- {opp.get('title', '?')}: {opp.get('amount', 0)}€ ({opp.get('probability', 0)}%)")
    
    return {"success": True, "text": f"💼 Affaires en cours:\n" + "\n".join(opp_list)}


async def create_blog_post(db: AsyncIOMotorDatabase, params: Dict[str, Any], generate_image_func=None) -> Dict[str, Any]:
    """Créer un article de blog"""
    
    # Générer l'image de couverture si demandé
    cover_image = params.get("cover_image")
    if not cover_image and generate_image_func and params.get("generate_cover", True):
        title = params.get("title", "Article de blog")
        cover_prompt = f"Professional blog header image for article about: {title}. Modern, clean, corporate style."
        cover_image = await generate_image_func(cover_prompt)
    
    # Construire les blocs de contenu
    content_blocks = []
    
    # Intro
    if params.get("intro"):
        content_blocks.append({
            "id": str(uuid.uuid4()),
            "type": "paragraph",
            "content": params.get("intro")
        })
    
    # Sections avec sous-titres
    sections = params.get("sections", [])
    for section in sections:
        if isinstance(section, dict):
            # Sous-titre
            content_blocks.append({
                "id": str(uuid.uuid4()),
                "type": "heading",
                "level": 2,
                "content": section.get("title", "")
            })
            # Contenu
            content_blocks.append({
                "id": str(uuid.uuid4()),
                "type": "paragraph",
                "content": section.get("content", "")
            })
    
    # Si pas de sections structurées, utiliser le contenu brut
    if not content_blocks and params.get("content"):
        content_blocks.append({
            "id": str(uuid.uuid4()),
            "type": "paragraph",
            "content": params.get("content")
        })
    
    post_data = {
        "id": str(uuid.uuid4()),
        "title": params.get("title", "Nouvel article"),
        "slug": params.get("slug") or params.get("title", "article").lower().replace(" ", "-"),
        "excerpt": params.get("excerpt", ""),
        "content": params.get("content", ""),
        "content_blocks": content_blocks,
        "cover_image": cover_image,
        "category": params.get("category", "general"),
        "tags": params.get("tags", []),
        "status": params.get("status", "draft"),
        "author": params.get("author", "MoltBot"),
        "seo_title": params.get("seo_title") or params.get("title"),
        "seo_description": params.get("seo_description") or params.get("excerpt"),
        "source": "whatsapp_moltbot",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.blog_posts.insert_one(post_data)
    logger.info(f"Article créé: {post_data['title']}")
    
    status_text = "brouillon" if post_data["status"] == "draft" else "publié"
    return {
        "success": True, 
        "post_id": post_data["id"], 
        "text": f"✅ Article créé: {post_data['title']} (Statut: {status_text})",
        "cover_image": cover_image
    }


async def create_editorial_entry(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Ajouter une entrée au calendrier éditorial"""
    
    # Trouver ou créer le calendrier
    calendar_name = params.get("calendar", "Principal")
    calendar = await db.editorial_calendars.find_one({"name": {"$regex": calendar_name, "$options": "i"}})
    
    if not calendar:
        calendar = {
            "id": str(uuid.uuid4()),
            "name": calendar_name,
            "color": "#6366f1",
            "created_at": datetime.now(timezone.utc)
        }
        await db.editorial_calendars.insert_one(calendar)
    
    # Parser la date
    date_str = params.get("date", "")
    try:
        for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
            try:
                date_obj = datetime.strptime(date_str, fmt)
                break
            except:
                continue
        else:
            date_obj = datetime.now() + timedelta(days=7)
    except:
        date_obj = datetime.now() + timedelta(days=7)
    
    entry_data = {
        "id": str(uuid.uuid4()),
        "calendar_id": calendar.get("id"),
        "title": params.get("title", "Publication"),
        "description": params.get("description", ""),
        "date": date_obj.isoformat(),
        "platform": params.get("platform", "blog"),
        "status": params.get("status", "planned"),
        "content_type": params.get("content_type", "article"),
        "source": "whatsapp_moltbot",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.editorial_posts.insert_one(entry_data)
    logger.info(f"Entrée éditoriale créée: {entry_data['title']}")
    return {"success": True, "text": f"✅ Ajouté au calendrier: {entry_data['title']} le {date_obj.strftime('%d/%m/%Y')}"}


async def create_multilink(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Créer une page multilink"""
    
    page_data = {
        "id": str(uuid.uuid4()),
        "title": params.get("title", "Ma page"),
        "slug": params.get("slug") or params.get("title", "page").lower().replace(" ", "-"),
        "description": params.get("description", ""),
        "theme": params.get("theme", "default"),
        "contact_id": params.get("contact_id"),
        "is_active": True,
        "source": "whatsapp_moltbot",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.multilink_pages.insert_one(page_data)
    logger.info(f"Page multilink créée: {page_data['title']}")
    return {"success": True, "page_id": page_data["id"], "text": f"✅ Page multilink créée: {page_data['title']} (/{page_data['slug']})"}


async def get_analytics(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Obtenir les statistiques du CRM"""
    
    # Compter les éléments
    contacts_count = await db.contacts.count_documents({})
    invoices_count = await db.invoices.count_documents({})
    tasks_count = await db.tasks.count_documents({})
    tasks_todo = await db.tasks.count_documents({"status": "todo"})
    opportunities_count = await db.opportunities.count_documents({})
    
    # Calculer le CA
    pipeline = [
        {"$match": {"status": {"$in": ["payée", "paid", "validé"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    ca_result = await db.invoices.aggregate(pipeline).to_list(1)
    ca_total = ca_result[0]["total"] if ca_result else 0
    
    # Devis en attente
    devis_pending = await db.invoices.count_documents({
        "$or": [
            {"document_type": "devis", "status": {"$in": ["draft", "brouillon", "envoyé"]}},
            {"type": "devis", "status": {"$in": ["draft", "brouillon", "envoyé"]}}
        ]
    })
    
    stats_text = f"""📊 **Statistiques CRM**

👥 Contacts: {contacts_count}
📄 Factures: {invoices_count}
📝 Devis en attente: {devis_pending}
💰 CA total: {ca_total:,.2f}€
💼 Affaires: {opportunities_count}
✅ Tâches: {tasks_count} ({tasks_todo} à faire)"""
    
    return {"success": True, "text": stats_text}


async def create_user(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Créer un nouvel utilisateur"""
    import hashlib
    
    email = params.get("email", "")
    if not email:
        return {"success": False, "text": "❌ Email requis pour créer un utilisateur"}
    
    # Vérifier si l'utilisateur existe déjà
    existing = await db.users.find_one({"email": email})
    if existing:
        return {"success": False, "text": f"❌ Un utilisateur avec l'email {email} existe déjà"}
    
    # Hasher le mot de passe
    password = params.get("password", "ChangeMe123!")
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    user_data = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password": password_hash,
        "first_name": params.get("first_name", ""),
        "last_name": params.get("last_name", ""),
        "role": params.get("role", "user"),
        "is_active": True,
        "source": "whatsapp_moltbot",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_data)
    logger.info(f"Utilisateur créé: {user_data['email']}")
    return {"success": True, "text": f"✅ Utilisateur créé: {email} (Mot de passe temporaire: {password})"}


async def search_crm(db: AsyncIOMotorDatabase, params: Dict[str, Any]) -> Dict[str, Any]:
    """Recherche globale dans le CRM"""
    search_term = params.get("query", "")
    if not search_term:
        return {"success": False, "text": "❌ Terme de recherche requis"}
    
    results = []
    
    # Chercher dans les contacts
    contacts = await db.contacts.find({
        "$or": [
            {"first_name": {"$regex": search_term, "$options": "i"}},
            {"last_name": {"$regex": search_term, "$options": "i"}},
            {"company": {"$regex": search_term, "$options": "i"}},
            {"email": {"$regex": search_term, "$options": "i"}}
        ]
    }).limit(3).to_list(3)
    for c in contacts:
        results.append(f"👤 Contact: {c.get('first_name', '')} {c.get('last_name', '')} ({c.get('company', '')})")
    
    # Chercher dans les factures/devis
    invoices = await db.invoices.find({
        "$or": [
            {"client_name": {"$regex": search_term, "$options": "i"}},
            {"invoice_number": {"$regex": search_term, "$options": "i"}}
        ]
    }).limit(3).to_list(3)
    for i in invoices:
        doc_type = "Devis" if i.get("document_type") == "devis" or i.get("type") == "devis" else "Facture"
        results.append(f"📄 {doc_type}: {i.get('invoice_number', '?')} - {i.get('client_name', '?')} ({i.get('total', 0)}€)")
    
    # Chercher dans les tâches
    tasks = await db.tasks.find({
        "$or": [
            {"title": {"$regex": search_term, "$options": "i"}},
            {"description": {"$regex": search_term, "$options": "i"}}
        ]
    }).limit(3).to_list(3)
    for t in tasks:
        results.append(f"✅ Tâche: {t.get('title', '?')} ({t.get('status', '?')})")
    
    if not results:
        return {"success": True, "text": f"🔍 Aucun résultat pour '{search_term}'"}
    
    return {"success": True, "text": f"🔍 Résultats pour '{search_term}':\n" + "\n".join(results)}


# Mapping des actions
ACTION_HANDLERS = {
    "CREATE_CONTACT": create_contact,
    "UPDATE_CONTACT": update_contact,
    "CREATE_TASK": create_task,
    "UPDATE_TASK": update_task,
    "CREATE_APPOINTMENT": create_appointment,
    "LIST_APPOINTMENTS": list_appointments,
    "CREATE_OPPORTUNITY": create_opportunity,
    "UPDATE_OPPORTUNITY": update_opportunity,
    "LIST_OPPORTUNITIES": list_opportunities,
    "CREATE_BLOG_POST": create_blog_post,
    "CREATE_EDITORIAL": create_editorial_entry,
    "CREATE_MULTILINK": create_multilink,
    "GET_ANALYTICS": get_analytics,
    "CREATE_USER": create_user,
    "SEARCH_CRM": search_crm,
}
