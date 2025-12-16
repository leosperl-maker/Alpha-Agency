import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Contacts
export const contactsAPI = {
  getAll: (params) => api.get('/contacts', { params }),
  getOne: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
};

// Opportunities
export const opportunitiesAPI = {
  getAll: (params) => api.get('/opportunities', { params }),
  create: (data) => api.post('/opportunities', data),
  update: (id, data) => api.put(`/opportunities/${id}`, data),
  delete: (id) => api.delete(`/opportunities/${id}`),
};

// Quotes
export const quotesAPI = {
  getAll: (params) => api.get('/quotes', { params }),
  getOne: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  send: (id) => api.post(`/quotes/${id}/send`),
  convertToInvoice: (id) => api.post(`/quotes/${id}/convert-to-invoice`),
  downloadPDF: (id) => `${API_URL}/api/quotes/${id}/pdf`,
};

// Invoices
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getOne: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  updateStatus: (id, status) => api.put(`/invoices/${id}/status?status=${status}`),
  downloadPDF: (id) => `${API_URL}/api/invoices/${id}/pdf`,
};

// Subscriptions
export const subscriptionsAPI = {
  getAll: (params) => api.get('/subscriptions', { params }),
  create: (data) => api.post('/subscriptions', data),
  updateStatus: (id, status) => api.put(`/subscriptions/${id}/status?status=${status}`),
};

// Tasks
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  create: (data) => api.post('/tasks', data),
  updateStatus: (id, status) => api.put(`/tasks/${id}/status?status=${status}`),
};

// Blog
export const blogAPI = {
  getAll: (params) => api.get('/blog', { params }),
  getOne: (slug) => api.get(`/blog/${slug}`),
  create: (data) => api.post('/blog', data),
};

// Portfolio
export const portfolioAPI = {
  getAll: (params) => api.get('/portfolio', { params }),
  create: (data) => api.post('/portfolio', data),
};

// Lead form (public)
export const leadAPI = {
  submit: (data) => api.post('/lead', data),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getPipeline: () => api.get('/dashboard/pipeline'),
  updateKPIs: (data) => api.put('/dashboard/kpis', data),
};

// Payments
export const paymentsAPI = {
  createCheckout: (plan, originUrl) => api.post(`/payments/create-checkout?plan=${plan}&origin_url=${encodeURIComponent(originUrl)}`),
  getStatus: (sessionId) => api.get(`/payments/status/${sessionId}`),
};

export default api;
