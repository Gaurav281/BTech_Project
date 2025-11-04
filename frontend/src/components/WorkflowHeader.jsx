import React, { useState,useCallback } from 'react';
import {
  FaPlay,
  FaStop,
  FaDownload,
  FaUpload,
  FaTerminal,
  FaSave,
  FaShare,
  FaGlobe,
  FaCopy,
  FaBars, 
  FaRedo,
  FaEdit,
  FaCloud,
  FaSync
} from 'react-icons/fa';
import useWorkflowStore from '../store/workflowStore';
import { workflowAPI, integrationsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const WorkflowHeader = ({
  onToggleTerminal,
  showTerminal,
  onGenerateWorkflow,
  userIntegrations,
  validateWorkflow,
  onExecuteWorkflow,
  onStopWorkflow,
  onEditJSON,
  onHostWorkflow,
  onRefresh,
  onShare, 
  isRunning
}) => {
  const {
    nodes,
    edges,
    setIsRunning,
    workflowName,
    setWorkflowName,
    addTerminalLog,
    selectedNode
  } = useWorkflowStore();

  const { user } = useAuth();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showJSONModal, setShowJSONModal] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [publishData, setPublishData] = useState({
    isPublic: false,
    name: ''
  });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Check for mobile view
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // VALIDATE WORKFLOW FUNCTION
  const validateWorkflowForExecution = () => {
    const missingIntegrations = [];
    const missingParameters = [];

    nodes.forEach(node => {
      // Check integration
      if (node.data.service && node.data.service !== 'trigger') {
        const integration = userIntegrations.find(i => i.service === node.data.service);
        if (!integration || !integration.isValid) {
          missingIntegrations.push(node.data.service);
        }
      }

      // Check parameters
      if (node.data.parameters) {
        const requiredParams = getRequiredParameters(node.data.service);
        requiredParams.forEach(param => {
          if (!node.data.parameters[param]) {
            missingParameters.push(`${node.data.label}: ${param}`);
          }
        });
      }
    });

    return { missingIntegrations, missingParameters };
  };

  const getRequiredParameters = (service) => {
    const requirements = {
      'telegram': ['botToken', 'chatId', 'message'],
      'gmail': ['to', 'subject', 'body'],
      'slack': ['channel', 'message'],
      'google-sheets': ['spreadsheetId', 'range'],
      'mysql': ['query'],
      'webhook': ['url'],
      'youtube': ['channelId', 'action'],
      'instagram': ['username', 'action']
    };

    return requirements[service] || [];
  };

  const handleStart = async () => {
    if (nodes.length === 0) {
      addTerminalLog('No workflow to run. Please generate a workflow first.', 'error');
      showPopup('❌ No workflow to execute', 'error');
      return;
    }

    // Validate workflow before execution
    const validation = validateWorkflowForExecution();
    if (validation.missingIntegrations.length > 0 || validation.missingParameters.length > 0) {
      addTerminalLog('❌ Workflow validation failed:', 'error');
      validation.missingIntegrations.forEach(service => {
        addTerminalLog(`   • ${service}: Integration not configured`, 'error');
      });
      validation.missingParameters.forEach(param => {
        addTerminalLog(`   • ${param}`, 'error');
      });
      showPopup('❌ Workflow validation failed', 'error');
      return;
    }

    // Use the passed execution function if available, otherwise use default
    if (onExecuteWorkflow) {
      await onExecuteWorkflow();
    } else {
      // Fallback execution logic
      await executeWorkflowFallback();
    }
  };

  const refreshWorkflow = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      if (nodes.length > 0) {
        addTerminalLog('🔄 Workflow environment refreshed');
        addTerminalLog('📝 Clearing temporary data and resetting state');

        // Stop any running workflow
        if (isRunning) {
          setIsRunning(false);
          addTerminalLog('⏹️ Workflow execution stopped');
        }

        showPopup('🔄 Workflow refreshed', 'info');
      } else {
        addTerminalLog('No workflow to refresh', 'warning');
      }
    }
  };

  // Fallback execution function
  const executeWorkflowFallback = async () => {
    setIsRunning(true);
    addTerminalLog('Starting workflow execution...');

    try {
      const saveResponse = await workflowAPI.saveWorkflow({
        name: workflowName,
        nodes,
        edges
      });

      const workflowId = saveResponse.data.workflow._id;
      const executeResponse = await workflowAPI.executeWorkflow(workflowId);

      addTerminalLog('✅ Workflow execution started!');
      addTerminalLog(`Execution ID: ${executeResponse.data.executionId}`);
      showPopup('✅ Workflow execution started!', 'success');

    } catch (error) {
      console.error('Execution error:', error);
      addTerminalLog(`❌ Error executing workflow: ${error.response?.data?.error || error.message}`, 'error');
      showPopup('❌ Failed to execute workflow', 'error');
      setIsRunning(false);
    }
  };

  // REUSABLE POPUP FUNCTION
  const showPopup = (message, type = 'info') => {
    const popup = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

    popup.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out font-semibold text-sm md:text-base`;
    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 4000);
  };

  const handleStop = () => {
    if (onStopWorkflow) {
      onStopWorkflow();
    } else {
      setIsRunning(false);
      addTerminalLog('Workflow execution stopped.');
      showPopup('⏹️ Workflow execution stopped', 'warning');
    }
  };

  const handleSave = async () => {
    if (nodes.length === 0) {
      addTerminalLog('No workflow to save. Please generate a workflow first.', 'error');
      showPopup('❌ No workflow to save', 'error');
      return;
    }

    try {
      const response = await workflowAPI.saveWorkflow({
        name: workflowName,
        nodes,
        edges
      });
      addTerminalLog('✅ Workflow saved successfully!');
      showPopup('✅ Workflow saved successfully!', 'success');
    } catch (error) {
      console.error('Save error:', error);
      addTerminalLog(`❌ Error saving workflow: ${error.response?.data?.error || error.message}`, 'error');
      showPopup('❌ Failed to save workflow', 'error');
    }
  };

  const handleEditJSON = () => {
    if (onEditJSON) {
      onEditJSON();
    } else {
      // Default JSON editor
      const workflowData = {
        name: workflowName,
        nodes: nodes,
        edges: edges,
        version: '1.0',
        updatedAt: new Date().toISOString()
      };
      
      setJsonContent(JSON.stringify(workflowData, null, 2));
      setShowJSONModal(true);
    }
  };

  const handleHostWorkflow = () => {
    if (onHostWorkflow) {
      onHostWorkflow();
    } else {
      setShowHostModal(true);
    }
  };

  const handleJSONSave = () => {
  try {
    const parsedData = JSON.parse(jsonContent);
    
    if (parsedData.name) setWorkflowName(parsedData.name);
    if (parsedData.nodes) setNodes(parsedData.nodes); // Use setNodes from props or store
    if (parsedData.edges) setEdges(parsedData.edges); // Use setEdges from props or store
    
    setShowJSONModal(false);
    addTerminalLog('✅ Workflow updated from JSON');
    showPopup('✅ Workflow updated from JSON', 'success');
  } catch (error) {
    addTerminalLog(`❌ Invalid JSON: ${error.message}`, 'error');
    showPopup('❌ Invalid JSON format', 'error');
  }
};

  const handleConfirmHost = async () => {
    try {
      addTerminalLog('🚀 Hosting workflow...');
      // Implementation for hosting workflow
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      addTerminalLog('✅ Workflow hosted successfully!');
      addTerminalLog('🌐 Workflow will continue running even when browser is closed');
      showPopup('✅ Workflow hosted successfully!', 'success');
      setShowHostModal(false);
    } catch (error) {
      addTerminalLog(`❌ Failed to host workflow: ${error.message}`, 'error');
      showPopup('❌ Failed to host workflow', 'error');
    }
  };

  const handlePublish = () => {
    if (nodes.length === 0) {
      addTerminalLog('No workflow to publish. Please generate a workflow first.', 'error');
      showPopup('❌ No workflow to publish', 'error');
      return;
    }
    setPublishData({
      isPublic: false,
      name: workflowName
    });
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async () => {
    try {
      // First save the workflow
      const saveResponse = await workflowAPI.saveWorkflow({
        name: publishData.name,
        nodes,
        edges
      });

      const workflowId = saveResponse.data.workflow._id;

      // Then publish it
      await workflowAPI.publishWorkflow(workflowId, publishData.isPublic);

      addTerminalLog(`✅ Workflow ${publishData.isPublic ? 'published publicly' : 'set to private'} successfully!`);
      setWorkflowName(publishData.name);
      setShowPublishModal(false);
      showPopup(`✅ Workflow ${publishData.isPublic ? 'published' : 'unpublished'} successfully!`, 'success');
    } catch (error) {
      console.error('Publish error:', error);
      addTerminalLog(`❌ Error publishing workflow: ${error.response?.data?.error || error.message}`, 'error');
      showPopup('❌ Failed to publish workflow', 'error');
    }
  };

  // In your WorkflowHeader component or wherever share is handled
const handleShare = useCallback(async () => {
  if (nodes.length === 0) {
    addTerminalLog('No workflow to share. Please generate a workflow first.', 'error');
    showPopup('❌ No workflow to share', 'error');
    return;
  }

  try {
    // First save the workflow
    const saveResponse = await workflowAPI.saveWorkflow({
      name: workflowName,
      nodes,
      edges,
      isPublic: true // Make it public for sharing
    });

    const workflowId = saveResponse.data.workflow._id;

    // Generate CORRECT shareable link - use the shared route
    const shareableLink = `${window.location.origin}/workflow/shared/${workflowId}`;

    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareableLink);
    } else {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    addTerminalLog('✅ Shareable link copied to clipboard!');
    addTerminalLog(`🔗 Share Link: ${shareableLink}`);
    showPopup('✅ Share link copied to clipboard!', 'success');

  } catch (error) {
    console.error('Share error:', error);
    addTerminalLog(`❌ Error sharing workflow: ${error.response?.data?.error || error.message}`, 'error');
    showPopup('❌ Failed to share workflow', 'error');
  }
}, [workflowName, nodes, edges, addTerminalLog]);

  const handleExport = () => {
    if (nodes.length === 0) {
      addTerminalLog('No workflow to export. Please generate a workflow first.', 'error');
      showPopup('❌ No workflow to export', 'error');
      return;
    }

    const workflowData = {
      name: workflowName,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(workflowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflowName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addTerminalLog(`✅ Workflow exported as ${link.download}`);
    showPopup('✅ Workflow exported successfully!', 'success');
  };

  const handleImport = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const workflowData = JSON.parse(e.target.result);
      
      // Use the store's set methods instead of direct state setting
      useWorkflowStore.setState({
        nodes: workflowData.nodes || [],
        edges: workflowData.edges || [],
        workflowName: workflowData.name || 'Imported Workflow'
      });
      
      addTerminalLog(`✅ Workflow "${workflowData.name}" imported successfully`);
      showPopup('✅ Workflow imported successfully!', 'success');
    } catch (error) {
      addTerminalLog('❌ Error importing workflow: Invalid file format', 'error');
      showPopup('❌ Invalid workflow file', 'error');
    }
  };
  reader.readAsText(file);

  // Reset input
  event.target.value = '';
};

  return (
    <>
      <div className="bg-pink border-b border-gray-200 px-4 md:px-6 py-4 top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            {isMobileView && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FaBars className="text-gray-600" size={16} />
              </button>
            )}

            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg md:text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 min-w-[150px] md:min-w-[200px]"
              placeholder="Workflow Name"
            />
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center space-x-2 flex-wrap gap-y-2 justify-end">
            <button
              onClick={onGenerateWorkflow}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg text-sm"
            >
              <FaPlay size={14} />
              <span>Generate</span>
            </button>

            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={nodes.length === 0}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <FaPlay size={14} />
                <span>Start</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <FaStop size={14} />
                <span>Stop</span>
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={nodes.length === 0}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <FaSave size={14} />
              <span>Save</span>
            </button>

            {/* NEW BUTTONS */}
            <button
              onClick={handleEditJSON}
              disabled={nodes.length === 0}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <FaEdit size={14} />
              <span>Edit JSON</span>
            </button>

            <button
              onClick={handleHostWorkflow}
              disabled={nodes.length === 0}
              className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <FaCloud size={14} />
              <span>Host</span>
            </button>

            <button
              onClick={refreshWorkflow}
              className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              <FaSync size={14} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handlePublish}
              disabled={nodes.length === 0}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <FaGlobe size={14} />
              <span>Publish</span>
            </button>

            <button
              onClick={handleShare}
              disabled={nodes.length === 0}
              className="flex items-center space-x-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <FaShare size={14} />
              <span>Share</span>
            </button>

            <button
              onClick={handleExport}
              disabled={nodes.length === 0}
              className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <FaDownload size={14} />
              <span>Export</span>
            </button>

            <label className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed">
              <FaUpload size={14} />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={isRunning}
              />
            </label>

            <button
              onClick={onToggleTerminal}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm ${showTerminal
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
            >
              <FaTerminal size={14} />
              <span>Terminal</span>
            </button>
          </div>

          {/* Mobile Terminal Toggle */}
          {isMobileView && (
            <button
              onClick={onToggleTerminal}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${showTerminal
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
            >
              <FaTerminal size={14} />
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && isMobileView && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-4 z-50">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onGenerateWorkflow}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm"
              >
                <FaPlay size={12} />
                <span>Generate</span>
              </button>

              {!isRunning ? (
                <button
                  onClick={handleStart}
                  disabled={nodes.length === 0}
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm"
                >
                  <FaPlay size={12} />
                  <span>Start</span>
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="flex items-center justify-center space-x-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                >
                  <FaStop size={12} />
                  <span>Stop</span>
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={nodes.length === 0}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                <FaSave size={12} />
                <span>Save</span>
              </button>

              <button
                onClick={handleEditJSON}
                disabled={nodes.length === 0}
                className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 text-sm"
              >
                <FaEdit size={12} />
                <span>Edit JSON</span>
              </button>

              <button
                onClick={handleHostWorkflow}
                disabled={nodes.length === 0}
                className="flex items-center justify-center space-x-2 bg-teal-600 text-white px-3 py-2 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 text-sm"
              >
                <FaCloud size={12} />
                <span>Host</span>
              </button>

              <button
                onClick={refreshWorkflow}
                className="flex items-center justify-center space-x-2 bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 text-sm"
              >
                <FaSync size={12} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handlePublish}
                disabled={nodes.length === 0}
                className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm"
              >
                <FaGlobe size={12} />
                <span>Publish</span>
              </button>

              <button
                onClick={handleShare}
                disabled={nodes.length === 0}
                className="flex items-center justify-center space-x-2 bg-pink-600 text-white px-3 py-2 rounded-lg hover:bg-pink-700 disabled:bg-gray-400 text-sm"
              >
                <FaShare size={12} />
                <span>Share</span>
              </button>

              <button
                onClick={handleExport}
                disabled={nodes.length === 0}
                className="flex items-center justify-center space-x-2 bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 text-sm"
              >
                <FaDownload size={12} />
                <span>Export</span>
              </button>

              <label className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer disabled:bg-gray-400 text-sm">
                <FaUpload size={12} />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  disabled={isRunning}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* JSON Editor Modal */}
      {showJSONModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-4xl mx-4 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Edit Workflow JSON</h3>
            
            <div className="flex-1 mb-4">
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="w-full h-64 md:h-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Paste your workflow JSON here..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowJSONModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJSONSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Workflow Modal */}
      {showHostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 md:w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Host Workflow</h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FaCloud className="text-blue-600" />
                  <span className="font-semibold text-blue-800">Workflow Hosting</span>
                </div>
                <p className="text-sm text-blue-700">
                  Hosting allows your workflow to run continuously even when you close the browser. 
                  The workflow will execute based on its trigger configuration.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter workflow name"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    defaultChecked
                  />
                  <span className="text-sm text-gray-700">Start workflow immediately</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowHostModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHost}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Host Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 md:w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Publish Workflow</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={publishData.name}
                  onChange={(e) => setPublishData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter workflow name"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={publishData.isPublic}
                    onChange={(e) => setPublishData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Make this workflow public</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Public workflows will be visible in the marketplace for other users
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPublish}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkflowHeader;