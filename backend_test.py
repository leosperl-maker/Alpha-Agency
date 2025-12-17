#!/usr/bin/env python3
"""
Alpha Agency Backend API Testing
Tests all backend endpoints for the Alpha Agency website
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class AlphaAgencyAPITester:
    def __init__(self, base_url="https://alphacommunicate.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.contact_id = None
        self.opportunity_id = None
        self.quote_id = None
        
        # Test credentials
        self.admin_email = "admin@alphagency.fr"
        self.admin_password = "Alpha2024!"

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{test_name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple:
        """Make API request and return success status and response"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_auth_login(self):
        """Test admin login"""
        print("\n🔐 Testing Authentication...")
        
        success, response = self.make_request(
            'POST', 
            'auth/login',
            {"email": self.admin_email, "password": self.admin_password}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.log_result("Admin Login", True, f"Token received for {response.get('user', {}).get('email', 'unknown')}")
            return True
        else:
            self.log_result("Admin Login", False, f"Login failed: {response}")
            return False

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.make_request('GET', 'auth/me')
        self.log_result("Get Current User", success, f"User: {response.get('email', 'unknown')}" if success else str(response))

    def test_lead_submission(self):
        """Test public lead form submission"""
        print("\n📝 Testing Lead Submission...")
        
        lead_data = {
            "first_name": "Test",
            "last_name": "User",
            "email": "test@example.com",
            "phone": "0690123456",
            "company": "Test Company",
            "project_type": "site_vitrine",
            "budget": "1000-2000€",
            "message": "Test message for Alpha Agency"
        }
        
        success, response = self.make_request('POST', 'lead', lead_data)
        self.log_result("Lead Form Submission", success, response.get('message', str(response)) if success else str(response))

    def test_contacts_crud(self):
        """Test contacts CRUD operations"""
        print("\n👥 Testing Contacts Management...")
        
        # Create contact
        contact_data = {
            "first_name": "Jean",
            "last_name": "Dupont",
            "email": "jean.dupont@example.com",
            "phone": "0690987654",
            "company": "Dupont SARL",
            "project_type": "community_management",
            "budget": "500€/mois",
            "message": "Besoin d'aide pour les réseaux sociaux"
        }
        
        success, response = self.make_request('POST', 'contacts', contact_data, 200)
        if success and 'id' in response:
            self.contact_id = response['id']
            self.log_result("Create Contact", True, f"Contact ID: {self.contact_id}")
        else:
            self.log_result("Create Contact", False, str(response))
            return
        
        # Get contacts
        success, response = self.make_request('GET', 'contacts')
        self.log_result("Get Contacts", success, f"Found {len(response)} contacts" if success else str(response))
        
        # Get specific contact
        success, response = self.make_request('GET', f'contacts/{self.contact_id}')
        self.log_result("Get Contact by ID", success, f"Contact: {response.get('first_name', '')} {response.get('last_name', '')}" if success else str(response))
        
        # Update contact
        update_data = {"status": "qualifié", "score": "chaud"}
        success, response = self.make_request('PUT', f'contacts/{self.contact_id}', update_data)
        self.log_result("Update Contact", success, response.get('message', str(response)) if success else str(response))

    def test_opportunities_crud(self):
        """Test opportunities CRUD operations"""
        print("\n🎯 Testing Opportunities Management...")
        
        if not self.contact_id:
            self.log_result("Create Opportunity", False, "No contact_id available")
            return
        
        # Create opportunity
        opp_data = {
            "contact_id": self.contact_id,
            "title": "Site web + Community Management",
            "amount": 2500.0,
            "probability": 75,
            "status": "qualifié",
            "offer_type": "pack_360",
            "notes": "Client très intéressé par notre pack complet"
        }
        
        success, response = self.make_request('POST', 'opportunities', opp_data, 200)
        if success and 'id' in response:
            self.opportunity_id = response['id']
            self.log_result("Create Opportunity", True, f"Opportunity ID: {self.opportunity_id}")
        else:
            self.log_result("Create Opportunity", False, str(response))
            return
        
        # Get opportunities
        success, response = self.make_request('GET', 'opportunities')
        self.log_result("Get Opportunities", success, f"Found {len(response)} opportunities" if success else str(response))
        
        # Update opportunity
        update_data = {"status": "devis_envoyé", "probability": 85}
        success, response = self.make_request('PUT', f'opportunities/{self.opportunity_id}', update_data)
        self.log_result("Update Opportunity", success, response.get('message', str(response)) if success else str(response))

    def test_quotes_crud(self):
        """Test quotes CRUD operations"""
        print("\n📄 Testing Quotes Management...")
        
        if not self.contact_id:
            self.log_result("Create Quote", False, "No contact_id available")
            return
        
        # Create quote
        quote_data = {
            "contact_id": self.contact_id,
            "opportunity_id": self.opportunity_id,
            "items": [
                {
                    "description": "Site web vitrine responsive",
                    "quantity": 1,
                    "unit_price": 1200.0
                },
                {
                    "description": "Community Management (3 mois)",
                    "quantity": 3,
                    "unit_price": 450.0
                }
            ],
            "notes": "Devis pour pack site web + community management"
        }
        
        success, response = self.make_request('POST', 'quotes', quote_data, 201)
        if success and 'id' in response:
            self.quote_id = response['id']
            self.log_result("Create Quote", True, f"Quote ID: {self.quote_id}, Number: {response.get('quote_number', 'N/A')}")
        else:
            self.log_result("Create Quote", False, str(response))
            return
        
        # Get quotes
        success, response = self.make_request('GET', 'quotes')
        self.log_result("Get Quotes", success, f"Found {len(response)} quotes" if success else str(response))
        
        # Get specific quote
        success, response = self.make_request('GET', f'quotes/{self.quote_id}')
        self.log_result("Get Quote by ID", success, f"Quote total: {response.get('total', 0)}€" if success else str(response))

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, response = self.make_request('GET', 'dashboard/stats')
        if success:
            contacts_total = response.get('contacts', {}).get('total', 0)
            opps_total = response.get('opportunities', {}).get('total', 0)
            self.log_result("Dashboard Stats", True, f"Contacts: {contacts_total}, Opportunities: {opps_total}")
        else:
            self.log_result("Dashboard Stats", False, str(response))

    def test_upload_endpoints(self):
        """Test upload endpoints availability"""
        print("\n📤 Testing Upload Endpoints...")
        
        # Test without file (should fail with proper error)
        success, response = self.make_request('POST', 'upload/image', {}, 422)
        self.log_result("Upload Image Endpoint", success, "Endpoint available (422 expected without file)" if success else str(response))

    def test_documents_endpoints(self):
        """Test documents management endpoints"""
        print("\n📋 Testing Documents Management...")
        
        # Get document types
        success, response = self.make_request('GET', 'documents/types')
        if success:
            types_count = len(response.keys()) if isinstance(response, dict) else 0
            self.log_result("Get Document Types", True, f"Found {types_count} document types")
        else:
            self.log_result("Get Document Types", False, str(response))
        
        # Get documents
        success, response = self.make_request('GET', 'documents')
        self.log_result("Get Documents", success, f"Found {len(response)} documents" if success else str(response))

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        print("\n⚙️ Testing Settings...")
        
        success, response = self.make_request('GET', 'settings')
        if success:
            company_name = response.get('company', {}).get('commercial_name', 'N/A')
            self.log_result("Get Settings", True, f"Company: {company_name}")
        else:
            self.log_result("Get Settings", False, str(response))

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Alpha Agency Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication is required for most endpoints
        if not self.test_auth_login():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Test authenticated endpoints
        self.test_auth_me()
        self.test_contacts_crud()
        self.test_opportunities_crud()
        self.test_quotes_crud()
        self.test_dashboard_stats()
        self.test_upload_endpoints()
        self.test_documents_endpoints()
        self.test_settings_endpoints()
        
        # Test public endpoints
        self.test_lead_submission()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        return len(self.failed_tests) == 0

def main():
    tester = AlphaAgencyAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())