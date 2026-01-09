"""
Test suite for News API endpoints (NewsPage - Perplexity Discover style)
Tests: categories, regions, articles, refresh, related, delete
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNewsAPI:
    """News API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_get_news_categories(self):
        """Test GET /api/news/categories - returns available categories"""
        response = self.session.get(f"{BASE_URL}/api/news/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 7  # general, business, technology, science, health, sports, entertainment
        
        # Verify category structure
        category_ids = [c["id"] for c in data]
        assert "general" in category_ids
        assert "business" in category_ids
        assert "technology" in category_ids
        assert "science" in category_ids
        assert "health" in category_ids
        assert "sports" in category_ids
        assert "entertainment" in category_ids
        
        # Verify each category has required fields
        for cat in data:
            assert "id" in cat
            assert "label" in cat
            assert "icon" in cat
            assert "color" in cat
    
    def test_get_news_regions(self):
        """Test GET /api/news/regions - returns available regions"""
        response = self.session.get(f"{BASE_URL}/api/news/regions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4  # fr, us, gb, de
        
        # Verify region structure
        region_ids = [r["id"] for r in data]
        assert "fr" in region_ids
        assert "us" in region_ids
        assert "gb" in region_ids
        assert "de" in region_ids
        
        # Verify each region has required fields
        for region in data:
            assert "id" in region
            assert "label" in region
            assert "icon" in region
    
    def test_get_news_articles_empty(self):
        """Test GET /api/news - returns articles list (may be empty initially)"""
        response = self.session.get(f"{BASE_URL}/api/news", params={"limit": 50, "region": "fr"})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_refresh_news_france(self):
        """Test POST /api/news/refresh - refresh news for France region"""
        response = self.session.post(f"{BASE_URL}/api/news/refresh", params={"region": "fr"})
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "categories_processed" in data
        assert "region" in data
        assert data["region"] == "fr"
    
    def test_refresh_news_us(self):
        """Test POST /api/news/refresh - refresh news for US region"""
        response = self.session.post(f"{BASE_URL}/api/news/refresh", params={"region": "us"})
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert data["region"] == "us"
    
    def test_refresh_news_specific_category(self):
        """Test POST /api/news/refresh - refresh specific category"""
        response = self.session.post(f"{BASE_URL}/api/news/refresh", params={
            "category": "technology",
            "region": "us"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert data["categories_processed"] == 1
    
    def test_get_news_articles_with_filter(self):
        """Test GET /api/news - filter by category"""
        # First refresh to ensure we have articles
        self.session.post(f"{BASE_URL}/api/news/refresh", params={"region": "us"})
        
        response = self.session.get(f"{BASE_URL}/api/news", params={
            "category": "technology",
            "region": "us",
            "limit": 10
        })
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If articles exist, verify structure
        if len(data) > 0:
            article = data[0]
            assert "id" in article
            assert "title" in article
            assert "source_name" in article
            assert "published_at" in article
            assert "category" in article
    
    def test_get_single_article(self):
        """Test GET /api/news/{article_id} - get single article"""
        # First get list of articles
        list_response = self.session.get(f"{BASE_URL}/api/news", params={"limit": 10})
        articles = list_response.json()
        
        if len(articles) > 0:
            article_id = articles[0]["id"]
            response = self.session.get(f"{BASE_URL}/api/news/{article_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["id"] == article_id
            assert "title" in data
            assert "source_name" in data
        else:
            pytest.skip("No articles available to test single article endpoint")
    
    def test_get_related_articles(self):
        """Test GET /api/news/related/{article_id} - get related articles"""
        # First get list of articles
        list_response = self.session.get(f"{BASE_URL}/api/news", params={"limit": 10})
        articles = list_response.json()
        
        if len(articles) > 0:
            article_id = articles[0]["id"]
            response = self.session.get(f"{BASE_URL}/api/news/related/{article_id}", params={"limit": 4})
            assert response.status_code == 200
            
            data = response.json()
            assert isinstance(data, list)
            assert len(data) <= 4
        else:
            pytest.skip("No articles available to test related articles endpoint")
    
    def test_delete_article(self):
        """Test DELETE /api/news/{article_id} - delete an article"""
        # First get list of articles
        list_response = self.session.get(f"{BASE_URL}/api/news", params={"limit": 10})
        articles = list_response.json()
        
        if len(articles) > 0:
            article_id = articles[0]["id"]
            response = self.session.delete(f"{BASE_URL}/api/news/{article_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert "message" in data
            
            # Verify article is deleted
            get_response = self.session.get(f"{BASE_URL}/api/news/{article_id}")
            assert get_response.status_code == 404
        else:
            pytest.skip("No articles available to test delete endpoint")
    
    def test_get_nonexistent_article(self):
        """Test GET /api/news/{article_id} - 404 for nonexistent article"""
        response = self.session.get(f"{BASE_URL}/api/news/nonexistent-article-id-12345")
        assert response.status_code == 404


class TestInvoiceDelete:
    """Test invoice delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_get_invoices(self):
        """Test GET /api/invoices - list invoices"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_invoice(self):
        """Test DELETE /api/invoices/{id} - delete invoice"""
        # First create a test invoice
        # Get a contact first
        contacts_response = self.session.get(f"{BASE_URL}/api/contacts", params={"limit": 1})
        contacts = contacts_response.json()
        
        if len(contacts) == 0:
            pytest.skip("No contacts available to create test invoice")
        
        contact_id = contacts[0]["id"]
        
        # Create a test invoice
        invoice_data = {
            "contact_id": contact_id,
            "invoice_number": "TEST-INV-DELETE-001",
            "issue_date": "2025-01-09",
            "due_date": "2025-02-09",
            "items": [
                {
                    "description": "Test Service",
                    "quantity": 1,
                    "unit_price": 100.00
                }
            ],
            "status": "brouillon"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        
        if create_response.status_code in [200, 201]:
            invoice_id = create_response.json().get("id")
            
            # Now delete the invoice
            delete_response = self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
            assert delete_response.status_code == 200
            
            # Verify invoice is deleted
            get_response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}")
            assert get_response.status_code == 404
        else:
            # If we can't create, try to delete an existing one
            invoices_response = self.session.get(f"{BASE_URL}/api/invoices")
            invoices = invoices_response.json()
            
            if len(invoices) > 0:
                # Find a test invoice or skip
                test_invoice = next((inv for inv in invoices if "TEST" in inv.get("invoice_number", "")), None)
                if test_invoice:
                    delete_response = self.session.delete(f"{BASE_URL}/api/invoices/{test_invoice['id']}")
                    assert delete_response.status_code == 200
                else:
                    pytest.skip("No test invoices available to delete")
            else:
                pytest.skip("No invoices available to test delete")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
