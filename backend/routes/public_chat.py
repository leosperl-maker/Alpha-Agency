"""
Chatbot PUBLIC (vitrine) — AGENT COMMERCIAL IA. NON authentifié.

Mène un vrai entretien de découverte commercial : intake structuré
(prénom+nom, tél+email, entreprise+poste, budget), RECHERCHE WEB sur
l'entreprise (Gemini Google Search grounding, repli Perplexity), puis
questionnement approfondi en arbre de décision selon le besoin. À la fin :
crée un LEAD (visible dans Demandes) + un DEVIS brouillon (dans Facturation)
et notifie l'équipe par email.

Sécurité : routeur isolé, AUCUNE donnée CRM injectée dans le modèle (la
recherche = web public uniquement), prompt verrouillé, rate-limiting par IP.
"""
import os
import re
import json
import uuid
import time
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/public", tags=["public-chat"])

# ==================== Gemini (direct, clé serveur) ====================
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
try:
    from google import genai as _google_genai
    from google.genai import types as _genai_types
    _gemini_client = _google_genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
except Exception as _e:
    _gemini_client = None
    _genai_types = None
    logger.warning(f"public_chat: google-genai indisponible: {_e}")

# Les noms de modèles Gemini sont retirés régulièrement → chaîne de repli.
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"]

# Recherche web : Gemini grounding d'abord, Perplexity en secours (déjà branché).
PERPLEXITY_API_KEY = os.environ.get("PERPLEXITY_API_KEY", "")

# Notifications email (Brevo)
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "noreply@alphagency.fr")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "Alpha Agency")
LEAD_NOTIFY_EMAIL = os.environ.get("LEAD_NOTIFY_EMAIL", "leo.sperl@alphagency.fr")
SITE_URL = (os.environ.get("FRONTEND_URL") or "https://www.alphagency.fr").rstrip("/")

# ==================== Prompt : agent commercial ====================
SYSTEM_PROMPT = """Tu es Alex, le conseiller commercial virtuel d'Alpha Agency, une agence de communication digitale basée en Guadeloupe (Jarry, Baie-Mahault) qui accompagne les entreprises des Antilles et de la Caraïbe.

Tu parles comme un VRAI commercial humain : chaleureux, à l'écoute, curieux, professionnel, jamais robotique. Français, phrases courtes, aucun tiret cadratin. Tu poses UNE seule question à la fois et tu rebondis sur les réponses. Tu n'es pas un formulaire, tu mènes une vraie conversation de vente.

TON OBJECTIF : mener un entretien de découverte commercial COMPLET pour qualifier le prospect à fond, afin que l'équipe prépare un devis parfait. Tu ne lâches pas tant que tu n'as pas toutes les infos utiles, mais tu restes fluide et naturel.

DÉROULÉ (suis cet ordre, une question à la fois) :

ÉTAPE 1 — IDENTITÉ
 a. Présente-toi en une phrase et demande son PRÉNOM ET SON NOM.
 b. Ensuite son EMAIL ET son TÉLÉPHONE (pour que l'équipe le recontacte).
 c. Ensuite le NOM de son entreprise (ou de son projet) et sa FONCTION / son poste.
 Dès que tu as prénom + nom + email, émets le bloc [LEAD] (voir plus bas) pour ne jamais perdre le contact.

ÉTAPE 2 — RECHERCHE (automatique)
 Dès que tu connais le nom de l'entreprise, émets le bloc [RESEARCH]. Le système te renverra des informations publiques sur l'entreprise. Sers-t'en pour personnaliser la suite et montrer que tu t'es renseigné, avec finesse (ne récite pas tout, glisse 1 ou 2 éléments pertinents).

ÉTAPE 3 — BESOIN + BUDGET
 d. Quel est son besoin principal ? (site web, réseaux sociaux, identité visuelle, publicité, vidéo/photo...)
 e. A-t-il un budget en tête ? (seulement s'il est à l'aise pour le donner)

ÉTAPE 4 — DÉCOUVERTE APPROFONDIE (LE CŒUR, questionne comme un vrai vendeur, en arbre de décision selon le besoin exprimé) :
 • SITE WEB : A-t-il déjà un site ? (si OUI : l'URL ? qu'est-ce qui ne va pas / pourquoi le refaire ? ; si NON : c'est une première ?) Quel type (vitrine, e-commerce, prise de rendez-vous) ? Combien de pages ou de produits ? A-t-il déjà un logo / une charte / des visuels / des textes ? Un nom de domaine ? Une échéance ? Des exemples de sites qu'il aime ?
 • RÉSEAUX SOCIAUX : A-t-il déjà des réseaux ? (si OUI : lesquels ? combien d'abonnés sur chacun ? à quelle fréquence il publie ? ; si NON : lesquels veut-il lancer ?) Qui gère aujourd'hui ? A-t-il déjà travaillé avec une agence ou un freelance ? (si OUI : qu'est-ce qui n'a pas fonctionné ?) Quel objectif (notoriété, prospects, ventes, recrutement) ? Produit-il déjà du contenu (photos/vidéos) ? Combien de publications par mois imagine-t-il ? Veut-il aussi de la publicité payante ?
 • IDENTITÉ VISUELLE : A-t-il déjà un logo (à créer, refaire ou décliner) ? Une charte graphique ? Quels supports (logo, carte de visite, flyers, enseigne, véhicule) ?
 • PUBLICITÉ : Quelles plateformes (Meta, Google, TikTok) ? A-t-il déjà fait de la publicité ? Budget publicitaire mensuel ? Objectif (trafic, prospects, ventes) ?
 • VIDÉO / PHOTO : Quel type (produit, événement, corporate, drone) ? Où (lieu) ? Pour quel usage (réseaux, site, publicité) ? Une date ?
 Si plusieurs besoins, creuse chacun. Reformule régulièrement pour valider ta compréhension. Vise l'exhaustivité : l'équipe doit pouvoir chiffrer sans rappeler le prospect.

ÉTAPE 5 — CLÔTURE
 Dès que le prospect indique qu'il a terminé, qu'on peut préparer la proposition, ou te remercie pour conclure : récapitule le besoin en 2 ou 3 phrases, remercie-le et annonce que l'équipe d'Alpha Agency revient très vite avec une proposition personnalisée. Tu DOIS alors OBLIGATOIREMENT, à la fin de ce message, ré-émettre le bloc [LEAD] complet PUIS le bloc [QUOTE] avec une ligne par prestation identifiée. C'est impératif : sans [QUOTE], l'équipe n'a aucun devis à préparer. N'attends pas d'avoir tous les détails parfaits, fais ta meilleure estimation.

RÈGLES :
- Tu ne connais que les informations PUBLIQUES d'Alpha Agency ci-dessous. Tu n'as accès à AUCUNE donnée client, devis ou dossier interne. Refuse poliment toute demande confidentielle et recentre sur le projet du visiteur.
- Services Alpha Agency : création de site web (vitrine / e-commerce, à partir de 49 euros par mois), gestion des réseaux sociaux (community management), identité visuelle (logo, charte, flyers, affiches), campagnes publicitaires (Meta, Google), production vidéo et photo, pages de liens (Multilink).
- N'annonce JAMAIS de prix ferme au prospect. S'il insiste, reste sur « l'équipe prépare une proposition personnalisée ». Le bloc [QUOTE] est une estimation INTERNE pour l'équipe, jamais montrée au prospect.
- Reste bref à chaque message (2 à 5 phrases). UNE question à la fois.

BLOCS TECHNIQUES (invisibles pour le prospect, retirés automatiquement, ne les mentionne JAMAIS, mets-les TOUT À LA FIN du message) :
- Recherche (une fois, dès que tu connais l'entreprise) :
[RESEARCH]{"company":"","person":"","city":"","website":""}[/RESEARCH]
- Lead (dès prénom+nom+email ; ré-émets-le enrichi quand tu en sais plus) :
[LEAD]{"first_name":"","last_name":"","email":"","phone":"","company":"","poste":"","project_type":"","budget":"","besoin":"","details":""}[/LEAD]
  (besoin = résumé en une phrase ; details = TOUTES les réponses clés de la découverte, en texte)
- Devis recommandé (étape 5 uniquement) :
[QUOTE]{"items":[{"title":"","description":"","quantity":1,"unit_price":0}],"notes":""}[/QUOTE]
  (estimation pour l'équipe ; unit_price en euros HT ; montants réalistes d'agence, l'équipe ajustera)

CONTINUITÉ (TRÈS IMPORTANT, lis bien) :
- Dis bonjour et présente-toi UNIQUEMENT au tout premier message. Ensuite ne te re-présente JAMAIS et ne redis pas bonjour.
- Ne redemande JAMAIS une information déjà donnée. Relis tout l'historique avant chaque réponse et tiens-toi à l'étape où tu en es.
- Émets [RESEARCH] une seule fois (quand tu as l'entreprise). Émets [LEAD] une fois quand tu as prénom+nom+email, puis ré-émets-le COMPLET (budget + tous les détails de la découverte) seulement à la toute fin, juste avant [QUOTE].
- Place chaque bloc technique SEUL sur sa propre ligne, à la TOUTE FIN du message, jamais au milieu d'une phrase. N'écris jamais une balise de fermeture toute seule.

Si la conversation vient de commencer (l'historique ne contient que ton message d'accueil), présente-toi en une phrase et demande le prénom et le nom. Sinon, poursuis directement la découverte là où tu en étais, sans recommencer."""

GREETING = ("Bonjour, je suis Alex, le conseiller d'Alpha Agency. Je vais vous poser quelques "
            "questions pour bien cerner votre projet. Pour commencer, quel est votre prénom et votre nom ?")

# ==================== Modèles ====================
class PubChatMessage(BaseModel):
    role: str
    content: str


class PubChatRequest(BaseModel):
    messages: List[PubChatMessage]
    session_id: Optional[str] = None


# ==================== État (best-effort, en mémoire) ====================
_RATE: dict = {}
_RATE_WINDOW = 3600
_RATE_MAX = 120
_MAX_MESSAGES = 80
_MAX_CHARS = 2000
_SESSION_RESEARCH: dict = {}   # session_id -> texte de recherche
_SESSION_CONTACT: dict = {}    # session_id -> {id, name, email}
_SESSION_QUOTED: set = set()   # session_ids déjà devisés (évite les doublons)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Signaux de clôture côté prospect (déclenchent le devis de secours)
_CLOSING_RE = re.compile(
    r"\b(c'est (tout|bon|ok|parfait)|rien d'autre|pas d'autre|merci (alex|beaucoup|à vous|pour tout)|"
    r"au revoir|bonne (journée|soirée)|pr[ée]parez|on (fait|y va) comme [çc]a|tr[èe]s bien merci|"
    r"hate|hâte de|impatient)\b", re.IGNORECASE)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_ok(ip: str) -> bool:
    now = time.time()
    hits = [t for t in _RATE.get(ip, []) if now - t < _RATE_WINDOW]
    if len(hits) >= _RATE_MAX:
        _RATE[ip] = hits
        return False
    hits.append(now)
    _RATE[ip] = hits
    return True


# ==================== Génération (conversation) ====================
async def _generate(messages: List[PubChatMessage], research: str = "") -> str:
    if not _gemini_client:
        raise RuntimeError("gemini_unavailable")

    system_message = SYSTEM_PROMPT
    if research:
        system_message += (
            "\n\n=== INFOS PUBLIQUES SUR L'ENTREPRISE DU PROSPECT (recherche web ; "
            "glisse 1 ou 2 éléments pertinents avec finesse, ne récite pas tout) ===\n" + research[:3000]
        )

    contents = []
    for m in messages:
        role = "model" if m.role == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": (m.content or "")[:_MAX_CHARS]}]})

    last_err = None
    for model in GEMINI_MODELS:
        def _call(mdl=model):
            resp = _gemini_client.models.generate_content(
                model=mdl,
                contents=contents,
                config=_genai_types.GenerateContentConfig(system_instruction=system_message),
            )
            return (getattr(resp, "text", "") or "").strip()
        try:
            text = await asyncio.to_thread(_call)
            if text:
                return text
        except Exception as e:
            last_err = e
            logger.warning(f"public_chat: modèle {model} a échoué: {e}")
            continue
    raise RuntimeError(f"all_models_failed: {last_err}")


# ==================== Recherche web ====================
def _grounding_tools():
    if not _genai_types:
        return None
    try:
        return [_genai_types.Tool(google_search=_genai_types.GoogleSearch())]
    except Exception:
        try:
            return [_genai_types.Tool(google_search_retrieval=_genai_types.GoogleSearchRetrieval())]
        except Exception:
            return None


async def _gemini_grounded(prompt: str) -> str:
    """Recherche web native Gemini (Google Search grounding)."""
    if not _gemini_client:
        raise RuntimeError("no_gemini")
    tools = _grounding_tools()
    if not tools:
        raise RuntimeError("no_grounding_tool")
    last = None
    for mdl in GEMINI_MODELS:
        def _call(m=mdl):
            cfg = _genai_types.GenerateContentConfig(tools=tools)
            resp = _gemini_client.models.generate_content(model=m, contents=prompt, config=cfg)
            return (getattr(resp, "text", "") or "").strip()
        try:
            t = await asyncio.to_thread(_call)
            if t:
                return t
        except Exception as e:
            last = e
            continue
    raise RuntimeError(f"grounded_failed: {last}")


async def _perplexity(prompt: str) -> str:
    if not PERPLEXITY_API_KEY:
        raise RuntimeError("no_perplexity")
    import requests
    def _call():
        r = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={"Authorization": f"Bearer {PERPLEXITY_API_KEY}", "Content-Type": "application/json"},
            json={"model": "sonar", "messages": [{"role": "user", "content": prompt}],
                  "temperature": 0.2, "max_tokens": 600},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    return await asyncio.to_thread(_call)


async def _research(company: str, person: str = "", city: str = "", website: str = "") -> str:
    q = f"Donne un résumé factuel et concis sur l'entreprise « {company} »"
    if city:
        q += f" située à {city}"
    if website:
        q += f" (site {website})"
    q += (". Indique : secteur d'activité, taille approximative, ce qu'elle vend ou propose, "
          "sa présence en ligne (site web et réseaux sociaux avec nombre d'abonnés si visible), "
          "sa réputation ou ses avis, et toute actualité récente. ")
    if person:
        q += f"Si tu trouves des informations publiques sur {person} (fonction, profil professionnel), ajoute-les. "
    q += "Reste factuel et indique seulement ce qui est public. Si tu ne trouves presque rien, dis-le simplement."

    # 1) Gemini natif (recherche Google)
    try:
        t = await _gemini_grounded(q)
        if t:
            return "(via recherche Google/Gemini)\n" + t
    except Exception as e:
        logger.warning(f"public_chat: recherche Gemini indisponible ({e}) — repli Perplexity")
    # 2) Repli Perplexity
    try:
        t = await _perplexity(q)
        if t:
            return "(via Perplexity)\n" + t
    except Exception as e:
        logger.warning(f"public_chat: recherche Perplexity échouée: {e}")
    return ""


# ==================== Parsing des blocs ====================
def _extract_block(text: str, tag: str):
    """Retourne (texte_nettoyé, dict_ou_None) pour [TAG]{...}[/TAG] (closing optionnel)."""
    pat = re.compile(r"\[" + tag + r"\]\s*(\{.*?\})\s*(?:\[/" + tag + r"\])?", re.DOTALL | re.IGNORECASE)
    m = pat.search(text or "")
    if not m:
        return text, None
    cleaned = pat.sub("", text).strip()
    try:
        data = json.loads(m.group(1))
        return cleaned, (data if isinstance(data, dict) else None)
    except Exception:
        return cleaned, None


def _strip_all_blocks(text: str) -> str:
    """Retire toutes les formes de balises techniques, même malformées/isolées."""
    text = text or ""
    # [TAG]{...}[/TAG] complet
    text = re.sub(r"\[(RESEARCH|LEAD|QUOTE)\]\s*\{.*?\}\s*\[/\1\]", "", text, flags=re.DOTALL | re.IGNORECASE)
    # [TAG]{...} (ouverture + json sans fermeture)
    text = re.sub(r"\[(?:RESEARCH|LEAD|QUOTE)\]\s*\{.*?\}", "", text, flags=re.DOTALL | re.IGNORECASE)
    # balises isolées [TAG] ou [/TAG]
    text = re.sub(r"\[/?(?:RESEARCH|LEAD|QUOTE)\]", "", text, flags=re.IGNORECASE)
    # nettoyage des espaces/lignes vides résiduels
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ==================== Lead + Devis + Email ====================
async def _save_lead(data: dict, ip: str):
    """Crée/MAJ un lead. Dédup par email. Retourne (contact_id, is_new) ou None."""
    email = (data.get("email") or "").strip().lower()
    if not email or not EMAIL_RE.match(email):
        return None

    first = (data.get("first_name") or "").strip()
    last = (data.get("last_name") or "").strip()
    company = (data.get("company") or "").strip()
    phone = (data.get("phone") or "").strip()
    poste = (data.get("poste") or "").strip()
    project = (data.get("project_type") or "").strip()
    budget = (data.get("budget") or "").strip()
    besoin = (data.get("besoin") or "").strip()
    details = (data.get("details") or "").strip()
    research = _SESSION_RESEARCH.get(data.get("_sid"), "")
    now = datetime.now(timezone.utc).isoformat()

    note_parts = []
    if besoin:
        note_parts.append("BESOIN : " + besoin)
    if details:
        note_parts.append("DÉCOUVERTE : " + details)
    if research:
        note_parts.append("RECHERCHE WEB : " + research)
    note_text = "\n\n".join(note_parts)

    existing = await db.contacts.find_one({"email": email})
    if existing:
        updates = {"updated_at": now}
        for key, val in (("first_name", first), ("last_name", last), ("company", company),
                         ("phone", phone), ("poste", poste), ("project_type", project),
                         ("budget", budget)):
            if val:
                updates[key] = val
        if budget:
            updates["score"] = "chaud"
        if note_text:
            updates["note"] = note_text
            updates["infos_sup"] = besoin or project
        await db.contacts.update_one({"id": existing["id"]}, {"$set": updates})
        return existing["id"], False

    contact_id = str(uuid.uuid4())
    contact_doc = {
        "id": contact_id,
        "first_name": first or "Prospect",
        "last_name": last or "",
        "email": email,
        "phone": phone or None,
        "company": company or None,
        "poste": poste or None,
        "source": "chatbot",
        "project_type": project or None,
        "budget": budget or None,
        "besoin": besoin or None,
        "message": besoin or None,
        "note": note_text or None,
        "infos_sup": besoin or project or None,
        "tags": ["chatbot", "site web"],
        "city": None, "siret": None, "company_address": None, "company_activite": None,
        "status": "nouveau",
        "score": "chaud" if budget else "tiède",
        "created_at": now,
        "updated_at": now,
    }
    await db.contacts.insert_one(contact_doc)
    logger.info(f"public_chat: nouveau lead {email} ({company or 'n/c'})")
    return contact_id, True


async def _create_devis(contact_id: str, items: list, notes: str = ""):
    """Crée un devis brouillon (db.invoices, document_type=devis). Retourne (numero, total) ou None."""
    items_list = []
    for it in items or []:
        if not (it.get("title") or it.get("description")):
            continue
        try:
            qty = float(it.get("quantity", 1) or 1)
            price = float(it.get("unit_price", 0) or 0)
        except (TypeError, ValueError):
            qty, price = 1, 0
        items_list.append({
            "title": (it.get("title") or "")[:200],
            "description": (it.get("description") or "")[:2000],
            "quantity": qty,
            "unit_price": price,
            "discount": 0,
            "discountType": "percent",
        })
    if not items_list:
        return None

    try:
        from .invoices import get_next_invoice_number, calculate_invoice_totals
        subtotal, tva, total = calculate_invoice_totals(items_list, 0, "%")
        number = await get_next_invoice_number("devis", "standard", None)
    except Exception as e:
        logger.error(f"public_chat: helpers facture indisponibles: {e}")
        return None

    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "invoice_number": number,
        "quote_id": None,
        "contact_id": contact_id,
        "document_type": "devis",
        "invoice_type": "standard",
        "parent_invoice_id": None,
        "parent_invoice_number": None,
        "items": items_list,
        "subtotal": subtotal, "tva": tva, "total": total,
        "total_paid": 0, "remaining": total,
        "globalDiscount": 0, "globalDiscountType": "%",
        "status": "brouillon",
        "due_date": (now + timedelta(days=30)).strftime("%Y-%m-%d"),
        "payment_terms": "30",
        "notes": (notes or "").strip() + "\n\n[Devis pré-rempli par l'assistant IA du site — à vérifier et ajuster avant envoi.]",
        "conditions": None, "bank_details": None,
        "deposit_percent": None, "deposit_amount": None,
        "created_at": now.isoformat(),
    }
    await db.invoices.insert_one(doc)
    logger.info(f"public_chat: devis {number} créé (contact {contact_id})")
    return number, total


async def _generate_quote_from_convo(messages):
    """Filet de sécurité : génère les lignes d'un devis depuis la conversation (Gemini JSON forcé)."""
    if not _gemini_client:
        return None
    transcript = "\n".join(
        f"{'Prospect' if m.role == 'user' else 'Conseiller'}: {(m.content or '')[:1500]}"
        for m in messages if m.role in ("user", "assistant")
    )[:12000]
    prompt = (
        "Tu chiffres pour Alpha Agency (agence de communication, Guadeloupe). À partir de la "
        "conversation ci-dessous, génère un devis pour les prestations demandées par le prospect.\n"
        "Réponds UNIQUEMENT par un JSON valide, sans texte autour :\n"
        '{"items":[{"title":"","description":"","quantity":1,"unit_price":0}],"notes":""}\n'
        "Règles : une ligne par prestation ; unit_price en euros HT ; montants réalistes d'agence "
        "(gestion réseaux sociaux ~400-900€/mois, site vitrine ~1500-3500€, e-commerce ~3000-7000€, "
        "logo/identité ~500-1500€, shooting photo ~400-900€) ; quantity = nombre de mois pour un "
        "abonnement mensuel, sinon 1 ; notes = court contexte pour l'équipe.\n\nCONVERSATION:\n" + transcript
    )
    for mdl in GEMINI_MODELS:
        def _call(m=mdl):
            resp = _gemini_client.models.generate_content(
                model=m, contents=prompt,
                config=_genai_types.GenerateContentConfig(response_mime_type="application/json"),
            )
            return (getattr(resp, "text", "") or "").strip()
        try:
            data = json.loads(await asyncio.to_thread(_call))
            if isinstance(data, dict) and data.get("items"):
                return data
        except Exception as e:
            logger.warning(f"public_chat: devis fallback ({mdl}) échoué: {e}")
            continue
    return None


async def _resolve_recipients():
    """Destinataires : l'email Google connecté (comme les emails de RDV) + secours."""
    emails = []
    try:
        s = await db.settings.find_one({"type": "google_calendar_tokens"})
        if s and s.get("google_email"):
            emails.append(s["google_email"])
    except Exception:
        pass
    for e in (LEAD_NOTIFY_EMAIL, "admin@alphagency.fr"):
        if e and e not in emails:
            emails.append(e)
    return emails[:3]


def _build_email(kind: str, info: dict):
    if kind == "lead":
        name = f"{info.get('first_name','')} {info.get('last_name','')}".strip() or "Prospect"
        company = info.get("company") or "—"
        rows = "".join(
            f"<tr><td style='padding:4px 10px;color:#666'>{k}</td>"
            f"<td style='padding:4px 10px'><b>{(info.get(v) or '—')}</b></td></tr>"
            for k, v in [("Nom", "first_name"), ("Email", "email"), ("Téléphone", "phone"),
                         ("Entreprise", "company"), ("Poste", "poste"),
                         ("Besoin", "besoin"), ("Budget", "budget")]
        )
        subject = f"🔔 Nouveau lead chatbot : {name} ({company})"
        html = (f"<h2>Nouveau lead via le chatbot du site</h2>"
                f"<table style='border-collapse:collapse'>{rows}</table>"
                f"<p><a href='{SITE_URL}/admin/demandes'>Voir dans le CRM (Demandes)</a></p>")
    else:  # devis
        subject = f"📄 Devis prêt à valider : {info.get('number','')} — {info.get('name','')}"
        html = (f"<h2>Un devis a été pré-rempli par l'assistant IA</h2>"
                f"<p>Numéro : <b>{info.get('number','')}</b> — Total estimé : "
                f"<b>{info.get('total',0):.2f} € TTC</b> (à vérifier).</p>"
                f"<p>Client : <b>{info.get('name','')}</b></p>"
                f"<p><a href='{SITE_URL}/admin/facturation'>Vérifier le devis</a></p>")
    return subject, html


def _send_brevo(to_emails, subject: str, html: str):
    """Envoi Brevo synchrone. Retourne (status, text) pour diagnostic."""
    if not BREVO_API_KEY:
        return 0, "no_brevo_key"
    import requests
    try:
        r = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json", "accept": "application/json"},
            json={"sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
                  "to": [{"email": e} for e in to_emails],
                  "subject": subject, "htmlContent": html},
            timeout=15,
        )
        if r.status_code not in (200, 201, 202):
            logger.error(f"public_chat brevo error {r.status_code}: {r.text[:200]}")
        return r.status_code, r.text[:300]
    except Exception as e:
        logger.error(f"public_chat brevo exception: {e}")
        return -1, str(e)[:200]


async def _notify_leo(kind: str, info: dict):
    recips = await _resolve_recipients()
    subject, html = _build_email(kind, info)
    return await asyncio.to_thread(_send_brevo, recips, subject, html)


# ==================== Endpoints ====================
@router.get("/chat/health")
async def public_chat_health():
    return {"available": bool(_gemini_client), "greeting": GREETING}


@router.get("/_debug/email")
async def _debug_email(token: str = ""):
    """Diagnostic temporaire de la notification email (gated)."""
    if token != "alpha-mail-check-2026":
        raise HTTPException(status_code=404, detail="Not found")
    recips = await _resolve_recipients()
    status, text = await _notify_leo("lead", {
        "first_name": "Test", "last_name": "Notification", "email": "test@example.com",
        "company": "Diagnostic Chatbot", "phone": "—", "poste": "—",
        "besoin": "Vérification de la notification email du chatbot", "budget": "—",
    })
    return {"has_brevo_key": bool(BREVO_API_KEY), "sender": BREVO_SENDER_EMAIL,
            "recipients": recips, "brevo_status": status, "brevo_text": text}


@router.post("/chat")
async def public_chat(req: PubChatRequest, request: Request):
    ip = _client_ip(request)
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="Trop de messages, réessayez dans un moment.")

    msgs = req.messages or []
    if not msgs:
        raise HTTPException(status_code=400, detail="Message vide.")
    if len(msgs) > _MAX_MESSAGES:
        msgs = msgs[-_MAX_MESSAGES:]
    sid = req.session_id or str(uuid.uuid4())

    if not _gemini_client:
        return {"message": "Notre assistant est momentanément indisponible. Écrivez-nous à "
                           "leo.sperl@alphagency.fr ou au +596 696 44 73 53.",
                "session_id": sid, "lead_captured": False, "available": False}

    research = _SESSION_RESEARCH.get(sid, "")
    try:
        raw = await _generate(msgs, research)
    except Exception as e:
        logger.error(f"public_chat: génération échouée: {e}")
        return {"message": "Désolé, j'ai un souci technique. Laissez-nous votre email à "
                           "leo.sperl@alphagency.fr et on revient vers vous très vite.",
                "session_id": sid, "lead_captured": False, "available": True}

    # 1) Recherche web (une seule fois par session)
    if not research:
        _, rdata = _extract_block(raw, "RESEARCH")
        if rdata and rdata.get("company"):
            found = await _research(rdata.get("company", ""), rdata.get("person", ""),
                                    rdata.get("city", ""), rdata.get("website", ""))
            if found:
                _SESSION_RESEARCH[sid] = found
                try:
                    raw = await _generate(msgs, found)  # réponse ré-informée
                except Exception:
                    pass

    # 2) Lead
    _, lead = _extract_block(raw, "LEAD")
    lead_captured = False
    if lead:
        lead["_sid"] = sid
        res = await _save_lead(lead, ip)
        if res:
            contact_id, is_new = res
            _SESSION_CONTACT[sid] = {
                "id": contact_id,
                "name": f"{lead.get('first_name','')} {lead.get('last_name','')}".strip(),
                "email": (lead.get("email") or "").lower(),
            }
            lead_captured = True
            if is_new:
                await _notify_leo("lead", lead)

    # 3) Devis : bloc [QUOTE] émis par l'agent
    _, quote = _extract_block(raw, "QUOTE")
    contact = _SESSION_CONTACT.get(sid)
    if quote and contact and sid not in _SESSION_QUOTED:
        devis = await _create_devis(contact["id"], quote.get("items", []), quote.get("notes", ""))
        if devis:
            _SESSION_QUOTED.add(sid)
            await _notify_leo("devis", {"name": contact["name"], "number": devis[0], "total": devis[1]})

    # 3b) Filet de sécurité : prospect qui clôt + lead capturé + pas encore de devis -> génère le devis
    last_user = msgs[-1].content if (msgs and msgs[-1].role == "user") else ""
    if (sid not in _SESSION_QUOTED and contact and len(msgs) >= 6 and _CLOSING_RE.search(last_user or "")):
        qdata = await _generate_quote_from_convo(msgs)
        if qdata:
            devis = await _create_devis(contact["id"], qdata.get("items", []), qdata.get("notes", ""))
            if devis:
                _SESSION_QUOTED.add(sid)
                await asyncio.to_thread(_notify_leo, "devis",
                                        {"name": contact["name"], "number": devis[0], "total": devis[1]})

    message = _strip_all_blocks(raw) or "Pouvez-vous m'en dire un peu plus sur votre projet ?"
    return {"message": message, "session_id": sid, "lead_captured": lead_captured, "available": True}
