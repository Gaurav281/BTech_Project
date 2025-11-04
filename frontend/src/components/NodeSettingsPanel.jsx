// src/components/NodeSettingsPanel.jsx - COMPLETELY FIXED VERSION
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import useWorkflowStore from '../store/workflowStore';
import { FaKey, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaPlus, FaTrash, FaEdit, FaDatabase, FaSync } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { integrationsAPI } from '../api/api';

const NodeSettingsPanel = ({ userIntegrations = [] }) => {
  const { selectedNode, updateNodeData, nodes } = useWorkflowStore();
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm();
  const [customParams, setCustomParams] = useState([]);
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [integrationData, setIntegrationData] = useState(null);
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [lastSavedParameters, setLastSavedParameters] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Helper to compare parameters - FIXED: Properly defined inside component
  const areParametersEqual = useCallback((params1, params2) => {
    if (!params1 || !params2) return false;
    
    const keys1 = Object.keys(params1);
    const keys2 = Object.keys(params2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => {
      const val1 = params1[key];
      const val2 = params2[key];
      
      // Handle different types and null/undefined
      if (val1 === val2) return true;
      if (val1 == null && val2 == null) return true;
      if (val1 == null || val2 == null) return false;
      
      return val1.toString().trim() === val2.toString().trim();
    });
  }, []);

  // Get the latest node data from store to ensure we have current parameters
  const getCurrentNodeData = useCallback(() => {
    if (!selectedNode) return null;
    return nodes.find(node => node.id === selectedNode.id);
  }, [selectedNode, nodes]);

  useEffect(() => {
    const currentNode = getCurrentNodeData();
    if (currentNode && currentNode.data.parameters) {
      console.log('Initializing form with parameters:', currentNode.data.parameters);
      
      // Reset form with current parameters
      reset(currentNode.data.parameters);
      setLastSavedParameters(currentNode.data.parameters);
      setIsDirty(false);
      
      // Extract custom parameters (non-standard ones)
      const standardParams = getStandardParameters(currentNode.data.service);
      const params = currentNode.data.parameters;
      const custom = Object.keys(params)
        .filter(key => !standardParams.includes(key))
        .map(key => ({ key, value: params[key] }));
      
      setCustomParams(custom);
      setIsFormInitialized(true);
    } else {
      reset({});
      setCustomParams([]);
      setIsFormInitialized(false);
    }

    // Load integration data for the node's service
    if (currentNode && currentNode.data.service && currentNode.data.service !== 'trigger') {
      const integration = userIntegrations.find(i => i.service === currentNode.data.service);
      setIntegrationData(integration);
    } else {
      setIntegrationData(null);
    }
  }, [selectedNode?.id, reset, userIntegrations, getCurrentNodeData]);

  const watchedValues = watch();
  
  useEffect(() => {
    if (isFormInitialized && selectedNode && Object.keys(watchedValues).length > 0) {
      const currentParameters = {
        ...watchedValues,
        ...Object.fromEntries(customParams.map(param => [param.key, param.value]))
      };

      // Only auto-save if parameters have actually changed
      if (!areParametersEqual(currentParameters, lastSavedParameters)) {
        setIsDirty(true);
        
        const timeoutId = setTimeout(() => {
          handleAutoSave(currentParameters);
        }, 1000);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [watchedValues, customParams, selectedNode, isFormInitialized, lastSavedParameters, areParametersEqual]);

  const handleAutoSave = useCallback((formData) => {
    if (!selectedNode || !isDirty) return;

    const allParameters = {
      ...formData,
      ...Object.fromEntries(customParams.map(param => [param.key, param.value]))
    };

    console.log('Auto-saving parameters for node:', selectedNode.id, allParameters);

    updateNodeData(selectedNode.id, { 
      parameters: allParameters,
      parametersConfigured: true 
    });

    setLastSavedParameters(allParameters);
    setIsDirty(false);
    
    showAutoSaveIndicator();
  }, [selectedNode, isDirty, customParams, updateNodeData]);

  const getIntegrationStatus = (service) => {
    const integration = userIntegrations.find(i => i.service === service);
    if (!integration) return { configured: false, isValid: false };
    return { 
      configured: true, 
      isValid: integration.isValid,
      lastError: integration.lastError,
      config: integration.config
    };
  };

  const getStandardParameters = (service) => {
    const standardParams = {
      'telegram': ['botToken', 'chatId', 'message'],
      'telegram-send': ['botToken', 'chatId', 'message'],
      'telegram-monitor': ['botToken', 'chatId', 'keyword'],
      'gmail': ['to', 'subject', 'body'],
      'slack': ['channel', 'message', 'webhookUrl'],
      'webhook': ['url', 'method', 'headers', 'body'],
      'mysql': ['host', 'port', 'database', 'username', 'password', 'query'],
      'google-sheets': ['spreadsheetId', 'sheetName', 'range'],
      'instagram': ['username', 'action', 'accessToken'],
      'youtube': ['channelId', 'action', 'apiKey'],
      'arduino': ['port', 'command', 'baudRate'],
      'raspberry-pi': ['host', 'command', 'username'],
      'sensor-hub': ['sensorType', 'threshold', 'pollingInterval'],
      'smart-switch': ['deviceId', 'state', 'protocol']
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
      'telegram-send': {
        required: true,
        type: 'Bot Token',
        description: 'Requires Telegram Bot Token from BotFather',
        ...integrationStatus
      },
      'telegram-monitor': {
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
      },
      'instagram': {
        required: true,
        type: 'Access Token',
        description: 'Requires Instagram Graph API access token',
        ...integrationStatus
      },
      'youtube': {
        required: true,
        type: 'API Key',
        description: 'Requires YouTube Data API key',
        ...integrationStatus
      }
    };

    return authInfo[service] || { required: false, type: 'None', description: 'No authentication required', ...integrationStatus };
  };

  const showAutoSaveIndicator = () => {
    const indicator = document.createElement('div');
    indicator.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded text-xs animate-fade-in-out';
    indicator.textContent = 'Auto-saved';
    document.body.appendChild(indicator);

    setTimeout(() => {
      if (document.body.contains(indicator)) {
        document.body.removeChild(indicator);
      }
    }, 2000);
  };

  const addCustomParameter = () => {
    if (!newParamKey.trim()) return;
    
    const key = newParamKey.trim();
    const value = newParamValue.trim();
    
    setCustomParams(prev => [...prev, { key, value }]);
    setNewParamKey('');
    setNewParamValue('');
    setIsDirty(true);
  };

  const removeCustomParameter = (index) => {
    setCustomParams(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const updateCustomParameter = (index, field, value) => {
    setCustomParams(prev => prev.map((param, i) => 
      i === index ? { ...param, [field]: value } : param
    ));
    setIsDirty(true);
  };

  const syncWithIntegration = () => {
    if (!integrationData || !integrationData.config) return;

    Object.keys(integrationData.config).forEach(key => {
      if (integrationData.config[key]) {
        setValue(key, integrationData.config[key]);
      }
    });

    showPopup('✅ Parameters synced with integration', 'success');
  };

  const onSubmit = (data) => {
    if (selectedNode) {
      // Merge standard parameters with custom parameters
      const allParameters = {
        ...data,
        ...Object.fromEntries(customParams.map(param => [param.key, param.value]))
      };

      console.log('Manually saving parameters for node:', selectedNode.id, allParameters);

      // Update the specific node's data
      updateNodeData(selectedNode.id, { 
        parameters: allParameters,
        parametersConfigured: true 
      });
      
      setLastSavedParameters(allParameters);
      setIsDirty(false);
      
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
    const currentNode = getCurrentNodeData();
    if (!currentNode) return null;

    const service = currentNode.data.service;
    const parameters = currentNode.data.parameters || {};
    const authInfo = getAuthenticationInfo(service);

    // Common parameter rendering function
    const renderInputField = (name, label, type = 'text', required = true, placeholder = '') => (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && '*'}
        </label>
        <input
          type={type}
          {...register(name, { required: required ? `${label} is required` : false })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
          defaultValue={parameters[name] || ''}
        />
        {errors[name] && (
          <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>
        )}
      </div>
    );

    const renderTextareaField = (name, label, required = true, placeholder = '', rows = 3) => (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && '*'}
        </label>
        <textarea
          {...register(name, { required: required ? `${label} is required` : false })}
          rows={rows}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
          defaultValue={parameters[name] || ''}
        />
        {errors[name] && (
          <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>
        )}
      </div>
    );

    switch (service) {
      case 'telegram':
      case 'telegram-send':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />
            
            {integrationData && integrationData.config && (
              <button
                type="button"
                onClick={syncWithIntegration}
                className="flex items-center space-x-2 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <FaSync size={12} />
                <span>Sync with Integration</span>
              </button>
            )}
            
            {renderInputField('botToken', 'Bot Token', 'password', true, 'Enter your Telegram bot token')}
            {renderInputField('chatId', 'Chat ID', 'text', true, 'Enter your chat ID')}
            {renderTextareaField('message', 'Message', true, 'Enter your message')}
          </div>
        );

      case 'telegram-monitor':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />
            {renderInputField('botToken', 'Bot Token', 'password', true, 'Enter your Telegram bot token')}
            {renderInputField('chatId', 'Chat ID', 'text', true, 'Enter your chat ID')}
            {renderInputField('keyword', 'Keyword', 'text', true, 'Enter keyword to monitor')}
          </div>
        );

      case 'gmail':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />
            {renderInputField('to', 'To Email', 'email', true, 'recipient@example.com')}
            {renderInputField('subject', 'Subject', 'text', true, 'Email subject')}
            {renderTextareaField('body', 'Body', true, 'Email body content', 4)}
          </div>
        );

      case 'slack':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />
            {renderInputField('webhookUrl', 'Webhook URL', 'url', true, 'https://hooks.slack.com/services/...')}
            {renderInputField('channel', 'Channel', 'text', true, '#general')}
            {renderTextareaField('message', 'Message', true, 'Message to post')}
          </div>
        );

      case 'google-sheets':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />

            {integrationData && integrationData.config && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <FaDatabase className="text-green-600" />
                  <span className="font-semibold text-green-800">Integration Data Available</span>
                </div>
                <p className="text-sm text-green-700">
                  Using integration configuration for Google Sheets
                </p>
                {integrationData.config.spreadsheetId && (
                  <p className="text-xs text-green-600 mt-1">
                    Spreadsheet ID: {integrationData.config.spreadsheetId}
                  </p>
                )}
              </div>
            )}

            {renderInputField('spreadsheetId', 'Spreadsheet ID', 'text', true, 'Enter spreadsheet ID')}
            {renderInputField('sheetName', 'Sheet Name', 'text', false, 'Sheet1')}
            {renderInputField('range', 'Range', 'text', false, 'A:Z')}
          </div>
        );

      case 'mysql':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />
            {renderInputField('host', 'Host', 'text', true, 'localhost')}
            {renderInputField('port', 'Port', 'number', false, '3306')}
            {renderInputField('database', 'Database', 'text', true, 'database_name')}
            {renderInputField('username', 'Username', 'text', true, 'username')}
            {renderInputField('password', 'Password', 'password', true, 'password')}
            {renderTextareaField('query', 'Query', true, 'SELECT * FROM table', 3)}
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />
            {renderInputField('url', 'URL', 'url', true, 'https://example.com/webhook')}
            {renderInputField('method', 'Method', 'text', false, 'POST')}
            {renderTextareaField('headers', 'Headers', false, '{"Content-Type": "application/json"}', 2)}
            {renderTextareaField('body', 'Body', false, '{"data": "example"}', 3)}
          </div>
        );

      default:
        return (
          <div className="text-gray-500 text-sm">
            <div className="flex items-center space-x-2 mb-2">
              <FaInfoCircle className="text-gray-400" />
              <span>No standard parameters defined for this service.</span>
            </div>
            <p className="text-xs text-gray-400">
              Service: {service}
            </p>
          </div>
        );
    }
  };

  const currentNode = getCurrentNodeData();
  if (!currentNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="text-lg font-semibold mb-2">Node Settings</div>
          <div className="text-sm">Select a node to configure its parameters</div>
        </div>
      </div>
    );
  }

  const authInfo = getAuthenticationInfo(currentNode.data.service);

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto h-full">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Node Settings
        </h2>
        <div className="text-sm text-gray-600 mb-2">
          Configure parameters for: <strong>{currentNode.data.label}</strong>
        </div>
        <div className="text-xs text-gray-500">
          Step {currentNode.data.stepNumber} • {currentNode.data.service}
          {currentNode.data.parametersConfigured && (
            <span className="ml-2 text-green-600">✓ Configured</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {renderParameterFields()}
        
        {/* Custom Parameters Section */}
        {currentNode.data.service !== 'trigger' && (
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
        )}
        
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
    
    {authInfo.lastError && (
      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
        Last Error: {authInfo.lastError}
      </p>
    )}
  </div>
);

export default NodeSettingsPanel;