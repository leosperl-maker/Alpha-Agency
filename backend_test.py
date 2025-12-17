#!/usr/bin/env python3
"""
ALPHA Agency Backend API Testing Suite
Tests all API endpoints for functionality and integration
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class AlphaAgencyAPITester:
    def __init__(self, base_url: str = "https://alphacommunicate.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", endpoint: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": details
            })
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "endpoint": endpoint
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, auth_required: bool = True) -> tuple[bool, Dict]:
        """Make API request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_auth_register(self) -> bool:
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@alphagency.fr"
        data = {
            "email": test_email,
            "password": "Test123456",
            "full_name": "Test User"
        }
        
        success, response = self.make_request('POST', 'auth/register', data, 200, False)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            self.log_test("Auth Registration", True, endpoint="auth/register")
            return True
        else:
            self.log_test("Auth Registration", False, 
                         f"Status or missing token: {response}", "auth/register")
            return False

    def test_auth_login(self) -> bool:
        """Test user login with provided credentials"""
        data = {
            "email": "test@alphagency.fr",
            "password": "Test123456"
        }
        
        success, response = self.make_request('POST', 'auth/login', data, 200, False)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            self.log_test("Auth Login", True, endpoint="auth/login")
            return True
        else:
            self.log_test("Auth Login", False, 
                         f"Login failed: {response}", "auth/login")
            return False

    def test_auth_me(self) -> bool:
        """Test get current user"""
        success, response = self.make_request('GET', 'auth/me')
        
        if success and 'email' in response:
            self.log_test("Auth Me", True, endpoint="auth/me")
            return True
        else:
            self.log_test("Auth Me", False, 
                         f"Failed to get user info: {response}", "auth/me")
            return False

    def test_lead_submission(self) -> str:
        """Test public lead form submission"""
        data = {
            "first_name": "Test",
            "last_name": "Lead",
            "email": f"lead_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "0691266003",
            "company": "Test Company",
            "project_type": "site_web",
            "budget": "1000_3000",
            "message": "Test lead submission"
        }
        
        success, response = self.make_request('POST', 'lead', data, 200, False)
        
        if success and 'contact_id' in response:
            contact_id = response['contact_id']
            self.log_test("Lead Submission", True, endpoint="lead")
            return contact_id
        else:
            self.log_test("Lead Submission", False, 
                         f"Lead submission failed: {response}", "lead")
            return None

    def test_contacts_crud(self, lead_contact_id: str = None) -> str:
        """Test contacts CRUD operations"""
        # Test GET all contacts
        success, response = self.make_request('GET', 'contacts')
        if success and isinstance(response, list):
            self.log_test("Contacts - Get All", True, endpoint="contacts")
        else:
            self.log_test("Contacts - Get All", False, 
                         f"Failed to get contacts: {response}", "contacts")

        # Test CREATE contact
        contact_data = {
            "first_name": "Test",
            "last_name": "Contact",
            "email": f"contact_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "0691266003",
            "company": "Test Company",
            "project_type": "site_web"
        }
        
        success, response = self.make_request('POST', 'contacts', contact_data, 200)
        contact_id = None
        if success and 'id' in response:
            contact_id = response['id']
            self.log_test("Contacts - Create", True, endpoint="contacts")
        else:
            self.log_test("Contacts - Create", False, 
                         f"Failed to create contact: {response}", "contacts")

        # Test GET single contact
        if contact_id:
            success, response = self.make_request('GET', f'contacts/{contact_id}')
            if success and 'id' in response:
                self.log_test("Contacts - Get One", True, endpoint=f"contacts/{contact_id}")
            else:
                self.log_test("Contacts - Get One", False, 
                             f"Failed to get contact: {response}", f"contacts/{contact_id}")

            # Test UPDATE contact
            update_data = {"status": "qualifié", "score": "chaud"}
            success, response = self.make_request('PUT', f'contacts/{contact_id}', update_data)
            if success:
                self.log_test("Contacts - Update", True, endpoint=f"contacts/{contact_id}")
            else:
                self.log_test("Contacts - Update", False, 
                             f"Failed to update contact: {response}", f"contacts/{contact_id}")

        return contact_id

    def test_opportunities_crud(self, contact_id: str) -> str:
        """Test opportunities CRUD operations"""
        if not contact_id:
            self.log_test("Opportunities - Skipped", False, "No contact_id available", "opportunities")
            return None

        # Test CREATE opportunity
        opp_data = {
            "contact_id": contact_id,
            "title": "Test Opportunity",
            "amount": 2500.0,
            "probability": 75,
            "status": "nouveau",
            "offer_type": "site_web"
        }
        
        success, response = self.make_request('POST', 'opportunities', opp_data, 200)
        opp_id = None
        if success and 'id' in response:
            opp_id = response['id']
            self.log_test("Opportunities - Create", True, endpoint="opportunities")
        else:
            self.log_test("Opportunities - Create", False, 
                         f"Failed to create opportunity: {response}", "opportunities")

        # Test GET all opportunities
        success, response = self.make_request('GET', 'opportunities')
        if success and isinstance(response, list):
            self.log_test("Opportunities - Get All", True, endpoint="opportunities")
        else:
            self.log_test("Opportunities - Get All", False, 
                         f"Failed to get opportunities: {response}", "opportunities")

        # Test UPDATE opportunity
        if opp_id:
            update_data = {"status": "qualifié", "probability": 85}
            success, response = self.make_request('PUT', f'opportunities/{opp_id}', update_data)
            if success:
                self.log_test("Opportunities - Update", True, endpoint=f"opportunities/{opp_id}")
            else:
                self.log_test("Opportunities - Update", False, 
                             f"Failed to update opportunity: {response}", f"opportunities/{opp_id}")

        return opp_id

    def test_quotes_crud(self, contact_id: str, opp_id: str = None) -> str:
        """Test quotes CRUD operations"""
        if not contact_id:
            self.log_test("Quotes - Skipped", False, "No contact_id available", "quotes")
            return None

        # Test CREATE quote
        quote_data = {
            "contact_id": contact_id,
            "opportunity_id": opp_id,
            "items": [
                {
                    "description": "Site web professionnel",
                    "quantity": 1,
                    "unit_price": 2500.0
                }
            ],
            "notes": "Devis pour site web"
        }
        
        success, response = self.make_request('POST', 'quotes', quote_data, 200)
        quote_id = None
        if success and 'id' in response:
            quote_id = response['id']
            self.log_test("Quotes - Create", True, endpoint="quotes")
        else:
            self.log_test("Quotes - Create", False, 
                         f"Failed to create quote: {response}", "quotes")

        # Test GET all quotes
        success, response = self.make_request('GET', 'quotes')
        if success and isinstance(response, list):
            self.log_test("Quotes - Get All", True, endpoint="quotes")
        else:
            self.log_test("Quotes - Get All", False, 
                         f"Failed to get quotes: {response}", "quotes")

        # Test GET single quote
        if quote_id:
            success, response = self.make_request('GET', f'quotes/{quote_id}')
            if success and 'id' in response:
                self.log_test("Quotes - Get One", True, endpoint=f"quotes/{quote_id}")
            else:
                self.log_test("Quotes - Get One", False, 
                             f"Failed to get quote: {response}", f"quotes/{quote_id}")

        return quote_id

    def test_invoices_crud(self, contact_id: str, quote_id: str = None) -> str:
        """Test invoices CRUD operations"""
        if not contact_id:
            self.log_test("Invoices - Skipped", False, "No contact_id available", "invoices")
            return None

        # Test CREATE invoice
        invoice_data = {
            "contact_id": contact_id,
            "quote_id": quote_id,
            "items": [
                {
                    "description": "Site web professionnel",
                    "quantity": 1,
                    "unit_price": 2500.0
                }
            ],
            "notes": "Facture pour site web"
        }
        
        success, response = self.make_request('POST', 'invoices', invoice_data, 200)
        invoice_id = None
        if success and 'id' in response:
            invoice_id = response['id']
            self.log_test("Invoices - Create", True, endpoint="invoices")
        else:
            self.log_test("Invoices - Create", False, 
                         f"Failed to create invoice: {response}", "invoices")

        # Test GET all invoices
        success, response = self.make_request('GET', 'invoices')
        if success and isinstance(response, list):
            self.log_test("Invoices - Get All", True, endpoint="invoices")
        else:
            self.log_test("Invoices - Get All", False, 
                         f"Failed to get invoices: {response}", "invoices")

        return invoice_id

    def test_subscriptions_crud(self, contact_id: str) -> str:
        """Test subscriptions CRUD operations"""
        if not contact_id:
            self.log_test("Subscriptions - Skipped", False, "No contact_id available", "subscriptions")
            return None

        # Test CREATE subscription
        sub_data = {
            "contact_id": contact_id,
            "plan_name": "Site Web 90€/mois",
            "amount": 90.0,
            "billing_cycle": "monthly"
        }
        
        success, response = self.make_request('POST', 'subscriptions', sub_data, 200)
        sub_id = None
        if success and 'id' in response:
            sub_id = response['id']
            self.log_test("Subscriptions - Create", True, endpoint="subscriptions")
        else:
            self.log_test("Subscriptions - Create", False, 
                         f"Failed to create subscription: {response}", "subscriptions")

        # Test GET all subscriptions
        success, response = self.make_request('GET', 'subscriptions')
        if success and isinstance(response, list):
            self.log_test("Subscriptions - Get All", True, endpoint="subscriptions")
        else:
            self.log_test("Subscriptions - Get All", False, 
                         f"Failed to get subscriptions: {response}", "subscriptions")

        return sub_id

    def test_dashboard_stats(self) -> bool:
        """Test dashboard statistics endpoint"""
        success, response = self.make_request('GET', 'dashboard/stats')
        
        if success and 'contacts' in response:
            self.log_test("Dashboard Stats", True, endpoint="dashboard/stats")
            return True
        else:
            self.log_test("Dashboard Stats", False, 
                         f"Failed to get dashboard stats: {response}", "dashboard/stats")
            return False

    def test_pipeline(self) -> bool:
        """Test pipeline endpoint"""
        success, response = self.make_request('GET', 'dashboard/pipeline')
        
        if success and isinstance(response, dict):
            self.log_test("Dashboard Pipeline", True, endpoint="dashboard/pipeline")
            return True
        else:
            self.log_test("Dashboard Pipeline", False, 
                         f"Failed to get pipeline: {response}", "dashboard/pipeline")
            return False

    def run_all_tests(self) -> Dict[str, Any]:
        """Run complete test suite"""
        print("🚀 Starting ALPHA Agency API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Test authentication first
        auth_success = False
        if not self.test_auth_login():
            # If login fails, try registration
            auth_success = self.test_auth_register()
        else:
            auth_success = True
            
        if auth_success:
            self.test_auth_me()

        # Test public endpoints (no auth required)
        lead_contact_id = self.test_lead_submission()

        if not auth_success:
            print("\n❌ Authentication failed - skipping protected endpoints")
            return self.get_results()

        # Test protected endpoints
        contact_id = self.test_contacts_crud(lead_contact_id)
        opp_id = self.test_opportunities_crud(contact_id)
        quote_id = self.test_quotes_crud(contact_id, opp_id)
        invoice_id = self.test_invoices_crud(contact_id, quote_id)
        sub_id = self.test_subscriptions_crud(contact_id)
        
        # Test dashboard endpoints
        self.test_dashboard_stats()
        self.test_pipeline()

        return self.get_results()

    def get_results(self) -> Dict[str, Any]:
        """Get test results summary"""
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": len(self.failed_tests),
            "success_rate": round(success_rate, 2),
            "failures": self.failed_tests,
            "all_results": self.test_results
        }

    def print_summary(self, results: Dict[str, Any]):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {results['total_tests']}")
        print(f"Passed: {results['passed_tests']}")
        print(f"Failed: {results['failed_tests']}")
        print(f"Success Rate: {results['success_rate']}%")
        
        if results['failures']:
            print(f"\n❌ FAILED TESTS ({len(results['failures'])}):")
            for failure in results['failures']:
                print(f"  • {failure['test']} ({failure['endpoint']})")
                print(f"    Error: {failure['error']}")
        
        print("\n" + "=" * 60)

def main():
    """Main test execution"""
    tester = AlphaAgencyAPITester()
    results = tester.run_all_tests()
    tester.print_summary(results)
    
    # Return appropriate exit code
    return 0 if results['success_rate'] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())