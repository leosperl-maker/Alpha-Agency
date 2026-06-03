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

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
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

ÉTAPE 4bis — SIGNAUX COMMERCIAUX (glisse ces 3 questions naturellement, une à une, vers la fin de la découverte ; ne les enchaîne pas en rafale) :
 f. DÉLAI : « C'est pour quand, idéalement ? » (un projet pour bientôt vaut beaucoup plus qu'un projet vague)
 g. COMMENT IL NOUS A CONNUS : « Au fait, comment avez-vous entendu parler d'Alpha Agency ? » (bouche-à-oreille, Google, Instagram, pub...)
 h. CANAL DE RAPPEL PRÉFÉRÉ : « Vous préférez qu'on vous rappelle, qu'on vous écrive par mail, ou par WhatsApp ? »

DÉCIDEUR : ne demande JAMAIS frontalement « c'est vous qui décidez du budget ? » (ça braque). On le déduit de la fonction déjà donnée. SEULEMENT si la fonction est ambiguë ou non donnée, tu peux glisser une question douce : « Et sur ce projet, c'est vous qui pilotez en interne, ou il y a d'autres personnes à embarquer ? »

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
[LEAD]{"first_name":"","last_name":"","email":"","phone":"","company":"","poste":"","project_type":"","budget":"","delai":"","canal_rappel":"","comment_connu":"","besoin":"","details":""}[/LEAD]
  (besoin = résumé en une phrase ; details = TOUTES les réponses clés de la découverte, en texte ; delai = échéance souhaitée ; canal_rappel = rappel/email/whatsapp ; comment_connu = comment il a connu Alpha Agency)
- Devis recommandé (étape 5 uniquement) :
[QUOTE]{"items":[{"title":"","description":"","quantity":1,"unit_price":0}],"notes":""}[/QUOTE]
  (estimation pour l'équipe ; unit_price en euros HT ; montants réalistes d'agence, l'équipe ajustera)

CONTINUITÉ (TRÈS IMPORTANT, lis bien) :
- Dis bonjour et présente-toi UNIQUEMENT au tout premier message. Ensuite ne te re-présente JAMAIS et ne redis pas bonjour.
- Ne redemande JAMAIS une information déjà donnée. Relis tout l'historique avant chaque réponse et tiens-toi à l'étape où tu en es.
- Émets [RESEARCH] une seule fois (quand tu as l'entreprise). Émets [LEAD] une fois quand tu as prénom+nom+email, puis ré-émets-le COMPLET (budget + tous les détails de la découverte) seulement à la toute fin, juste avant [QUOTE].
- Place chaque bloc technique SEUL sur sa propre ligne, à la TOUTE FIN du message, jamais au milieu d'une phrase. N'écris jamais une balise de fermeture toute seule.
- N'écris JAMAIS ton raisonnement interne ni de balises de réflexion ([THOUGHT], [PLAN], [ANALYSIS]...). Réponds directement au prospect, sans préambule technique. Seuls [RESEARCH], [LEAD] et [QUOTE] sont autorisés, à la fin du message.

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
_SESSION_RESEARCH: dict = {}        # session_id -> texte de recherche
_SESSION_RESEARCH_STRUCT: dict = {} # session_id -> enrichissement web structuré (dict)
_SESSION_CONTACT: dict = {}         # session_id -> {id, name, email}
_SESSION_QUOTED: set = set()        # session_ids déjà devisés (évite les doublons)
_SESSION_WA_SENT: set = set()       # session_ids ayant déjà reçu le récap WhatsApp client
_SESSION_ATTACHMENTS: dict = {}     # session_id -> [{url, name, type, size}] (pièces jointes du visiteur)

# Pièces jointes : types acceptés + taille max
_ALLOWED_UPLOAD = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic",
    "application/pdf", "text/plain",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
_MAX_UPLOAD = 10 * 1024 * 1024  # 10 Mo
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


async def _research_structured(research_text: str) -> Optional[dict]:
    """Extrait des champs structurés du texte de recherche (cf. doc §5). Best-effort."""
    if not _gemini_client or not research_text:
        return None
    prompt = (
        "À partir de ces informations publiques sur une entreprise, extrais des champs structurés "
        "réutilisables pour un CRM. Réponds UNIQUEMENT par un JSON valide, sans texte autour. "
        "Mets null (ou liste vide) pour tout champ inconnu, n'invente rien :\n"
        '{"site_web":"oui|non","site_url":"","reseaux_actifs":["instagram","facebook","linkedin","tiktok"],'
        '"derniere_publication":"","note_google":null,"avis_count":null,"secteur":"","taille":"","concurrents":[]}\n\n'
        "INFOS PUBLIQUES :\n" + research_text[:4000]
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
            if isinstance(data, dict):
                return data
        except Exception as e:
            logger.warning(f"public_chat: enrichissement structuré ({mdl}) échoué: {e}")
            continue
    return None


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
    """Retire toutes les formes de balises techniques + tout raisonnement interne fuité."""
    text = text or ""
    # [TAG]{...}[/TAG] complet
    text = re.sub(r"\[(RESEARCH|LEAD|QUOTE)\]\s*\{.*?\}\s*\[/\1\]", "", text, flags=re.DOTALL | re.IGNORECASE)
    # [TAG]{...} (ouverture + json sans fermeture)
    text = re.sub(r"\[(?:RESEARCH|LEAD|QUOTE)\]\s*\{.*?\}", "", text, flags=re.DOTALL | re.IGNORECASE)
    # blocs de raisonnement interne que le modèle invente parfois ([THOUGHT], [PLAN]...) — avec fermeture
    text = re.sub(r"\[(THOUGHT|REASONING|PLAN|INTERNAL|THINK|NOTE|ANALYSIS)\].*?\[/\1\]", "", text, flags=re.DOTALL | re.IGNORECASE)
    # ... ou sans fermeture : du marqueur jusqu'à une ligne vide, un autre bloc, ou la fin
    text = re.sub(r"\[(?:THOUGHT|REASONING|PLAN|INTERNAL|THINK|ANALYSIS)\].*?(?=\n\s*\n|\[[A-Z]|$)", "", text, flags=re.DOTALL | re.IGNORECASE)
    # balises isolées [TAG] ou [/TAG]
    text = re.sub(r"\[/?(?:RESEARCH|LEAD|QUOTE|THOUGHT|REASONING|PLAN|INTERNAL|THINK|NOTE|ANALYSIS)\]", "", text, flags=re.IGNORECASE)
    # nettoyage des espaces/lignes vides résiduels
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ==================== Qualification : décideur + scoring ====================
_DECIDEUR_OUI = re.compile(
    r"\b(g[ée]rant|g[ée]rante|dirigeant|dirigeante|fondateur|fondatrice|co-?fondat|ceo|"
    r"pr[ée]sident|patron|patronne|propri[ée]taire|chef d'entreprise|owner|founder|"
    r"auto-?entrepreneur|ind[ée]pendant|artisan)\b", re.IGNORECASE)
_DECIDEUR_PROBABLE = re.compile(
    r"\b(directeur|directrice|dg|directeur g[ée]n[ée]ral|responsable|associ[ée]|"
    r"head of|head|manager|chef de projet|chef de service)\b", re.IGNORECASE)
_DECIDEUR_NON = re.compile(
    r"\b(charg[ée] de|assistant|assistante|stagiaire|alternant|alternante|employ[ée]|"
    r"secr[ée]taire|commercial|commerciale|vendeur|vendeuse|conseiller|conseill[èe]re)\b", re.IGNORECASE)


def _decision_level(poste: str) -> str:
    """Déduit le niveau de décision à partir du poste. oui|probable|non|inconnu."""
    p = (poste or "").strip()
    if not p:
        return "inconnu"
    if _DECIDEUR_OUI.search(p):
        return "oui"
    if _DECIDEUR_PROBABLE.search(p):
        return "probable"
    if _DECIDEUR_NON.search(p):
        return "non"
    return "inconnu"


_DELAI_COURT = re.compile(
    r"(urgent|urgente|asap|au plus vite|tout de suite|imm[ée]diat|d[èe]s que possible|"
    r"cette semaine|ce mois|sous (?:une|1|deux|2|trois|3|quatre|4) semaines?|"
    r"d'ici (?:une|1|deux|2|trois|3|quatre|4) semaines?|(?:une|1|deux|2|trois|3|quatre|4) semaines?|"
    r"\b(?:un|1) mois\b)", re.IGNORECASE)
_DELAI_LONG = re.compile(
    r"(pas press[ée]|aucune urgence|un jour|peut-?[êe]tre|plus tard|l'ann[ée]e prochaine|"
    r"dans (?:[2-9]|10|onze|douze) mois|dans (?:un|1) an|fin d'ann[ée]e|pas d'urgence)", re.IGNORECASE)


def _delai_court(delai: str) -> bool:
    d = (delai or "").strip()
    if not d:
        return False
    if _DELAI_LONG.search(d):
        return False
    return bool(_DELAI_COURT.search(d))


_HIGH_VALUE = re.compile(
    r"\b(e-?commerce|boutique en ligne|refonte|publicit[ée]|campagne|google ads|meta ads|"
    r"\bads\b|site complet|sur-?mesure|application|appli mobile)\b", re.IGNORECASE)


def _service_high_value(*texts) -> bool:
    blob = " ".join(t for t in texts if t)
    return bool(_HIGH_VALUE.search(blob))


def _web_active(web: dict) -> bool:
    if not isinstance(web, dict):
        return False
    if str(web.get("site_web") or "").lower() == "oui":
        return True
    socials = web.get("reseaux_actifs") or []
    if isinstance(socials, list) and any(s for s in socials):
        return True
    try:
        if web.get("note_google") and float(web.get("note_google")) > 0:
            return True
    except (TypeError, ValueError):
        pass
    return False


def _budget_given(budget: str) -> bool:
    b = (budget or "").strip().lower()
    if not b or b in ("non", "aucun", "pas de budget", "je ne sais pas", "ne sait pas", "nc", "n/c", "?"):
        return False
    return bool(re.search(r"\d", b)) or "€" in b or "euro" in b


def _compute_score(data: dict, web: dict) -> tuple:
    """Score commercial /100 (cf. Chatbot-Public-Ameliorations §7). Retourne (valeur_int, label)."""
    score = 0
    decision = _decision_level(data.get("poste"))
    if _budget_given(data.get("budget")):
        score += 30
    if _delai_court(data.get("delai")):
        score += 20
    if decision == "oui":
        score += 20
    elif decision == "probable":
        score += 10
    if (data.get("email") or "").strip() and (data.get("phone") or "").strip():
        score += 10
    if _service_high_value(data.get("besoin"), data.get("project_type"), data.get("details")):
        score += 15
    if _web_active(web):
        score += 5
    score = max(0, min(100, score))
    label = "chaud" if score >= 70 else ("tiède" if score >= 40 else "froid")
    return score, label


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
    web = _SESSION_RESEARCH_STRUCT.get(data.get("_sid")) or {}
    atts = _SESSION_ATTACHMENTS.get(data.get("_sid")) or []
    delai = (data.get("delai") or "").strip()
    canal = (data.get("canal_rappel") or "").strip()
    connu = (data.get("comment_connu") or "").strip()
    now = datetime.now(timezone.utc).isoformat()

    decision = _decision_level(poste)
    score_value, score_label = _compute_score(
        {"poste": poste, "budget": budget, "delai": delai, "email": email,
         "phone": phone, "besoin": besoin, "project_type": project, "details": details},
        web,
    )
    # Étape atteinte (repère les conversations abandonnées : cf. doc §4)
    step = "découverte" if details else ("besoin" if (besoin or project) else "identité")

    note_parts = []
    if besoin:
        note_parts.append("BESOIN : " + besoin)
    if details:
        note_parts.append("DÉCOUVERTE : " + details)
    if research:
        note_parts.append("RECHERCHE WEB : " + research)
    note_text = "\n\n".join(note_parts)

    # Enrichissement web structuré (cf. doc §5)
    web_fields = {}
    if web:
        web_fields = {
            "web_site": web.get("site_web"),
            "web_url": web.get("site_url"),
            "web_socials": web.get("reseaux_actifs") or [],
            "web_last_post": web.get("derniere_publication"),
            "web_google_rating": web.get("note_google"),
            "web_reviews_count": web.get("avis_count"),
            "web_sector": web.get("secteur"),
            "web_size": web.get("taille"),
            "web_competitors": web.get("concurrents") or [],
        }

    existing = await db.contacts.find_one({"email": email})
    if existing:
        updates = {"updated_at": now, "score": score_label, "score_value": score_value,
                   "decision_level": decision, "conversation_step": step}
        for key, val in (("first_name", first), ("last_name", last), ("company", company),
                         ("phone", phone), ("poste", poste), ("project_type", project),
                         ("budget", budget), ("delai", delai), ("canal_rappel", canal),
                         ("comment_connu", connu)):
            if val:
                updates[key] = val
        if note_text:
            updates["note"] = note_text
            updates["infos_sup"] = besoin or project
        if web_fields:
            updates.update({k: v for k, v in web_fields.items() if v not in (None, "", [])})
        if atts:
            updates["attachments"] = atts
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
        "delai": delai or None,
        "canal_rappel": canal or None,
        "comment_connu": connu or None,
        "besoin": besoin or None,
        "message": besoin or None,
        "note": note_text or None,
        "infos_sup": besoin or project or None,
        "tags": ["chatbot", "site web"],
        "city": None, "siret": None, "company_address": None, "company_activite": None,
        "status": "nouveau",
        "score": score_label,
        "score_value": score_value,
        "decision_level": decision,
        "conversation_step": step,
        "completion_status": "en_cours",
        "attachments": atts,
        "created_at": now,
        "updated_at": now,
        **web_fields,
    }
    await db.contacts.insert_one(contact_doc)
    logger.info(f"public_chat: nouveau lead {email} ({company or 'n/c'}) score={score_value}")
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
    from utils.emailer import email_shell, email_rows, email_button
    if kind == "lead":
        name = f"{info.get('first_name','')} {info.get('last_name','')}".strip() or "Prospect"
        company = info.get("company") or "—"
        decision_map = {"oui": "Oui", "probable": "Probable", "non": "Non", "inconnu": "À confirmer"}
        decideur = decision_map.get(info.get("decision_level"), None)
        sv = info.get("score_value")
        score_txt = f"{sv}/100 ({info.get('score_label','')})" if sv is not None else None
        atts = info.get("attachments") or []
        att_html = ""
        if atts:
            links = "".join(
                f'<li><a href="{a.get("url")}" style="color:#E11D2E;text-decoration:none;">{a.get("name") or "fichier"}</a></li>'
                for a in atts)
            att_html = (f'<p style="margin-top:14px;"><strong>Pièces jointes ({len(atts)})</strong></p>'
                        f'<ul style="margin:6px 0 0;padding-left:18px;">{links}</ul>')
        subject = f"🔔 Nouveau lead chatbot : {name} ({company})"
        inner = (
            "<p>Un visiteur vient d'être qualifié par l'assistant de votre site.</p>"
            + email_rows([
                ("Nom", name),
                ("Email", info.get("email")),
                ("Téléphone", info.get("phone")),
                ("Entreprise", info.get("company")),
                ("Poste", info.get("poste")),
                ("Décideur", decideur),
                ("Besoin", info.get("besoin")),
                ("Budget", info.get("budget")),
                ("Délai", info.get("delai")),
                ("Canal préféré", info.get("canal_rappel")),
                ("Connu via", info.get("comment_connu")),
                ("Score", score_txt),
            ])
            + att_html
            + email_button("Voir dans le CRM", f"{SITE_URL}/admin/demandes")
        )
        html = email_shell("Nouveau lead chatbot", inner, preheader=f"{name} — {company}")
    else:  # devis
        subject = f"📄 Devis prêt à valider : {info.get('number','')} — {info.get('name','')}"
        inner = (
            "<p>L'assistant IA a pré-rempli un devis à partir d'une conversation. À vérifier et ajuster avant envoi.</p>"
            + email_rows([
                ("Client", info.get("name")),
                ("N° devis", info.get("number")),
                ("Total estimé", f"{info.get('total', 0):.2f} € TTC"),
            ])
            + email_button("Vérifier le devis", f"{SITE_URL}/admin/facturation")
        )
        html = email_shell("Devis prêt à valider", inner, preheader=info.get("name", ""))
    return subject, html


def _send_brevo(to_emails, subject: str, html: str):
    """Envoi email via Resend (synchrone). Retourne (status, text) pour diagnostic."""
    key = os.environ.get("RESEND_API_KEY", "")
    if not key:
        return 0, "no_resend_key"
    import requests
    sender = os.environ.get("SENDER_EMAIL") or "noreply@alphagency.fr"
    if "<" not in sender:
        sender = f"Alpha Agency <{sender}>"
    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"from": sender, "to": list(to_emails), "subject": subject, "html": html},
            timeout=15,
        )
        if r.status_code not in (200, 201, 202):
            logger.error(f"public_chat resend error {r.status_code}: {r.text[:200]}")
        return r.status_code, r.text[:300]
    except Exception as e:
        logger.error(f"public_chat resend exception: {e}")
        return -1, str(e)[:200]


async def _notify_leo(kind: str, info: dict):
    recips = await _resolve_recipients()
    subject, html = _build_email(kind, info)
    return await asyncio.to_thread(_send_brevo, recips, subject, html)


# ==================== Endpoints ====================
@router.get("/chat/health")
async def public_chat_health():
    return {"available": bool(_gemini_client), "greeting": GREETING}


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

    # 1) Recherche web (une seule fois par session) + enrichissement structuré
    if not research:
        _, rdata = _extract_block(raw, "RESEARCH")
        if rdata and rdata.get("company"):
            found = await _research(rdata.get("company", ""), rdata.get("person", ""),
                                    rdata.get("city", ""), rdata.get("website", ""))
            if found:
                _SESSION_RESEARCH[sid] = found
                try:
                    struct = await _research_structured(found)
                    if struct:
                        _SESSION_RESEARCH_STRUCT[sid] = struct
                except Exception as e:
                    logger.warning(f"public_chat: enrichissement structuré échoué: {e}")
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
                # Enrichit le mail avec les signaux calculés (décideur + score + pièces jointes)
                lead["decision_level"] = _decision_level(lead.get("poste"))
                lead["score_value"], lead["score_label"] = _compute_score(
                    lead, _SESSION_RESEARCH_STRUCT.get(sid) or {})
                lead["attachments"] = _SESSION_ATTACHMENTS.get(sid) or []
                await _notify_leo("lead", lead)
                # Accusé de réception au prospect (rassure + couvre) — cf. Assistant-Admin §6
                try:
                    from utils.emailer import send_email, email_shell
                    fn = (lead.get("first_name") or "").strip()
                    besoin = lead.get("besoin") or lead.get("project_type") or "votre projet"
                    inner = (
                        f"<p>Bonjour {fn},</p>"
                        f"<p>Merci d'avoir pris contact avec Alpha Agency. Nous avons bien reçu votre demande "
                        f"concernant <strong>{besoin}</strong>.</p>"
                        f"<p>Un conseiller revient vers vous très vite avec une proposition personnalisée. "
                        f"En attendant, vous pouvez nous joindre au +596 696 44 73 53.</p>"
                        f"<p>À très bientôt,<br>L'équipe Alpha Agency</p>"
                    )
                    html = email_shell("Votre demande est bien reçue", inner,
                                       preheader="Nous revenons vers vous très vite.")
                    await asyncio.to_thread(send_email, lead.get("email"),
                                            "Votre demande chez Alpha Agency", html)
                except Exception as e:
                    logger.error(f"accusé réception prospect échoué: {e}")
                # SMS d'alerte à l'équipe (Twilio)
                try:
                    from utils.sms import notify_admin_sms
                    name = f"{lead.get('first_name','')} {lead.get('last_name','')}".strip() or "Un prospect"
                    company = lead.get("company") or "particulier"
                    besoin = lead.get("besoin") or lead.get("project_type") or "un projet"
                    sms = (f"Alpha Agency : nouvelle demande chatbot de {name} ({company}) "
                           f"pour {besoin}. Devis en attente d'approbation dans le CRM.")
                    await asyncio.to_thread(notify_admin_sms, sms)
                except Exception as e:
                    logger.error(f"SMS lead alert failed: {e}")

            # Récap WhatsApp au client dès qu'on a son numéro (1×/session)
            phone = (lead.get("phone") or "").strip()
            if phone and sid not in _SESSION_WA_SENT:
                _SESSION_WA_SENT.add(sid)
                try:
                    from utils.sms import send_whatsapp
                    fn = lead.get("first_name") or ""
                    besoin = lead.get("besoin") or lead.get("project_type") or "votre projet"
                    wa = (f"Bonjour {fn}, merci pour votre demande chez Alpha Agency. "
                          f"Récap : {besoin}. Un collaborateur vous recontacte très vite. À bientôt !")
                    await asyncio.to_thread(send_whatsapp, phone, wa)
                except Exception as e:
                    logger.error(f"WhatsApp recap failed: {e}")

    # 3) Devis : bloc [QUOTE] émis par l'agent
    _, quote = _extract_block(raw, "QUOTE")
    contact = _SESSION_CONTACT.get(sid)
    if quote and contact and sid not in _SESSION_QUOTED:
        devis = await _create_devis(contact["id"], quote.get("items", []), quote.get("notes", ""))
        if devis:
            _SESSION_QUOTED.add(sid)
            await db.contacts.update_one({"id": contact["id"]},
                                         {"$set": {"completion_status": "complet", "conversation_step": "clôturé"}})
            await _notify_leo("devis", {"name": contact["name"], "number": devis[0], "total": devis[1]})

    # 3b) Filet de sécurité : prospect qui clôt + lead capturé + pas encore de devis -> génère le devis
    last_user = msgs[-1].content if (msgs and msgs[-1].role == "user") else ""
    if (sid not in _SESSION_QUOTED and contact and len(msgs) >= 6 and _CLOSING_RE.search(last_user or "")):
        qdata = await _generate_quote_from_convo(msgs)
        if qdata:
            devis = await _create_devis(contact["id"], qdata.get("items", []), qdata.get("notes", ""))
            if devis:
                _SESSION_QUOTED.add(sid)
                await db.contacts.update_one({"id": contact["id"]},
                                             {"$set": {"completion_status": "complet", "conversation_step": "clôturé"}})
                await _notify_leo("devis", {"name": contact["name"], "number": devis[0], "total": devis[1]})

    message = _strip_all_blocks(raw)
    if not message:
        message = ("Merci beaucoup ! L'équipe d'Alpha Agency revient vers vous très vite avec une proposition personnalisée."
                   if (contact or lead_captured) else "Pouvez-vous m'en dire un peu plus sur votre projet ?")
    return {"message": message, "session_id": sid, "lead_captured": lead_captured, "available": True}


@router.post("/chat/upload")
async def public_chat_upload(request: Request, file: UploadFile = File(...), session_id: str = Form(None)):
    """Pièce jointe envoyée par le visiteur (logo, cahier des charges, photo...).
    Uploadée sur Cloudinary, rattachée au lead de la session. NON authentifié, verrouillé."""
    ip = _client_ip(request)
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="Trop de requêtes, réessayez dans un moment.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide.")
    if len(content) > _MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (10 Mo maximum).")
    ctype = (file.content_type or "").lower()
    if ctype not in _ALLOWED_UPLOAD:
        raise HTTPException(status_code=415, detail="Type non accepté (images, PDF, Word, Excel, texte).")

    sid = session_id or str(uuid.uuid4())
    try:
        import cloudinary, cloudinary.uploader
        if not cloudinary.config().cloud_name:
            cloudinary.config(
                cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
                api_key=os.environ.get("CLOUDINARY_API_KEY"),
                api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
            )
        res = await asyncio.to_thread(
            cloudinary.uploader.upload, content,
            resource_type="auto", folder="chatbot_uploads", use_filename=True, unique_filename=True,
        )
        url = res.get("secure_url") or res.get("url")
    except Exception as e:
        logger.error(f"public_chat upload cloudinary: {e}")
        raise HTTPException(status_code=502, detail="Échec de l'envoi du fichier, réessayez.")
    if not url:
        raise HTTPException(status_code=502, detail="Échec de l'envoi du fichier.")

    att = {"url": url, "name": file.filename or "fichier", "type": ctype, "size": len(content)}
    _SESSION_ATTACHMENTS.setdefault(sid, []).append(att)
    # Si un lead existe déjà pour cette session, rattache immédiatement
    contact = _SESSION_CONTACT.get(sid)
    if contact:
        try:
            await db.contacts.update_one({"id": contact["id"]},
                                         {"$set": {"attachments": _SESSION_ATTACHMENTS[sid]}})
        except Exception as e:
            logger.warning(f"rattachement pièce jointe au lead échoué: {e}")
    logger.info(f"public_chat: pièce jointe {att['name']} ({len(content)} o) session {sid[:8]}")
    return {"ok": True, "session_id": sid, "url": url, "name": att["name"], "type": ctype}
