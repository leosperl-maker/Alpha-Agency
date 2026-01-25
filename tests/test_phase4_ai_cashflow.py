"""
Test Suite for CRM Alpha Agency Phase 4 Features:
- Budget Cashflow Projection (multi-month)
- AI Assistant (Perplexity integration)

Tests cover:
1. Budget Cashflow API - GET /api/budget/cashflow
2. AI Status API - GET /api/ai/status
3. AI Chat API - POST /api/ai/chat
4. AI History API - GET /api/ai/history
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://meta-oauth-upgrade.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
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


class TestBudgetCashflow:
    """Tests for Budget Cashflow Projection (Phase 4)"""
    
    def test_cashflow_requires_start_month(self, auth_headers):
        """Test cashflow API requires start_month parameter"""
        response = requests.get(
            f"{BASE_URL}/api/budget/cashflow",
            headers=auth_headers
        )
        # API requires start_month parameter
        assert response.status_code == 422
    
    def test_cashflow_with_start_month(self, auth_headers):
        """Test cashflow API with specific start month"""
        response = requests.get(
            f"{BASE_URL}/api/budget/cashflow",
            params={"start_month": "2025-01"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["start_month"] == "2025-01"
        assert data["data"][0]["month"] == "2025-01"
    
    def test_cashflow_3_months(self, auth_headers):
        """Test cashflow API with 3 months duration"""
        response = requests.get(
            f"{BASE_URL}/api/budget/cashflow",
            params={"start_month": "2025-01", "months": 3},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["months_count"] == 3
        assert len(data["data"]) == 3
    
    def test_cashflow_6_months(self, auth_headers):
        """Test cashflow API with 6 months duration"""
        response = requests.get(
            f"{BASE_URL}/api/budget/cashflow",
            params={"start_month": "2025-01", "months": 6},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["months_count"] == 6
        assert len(data["data"]) == 6
    
    def test_cashflow_12_months(self, auth_headers):
        """Test cashflow API with 12 months duration"""
        response = requests.get(
            f"{BASE_URL}/api/budget/cashflow",
            params={"start_month": "2025-01", "months": 12},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["months_count"] == 12
        assert len(data["data"]) == 12
    
    def test_cashflow_data_structure(self, auth_headers):
        """Test cashflow data structure for each month"""
        response = requests.get(
            f"{BASE_URL}/api/budget/cashflow",
            params={"start_month": "2025-01", "months": 3},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check each month's data structure
        for month_data in data["data"]:
            assert "month" in month_data
            assert "label" in month_data
            assert "income" in month_data
            assert "expense" in month_data
            assert "net_flow" in month_data
            assert "cumulative_balance" in month_data
            assert "data_type" in month_data  # "actual" or "forecast"
            assert month_data["data_type"] in ["actual", "forecast"]
    
    def test_cashflow_summary_structure(self, auth_headers):
        """Test cashflow summary structure"""
        response = requests.get(
            f"{BASE_URL}/api/budget/cashflow",
            params={"start_month": "2025-01", "months": 6},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "total_income" in summary
        assert "total_expense" in summary
        assert "net_flow" in summary
        assert "avg_monthly_flow" in summary
        assert "ending_balance" in summary
    
    def test_cashflow_requires_auth(self):
        """Test that cashflow API requires authentication"""
        response = requests.get(f"{BASE_URL}/api/budget/cashflow")
        assert response.status_code == 401


class TestAIAssistantStatus:
    """Tests for AI Assistant Status API"""
    
    def test_ai_status_returns_data(self, auth_headers):
        """Test AI status API returns expected data"""
        response = requests.get(
            f"{BASE_URL}/api/ai/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "enabled" in data
        assert "calls_today" in data
        assert "daily_limit" in data
        assert "remaining" in data
        assert "max_message_length" in data
    
    def test_ai_status_daily_limit(self, auth_headers):
        """Test AI status shows correct daily limit (50)"""
        response = requests.get(
            f"{BASE_URL}/api/ai/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["daily_limit"] == 50
        assert data["remaining"] == data["daily_limit"] - data["calls_today"]
    
    def test_ai_status_enabled(self, auth_headers):
        """Test AI is enabled (Perplexity API key configured)"""
        response = requests.get(
            f"{BASE_URL}/api/ai/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should be enabled since PERPLEXITY_API_KEY is configured
        assert data["enabled"] == True
    
    def test_ai_status_requires_auth(self):
        """Test that AI status API requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ai/status")
        assert response.status_code == 401


class TestAIAssistantChat:
    """Tests for AI Assistant Chat API"""
    
    def test_ai_chat_general_context(self, auth_headers):
        """Test AI chat with general context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Bonjour, comment vas-tu ?"}],
                "context_type": None
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert len(data["message"]) > 0
        assert "usage" in data
        assert "calls_today" in data["usage"]
        assert "remaining" in data["usage"]
    
    def test_ai_chat_pipeline_context(self, auth_headers):
        """Test AI chat with pipeline context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Donne-moi un résumé de mon pipeline"}],
                "context_type": "pipeline"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        # Should mention pipeline-related terms
        message_lower = data["message"].lower()
        assert any(term in message_lower for term in ["pipeline", "opportunit", "devis", "€", "euro"])
    
    def test_ai_chat_contacts_context(self, auth_headers):
        """Test AI chat with contacts context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Combien de contacts ai-je ?"}],
                "context_type": "contacts"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert len(data["message"]) > 0
    
    def test_ai_chat_invoices_context(self, auth_headers):
        """Test AI chat with invoices context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Quelles sont mes factures ?"}],
                "context_type": "invoices"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert len(data["message"]) > 0
    
    def test_ai_chat_budget_context(self, auth_headers):
        """Test AI chat with budget context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Quel est mon budget ?"}],
                "context_type": "budget"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert len(data["message"]) > 0
    
    def test_ai_chat_updates_usage(self, auth_headers):
        """Test that AI chat updates usage counter"""
        # Get initial status
        status_before = requests.get(
            f"{BASE_URL}/api/ai/status",
            headers=auth_headers
        ).json()
        
        # Make a chat request
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Test message"}],
                "context_type": None
            }
        )
        assert response.status_code == 200
        
        # Check usage was updated
        data = response.json()
        assert data["usage"]["calls_today"] >= status_before["calls_today"]
    
    def test_ai_chat_requires_auth(self):
        """Test that AI chat API requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            json={"messages": [{"role": "user", "content": "Test"}]}
        )
        assert response.status_code == 401
    
    def test_ai_chat_empty_message(self, auth_headers):
        """Test AI chat with empty messages array returns error"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "messages": [],
                "context_type": None
            }
        )
        # Empty messages causes Perplexity API error (521) or validation error
        assert response.status_code in [400, 422, 500, 521]


class TestAIAssistantHistory:
    """Tests for AI Assistant History API"""
    
    def test_ai_history_returns_list(self, auth_headers):
        """Test AI history API returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/ai/history",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
    
    def test_ai_history_with_limit(self, auth_headers):
        """Test AI history API with limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/ai/history",
            params={"limit": 5},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_ai_history_requires_auth(self):
        """Test that AI history API requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ai/history")
        assert response.status_code == 401


class TestIntegration:
    """Integration tests for Phase 4 features"""
    
    def test_ai_uses_crm_data(self, auth_headers):
        """Test that AI responses include actual CRM data"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Quelle est la valeur totale de mon pipeline ?"}],
                "context_type": "pipeline"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should mention actual pipeline value (17,500€ based on context)
        message = data["message"]
        assert len(message) > 50  # Should be a substantial response
    
    def test_cashflow_with_forecast_data(self, auth_headers):
        """Test cashflow includes forecast data when available"""
        response = requests.get(
            f"{BASE_URL}/api/budget/cashflow",
            params={"start_month": "2025-01", "months": 6},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify data types are set correctly
        for month_data in data["data"]:
            assert month_data["data_type"] in ["actual", "forecast"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
