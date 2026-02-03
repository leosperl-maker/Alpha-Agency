"""
WhatsApp Integration Tests for MoltBot CRM
Tests: /api/whatsapp/status, /api/whatsapp/config, /api/whatsapp/test-briefing
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MOLTBOT_SECRET = "moltbot-alpha-secret-2024"

class TestWhatsAppStatus:
    """Tests for /api/whatsapp/status endpoint"""
    
    def test_status_returns_200(self):
        """Status endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status")
        assert response.status_code == 200
    
    def test_status_returns_connection_info(self):
        """Status should return connected boolean"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status")
        data = response.json()
        assert "connected" in data
        assert isinstance(data["connected"], bool)
    
    def test_status_returns_phone_when_connected(self):
        """When connected, status should return phone_number and name"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status")
        data = response.json()
        if data.get("connected"):
            assert "phone_number" in data
            assert "name" in data
            assert "last_connected" in data


class TestWhatsAppConfig:
    """Tests for /api/whatsapp/config endpoint"""
    
    def test_config_returns_200(self):
        """Config endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/config")
        assert response.status_code == 200
    
    def test_config_returns_scheduler_settings(self):
        """Config should return briefing scheduler settings"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/config")
        data = response.json()
        
        # Check required fields
        assert "morning_briefing" in data
        assert "morning_time" in data
        assert "evening_recap" in data
        assert "evening_time" in data
    
    def test_config_returns_correct_types(self):
        """Config values should have correct types"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/config")
        data = response.json()
        
        assert isinstance(data.get("morning_briefing"), bool)
        assert isinstance(data.get("evening_recap"), bool)
        assert isinstance(data.get("morning_time"), str)
        assert isinstance(data.get("evening_time"), str)
    
    def test_config_post_requires_secret(self):
        """POST config should require X-MoltBot-Secret header"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/config",
            json={
                "admin_phone": "+590690123456",
                "morning_briefing": True,
                "morning_time": "08:00",
                "evening_recap": True,
                "evening_time": "18:00"
            }
        )
        assert response.status_code == 401
    
    def test_config_post_with_secret(self):
        """POST config with valid secret should work"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/config",
            headers={"X-MoltBot-Secret": MOLTBOT_SECRET},
            json={
                "admin_phone": "+596696447353",
                "morning_briefing": True,
                "morning_time": "08:00",
                "evening_recap": True,
                "evening_time": "18:00",
                "notify_new_leads": True,
                "notify_payments": True,
                "notify_overdue": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True


class TestWhatsAppTestBriefing:
    """Tests for /api/whatsapp/test-briefing endpoint"""
    
    def test_test_briefing_requires_secret(self):
        """Test briefing should require X-MoltBot-Secret header"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/test-briefing?briefing_type=morning"
        )
        assert response.status_code == 401
    
    def test_test_briefing_morning_with_secret(self):
        """Morning briefing with valid secret should work"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/test-briefing?briefing_type=morning",
            headers={
                "X-MoltBot-Secret": MOLTBOT_SECRET,
                "Content-Type": "application/json"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "Briefing morning envoyé" in data.get("message", "")
        assert "preview" in data
    
    def test_test_briefing_evening_with_secret(self):
        """Evening briefing with valid secret should work"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/test-briefing?briefing_type=evening",
            headers={
                "X-MoltBot-Secret": MOLTBOT_SECRET,
                "Content-Type": "application/json"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "Briefing evening envoyé" in data.get("message", "")
        assert "preview" in data
    
    def test_test_briefing_preview_content(self):
        """Briefing preview should contain expected content"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/test-briefing?briefing_type=morning",
            headers={
                "X-MoltBot-Secret": MOLTBOT_SECRET,
                "Content-Type": "application/json"
            }
        )
        data = response.json()
        preview = data.get("preview", "")
        
        # Morning briefing should contain these elements
        assert "Briefing" in preview or "☀️" in preview
        assert "Tâches" in preview or "📋" in preview


class TestWhatsAppSendMessage:
    """Tests for /api/whatsapp/send endpoint"""
    
    def test_send_requires_secret(self):
        """Send message should require X-MoltBot-Secret header"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/send",
            json={
                "phone_number": "+590690123456",
                "message": "Test message"
            }
        )
        assert response.status_code == 401
    
    def test_send_with_secret(self):
        """Send message with valid secret should work (if WhatsApp connected)"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/send",
            headers={"X-MoltBot-Secret": MOLTBOT_SECRET},
            json={
                "phone_number": "+596696447353",
                "message": "Test message from pytest"
            }
        )
        # Should be 200 if connected, 500 if not connected
        assert response.status_code in [200, 500]


class TestWhatsAppQR:
    """Tests for /api/whatsapp/qr endpoint"""
    
    def test_qr_returns_200(self):
        """QR endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/qr")
        assert response.status_code == 200
    
    def test_qr_returns_connection_status(self):
        """QR endpoint should indicate connection status"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/qr")
        data = response.json()
        # Should have either qr code or connected status
        assert "qr" in data or "connected" in data or "message" in data


class TestWhatsAppWebhook:
    """Tests for /api/whatsapp/webhook endpoint"""
    
    def test_webhook_accepts_text_message(self):
        """Webhook should accept text messages"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json={
                "phone_number": "590690123456",
                "message": "aide",
                "message_type": "text"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
    
    def test_webhook_returns_reply_for_non_admin(self):
        """Webhook should return standard reply for non-admin"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json={
                "phone_number": "33612345678",
                "message": "bonjour",
                "message_type": "text"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert data.get("is_admin") == False


class TestWhatsAppMessages:
    """Tests for /api/whatsapp/messages endpoint"""
    
    def test_messages_requires_secret(self):
        """Messages endpoint should require X-MoltBot-Secret header"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/messages")
        assert response.status_code == 401
    
    def test_messages_with_secret(self):
        """Messages endpoint with valid secret should return history"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/messages",
            headers={"X-MoltBot-Secret": MOLTBOT_SECRET}
        )
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert "count" in data
        assert isinstance(data["messages"], list)
