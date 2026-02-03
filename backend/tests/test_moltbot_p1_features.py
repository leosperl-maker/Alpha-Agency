"""
MoltBot P1 Features Test Suite
Tests for:
1. Audio transcription with Whisper (via emergentintegrations)
2. WhatsApp bidirectional with audio support
3. Scheduler for automated briefings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAudioTranscriptionHistory:
    """Test /api/audio/history endpoint"""
    
    def test_history_requires_auth(self):
        """Test that history endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/audio/history")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "authentifié" in data["detail"].lower() or "non" in data["detail"].lower()
    
    def test_history_returns_200_with_auth(self, auth_headers):
        """Test that history endpoint returns 200 with valid auth"""
        response = requests.get(f"{BASE_URL}/api/audio/history", headers=auth_headers)
        assert response.status_code == 200
    
    def test_history_returns_transcription_list(self, auth_headers):
        """Test that history returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/audio/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "transcriptions" in data
        assert isinstance(data["transcriptions"], list)
        assert isinstance(data["count"], int)
    
    def test_history_with_limit_param(self, auth_headers):
        """Test history with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/audio/history?limit=5", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["transcriptions"]) <= 5


class TestAudioTranscribeEndpoint:
    """Test /api/audio/transcribe endpoint for file upload"""
    
    def test_transcribe_endpoint_exists(self, auth_headers):
        """Test that transcribe endpoint exists and validates input"""
        # Send empty file to check endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/audio/transcribe",
            headers={"Authorization": auth_headers["Authorization"]},
            files={"file": ("test.txt", b"", "text/plain")}
        )
        # Should return 400 for unsupported format, not 404
        assert response.status_code in [400, 422]
        data = response.json()
        assert "detail" in data
    
    def test_transcribe_validates_file_format(self, auth_headers):
        """Test that transcribe validates file format"""
        response = requests.post(
            f"{BASE_URL}/api/audio/transcribe",
            headers={"Authorization": auth_headers["Authorization"]},
            files={"file": ("test.txt", b"test content", "text/plain")}
        )
        assert response.status_code == 400
        data = response.json()
        assert "Format non supporté" in data["detail"]
        assert "mp3" in data["detail"]  # Should list supported formats
    
    def test_transcribe_requires_auth(self):
        """Test that transcribe requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/audio/transcribe",
            files={"file": ("test.mp3", b"", "audio/mpeg")}
        )
        assert response.status_code == 401


class TestAudioTranscribeUrlEndpoint:
    """Test /api/audio/transcribe-url endpoint for URL transcription"""
    
    def test_transcribe_url_endpoint_exists(self, auth_headers):
        """Test that transcribe-url endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/audio/transcribe-url",
            headers=auth_headers,
            json={"url": "https://example.com/nonexistent.mp3", "language": "fr"}
        )
        # Should return 400 for download failure, not 404
        assert response.status_code in [400, 500]
        data = response.json()
        assert "detail" in data or "error" in data
    
    def test_transcribe_url_validates_request(self, auth_headers):
        """Test that transcribe-url validates request body"""
        response = requests.post(
            f"{BASE_URL}/api/audio/transcribe-url",
            headers=auth_headers,
            json={}  # Missing required url field
        )
        assert response.status_code == 422  # Validation error
    
    def test_transcribe_url_requires_auth(self):
        """Test that transcribe-url requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/audio/transcribe-url",
            headers={"Content-Type": "application/json"},
            json={"url": "https://example.com/test.mp3"}
        )
        assert response.status_code == 401


class TestWhatsAppStatus:
    """Test /api/whatsapp/status endpoint"""
    
    def test_status_returns_200(self):
        """Test that status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status")
        assert response.status_code == 200
    
    def test_status_returns_connection_info(self):
        """Test that status returns connection information"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status")
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        assert isinstance(data["connected"], bool)
    
    def test_status_returns_setup_info_when_disconnected(self):
        """Test that status returns setup info when not connected"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status")
        data = response.json()
        if not data.get("connected"):
            assert "setup_required" in data or "message" in data


class TestWhatsAppConfig:
    """Test /api/whatsapp/config endpoint"""
    
    def test_config_returns_200(self):
        """Test that config endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/config")
        assert response.status_code == 200
    
    def test_config_returns_scheduler_settings(self):
        """Test that config returns scheduler settings"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/config")
        assert response.status_code == 200
        data = response.json()
        # Check for scheduler-related fields
        assert "morning_briefing" in data
        assert "evening_recap" in data
        assert "morning_time" in data
        assert "evening_time" in data
    
    def test_config_returns_correct_types(self):
        """Test that config returns correct data types"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/config")
        data = response.json()
        assert isinstance(data.get("morning_briefing"), bool)
        assert isinstance(data.get("evening_recap"), bool)
        assert isinstance(data.get("morning_time"), str)
        assert isinstance(data.get("evening_time"), str)


class TestWhatsAppWebhook:
    """Test /api/whatsapp/webhook endpoint"""
    
    def test_webhook_accepts_text_message(self):
        """Test that webhook accepts text messages"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json={
                "phone_number": "+590690123456",
                "message": "test message",
                "message_type": "text"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
    
    def test_webhook_accepts_audio_message_with_url(self):
        """Test that webhook accepts audio messages with audio_url"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json={
                "phone_number": "+590690123456",
                "message": "",
                "message_type": "audio",
                "audio_url": "https://example.com/test.ogg"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
    
    def test_webhook_returns_reply_for_non_admin(self):
        """Test that webhook returns appropriate reply for non-admin"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json={
                "phone_number": "+33612345678",
                "message": "bonjour",
                "message_type": "text"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert "is_admin" in data
        # Non-admin should get standard response
        if not data.get("is_admin"):
            assert "Alpha Agency" in data["reply"] or "0691 266 003" in data["reply"]
    
    def test_webhook_validates_request_body(self):
        """Test that webhook validates request body"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json={}  # Missing required fields
        )
        assert response.status_code == 422  # Validation error
    
    def test_webhook_handles_admin_commands(self):
        """Test that webhook processes admin commands"""
        # Note: This test may not work if MOLTBOT_ADMIN_PHONES is not configured
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json={
                "phone_number": "+590690123456",
                "message": "aide",
                "message_type": "text"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data


class TestSchedulerIntegration:
    """Test scheduler-related endpoints"""
    
    def test_briefing_endpoint_exists(self, auth_headers):
        """Test that briefing endpoint exists"""
        # The scheduler uses internal functions, but we can test the WhatsApp send-briefing endpoint
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/send-briefing",
            params={"phone_number": "+590690123456"},
            headers={"X-MoltBot-Secret": "moltbot-alpha-secret-2024"}
        )
        # Should work or fail gracefully (WhatsApp service not running)
        assert response.status_code in [200, 500]
    
    def test_recap_endpoint_exists(self, auth_headers):
        """Test that recap endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/send-recap",
            params={"phone_number": "+590690123456"},
            headers={"X-MoltBot-Secret": "moltbot-alpha-secret-2024"}
        )
        # Should work or fail gracefully (WhatsApp service not running)
        assert response.status_code in [200, 500]


class TestMoltBotPageAPI:
    """Test MoltBot page related APIs"""
    
    def test_moltbot_stats_endpoint(self, auth_headers):
        """Test MoltBot stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/stats?period=month",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Should return stats structure
        assert "revenue" in data or "contacts" in data or "tasks" in data
    
    def test_moltbot_briefing_endpoint(self, auth_headers):
        """Test MoltBot briefing endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/briefing",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Should return briefing structure
        assert "tasks" in data or "appointments" in data or "stats" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
