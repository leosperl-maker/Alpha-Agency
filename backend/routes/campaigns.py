"""
Brevo Campaigns Module - Email & SMS Marketing
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import requests
import json
import uuid
import logging
import os

logger = logging.getLogger(__name__)

# Brevo API Configuration
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')
BREVO_API_URL = "https://api.brevo.com/v3"

router = APIRouter()

# ==================== EMAIL TEMPLATES ====================

EMAIL_TEMPLATES = {
    "newsletter": {
        "id": "newsletter",
        "name": "Newsletter",
        "description": "Newsletter mensuelle avec actualités et offres",
        "preview_image": "https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=400",
        "subject_template": "📬 Newsletter {{month}} - Les dernières nouveautés",
        "html_content": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #CE0202 0%, #8B0000 100%); padding: 40px 20px; text-align: center; }
        .header img { max-width: 150px; margin-bottom: 15px; }
        .header h1 { color: #ffffff; font-size: 28px; margin: 0; }
        .content { padding: 30px 20px; }
        .intro { font-size: 16px; color: #333333; line-height: 1.6; margin-bottom: 25px; }
        .section-title { font-size: 20px; color: #CE0202; margin: 25px 0 15px; border-bottom: 2px solid #CE0202; padding-bottom: 8px; }
        .article { background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
        .article h3 { color: #1a1a1a; margin: 0 0 10px; font-size: 18px; }
        .article p { color: #666666; font-size: 14px; line-height: 1.5; margin: 0; }
        .cta-button { display: inline-block; background: #CE0202; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background: #1a1a1a; color: #999999; padding: 25px 20px; text-align: center; font-size: 12px; }
        .footer a { color: #CE0202; text-decoration: none; }
        .social-links { margin: 15px 0; }
        .social-links a { margin: 0 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{logo_url}}" alt="Logo">
            <h1>Newsletter {{month}}</h1>
        </div>
        <div class="content">
            <p class="intro">Bonjour {{first_name}},<br><br>Découvrez les dernières actualités et offres exclusives de ce mois-ci.</p>
            
            <h2 class="section-title">📰 À la une</h2>
            <div class="article">
                <h3>{{article_1_title}}</h3>
                <p>{{article_1_description}}</p>
            </div>
            <div class="article">
                <h3>{{article_2_title}}</h3>
                <p>{{article_2_description}}</p>
            </div>
            
            <h2 class="section-title">🎁 Offre du mois</h2>
            <div class="article">
                <h3>{{offer_title}}</h3>
                <p>{{offer_description}}</p>
            </div>
            
            <center>
                <a href="{{cta_url}}" class="cta-button">{{cta_text}}</a>
            </center>
        </div>
        <div class="footer">
            <p>© {{year}} {{company_name}} - Tous droits réservés</p>
            <p>{{company_address}}</p>
            <p><a href="{{unsubscribe_url}}">Se désabonner</a></p>
        </div>
    </div>
</body>
</html>
"""
    },
    "promotion": {
        "id": "promotion",
        "name": "Promotion",
        "description": "Email promotionnel avec offre spéciale",
        "preview_image": "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400",
        "subject_template": "🔥 -{{discount}}% sur {{product}} - Offre limitée !",
        "html_content": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #1a1a1a; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .banner { background: linear-gradient(135deg, #CE0202 0%, #FF4444 100%); padding: 50px 20px; text-align: center; }
        .banner h1 { color: #ffffff; font-size: 48px; margin: 0; font-weight: 800; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .banner .subtitle { color: #ffffff; font-size: 24px; margin-top: 10px; opacity: 0.9; }
        .discount-badge { display: inline-block; background: #FFD700; color: #1a1a1a; font-size: 60px; font-weight: 800; padding: 20px 40px; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
        .content { padding: 30px 20px; text-align: center; }
        .product-name { font-size: 24px; color: #1a1a1a; margin: 20px 0 10px; }
        .original-price { font-size: 18px; color: #999999; text-decoration: line-through; }
        .new-price { font-size: 36px; color: #CE0202; font-weight: bold; margin: 10px 0; }
        .description { font-size: 16px; color: #666666; line-height: 1.6; margin: 20px 0; }
        .urgency { background: #FFF3CD; border: 1px solid #FFE69C; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0; font-weight: 500; }
        .cta-button { display: inline-block; background: #CE0202; color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-weight: bold; font-size: 18px; margin: 20px 0; box-shadow: 0 4px 15px rgba(206,2,2,0.4); }
        .footer { background: #1a1a1a; color: #999999; padding: 25px 20px; text-align: center; font-size: 12px; }
        .footer a { color: #CE0202; }
    </style>
</head>
<body>
    <div class="container">
        <div class="banner">
            <h1>OFFRE FLASH</h1>
            <div class="subtitle">Durée limitée !</div>
            <div class="discount-badge">-{{discount}}%</div>
        </div>
        <div class="content">
            <h2 class="product-name">{{product_name}}</h2>
            <p class="original-price">Prix habituel : {{original_price}}€</p>
            <p class="new-price">{{new_price}}€</p>
            <p class="description">{{product_description}}</p>
            <div class="urgency">⏰ Offre valable jusqu'au {{end_date}} - Plus que {{remaining_spots}} places !</div>
            <a href="{{cta_url}}" class="cta-button">J'EN PROFITE →</a>
        </div>
        <div class="footer">
            <p>© {{year}} {{company_name}}</p>
            <p><a href="{{unsubscribe_url}}">Se désabonner</a></p>
        </div>
    </div>
</body>
</html>
"""
    },
    "relance": {
        "id": "relance",
        "name": "Relance",
        "description": "Email de relance pour prospects inactifs",
        "preview_image": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400",
        "subject_template": "{{first_name}}, vous nous manquez ! 💼",
        "html_content": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: #1a1a1a; padding: 30px 20px; text-align: center; }
        .header img { max-width: 120px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 24px; color: #1a1a1a; margin-bottom: 20px; }
        .message { font-size: 16px; color: #555555; line-height: 1.8; margin-bottom: 25px; }
        .highlight-box { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #CE0202; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
        .highlight-box h3 { color: #CE0202; margin: 0 0 10px; font-size: 18px; }
        .highlight-box ul { color: #555555; margin: 0; padding-left: 20px; }
        .highlight-box li { margin: 8px 0; }
        .cta-section { text-align: center; padding: 30px 0; }
        .cta-button { display: inline-block; background: #CE0202; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; }
        .signature { border-top: 1px solid #eeeeee; margin-top: 30px; padding-top: 20px; }
        .signature img { width: 60px; height: 60px; border-radius: 50%; margin-bottom: 10px; }
        .signature .name { font-weight: bold; color: #1a1a1a; }
        .signature .title { font-size: 14px; color: #888888; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #888888; }
        .footer a { color: #CE0202; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{logo_url}}" alt="Logo">
        </div>
        <div class="content">
            <h1 class="greeting">Bonjour {{first_name}},</h1>
            <p class="message">Cela fait un moment que nous n'avons pas eu de vos nouvelles, et nous espérons que tout va bien de votre côté !</p>
            <p class="message">Nous avons remarqué que vous aviez montré de l'intérêt pour nos services. Nous serions ravis de vous accompagner dans votre projet.</p>
            
            <div class="highlight-box">
                <h3>Ce que nous pouvons faire pour vous :</h3>
                <ul>
                    <li>{{benefit_1}}</li>
                    <li>{{benefit_2}}</li>
                    <li>{{benefit_3}}</li>
                </ul>
            </div>
            
            <p class="message">N'hésitez pas à nous contacter si vous avez des questions ou si vous souhaitez planifier un appel découverte gratuit.</p>
            
            <div class="cta-section">
                <a href="{{cta_url}}" class="cta-button">Prendre rendez-vous</a>
            </div>
            
            <div class="signature">
                <p class="name">{{sender_name}}</p>
                <p class="title">{{sender_title}}<br>{{company_name}}</p>
            </div>
        </div>
        <div class="footer">
            <p>{{company_address}}</p>
            <p><a href="{{unsubscribe_url}}">Se désabonner</a></p>
        </div>
    </div>
</body>
</html>
"""
    },
    "bienvenue": {
        "id": "bienvenue",
        "name": "Bienvenue",
        "description": "Email de bienvenue pour nouveaux abonnés",
        "preview_image": "https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?w=400",
        "subject_template": "🎉 Bienvenue chez {{company_name}}, {{first_name}} !",
        "html_content": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #CE0202 0%, #FF6B6B 100%); padding: 50px 20px; text-align: center; }
        .header img { max-width: 100px; margin-bottom: 20px; }
        .header h1 { color: #ffffff; font-size: 32px; margin: 0; }
        .header p { color: rgba(255,255,255,0.9); font-size: 18px; margin-top: 10px; }
        .content { padding: 40px 30px; }
        .welcome-text { font-size: 16px; color: #555555; line-height: 1.8; margin-bottom: 30px; }
        .steps { margin: 30px 0; }
        .step { display: flex; align-items: flex-start; margin-bottom: 25px; }
        .step-number { width: 40px; height: 40px; background: #CE0202; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
        .step-content h4 { color: #1a1a1a; margin: 0 0 5px; font-size: 16px; }
        .step-content p { color: #666666; margin: 0; font-size: 14px; }
        .cta-button { display: block; background: #CE0202; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 6px; font-weight: bold; text-align: center; margin: 30px auto; max-width: 250px; }
        .footer { background: #1a1a1a; color: #999999; padding: 25px 20px; text-align: center; font-size: 12px; }
        .footer a { color: #CE0202; }
        .social-links { margin: 15px 0; }
        .social-links a { margin: 0 10px; color: #ffffff; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{logo_url}}" alt="Logo">
            <h1>Bienvenue {{first_name}} ! 🎉</h1>
            <p>Nous sommes ravis de vous compter parmi nous</p>
        </div>
        <div class="content">
            <p class="welcome-text">Merci de nous avoir rejoint ! Vous faites désormais partie de notre communauté et nous sommes impatients de vous accompagner dans votre réussite.</p>
            
            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>Complétez votre profil</h4>
                        <p>Personnalisez votre expérience en ajoutant vos informations</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>Découvrez nos services</h4>
                        <p>Explorez tout ce que nous avons à vous offrir</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>Contactez-nous</h4>
                        <p>Notre équipe est là pour répondre à toutes vos questions</p>
                    </div>
                </div>
            </div>
            
            <a href="{{cta_url}}" class="cta-button">Commencer maintenant</a>
        </div>
        <div class="footer">
            <div class="social-links">
                <a href="#">Facebook</a> | <a href="#">Instagram</a> | <a href="#">LinkedIn</a>
            </div>
            <p>© {{year}} {{company_name}}</p>
            <p><a href="{{unsubscribe_url}}">Se désabonner</a></p>
        </div>
    </div>
</body>
</html>
"""
    }
}


# ==================== PYDANTIC MODELS ====================

class EmailCampaignCreate(BaseModel):
    name: str
    subject: str
    html_content: str
    sender_email: Optional[str] = "contact@alphagency.fr"
    sender_name: Optional[str] = "Alpha Agency"
    list_ids: Optional[List[int]] = None
    scheduled_at: Optional[str] = None
    reply_to: Optional[str] = None

class SMSCampaignCreate(BaseModel):
    name: str
    content: str
    sender: str = "AlphaAg"
    recipients: Optional[List[str]] = None
    scheduled_at: Optional[str] = None

class ContactCreate(BaseModel):
    email: EmailStr
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    phone: Optional[str] = None
    company: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None

class ContactListCreate(BaseModel):
    name: str
    folder_id: Optional[int] = None

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None

class BulkContactImport(BaseModel):
    contacts: List[ContactCreate]
    list_ids: Optional[List[int]] = None

# ==================== BREVO SERVICE CLASS ====================

class BrevoService:
    def __init__(self, api_key: str, api_url: str = "https://api.brevo.com/v3"):
        self.api_key = api_key
        self.api_url = api_url
        self.headers = {
            "accept": "application/json",
            "api-key": self.api_key,
            "content-type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request to Brevo API"""
        url = f"{self.api_url}/{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers, params=params)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, data=json.dumps(data) if data else None)
            elif method == "PUT":
                response = requests.put(url, headers=self.headers, data=json.dumps(data) if data else None)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}
            
            # Check for rate limiting
            if response.status_code == 429:
                return {"success": False, "error": "Limite de requêtes Brevo atteinte. Réessayez plus tard.", "rate_limited": True}
            
            # Check for successful response
            if response.status_code in [200, 201, 204]:
                if response.status_code == 204:
                    return {"success": True}
                try:
                    return {"success": True, "data": response.json()}
                except:
                    return {"success": True}
            else:
                error_msg = response.text
                try:
                    error_data = response.json()
                    error_msg = error_data.get("message", response.text)
                except:
                    pass
                return {"success": False, "error": error_msg, "status_code": response.status_code}
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Brevo API error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # ==================== EMAIL CAMPAIGNS ====================
    
    def create_email_campaign(self, name: str, subject: str, html_content: str,
                              sender_name: str, sender_email: str,
                              list_ids: Optional[List[int]] = None,
                              reply_to: Optional[str] = None) -> Dict[str, Any]:
        """Create an email campaign"""
        payload = {
            "name": name,
            "subject": subject,
            "htmlContent": html_content,
            "sender": {"name": sender_name, "email": sender_email},
            "type": "classic"
        }
        
        if list_ids:
            payload["recipients"] = {"listIds": list_ids}
        
        if reply_to:
            payload["replyTo"] = reply_to
        
        result = self._make_request("POST", "emailCampaigns", payload)
        if result.get("success"):
            return {"success": True, "campaign_id": result.get("data", {}).get("id")}
        return result
    
    def get_email_campaigns(self, status: Optional[str] = None, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get list of email campaigns"""
        params = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        
        return self._make_request("GET", "emailCampaigns", params=params)
    
    def get_email_campaign(self, campaign_id: int) -> Dict[str, Any]:
        """Get a specific email campaign with statistics"""
        return self._make_request("GET", f"emailCampaigns/{campaign_id}")
    
    def send_email_campaign_now(self, campaign_id: int) -> Dict[str, Any]:
        """Send an email campaign immediately"""
        return self._make_request("POST", f"emailCampaigns/{campaign_id}/sendNow")
    
    def schedule_email_campaign(self, campaign_id: int, scheduled_at: str) -> Dict[str, Any]:
        """Schedule an email campaign for future sending"""
        payload = {"scheduledAt": scheduled_at}
        return self._make_request("PUT", f"emailCampaigns/{campaign_id}/status", payload)
    
    def send_test_email(self, campaign_id: int, email_addresses: List[str]) -> Dict[str, Any]:
        """Send a test email for a campaign"""
        payload = {"emailTo": email_addresses}
        return self._make_request("POST", f"emailCampaigns/{campaign_id}/sendTest", payload)
    
    def delete_email_campaign(self, campaign_id: int) -> Dict[str, Any]:
        """Delete an email campaign"""
        return self._make_request("DELETE", f"emailCampaigns/{campaign_id}")
    
    # ==================== SMS CAMPAIGNS ====================
    
    def create_sms_campaign(self, name: str, content: str, sender: str,
                           recipients: Optional[List[str]] = None) -> Dict[str, Any]:
        """Create an SMS campaign"""
        payload = {
            "name": name,
            "content": content,
            "sender": sender
        }
        
        if recipients:
            payload["recipients"] = {"phoneNumbers": recipients}
        
        result = self._make_request("POST", "smsCampaigns", payload)
        if result.get("success"):
            return {"success": True, "campaign_id": result.get("data", {}).get("id")}
        return result
    
    def get_sms_campaigns(self, status: Optional[str] = None, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get list of SMS campaigns"""
        params = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        
        return self._make_request("GET", "smsCampaigns", params=params)
    
    def get_sms_campaign(self, campaign_id: int) -> Dict[str, Any]:
        """Get a specific SMS campaign"""
        return self._make_request("GET", f"smsCampaigns/{campaign_id}")
    
    def send_sms_campaign_now(self, campaign_id: int) -> Dict[str, Any]:
        """Send an SMS campaign immediately"""
        return self._make_request("POST", f"smsCampaigns/{campaign_id}/sendNow")
    
    def delete_sms_campaign(self, campaign_id: int) -> Dict[str, Any]:
        """Delete an SMS campaign"""
        return self._make_request("DELETE", f"smsCampaigns/{campaign_id}")
    
    # ==================== CONTACTS ====================
    
    def create_contact(self, email: str, attributes: Optional[Dict[str, Any]] = None,
                       sms: Optional[str] = None, list_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """Create a new contact in Brevo"""
        payload = {"email": email}
        
        if attributes:
            payload["attributes"] = attributes
        if sms:
            payload["attributes"] = payload.get("attributes", {})
            payload["attributes"]["SMS"] = sms
        if list_ids:
            payload["listIds"] = list_ids
        
        return self._make_request("POST", "contacts", payload)
    
    def update_contact(self, email: str, attributes: Dict[str, Any],
                       sms: Optional[str] = None) -> Dict[str, Any]:
        """Update an existing contact"""
        payload = {"attributes": attributes}
        
        if sms:
            payload["attributes"]["SMS"] = sms
        
        return self._make_request("PUT", f"contacts/{email}", payload)
    
    def get_contacts(self, limit: int = 50, offset: int = 0, modified_since: Optional[str] = None) -> Dict[str, Any]:
        """Get paginated list of contacts"""
        params = {"limit": limit, "offset": offset}
        if modified_since:
            params["modifiedSince"] = modified_since
        
        return self._make_request("GET", "contacts", params=params)
    
    def get_contact(self, identifier: str) -> Dict[str, Any]:
        """Get a single contact by email or ID"""
        return self._make_request("GET", f"contacts/{identifier}")
    
    def delete_contact(self, identifier: str) -> Dict[str, Any]:
        """Delete a contact"""
        return self._make_request("DELETE", f"contacts/{identifier}")
    
    def import_contacts(self, contacts: List[Dict[str, Any]], list_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """Bulk import contacts"""
        # Format contacts for Brevo API
        json_body = []
        for contact in contacts:
            c = {"email": contact.get("email")}
            attrs = {}
            if contact.get("first_name"):
                attrs["PRENOM"] = contact["first_name"]
            if contact.get("last_name"):
                attrs["NOM"] = contact["last_name"]
            if contact.get("phone"):
                attrs["SMS"] = contact["phone"]
            if contact.get("company"):
                attrs["SOCIETE"] = contact["company"]
            if contact.get("attributes"):
                attrs.update(contact["attributes"])
            if attrs:
                c["attributes"] = attrs
            json_body.append(c)
        
        payload = {"jsonBody": json_body}
        if list_ids:
            payload["listIds"] = list_ids
        
        return self._make_request("POST", "contacts/import", payload)
    
    # ==================== CONTACT LISTS ====================
    
    def get_lists(self, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get all contact lists"""
        params = {"limit": limit, "offset": offset}
        return self._make_request("GET", "contacts/lists", params=params)
    
    def create_list(self, name: str, folder_id: Optional[int] = None) -> Dict[str, Any]:
        """Create a new contact list"""
        payload = {"name": name}
        if folder_id:
            payload["folderId"] = folder_id
        
        return self._make_request("POST", "contacts/lists", payload)
    
    def get_list(self, list_id: int) -> Dict[str, Any]:
        """Get a specific list"""
        return self._make_request("GET", f"contacts/lists/{list_id}")
    
    def delete_list(self, list_id: int) -> Dict[str, Any]:
        """Delete a contact list"""
        return self._make_request("DELETE", f"contacts/lists/{list_id}")
    
    def add_contacts_to_list(self, list_id: int, emails: List[str]) -> Dict[str, Any]:
        """Add contacts to a list"""
        payload = {"emails": emails}
        return self._make_request("POST", f"contacts/lists/{list_id}/contacts/add", payload)
    
    def remove_contacts_from_list(self, list_id: int, emails: List[str]) -> Dict[str, Any]:
        """Remove contacts from a list"""
        payload = {"emails": emails}
        return self._make_request("POST", f"contacts/lists/{list_id}/contacts/remove", payload)
    
    # ==================== STATISTICS ====================
    
    def get_email_statistics(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        """Get global email statistics"""
        params = {}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        return self._make_request("GET", "smtp/statistics/aggregatedReport", params=params)
    
    def get_sms_statistics(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        """Get SMS statistics"""
        params = {}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        return self._make_request("GET", "transactionalSMS/statistics/reports", params=params)


# ==================== DEPENDENCY ====================

def get_brevo_service():
    """Get Brevo service instance"""
    if not BREVO_API_KEY:
        raise HTTPException(status_code=503, detail="Clé API Brevo non configurée")
    return BrevoService(BREVO_API_KEY)


# ==================== EMAIL CAMPAIGN ROUTES ====================

@router.get("/templates")
async def get_email_templates(current_user: dict = Depends(get_current_user)):
    """Get available email templates"""
    templates_list = []
    for template_id, template in EMAIL_TEMPLATES.items():
        templates_list.append({
            "id": template["id"],
            "name": template["name"],
            "description": template["description"],
            "preview_image": template["preview_image"],
            "subject_template": template["subject_template"]
        })
    return templates_list


@router.get("/templates/{template_id}")
async def get_email_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific email template with full HTML"""
    if template_id not in EMAIL_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template non trouvé")
    
    return EMAIL_TEMPLATES[template_id]


@router.post("/email/create")
async def create_email_campaign(
    payload: EmailCampaignCreate,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Créer une nouvelle campagne email"""
    result = brevo.create_email_campaign(
        name=payload.name,
        subject=payload.subject,
        html_content=payload.html_content,
        sender_name=payload.sender_name,
        sender_email=payload.sender_email,
        list_ids=payload.list_ids,
        reply_to=payload.reply_to
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.get("/email/list")
async def list_email_campaigns(
    status: Optional[str] = Query(None, description="Filter by status: draft, sent, queued, etc."),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Lister les campagnes email"""
    result = brevo.get_email_campaigns(status=status, limit=limit, offset=offset)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.get("/email/{campaign_id}")
async def get_email_campaign(
    campaign_id: int,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Obtenir les détails d'une campagne email"""
    result = brevo.get_email_campaign(campaign_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.post("/email/{campaign_id}/send-now")
async def send_email_campaign_now(
    campaign_id: int,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Envoyer une campagne email immédiatement"""
    result = brevo.send_email_campaign_now(campaign_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Campagne envoyée avec succès"}

@router.post("/email/{campaign_id}/schedule")
async def schedule_email_campaign(
    campaign_id: int,
    scheduled_at: str = Query(..., description="ISO 8601 datetime (e.g., 2024-01-15T10:00:00Z)"),
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Programmer une campagne email"""
    result = brevo.schedule_email_campaign(campaign_id, scheduled_at)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Campagne programmée avec succès"}

@router.post("/email/{campaign_id}/test")
async def send_test_email(
    campaign_id: int,
    emails: List[EmailStr],
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Envoyer un email de test"""
    result = brevo.send_test_email(campaign_id, emails)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Email de test envoyé"}

@router.delete("/email/{campaign_id}")
async def delete_email_campaign(
    campaign_id: int,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Supprimer une campagne email"""
    result = brevo.delete_email_campaign(campaign_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Campagne supprimée"}


# ==================== SMS CAMPAIGN ROUTES ====================

@router.post("/sms/create")
async def create_sms_campaign(
    payload: SMSCampaignCreate,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Créer une nouvelle campagne SMS"""
    # Validate content length
    if len(payload.content) > 160:
        raise HTTPException(status_code=400, detail="Le contenu SMS ne doit pas dépasser 160 caractères")
    
    result = brevo.create_sms_campaign(
        name=payload.name,
        content=payload.content,
        sender=payload.sender,
        recipients=payload.recipients
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.get("/sms/list")
async def list_sms_campaigns(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Lister les campagnes SMS"""
    result = brevo.get_sms_campaigns(status=status, limit=limit, offset=offset)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.get("/sms/{campaign_id}")
async def get_sms_campaign(
    campaign_id: int,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Obtenir les détails d'une campagne SMS"""
    result = brevo.get_sms_campaign(campaign_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.post("/sms/{campaign_id}/send-now")
async def send_sms_campaign_now(
    campaign_id: int,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Envoyer une campagne SMS immédiatement"""
    result = brevo.send_sms_campaign_now(campaign_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Campagne SMS envoyée avec succès"}

@router.delete("/sms/{campaign_id}")
async def delete_sms_campaign(
    campaign_id: int,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Supprimer une campagne SMS"""
    result = brevo.delete_sms_campaign(campaign_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Campagne SMS supprimée"}


# ==================== CONTACTS ROUTES ====================

@router.post("/contacts/create")
async def create_contact(
    payload: ContactCreate,
    list_ids: Optional[List[int]] = Query(None),
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Créer un nouveau contact dans Brevo"""
    attributes = payload.attributes or {}
    if payload.first_name:
        attributes["PRENOM"] = payload.first_name
    if payload.last_name:
        attributes["NOM"] = payload.last_name
    if payload.company:
        attributes["SOCIETE"] = payload.company
    
    result = brevo.create_contact(
        email=payload.email,
        attributes=attributes,
        sms=payload.phone,
        list_ids=list_ids
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Contact créé avec succès"}

@router.put("/contacts/{email}")
async def update_contact(
    email: str,
    payload: ContactUpdate,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Mettre à jour un contact existant"""
    attributes = payload.attributes or {}
    if payload.first_name:
        attributes["PRENOM"] = payload.first_name
    if payload.last_name:
        attributes["NOM"] = payload.last_name
    if payload.company:
        attributes["SOCIETE"] = payload.company
    
    result = brevo.update_contact(
        email=email,
        attributes=attributes,
        sms=payload.phone
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Contact mis à jour"}

@router.get("/contacts/list")
async def list_contacts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Lister les contacts Brevo"""
    result = brevo.get_contacts(limit=limit, offset=offset)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.get("/contacts/{identifier}")
async def get_contact(
    identifier: str,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Obtenir un contact par email ou ID"""
    result = brevo.get_contact(identifier)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.delete("/contacts/{identifier}")
async def delete_contact(
    identifier: str,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Supprimer un contact"""
    result = brevo.delete_contact(identifier)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Contact supprimé"}

@router.post("/contacts/import")
async def bulk_import_contacts(
    payload: BulkContactImport,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Importer plusieurs contacts en masse"""
    contacts_data = [
        {
            "email": c.email,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "phone": c.phone,
            "company": c.company,
            "attributes": c.attributes
        }
        for c in payload.contacts
    ]
    
    result = brevo.import_contacts(contacts_data, payload.list_ids)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": f"{len(payload.contacts)} contacts importés"}


# ==================== CONTACT LISTS ROUTES ====================

@router.get("/lists")
async def get_contact_lists(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Lister les listes de contacts"""
    result = brevo.get_lists(limit=limit, offset=offset)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.post("/lists/create")
async def create_contact_list(
    payload: ContactListCreate,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Créer une nouvelle liste de contacts"""
    result = brevo.create_list(name=payload.name, folder_id=payload.folder_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.get("/lists/{list_id}")
async def get_contact_list(
    list_id: int,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Obtenir les détails d'une liste"""
    result = brevo.get_list(list_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.delete("/lists/{list_id}")
async def delete_contact_list(
    list_id: int,
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Supprimer une liste de contacts"""
    result = brevo.delete_list(list_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": "Liste supprimée"}

@router.post("/lists/{list_id}/contacts/add")
async def add_contacts_to_list(
    list_id: int,
    emails: List[EmailStr],
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Ajouter des contacts à une liste"""
    result = brevo.add_contacts_to_list(list_id, emails)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": f"{len(emails)} contacts ajoutés à la liste"}

@router.post("/lists/{list_id}/contacts/remove")
async def remove_contacts_from_list(
    list_id: int,
    emails: List[EmailStr],
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Retirer des contacts d'une liste"""
    result = brevo.remove_contacts_from_list(list_id, emails)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"success": True, "message": f"{len(emails)} contacts retirés de la liste"}


# ==================== STATISTICS ROUTES ====================

@router.get("/statistics/email")
async def get_email_statistics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Obtenir les statistiques globales email"""
    result = brevo.get_email_statistics(start_date=start_date, end_date=end_date)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})

@router.get("/statistics/sms")
async def get_sms_statistics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    brevo: BrevoService = Depends(get_brevo_service)
):
    """Obtenir les statistiques SMS"""
    result = brevo.get_sms_statistics(start_date=start_date, end_date=end_date)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result.get("data", {})
