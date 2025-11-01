// Reusable helper functions for workflow operations
//src/pages/WorkflowTab/utils/workflowHelpers.js
export const showPopup = (message, type = 'info') => {
  // Remove any existing popups
  const existingPopups = document.querySelectorAll('.workflow-popup');
  existingPopups.forEach(popup => popup.remove());

  const popup = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

  popup.className = `workflow-popup fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out font-semibold text-sm md:text-base`;
  popup.textContent = message;
  document.body.appendChild(popup);

  setTimeout(() => {
    if (document.body.contains(popup)) {
      document.body.removeChild(popup);
    }
  }, 4000);
};

export const validateWorkflowStructure = (workflow) => {
  if (!workflow) return { valid: false, error: 'No workflow data' };
  
  const { nodes, edges } = workflow;
  
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { valid: false, error: 'No nodes in workflow' };
  }
  
  if (!Array.isArray(edges)) {
    return { valid: false, error: 'Invalid edges format' };
  }
  
  // Validate node structure
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node.id || !node.type || !node.data || !node.data.label || !node.data.service) {
      return { valid: false, error: `Invalid node structure at index ${i}` };
    }
  }
  
  // Validate edges
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!edge.id || !edge.source || !edge.target) {
      return { valid: false, error: `Invalid edge structure at index ${i}` };
    }
    
    // Check if source and target nodes exist
    const sourceExists = nodes.some(node => node.id === edge.source);
    const targetExists = nodes.some(node => node.id === edge.target);
    
    if (!sourceExists || !targetExists) {
      return { valid: false, error: `Edge ${edge.id} connects to non-existent nodes` };
    }
  }
  
  return { valid: true };
};

export const calculateNodePositions = (nodeCount, startX = 100, startY = 100, xSpacing = 300, ySpacing = 150) => {
  const positions = [];
  
  for (let i = 0; i < nodeCount; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    positions.push({
      x: startX + (col * xSpacing),
      y: startY + (row * ySpacing)
    });
  }
  
  return positions;
};

export const generateWorkflowName = (prompt, maxLength = 50) => {
  const baseName = prompt.length > maxLength ? prompt.substring(0, maxLength) + '...' : prompt;
  return `Workflow: ${baseName}`;
};

export const extractServicesFromPrompt = (prompt) => {
  const lowerPrompt = prompt.toLowerCase();
  const services = [];

  if (lowerPrompt.includes('telegram')) services.push('telegram');
  if (lowerPrompt.includes('gmail') || lowerPrompt.includes('email')) services.push('gmail');
  if (lowerPrompt.includes('slack')) services.push('slack');
  if (lowerPrompt.includes('sheet') || lowerPrompt.includes('spreadsheet')) services.push('google-sheets');
  if (lowerPrompt.includes('database') || lowerPrompt.includes('mysql')) services.push('mysql');
  if (lowerPrompt.includes('webhook')) services.push('webhook');
  if (lowerPrompt.includes('instagram')) services.push('instagram');
  if (lowerPrompt.includes('youtube')) services.push('youtube');

  return services;
};

export const createDefaultWorkflow = (prompt) => {
  return {
    name: generateWorkflowName(prompt),
    description: `Automation workflow for: ${prompt}`,
    nodes: [
      {
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
      }
    ],
    edges: [],
    version: "1.0"
  };
};