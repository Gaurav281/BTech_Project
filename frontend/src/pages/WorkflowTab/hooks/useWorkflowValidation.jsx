import { useCallback } from 'react';
import useWorkflowStore from '../../../store/workflowStore';
import { getRequiredParameters } from '../utils/nodeTemplates';
import { showPopup } from '../utils/workflowHelpers';

export const useWorkflowValidation = () => {
  const {
    nodes,
    edges,
    addTerminalLog
  } = useWorkflowStore();

  const validateAndExecuteWorkflow = useCallback(async (userIntegrations = []) => {
    if (nodes.length === 0) {
      addTerminalLog('❌ No workflow to execute. Please generate a workflow first.', 'error');
      return false;
    }

    // Enhanced validation
    const validationErrors = [];
    const integrationErrors = [];
    
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

      // Check integrations
      if (node.data.service !== 'trigger') {
        const integration = userIntegrations.find(i => i.service === node.data.service);
        if (!integration) {
          integrationErrors.push(`No integration configured for ${node.data.service}`);
        } else if (!integration.isValid) {
          integrationErrors.push(`Integration for ${node.data.service} is not valid`);
        }
      }
    });

    // Check if workflow has proper connections
    if (edges.length === 0 && nodes.length > 1) {
      validationErrors.push('Workflow nodes are not connected');
    }

    // Check for orphaned nodes
    const connectedNodes = new Set();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && nodes.length > 1) {
        validationErrors.push(`Node "${node.data.label}" is not connected to the workflow`);
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
  }, [nodes, edges, addTerminalLog]);

  const validateNodeParameters = useCallback((node) => {
    if (node.data.service === 'trigger') {
      return { valid: true };
    }
    
    const requiredParams = getRequiredParameters(node.data.service);
    const missingParams = [];
    
    requiredParams.forEach(param => {
      if (!node.data.parameters || !node.data.parameters[param] || node.data.parameters[param].toString().trim() === '') {
        missingParams.push(param);
      }
    });

    if (missingParams.length > 0) {
      return {
        valid: false,
        errors: [`Missing required parameters: ${missingParams.join(', ')}`]
      };
    }

    return { valid: true };
  }, []);

  return {
    validateAndExecuteWorkflow,
    validateNodeParameters
  };
};