"""
Test suite for MoltBot CRM new features - Iteration 51
Features tested:
- Gmail Integration (OAuth flow, status)
- Voice-to-CRM (AI analysis)
- Lead Scoring (scores, grades)
- Churn Alerts
- Analytics Dashboard & PDF
- Multi-platform Social Preview
- Hashtag Suggestions
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://social-command-10.preview.emergentagent.com')

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
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


# ===========================================
# GMAIL INTEGRATION TESTS
# ===========================================

class TestGmailIntegration:
    """Gmail OAuth integration tests"""
    
    def test_gmail_auth_returns_authorization_url(self, auth_headers):
        """GET /api/moltbot/gmail/auth - Should return OAuth URL"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/gmail/auth",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "authorization_url" in data
        assert "state" in data
        assert "accounts.google.com" in data["authorization_url"]
        assert "mail.google.com" in data["authorization_url"]  # Full Gmail scope
    
    def test_gmail_status_returns_connection_state(self, auth_headers):
        """GET /api/moltbot/gmail/status - Should return connection status"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/gmail/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        # If not connected, should be False
        if not data["connected"]:
            assert data["connected"] == False


# ===========================================
# VOICE-TO-CRM TESTS
# ===========================================

class TestVoiceToCRM:
    """Voice-to-CRM AI analysis tests"""
    
    def test_voice_to_crm_creates_contact(self, auth_headers):
        """POST /api/audio/voice-to-crm - Should create contact from voice text"""
        response = requests.post(
            f"{BASE_URL}/api/audio/voice-to-crm",
            headers=auth_headers,
            json={
                "audio_text": "Nouveau contact Marie Martin de la société TechCorp téléphone 0612345678 email marie@techcorp.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "contact"
        assert data["entity_id"] is not None
        assert "Marie" in data["message"] or "contact" in data["message"].lower()
    
    def test_voice_to_crm_creates_task(self, auth_headers):
        """POST /api/audio/voice-to-crm - Should create task from voice text"""
        response = requests.post(
            f"{BASE_URL}/api/audio/voice-to-crm",
            headers=auth_headers,
            json={
                "audio_text": "Rappeler le client Dupont demain à 14h pour le devis"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "task"
        assert data["entity_id"] is not None
    
    def test_voice_to_crm_empty_text_returns_error(self, auth_headers):
        """POST /api/audio/voice-to-crm - Should return error for empty text"""
        response = requests.post(
            f"{BASE_URL}/api/audio/voice-to-crm",
            headers=auth_headers,
            json={"audio_text": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False


# ===========================================
# LEAD SCORING TESTS
# ===========================================

class TestLeadScoring:
    """Lead scoring and grading tests"""
    
    def test_get_all_lead_scores(self, auth_headers):
        """GET /api/analytics/lead-scores - Should return all lead scores"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/lead-scores",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert "count" in data
        assert "summary" in data
        # Check summary has grade counts
        summary = data["summary"]
        assert "grade_A" in summary
        assert "grade_B" in summary
        assert "grade_C" in summary
        assert "grade_D" in summary
        assert "grade_F" in summary
    
    def test_lead_score_structure(self, auth_headers):
        """GET /api/analytics/lead-scores - Each lead should have proper structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/lead-scores?limit=5",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["count"] > 0:
            lead = data["leads"][0]
            assert "contact_id" in lead
            assert "contact_name" in lead
            assert "score" in lead
            assert "grade" in lead
            assert "factors" in lead
            assert "recommendations" in lead
            # Score should be 0-100
            assert 0 <= lead["score"] <= 100
            # Grade should be A-F
            assert lead["grade"] in ["A", "B", "C", "D", "F"]
    
    def test_get_single_lead_score(self, auth_headers):
        """GET /api/analytics/lead-score/{id} - Should return score for specific contact"""
        # First get a contact ID
        contacts_response = requests.get(
            f"{BASE_URL}/api/contacts?limit=1",
            headers=auth_headers
        )
        assert contacts_response.status_code == 200
        contacts = contacts_response.json()
        
        if len(contacts) > 0:
            contact_id = contacts[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/analytics/lead-score/{contact_id}",
                headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["contact_id"] == contact_id
            assert "score" in data
            assert "grade" in data


# ===========================================
# CHURN ALERTS TESTS
# ===========================================

class TestChurnAlerts:
    """Churn risk detection tests"""
    
    def test_get_churn_alerts(self, auth_headers):
        """GET /api/analytics/churn-alerts - Should return churn alerts"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/churn-alerts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        assert "count" in data
        assert "summary" in data
        # Summary should have risk levels
        summary = data["summary"]
        assert "critical" in summary
        assert "high" in summary
        assert "medium" in summary
        assert "low" in summary


# ===========================================
# ANALYTICS DASHBOARD TESTS
# ===========================================

class TestAnalyticsDashboard:
    """Analytics dashboard tests"""
    
    def test_get_analytics_dashboard(self, auth_headers):
        """GET /api/analytics/dashboard - Should return dashboard data"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert "clients" in data
        assert "revenue" in data
        assert "generated_at" in data


# ===========================================
# ANALYTICS REPORTS TESTS
# ===========================================

class TestAnalyticsReports:
    """Analytics PDF and JSON reports tests"""
    
    def test_get_analytics_json(self, auth_headers):
        """GET /api/reports/analytics-json - Should return analytics JSON"""
        response = requests.get(
            f"{BASE_URL}/api/reports/analytics-json",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period" in data
        assert "revenue" in data
        assert "leads" in data
        assert "clients" in data
        assert "tasks" in data
        assert "generated_at" in data
    
    def test_get_analytics_pdf(self, auth_headers):
        """GET /api/reports/analytics-pdf - Should return PDF file"""
        response = requests.get(
            f"{BASE_URL}/api/reports/analytics-pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF'


# ===========================================
# SOCIAL PREVIEW TESTS
# ===========================================

class TestSocialPreview:
    """Multi-platform social preview tests"""
    
    def test_get_platform_info(self, auth_headers):
        """GET /api/social/platform-info - Should return all platform configs"""
        response = requests.get(
            f"{BASE_URL}/api/social/platform-info",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "platforms" in data
        platforms = data["platforms"]
        # Check all platforms are present
        assert "twitter" in platforms
        assert "facebook" in platforms
        assert "instagram" in platforms
        assert "linkedin" in platforms
        assert "tiktok" in platforms
    
    def test_platform_info_has_limits(self, auth_headers):
        """GET /api/social/platform-info - Each platform should have limits"""
        response = requests.get(
            f"{BASE_URL}/api/social/platform-info",
            headers=auth_headers
        )
        data = response.json()
        
        for platform, config in data["platforms"].items():
            assert "char_limit" in config
            assert "hashtag_limit" in config
            assert "best_times" in config
    
    def test_multi_platform_preview(self, auth_headers):
        """POST /api/social/preview - Should generate previews for all platforms"""
        response = requests.post(
            f"{BASE_URL}/api/social/preview",
            headers=auth_headers,
            json={
                "content": {
                    "text": "Test post for social media preview",
                    "hashtags": ["test", "social", "marketing"]
                },
                "platforms": ["facebook", "instagram", "linkedin", "twitter"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "previews" in data
        assert len(data["previews"]) == 4
        
        for preview in data["previews"]:
            assert "platform" in preview
            assert "char_count" in preview
            assert "char_limit" in preview
            assert "is_valid" in preview
            assert "warnings" in preview
            assert "recommendations" in preview
    
    def test_preview_validates_character_limit(self, auth_headers):
        """POST /api/social/preview - Should warn when text exceeds limit"""
        # Create a very long text for Twitter (280 char limit)
        long_text = "A" * 300
        
        response = requests.post(
            f"{BASE_URL}/api/social/preview",
            headers=auth_headers,
            json={
                "content": {"text": long_text},
                "platforms": ["twitter"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        twitter_preview = data["previews"][0]
        assert twitter_preview["is_valid"] == False
        assert len(twitter_preview["warnings"]) > 0


# ===========================================
# HASHTAG SUGGESTIONS TESTS
# ===========================================

class TestHashtagSuggestions:
    """AI-powered hashtag suggestion tests"""
    
    def test_suggest_hashtags(self, auth_headers):
        """POST /api/social/suggest-hashtags - Should return AI-generated hashtags"""
        response = requests.post(
            f"{BASE_URL}/api/social/suggest-hashtags?text=Marketing%20digital%20pour%20entreprises&platform=instagram",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "hashtags" in data
        assert "platform" in data
        assert "optimal_count" in data
        assert "limit" in data
        # Should return some hashtags
        assert len(data["hashtags"]) > 0
    
    def test_suggest_hashtags_respects_platform(self, auth_headers):
        """POST /api/social/suggest-hashtags - Should respect platform limits"""
        response = requests.post(
            f"{BASE_URL}/api/social/suggest-hashtags?text=Business%20growth&platform=twitter",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["platform"] == "twitter"
        # Twitter has 5 hashtag limit
        assert data["limit"] == 5


# ===========================================
# AUTHENTICATION TESTS
# ===========================================

class TestAuthentication:
    """Authentication requirement tests"""
    
    def test_gmail_auth_requires_token(self):
        """Gmail auth should require authentication"""
        response = requests.get(f"{BASE_URL}/api/moltbot/gmail/auth")
        assert response.status_code == 401
    
    def test_lead_scores_requires_token(self):
        """Lead scores should require authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/lead-scores")
        assert response.status_code == 401
    
    def test_analytics_pdf_requires_token(self):
        """Analytics PDF should require authentication"""
        response = requests.get(f"{BASE_URL}/api/reports/analytics-pdf")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
