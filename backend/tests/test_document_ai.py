"""
Test MoltBot Document AI - AI-powered document classification
Tests: /api/document-ai/categories, /api/document-ai/suggestions, /api/document-ai/analyze/{id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crm-intelligence-13.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "Test123!"

# Test document ID for analysis
TEST_DOCUMENT_ID = "0da569a8-c4bc-491c-a7d9-676e95a352e4"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in response"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestDocumentAICategories:
    """Test /api/document-ai/categories endpoint"""
    
    def test_get_categories_returns_200(self, auth_headers):
        """Test that categories endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/document-ai/categories",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_categories_returns_16_categories(self, auth_headers):
        """Test that categories endpoint returns exactly 16 categories"""
        response = requests.get(
            f"{BASE_URL}/api/document-ai/categories",
            headers=auth_headers
        )
        data = response.json()
        assert "count" in data, "Response missing 'count' field"
        assert data["count"] == 16, f"Expected 16 categories, got {data['count']}"
    
    def test_get_categories_structure(self, auth_headers):
        """Test that categories have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/document-ai/categories",
            headers=auth_headers
        )
        data = response.json()
        assert "categories" in data, "Response missing 'categories' field"
        
        # Check expected categories exist
        expected_categories = [
            "facture", "devis", "contrat", "bon_commande", "releve",
            "attestation", "identite", "courrier", "rapport", "presentation",
            "photo", "marketing", "technique", "rh", "juridique", "autre"
        ]
        for cat in expected_categories:
            assert cat in data["categories"], f"Missing category: {cat}"
    
    def test_get_categories_requires_auth(self):
        """Test that categories endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/document-ai/categories")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestDocumentAISuggestions:
    """Test /api/document-ai/suggestions endpoint"""
    
    def test_get_suggestions_returns_200(self, auth_headers):
        """Test that suggestions endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/document-ai/suggestions",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_suggestions_structure(self, auth_headers):
        """Test that suggestions have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/document-ai/suggestions",
            headers=auth_headers
        )
        data = response.json()
        assert "count" in data, "Response missing 'count' field"
        assert "suggestions" in data, "Response missing 'suggestions' field"
        assert isinstance(data["suggestions"], list), "Suggestions should be a list"
    
    def test_get_suggestions_item_structure(self, auth_headers):
        """Test that each suggestion has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/document-ai/suggestions",
            headers=auth_headers
        )
        data = response.json()
        
        if data["count"] > 0:
            suggestion = data["suggestions"][0]
            assert "document_id" in suggestion, "Suggestion missing 'document_id'"
            # Either needs_analysis or has analysis results
            if suggestion.get("needs_analysis"):
                assert suggestion["needs_analysis"] == True
            else:
                # Should have analysis fields
                assert "suggested_name" in suggestion or "document_type" in suggestion
    
    def test_get_suggestions_requires_auth(self):
        """Test that suggestions endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/document-ai/suggestions")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestDocumentAIAnalyze:
    """Test /api/document-ai/analyze/{id} endpoint"""
    
    def test_analyze_document_returns_200(self, auth_headers):
        """Test that analyze endpoint returns 200 for valid document"""
        response = requests.post(
            f"{BASE_URL}/api/document-ai/analyze/{TEST_DOCUMENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_analyze_document_returns_success(self, auth_headers):
        """Test that analyze returns success=true"""
        response = requests.post(
            f"{BASE_URL}/api/document-ai/analyze/{TEST_DOCUMENT_ID}",
            headers=auth_headers
        )
        data = response.json()
        assert "success" in data, "Response missing 'success' field"
        assert data["success"] == True, f"Analysis failed: {data.get('error')}"
    
    def test_analyze_document_returns_required_fields(self, auth_headers):
        """Test that analyze returns all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/document-ai/analyze/{TEST_DOCUMENT_ID}",
            headers=auth_headers
        )
        data = response.json()
        
        # Check required fields
        required_fields = ["suggested_name", "suggested_folder", "document_type"]
        for field in required_fields:
            assert field in data, f"Response missing '{field}' field"
            assert data[field] is not None, f"Field '{field}' is None"
    
    def test_analyze_document_returns_summary(self, auth_headers):
        """Test that analyze returns a summary"""
        response = requests.post(
            f"{BASE_URL}/api/document-ai/analyze/{TEST_DOCUMENT_ID}",
            headers=auth_headers
        )
        data = response.json()
        assert "summary" in data, "Response missing 'summary' field"
        assert data["summary"] is not None, "Summary is None"
        assert len(data["summary"]) > 10, "Summary too short"
    
    def test_analyze_invalid_document_returns_404(self, auth_headers):
        """Test that analyze returns 404 for invalid document ID"""
        response = requests.post(
            f"{BASE_URL}/api/document-ai/analyze/invalid-document-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_analyze_requires_auth(self):
        """Test that analyze endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/document-ai/analyze/{TEST_DOCUMENT_ID}")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestDocumentAIAutoClassify:
    """Test /api/document-ai/auto-classify/{id} endpoint"""
    
    def test_auto_classify_returns_200(self, auth_headers):
        """Test that auto-classify endpoint returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/document-ai/auto-classify/{TEST_DOCUMENT_ID}?apply_changes=false",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_auto_classify_returns_suggestions(self, auth_headers):
        """Test that auto-classify returns classification suggestions"""
        response = requests.post(
            f"{BASE_URL}/api/document-ai/auto-classify/{TEST_DOCUMENT_ID}?apply_changes=false",
            headers=auth_headers
        )
        data = response.json()
        
        # Check required fields
        assert "document_id" in data, "Response missing 'document_id'"
        assert "suggested_name" in data, "Response missing 'suggested_name'"
        assert "suggested_folder" in data, "Response missing 'suggested_folder'"
        assert "document_type" in data, "Response missing 'document_type'"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
