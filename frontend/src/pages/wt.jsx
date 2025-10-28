// src/pages/WorkflowTab.jsx (Enhanced Version)
import React, { useState, useEffect } from 'react';
import WorkflowBuilder from '../components/WorkflowBuilder';
import NodeSettingsPanel from '../components/NodeSettingsPanel';
import TerminalPanel from '../components/TerminalPanel';
import WorkflowHeader from '../components/WorkflowHeader';
import useWorkflowStore from '../store/workflowStore';
import { aiAPI, workflowAPI, integrationsAPI, workflowGenerationAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import AIProviderSelector from "../components/AIProviderSelector";

const WorkflowTab = () => {
  const {
    showTerminal,
    setShowTerminal,
    generateWorkflowFromAI,
    addTerminalLog,
    clearTerminalLogs,
    clearWorkflow,
    setNodes,
    setEdges,
    setWorkflowName,
    setSelectedNode,
    nodes,
    edges,
    workflowName,
    setIsRunning,
    isRunning,
    updateNodeData,
    addNode,
    removeNode,
    addEdge,
    removeEdge
  } = useWorkflowStore();

  const [searchParams] = useSearchParams();
  const sharedWorkflowId = searchParams.get('shared');
  const [aiProvider, setAiProvider] = useState('huggingface'); // Default to Hugging Face
  const [huggingFaceModel, setHuggingFaceModel] = useState('deepseek-ai/DeepSeek-R1');

  const [prompt, setPrompt] = useState('');
  const [command, setCommand] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [userIntegrations, setUserIntegrations] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);

  // Enhanced workflow generation state
  const [workflowGeneration, setWorkflowGeneration] = useState({
    isGenerating: false,
    integrationSetup: [],
    missingIntegrations: [],
    autoSetupInProgress: false
  });

  const [suggestions] = useState([
    "Monitor Gmail for important emails and send Telegram notifications",
    "Save new Google Sheets rows to MySQL database automatically",
    "Send daily Slack reminders with weather information",
    "Backup Instagram posts to Google Sheets daily",
    "Create YouTube video summaries and email them weekly",
    "Monitor website uptime and alert on Telegram if down",
    "Sync customer data from webhook to Google Sheets",
    "Generate weekly reports from MySQL and post to Slack"
  ]);

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadUserIntegrations();
      loadAvailableModels();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (sharedWorkflowId && isAuthenticated) {
      loadSharedWorkflow(sharedWorkflowId);
    }
  }, [sharedWorkflowId, isAuthenticated]);

  const loadUserIntegrations = async () => {
    try {
      const response = await integrationsAPI.getUserIntegrations();
      setUserIntegrations(response.data.integrations || []);
      addTerminalLog('✅ Integrations loaded successfully');
    } catch (error) {
      console.error('Failed to load integrations:', error);
      addTerminalLog('❌ Failed to load integrations', 'error');
    }
  };

  const loadAvailableModels = async () => {
    try {
      const response = await workflowGenerationAPI.getAvailableModels();
      setAvailableModels(response.data.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
      // Set default models
      setAvailableModels(['deepseek-ai/DeepSeek-R1', 'microsoft/DialoGPT-medium']);
    }
  };

  // ENHANCED WORKFLOW GENERATION WITH HUGGING FACE
  const handleGenerateCompleteWorkflow = async () => {
  if (!prompt.trim()) {
    addTerminalLog('Please enter a prompt to generate workflow', 'error');
    return;
  }

  setWorkflowGeneration(prev => ({ ...prev, isGenerating: true }));
  setIsGenerating(true);
  addTerminalLog(`🚀 Generating complete workflow: "${prompt}"`);
  addTerminalLog(`🔧 Using AI provider: ${aiProvider}`);
  
  if (aiProvider === 'huggingface') {
    addTerminalLog(`🤖 Using model: ${huggingFaceModel}`);
  }

  try {
    let response;
    
    if (aiProvider === 'huggingface') {
      response = await workflowGenerationAPI.generateCompleteWorkflow({
        prompt,
        model: huggingFaceModel
      });
    } else {
      response = await aiAPI.generateWorkflow({
        prompt,
        provider: aiProvider
      });
    }

    const { workflow, modelUsed, enhanced } = response.data;

    if (workflow && workflow.nodes) {
      // ENHANCE: Ensure all nodes have proper parameters
      const enhancedNodes = workflow.nodes.map((node, index) => {
        const position = node.position || { x: index * 300, y: 100 };
        
        // Generate proper node with parameters
        const enhancedNode = generateNodeWithParameters(
          node.data?.service || node.service || 'webhook',
          index + 1,
          position
        );

        // Merge with AI-generated data while preserving parameters
        return {
          ...enhancedNode,
          id: node.id || enhancedNode.id,
          data: {
            ...enhancedNode.data,
            label: node.data?.label || node.label || enhancedNode.data.label,
            description: node.data?.description || node.description || enhancedNode.data.description,
            // Preserve AI-generated parameters if they exist
            parameters: {
              ...enhancedNode.data.parameters,
              ...(node.data?.parameters || node.parameters || {})
            }
          }
        };
      });

      // Create proper edges
      const enhancedEdges = workflow.edges || [];
      for (let i = 0; i < enhancedNodes.length - 1; i++) {
        if (!enhancedEdges.find(edge => edge.source === enhancedNodes[i].id && edge.target === enhancedNodes[i + 1].id)) {
          enhancedEdges.push({
            id: `edge-${i}`,
            source: enhancedNodes[i].id,
            target: enhancedNodes[i + 1].id,
            type: 'smoothstep',
            animated: true
          });
        }
      }

      // Update the workflow
      setNodes(enhancedNodes);
      setEdges(enhancedEdges);
      setWorkflowName(workflow.name || `Generated Workflow - ${new Date().toLocaleTimeString()}`);
      
      addTerminalLog('✅ Enhanced workflow generated successfully!');
      addTerminalLog(`📋 Created ${enhancedNodes.length} nodes and ${enhancedEdges.length} connections`);

      // Show node details
      enhancedNodes.forEach((node, index) => {
        addTerminalLog(`   ${index + 1}. ${node.data.label} (${node.data.service})`);
        if (Object.keys(node.data.parameters).length > 0) {
          addTerminalLog(`      Parameters: ${Object.keys(node.data.parameters).join(', ')}`);
        }
      });

      showPopup('✅ Workflow generated successfully!', 'success');
    } else {
      throw new Error('Invalid workflow structure received');
    }

  } catch (error) {
    console.error('Workflow generation error:', error);
    addTerminalLog(`❌ Workflow generation failed: ${error.message}`, 'error');
    
    // Enhanced fallback with proper parameters
    handleEnhancedRuleBasedWorkflow();
  } finally {
    setWorkflowGeneration(prev => ({ ...prev, isGenerating: false }));
    setIsGenerating(false);
  }
};

  // RULE-BASED FALLBACK
  const handleEnhancedRuleBasedWorkflow = () => {
  addTerminalLog('🔄 Using enhanced rule-based workflow generation...');
  
  try {
    const lowerPrompt = prompt.toLowerCase();
    const nodes = [];
    const edges = [];
    
    // Always start with trigger
    nodes.push(generateNodeWithParameters('trigger', 1, { x: 100, y: 100 }));

    // Detect services from prompt
    let nodeCount = 2;
    
    if (lowerPrompt.includes('telegram') && lowerPrompt.includes('send')) {
      nodes.push(generateNodeWithParameters('telegram-send', nodeCount, { x: 400, y: 100 }));
      nodeCount++;
    }
    
    if (lowerPrompt.includes('telegram') && lowerPrompt.includes('monitor')) {
      nodes.push(generateNodeWithParameters('telegram-monitor', nodeCount, { x: 400, y: 100 }));
      nodeCount++;
    }
    
    if (lowerPrompt.includes('gmail') || lowerPrompt.includes('email')) {
      nodes.push(generateNodeWithParameters('gmail', nodeCount, { x: 400, y: 200 }));
      nodeCount++;
    }
    
    if (lowerPrompt.includes('slack')) {
      nodes.push(generateNodeWithParameters('slack', nodeCount, { x: 400, y: 300 }));
      nodeCount++;
    }
    
    if (lowerPrompt.includes('sheet') || lowerPrompt.includes('spreadsheet')) {
      nodes.push(generateNodeWithParameters('google-sheets', nodeCount, { x: 400, y: 400 }));
      nodeCount++;
    }
    
    if (lowerPrompt.includes('database') || lowerPrompt.includes('mysql')) {
      nodes.push(generateNodeWithParameters('mysql', nodeCount, { x: 400, y: 500 }));
      nodeCount++;
    }
    
    if (lowerPrompt.includes('webhook')) {
      nodes.push(generateNodeWithParameters('webhook', nodeCount, { x: 400, y: 600 }));
      nodeCount++;
    }

    // Create edges
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'smoothstep',
        animated: true
      });
    }

    setNodes(nodes);
    setEdges(edges);
    setWorkflowName(`Rule-based: ${prompt.substring(0, 30)}...`);
    
    addTerminalLog('✅ Rule-based workflow generated successfully!');
    addTerminalLog(`📋 Created ${nodes.length} nodes with proper parameters`);
    
    nodes.forEach((node, index) => {
      addTerminalLog(`   ${index + 1}. ${node.data.label}`);
    });
    
    showPopup('✅ Rule-based workflow generated!', 'success');
  } catch (fallbackError) {
    addTerminalLog('❌ All generation methods failed. Please try a different prompt.', 'error');
    showPopup('❌ Failed to generate workflow', 'error');
  }
};

  // Simple rule-based workflow creator
  const createSimpleWorkflow = (promptText) => {
    const lowerPrompt = promptText.toLowerCase();
    const nodes = [{
      id: 'node-1',
      type: 'custom',
      position: { x: 100, y: 100 },
      data: {
        label: 'Start Workflow',
        service: 'trigger',
        description: 'Manual workflow trigger',
        stepNumber: 1,
        parameters: {},
        parametersConfigured: true
      }
    }];

    let nodeId = 2;

    // Add nodes based on prompt content
    if (lowerPrompt.includes('telegram')) {
      nodes.push({
        id: `node-${nodeId}`,
        type: 'custom',
        position: { x: 400, y: 100 },
        data: {
          label: 'Send Telegram Message',
          service: 'telegram-send',
          description: 'Sends message via Telegram bot',
          stepNumber: nodeId,
          parameters: {
            botToken: '',
            chatId: '',
            message: 'Hello from workflow!'
          },
          parametersConfigured: false
        }
      });
      nodeId++;
    }

    if (lowerPrompt.includes('gmail') || lowerPrompt.includes('email')) {
      nodes.push({
        id: `node-${nodeId}`,
        type: 'custom',
        position: { x: 400, y: 200 },
        data: {
          label: 'Send Email',
          service: 'gmail',
          description: 'Sends email via Gmail',
          stepNumber: nodeId,
          parameters: {
            to: '',
            subject: 'Automated Email',
            body: 'This is an automated email.'
          },
          parametersConfigured: false
        }
      });
      nodeId++;
    }

    // Create edges
    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i + 1}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'smoothstep',
        animated: true
      });
    }

    return { nodes, edges };
  };

  const generateNodeWithParameters = (service, stepNumber, position) => {
  const baseNodes = {
    'trigger': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Start Workflow',
        service: 'trigger',
        description: 'Manual workflow trigger',
        stepNumber,
        parameters: {},
        parametersConfigured: true
      }
    },
    'telegram-send': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Send Telegram Message',
        service: 'telegram-send',
        description: 'Sends message via Telegram bot',
        stepNumber,
        parameters: {
          botToken: '',
          chatId: '',
          message: 'Hello from workflow!'
        },
        parametersConfigured: false
      }
    },
    'telegram-monitor': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Monitor Telegram',
        service: 'telegram-monitor',
        description: 'Listens for Telegram messages',
        stepNumber,
        parameters: {
          botToken: '',
          chatId: '',
          keyword: 'alert'
        },
        parametersConfigured: false
      }
    },
    'gmail': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Send Email',
        service: 'gmail',
        description: 'Sends email via Gmail',
        stepNumber,
        parameters: {
          to: '',
          subject: 'Automated Email',
          body: 'This is an automated email from your workflow.'
        },
        parametersConfigured: false
      }
    },
    'slack': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Post to Slack',
        service: 'slack',
        description: 'Posts message to Slack channel',
        stepNumber,
        parameters: {
          channel: '#general',
          message: 'Hello from workflow!'
        },
        parametersConfigured: false
      }
    },
    'google-sheets': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Save to Google Sheets',
        service: 'google-sheets',
        description: 'Saves data to Google Sheets',
        stepNumber,
        parameters: {
          spreadsheetId: '',
          sheetName: 'Sheet1',
          range: 'A1'
        },
        parametersConfigured: false
      }
    },
    'mysql': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Save to Database',
        service: 'mysql',
        description: 'Saves data to MySQL database',
        stepNumber,
        parameters: {
          host: 'localhost',
          port: 3306,
          database: '',
          username: '',
          password: '',
          query: 'INSERT INTO data VALUES (?)'
        },
        parametersConfigured: false
      }
    },
    'webhook': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Trigger Webhook',
        service: 'webhook',
        description: 'Triggers webhook endpoint',
        stepNumber,
        parameters: {
          url: '',
          method: 'POST',
          headers: '{"Content-Type": "application/json"}',
          body: '{"data": "example"}'
        },
        parametersConfigured: false
      }
    }
  };

  return baseNodes[service] || baseNodes['webhook'];
};

  // AI COMMAND PROCESSOR
  const handleAICommand = async () => {
    if (!command.trim()) {
      addTerminalLog('Please enter a command to modify the workflow', 'error');
      return;
    }

    setIsProcessingCommand(true);
    addTerminalLog(`🤖 Processing command with ${aiProvider}: "${command}"`);

    try {
      const response = await aiAPI.processCommand({
        command: command,
        currentWorkflow: {
          nodes: nodes,
          edges: edges,
          workflowName: workflowName
        },
        provider: aiProvider
      });

      const result = response.data;

      if (result.success) {
        // Apply the modifications
        if (result.modifications.nodes) {
          setNodes(result.modifications.nodes);
        }
        if (result.modifications.edges) {
          setEdges(result.modifications.edges);
        }
        if (result.modifications.workflowName) {
          setWorkflowName(result.modifications.workflowName);
        }

        addTerminalLog('✅ Workflow modified successfully!');
        addTerminalLog(`📝 Changes: ${result.explanation}`);
        showPopup('✅ Command processed successfully!', 'success');

        // Clear command input
        setCommand('');
      } else {
        addTerminalLog(`❌ Failed to process command: ${result.error}`, 'error');
        showPopup('❌ Command failed', 'error');
      }

    } catch (error) {
      console.error('Command processing error:', error);
      addTerminalLog(`❌ Error processing command: ${error.message}`, 'error');
      showPopup('❌ Command processing failed', 'error');
    } finally {
      setIsProcessingCommand(false);
    }
  };

  // Helper function for required parameters
const getRequiredParameters = (service) => {
  const requirements = {
    'telegram-send': ['botToken', 'chatId', 'message'],
    'telegram-monitor': ['botToken', 'chatId', 'keyword'],
    'gmail': ['to', 'subject', 'body'],
    'slack': ['channel', 'message'],
    'google-sheets': ['spreadsheetId', 'sheetName'],
    'mysql': ['host', 'database', 'username', 'password', 'query'],
    'webhook': ['url']
  };
  
  return requirements[service] || [];
};

  // WORKFLOW VALIDATION AND EXECUTION (keep your existing implementation)
  const validateAndExecuteWorkflow = async () => {
  if (nodes.length === 0) {
    addTerminalLog('❌ No workflow to execute. Please generate a workflow first.', 'error');
    return false;
  }

  // Enhanced validation
  const validationErrors = [];
  
  // Check if all nodes have required parameters configured
  nodes.forEach(node => {
    if (node.data.service !== 'trigger' && !node.data.parametersConfigured) {
      validationErrors.push(`Node "${node.data.label}" has unconfigured parameters`);
    }
    
    // Check for empty required parameters
    if (node.data.parameters) {
      const requiredParams = getRequiredParameters(node.data.service);
      requiredParams.forEach(param => {
        if (!node.data.parameters[param] || node.data.parameters[param].toString().trim() === '') {
          validationErrors.push(`Node "${node.data.label}" is missing required parameter: ${param}`);
        }
      });
    }
  });

  // Check integrations
  const integrationErrors = [];
  nodes.forEach(node => {
    if (node.data.service !== 'trigger') {
      const integration = userIntegrations.find(i => i.service === node.data.service);
      if (!integration) {
        integrationErrors.push(`No integration configured for ${node.data.service}`);
      } else if (!integration.isValid) {
        integrationErrors.push(`Integration for ${node.data.service} is not valid`);
      }
    }
  });

  if (validationErrors.length > 0) {
    addTerminalLog('❌ Workflow validation failed:', 'error');
    validationErrors.forEach(error => addTerminalLog(`   • ${error}`, 'error'));
    return false;
  }

  if (integrationErrors.length > 0) {
    addTerminalLog('❌ Integration issues:', 'error');
    integrationErrors.forEach(error => addTerminalLog(`   • ${error}`, 'error'));
    return false;
  }

  addTerminalLog('✅ Workflow validation passed');
  return true;
};

  const handleExecuteWorkflow = async () => {
    const isValid = await validateAndExecuteWorkflow();
    if (!isValid) return;

    try {
      setIsRunning(true);
      addTerminalLog('🚀 Starting workflow execution...');

      // Save workflow first
      const saveResponse = await workflowAPI.saveWorkflow({
        name: workflowName,
        nodes,
        edges
      });

      const workflowId = saveResponse.data.workflow._id;

      // Execute workflow
      const executeResponse = await workflowAPI.executeWorkflow(workflowId);

      addTerminalLog('✅ Workflow execution started successfully!');
      addTerminalLog(`📋 Execution ID: ${executeResponse.data.executionId}`);

      showPopup('✅ Workflow execution started!', 'success');

    } catch (error) {
      console.error('Execution error:', error);
      addTerminalLog(`❌ Failed to execute workflow: ${error.response?.data?.error || error.message}`, 'error');
      showPopup('❌ Failed to execute workflow', 'error');
      setIsRunning(false);
    }
  };

  const handleStopWorkflow = async () => {
    try {
      setIsRunning(false);
      addTerminalLog('🛑 Stopping workflow execution...');
      showPopup('🛑 Workflow execution stopped', 'warning');
    } catch (error) {
      console.error('Stop error:', error);
      addTerminalLog(`❌ Failed to stop workflow: ${error.message}`, 'error');
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

  // Handle suggestion click
  const handleSuggestionClick = async (suggestion) => {
    setPrompt(suggestion);
    // Auto-generate when clicking suggestions
    setTimeout(() => {
      handleGenerateCompleteWorkflow();
    }, 100);
  };

  const loadSharedWorkflow = async (workflowId) => {
    try {
      addTerminalLog(`🔄 Loading shared workflow: ${workflowId}`);
      const response = await workflowAPI.getWorkflow(workflowId);
      const workflow = response.data.workflow;

      if (!workflow || !workflow.nodes) {
        addTerminalLog('❌ Invalid workflow data received', 'error');
        return;
      }

      const isOwner = user && workflow.createdBy && workflow.createdBy._id === user.id;
      let nodesToLoad = [...workflow.nodes];

      if (!isOwner) {
        nodesToLoad = nodesToLoad.map(node => ({
          ...node,
          data: {
            ...node.data,
            parameters: {}, // Clear parameters for security
            parametersConfigured: false
          }
        }));
        addTerminalLog('🔒 Parameters cleared for security');
      } else {
        addTerminalLog('👤 Loading workflow with your saved parameters');
      }

      setNodes(nodesToLoad);
      setEdges(workflow.edges || []);
      setWorkflowName(`${workflow.name} ${isOwner ? '' : '(Shared)'}`);
      setSelectedNode(null);

      addTerminalLog(`✅ Loaded shared workflow: "${workflow.name}"`);
      showPopup('✅ Shared workflow loaded!', 'success');

    } catch (error) {
      console.error('Failed to load shared workflow:', error);
      addTerminalLog(`❌ Error loading shared workflow: ${error.response?.data?.error || error.message}`, 'error');
      showPopup('❌ Failed to load shared workflow', 'error');
    }
  };

  const handleClear = () => {
    clearWorkflow();
    clearTerminalLogs();
    setPrompt('');
    setCommand('');
    setWorkflowGeneration({
      isGenerating: false,
      integrationSetup: [],
      missingIntegrations: [],
      autoSetupInProgress: false
    });
    addTerminalLog('🗑️ Workflow cleared');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <WorkflowHeader
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
        showTerminal={showTerminal}
        onGenerateWorkflow={handleGenerateCompleteWorkflow}
        userIntegrations={userIntegrations}
        validateWorkflow={validateAndExecuteWorkflow}
        onExecuteWorkflow={handleExecuteWorkflow}
        onStopWorkflow={handleStopWorkflow}
        isRunning={isRunning}
      />

      {/* Enhanced Prompt Input Section */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto">

          {/* AI Provider Selection */}
          <div className="flex flex-wrap gap-4 mb-4 items-center">
            <AIProviderSelector
              currentProvider={aiProvider}
              onProviderChange={setAiProvider}
            />

            {aiProvider === 'huggingface' && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Model:</label>
                <select
                  value={huggingFaceModel}
                  onChange={(e) => setHuggingFaceModel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {availableModels.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Generate Workflow Input */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your automation task (e.g., 'Send Telegram alerts when website is down')"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                onKeyPress={(e) => e.key === 'Enter' && handleGenerateCompleteWorkflow()}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateCompleteWorkflow}
                disabled={workflowGeneration.isGenerating || !prompt.trim()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-sm md:text-base"
              >
                {workflowGeneration.isGenerating ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Generating...
                  </>
                ) : (
                  'Generate Workflow'
                )}
              </button>
              <button
                onClick={handleClear}
                className="bg-gray-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold text-sm md:text-base"
              >
                Clear
              </button>
            </div>
          </div>

          {/* AI Command Input */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="AI Command (e.g., 'Add Telegram node', 'Connect step 1 with step 2', 'Update parameters')"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm md:text-base"
                onKeyPress={(e) => e.key === 'Enter' && handleAICommand()}
              />
            </div>
            <button
              onClick={handleAICommand}
              disabled={isProcessingCommand || !command.trim() || nodes.length === 0}
              className="bg-purple-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-sm md:text-base"
            >
              {isProcessingCommand ? 'Processing...' : 'Execute Command'}
            </button>
          </div>

          {/* Command Examples */}
          <div className="mt-3">
            <div className="text-sm text-gray-600 mb-2">Command Examples:</div>
            <div className="flex flex-wrap gap-2">
              {[
                "Add Telegram node",
                "Connect step 1 with step 2",
                "Add message parameter",
                "Remove step 2",
                "Change workflow name to 'Daily Report'"
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setCommand(example)}
                  className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-1 md:px-3 md:py-2 rounded-lg transition-colors border border-purple-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions Section */}
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">Popular automation templates:</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 md:px-3 md:py-2 rounded-lg transition-colors border border-blue-200 break-words max-w-[200px] md:max-w-none"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Integration Status */}
          {userIntegrations.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Connected Services:</div>
              <div className="flex flex-wrap gap-2">
                {userIntegrations.filter(i => i.isValid).map(integration => (
                  <span key={integration._id} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    ✅ {integration.service}
                  </span>
                ))}
                {userIntegrations.filter(i => !i.isValid).map(integration => (
                  <span key={integration._id} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    ⚠️ {integration.service}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* React Flow Area */}
        <div className="flex-1 bg-white min-w-0">
          <div className="w-full h-full min-h-[500px] md:min-h-[600px]">
            <WorkflowBuilder />
          </div>
        </div>

        {/* Node Settings Panel */}
        <div className="w-full md:w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-200 shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">Node Settings</h3>
            <p className="text-sm text-gray-600">Configure your node parameters</p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <NodeSettingsPanel />
          </div>
        </div>
      </div>

      {/* Terminal Panel */}
      {showTerminal && (
        <div className="border-t border-gray-300 bg-gray-900">
          <TerminalPanel />
        </div>
      )}
    </div>
  );
};

export default WorkflowTab;