//src/api/api.js 
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  googleAuth: (access_token) => api.post('/auth/google', { access_token }),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
};

// AI API - COMPLETE WITH ALL ENDPOINTS
export const aiAPI = {
  // Get available AI providers
  getProviders: () => api.get('/ai/providers'),
  
  // Set AI provider
  setProvider: (provider, apiKey = null) => api.post('/ai/set-provider', { provider, apiKey }),
  
  // Generate workflow
  generateWorkflow: (data) => api.post('/ai/generate-workflow', data),

  // Generate script
  generateScript: (data) => api.post('/ai/generate-script', data),
  
  // Process command
  processCommand: (commandData) => api.post('/ai/process-command', commandData),
  
  // Test connection - ADD THIS
  testConnection: (provider, apiKey) => api.post('/ai/test-connection', { provider, apiKey }),
  
  // Enhance existing script - ADD THIS
  enhanceScript: (data) => api.post('/ai/enhance-script', data),

  generateCompleteWorkflow: (data) => api.post('/workflow-generation/generate-complete-workflow', data),
  setupIntegrations: (data) => api.post('/workflow-generation/setup-integrations', data),
};

// Workflow API
export const workflowAPI = {
  // Workflow management
  getWorkflows: () => api.get('/workflows'),
  getWorkflow: (id) => api.get(`/workflows/${id}`),
  saveWorkflow: (workflowData) => api.post('/workflows/save', workflowData),
  deleteWorkflow: (id) => api.delete(`/workflows/${id}`),
  publishWorkflow: (id, isPublic) => api.post(`/workflows/${id}/publish`, { isPublic }),
  downloadWorkflow: (id) => api.post(`/workflows/${id}/download`),
  
  // Execution
  executeWorkflow: (id) => api.post(`/workflows/${id}/execute`),
  getExecutions: (id) => api.get(`/workflows/${id}/executions`),
  getExecutionLogs: () => api.get('/workflows/executions/logs'),
  
  // Marketplace
  getPublicWorkflows: () => api.get('/workflows/marketplace/public'),
  useWorkflow: (id) => api.post(`/workflows/marketplace/${id}/use`),
  
};
export const workflowGenerationAPI = {
  generateCompleteWorkflow: (data) => api.post('/workflow-generation/generate-complete-workflow', data),
  testHuggingFace: () => api.post('/workflow-generation/test-huggingface'),
  getAvailableModels: () => api.get('/workflow-generation/available-models'),
};

// Integrations API
export const integrationsAPI = {
  getUserIntegrations: () => api.get('/integrations'),
  saveIntegration: (integrationData) => api.post('/integrations/save', integrationData),
  testIntegration: (service) => api.post(`/integrations/${service}/test`),
  deleteIntegration: (service) => api.delete(`/integrations/${service}`),
  initiateOAuth: (service) => api.post(`/integrations/${service}/oauth`),
  oauthCallback: (code, state) => api.post('/integrations/oauth/callback', { code, state }),
  createCustomIntegration: (integrationData) => api.post('/integrations/create-custom', integrationData),
  updateIntegration: (id, integrationData) => api.put(`/integrations/${id}`, integrationData),
  executeIntegration: (id, data) => api.post(`/integrations/${id}/execute`, data),
};

// Script API - COMPLETE VERSION
export const scriptAPI = {
  // Generate script
  generateScript: (data) => api.post('/scripts/generate', data),
  
  // Execute script
  executeScript: (data) => api.post('/scripts/execute', data),
  
  // Stop script execution
  stopScript: (executionId) => api.post(`/scripts/stop/${executionId}`),
  
  // Get execution status
  getExecutionStatus: (executionId) => api.get(`/scripts/execution/${executionId}`),
  
  // Save script to history
  saveScript: (data) => api.post('/scripts/save', data),
  
  // Get script history
  getScriptHistory: () => api.get('/scripts/history'),
  
  // Publish script
  publishScript: (data) => api.post('/scripts/publish', data),
  
  // Get public scripts
  getPublicScripts: () => api.get('/scripts/marketplace'),
  
  // Use script from marketplace
  useScript: (id) => api.post(`/scripts/marketplace/${id}/use`),
  
  // Delete script
  deleteScript: (id) => api.delete(`/scripts/${id}`),

  installDependencies: (data) => api.post('/scripts/install-dependencies', data),
  getActiveExecutions: () => api.get('/scripts/active'),
  installCustomDependencies: (data) => api.post('/scripts/install-custom-dependencies', data),
   // Get script execution logs
  getScriptExecutionLogs: () => api.get('/scripts/executions/logs'),
  
  // Get script execution details
  getScriptExecution: (executionId) => api.get(`/scripts/executions/${executionId}`),

  getPopularScripts: () => api.get('/scripts/marketplace/popular'),
  
  // Search public scripts - ADD THIS
  searchPublicScripts: (params) => api.get('/scripts/marketplace/search', { params }),
};


export const hostedScriptsAPI = {
  createHostedScript: (data) => api.post('/hosted-scripts/create', data),
  getMyScripts: () => api.get('/hosted-scripts/my-scripts'),
  updateScript: (id, data) => api.put(`/hosted-scripts/${id}`, data),
  deleteScript: (id) => api.delete(`/hosted-scripts/${id}`),
  toggleScript: (id) => api.post(`/hosted-scripts/${id}/toggle`),
  executeScript: (endpoint, data) => api.post(`/hosted-scripts/run/${endpoint}`, data),
};

export default api;