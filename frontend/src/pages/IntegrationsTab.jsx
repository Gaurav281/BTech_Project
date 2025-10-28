import React, { useState, useEffect } from 'react';
import { 
  FaDesktop, FaMicrochip, FaCode, FaPlus 
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { integrationsAPI } from '../api/api';

// Import components
import IntegrationCard from '../components/integrations/IntegrationCard';
import AddIntegrationModal from '../components/integrations/AddIntegrationModal';
import AuthModal from '../components/integrations/AuthModal';
import GuideModal from '../components/integrations/GuideModal';
import CreateIntegrationModal from '../components/integrations/CreateIntegrationModal';

// Import available integrations
import { availableIntegrations } from '../services/availableIntegrations';

const IntegrationsTab = () => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showAddIntegrationModal, setShowAddIntegrationModal] = useState(false);
  const [showCreateIntegrationModal, setShowCreateIntegrationModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [authData, setAuthData] = useState({});
  const [newIntegrationInput, setNewIntegrationInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('software');
  const { user } = useAuth();

  // Custom integration form state
  const [customIntegration, setCustomIntegration] = useState({
    name: '',
    type: 'software',
    category: '',
    description: '',
    authType: 'API Key',
    parameters: [],
    customCode: '',
    setupGuide: ''
  });

  const [newParameter, setNewParameter] = useState({
    key: '',
    label: '',
    type: 'text',
    required: false,
    defaultValue: '',
    description: ''
  });

  useEffect(() => {
    loadUserIntegrations();
  }, []);

  const loadUserIntegrations = async () => {
    try {
      const response = await integrationsAPI.getUserIntegrations();
      setIntegrations(response.data.integrations || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatus = (integrationId) => {
  // For predefined integrations, integrationId is the service name (like 'telegram', 'gmail')
  // For custom integrations, integrationId is the _id
  const userIntegration = integrations.find(i => 
    i.service === integrationId || i._id === integrationId
  );
  
  if (!userIntegration) return { connected: false, status: 'disconnected' };
  
  return {
    connected: userIntegration.isActive && userIntegration.isValid,
    status: userIntegration.isValid ? 'connected' : 'invalid',
    lastTested: userIntegration.lastTested,
    config: userIntegration.config
  };
};

  const handleConnect = (integration) => {
    setSelectedIntegration(integration);
    
    if (integration.authType === 'OAuth2') {
      initiateOAuth(integration);
    } else {
      // Get the correct ID for status lookup
      const integrationId = integration.id || integration._id;
      const existingConfig = getIntegrationStatus(integrationId)?.config || {};
      setAuthData(existingConfig);
      setShowAuthModal(true);
    }
  };

  const initiateOAuth = async (integration) => {
    try {
      const response = await integrationsAPI.initiateOAuth(integration.id);
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('OAuth initiation failed:', error);
      showPopup('Failed to start OAuth flow: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

 // In the handleSaveIntegration function, update to send all required fields:
const handleSaveIntegration = async () => {
  if (!selectedIntegration) return;

  try {
    // For predefined integrations, send all required fields
    if (selectedIntegration.id) {
      await integrationsAPI.saveIntegration({
        service: selectedIntegration.id,
        config: authData,
        authType: selectedIntegration.authType,
        name: selectedIntegration.name,
        type: selectedIntegration.type || 'software',
        category: selectedIntegration.category,
        description: selectedIntegration.description
      });
    } else {
      // For custom integrations, use update endpoint
      await integrationsAPI.updateIntegration(selectedIntegration._id, {
        config: authData
      });
    }

    setShowAuthModal(false);
    setAuthData({});
    loadUserIntegrations();
    
    showPopup(`✅ ${selectedIntegration.name} configured successfully!`, 'success');

  } catch (error) {
    console.error('Failed to save integration:', error);
    const errorMessage = error.response?.data?.error || error.message;
    
    // Handle OAuth-specific errors
    if (errorMessage.includes('invalid_grant') || errorMessage.includes('authorization code')) {
      showPopup('❌ OAuth session expired. Please try reconnecting the integration.', 'error');
    } else {
      showPopup('Failed to save integration: ' + errorMessage, 'error');
    }
  }
};

  const handleTestIntegration = async (integrationId) => {
    setTesting(true);
    try {
      const response = await integrationsAPI.testIntegration(integrationId);
      
      showPopup(
        response.data.valid 
          ? '✅ Connection test successful!' 
          : `❌ Connection test failed: ${response.data.error}`,
        response.data.valid ? 'success' : 'error'
      );

      loadUserIntegrations();

    } catch (error) {
      console.error('Test failed:', error);
      showPopup('❌ Test failed: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async (integrationId) => {
    if (!window.confirm(`Are you sure you want to disconnect this integration?`)) return;

    try {
      await integrationsAPI.deleteIntegration(integrationId);
      loadUserIntegrations();
      showPopup('✅ Integration disconnected successfully!', 'success');

    } catch (error) {
      console.error('Failed to disconnect:', error);
      showPopup('Failed to disconnect: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleCreateCustomIntegration = async () => {
    try {
      const response = await integrationsAPI.createCustomIntegration(customIntegration);
      showPopup('✅ Custom integration created successfully!', 'success');
      setShowCreateIntegrationModal(false);
      resetCustomIntegrationForm();
      loadUserIntegrations();
    } catch (error) {
      console.error('Failed to create custom integration:', error);
      showPopup('❌ Failed to create integration: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleExecuteIntegration = async (integrationId) => {
    setExecuting(true);
    try {
      const response = await integrationsAPI.executeIntegration(integrationId, { 
        test: true,
        timestamp: new Date().toISOString()
      });
      showPopup('✅ Integration executed successfully!', 'success');
    } catch (error) {
      console.error('Execution failed:', error);
      showPopup('❌ Execution failed: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setExecuting(false);
    }
  };

  const resetCustomIntegrationForm = () => {
    setCustomIntegration({
      name: '',
      type: 'software',
      category: '',
      description: '',
      authType: 'API Key',
      parameters: [],
      customCode: '',
      setupGuide: ''
    });
  };

  const addParameter = () => {
    if (!newParameter.key || !newParameter.label) {
      showPopup('❌ Parameter key and label are required', 'error');
      return;
    }

    setCustomIntegration(prev => ({
      ...prev,
      parameters: [...prev.parameters, { ...newParameter }]
    }));

    setNewParameter({
      key: '',
      label: '',
      type: 'text',
      required: false,
      defaultValue: '',
      description: ''
    });
  };

  const removeParameter = (index) => {
    setCustomIntegration(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }));
  };

  const generateDefaultCode = () => {
    const code = `/**
 * ${customIntegration.name} Integration
 * Type: ${customIntegration.type}
 * Auth: ${customIntegration.authType}
 */
async function execute(config, data) {
  try {
    // Your integration logic here
    console.log('Executing ${customIntegration.name}');
    console.log('Config:', config);
    console.log('Data:', data);
    
    // Example implementation
    ${getCodeTemplate(customIntegration)}
    
    return { success: true, message: '${customIntegration.name} executed successfully' };
  } catch (error) {
    throw new Error('Execution failed: ' + error.message);
  }
}`;

    setCustomIntegration(prev => ({ ...prev, customCode: code }));
  };

  const getCodeTemplate = (integration) => {
    switch (integration.authType) {
      case 'API Key':
        return `// API Key authentication
const response = await fetch(config.endpoint, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + config.apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
return await response.json();`;
      case 'OAuth2':
        return `// OAuth2 authentication
const response = await fetch(config.endpoint, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + config.accessToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
return await response.json();`;
      case 'Database':
        return `// Database connection
// Implement database logic using config credentials
return { success: true, message: 'Database operation completed' };`;
      case 'Serial':
        return `// Serial communication
// Implement serial port communication
return { success: true, message: 'Serial command sent' };`;
      default:
        return `// Implement your ${integration.authType} authentication logic
return { success: true, message: 'Operation completed' };`;
    }
  };

  const generateSetupGuide = () => {
    const guide = `# ${customIntegration.name} Setup Guide

## Prerequisites
- ${customIntegration.type === 'software' ? 'API access credentials' : 'Hardware device and drivers'}
- Network connectivity
- Required software/tools

## Configuration Steps
1. Obtain your ${customIntegration.authType === 'API Key' ? 'API Key' : 'authentication credentials'}
2. Configure the connection parameters
3. Test the integration
4. Use in your workflows

## Troubleshooting
- Check network connectivity
- Verify authentication credentials
- Review error logs for details`;

    setCustomIntegration(prev => ({ ...prev, setupGuide: guide }));
  };

  const showPopup = (message, type = 'info') => {
    const popup = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 
                   type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
    
    popup.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out font-semibold`;
    popup.textContent = message;
    document.body.appendChild(popup);
    
    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 4000);
  };

  const handleShowGuide = (integration) => {
    setSelectedIntegration(integration);
    setShowGuideModal(true);
  };

  const handleAddIntegration = () => {
    setShowAddIntegrationModal(true);
  };

  const handleCreateIntegration = () => {
    if (!newIntegrationInput.trim()) return;

    // Find integration by name across all tabs
    const allIntegrations = [...availableIntegrations.software, ...availableIntegrations.hardware];
    const integration = allIntegrations.find(
      i => i.name.toLowerCase().includes(newIntegrationInput.toLowerCase()) ||
           i.id.toLowerCase().includes(newIntegrationInput.toLowerCase())
    );

    if (integration) {
      setSelectedIntegration(integration);
      setShowAddIntegrationModal(false);
      setNewIntegrationInput('');
      
      if (integration.authType === 'OAuth2') {
        initiateOAuth(integration);
      } else {
        setAuthData({});
        setShowAuthModal(true);
      }
    } else {
      showPopup('❌ Integration not found. Please check the name or create a custom integration.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
            <p className="text-gray-600 mt-2">Manage your connected services and devices</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleAddIntegration}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus size={14} />
              <span>Add Integration</span>
            </button>
            <button
              onClick={() => setShowCreateIntegrationModal(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaCode size={14} />
              <span>Create Custom</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('software')}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'software'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaDesktop size={16} />
              <span>Software Services</span>
            </button>
            <button
              onClick={() => setActiveTab('hardware')}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'hardware'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaMicrochip size={16} />
              <span>Hardware Devices</span>
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'custom'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaCode size={16} />
              <span>Custom Integrations</span>
              {integrations.filter(i => i.type === 'custom').length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                  {integrations.filter(i => i.type === 'custom').length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'custom' ? (
          // Custom integrations
          integrations
            .filter(integration => integration.type === 'custom')
            .map((integration) => (
              <IntegrationCard
                key={integration._id}
                integration={integration}
                status={getIntegrationStatus(integration._id)}
                onConnect={handleConnect}
                onTest={handleTestIntegration}
                onDisconnect={handleDisconnect}
                onConfigure={(integration) => {
                  setSelectedIntegration(integration);
                  setAuthData(integration.config || {});
                  setShowAuthModal(true);
                }}
                onShowGuide={handleShowGuide}
                onExecute={handleExecuteIntegration}
                onViewCode={() => {
                  setSelectedIntegration(integration);
                  setShowCodeModal(true);
                }}
                testing={testing}
                executing={executing}
                isCustom={true}
              />
            ))
        ) : (
          // Predefined integrations
          availableIntegrations[activeTab].map((integration) => {
            const userIntegration = integrations.find(i => i.service === integration.id);
            const status = getIntegrationStatus(integration.id);
            
            return (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                status={status}
                onConnect={handleConnect}
                onTest={handleTestIntegration}
                onDisconnect={handleDisconnect}
                onConfigure={(integration) => {
                  setSelectedIntegration(integration);
                  const existingConfig = status.config || {};
                  setAuthData(existingConfig);
                  setShowAuthModal(true);
                }}
                onShowGuide={handleShowGuide}
                testing={testing}
                isCustom={false}
              />
            );
          })
        )}
      </div>

      {/* Empty State for Custom Tab */}
      {activeTab === 'custom' && integrations.filter(i => i.type === 'custom').length === 0 && (
        <div className="text-center py-12">
          <FaCode className="mx-auto text-gray-400 text-4xl mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No custom integrations yet</h3>
          <p className="text-gray-600 mb-4">Create your first custom integration to get started</p>
          <button
            onClick={() => setShowCreateIntegrationModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Custom Integration
          </button>
        </div>
      )}

      {/* Modals */}
      <AddIntegrationModal
        isOpen={showAddIntegrationModal}
        onClose={() => {
          setShowAddIntegrationModal(false);
          setNewIntegrationInput('');
        }}
        newIntegrationInput={newIntegrationInput}
        setNewIntegrationInput={setNewIntegrationInput}
        onCreateIntegration={handleCreateIntegration}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthData({});
        }}
        selectedIntegration={selectedIntegration}
        authData={authData}
        setAuthData={setAuthData}
        onSave={handleSaveIntegration}
        isConnected={selectedIntegration ? getIntegrationStatus(selectedIntegration.id || selectedIntegration._id)?.connected : false}
      />

      <GuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        selectedIntegration={selectedIntegration}
      />

      <CreateIntegrationModal
        isOpen={showCreateIntegrationModal}
        onClose={() => {
          setShowCreateIntegrationModal(false);
          resetCustomIntegrationForm();
        }}
        customIntegration={customIntegration}
        setCustomIntegration={setCustomIntegration}
        newParameter={newParameter}
        setNewParameter={setNewParameter}
        onAddParameter={addParameter}
        onRemoveParameter={removeParameter}
        onGenerateCode={generateDefaultCode}
        onGenerateGuide={generateSetupGuide}
        onCreateIntegration={handleCreateCustomIntegration}
      />

      {/* Code View Modal */}
      {showCodeModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {selectedIntegration.name} - Execution Code
            </h3>
            
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{selectedIntegration.customCode}</pre>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsTab;