import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('alpha_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('alpha_token');
      localStorage.removeItem('alpha_user');
      // Don't redirect from public pages
      if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('login')) {
        window.location.href = '/alpha-admin-2024';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getPipeline: () => api.get('/dashboard/pipeline'),
  updateKPIs: (data) => api.put('/dashboard/kpis', data),
};

// Contacts API
export const contactsAPI = {
  getAll: (params) => api.get('/contacts', { params }),
  getOne: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  // Import functions
  parseImportFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/contacts/import/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  executeImport: (file, options) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(options.mapping));
    formData.append('status', options.status || 'nouveau');
    formData.append('tags', options.tags?.join(',') || '');
    formData.append('update_existing', options.updateExisting || false);
    formData.append('identifier_field', options.identifierField || 'email');
    formData.append('subscribe_email', options.subscribeEmail || false);
    formData.append('subscribe_sms', options.subscribeSms || false);
    return api.post('/contacts/import/execute', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Opportunities API
export const opportunitiesAPI = {
  getAll: (params) => api.get('/opportunities', { params }),
  getOne: (id) => api.get(`/opportunities/${id}`),
  create: (data) => api.post('/opportunities', data),
  update: (id, data) => api.put(`/opportunities/${id}`, data),
  updateStatus: (id, status) => api.patch(`/opportunities/${id}/status`, { status }),
  delete: (id) => api.delete(`/opportunities/${id}`),
};

// Quotes API
export const quotesAPI = {
  getAll: (params) => api.get('/quotes', { params }),
  getOne: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  updateStatus: (id, status) => api.patch(`/quotes/${id}/status`, { status }),
  send: (id) => api.post(`/quotes/${id}/send`),
  convertToInvoice: (id) => api.post(`/invoices/from-quote/${id}`),
  getPDF: (id) => api.get(`/quotes/${id}/pdf`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/quotes/${id}`),
  // Helper function to download PDF with authentication
  downloadPDF: async (id, quoteNumber) => {
    try {
      const response = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devis_${quoteNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getOne: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  createFromQuote: (quoteId) => api.post(`/invoices/from-quote/${quoteId}`),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  updateStatus: (id, status) => api.put(`/invoices/${id}/status`, { status }),
  getPDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/invoices/${id}`),
  // Payments
  getPayments: (id) => api.get(`/invoices/${id}/payments`),
  addPayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
  deletePayment: (invoiceId, paymentId) => api.delete(`/invoices/${invoiceId}/payments/${paymentId}`),
  // Helper function to download PDF with authentication
  downloadPDF: async (id, invoiceNumber, type = 'facture') => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_${invoiceNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('PDF download error:', error);
      throw error;
    }
  }
};

// Subscriptions API
export const subscriptionsAPI = {
  getAll: (params) => api.get('/subscriptions', { params }),
  getOne: (id) => api.get(`/subscriptions/${id}`),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  updateStatus: (id, status) => api.patch(`/subscriptions/${id}/status`, { status }),
  delete: (id) => api.delete(`/subscriptions/${id}`),
};

// Blog API
export const blogAPI = {
  getAll: (params) => api.get('/blog', { params }),
  getOne: (slug) => api.get(`/blog/${slug}`),
  create: (data) => api.post('/blog', data),
  update: (id, data) => api.put(`/blog/${id}`, data),
  delete: (id) => api.delete(`/blog/${id}`),
};

// Lead API (public)
export const leadAPI = {
  submit: (data) => api.post('/lead', data),
};

// Portfolio API
export const portfolioAPI = {
  getAll: (params) => api.get('/portfolio', { params }),
  create: (data) => api.post('/portfolio', data),
  update: (id, data) => api.put(`/portfolio/${id}`, data),
  delete: (id) => api.delete(`/portfolio/${id}`),
};

// Settings API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  updateCompany: (data) => api.put('/settings/company', data),
  updateSocialLinks: (data) => api.put('/settings/social-links', data),
  updateLegalTexts: (data) => api.put('/settings/legal-texts', data),
  updateIntegrations: (data) => api.put('/settings/integrations', data),
};

// Upload API
export const uploadAPI = {
  image: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  document: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  audio: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (publicId) => api.delete(`/upload/${publicId}`),
};

// Documents API
export const documentsAPI = {
  getTypes: () => api.get('/documents/types'),
  getAll: (params) => api.get('/documents', { params }),
  getOne: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents', data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  getPDF: (id) => api.get(`/documents/${id}/pdf`, { responseType: 'blob' }),
  exportZip: (params) => api.post('/documents/export-zip', params),
};

// Services API (for invoicing)
export const servicesAPI = {
  getAll: () => api.get('/services'),
  getOne: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

// Tasks API (Notion-style task manager)
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  getStats: () => api.get('/tasks/stats/summary'),
};

// Budget API
export const budgetAPI = {
  getAll: (params) => api.get('/budget', { params }),
  create: (data) => api.post('/budget', data),
  update: (id, data) => api.put(`/budget/${id}`, data),
  delete: (id) => api.delete(`/budget/${id}`),
  getSummary: (month) => api.get('/budget/summary', { params: { month } }),
  getMonthlyChart: (year) => api.get('/budget/monthly-chart', { params: { year } }),
};

// Backup API
export const backupAPI = {
  triggerManual: () => api.post('/backup/manual'),
  getStatus: () => api.get('/backup/status'),
  getHistory: (limit) => api.get('/backup/history', { params: { limit } }),
};

// Admin Users API
export const adminUsersAPI = {
  getAll: () => api.get('/admin/users'),
  create: (data) => api.post('/auth/register', data),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  delete: (id) => api.delete(`/admin/users/${id}`),
};

// Auth Password API
export const authPasswordAPI = {
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword }),
  changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

// Payments API
export const paymentsAPI = {
  createSession: (plan) => api.post('/payments/checkout', { plan }),
  getStatus: (sessionId) => api.get(`/payments/status/${sessionId}`),
};

export default api;
