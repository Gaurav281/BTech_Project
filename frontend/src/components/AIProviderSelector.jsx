//src/components/AIProviderSelector.jsx
import React, { useState, useEffect } from 'react';
import { FaRobot, FaKey, FaCog, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { aiAPI } from '../api/api';

const AIProviderSelector = ({ currentProvider, onProviderChange }) => {
  const [providers, setProviders] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({});
  const [testing, setTesting] = useState({});
  const [tempProvider, setTempProvider] = useState(currentProvider);
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 3000);
  };

  // Load saved API keys and provider from localStorage on component mount
  useEffect(() => {
    loadProviders();
    loadSavedSettings();
  }, []);

  const loadSavedSettings = () => {
    try {
      const savedApiKeys = localStorage.getItem('aiApiKeys');
      const savedProvider = localStorage.getItem('aiCurrentProvider');
      
      if (savedApiKeys) {
        setApiKeys(JSON.parse(savedApiKeys));
      }
      
      if (savedProvider) {
        setTempProvider(savedProvider);
        onProviderChange(savedProvider);
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
  };

  const saveSettings = (provider, keys) => {
    try {
      localStorage.setItem('aiApiKeys', JSON.stringify(keys));
      localStorage.setItem('aiCurrentProvider', provider);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await aiAPI.getProviders();
      setProviders(response.data.providers || {
        normal: 'Normal (Rule-Based)',
        openai: 'OpenAI GPT',
        huggingface: 'Hugging Face'
      });
      
      // Initialize with saved API keys or empty
      const savedApiKeys = JSON.parse(localStorage.getItem('aiApiKeys') || '{}');
      const initialApiKeys = {};
      Object.keys(response.data.providers || {}).forEach(provider => {
        if (provider !== 'normal') {
          initialApiKeys[provider] = savedApiKeys[provider] || '';
        }
      });
      setApiKeys(initialApiKeys);
    } catch (error) {
      console.error('Failed to load providers:', error);
      // Fallback providers if API fails
      setProviders({
        normal: 'Normal (Rule-Based)',
        openai: 'OpenAI GPT',
        huggingface: 'Hugging Face'
      });
    }
  };

  const testApiKey = async (provider, apiKey) => {
    if (!apiKey) {
      setStatus(prev => ({
        ...prev,
        [provider]: 'no_key'
      }));
      return false;
    }
    
    setTesting(prev => ({ ...prev, [provider]: true }));
    
    try {
      const response = await aiAPI.testConnection(provider, apiKey);
      const isValid = response.data.valid;
      
      setStatus(prev => ({
        ...prev,
        [provider]: isValid ? 'valid' : 'invalid'
      }));
      
      if (isValid) {
        showNotification(`✅ ${providers[provider]} API key is valid!`, 'success');
      } else {
        showNotification(`❌ ${providers[provider]} API key is invalid`, 'error');
      }
      
      return isValid;
    } catch (error) {
      console.error('Test connection error:', error);
      setStatus(prev => ({
        ...prev,
        [provider]: 'invalid'
      }));
      showNotification(`❌ Failed to test ${providers[provider]} connection`, 'error');
      return false;
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleProviderSelect = (provider) => {
    setTempProvider(provider);
  };

  const handleApplyProvider = async () => {
    setLoading(true);
    try {
      const apiKey = apiKeys[tempProvider] || '';
      
      // Test API key if provided and not normal provider
      if (tempProvider !== 'normal') {
        if (!apiKey) {
          showNotification(`⚠️ API key required for ${providers[tempProvider]}`, 'warning');
          setLoading(false);
          return;
        }
        
        const isValid = await testApiKey(tempProvider, apiKey);
        
        if (!isValid) {
          showNotification(`❌ Invalid API key for ${providers[tempProvider]}`, 'error');
          setLoading(false);
          return;
        }
      }
      
      // Set the provider with API key
      await aiAPI.setProvider(tempProvider, apiKey);
      
      // Save settings to localStorage
      saveSettings(tempProvider, apiKeys);
      
      onProviderChange(tempProvider);
      setShowSettings(false);
      
      showNotification(`✅ AI provider set to ${providers[tempProvider]}`, 'success');
      
    } catch (error) {
      console.error('Failed to set provider:', error);
      // Still allow provider change even if API call fails
      saveSettings(tempProvider, apiKeys);
      onProviderChange(tempProvider);
      setShowSettings(false);
      showNotification(`⚠️ Provider set to ${providers[tempProvider]} (API call failed)`, 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyChange = (provider, key) => {
    const newApiKeys = {
      ...apiKeys,
      [provider]: key
    };
    setApiKeys(newApiKeys);
    
    // Save immediately to localStorage
    saveSettings(tempProvider, newApiKeys);
    
    // Clear status when key changes
    setStatus(prev => ({
      ...prev,
      [provider]: key ? 'testing' : 'no_key'
    }));
  };

  const handleTestConnection = async (provider) => {
    await testApiKey(provider, apiKeys[provider]);
  };

  const getStatusIcon = (provider) => {
    if (provider === 'normal') {
      return <FaCheck className="text-green-500 text-sm" />;
    }
    
    const providerStatus = status[provider];
    
    if (testing[provider]) {
      return <FaSpinner className="animate-spin text-blue-500 text-sm" />;
    } else if (providerStatus === 'valid') {
      return <FaCheck className="text-green-500 text-sm" />;
    } else if (providerStatus === 'invalid') {
      return <FaTimes className="text-red-500 text-sm" />;
    } else if (providerStatus === 'no_key') {
      return <span className="text-xs text-gray-500">No API key</span>;
    } else if (apiKeys[provider]) {
      return (
        <button
          onClick={() => handleTestConnection(provider)}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
          disabled={testing[provider]}
        >
          {testing[provider] ? 'Testing...' : 'Test'}
        </button>
      );
    }
    return <span className="text-xs text-gray-500">Add API key</span>;
  };

  const getProviderDescription = (provider) => {
    const descriptions = {
      normal: 'Uses rule-based parsing. No API key needed. Basic functionality.',
      openai: 'More accurate AI generation. Requires OpenAI API key. Recommended for best results.',
      huggingface: 'HuggingFace generation + Hugging Face enhancement. Requires both API keys. Best code quality.'
    };
    return descriptions[provider] || '';
  };

  const isProviderReady = (provider) => {
    if (provider === 'normal') return true;
    if (!apiKeys[provider]) return false;
    return status[provider] === 'valid';
  };

  return (
    <div className="relative">
      {/* Notification */}
      {notification.message && (
        <div className={`absolute top-12 right-0 z-50 px-4 py-2 rounded-lg text-sm font-medium ${
          notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
          'bg-green-100 text-green-800 border border-green-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Provider Selector Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        disabled={loading}
        className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm disabled:opacity-50 border border-gray-300"
      >
        <FaRobot className="text-purple-600" />
        <span>AI: {providers[currentProvider] || 'Normal'}</span>
        <FaCog className="text-gray-500 text-xs" />
        {loading && (
          <FaSpinner className="animate-spin text-purple-600 text-xs" />
        )}
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-12 right-0 bg-white border max-h-[80vh] overflow-y-auto flex flex-col border-gray-200 rounded-lg shadow-xl z-50 w-96 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">AI Provider Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="space-y-4">
            {Object.entries(providers).map(([key, name]) => (
              <div key={key} className={`border-2 rounded-lg p-4 transition-all ${
                tempProvider === key 
                  ? 'border-blue-500 bg-blue-50 shadow-sm' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="ai-provider"
                    checked={tempProvider === key}
                    onChange={() => handleProviderSelect(key)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-gray-900">{name}</div>
                      {getStatusIcon(key)}
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3">
                      {getProviderDescription(key)}
                    </p>
                    
                    {key !== 'normal' && (
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <input
                            type="password"
                            placeholder={`Enter ${name} API Key`}
                            value={apiKeys[key] || ''}
                            onChange={(e) => handleApiKeyChange(key, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                          />
                        </div>
                        
                        {status[key] === 'invalid' && (
                          <p className="text-red-500 text-xs">
                            ❌ Invalid API key. Please check and try again.
                          </p>
                        )}
                        
                        {status[key] === 'valid' && (
                          <p className="text-green-500 text-xs">
                            ✅ API key is valid and working!
                          </p>
                        )}
                        
                        {!apiKeys[key] && (
                          <p className="text-yellow-500 text-xs">
                            ⚠️ API key required for this provider
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>💡 Tip:</strong> Test your API keys before applying.</p>
              <p><strong>🔐 Security:</strong> API keys are stored locally in your browser.</p>
              <p><strong>🆓 Free Options:</strong> Hugging Face offers free tier with limited requests.</p>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyProvider}
              disabled={loading || (tempProvider !== 'normal' && !isProviderReady(tempProvider))}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading && <FaSpinner className="animate-spin" />}
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close settings when clicking outside */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default AIProviderSelector;