// server/routes/workflows.js
import express from 'express';
import Workflow from '../models/Workflow.js';
import ExecutionLog from '../models/ExecutionLog.js';
import { authenticateToken } from '../middleware/auth.js';
import Integration from '../models/Integration.js';
import WorkflowExecutor from '../services/WorkflowExecutor.js';

const router = express.Router();

// Get all workflows for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const workflows = await Workflow.find({ createdBy: req.user._id })
      .sort({ updatedAt: -1 });
    
    res.json({ workflows });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// SINGLE UNIFIED GET WORKFLOW BY ID ROUTE - FIXED FOR ALL USE CASES
// In the save workflow route, ensure parameters are saved
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { id, name, description, nodes, edges, tags, isPublic } = req.body;

    let workflow;
    
    if (id) {
      // Update existing workflow - PRESERVE ALL PARAMETERS
      workflow = await Workflow.findOneAndUpdate(
        { _id: id, createdBy: req.user._id },
        {
          name,
          description,
          nodes: nodes.map(node => ({
            ...node,
            // Ensure parameters are preserved
            data: {
              ...node.data,
              parameters: node.data.parameters || {},
              parametersConfigured: !!node.data.parameters && Object.keys(node.data.parameters).length > 0
            }
          })),
          edges,
          tags: tags || [],
          isPublic: isPublic || false,
          version: { $inc: 1 }
        },
        { new: true }
      );
    } else {
      // Create new workflow
      workflow = new Workflow({
        name,
        description,
        nodes: nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            parameters: node.data.parameters || {},
            parametersConfigured: !!node.data.parameters && Object.keys(node.data.parameters).length > 0
          }
        })),
        edges,
        tags: tags || [],
        isPublic: isPublic || false,
        createdBy: req.user._id
      });
      await workflow.save();
    }

    res.json({
      message: 'Workflow saved successfully',
      workflow
    });
  } catch (error) {
    console.error('Save workflow error:', error);
    res.status(500).json({ error: 'Failed to save workflow' });
  }
});

// Enhanced get workflow to handle shared workflows properly
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching workflow with ID:', req.params.id);
    console.log('👤 User ID:', req.user._id);
    
    const workflow = await Workflow.findById(req.params.id)
      .populate('createdBy', 'name email _id');
    
    if (!workflow) {
      console.log('❌ Workflow not found');
      return res.status(404).json({ error: 'Workflow not found' });
    }

    console.log('📋 Workflow found:', {
      name: workflow.name,
      createdBy: workflow.createdBy?._id,
      isPublic: workflow.isPublic
    });

    // Check if user can access this workflow
    const isOwner = workflow.createdBy && workflow.createdBy._id.toString() === req.user._id.toString();
    const isPublic = workflow.isPublic;

    console.log('🔐 Access check:', { isOwner, isPublic });

    // ALLOW ACCESS TO SHARED WORKFLOWS REGARDLESS OF PUBLIC/PRIVATE STATUS
    // This enables shared links to work for both public and private workflows
    if (!isOwner && !isPublic) {
      console.log('🔗 Allowing access via shared link to private workflow');
      // Don't return error - allow access via shared link
    }

    // Process nodes based on ownership
    let processedNodes = workflow.nodes;
    if (!isOwner) {
      // For non-owners: Clear parameters but keep node structure
      processedNodes = workflow.nodes.map(node => ({
        ...node.toObject ? node.toObject() : node,
        data: {
          ...node.data,
          parameters: {}, // Clear parameters for security
          parametersConfigured: false
        }
      }));
    }

    // Return the workflow with processed nodes
    const workflowData = {
      _id: workflow._id,
      name: workflow.name,
      description: workflow.description,
      nodes: processedNodes,
      edges: workflow.edges || [],
      createdBy: workflow.createdBy,
      isPublic: workflow.isPublic,
      tags: workflow.tags,
      executionCount: workflow.executionCount,
      downloadCount: workflow.downloadCount,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    };

    console.log('✅ Returning workflow with nodes:', workflowData.nodes?.length);
    console.log('✅ Owner access:', isOwner);

    res.json({ 
      workflow: workflowData
    });

  } catch (error) {
    console.error('❌ Get workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Publish workflow
router.post('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const { isPublic } = req.body;
    
    const workflow = await Workflow.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { isPublic },
      { new: true }
    );

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({
      message: `Workflow ${isPublic ? 'published' : 'unpublished'} successfully`,
      workflow
    });
  } catch (error) {
    console.error('Publish workflow error:', error);
    res.status(500).json({ error: 'Failed to publish workflow' });
  }
});

// Execute workflow
router.post('/:id/execute', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 Executing workflow:', req.params.id);
    console.log('👤 User ID:', req.user._id);

    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!workflow) {
      console.log('❌ Workflow not found');
      return res.status(404).json({ error: 'Workflow not found' });
    }

    console.log('🔍 Workflow found:', workflow.name);
    console.log('📋 Nodes count:', workflow.nodes.length);

    // Validate workflow before execution
    console.log('🔧 Validating workflow...');
    const validationResult = await validateWorkflow(workflow, req.user._id);
    
    console.log('📊 Validation result:', {
      valid: validationResult.valid,
      errors: validationResult.errors
    });
    
    if (!validationResult.valid) {
      return res.status(400).json({ 
        error: 'Workflow validation failed',
        details: validationResult.errors 
      });
    }

    // Create execution log
    const executionLog = new ExecutionLog({
      workflow: workflow._id,
      user: req.user._id,
      status: 'running',
      startedAt: new Date(),
      logs: [{
        level: 'info',
        message: 'Workflow execution started',
        timestamp: new Date()
      }]
    });

    await executionLog.save();

    // Execute workflow in background
    executeWorkflowInBackground(workflow, req.user._id, executionLog._id);

    res.json({
      message: 'Workflow execution started',
      executionId: executionLog._id
    });

  } catch (error) {
    console.error('❌ Execute workflow error:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// Validate workflow before execution
// In the validateWorkflow function, add better integration checking
async function validateWorkflow(workflow, userId) {
  const errors = [];
  
  try {
    // Get user integrations
    const userIntegrations = await Integration.find({ user: userId });
    console.log('🔍 User integrations:', userIntegrations.map(i => ({ service: i.service, valid: i.isValid })));
    
    for (const node of workflow.nodes) {
      // Skip validation for trigger nodes
      if (node.data.service === 'trigger') {
        continue;
      }
      
      // Enhanced node validation
      const nodeValidation = validateNodeParameters(node);
      if (!nodeValidation.valid) {
        errors.push(`Node "${node.data.label}": ${nodeValidation.error}`);
        continue;
      }
      
      // Enhanced integration validation
      if (requiresIntegration(node.data.service)) {
        const integration = userIntegrations.find(i => i.service === node.data.service);
        if (!integration) {
          errors.push(`Node "${node.data.label}": ${node.data.service} integration not configured`);
        } else if (!integration.isValid) {
          errors.push(`Node "${node.data.label}": ${node.data.service} integration is invalid - ${integration.lastError || 'Please test the integration'}`);
        } else if (!areIntegrationParametersValid(node.data.parameters, integration)) {
          errors.push(`Node "${node.data.label}": Integration parameters don't match configuration`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Validation error:', error);
    errors.push('Failed to validate integrations');
  }
  
  console.log('📊 Validation result:', { valid: errors.length === 0, errors });
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Add this helper function
function areIntegrationParametersValid(nodeParameters, integration) {
  // Check if node parameters match integration configuration
  if (integration.service === 'telegram-send' || integration.service === 'telegram-monitor') {
    return nodeParameters.botToken === integration.config.botToken && 
           nodeParameters.chatId === integration.config.chatId;
  }
  
  if (integration.service === 'slack') {
    return nodeParameters.webhookUrl === integration.config.webhookUrl;
  }
  
  if (integration.service === 'mysql') {
    return nodeParameters.host === integration.config.host &&
           nodeParameters.database === integration.config.database;
  }
  
  return true; // For services where parameter matching isn't critical
}

// Enhanced node parameter validation
function validateNodeParameters(node) {
  // Skip trigger nodes
  if (node.data.service === 'trigger') {
    return { valid: true };
  }
  
  const requiredParams = getRequiredParameters(node.data.service);
  
  for (const param of requiredParams) {
    if (!node.data.parameters || node.data.parameters[param] === undefined || node.data.parameters[param] === '') {
      return {
        valid: false,
        error: `Missing required parameter: ${param}`
      };
    }
  }
  
  return { valid: true };
}

// Enhanced required parameters
function getRequiredParameters(service) {
  const requirements = {
    'telegram': ['message'],
    'gmail': ['to', 'subject', 'body'],
    'slack': ['channel', 'message'],
    'google-sheets': ['spreadsheetId', 'range'],
    'mysql': ['query'],
    'webhook': ['url'],
    'trigger': [] // No parameters needed for trigger
  };
  
  return requirements[service] || [];
}

function requiresIntegration(service) {
  const integrationServices = [
    'gmail', 'telegram', 'slack', 'google-sheets', 'mysql', 'webhook',
    'arduino', 'raspberry-pi', 'smart-switch', 'sensor-hub' 
  ];
  return integrationServices.includes(service);
}

// Background execution
async function executeWorkflowInBackground(workflow, userId, executionId) {
  try {
    const userIntegrations = await Integration.find({ user: userId });
    const executionLog = await ExecutionLog.findById(executionId);
    
    // Update execution log
    executionLog.logs.push({
      level: 'info',
      message: 'Starting workflow execution...',
      timestamp: new Date()
    });
    await executionLog.save();
    
    // Execute each node using WorkflowExecutor
    for (const node of workflow.nodes) {
      try {
        executionLog.logs.push({
          level: 'info',
          message: `Executing node: ${node.data.label}`,
          timestamp: new Date(),
          nodeId: node.id
        });
        await executionLog.save();
        
        const integration = userIntegrations.find(i => i.service === node.data.service);
        
        // USE WORKFLOW EXECUTOR INSTEAD OF DIRECT FUNCTION CALLS
        const result = await WorkflowExecutor.executeNode(node, integration?.config || {});
        
        executionLog.logs.push({
          level: 'info',
          message: `Node ${node.data.label} executed successfully`,
          timestamp: new Date(),
          nodeId: node.id
        });
        
      } catch (error) {
        executionLog.logs.push({
          level: 'error',
          message: `Node ${node.data.label} failed: ${error.message}`,
          timestamp: new Date(),
          nodeId: node.id
        });
        throw error; // Stop execution on first error
      }
    }
    
    // Mark as completed
    executionLog.status = 'success';
    executionLog.completedAt = new Date();
    executionLog.duration = executionLog.completedAt - executionLog.startedAt;
    await executionLog.save();
    
    // Update workflow stats
    await Workflow.findByIdAndUpdate(workflow._id, {
      $inc: { executionCount: 1 },
      lastExecuted: new Date()
    });
    
  } catch (error) {
    const executionLog = await ExecutionLog.findById(executionId);
    executionLog.status = 'error';
    executionLog.completedAt = new Date();
    executionLog.duration = executionLog.completedAt - executionLog.startedAt;
    executionLog.logs.push({
      level: 'error',
      message: `Workflow execution failed: ${error.message}`,
      timestamp: new Date()
    });
    await executionLog.save();
  }
}

// Get execution logs for user
router.get('/executions/logs', authenticateToken, async (req, res) => {
  try {
    const executions = await ExecutionLog.find({ user: req.user._id })
      .populate('workflow', 'name')
      .sort({ startedAt: -1 })
      .limit(50);

    res.json({ executions });
  } catch (error) {
    console.error('Get executions error:', error);
    res.status(500).json({ error: 'Failed to fetch execution logs' });
  }
});

// Delete workflow - FIXED TO COMPLETELY DELETE
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ Deleting workflow:', req.params.id);
    console.log('👤 User ID:', req.user._id);

    const workflow = await Workflow.findById(req.params.id)
      .populate('createdBy', '_id');

    if (!workflow) {
      console.log('❌ Workflow not found');
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check if user is the owner
    const isOwner = workflow.createdBy && workflow.createdBy._id.toString() === req.user._id.toString();
    
    console.log('🔍 Ownership check:', {
      workflowOwner: workflow.createdBy?._id,
      currentUser: req.user._id,
      isOwner: isOwner
    });

    if (!isOwner) {
      console.log('🚫 User is not the owner');
      return res.status(403).json({ error: 'You are not authorized to delete this workflow' });
    }

    // COMPLETELY DELETE THE WORKFLOW (both public and private)
    await Workflow.findByIdAndDelete(req.params.id);
    
    // Also delete associated execution logs
    await ExecutionLog.deleteMany({ workflow: req.params.id });

    console.log('✅ Workflow deleted completely from database');
    res.json({ message: 'Workflow deleted successfully' });

  } catch (error) {
    console.error('❌ Delete workflow error:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// Get public workflows (marketplace) - FIXED TO SHOW ALL PUBLIC WORKFLOWS
router.get('/marketplace/public', async (req, res) => {
  try {
    console.log('🛒 Fetching public workflows for marketplace');
    
    const workflows = await Workflow.find({ 
      isPublic: true
      // No isActive filter - show all public workflows
    })
      .populate('createdBy', 'name email _id')
      .sort({ createdAt: -1 })
      .limit(50);

    console.log(`📊 Found ${workflows.length} public workflows`);
    
    res.json({ workflows });
  } catch (error) {
    console.error('❌ Get public workflows error:', error);
    res.status(500).json({ error: 'Failed to fetch public workflows' });
  }
});

// Download workflow from marketplace
router.post('/marketplace/:id/download', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findOne({ 
      _id: req.params.id, 
      isPublic: true 
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found in marketplace' });
    }

    // Increment download count
    workflow.downloadCount = (workflow.downloadCount || 0) + 1;
    await workflow.save();

    res.json({
      message: 'Workflow download counted',
      downloadCount: workflow.downloadCount
    });

  } catch (error) {
    console.error('Download count error:', error);
    res.status(500).json({ error: 'Failed to count download' });
  }
});

// Add download count endpoint
router.post('/:id/download', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Increment download count
    workflow.downloadCount = (workflow.downloadCount || 0) + 1;
    await workflow.save();

    res.json({ 
      message: 'Download counted successfully',
      downloadCount: workflow.downloadCount 
    });
  } catch (error) {
    console.error('Download count error:', error);
    res.status(500).json({ error: 'Failed to count download' });
  }
});

// Use workflow from marketplace - FIXED TO CLEAR PARAMETERS
router.post('/marketplace/:id/use', authenticateToken, async (req, res) => {
  try {
    const originalWorkflow = await Workflow.findOne({ 
      _id: req.params.id, 
      isPublic: true 
    });

    if (!originalWorkflow) {
      return res.status(404).json({ error: 'Workflow not found in marketplace' });
    }

    // Create a copy for the user with cleared parameters for security
    const newWorkflow = new Workflow({
      name: `${originalWorkflow.name} (Copy)`,
      description: originalWorkflow.description,
      nodes: originalWorkflow.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          parameters: {}, // Clear parameters for security
          parametersConfigured: false
        }
      })),
      edges: originalWorkflow.edges,
      tags: originalWorkflow.tags,
      isPublic: false,
      createdBy: req.user._id
    });

    await newWorkflow.save();

    res.json({
      message: 'Workflow imported successfully',
      workflow: newWorkflow
    });
  } catch (error) {
    console.error('Use workflow error:', error);
    res.status(500).json({ error: 'Failed to import workflow' });
  }
});

export default router;