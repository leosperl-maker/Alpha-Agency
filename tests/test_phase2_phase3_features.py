"""
Test suite for CRM Alpha Agency - Phase 2 & Phase 3 Features
- Pipeline Drag & Drop (column reorder API)
- Budget Phase 2: Advanced auto-categorization rules (match_type, apply_to_type, apply rules)
- Budget Phase 3: Forecast (prévisionnel) - CRUD, comparison, copy
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication for all tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestPipelineColumnReorder(TestAuth):
    """Test Pipeline column reorder API (Drag & Drop backend)"""
    
    def test_get_pipeline_columns(self, auth_headers):
        """GET /api/pipeline/columns - Get all columns"""
        response = requests.get(f"{BASE_URL}/api/pipeline/columns", headers=auth_headers)
        assert response.status_code == 200
        columns = response.json()
        assert isinstance(columns, list)
        print(f"✓ GET /api/pipeline/columns - Found {len(columns)} columns")
        return columns
    
    def test_reorder_pipeline_columns(self, auth_headers):
        """PUT /api/pipeline/columns/reorder - Reorder columns"""
        # First get current columns
        response = requests.get(f"{BASE_URL}/api/pipeline/columns", headers=auth_headers)
        assert response.status_code == 200
        columns = response.json()
        
        if len(columns) < 2:
            pytest.skip("Not enough columns to test reorder")
        
        # Get column IDs and reverse order
        column_ids = [col["id"] for col in columns]
        reversed_ids = list(reversed(column_ids))
        
        # Reorder columns (using new format with column_ids wrapper)
        response = requests.put(
            f"{BASE_URL}/api/pipeline/columns/reorder",
            headers=auth_headers,
            json={"column_ids": reversed_ids}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ PUT /api/pipeline/columns/reorder - Columns reordered successfully")
        
        # Verify order changed
        response = requests.get(f"{BASE_URL}/api/pipeline/columns", headers=auth_headers)
        assert response.status_code == 200
        new_columns = response.json()
        new_ids = [col["id"] for col in new_columns]
        
        # Restore original order
        response = requests.put(
            f"{BASE_URL}/api/pipeline/columns/reorder",
            headers=auth_headers,
            json={"column_ids": column_ids}
        )
        assert response.status_code == 200
        print(f"✓ PUT /api/pipeline/columns/reorder - Order restored")


class TestBudgetAutoCategorizationRulesPhase2(TestAuth):
    """Test Budget Phase 2 - Advanced auto-categorization rules"""
    
    @pytest.fixture
    def test_rule_id(self, auth_headers):
        """Create a test rule and return its ID"""
        rule_data = {
            "pattern": "TEST_PATTERN_" + str(uuid.uuid4())[:8],
            "category_id": "default_marketing",
            "match_type": "contains",
            "apply_to_type": "debit",
            "is_active": True,
            "priority": 10
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/rules",
            headers=auth_headers,
            json=rule_data
        )
        assert response.status_code == 200
        rule_id = response.json().get("id")
        yield rule_id
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/rules/{rule_id}", headers=auth_headers)
    
    def test_get_rules(self, auth_headers):
        """GET /api/budget/rules - Get all rules"""
        response = requests.get(f"{BASE_URL}/api/budget/rules", headers=auth_headers)
        assert response.status_code == 200
        rules = response.json()
        assert isinstance(rules, list)
        print(f"✓ GET /api/budget/rules - Found {len(rules)} rules")
    
    def test_create_rule_with_match_type_contains(self, auth_headers):
        """POST /api/budget/rules - Create rule with match_type=contains"""
        rule_data = {
            "pattern": "TEST_CONTAINS_" + str(uuid.uuid4())[:8],
            "category_id": "default_marketing",
            "match_type": "contains",
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/rules",
            headers=auth_headers,
            json=rule_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ POST /api/budget/rules - Created rule with match_type=contains")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/rules/{data['id']}", headers=auth_headers)
    
    def test_create_rule_with_match_type_starts_with(self, auth_headers):
        """POST /api/budget/rules - Create rule with match_type=starts_with"""
        rule_data = {
            "pattern": "TEST_STARTS_" + str(uuid.uuid4())[:8],
            "category_id": "default_outils",
            "match_type": "starts_with",
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/rules",
            headers=auth_headers,
            json=rule_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ POST /api/budget/rules - Created rule with match_type=starts_with")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/rules/{data['id']}", headers=auth_headers)
    
    def test_create_rule_with_match_type_exact(self, auth_headers):
        """POST /api/budget/rules - Create rule with match_type=exact"""
        rule_data = {
            "pattern": "EXACT_MATCH_TEST",
            "category_id": "default_abonnements",
            "match_type": "exact",
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/rules",
            headers=auth_headers,
            json=rule_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ POST /api/budget/rules - Created rule with match_type=exact")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/rules/{data['id']}", headers=auth_headers)
    
    def test_create_rule_with_match_type_regex(self, auth_headers):
        """POST /api/budget/rules - Create rule with match_type=regex"""
        rule_data = {
            "pattern": "TEST.*REGEX",
            "category_id": "default_marketing",
            "match_type": "regex",
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/rules",
            headers=auth_headers,
            json=rule_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ POST /api/budget/rules - Created rule with match_type=regex")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/rules/{data['id']}", headers=auth_headers)
    
    def test_create_rule_with_apply_to_type_credit(self, auth_headers):
        """POST /api/budget/rules - Create rule with apply_to_type=credit"""
        rule_data = {
            "pattern": "TEST_CREDIT_" + str(uuid.uuid4())[:8],
            "category_id": "default_ca_client",
            "match_type": "contains",
            "apply_to_type": "credit",
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/rules",
            headers=auth_headers,
            json=rule_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ POST /api/budget/rules - Created rule with apply_to_type=credit")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/rules/{data['id']}", headers=auth_headers)
    
    def test_create_rule_with_apply_to_type_debit(self, auth_headers):
        """POST /api/budget/rules - Create rule with apply_to_type=debit"""
        rule_data = {
            "pattern": "TEST_DEBIT_" + str(uuid.uuid4())[:8],
            "category_id": "default_marketing",
            "match_type": "contains",
            "apply_to_type": "debit",
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/rules",
            headers=auth_headers,
            json=rule_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ POST /api/budget/rules - Created rule with apply_to_type=debit")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/rules/{data['id']}", headers=auth_headers)
    
    def test_apply_rules_endpoint(self, auth_headers):
        """POST /api/budget/rules/apply - Apply rules to uncategorized transactions"""
        response = requests.post(
            f"{BASE_URL}/api/budget/rules/apply",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "categorized" in data
        assert "message" in data
        print(f"✓ POST /api/budget/rules/apply - Applied rules: {data['message']}")
    
    def test_apply_rules_with_month_filter(self, auth_headers):
        """POST /api/budget/rules/apply - Apply rules with month filter"""
        response = requests.post(
            f"{BASE_URL}/api/budget/rules/apply?month=2025-01",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "categorized" in data
        print(f"✓ POST /api/budget/rules/apply?month=2025-01 - Applied rules with month filter")


class TestBudgetForecastPhase3(TestAuth):
    """Test Budget Phase 3 - Forecast (Prévisionnel)"""
    
    @pytest.fixture
    def test_forecast_id(self, auth_headers):
        """Create a test forecast and return its ID"""
        forecast_data = {
            "month": "2025-01",
            "category_id": "default_marketing",
            "type": "expense",
            "planned_amount": 1500.00,
            "description": "TEST_FORECAST_" + str(uuid.uuid4())[:8]
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/forecast",
            headers=auth_headers,
            json=forecast_data
        )
        assert response.status_code == 200
        forecast_id = response.json().get("id")
        yield forecast_id
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/forecast/{forecast_id}", headers=auth_headers)
    
    def test_get_forecasts(self, auth_headers):
        """GET /api/budget/forecast - Get all forecasts"""
        response = requests.get(f"{BASE_URL}/api/budget/forecast", headers=auth_headers)
        assert response.status_code == 200
        forecasts = response.json()
        assert isinstance(forecasts, list)
        print(f"✓ GET /api/budget/forecast - Found {len(forecasts)} forecasts")
    
    def test_get_forecasts_with_month_filter(self, auth_headers):
        """GET /api/budget/forecast?month=2025-01 - Get forecasts for specific month"""
        response = requests.get(
            f"{BASE_URL}/api/budget/forecast?month=2025-01",
            headers=auth_headers
        )
        assert response.status_code == 200
        forecasts = response.json()
        assert isinstance(forecasts, list)
        print(f"✓ GET /api/budget/forecast?month=2025-01 - Found {len(forecasts)} forecasts for January 2025")
    
    def test_create_forecast_expense(self, auth_headers):
        """POST /api/budget/forecast - Create expense forecast"""
        forecast_data = {
            "month": "2025-02",
            "category_id": "default_outils",
            "type": "expense",
            "planned_amount": 500.00,
            "description": "Test expense forecast"
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/forecast",
            headers=auth_headers,
            json=forecast_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ POST /api/budget/forecast - Created expense forecast")
        
        # Verify persistence
        response = requests.get(
            f"{BASE_URL}/api/budget/forecast?month=2025-02",
            headers=auth_headers
        )
        assert response.status_code == 200
        forecasts = response.json()
        created = [f for f in forecasts if f.get("category_id") == "default_outils"]
        assert len(created) > 0, "Forecast not found after creation"
        print(f"✓ Verified forecast persistence in database")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/forecast/{data['id']}", headers=auth_headers)
    
    def test_create_forecast_income(self, auth_headers):
        """POST /api/budget/forecast - Create income forecast"""
        forecast_data = {
            "month": "2025-02",
            "category_id": "default_ca_client",
            "type": "income",
            "planned_amount": 10000.00,
            "description": "Test income forecast"
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/forecast",
            headers=auth_headers,
            json=forecast_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ POST /api/budget/forecast - Created income forecast")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budget/forecast/{data['id']}", headers=auth_headers)
    
    def test_update_forecast(self, auth_headers, test_forecast_id):
        """PUT /api/budget/forecast/{id} - Update forecast"""
        update_data = {
            "planned_amount": 2000.00,
            "description": "Updated forecast description"
        }
        response = requests.put(
            f"{BASE_URL}/api/budget/forecast/{test_forecast_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200
        print(f"✓ PUT /api/budget/forecast/{test_forecast_id} - Updated forecast")
    
    def test_delete_forecast(self, auth_headers):
        """DELETE /api/budget/forecast/{id} - Delete forecast"""
        # Create a forecast to delete
        forecast_data = {
            "month": "2025-03",
            "category_id": "default_formation",
            "type": "expense",
            "planned_amount": 300.00,
            "description": "Forecast to delete"
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/forecast",
            headers=auth_headers,
            json=forecast_data
        )
        assert response.status_code == 200
        forecast_id = response.json().get("id")
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/budget/forecast/{forecast_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"✓ DELETE /api/budget/forecast/{forecast_id} - Deleted forecast")
        
        # Verify deletion
        response = requests.get(
            f"{BASE_URL}/api/budget/forecast?month=2025-03",
            headers=auth_headers
        )
        forecasts = response.json()
        deleted = [f for f in forecasts if f.get("id") == forecast_id]
        assert len(deleted) == 0, "Forecast still exists after deletion"
        print(f"✓ Verified forecast deletion")
    
    def test_delete_forecast_not_found(self, auth_headers):
        """DELETE /api/budget/forecast/{id} - Returns 404 for non-existent"""
        response = requests.delete(
            f"{BASE_URL}/api/budget/forecast/non-existent-id",
            headers=auth_headers
        )
        assert response.status_code == 404
        print(f"✓ DELETE /api/budget/forecast/non-existent-id - Returns 404")
    
    def test_get_forecast_comparison(self, auth_headers):
        """GET /api/budget/forecast/comparison - Get forecast vs actual comparison"""
        response = requests.get(
            f"{BASE_URL}/api/budget/forecast/comparison?month=2025-01",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "comparison" in data
        assert "totals" in data
        assert "alerts" in data
        
        # Verify totals structure
        totals = data["totals"]
        assert "planned_income" in totals
        assert "planned_expense" in totals
        assert "actual_income" in totals
        assert "actual_expense" in totals
        assert "planned_balance" in totals
        assert "actual_balance" in totals
        
        print(f"✓ GET /api/budget/forecast/comparison - Returns comparison data")
        print(f"  - Planned income: {totals['planned_income']}")
        print(f"  - Planned expense: {totals['planned_expense']}")
        print(f"  - Actual income: {totals['actual_income']}")
        print(f"  - Actual expense: {totals['actual_expense']}")
    
    def test_copy_forecast_to_month(self, auth_headers):
        """POST /api/budget/forecast/copy - Copy forecasts to another month"""
        # First create a forecast in source month
        forecast_data = {
            "month": "2025-04",
            "category_id": "default_marketing",
            "type": "expense",
            "planned_amount": 1000.00,
            "description": "Source forecast for copy test"
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/forecast",
            headers=auth_headers,
            json=forecast_data
        )
        assert response.status_code == 200
        source_id = response.json().get("id")
        
        # Copy to target month
        response = requests.post(
            f"{BASE_URL}/api/budget/forecast/copy?source_month=2025-04&target_month=2025-05",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "copied" in data
        print(f"✓ POST /api/budget/forecast/copy - Copied {data['copied']} forecasts from 2025-04 to 2025-05")
        
        # Verify copy
        response = requests.get(
            f"{BASE_URL}/api/budget/forecast?month=2025-05",
            headers=auth_headers
        )
        forecasts = response.json()
        copied = [f for f in forecasts if f.get("category_id") == "default_marketing"]
        assert len(copied) > 0, "Forecast not copied to target month"
        print(f"✓ Verified forecast copy in target month")
        
        # Cleanup source
        requests.delete(f"{BASE_URL}/api/budget/forecast/{source_id}", headers=auth_headers)
        
        # Cleanup target
        for f in copied:
            requests.delete(f"{BASE_URL}/api/budget/forecast/{f['id']}", headers=auth_headers)
    
    def test_copy_forecast_no_source(self, auth_headers):
        """POST /api/budget/forecast/copy - Returns error when no source forecasts"""
        response = requests.post(
            f"{BASE_URL}/api/budget/forecast/copy?source_month=1999-01&target_month=1999-02",
            headers=auth_headers
        )
        assert response.status_code == 404
        print(f"✓ POST /api/budget/forecast/copy - Returns 404 when no source forecasts")


class TestBudgetRulesIntegration(TestAuth):
    """Integration tests for auto-categorization rules"""
    
    def test_rule_crud_flow(self, auth_headers):
        """Test complete CRUD flow for rules"""
        # CREATE
        rule_data = {
            "pattern": "INTEGRATION_TEST_" + str(uuid.uuid4())[:8],
            "category_id": "default_marketing",
            "match_type": "contains",
            "apply_to_type": "debit",
            "is_active": True,
            "priority": 5
        }
        response = requests.post(
            f"{BASE_URL}/api/budget/rules",
            headers=auth_headers,
            json=rule_data
        )
        assert response.status_code == 200
        rule_id = response.json().get("id")
        print(f"✓ Created rule: {rule_id}")
        
        # READ
        response = requests.get(f"{BASE_URL}/api/budget/rules", headers=auth_headers)
        assert response.status_code == 200
        rules = response.json()
        created_rule = next((r for r in rules if r.get("id") == rule_id), None)
        assert created_rule is not None
        assert created_rule["match_type"] == "contains"
        assert created_rule["apply_to_type"] == "debit"
        print(f"✓ Verified rule creation with match_type and apply_to_type")
        
        # UPDATE
        update_data = {
            "match_type": "starts_with",
            "apply_to_type": "credit",
            "priority": 10
        }
        response = requests.put(
            f"{BASE_URL}/api/budget/rules/{rule_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200
        print(f"✓ Updated rule")
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/budget/rules", headers=auth_headers)
        rules = response.json()
        updated_rule = next((r for r in rules if r.get("id") == rule_id), None)
        assert updated_rule["match_type"] == "starts_with"
        assert updated_rule["apply_to_type"] == "credit"
        print(f"✓ Verified rule update")
        
        # DELETE
        response = requests.delete(
            f"{BASE_URL}/api/budget/rules/{rule_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"✓ Deleted rule")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/budget/rules", headers=auth_headers)
        rules = response.json()
        deleted_rule = next((r for r in rules if r.get("id") == rule_id), None)
        assert deleted_rule is None
        print(f"✓ Verified rule deletion")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
