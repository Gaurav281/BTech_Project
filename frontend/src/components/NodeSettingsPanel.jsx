// src/components/NodeSettingsPanel.jsx - COMPLETE UPDATED VERSION
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import useWorkflowStore from '../store/workflowStore';
import { 
  FaClock, 
  FaUpload, 
  FaDownload, 
  FaDatabase, 
  FaKey, 
  FaInfoCircle, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaPlus, 
  FaTrash, 
  FaEdit, 
  FaSync,
  FaGoogle,
  FaCog
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { integrationsAPI } from '../api/api';

const NodeSettingsPanel = ({ userIntegrations = [] }) => {
  const { selectedNode, updateNodeData, nodes, addTerminalLog } = useWorkflowStore();
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm();
  const [customParams, setCustomParams] = useState([]);
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [integrationData, setIntegrationData] = useState(null);
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('parameters');
  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: false,
    type: 'immediate',
    delay: 0,
    delayUnit: 'seconds',
    cronExpression: '0 9 * * *',
    timezone: 'UTC'
  });
  const [dataOptions, setDataOptions] = useState({
    inputType: 'manual',
    uploadData: null,
    dataMapping: {},
    apiEndpoint: '',
    apiMethod: 'GET',
    apiHeaders: '{"Content-Type": "application/json"}',
    apiBody: ''
  });

  // Helper to compare parameters
  const areParametersEqual = useCallback((params1, params2) => {
    if (!params1 || !params2) return false;
    
    const keys1 = Object.keys(params1);
    const keys2 = Object.keys(params2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => {
      const val1 = params1[key];
      const val2 = params2[key];
      
      if (val1 === val2) return true;
      if (val1 == null && val2 == null) return true;
      if (val1 == null || val2 == null) return false;
      
      return val1.toString().trim() === val2.toString().trim();
    });
  }, []);

  // Get the latest node data
  const getCurrentNodeData = useCallback(() => {
    if (!selectedNode) return null;
    return nodes.find(node => node.id === selectedNode.id);
  }, [selectedNode, nodes]);

  useEffect(() => {
    const currentNode = getCurrentNodeData();
    if (currentNode) {
      console.log('Initializing form for node:', currentNode.id, currentNode.data);
      
      // Reset form with current parameters
      reset(currentNode.data.parameters || {});
      
      // Load schedule config if exists
      if (currentNode.data.schedule) {
        setScheduleConfig(currentNode.data.schedule);
      }
      
      // Load data options if exists
      if (currentNode.data.dataOptions) {
        setDataOptions(currentNode.data.dataOptions);
      }
      
      // Extract custom parameters
      const standardParams = getStandardParameters(currentNode.data.service);
      const params = currentNode.data.parameters || {};
      const custom = Object.keys(params)
        .filter(key => !standardParams.includes(key))
        .map(key => ({ key, value: params[key] }));
      
      setCustomParams(custom);
      setIsFormInitialized(true);

      // Load integration data
      if (currentNode.data.service && currentNode.data.service !== 'trigger') {
        const integration = userIntegrations.find(i => i.service === currentNode.data.service);
        setIntegrationData(integration);
      } else {
        setIntegrationData(null);
      }
    } else {
      reset({});
      setCustomParams([]);
      setScheduleConfig({
        enabled: false,
        type: 'immediate',
        delay: 0,
        delayUnit: 'seconds',
        cronExpression: '0 9 * * *',
        timezone: 'UTC'
      });
      setDataOptions({
        inputType: 'manual',
        uploadData: null,
        dataMapping: {},
        apiEndpoint: '',
        apiMethod: 'GET',
        apiHeaders: '{"Content-Type": "application/json"}',
        apiBody: ''
      });
      setIsFormInitialized(false);
    }
  }, [selectedNode?.id, reset, userIntegrations, getCurrentNodeData]);

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
      'google-forms': ['formId', 'action', 'title', 'questions'],
      'whatsapp': ['apiKey', 'phoneNumber', 'message'],
      'instagram': ['username', 'action', 'accessToken'],
      'youtube': ['channelId', 'action', 'apiKey'],
      'arduino': ['port', 'command', 'baudRate'],
      'raspberry-pi': ['host', 'command', 'username'],
      'bolt-wifi': ['deviceId', 'apiKey', 'command'],
      'temperature-sensor': ['pin', 'threshold', 'unit'],
      'light-sensor': ['pin', 'threshold'],
      'push-button': ['pin', 'pullup'],
      'led': ['pin', 'state', 'brightness'],
      'buzzer': ['pin', 'frequency', 'duration']
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
      'google-forms': {
        required: true,
        type: 'OAuth 2.0',
        description: 'Requires Google Forms API access',
        ...integrationStatus
      },
      'whatsapp': {
        required: true,
        type: 'API Key',
        description: 'Requires WhatsApp Business API credentials',
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

  const syncWithIntegration = () => {
    if (!integrationData || !integrationData.config) return;

    Object.keys(integrationData.config).forEach(key => {
      if (integrationData.config[key]) {
        setValue(key, integrationData.config[key]);
      }
    });

    showPopup('✅ Parameters synced with integration', 'success');
  };

  const handleScheduleChange = (field, value) => {
    setScheduleConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDataOptionChange = (field, value) => {
    setDataOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          setDataOptions(prev => ({
            ...prev,
            uploadData: data,
            inputType: 'upload'
          }));
          showPopup('✅ File uploaded successfully!', 'success');
        } catch (error) {
          showPopup('❌ Invalid JSON file', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const initiateOAuth = async (service) => {
    try {
      const response = await integrationsAPI.initiateOAuth(service);
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('OAuth initiation failed:', error);
      showPopup('Failed to start OAuth flow: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleConnectIntegration = (service) => {
    const integration = userIntegrations.find(i => i.service === service);
    
    if (integration && integration.authType === 'OAuth2') {
      initiateOAuth(service);
    } else {
      // For API key based integrations, show configuration modal
      showPopup(`Configure ${service} integration in the Integrations tab`, 'info');
      // You could also redirect to integrations tab
      // window.location.href = '/integrations';
    }
  };

  const renderParameterFields = () => {
    const currentNode = getCurrentNodeData();
    if (!currentNode) return null;

    const service = currentNode.data.service;
    const parameters = currentNode.data.parameters || {};
    const authInfo = getAuthenticationInfo(service);

    const renderInputField = (name, label, type = 'text', required = true, placeholder = '') => (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && '*'}
        </label>
        <input
          type={type}
          {...register(name, { required: required ? `${label} is required` : false })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder={placeholder}
          defaultValue={parameters[name] || ''}
        />
        {errors[name] && (
          <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>
        )}
      </div>
    );

    const renderSelectField = (name, label, options, required = true) => (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && '*'}
        </label>
        <select
          {...register(name, { required: required ? `${label} is required` : false })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          defaultValue={parameters[name] || ''}
        >
          <option value="">Select {label}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors[name] && (
          <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>
        )}
      </div>
    );

    switch (service) {
      case 'google-forms':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} onConnect={() => handleConnectIntegration('google-forms')} />
            
            {renderSelectField('action', 'Action', [
              { value: 'create', label: 'Create Form' },
              { value: 'get_responses', label: 'Get Responses' },
              { value: 'update', label: 'Update Form' }
            ])}
            
            {renderInputField('title', 'Form Title', 'text', true, 'Enter form title')}
            {renderInputField('description', 'Description', 'text', false, 'Enter form description')}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Questions *
              </label>
              <textarea
                {...register('questions', { required: 'Questions are required' })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                placeholder='[{"question": "Your question?", "type": "text", "required": true}]'
                defaultValue={parameters.questions || ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter questions as JSON array. Types: text, multiple_choice, scale, date, time
              </p>
              {errors.questions && (
                <p className="text-red-500 text-xs mt-1">{errors.questions.message}</p>
              )}
            </div>
          </div>
        );

      case 'telegram':
      case 'telegram-send':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} onConnect={() => handleConnectIntegration('telegram')} />
            
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

      case 'gmail':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} onConnect={() => handleConnectIntegration('gmail')} />
            {renderInputField('to', 'To Email', 'email', true, 'recipient@example.com')}
            {renderInputField('subject', 'Subject', 'text', true, 'Email subject')}
            {renderTextareaField('body', 'Body', true, 'Email body content', 4)}
          </div>
        );

      case 'google-sheets':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} onConnect={() => handleConnectIntegration('google-sheets')} />
            {renderInputField('spreadsheetId', 'Spreadsheet ID', 'text', true, 'Enter spreadsheet ID')}
            {renderInputField('sheetName', 'Sheet Name', 'text', false, 'Sheet1')}
            {renderInputField('range', 'Range', 'text', false, 'A:Z')}
          </div>
        );

      case 'whatsapp':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} onConnect={() => handleConnectIntegration('whatsapp')} />
            {renderInputField('apiKey', 'API Key', 'password', true, 'Enter WhatsApp API key')}
            {renderInputField('phoneNumber', 'Phone Number', 'text', true, '+1234567890')}
            {renderTextareaField('message', 'Message', true, 'Enter your message')}
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />
            {renderInputField('url', 'URL', 'url', true, 'https://example.com/webhook')}
            {renderSelectField('method', 'Method', [
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'DELETE', label: 'DELETE' }
            ])}
            {renderTextareaField('headers', 'Headers', false, '{"Content-Type": "application/json"}', 2)}
            {renderTextareaField('body', 'Body', false, '{"data": "example"}', 3)}
          </div>
        );

      case 'mysql':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} onConnect={() => handleConnectIntegration('mysql')} />
            {renderInputField('host', 'Host', 'text', true, 'localhost')}
            {renderInputField('port', 'Port', 'number', false, '3306')}
            {renderInputField('database', 'Database', 'text', true, 'database_name')}
            {renderInputField('username', 'Username', 'text', true, 'username')}
            {renderInputField('password', 'Password', 'password', true, 'password')}
            {renderTextareaField('query', 'Query', true, 'SELECT * FROM table', 3)}
          </div>
        );

      // Hardware services
      case 'bolt-wifi':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} onConnect={() => handleConnectIntegration('bolt-wifi')} />
            {renderInputField('deviceId', 'Device ID', 'text', true, 'Enter Bolt device ID')}
            {renderInputField('apiKey', 'API Key', 'password', true, 'Enter Bolt API key')}
            {renderInputField('command', 'Command', 'text', true, 'Enter hardware command')}
          </div>
        );

      case 'temperature-sensor':
        return (
          <div className="space-y-4">
            <IntegrationStatus authInfo={authInfo} />
            {renderInputField('pin', 'Sensor Pin', 'number', true, '2')}
            {renderInputField('threshold', 'Temperature Threshold', 'number', false, '30')}
            {renderSelectField('unit', 'Unit', [
              { value: 'celsius', label: 'Celsius' },
              { value: 'fahrenheit', label: 'Fahrenheit' }
            ], false)}
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

  const renderScheduleTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={scheduleConfig.enabled}
            onChange={(e) => handleScheduleChange('enabled', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Enable Scheduling</span>
        </label>
      </div>

      {scheduleConfig.enabled && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Type
            </label>
            <select
              value={scheduleConfig.type}
              onChange={(e) => handleScheduleChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="immediate">Execute Immediately</option>
              <option value="delayed">Delayed Execution</option>
              <option value="scheduled">Scheduled Time</option>
              <option value="recurring">Recurring Schedule</option>
            </select>
          </div>

          {scheduleConfig.type === 'delayed' && (
            <div className="flex space-x-2">
              <input
                type="number"
                value={scheduleConfig.delay}
                onChange={(e) => handleScheduleChange('delay', parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Delay amount"
                min="0"
              />
              <select
                value={scheduleConfig.delayUnit}
                onChange={(e) => handleScheduleChange('delayUnit', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          )}

          {(scheduleConfig.type === 'scheduled' || scheduleConfig.type === 'recurring') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {scheduleConfig.type === 'recurring' ? 'Cron Expression' : 'Execution Time'}
              </label>
              <input
                type={scheduleConfig.type === 'scheduled' ? 'datetime-local' : 'text'}
                value={scheduleConfig.cronExpression}
                onChange={(e) => handleScheduleChange('cronExpression', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={scheduleConfig.type === 'recurring' ? '0 9 * * *' : ''}
              />
              {scheduleConfig.type === 'recurring' && (
                <p className="text-xs text-gray-500 mt-1">
                  Format: minute hour day month day-of-week (e.g., 0 9 * * * for 9 AM daily)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={scheduleConfig.timezone}
              onChange={(e) => handleScheduleChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">EST</option>
              <option value="America/Los_Angeles">PST</option>
              <option value="Europe/London">GMT</option>
              <option value="Asia/Kolkata">IST</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Data Input Type
        </label>
        <select
          value={dataOptions.inputType}
          onChange={(e) => handleDataOptionChange('inputType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="manual">Manual Input</option>
          <option value="previous_node">From Previous Node</option>
          <option value="upload">Upload File</option>
          <option value="api">API Fetch</option>
          <option value="database">Database Query</option>
        </select>
      </div>

      {dataOptions.inputType === 'upload' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Data File
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <FaUpload className="mx-auto text-gray-400 text-2xl mb-2" />
            <input
              type="file"
              accept=".json,.csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Choose File
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Supports JSON, CSV, or text files
            </p>
            {dataOptions.uploadData && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                <FaCheckCircle className="inline text-green-500 mr-1" />
                File uploaded successfully
              </div>
            )}
          </div>
        </div>
      )}

      {dataOptions.inputType === 'api' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Endpoint
            </label>
            <input
              type="url"
              value={dataOptions.apiEndpoint}
              onChange={(e) => handleDataOptionChange('apiEndpoint', e.target.value)}
              placeholder="https://api.example.com/data"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTTP Method
            </label>
            <select
              value={dataOptions.apiMethod}
              onChange={(e) => handleDataOptionChange('apiMethod', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Headers
            </label>
            <textarea
              value={dataOptions.apiHeaders}
              onChange={(e) => handleDataOptionChange('apiHeaders', e.target.value)}
              placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
          </div>

          {(dataOptions.apiMethod === 'POST' || dataOptions.apiMethod === 'PUT') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Body
              </label>
              <textarea
                value={dataOptions.apiBody}
                onChange={(e) => handleDataOptionChange('apiBody', e.target.value)}
                placeholder='{"key": "value"}'
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              />
            </div>
          )}
        </div>
      )}

      {dataOptions.inputType === 'database' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Database Integration
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              <option value="">Select Database Integration</option>
              {userIntegrations
                .filter(i => i.service === 'mysql' && i.isValid)
                .map(integration => (
                  <option key={integration._id} value={integration._id}>
                    {integration.name} - {integration.config?.database || 'No database'}
                  </option>
                ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SQL Query
            </label>
            <textarea
              placeholder="SELECT * FROM table WHERE condition = ?"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
          </div>
        </div>
      )}

      {dataOptions.inputType === 'previous_node' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <FaInfoCircle className="text-blue-500" />
            <p className="text-sm text-blue-800">
              Data will be automatically passed from the previous node in the workflow.
              Use <code className="bg-blue-100 px-1 rounded">{"{{previousNodeOutput}}"}</code> in your parameters.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const onSubmit = (data) => {
    if (selectedNode) {
      // Merge standard parameters with custom parameters
      const allParameters = {
        ...data,
        ...Object.fromEntries(customParams.map(param => [param.key, param.value]))
      };

      const allData = {
        parameters: allParameters,
        schedule: scheduleConfig.enabled ? scheduleConfig : null,
        dataOptions: dataOptions,
        parametersConfigured: true
      };

      console.log('Saving node configuration:', selectedNode.id, allData);

      updateNodeData(selectedNode.id, allData);
      showPopup('✅ Node configuration saved successfully!', 'success');
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
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Node Settings
        </h2>
        <div className="text-sm text-gray-600 mb-2">
          Configure: <strong>{currentNode.data.label}</strong>
        </div>
        <div className="text-xs text-gray-500">
          Step {currentNode.data.stepNumber} • {currentNode.data.service}
          {currentNode.data.parametersConfigured && (
            <span className="ml-2 text-green-600">✓ Configured</span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 shrink-0">
        <nav className="-mb-px flex space-x-4 px-4">
          <button
            onClick={() => setActiveTab('parameters')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
              activeTab === 'parameters'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaCog size={12} />
            <span>Parameters</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
              activeTab === 'schedule'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaClock size={12} />
            <span>Schedule</span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaDatabase size={12} />
            <span>Data</span>
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-6">
          {activeTab === 'parameters' && (
            <>
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
            </>
          )}

          {activeTab === 'schedule' && renderScheduleTab()}
          {activeTab === 'data' && renderDataTab()}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm font-medium"
          >
            Save Configuration
          </button>
        </form>
      </div>
    </div>
  );
};

// Integration Status Component
const IntegrationStatus = ({ authInfo, onConnect }) => (
  <div className={`border rounded-lg p-4 ${
    authInfo.isValid ? 'bg-green-50 border-green-200' : 
    authInfo.configured ? 'bg-yellow-50 border-yellow-200' : 
    'bg-blue-50 border-blue-200'
  }`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <FaKey className={`${
          authInfo.isValid ? 'text-green-600' : 
          authInfo.configured ? 'text-yellow-600' : 
          'text-blue-600'
        }`} />
        <span className={`font-semibold text-sm ${
          authInfo.isValid ? 'text-green-800' : 
          authInfo.configured ? 'text-yellow-800' : 
          'text-blue-800'
        }`}>
          {authInfo.type} Authentication
        </span>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${
        authInfo.isValid ? 'bg-green-100 text-green-800' : 
        authInfo.configured ? 'bg-yellow-100 text-yellow-800' : 
        'bg-blue-100 text-blue-800'
      }`}>
        {authInfo.isValid ? '✅ Connected' : authInfo.configured ? '⚠️ Needs Setup' : 'Required'}
      </span>
    </div>
    
    <p className={`text-sm mb-3 ${
      authInfo.isValid ? 'text-green-700' : 
      authInfo.configured ? 'text-yellow-700' : 
      'text-blue-700'
    }`}>
      {authInfo.description}
    </p>
    
    {!authInfo.isValid && (
      <button
        onClick={onConnect}
        className={`w-full text-sm py-2 px-3 rounded-lg font-medium ${
          authInfo.configured 
            ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } transition-colors`}
      >
        {authInfo.configured ? 'Complete Setup' : 'Connect Integration'}
      </button>
    )}
    
    {authInfo.lastError && (
      <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
        <FaExclamationTriangle className="inline mr-1" />
        Last Error: {authInfo.lastError}
      </p>
    )}
  </div>
);

export default NodeSettingsPanel;