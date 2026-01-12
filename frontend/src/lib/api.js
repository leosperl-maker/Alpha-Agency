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
  getHistory: (id) => api.get(`/contacts/${id}/history`),
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

// Pipeline Columns API
export const pipelineColumnsAPI = {
  getAll: () => api.get('/pipeline/columns'),
  create: (data) => api.post('/pipeline/columns', data),
  update: (id, data) => api.put(`/pipeline/columns/${id}`, data),
  delete: (id) => api.delete(`/pipeline/columns/${id}`),
  reorder: (columnIds) => api.put('/pipeline/columns/reorder', { column_ids: columnIds }),
  initialize: () => api.post('/pipeline/columns/initialize'),
};

// Quotes API
export const quotesAPI = {
  getAll: (params) => api.get('/quotes', { params }),
  getOne: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  updateStatus: (id, status) => api.patch(`/quotes/${id}/status`, { status }),
  send: (id) => api.post(`/quotes/${id}/send`),
  convertToInvoice: (id) => api.post(`/quotes/${id}/convert-to-invoice`),
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
  createFromQuote: (quoteId) => api.post(`/quotes/${quoteId}/convert-to-invoice`),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  updateStatus: (id, status) => api.put(`/invoices/${id}/status`, { status }),
  getPDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/invoices/${id}`),
  // Payments
  getPayments: (id) => api.get(`/invoices/${id}/payments`),
  addPayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
  deletePayment: (invoiceId, paymentId) => api.delete(`/invoices/${invoiceId}/payments/${paymentId}`),
  // Helper function to download PDF with authentication - All platforms
  downloadPDF: async (id, invoiceNumber, type = 'facture') => {
    const filename = `${type}_${invoiceNumber || id}.pdf`;
    
    try {
      // Use authenticated endpoint directly with axios (handles auth token)
      const response = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',
        headers: { 'Accept': 'application/pdf' }
      });
      
      if (!response.data || response.data.size === 0) {
        throw new Error('Empty PDF');
      }
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
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
  getOne: (id) => api.get(`/portfolio/${id}`),
  getBySlug: (slug) => api.get(`/portfolio/by-slug/${slug}`),
  create: (data) => api.post('/portfolio', data),
  update: (id, data) => api.put(`/portfolio/${id}`, data),
  delete: (id) => api.delete(`/portfolio/${id}`),
};

// Tags API
export const tagsAPI = {
  getAll: (type) => api.get('/tags', { params: { type } }),
  create: (data) => api.post('/tags', data),
  update: (id, name, color) => api.put(`/tags/${id}`, null, { params: { name, color } }),
  delete: (id) => api.delete(`/tags/${id}`),
  suggest: (content, title, type) => api.post('/tags/suggest', { content, title, type }),
};

// Settings API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  updateCompany: (data) => api.put('/settings/company', data),
  updateSocialLinks: (data) => api.put('/settings/social-links', data),
  updateLegalTexts: (data) => api.put('/settings/legal-texts', data),
  updateIntegrations: (data) => api.put('/settings/integrations', data),
  getInvoiceSettings: () => api.get('/settings/invoice'),
  updateInvoiceSettings: (data) => api.put('/settings/invoice', data),
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
  video: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  file: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/file', formData, {
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
  // Categories
  getCategories: () => api.get('/budget/categories'),
  createCategory: (data) => api.post('/budget/categories', data),
  updateCategory: (id, data) => api.put(`/budget/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/budget/categories/${id}`),
  // Bank Transactions
  getTransactions: (params) => api.get('/budget/transactions', { params }),
  createTransaction: (data) => api.post('/budget/transactions', data),
  updateTransaction: (id, data) => api.put(`/budget/transactions/${id}`, data),
  deleteTransaction: (id) => api.delete(`/budget/transactions/${id}`),
  getTransactionsSummary: (params) => api.get('/budget/transactions/summary', { params }),
  importTransactions: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/budget/transactions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  // Auto-categorization rules
  getRules: () => api.get('/budget/rules'),
  createRule: (data) => api.post('/budget/rules', data),
  updateRule: (id, data) => api.put(`/budget/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/budget/rules/${id}`),
  applyRules: (month) => api.post('/budget/rules/apply', null, { params: { month } }),
  // Forecast (Prévisionnel)
  getForecasts: (params) => api.get('/budget/forecast', { params }),
  createForecast: (data) => api.post('/budget/forecast', data),
  updateForecast: (id, data) => api.put(`/budget/forecast/${id}`, data),
  deleteForecast: (id) => api.delete(`/budget/forecast/${id}`),
  getForecastComparison: (month) => api.get('/budget/forecast/comparison', { params: { month } }),
  copyForecast: (sourceMonth, targetMonth) => api.post('/budget/forecast/copy', null, { params: { source_month: sourceMonth, target_month: targetMonth } }),
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

// AI Assistant API (Perplexity)
export const aiAPI = {
  getStatus: () => api.get('/ai/status'),
  chat: (data) => api.post('/ai/chat', data),
  chatWithConversation: (data) => api.post('/ai/chat/conversation', data),
  getHistory: (limit = 20) => api.get('/ai/history', { params: { limit } }),
  // Conversations
  getConversations: (limit = 50) => api.get('/ai/conversations', { params: { limit } }),
  createConversation: (data) => api.post('/ai/conversations', data),
  getConversation: (id) => api.get(`/ai/conversations/${id}`),
  updateConversation: (id, title) => api.put(`/ai/conversations/${id}`, null, { params: { title } }),
  deleteConversation: (id) => api.delete(`/ai/conversations/${id}`),
};

// Enhanced AI API (with image support)
export const aiEnhancedAPI = {
  getStatus: () => api.get('/ai-enhanced/status'),
  chat: (data) => api.post('/ai-enhanced/chat', data),
  getContext: () => api.get('/ai-enhanced/context'),
  executeAction: (actionType, params) => api.post('/ai-enhanced/execute-action', { action_type: actionType, params }),
  analyzeImage: (file, prompt, model = 'gpt-4o') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    formData.append('model', model);
    return api.post('/ai-enhanced/analyze-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  generateImage: (prompt, model = 'gemini-3-pro-image-preview') => 
    api.post('/ai-enhanced/generate-image', { prompt, model }),
  getConversations: () => api.get('/ai-enhanced/conversations'),
  getConversation: (id) => api.get(`/ai-enhanced/conversations/${id}`),
  deleteConversation: (id) => api.delete(`/ai-enhanced/conversations/${id}`),
};

// File Manager API (Gestionnaire de fichiers)
export const fileManagerAPI = {
  // Folders
  getFolders: (parentId) => api.get('/file-manager/folders', { params: { parent_id: parentId } }),
  getFolderTree: () => api.get('/file-manager/folders/tree'),
  createFolder: (data) => api.post('/file-manager/folders', data),
  updateFolder: (id, data) => api.put(`/file-manager/folders/${id}`, data),
  deleteFolder: (id, force = false) => api.delete(`/file-manager/folders/${id}`, { params: { force } }),
  
  // Documents
  getAll: (params) => api.get('/file-manager', { params }),
  getStats: () => api.get('/file-manager/stats'),
  getOne: (id) => api.get(`/file-manager/${id}`),
  upload: (file, folderId, tags) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folder_id', folderId);
    if (tags) formData.append('tags', tags);
    return api.post('/file-manager/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => api.put(`/file-manager/${id}`, data),
  delete: (id) => api.delete(`/file-manager/${id}`),
  bulkDelete: (ids) => api.post('/file-manager/bulk-delete', ids),
  move: (docIds, folderId) => {
    const formData = new FormData();
    docIds.forEach(id => formData.append('doc_ids', id));
    if (folderId) formData.append('folder_id', folderId);
    return api.post('/file-manager/move', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// News/Actualités API (NewsAPI.org - Style Perplexity Discover)
export const newsAPI = {
  getCategories: () => api.get('/news/categories'),
  getRegions: () => api.get('/news/regions'),
  getTopics: () => api.get('/news/topics'), // Legacy endpoint
  getArticles: (params) => api.get('/news', { params }),
  getArticle: (articleId) => api.get(`/news/${articleId}`),
  getRelated: (articleId, limit = 4) => api.get(`/news/related/${articleId}`, { params: { limit } }),
  refresh: (category, region) => api.post('/news/refresh', null, { params: { category, region } }),
  delete: (articleId) => api.delete(`/news/${articleId}`),
  clearCategory: (category) => api.delete(`/news/clear/${category}`),
};

// Budget Cashflow API (Phase 4)
export const cashflowAPI = {
  getProjection: (startMonth, months = 6) => api.get('/budget/cashflow', { params: { start_month: startMonth, months } }),
};

// Qonto Banking API
export const qontoAPI = {
  getStatus: () => api.get('/qonto/status'),
  getAuthUrl: () => api.get('/qonto/auth/url'),
  handleCallback: (code, state) => api.post('/qonto/auth/callback', null, { params: { code, state } }),
  disconnect: () => api.delete('/qonto/auth/disconnect'),
  getOrganization: () => api.get('/qonto/organization'),
  getAccounts: () => api.get('/qonto/accounts'),
  getTransactions: (params) => api.get('/qonto/transactions', { params }),
  syncAll: () => api.post('/qonto/sync'),
  getCachedTransactions: (params) => api.get('/qonto/cached/transactions', { params }),
  getCachedBalance: () => api.get('/qonto/cached/balance'),
  getStats: () => api.get('/qonto/stats'),
};

// File Transfers API (WeTransfer-like)
export const transfersAPI = {
  uploadFile: (file, transferId, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (transferId) formData.append('transfer_id', transferId);
    return api.post('/transfers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  create: (data) => {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.message) formData.append('message', data.message);
    formData.append('recipient_emails', data.recipient_emails.join(','));
    formData.append('expires_in_days', data.expires_in_days || 7);
    formData.append('files_json', JSON.stringify(data.files));
    return api.post('/transfers/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getMyTransfers: () => api.get('/transfers/mine'),
  getPublicTransfer: (id) => api.get(`/transfers/public/${id}`),
  recordDownload: (id) => api.post(`/transfers/public/${id}/download`),
  delete: (id) => api.delete(`/transfers/${id}`),
  getStats: () => api.get('/transfers/stats'),
};

// Notifications API
export const notificationsAPI = {
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (settings) => api.put('/notifications/settings', settings),
  sendTaskReminders: () => api.post('/notifications/send-task-reminders'),
  sendInvoiceReminders: () => api.post('/notifications/send-invoice-reminders'),
  testEmail: () => api.post('/notifications/test-email'),
};

// Social Media Manager API
export const socialAPI = {
  // Accounts
  getAccounts: () => api.get('/social/accounts'),
  addAccount: (data) => api.post('/social/accounts', data),
  deleteAccount: (id) => api.delete(`/social/accounts/${id}`),
  
  // Scheduled Posts
  getPosts: (params) => api.get('/social/posts', { params }),
  getPost: (id) => api.get(`/social/posts/${id}`),
  createPost: (data) => api.post('/social/posts', data),
  updatePost: (id, data) => api.put(`/social/posts/${id}`, data),
  deletePost: (id) => api.delete(`/social/posts/${id}`),
  
  // Calendar
  getCalendar: (month, year) => api.get('/social/calendar', { params: { month, year } }),
  
  // Inbox
  getInbox: (params) => api.get('/social/inbox', { params }),
  addMessage: (data) => api.post('/social/inbox', data),
  updateMessageStatus: (id, status) => api.put(`/social/inbox/${id}/status`, null, { params: { status } }),
  updateMessagePriority: (id, priority) => api.put(`/social/inbox/${id}/priority`, null, { params: { priority } }),
  replyToMessage: (id, replyContent) => api.post(`/social/inbox/${id}/reply`, null, { params: { reply_content: replyContent } }),
  suggestReply: (id, context) => api.post(`/social/inbox/${id}/suggest-reply`, null, { params: { context } }),
  
  // Stats
  getStats: () => api.get('/social/stats'),
};

// Meta API (Facebook/Instagram)
export const metaAPI = {
  // OAuth
  getAuthUrl: () => api.get('/meta/auth-url'),
  exchangeToken: (code, redirectUri) => api.post('/meta/exchange-token', { code, redirect_uri: redirectUri }),
  
  // Pages & Accounts
  getPages: () => api.get('/meta/pages'),
  disconnect: () => api.delete('/meta/disconnect'),
  
  // Publishing
  publishFacebook: (data) => api.post('/meta/publish/facebook', data),
  publishInstagram: (data) => api.post('/meta/publish/instagram', data),
  
  // History
  getPublishedPosts: (platform, limit = 50) => api.get('/meta/published-posts', { params: { platform, limit } }),
};

// Campaigns API (Brevo - Email & SMS Marketing)
export const campaignsAPI = {
  // Email Templates
  getTemplates: () => api.get('/campaigns/templates'),
  getTemplate: (id) => api.get(`/campaigns/templates/${id}`),
  
  // Email Campaigns
  createEmailCampaign: (data) => api.post('/campaigns/email/create', data),
  getEmailCampaigns: (params) => api.get('/campaigns/email/list', { params }),
  getEmailCampaign: (id) => api.get(`/campaigns/email/${id}`),
  sendEmailCampaignNow: (id) => api.post(`/campaigns/email/${id}/send-now`),
  scheduleEmailCampaign: (id, scheduledAt) => api.post(`/campaigns/email/${id}/schedule`, null, { params: { scheduled_at: scheduledAt } }),
  sendTestEmail: (id, emails) => api.post(`/campaigns/email/${id}/test`, emails),
  deleteEmailCampaign: (id) => api.delete(`/campaigns/email/${id}`),
  
  // SMS Campaigns
  createSMSCampaign: (data) => api.post('/campaigns/sms/create', data),
  getSMSCampaigns: (params) => api.get('/campaigns/sms/list', { params }),
  getSMSCampaign: (id) => api.get(`/campaigns/sms/${id}`),
  sendSMSCampaignNow: (id) => api.post(`/campaigns/sms/${id}/send-now`),
  deleteSMSCampaign: (id) => api.delete(`/campaigns/sms/${id}`),
  
  // Contacts
  createContact: (data, listIds) => api.post('/campaigns/contacts/create', data, { params: { list_ids: listIds } }),
  updateContact: (email, data) => api.put(`/campaigns/contacts/${email}`, data),
  getContacts: (params) => api.get('/campaigns/contacts/list', { params }),
  getContact: (identifier) => api.get(`/campaigns/contacts/${identifier}`),
  deleteContact: (identifier) => api.delete(`/campaigns/contacts/${identifier}`),
  importContacts: (data) => api.post('/campaigns/contacts/import', data),
  
  // Contact Lists
  getLists: (params) => api.get('/campaigns/lists', { params }),
  createList: (data) => api.post('/campaigns/lists/create', data),
  getList: (id) => api.get(`/campaigns/lists/${id}`),
  deleteList: (id) => api.delete(`/campaigns/lists/${id}`),
  addContactsToList: (listId, emails) => api.post(`/campaigns/lists/${listId}/contacts/add`, emails),
  removeContactsFromList: (listId, emails) => api.post(`/campaigns/lists/${listId}/contacts/remove`, emails),
  
  // Statistics
  getEmailStatistics: (params) => api.get('/campaigns/statistics/email', { params }),
  getSMSStatistics: (params) => api.get('/campaigns/statistics/sms', { params }),
};

// API Keys Management
export const apiKeysAPI = {
  getStatus: () => api.get('/settings/api-keys'),
  testKey: (service) => api.get(`/settings/api-keys/test/${service}`),
};

export default api;
