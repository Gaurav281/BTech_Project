import Integration from '../models/Integration.js';

export class WorkflowValidator {
  static async validateWorkflowExecution(workflow, userId) {
    const errors = [];
    const warnings = [];

    try {
      // Get user integrations
      const userIntegrations = await Integration.find({ user: userId });
      
      // Validate each node
      for (const node of workflow.nodes) {
        if (node.data.service === 'trigger') continue;
        
        // Check integration exists and is valid
        const integration = userIntegrations.find(i => i.service === node.data.service);
        if (!integration) {
          errors.push(`Integration not configured for ${node.data.service}`);
          continue;
        }
        
        if (!integration.isValid) {
          errors.push(`Integration ${node.data.service} is not valid`);
          continue;
        }
        
        // Check required parameters
        const requiredParams = this.getRequiredParameters(node.data.service);
        const missingParams = requiredParams.filter(param => 
          !node.data.parameters[param] || node.data.parameters[param].toString().trim() === ''
        );
        
        if (missingParams.length > 0) {
          errors.push(`Node "${node.data.label}" missing parameters: ${missingParams.join(', ')}`);
        }
        
        // Check parameter validity
        const paramWarnings = this.validateParameters(node.data.parameters, node.data.service);
        warnings.push(...paramWarnings);
      }
      
      // Validate workflow structure
      if (workflow.nodes.length === 0) {
        errors.push('Workflow has no nodes');
      }
      
      if (workflow.edges.length === 0 && workflow.nodes.length > 1) {
        errors.push('Workflow nodes are not connected');
      }
      
      // Check for orphaned nodes
      const connectedNodes = new Set();
      workflow.edges.forEach(edge => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      });
      
      workflow.nodes.forEach(node => {
        if (!connectedNodes.has(node.id) && workflow.nodes.length > 1) {
          errors.push(`Node "${node.data.label}" is not connected to workflow`);
        }
      });

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  static getRequiredParameters(service) {
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
  }
  
  static validateParameters(parameters, service) {
    const warnings = [];
    
    // Check for placeholder values
    Object.entries(parameters).forEach(([key, value]) => {
      if (typeof value === 'string' && value.includes('YOUR_')) {
        warnings.push(`Parameter "${key}" contains placeholder value`);
      }
      
      if (typeof value === 'string' && value.trim() === '') {
        warnings.push(`Parameter "${key}" is empty`);
      }
    });
    
    // Service-specific validations
    if (service === 'webhook' && parameters.url) {
      try {
        new URL(parameters.url);
      } catch (e) {
        warnings.push('Webhook URL appears to be invalid');
      }
    }
    
    if (service === 'gmail' && parameters.to) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parameters.to)) {
        warnings.push('Email address appears to be invalid');
      }
    }
    
    return warnings;
  }
}

export default WorkflowValidator;