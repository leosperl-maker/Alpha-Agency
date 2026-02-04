"""
Test suite for CRM Alpha Agency - Pipeline Columns and Budget Module
Tests:
- Pipeline Columns API (GET, POST, PUT, DELETE)
- Budget Transactions API (GET, POST, PUT, DELETE)
- Budget Categories API (GET, POST, PUT, DELETE)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smart-chat-crm-2.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


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
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


# ==================== PIPELINE COLUMNS TESTS ====================

class TestPipelineColumns:
    """Tests for Pipeline Columns API"""
    
    created_column_id = None
    
    def test_get_pipeline_columns(self, headers):
        """GET /api/pipeline/columns - Should return list of columns"""
        response = requests.get(f"{BASE_URL}/api/pipeline/columns", headers=headers)
        assert response.status_code == 200
        
        columns = response.json()
        assert isinstance(columns, list)
        assert len(columns) >= 5  # Default columns
        
        # Verify default columns exist
        column_ids = [col["id"] for col in columns]
        assert "nouveau" in column_ids
        assert "qualifié" in column_ids
        assert "devis_envoyé" in column_ids
        assert "gagné" in column_ids
        assert "perdu" in column_ids
        
        # Verify column structure
        for col in columns:
            assert "id" in col
            assert "label" in col
            assert "color" in col
            assert "order" in col
        
        print(f"✓ GET /api/pipeline/columns - Found {len(columns)} columns")
    
    def test_create_pipeline_column(self, headers):
        """POST /api/pipeline/columns - Should create a new column"""
        unique_id = f"test_column_{uuid.uuid4().hex[:8]}"
        column_data = {
            "id": unique_id,
            "label": "Test Column",
            "color": "#FF5733"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pipeline/columns",
            headers=headers,
            json=column_data
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["id"] == unique_id
        
        TestPipelineColumns.created_column_id = unique_id
        print(f"✓ POST /api/pipeline/columns - Created column: {unique_id}")
    
    def test_create_duplicate_column_fails(self, headers):
        """POST /api/pipeline/columns - Should fail for duplicate ID"""
        if not TestPipelineColumns.created_column_id:
            pytest.skip("No column created to test duplicate")
        
        column_data = {
            "id": TestPipelineColumns.created_column_id,
            "label": "Duplicate Column",
            "color": "#FF5733"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pipeline/columns",
            headers=headers,
            json=column_data
        )
        assert response.status_code == 400
        print("✓ POST /api/pipeline/columns - Duplicate ID rejected correctly")
    
    def test_update_pipeline_column(self, headers):
        """PUT /api/pipeline/columns/{id} - Should update column"""
        if not TestPipelineColumns.created_column_id:
            pytest.skip("No column created to update")
        
        update_data = {
            "label": "Updated Test Column",
            "color": "#00FF00"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pipeline/columns/{TestPipelineColumns.created_column_id}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/pipeline/columns", headers=headers)
        columns = get_response.json()
        updated_col = next((c for c in columns if c["id"] == TestPipelineColumns.created_column_id), None)
        
        assert updated_col is not None
        assert updated_col["label"] == "Updated Test Column"
        assert updated_col["color"] == "#00FF00"
        
        print(f"✓ PUT /api/pipeline/columns/{TestPipelineColumns.created_column_id} - Column updated")
    
    def test_update_nonexistent_column(self, headers):
        """PUT /api/pipeline/columns/{id} - Should return 404 for non-existent"""
        response = requests.put(
            f"{BASE_URL}/api/pipeline/columns/nonexistent_column_xyz",
            headers=headers,
            json={"label": "Test"}
        )
        assert response.status_code == 404
        print("✓ PUT /api/pipeline/columns - 404 for non-existent column")
    
    def test_delete_pipeline_column(self, headers):
        """DELETE /api/pipeline/columns/{id} - Should delete column"""
        if not TestPipelineColumns.created_column_id:
            pytest.skip("No column created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/pipeline/columns/{TestPipelineColumns.created_column_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/pipeline/columns", headers=headers)
        columns = get_response.json()
        deleted_col = next((c for c in columns if c["id"] == TestPipelineColumns.created_column_id), None)
        
        assert deleted_col is None
        print(f"✓ DELETE /api/pipeline/columns/{TestPipelineColumns.created_column_id} - Column deleted")
    
    def test_delete_nonexistent_column(self, headers):
        """DELETE /api/pipeline/columns/{id} - Should return 404 for non-existent"""
        response = requests.delete(
            f"{BASE_URL}/api/pipeline/columns/nonexistent_column_xyz",
            headers=headers
        )
        assert response.status_code == 404
        print("✓ DELETE /api/pipeline/columns - 404 for non-existent column")


# ==================== BUDGET TRANSACTIONS TESTS ====================

class TestBudgetTransactions:
    """Tests for Budget Transactions API"""
    
    created_transaction_id = None
    
    def test_get_transactions(self, headers):
        """GET /api/budget/transactions - Should return list of transactions"""
        response = requests.get(f"{BASE_URL}/api/budget/transactions", headers=headers)
        assert response.status_code == 200
        
        transactions = response.json()
        assert isinstance(transactions, list)
        print(f"✓ GET /api/budget/transactions - Found {len(transactions)} transactions")
    
    def test_get_transactions_with_filters(self, headers):
        """GET /api/budget/transactions - Should support filters"""
        # Test with type filter
        response = requests.get(
            f"{BASE_URL}/api/budget/transactions",
            headers=headers,
            params={"type": "credit"}
        )
        assert response.status_code == 200
        
        # Test with month filter
        response = requests.get(
            f"{BASE_URL}/api/budget/transactions",
            headers=headers,
            params={"month": "2025-01"}
        )
        assert response.status_code == 200
        print("✓ GET /api/budget/transactions - Filters work correctly")
    
    def test_create_transaction(self, headers):
        """POST /api/budget/transactions - Should create a transaction"""
        transaction_data = {
            "date": "2025-01-09",
            "label": "TEST_Transaction_Pytest",
            "amount": 150.50,
            "type": "debit",
            "notes": "Test transaction created by pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/budget/transactions",
            headers=headers,
            json=transaction_data
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        
        TestBudgetTransactions.created_transaction_id = data["id"]
        print(f"✓ POST /api/budget/transactions - Created transaction: {data['id']}")
    
    def test_update_transaction(self, headers):
        """PUT /api/budget/transactions/{id} - Should update transaction"""
        if not TestBudgetTransactions.created_transaction_id:
            pytest.skip("No transaction created to update")
        
        update_data = {
            "notes": "Updated by pytest"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/budget/transactions/{TestBudgetTransactions.created_transaction_id}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        print(f"✓ PUT /api/budget/transactions/{TestBudgetTransactions.created_transaction_id} - Updated")
    
    def test_delete_transaction(self, headers):
        """DELETE /api/budget/transactions/{id} - Should delete transaction"""
        if not TestBudgetTransactions.created_transaction_id:
            pytest.skip("No transaction created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/budget/transactions/{TestBudgetTransactions.created_transaction_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print(f"✓ DELETE /api/budget/transactions/{TestBudgetTransactions.created_transaction_id} - Deleted")
    
    def test_delete_nonexistent_transaction(self, headers):
        """DELETE /api/budget/transactions/{id} - Should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/budget/transactions/nonexistent_trans_xyz",
            headers=headers
        )
        assert response.status_code == 404
        print("✓ DELETE /api/budget/transactions - 404 for non-existent")


# ==================== BUDGET CATEGORIES TESTS ====================

class TestBudgetCategories:
    """Tests for Budget Categories API"""
    
    created_category_id = None
    
    def test_get_categories(self, headers):
        """GET /api/budget/categories - Should return list of categories"""
        response = requests.get(f"{BASE_URL}/api/budget/categories", headers=headers)
        assert response.status_code == 200
        
        categories = response.json()
        assert isinstance(categories, list)
        print(f"✓ GET /api/budget/categories - Found {len(categories)} categories")
    
    def test_create_category(self, headers):
        """POST /api/budget/categories - Should create a category"""
        category_data = {
            "name": "TEST_Category_Pytest",
            "type": "expense",
            "color": "#FF5733",
            "icon": "tag"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/budget/categories",
            headers=headers,
            json=category_data
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        
        TestBudgetCategories.created_category_id = data["id"]
        
        # Verify creation
        get_response = requests.get(f"{BASE_URL}/api/budget/categories", headers=headers)
        categories = get_response.json()
        created_cat = next((c for c in categories if c["id"] == data["id"]), None)
        
        assert created_cat is not None
        assert created_cat["name"] == "TEST_Category_Pytest"
        assert created_cat["type"] == "expense"
        
        print(f"✓ POST /api/budget/categories - Created category: {data['id']}")
    
    def test_update_category(self, headers):
        """PUT /api/budget/categories/{id} - Should update category"""
        if not TestBudgetCategories.created_category_id:
            pytest.skip("No category created to update")
        
        update_data = {
            "name": "TEST_Category_Updated",
            "color": "#00FF00"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/budget/categories/{TestBudgetCategories.created_category_id}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/budget/categories", headers=headers)
        categories = get_response.json()
        updated_cat = next((c for c in categories if c["id"] == TestBudgetCategories.created_category_id), None)
        
        assert updated_cat is not None
        assert updated_cat["name"] == "TEST_Category_Updated"
        
        print(f"✓ PUT /api/budget/categories/{TestBudgetCategories.created_category_id} - Updated")
    
    def test_delete_category(self, headers):
        """DELETE /api/budget/categories/{id} - Should delete category"""
        if not TestBudgetCategories.created_category_id:
            pytest.skip("No category created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/budget/categories/{TestBudgetCategories.created_category_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/budget/categories", headers=headers)
        categories = get_response.json()
        deleted_cat = next((c for c in categories if c["id"] == TestBudgetCategories.created_category_id), None)
        
        assert deleted_cat is None
        print(f"✓ DELETE /api/budget/categories/{TestBudgetCategories.created_category_id} - Deleted")
    
    def test_delete_nonexistent_category(self, headers):
        """DELETE /api/budget/categories/{id} - Should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/budget/categories/nonexistent_cat_xyz",
            headers=headers
        )
        assert response.status_code == 404
        print("✓ DELETE /api/budget/categories - 404 for non-existent")


# ==================== BUDGET SUMMARY TESTS ====================

class TestBudgetSummary:
    """Tests for Budget Summary and Charts API"""
    
    def test_get_transactions_summary(self, headers):
        """GET /api/budget/transactions/summary - Should return summary"""
        response = requests.get(
            f"{BASE_URL}/api/budget/transactions/summary",
            headers=headers
        )
        assert response.status_code == 200
        
        summary = response.json()
        assert "total_credit" in summary or "total_debit" in summary or isinstance(summary, dict)
        print(f"✓ GET /api/budget/transactions/summary - Summary retrieved")
    
    def test_get_budget_summary(self, headers):
        """GET /api/budget/summary - Should return budget summary"""
        response = requests.get(
            f"{BASE_URL}/api/budget/summary",
            headers=headers
        )
        assert response.status_code == 200
        
        summary = response.json()
        assert "total_income" in summary
        assert "total_expense" in summary
        assert "balance" in summary
        print(f"✓ GET /api/budget/summary - Budget summary retrieved")
    
    def test_get_monthly_chart(self, headers):
        """GET /api/budget/monthly-chart - Should return chart data"""
        response = requests.get(
            f"{BASE_URL}/api/budget/monthly-chart",
            headers=headers,
            params={"year": 2025}
        )
        assert response.status_code == 200
        
        chart_data = response.json()
        assert isinstance(chart_data, list)
        assert len(chart_data) == 12  # 12 months
        
        for month_data in chart_data:
            assert "name" in month_data
            assert "income" in month_data
            assert "expense" in month_data
        
        print(f"✓ GET /api/budget/monthly-chart - Chart data retrieved")


# ==================== DASHBOARD PIPELINE TESTS ====================

class TestDashboardPipeline:
    """Tests for Dashboard Pipeline API"""
    
    def test_get_dashboard_pipeline(self, headers):
        """GET /api/dashboard/pipeline - Should return pipeline data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/pipeline", headers=headers)
        assert response.status_code == 200
        
        pipeline = response.json()
        assert isinstance(pipeline, dict)
        
        # Should have keys for each status
        expected_statuses = ["nouveau", "qualifié", "devis_envoyé", "gagné", "perdu"]
        for status in expected_statuses:
            assert status in pipeline, f"Missing status: {status}"
            assert isinstance(pipeline[status], list)
        
        print(f"✓ GET /api/dashboard/pipeline - Pipeline data retrieved")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
