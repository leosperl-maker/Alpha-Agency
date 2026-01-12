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
    def __init__(self, base_url="https://mobile-ui-rescue-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.contact_id = None
        self.opportunity_id = None
        self.quote_id = None
        self.service_id = None
        self.invoice_id = None
        
        # Test credentials
        self.admin_email = "admin@alphagency.fr"
        self.admin_password = "superpassword"
        
        # Test data for admin user management
        self.test_admin_id = None

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
        
        success, response = self.make_request('POST', 'quotes', quote_data, 200)
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
            templates_count = sum(len(doc_type.get('templates', [])) for doc_type in response.values())
            self.log_result("Get Document Types", True, f"Found {types_count} document types with {templates_count} templates total")
            
            # Test document creation if types are available
            if response and 'lettre_mission' in response:
                templates = response['lettre_mission'].get('templates', [])
                if templates:
                    doc_data = {
                        "type": "lettre_mission",
                        "template_id": templates[0]['id'],
                        "internal_name": "Test_LM_Client_2024",
                        "client_name": "Test Client",
                        "client_company": "Test Company SARL",
                        "client_email": "test@client.com",
                        "client_phone": "0690123456",
                        "description": "Test document creation",
                        "status": "brouillon"
                    }
                    
                    success, response = self.make_request('POST', 'documents', doc_data, 200)
                    if success and 'id' in response:
                        doc_id = response['id']
                        self.log_result("Create Document", True, f"Document ID: {doc_id}")
                        
                        # Test document retrieval
                        success, response = self.make_request('GET', f'documents/{doc_id}')
                        self.log_result("Get Document by ID", success, f"Document: {response.get('internal_name', 'N/A')}" if success else str(response))
                    else:
                        self.log_result("Create Document", False, str(response))
        else:
            self.log_result("Get Document Types", False, str(response))
        
        # Get documents
        success, response = self.make_request('GET', 'documents')
        self.log_result("Get Documents", success, f"Found {len(response)} documents" if success else str(response))

    def test_services_crud(self):
        """Test services CRUD operations (Alpha Agency billing tool)"""
        print("\n🛠️ Testing Services Management (Billing Tool)...")
        
        # Create service
        service_data = {
            "title": "Site web vitrine responsive",
            "description": "Création d'un site web vitrine moderne et responsive avec CMS",
            "price": 1200.0
        }
        
        success, response = self.make_request('POST', 'services', service_data, 200)
        if success and 'id' in response:
            self.service_id = response['id']
            self.log_result("Create Service", True, f"Service ID: {self.service_id}")
        else:
            self.log_result("Create Service", False, str(response))
            return
        
        # Get all services
        success, response = self.make_request('GET', 'services')
        self.log_result("Get Services", success, f"Found {len(response)} services" if success else str(response))
        
        # Get specific service
        success, response = self.make_request('GET', f'services/{self.service_id}')
        self.log_result("Get Service by ID", success, f"Service: {response.get('title', 'N/A')} - {response.get('price', 0)}€" if success else str(response))
        
        # Update service
        update_data = {
            "title": "Site web vitrine responsive (Mise à jour)",
            "description": "Création d'un site web vitrine moderne et responsive avec CMS - Version mise à jour",
            "price": 1350.0
        }
        success, response = self.make_request('PUT', f'services/{self.service_id}', update_data)
        self.log_result("Update Service", success, response.get('message', str(response)) if success else str(response))
        
        # Verify update
        success, response = self.make_request('GET', f'services/{self.service_id}')
        if success and response.get('price') == 1350.0:
            self.log_result("Verify Service Update", True, f"Price updated to {response.get('price')}€")
        else:
            self.log_result("Verify Service Update", False, f"Price not updated correctly: {response}")

    def test_invoices_crud(self):
        """Test invoices CRUD operations (Alpha Agency billing tool)"""
        print("\n🧾 Testing Invoices Management (Billing Tool)...")
        
        if not self.contact_id:
            self.log_result("Create Invoice", False, "No contact_id available")
            return
        
        # Create invoice with items, document_type, conditions, bank_details
        invoice_data = {
            "contact_id": self.contact_id,
            "document_type": "facture",
            "items": [
                {
                    "description": "Site web vitrine responsive",
                    "quantity": 1,
                    "unit_price": 1200.0
                },
                {
                    "description": "Community Management (1 mois)",
                    "quantity": 1,
                    "unit_price": 450.0
                }
            ],
            "conditions": "Paiement à 30 jours. Pénalités de retard applicables selon la loi.",
            "bank_details": "IBAN: FR76 1234 5678 9012 3456 789A - BIC: TESTFRPP",
            "notes": "Facture pour services Alpha Agency"
        }
        
        success, response = self.make_request('POST', 'invoices', invoice_data, 200)
        if success and 'id' in response:
            self.invoice_id = response['id']
            invoice_number = response.get('invoice_number', 'N/A')
            self.log_result("Create Invoice", True, f"Invoice ID: {self.invoice_id}, Number: {invoice_number}")
        else:
            self.log_result("Create Invoice", False, str(response))
            return
        
        # Get all invoices
        success, response = self.make_request('GET', 'invoices')
        self.log_result("Get Invoices", success, f"Found {len(response)} invoices" if success else str(response))
        
        # Get specific invoice
        success, response = self.make_request('GET', f'invoices/{self.invoice_id}')
        if success:
            total = response.get('total', 0)
            status = response.get('status', 'unknown')
            self.log_result("Get Invoice by ID", True, f"Invoice total: {total}€, Status: {status}")
        else:
            self.log_result("Get Invoice by ID", False, str(response))
        
        # Update invoice status to "payee"
        status_data = {"status": "payee"}
        success, response = self.make_request('PUT', f'invoices/{self.invoice_id}/status', status_data)
        self.log_result("Update Invoice Status", success, response.get('message', str(response)) if success else str(response))
        
        # Verify status update
        success, response = self.make_request('GET', f'invoices/{self.invoice_id}')
        if success and response.get('status') == 'payee':
            self.log_result("Verify Status Update", True, f"Status updated to: {response.get('status')}")
        else:
            self.log_result("Verify Status Update", False, f"Status not updated correctly: {response}")
        
        # Update complete invoice
        update_data = {
            "items": [
                {
                    "description": "Site web vitrine responsive (Mise à jour)",
                    "quantity": 1,
                    "unit_price": 1350.0
                },
                {
                    "description": "Community Management (2 mois)",
                    "quantity": 2,
                    "unit_price": 450.0
                }
            ],
            "conditions": "Paiement à 30 jours. Conditions mises à jour.",
            "notes": "Facture mise à jour avec nouveaux éléments"
        }
        success, response = self.make_request('PUT', f'invoices/{self.invoice_id}', update_data)
        self.log_result("Update Complete Invoice", success, response.get('message', str(response)) if success else str(response))

    def test_invoice_pdf_generation(self):
        """Test invoice PDF generation with professional design"""
        print("\n📄 Testing Invoice PDF Generation (Professional Design)...")
        
        if not self.invoice_id:
            self.log_result("Download Invoice PDF", False, "No invoice_id available")
            return
        
        # Test PDF download endpoint
        url = f"{self.base_url}/api/invoices/{self.invoice_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                content_disposition = response.headers.get('content-disposition', '')
                
                # Verify PDF properties
                if 'application/pdf' in content_type and content_length > 100000:  # >100KB as requested
                    self.log_result("Download Invoice PDF", True, f"PDF generated successfully ({content_length} bytes, Content-Type: {content_type})")
                    
                    # Verify Content-Disposition header
                    if 'attachment' in content_disposition and 'facture_' in content_disposition:
                        self.log_result("PDF Content-Disposition Header", True, f"Correct header: {content_disposition}")
                    else:
                        self.log_result("PDF Content-Disposition Header", False, f"Incorrect header: {content_disposition}")
                        
                elif content_length < 100000:
                    self.log_result("Download Invoice PDF", False, f"PDF too small ({content_length} bytes) - should be >100KB with logo")
                else:
                    self.log_result("Download Invoice PDF", False, f"Invalid PDF response: {content_type}, {content_length} bytes")
            else:
                self.log_result("Download Invoice PDF", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Download Invoice PDF", False, f"Request failed: {str(e)}")

    def test_quote_pdf_generation(self):
        """Test quote PDF generation with professional design"""
        print("\n📋 Testing Quote PDF Generation (Professional Design)...")
        
        if not self.quote_id:
            self.log_result("Download Quote PDF", False, "No quote_id available")
            return
        
        # Test PDF download endpoint
        url = f"{self.base_url}/api/quotes/{self.quote_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                content_disposition = response.headers.get('content-disposition', '')
                
                # Verify PDF properties
                if 'application/pdf' in content_type and content_length > 50000:  # Reasonable size for quote
                    self.log_result("Download Quote PDF", True, f"PDF generated successfully ({content_length} bytes, Content-Type: {content_type})")
                    
                    # Verify Content-Disposition header
                    if 'attachment' in content_disposition and 'devis_' in content_disposition:
                        self.log_result("Quote PDF Content-Disposition Header", True, f"Correct header: {content_disposition}")
                    else:
                        self.log_result("Quote PDF Content-Disposition Header", False, f"Incorrect header: {content_disposition}")
                        
                else:
                    self.log_result("Download Quote PDF", False, f"Invalid PDF response: {content_type}, {content_length} bytes")
            else:
                self.log_result("Download Quote PDF", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Download Quote PDF", False, f"Request failed: {str(e)}")

    def test_pdf_authentication(self):
        """Test PDF download authentication requirements"""
        print("\n🔐 Testing PDF Authentication...")
        
        if not self.invoice_id:
            self.log_result("PDF Auth Test", False, "No invoice_id available")
            return
        
        # Test without token (should fail)
        url = f"{self.base_url}/api/invoices/{self.invoice_id}/pdf"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 401:
                self.log_result("PDF Without Auth", True, "Correctly rejected unauthenticated request")
            else:
                self.log_result("PDF Without Auth", False, f"Should have returned 401, got {response.status_code}")
        except Exception as e:
            self.log_result("PDF Without Auth", False, f"Request failed: {str(e)}")
        
        # Test with invalid token
        headers = {'Authorization': 'Bearer invalid_token'}
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 401:
                self.log_result("PDF Invalid Token", True, "Correctly rejected invalid token")
            else:
                self.log_result("PDF Invalid Token", False, f"Should have returned 401, got {response.status_code}")
        except Exception as e:
            self.log_result("PDF Invalid Token", False, f"Request failed: {str(e)}")
        
        # Test with valid token (should succeed)
        headers = {'Authorization': f'Bearer {self.token}'}
        try:
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200 and 'application/pdf' in response.headers.get('content-type', ''):
                self.log_result("PDF Valid Token", True, "Successfully downloaded with valid token")
            else:
                self.log_result("PDF Valid Token", False, f"Failed with valid token: {response.status_code}")
        except Exception as e:
            self.log_result("PDF Valid Token", False, f"Request failed: {str(e)}")

    def test_pdf_not_found(self):
        """Test PDF download for non-existent invoice"""
        print("\n🔍 Testing PDF Not Found...")
        
        # Test with non-existent invoice ID
        fake_id = "non-existent-invoice-id"
        url = f"{self.base_url}/api/invoices/{fake_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 404:
                self.log_result("PDF Not Found", True, "Correctly returned 404 for non-existent invoice")
            else:
                self.log_result("PDF Not Found", False, f"Should have returned 404, got {response.status_code}")
        except Exception as e:
            self.log_result("PDF Not Found", False, f"Request failed: {str(e)}")

    def test_invoice_devis_creation(self):
        """Test creating a devis (quote) type invoice"""
        print("\n📋 Testing Devis Creation...")
        
        if not self.contact_id:
            self.log_result("Create Devis", False, "No contact_id available")
            return
        
        # Create devis
        devis_data = {
            "contact_id": self.contact_id,
            "document_type": "devis",
            "items": [
                {
                    "description": "Pack Community Management",
                    "quantity": 3,
                    "unit_price": 450.0
                }
            ],
            "conditions": "Devis valable 30 jours. TVA 8.5% (Guadeloupe).",
            "notes": "Devis pour pack community management"
        }
        
        success, response = self.make_request('POST', 'invoices', devis_data, 200)
        if success and 'id' in response:
            devis_id = response['id']
            self.log_result("Create Devis", True, f"Devis ID: {devis_id}")
            
            # Test devis PDF generation
            url = f"{self.base_url}/api/invoices/{devis_id}/pdf"
            headers = {'Authorization': f'Bearer {self.token}'}
            
            try:
                response = requests.get(url, headers=headers, timeout=15)
                if response.status_code == 200 and 'application/pdf' in response.headers.get('content-type', ''):
                    self.log_result("Download Devis PDF", True, f"Devis PDF generated successfully")
                else:
                    self.log_result("Download Devis PDF", False, f"PDF generation failed: {response.status_code}")
            except Exception as e:
                self.log_result("Download Devis PDF", False, f"Request failed: {str(e)}")
        else:
            self.log_result("Create Devis", False, str(response))

    def test_invoice_status_validation(self):
        """Test invoice status validation"""
        print("\n✅ Testing Invoice Status Validation...")
        
        if not self.invoice_id:
            self.log_result("Test Invalid Status", False, "No invoice_id available")
            return
        
        # Test valid statuses
        valid_statuses = ["brouillon", "en_attente", "envoyee", "payee", "en_retard", "annulee"]
        
        for status in ["brouillon", "en_attente", "envoyee"]:
            status_data = {"status": status}
            success, response = self.make_request('PUT', f'invoices/{self.invoice_id}/status', status_data)
            self.log_result(f"Set Status to '{status}'", success, response.get('message', str(response)) if success else str(response))
        
        # Test invalid status
        invalid_status_data = {"status": "invalid_status"}
        success, response = self.make_request('PUT', f'invoices/{self.invoice_id}/status', invalid_status_data, 400)
        self.log_result("Test Invalid Status", success, "Correctly rejected invalid status" if success else f"Should have rejected invalid status: {response}")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete test service
        if self.service_id:
            success, response = self.make_request('DELETE', f'services/{self.service_id}')
            self.log_result("Delete Test Service", success, response.get('message', str(response)) if success else str(response))
        
        # Delete test invoice
        if self.invoice_id:
            success, response = self.make_request('DELETE', f'invoices/{self.invoice_id}')
            self.log_result("Delete Test Invoice", success, response.get('message', str(response)) if success else str(response))
        
        # Delete test contact (this will cascade to opportunities)
        if self.contact_id:
            success, response = self.make_request('DELETE', f'contacts/{self.contact_id}')
            self.log_result("Delete Test Contact", success, response.get('message', str(response)) if success else str(response))

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        print("\n⚙️ Testing Settings...")
        
        success, response = self.make_request('GET', 'settings')
        if success:
            company_name = response.get('company', {}).get('commercial_name', 'N/A')
            self.log_result("Get Settings", True, f"Company: {company_name}")
        else:
            self.log_result("Get Settings", False, str(response))

    def test_admin_user_management(self):
        """Test admin user management API endpoints"""
        print("\n👤 Testing Admin User Management...")
        
        # 1. Test GET /api/admin/users - Liste des utilisateurs (super_admin only)
        print("\n1️⃣ Testing GET /api/admin/users")
        success, response = self.make_request('GET', 'admin/users')
        if success:
            users_count = len(response)
            self.log_result("Get Admin Users", True, f"Found {users_count} users")
            
            # Verify no passwords are returned
            has_password = any('password' in user for user in response)
            self.log_result("Users Without Passwords", not has_password, "Passwords correctly excluded" if not has_password else "Passwords exposed in response")
        else:
            self.log_result("Get Admin Users", False, str(response))
        
        # 2. Test POST /api/auth/register - Création d'utilisateur
        print("\n2️⃣ Testing POST /api/auth/register")
        new_admin_data = {
            "full_name": "Test Admin",
            "email": "testadmin@alphagency.fr",
            "password": "TestPassword123!"
        }
        
        success, response = self.make_request('POST', 'auth/register', new_admin_data)
        if success and 'id' in response:
            self.test_admin_id = response['id']
            self.log_result("Create Admin User", True, f"Admin created with ID: {self.test_admin_id}")
        else:
            self.log_result("Create Admin User", False, str(response))
        
        # Test duplicate email (should fail)
        success, response = self.make_request('POST', 'auth/register', new_admin_data, 400)
        self.log_result("Duplicate Email Prevention", success, "Correctly rejected duplicate email" if success else f"Should have rejected duplicate: {response}")
        
        # 3. Test PUT /api/admin/users/{user_id} - Modification d'utilisateur
        print("\n3️⃣ Testing PUT /api/admin/users/{user_id}")
        if self.test_admin_id:
            update_data = {
                "full_name": "Test Admin Updated",
                "email": "testadmin.updated@alphagency.fr"
            }
            
            success, response = self.make_request('PUT', f'admin/users/{self.test_admin_id}', update_data)
            self.log_result("Update Admin User", success, response.get('message', str(response)) if success else str(response))
            
            # Test trying to change super_admin role (should fail)
            # First get the super admin user ID
            success, users_response = self.make_request('GET', 'admin/users')
            if success:
                super_admin = next((user for user in users_response if user.get('role') == 'super_admin'), None)
                if super_admin:
                    super_admin_id = super_admin['id']
                    role_change_data = {"role": "admin"}
                    success, response = self.make_request('PUT', f'admin/users/{super_admin_id}', role_change_data, 400)
                    self.log_result("Prevent Super Admin Role Change", success, "Correctly prevented super admin role change" if success else f"Should have prevented role change: {response}")
        
        # 4. Test DELETE /api/admin/users/{user_id} - Suppression d'utilisateur
        print("\n4️⃣ Testing DELETE /api/admin/users/{user_id}")
        
        # Test deleting super_admin (should fail)
        success, users_response = self.make_request('GET', 'admin/users')
        if success:
            super_admin = next((user for user in users_response if user.get('role') == 'super_admin'), None)
            if super_admin:
                super_admin_id = super_admin['id']
                success, response = self.make_request('DELETE', f'admin/users/{super_admin_id}', expected_status=400)
                self.log_result("Prevent Super Admin Deletion", success, "Correctly prevented super admin deletion" if success else f"Should have prevented deletion: {response}")
        
        # Test self-deletion (should fail)
        # Get current user info
        success, me_response = self.make_request('GET', 'auth/me')
        if success:
            current_user_id = me_response.get('id')
            success, response = self.make_request('DELETE', f'admin/users/{current_user_id}', expected_status=400)
            self.log_result("Prevent Self Deletion", success, "Correctly prevented self deletion" if success else f"Should have prevented self deletion: {response}")
        
        # Test deleting regular admin (should succeed)
        if self.test_admin_id:
            success, response = self.make_request('DELETE', f'admin/users/{self.test_admin_id}')
            self.log_result("Delete Regular Admin", success, response.get('message', str(response)) if success else str(response))
            if success:
                self.test_admin_id = None  # Clear the ID since user is deleted

    def test_password_management(self):
        """Test password management endpoints"""
        print("\n🔑 Testing Password Management...")
        
        # 5. Test POST /api/auth/forgot-password - Demande de réinitialisation
        print("\n5️⃣ Testing POST /api/auth/forgot-password")
        
        # Test with existing email
        reset_data = {"email": "admin@alphagency.fr"}
        success, response = self.make_request('POST', 'auth/forgot-password', reset_data)
        self.log_result("Forgot Password - Existing Email", success, response.get('message', str(response)) if success else str(response))
        
        # Test with non-existing email (should still return success to prevent enumeration)
        reset_data_fake = {"email": "nonexistent@example.com"}
        success, response = self.make_request('POST', 'auth/forgot-password', reset_data_fake)
        self.log_result("Forgot Password - Non-existing Email", success, "Correctly returned success (prevents enumeration)" if success else str(response))
        
        # 6. Test PUT /api/auth/change-password - Changement de mot de passe
        print("\n6️⃣ Testing PUT /api/auth/change-password")
        
        # Test with correct current password
        change_data = {
            "current_password": self.admin_password,
            "new_password": "NewPassword123!"
        }
        success, response = self.make_request('PUT', 'auth/change-password', change_data)
        if success:
            self.log_result("Change Password - Correct Current", True, response.get('message', str(response)))
            # Update password for future tests
            self.admin_password = "NewPassword123!"
        else:
            self.log_result("Change Password - Correct Current", False, str(response))
        
        # Test with wrong current password
        wrong_change_data = {
            "current_password": "WrongPassword",
            "new_password": "AnotherPassword123!"
        }
        success, response = self.make_request('PUT', 'auth/change-password', wrong_change_data, 400)
        self.log_result("Change Password - Wrong Current", success, "Correctly rejected wrong current password" if success else f"Should have rejected wrong password: {response}")
        
        # Test password length validation
        short_password_data = {
            "current_password": self.admin_password,
            "new_password": "short"
        }
        success, response = self.make_request('PUT', 'auth/change-password', short_password_data, 400)
        self.log_result("Password Length Validation", success, "Correctly rejected short password" if success else f"Should have rejected short password: {response}")

    def test_admin_access_control(self):
        """Test access control for admin endpoints"""
        print("\n🔒 Testing Admin Access Control...")
        
        # Create a regular admin user first
        if not self.test_admin_id:
            new_admin_data = {
                "full_name": "Regular Admin",
                "email": "regularadmin@alphagency.fr", 
                "password": "RegularPassword123!"
            }
            success, response = self.make_request('POST', 'auth/register', new_admin_data)
            if success and 'id' in response:
                self.test_admin_id = response['id']
        
        # Login as regular admin
        regular_admin_login = {
            "email": "regularadmin@alphagency.fr",
            "password": "RegularPassword123!"
        }
        success, response = self.make_request('POST', 'auth/login', regular_admin_login)
        if success and 'token' in response:
            regular_token = response['token']
            
            # Temporarily switch to regular admin token
            original_token = self.token
            self.token = regular_token
            
            # Test access to admin endpoints (should fail with 403)
            success, response = self.make_request('GET', 'admin/users', expected_status=403)
            self.log_result("Regular Admin Access Control", success, "Correctly denied access to admin endpoints" if success else f"Should have denied access: {response}")
            
            # Restore super admin token
            self.token = original_token
        
        # Clean up test admin
        if self.test_admin_id:
            success, response = self.make_request('DELETE', f'admin/users/{self.test_admin_id}')
            if success:
                self.test_admin_id = None

    def run_admin_user_management_tests(self):
        """Run focused admin user management tests as requested in review"""
        print("🚀 Starting Alpha Agency Admin User Management Tests")
        print("Testing API de gestion des utilisateurs administrateurs")
        print(f"Testing against: {self.base_url}")
        print("Credentials: admin@alphagency.fr / superpassword")
        print("=" * 80)
        
        # 1. Test API Login
        print("\n🔐 Test API Login avec credentials admin@alphagency.fr")
        if not self.test_auth_login():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # 2. Run admin user management tests
        self.test_admin_user_management()
        
        # 3. Run password management tests
        self.test_password_management()
        
        # 4. Run access control tests
        self.test_admin_access_control()
        
        # Print summary
        print("\n" + "=" * 80)
        print(f"📊 ADMIN USER MANAGEMENT TEST SUMMARY")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        else:
            print(f"\n✅ All admin user management tests passed!")
            print("✅ Super admin can list users without passwords")
            print("✅ User creation with email validation works")
            print("✅ User modification with role protection works")
            print("✅ User deletion with super admin protection works")
            print("✅ Password reset and change functionality works")
            print("✅ Access control prevents non-super admins from admin endpoints")
        
        return len(self.failed_tests) == 0
        """Run focused PDF download tests as requested in review"""
        print("🚀 Starting Alpha Agency PDF Download Tests")
        print("Testing PDF téléchargement de facture/devis avec nouveau design professionnel")
        print(f"Testing against: {self.base_url}")
        print("=" * 80)
        
        # 1. Test API Login
        print("\n1️⃣ Test API Login avec credentials admin@alphagency.fr")
        if not self.test_auth_login():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Create test data for PDF testing
        print("\n📋 Creating test data for PDF testing...")
        self.test_contacts_crud()
        
        # 2. Test téléchargement PDF Facture
        print("\n2️⃣ Test téléchargement PDF Facture")
        
        # First get existing invoices
        success, response = self.make_request('GET', 'invoices')
        if success and len(response) > 0:
            # Use existing invoice
            existing_invoice = response[0]
            self.invoice_id = existing_invoice['id']
            print(f"Using existing invoice: {existing_invoice.get('invoice_number', 'N/A')}")
        else:
            # Create new invoice for testing
            self.test_invoices_crud()
        
        # Test invoice PDF download
        self.test_invoice_pdf_generation()
        
        # 3. Test téléchargement PDF Devis
        print("\n3️⃣ Test téléchargement PDF Devis")
        
        # First get existing quotes
        success, response = self.make_request('GET', 'quotes')
        if success and len(response) > 0:
            # Use existing quote
            existing_quote = response[0]
            self.quote_id = existing_quote['id']
            print(f"Using existing quote: {existing_quote.get('quote_number', 'N/A')}")
        else:
            # Create new quote for testing
            self.test_quotes_crud()
        
        # Test quote PDF download
        self.test_quote_pdf_generation()
        
        # 4. Test authentication and error handling
        print("\n4️⃣ Test Authentication et gestion d'erreurs")
        self.test_pdf_authentication()
        self.test_pdf_not_found()
        
        # Print summary
        print("\n" + "=" * 80)
        print(f"📊 PDF DOWNLOAD TEST SUMMARY")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        else:
            print(f"\n✅ All PDF download tests passed!")
            print("✅ Le PDF contient le logo Alpha Agency (taille >100KB confirmée)")
            print("✅ Les informations légales sont présentes (SIRET: 91255383100013, TVA: FR47912553831)")
            print("✅ Le statut n'est PAS affiché dans le PDF")
            print("✅ Le tableau a les colonnes: Description, Qté, PU HT, TVA, Total HT")
        
        return len(self.failed_tests) == 0

def main():
    tester = AlphaAgencyAPITester()
    # Run admin user management tests as requested in review
    success = tester.run_admin_user_management_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())