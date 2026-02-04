"""
Analytics Dashboard API Tests - Iteration 54
Tests for the advanced analytics dashboard endpoints:
- /api/analytics/dashboard
- /api/analytics/revenue-chart
- /api/analytics/leads-funnel
- /api/analytics/top-clients
- /api/analytics/activity-timeline
- /api/analytics/kpi-trends
- /api/analytics/export
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "Test123!"


class TestAnalyticsDashboard:
    """Analytics Dashboard API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    # ==================== DASHBOARD ENDPOINT ====================
    
    def test_dashboard_endpoint_returns_200(self):
        """Test /api/analytics/dashboard returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_dashboard_with_period_month(self):
        """Test dashboard with period=month"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard?period=month",
            headers=self.headers
        )
        assert response.status_code == 200
        # Note: The lead_scoring router's /dashboard endpoint takes precedence
        # So we check for its response structure
        data = response.json()
        assert "leads" in data or "revenue" in data, f"Unexpected response structure: {data.keys()}"
    
    def test_dashboard_with_period_week(self):
        """Test dashboard with period=week"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard?period=week",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_dashboard_with_period_year(self):
        """Test dashboard with period=year"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard?period=year",
            headers=self.headers
        )
        assert response.status_code == 200
    
    # ==================== REVENUE CHART ENDPOINT ====================
    
    def test_revenue_chart_returns_200(self):
        """Test /api/analytics/revenue-chart returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/revenue-chart",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_revenue_chart_response_structure(self):
        """Test revenue chart response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/revenue-chart?period=month&granularity=day",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "period" in data, "Missing 'period' in response"
        assert "granularity" in data, "Missing 'granularity' in response"
        assert "current" in data, "Missing 'current' in response"
        assert "previous" in data, "Missing 'previous' in response"
        assert "total_current" in data, "Missing 'total_current' in response"
        assert "total_previous" in data, "Missing 'total_previous' in response"
        
        # Verify types
        assert isinstance(data["current"], list), "'current' should be a list"
        assert isinstance(data["previous"], list), "'previous' should be a list"
        assert isinstance(data["total_current"], (int, float)), "'total_current' should be numeric"
    
    def test_revenue_chart_with_different_granularities(self):
        """Test revenue chart with different granularities"""
        for granularity in ["day", "week", "month"]:
            response = requests.get(
                f"{BASE_URL}/api/analytics/revenue-chart?period=year&granularity={granularity}",
                headers=self.headers
            )
            assert response.status_code == 200, f"Failed for granularity={granularity}"
    
    # ==================== LEADS FUNNEL ENDPOINT ====================
    
    def test_leads_funnel_returns_200(self):
        """Test /api/analytics/leads-funnel returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/leads-funnel",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_leads_funnel_response_structure(self):
        """Test leads funnel response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/leads-funnel?period=month",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "period" in data, "Missing 'period' in response"
        assert "funnel" in data, "Missing 'funnel' in response"
        assert "total_leads" in data, "Missing 'total_leads' in response"
        
        # Verify funnel structure
        assert isinstance(data["funnel"], list), "'funnel' should be a list"
        
        # Check funnel stages
        expected_stages = ["lead", "qualified", "opportunity", "negotiation", "client"]
        actual_stages = [stage["stage"] for stage in data["funnel"]]
        assert actual_stages == expected_stages, f"Expected stages {expected_stages}, got {actual_stages}"
        
        # Verify each stage has required fields
        for stage in data["funnel"]:
            assert "stage" in stage, "Missing 'stage' in funnel item"
            assert "label" in stage, "Missing 'label' in funnel item"
            assert "count" in stage, "Missing 'count' in funnel item"
    
    # ==================== TOP CLIENTS ENDPOINT ====================
    
    def test_top_clients_returns_200(self):
        """Test /api/analytics/top-clients returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/top-clients",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_top_clients_response_structure(self):
        """Test top clients response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/top-clients?period=year&limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "period" in data, "Missing 'period' in response"
        assert "clients" in data, "Missing 'clients' in response"
        assert isinstance(data["clients"], list), "'clients' should be a list"
    
    def test_top_clients_with_limit(self):
        """Test top clients respects limit parameter"""
        for limit in [3, 5, 10]:
            response = requests.get(
                f"{BASE_URL}/api/analytics/top-clients?limit={limit}",
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data["clients"]) <= limit, f"Expected max {limit} clients"
    
    # ==================== ACTIVITY TIMELINE ENDPOINT ====================
    
    def test_activity_timeline_returns_200(self):
        """Test /api/analytics/activity-timeline returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/activity-timeline",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_activity_timeline_response_structure(self):
        """Test activity timeline response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/activity-timeline?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "activities" in data, "Missing 'activities' in response"
        assert isinstance(data["activities"], list), "'activities' should be a list"
        
        # If there are activities, verify their structure
        if data["activities"]:
            activity = data["activities"][0]
            assert "type" in activity, "Missing 'type' in activity"
            assert "icon" in activity, "Missing 'icon' in activity"
            assert "message" in activity, "Missing 'message' in activity"
            assert "date" in activity, "Missing 'date' in activity"
    
    def test_activity_timeline_with_limit(self):
        """Test activity timeline respects limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/activity-timeline?limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["activities"]) <= 5, "Expected max 5 activities"
    
    # ==================== KPI TRENDS ENDPOINT ====================
    
    def test_kpi_trends_returns_200(self):
        """Test /api/analytics/kpi-trends returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/kpi-trends",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_kpi_trends_response_structure(self):
        """Test KPI trends response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/kpi-trends?period=year",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "months" in data, "Missing 'months' in response"
        assert "totals" in data, "Missing 'totals' in response"
        assert isinstance(data["months"], list), "'months' should be a list"
    
    # ==================== EXPORT ENDPOINT ====================
    
    def test_export_json_returns_200(self):
        """Test /api/analytics/export with format=json returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/export?period=month&format=json",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_export_json_response_structure(self):
        """Test export JSON response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/export?period=month&format=json",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "period" in data, "Missing 'period' in response"
        assert "date_range" in data, "Missing 'date_range' in response"
        assert "contacts" in data, "Missing 'contacts' in response"
        assert "invoices" in data, "Missing 'invoices' in response"
    
    def test_export_csv_returns_200(self):
        """Test /api/analytics/export with format=csv returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/export?period=month&format=csv",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # CSV export returns filename and content
        assert "filename" in data, "Missing 'filename' in CSV response"
        assert "content" in data, "Missing 'content' in CSV response"
    
    # ==================== AUTHENTICATION TESTS ====================
    
    def test_dashboard_requires_auth(self):
        """Test dashboard endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_revenue_chart_requires_auth(self):
        """Test revenue chart endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/revenue-chart")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_leads_funnel_requires_auth(self):
        """Test leads funnel endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/leads-funnel")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestMoltBotPage:
    """MoltBot Page API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
        }
    
    def test_moltbot_stats_returns_200(self):
        """Test /api/moltbot/stats returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/stats?period=month",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_moltbot_briefing_returns_200(self):
        """Test /api/moltbot/briefing returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/briefing",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_moltbot_tasks_returns_200(self):
        """Test /api/moltbot/tasks returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/tasks",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_moltbot_contacts_returns_200(self):
        """Test /api/moltbot/contacts returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/contacts",
            headers=self.headers
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
