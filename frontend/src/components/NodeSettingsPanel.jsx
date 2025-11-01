import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import useWorkflowStore from '../store/workflowStore';
import { FaKey, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { integrationsAPI } from '../api/api';

const NodeSettingsPanel = () => {
  const { selectedNode, updateNodeData } = useWorkflowStore();
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm();
  const [userIntegrations, setUserIntegrations] = useState([]);
  const [customParams, setCustomParams] = useState([]);
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');

  useEffect(() => {
    loadUserIntegrations();
  }, []);

  useEffect(() => {
    if (selectedNode && selectedNode.data.parameters) {
      reset(selectedNode.data.parameters);
      
      // Extract custom parameters (non-standard ones)
      const standardParams = getStandardParameters(selectedNode.data.service);
      const params = selectedNode.data.parameters;
      const custom = Object.keys(params)
        .filter(key => !standardParams.includes(key))
        .map(key => ({ key, value: params[key] }));
      
      setCustomParams(custom);
    } else {
      reset({});
      setCustomParams([]);
    }
  }, [selectedNode?.id, reset]);

  const loadUserIntegrations = async () => {
    try {
      const response = await integrationsAPI.getUserIntegrations();
      setUserIntegrations(response.data.integrations || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  const getIntegrationStatus = (service) => {
    const integration = userIntegrations.find(i => i.service === service);
    if (!integration) return { configured: false, isValid: false };
    return { 
      configured: true, 
      isValid: integration.isValid,
      lastError: integration.lastError 
    };
  };

  const getStandardParameters = (service) => {
    const standardParams = {
      'telegram': ['botToken', 'chatId', 'message'],
      'gmail': ['to', 'subject', 'body'],
      'slack': ['channel', 'message'],
      'webhook': ['url', 'method', 'headers', 'body'],
      'mysql': ['host', 'port', 'database', 'username', 'password', 'query'],
      'google-sheets': ['spreadsheetId', 'sheetName', 'range']
    };
    return standardParams[service] || [];
  };

  const getAuthenticationInfo = (service) => {
    const integrationStatus = getIntegrationStatus(service);
    
    const authInfo = {
      'telegram': {
        required: true,
        type: 'Bot Token',
        description: 'Requires Telegram Bot Token from BotFather',
        ...integrationStatus
      },
      'gmail': {
        required: true,
        type: 'OAuth 2.0',
        description: 'Requires Gmail API access with proper scopes',
        ...integrationStatus
      },
      'slack': {
        required: true,
        type: 'Webhook or OAuth',
        description: 'Requires Slack app configuration',
        ...integrationStatus
      },
      'google-sheets': {
        required: true,
        type: 'OAuth 2.0',
        description: 'Requires Google Sheets API access',
        ...integrationStatus
      },
      'mysql': {
        required: true,
        type: 'Database Credentials',
        description: 'Requires MySQL database connection details',
        ...integrationStatus
      },
      'webhook': {
        required: false,
        type: 'URL Endpoint',
        description: 'Requires a webhook URL to send requests to',
        ...integrationStatus
      }
    };

    return authInfo[service] || { required: false, type: 'None', description: 'No authentication required', ...integrationStatus };
  };

  const addCustomParameter = () => {
    if (!newParamKey.trim()) return;
    
    const key = newParamKey.trim();
    const value = newParamValue.trim();
    
    setCustomParams(prev => [...prev, { key, value }]);
    setNewParamKey('');
    setNewParamValue('');
  };

  const removeCustomParameter = (index) => {
    setCustomParams(prev => prev.filter((_, i) => i !== index));
  };

  const updateCustomParameter = (index, field, value) => {
    setCustomParams(prev => prev.map((param, i) => 
      i === index ? { ...param, [field]: value } : param
    ));
  };

  const onSubmit = (data) => {
    if (selectedNode) {
      // Merge standard parameters with custom parameters
      const allParameters = {
        ...data,
        ...Object.fromEntries(customParams.map(param => [param.key, param.value]))
      };

      // Update the specific node's data
      updateNodeData(selectedNode.id, { 
        parameters: allParameters,
        parametersConfigured: true 
      });
      
      showPopup('✅ Parameters saved successfully!', 'success');
    }
  };

  const showPopup = (message, type = 'info') => {
    const popup = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 
                   type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
    
    popup.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out`;
    popup.textContent = message;
    document.body.appendChild(popup);
    
    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 3000);
  };

  const renderParameterFields = () => {
    if (!selectedNode) return null;

    const service = selectedNode.data.service;
    const parameters = selectedNode.data.parameters || {};
    const authInfo = getAuthenticationInfo(service);

    switch (service) {
      case 'telegram':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot Token *
              </label>
              <input
                type="password"
                {...register('botToken', { required: 'Bot Token is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Telegram bot token"
              />
              {errors.botToken && (
                <p className="text-red-500 text-xs mt-1">{errors.botToken.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chat ID *
              </label>
              <input
                type="text"
                {...register('chatId', { required: 'Chat ID is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your chat ID"
              />
              {errors.chatId && (
                <p className="text-red-500 text-xs mt-1">{errors.chatId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                {...register('message', { required: 'Message is required' })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your message"
              />
              {errors.message && (
                <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
              )}
            </div>
          </div>
        );

      case 'gmail':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Email *
              </label>
              <input
                type="email"
                {...register('to', { required: 'Email is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
              />
              {errors.to && (
                <p className="text-red-500 text-xs mt-1">{errors.to.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                {...register('subject', { required: 'Subject is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email subject"
              />
              {errors.subject && (
                <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body *
              </label>
              <textarea
                {...register('body', { required: 'Body is required' })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email body content"
              />
              {errors.body && (
                <p className="text-red-500 text-xs mt-1">{errors.body.message}</p>
              )}
            </div>
          </div>
        );

      // Add other service cases as needed...

      default:
        return (
          <div className="text-gray-500 text-sm">
            <div className="flex items-center space-x-2 mb-2">
              <FaInfoCircle className="text-gray-400" />
              <span>No standard parameters defined for this service.</span>
            </div>
          </div>
        );
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="text-lg font-semibold mb-2">Node Settings</div>
          <div className="text-sm">Select a node to configure its parameters</div>
        </div>
      </div>
    );
  }

  const authInfo = getAuthenticationInfo(selectedNode.data.service);

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto h-full">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Node Settings
        </h2>
        <div className="text-sm text-gray-600 mb-2">
          Configure parameters for: <strong>{selectedNode.data.label}</strong>
        </div>
        <div className="text-xs text-gray-500">
          Step {selectedNode.data.stepNumber} • {selectedNode.data.service}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {renderParameterFields()}
        
        {/* Custom Parameters Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Custom Parameters</h3>
          
          {/* Add new parameter */}
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={newParamKey}
              onChange={(e) => setNewParamKey(e.target.value)}
              placeholder="Parameter key"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="text"
              value={newParamValue}
              onChange={(e) => setNewParamValue(e.target.value)}
              placeholder="Value"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <button
              type="button"
              onClick={addCustomParameter}
              className="bg-blue-500 text-white p-1 rounded hover:bg-blue-600"
            >
              <FaPlus size={12} />
            </button>
          </div>
          
          {/* Existing custom parameters */}
          {customParams.map((param, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={param.key}
                onChange={(e) => updateCustomParameter(index, 'key', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                value={param.value}
                onChange={(e) => updateCustomParameter(index, 'value', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <button
                type="button"
                onClick={() => removeCustomParameter(index)}
                className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
              >
                <FaTrash size={12} />
              </button>
            </div>
          ))}
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Save Parameters
        </button>
      </form>
    </div>
  );
};

// Separate component for integration status
const IntegrationStatus = ({ authInfo }) => (
  <div className={`border rounded-lg p-4 ${
    authInfo.isValid ? 'bg-green-50 border-green-200' : 
    authInfo.configured ? 'bg-yellow-50 border-yellow-200' : 
    'bg-blue-50 border-blue-200'
  }`}>
    <div className="flex items-center space-x-2 mb-2">
      <FaKey className={`${
        authInfo.isValid ? 'text-green-600' : 
        authInfo.configured ? 'text-yellow-600' : 
        'text-blue-600'
      }`} />
      <span className={`font-semibold ${
        authInfo.isValid ? 'text-green-800' : 
        authInfo.configured ? 'text-yellow-800' : 
        'text-blue-800'
      }`}>
        {authInfo.type} Authentication {authInfo.isValid ? '✅ Connected' : authInfo.configured ? '⚠️ Needs Setup' : 'Required'}
      </span>
    </div>
    <p className={`text-sm ${
      authInfo.isValid ? 'text-green-700' : 
      authInfo.configured ? 'text-yellow-700' : 
      'text-blue-700'
    } mb-3`}>
      {authInfo.description}
    </p>
  </div>
);

export default NodeSettingsPanel;