import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import useWorkflowStore from '../../../store/workflowStore';
import { workflowGenerationAPI, aiAPI, integrationsAPI } from '../../../api/api';
import { generateNodeWithParameters } from '../utils/nodeTemplates';
import { showPopup } from '../utils/workflowHelpers';

export const useWorkflowGeneration = () => {
  const [aiProvider, setAiProvider] = useState('huggingface');
  const [huggingFaceModel, setHuggingFaceModel] = useState('deepseek-ai/DeepSeek-R1');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [userIntegrations, setUserIntegrations] = useState([]);

  const { isAuthenticated } = useAuth();
  const { 
    setNodes, 
    setEdges, 
    setWorkflowName, 
    addTerminalLog,
    clearWorkflow
  } = useWorkflowStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUserIntegrations();
      loadAvailableModels();
    }
  }, [isAuthenticated]);

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
      setAvailableModels(['deepseek-ai/DeepSeek-R1', 'microsoft/DialoGPT-medium']);
    }
  };

  const handleGenerateCompleteWorkflow = useCallback(async () => {
    if (!prompt.trim()) {
      addTerminalLog('Please enter a prompt to generate workflow', 'error');
      return;
    }

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

      const result = response.data;

      if (result.success && result.workflow) {
        // Clear existing workflow first
        clearWorkflow();
        
        // Process and set the new workflow
        const processedWorkflow = processAIWorkflow(result.workflow, userIntegrations);
        
        setNodes(processedWorkflow.nodes);
        setEdges(processedWorkflow.edges);
        setWorkflowName(result.workflow.name || `Generated: ${prompt.substring(0, 30)}...`);
        
        addTerminalLog('✅ Workflow generated successfully!');
        addTerminalLog(`📋 Created ${processedWorkflow.nodes.length} nodes and ${processedWorkflow.edges.length} connections`);

        // Show node details
        processedWorkflow.nodes.forEach((node, index) => {
          addTerminalLog(`   ${index + 1}. ${node.data.label} (${node.data.service})`);
          if (Object.keys(node.data.parameters).length > 0) {
            addTerminalLog(`      Parameters: ${Object.keys(node.data.parameters).join(', ')}`);
          }
        });

        showPopup('✅ Workflow generated successfully!', 'success');
        
        // Clear prompt after successful generation
        setPrompt('');
      } else {
        throw new Error('Invalid workflow structure received');
      }

    } catch (error) {
      console.error('Workflow generation error:', error);
      addTerminalLog(`❌ Workflow generation failed: ${error.message}`, 'error');
      
      // Enhanced fallback with proper parameters
      handleEnhancedRuleBasedWorkflow();
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, aiProvider, huggingFaceModel, userIntegrations, setNodes, setEdges, setWorkflowName, addTerminalLog, clearWorkflow]);

  const handleEnhancedRuleBasedWorkflow = useCallback(() => {
    addTerminalLog('🔄 Using enhanced rule-based workflow generation...');
    
    try {
      const lowerPrompt = prompt.toLowerCase();
      const nodes = [];
      const edges = [];
      
      // Smart trigger detection - only add if needed
      const needsTrigger = !lowerPrompt.includes('send') && 
                          !lowerPrompt.includes('post') && 
                          !lowerPrompt.includes('execute');

      if (needsTrigger) {
        nodes.push(generateNodeWithParameters('trigger', 1, { x: 100, y: 100 }));
      }

      // Detect services from prompt
      let nodeCount = needsTrigger ? 2 : 1;
      const detectedServices = detectServicesFromPrompt(lowerPrompt, userIntegrations);
      
      detectedServices.forEach((service, index) => {
        const integration = userIntegrations.find(i => i.service === service);
        const node = generateNodeWithParameters(service, nodeCount, { x: 400, y: 100 + (index * 100) });
        
        // Auto-fill integration parameters if available
        if (integration && integration.isValid) {
          node.data.parameters = {
            ...node.data.parameters,
            ...getIntegrationParameters(service, integration.config)
          };
          node.data.parametersConfigured = true;
        }
        
        nodes.push(node);
        nodeCount++;
      });

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
  }, [prompt, userIntegrations, setNodes, setEdges, setWorkflowName, addTerminalLog]);

  return {
    aiProvider,
    setAiProvider,
    huggingFaceModel,
    setHuggingFaceModel,
    prompt,
    setPrompt,
    isGenerating,
    availableModels,
    userIntegrations,
    handleGenerateCompleteWorkflow,
    handleEnhancedRuleBasedWorkflow
  };
};

// Helper function to process AI workflow response
const processAIWorkflow = (workflow, userIntegrations) => {
  const enhancedNodes = workflow.nodes.map((node, index) => {
    const position = node.position || { x: index * 300, y: 100 };
    const service = node.data?.service || node.service || 'webhook';
    
    // Generate proper node with parameters
    const enhancedNode = generateNodeWithParameters(service, index + 1, position);

    // Check if integration exists and is valid
    const integration = userIntegrations.find(i => i.service === service);
    const hasValidIntegration = integration && integration.isValid;

    // Merge with AI-generated data while preserving parameters
    return {
      ...enhancedNode,
      id: node.id || enhancedNode.id,
      data: {
        ...enhancedNode.data,
        label: node.data?.label || node.label || enhancedNode.data.label,
        description: node.data?.description || node.description || enhancedNode.data.description,
        parameters: {
          ...enhancedNode.data.parameters,
          ...(node.data?.parameters || node.parameters || {}),
          // Auto-fill integration parameters if available
          ...(hasValidIntegration ? getIntegrationParameters(service, integration.config) : {})
        },
        parametersConfigured: hasValidIntegration || Object.keys(enhancedNode.data.parameters).length > 0,
        integrationStatus: {
          configured: !!integration,
          valid: integration?.isValid || false
        }
      }
    };
  });

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

  return { nodes: enhancedNodes, edges: enhancedEdges };
};

// Detect services from prompt considering available integrations
const detectServicesFromPrompt = (prompt, userIntegrations) => {
  const services = [];
  const availableServices = userIntegrations.map(i => i.service);
  
  // Service detection logic
  if (prompt.includes('telegram') && prompt.includes('send')) {
    services.push('telegram');
  }
  if ((prompt.includes('gmail') || prompt.includes('email'))) {
    services.push('gmail');
  }
  if (prompt.includes('slack')) {
    services.push('slack');
  }
  if ((prompt.includes('sheet') || prompt.includes('spreadsheet'))) {
    services.push('google-sheets');
  }
  if ((prompt.includes('database') || prompt.includes('mysql'))) {
    services.push('mysql');
  }
  if (prompt.includes('webhook')) {
    services.push('webhook');
  }

  // Default to webhook if no specific services detected
  if (services.length === 0) {
    services.push('webhook');
  }

  return services;
};

// Get integration parameters from config
const getIntegrationParameters = (service, config) => {
  const parameterMapping = {
    'telegram': {
      botToken: config.botToken,
      chatId: config.chatId
    },
    'slack': {
      webhookUrl: config.webhookUrl
    },
    'mysql': {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username
    }
  };

  return parameterMapping[service] || {};
};