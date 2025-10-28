import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import useWorkflowStore from '../store/workflowStore';
import { FaKey, FaInfoCircle, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { integrationsAPI } from '../api/api';

const NodeSettingsPanel = () => {
  const { selectedNode, updateNodeData, nodes } = useWorkflowStore();
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();
  const [userIntegrations, setUserIntegrations] = React.useState([]);

  useEffect(() => {
    loadUserIntegrations();
  }, []);

  const loadUserIntegrations = async () => {
    try {
      const response = await integrationsAPI.getUserIntegrations();
      setUserIntegrations(response.data.integrations || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  // Reset form when selected node changes
  useEffect(() => {
    if (selectedNode && selectedNode.data.parameters) {
      reset(selectedNode.data.parameters);
    } else {
      reset({});
    }
  }, [selectedNode?.id, reset]);

  const getIntegrationStatus = (service) => {
    const integration = userIntegrations.find(i => i.service === service);
    if (!integration) return { configured: false, isValid: false };
    return { 
      configured: true, 
      isValid: integration.isValid,
      lastError: integration.lastError 
    };
  };

  const getAuthenticationInfo = (service) => {
    const integrationStatus = getIntegrationStatus(service);
    
    const authInfo = {
      'telegram-send': {
        required: true,
        type: 'Bot Token',
        description: 'Requires Telegram Bot Token from BotFather',
        steps: [
          'Message @BotFather on Telegram',
          'Create a new bot with /newbot command',
          'Copy the provided bot token',
          'Configure bot permissions as needed'
        ],
        ...integrationStatus
      },
      'telegram-monitor': {
        required: true,
        type: 'Bot Token',
        description: 'Requires Telegram Bot Token from BotFather',
        steps: [
          'Message @BotFather on Telegram',
          'Create a new bot with /newbot command',
          'Copy the provided bot token',
          'Add bot to your group/channel'
        ],
        ...integrationStatus
      },
      'gmail': {
        required: true,
        type: 'OAuth 2.0',
        description: 'Requires Gmail API access with proper scopes',
        steps: [
          'Enable Gmail API in Google Cloud Console',
          'Create OAuth 2.0 credentials',
          'Configure redirect URIs',
          'Grant email read/write permissions'
        ],
        ...integrationStatus
      },
      'slack': {
        required: true,
        type: 'Webhook or OAuth',
        description: 'Requires Slack app configuration',
        steps: [
          'Create a Slack app in your workspace',
          'Install the app to your workspace',
          'Copy the webhook URL or OAuth token',
          'Configure necessary scopes'
        ],
        ...integrationStatus
      },
      'google-sheets': {
        required: true,
        type: 'OAuth 2.0',
        description: 'Requires Google Sheets API access',
        steps: [
          'Enable Google Sheets API',
          'Create OAuth 2.0 credentials',
          'Grant spreadsheet read/write permissions',
          'Configure API scopes'
        ],
        ...integrationStatus
      },
      'mysql': {
        required: true,
        type: 'Database Credentials',
        description: 'Requires MySQL database connection details',
        steps: [
          'Ensure MySQL server is running',
          'Create database and user with proper permissions',
          'Note connection details: host, port, username, password, database'
        ],
        ...integrationStatus
      },
      'webhook': {
        required: false,
        type: 'URL Endpoint',
        description: 'Requires a webhook URL to send requests to',
        steps: [
          'Create an endpoint to receive webhook calls',
          'Configure expected payload format',
          'Set up authentication if required'
        ],
        ...integrationStatus
      }
    };

    return authInfo[service] || { required: false, type: 'None', description: 'No authentication required', ...integrationStatus };
  };

  const renderParameterFields = () => {
    if (!selectedNode) return null;

    const service = selectedNode.data.service;
    const parameters = selectedNode.data.parameters || {};
    const authInfo = getAuthenticationInfo(service);

    switch (service) {
      case 'telegram-send':
      case 'telegram-monitor':
        return (
          <div className="space-y-4">
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
                  Telegram Authentication {authInfo.isValid ? '✅ Connected' : authInfo.configured ? '⚠️ Needs Setup' : 'Required'}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot Token *
              </label>
              <input
                type="password"
                {...register('botToken', { required: 'Bot Token is required' })}
                defaultValue={parameters.botToken || ''}
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
                defaultValue={parameters.chatId || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your chat ID"
              />
              {errors.chatId && (
                <p className="text-red-500 text-xs mt-1">{errors.chatId.message}</p>
              )}
            </div>

            {service === 'telegram-send' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  {...register('message', { required: 'Message is required' })}
                  defaultValue={parameters.message || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your message"
                />
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
                )}
              </div>
            )}

            {service === 'telegram-monitor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keyword to Monitor *
                </label>
                <input
                  type="text"
                  {...register('keyword', { required: 'Keyword is required' })}
                  defaultValue={parameters.keyword || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter keyword to monitor"
                />
                {errors.keyword && (
                  <p className="text-red-500 text-xs mt-1">{errors.keyword.message}</p>
                )}
              </div>
            )}
          </div>
        );

      case 'gmail':
        return (
          <div className="space-y-4">
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
                  Gmail Authentication {authInfo.isValid ? '✅ Connected' : authInfo.configured ? '⚠️ Needs Setup' : 'Required'}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Email *
              </label>
              <input
                type="email"
                {...register('to', { required: 'Email is required' })}
                defaultValue={parameters.to || ''}
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
                defaultValue={parameters.subject || ''}
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
                defaultValue={parameters.body || ''}
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

      // Add cases for other services (slack, google-sheets, mysql, webhook) similarly

      default:
        return (
          <div className="text-gray-500 text-sm">
            <div className="flex items-center space-x-2 mb-2">
              <FaInfoCircle className="text-gray-400" />
              <span>No specific parameters required for this node type.</span>
            </div>
          </div>
        );
    }
  };

  const onSubmit = (data) => {
    if (selectedNode) {
      // Update the specific node's data
      updateNodeData(selectedNode.id, { 
        parameters: data,
        parametersConfigured: true 
      });
      
      // Show success message
      const popup = document.createElement('div');
      popup.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out';
      popup.textContent = '✅ Parameters saved successfully!';
      document.body.appendChild(popup);
      
      setTimeout(() => {
        if (document.body.contains(popup)) {
          document.body.removeChild(popup);
        }
      }, 3000);
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
        
        {authInfo.required && (
          <div className={`mt-3 flex items-center space-x-2 text-sm ${
            authInfo.isValid ? 'text-green-600' : 
            authInfo.configured ? 'text-yellow-600' : 
            'text-amber-600'
          }`}>
            {authInfo.isValid ? <FaCheckCircle /> : <FaExclamationTriangle />}
            <span>
              {authInfo.isValid ? 'Integration connected' : 
               authInfo.configured ? 'Integration needs setup' : 
               'Authentication required'}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {renderParameterFields()}
        
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

export default NodeSettingsPanel;