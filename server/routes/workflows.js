// server/routes/workflows.js - COMPLETELY FIXED VERSION
import express from 'express';
import Workflow from '../models/Workflow.js';
import ExecutionLog from '../models/ExecutionLog.js';
import { authenticateToken } from '../middleware/auth.js';
import Integration from '../models/Integration.js';
import WorkflowExecutor from '../Services/WorkflowExecutor.js';

const router = express.Router();

// ===== WORKFLOW MANAGEMENT =====

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

// Save workflow
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { id, name, description, nodes, edges, tags, isPublic } = req.body;

    let workflow;
    
    if (id) {
      // Update existing workflow
      workflow = await Workflow.findOneAndUpdate(
        { _id: id, createdBy: req.user._id },
        {
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

// Get workflow by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching workflow with ID:', req.params.id);
    
    const workflow = await Workflow.findById(req.params.id)
      .populate('createdBy', 'name email _id');
    
    if (!workflow) {
      console.log('❌ Workflow not found');
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check if user can access this workflow
    const isOwner = workflow.createdBy && workflow.createdBy._id.toString() === req.user._id.toString();
    const isPublic = workflow.isPublic;

    // Allow access to shared workflows regardless of public/private status
    if (!isOwner && !isPublic) {
      console.log('🔗 Allowing access via shared link to private workflow');
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
    res.json({ 
      workflow: workflowData
    });

  } catch (error) {
    console.error('❌ Get workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Execute workflow - FIXED: No parallel saves
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

    // Execute workflow in background WITHOUT parallel saves
    executeWorkflowWithSafeLogging(workflow, req.user._id, executionLog._id);

    res.json({
      message: 'Workflow execution started',
      executionId: executionLog._id
    });

  } catch (error) {
    console.error('❌ Execute workflow error:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// Delete workflow
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ Deleting workflow:', req.params.id);

    const workflow = await Workflow.findById(req.params.id)
      .populate('createdBy', '_id');

    if (!workflow) {
      console.log('❌ Workflow not found');
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check if user is the owner
    const isOwner = workflow.createdBy && workflow.createdBy._id.toString() === req.user._id.toString();
    
    if (!isOwner) {
      console.log('🚫 User is not the owner');
      return res.status(403).json({ error: 'You are not authorized to delete this workflow' });
    }

    // Delete the workflow
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

// ===== MARKETPLACE =====

// Get public workflows
router.get('/marketplace/public', async (req, res) => {
  try {
    console.log('🛒 Fetching public workflows for marketplace');
    
    const workflows = await Workflow.find({ 
      isPublic: true
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

// Use workflow from marketplace
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

// ===== HOSTED WORKFLOWS =====

// Get hosted workflows - FIXED: Show both active and inactive hosted workflows
router.get('/hosted/workflows', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching hosted workflows for user:', req.user._id);
    
    // Get ALL workflows that have ever been hosted (both active and inactive)
    const workflows = await Workflow.find({
      createdBy: req.user._id,
      $or: [
        { isActive: true },
        { hostedAt: { $exists: true } } // Include workflows that were hosted but are now inactive
      ]
    }).sort({ updatedAt: -1 });

    console.log(`✅ Found ${workflows.length} hosted/inactive workflows`);
    res.json({ workflows });
  } catch (error) {
    console.error('Get hosted workflows error:', error);
    res.status(500).json({ error: 'Failed to fetch hosted workflows' });
  }
});

// Host workflow (start continuous execution)
router.post('/:id/host', authenticateToken, async (req, res) => {
  try {
    const { startImmediately = true } = req.body;
    
    console.log('🚀 Hosting workflow:', req.params.id);
    
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!workflow) {
      console.log('❌ Workflow not found');
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Set workflow as hosted and active - SAVE TO MONGODB
    workflow.isActive = true;
    workflow.hostedAt = new Date();
    await workflow.save();

    console.log('✅ Workflow hosted successfully and saved to MongoDB:', workflow.name);

    // Start continuous execution in background if requested
    if (startImmediately) {
      startContinuousExecution(workflow, req.user._id);
    }

    res.json({
      message: 'Workflow hosted successfully',
      workflowId: workflow._id,
      hostedAt: workflow.hostedAt,
      isExecuting: startImmediately
    });

  } catch (error) {
    console.error('Host workflow error:', error);
    res.status(500).json({ error: 'Failed to host workflow' });
  }
});

// Stop hosted workflow - FIXED: Only deactivate, don't delete
router.post('/hosted/:id/stop', authenticateToken, async (req, res) => {
  try {
    console.log('⏹️ Stopping hosted workflow:', req.params.id);
    
    const workflow = await Workflow.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { 
        isActive: false,
        stoppedAt: new Date()
      },
      { new: true }
    );

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Stop any running execution
    stopContinuousExecution(req.params.id);

    console.log('✅ Hosted workflow stopped (still in database):', workflow.name);
    res.json({ 
      message: 'Workflow stopped successfully',
      workflow: workflow
    });
  } catch (error) {
    console.error('Stop hosted workflow error:', error);
    res.status(500).json({ error: 'Failed to stop workflow' });
  }
});

// ===== EXECUTION LOGS =====

// Get execution logs for user
router.get('/executions/logs', authenticateToken, async (req, res) => {
  try {
    const executions = await ExecutionLog.find({ user: req.user._id })
      .populate('workflow', 'name description')
      .sort({ startedAt: -1 })
      .limit(100);

    console.log(`📊 Found ${executions.length} execution logs for user`);
    
    res.json({ executions });
  } catch (error) {
    console.error('Get executions error:', error);
    res.status(500).json({ error: 'Failed to fetch execution logs' });
  }
});

// Get execution by ID
router.get('/executions/:id', authenticateToken, async (req, res) => {
  try {
    const execution = await ExecutionLog.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('workflow', 'name description nodes');

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({ execution });
  } catch (error) {
    console.error('Get execution error:', error);
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

// ===== SHARED WORKFLOWS =====

// Get shared workflow without authentication
router.get('/shared/:id', async (req, res) => {
  try {
    console.log('🔗 Fetching shared workflow:', req.params.id);
    
    const workflow = await Workflow.findById(req.params.id)
      .populate('createdBy', 'name email _id');

    if (!workflow) {
      console.log('❌ Shared workflow not found');
      return res.status(404).json({ error: 'Workflow not found' });
    }

    console.log('📋 Shared workflow found:', workflow.name);

    // For shared workflows, always clear parameters for security
    const processedNodes = workflow.nodes.map(node => ({
      ...node.toObject ? node.toObject() : node,
      data: {
        ...node.data,
        parameters: {}, // Clear all parameters for security
        parametersConfigured: false
      }
    }));

    const workflowData = {
      _id: workflow._id,
      name: workflow.name,
      description: workflow.description,
      nodes: processedNodes,
      edges: workflow.edges || [],
      createdBy: workflow.createdBy,
      isPublic: workflow.isPublic,
      tags: workflow.tags,
      isShared: true
    };

    console.log('✅ Returning shared workflow with cleared parameters');
    res.json({ 
      workflow: workflowData
    });

  } catch (error) {
    console.error('❌ Get shared workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== HELPER FUNCTIONS =====

// Validate workflow before execution
async function validateWorkflow(workflow, userId) {
  const errors = [];
  
  try {
    const userIntegrations = await Integration.find({ user: userId });
    
    for (const node of workflow.nodes) {
      if (node.data.service === 'trigger') continue;
      
      const nodeValidation = validateNodeParameters(node);
      if (!nodeValidation.valid) {
        errors.push(`Node "${node.data.label}": ${nodeValidation.error}`);
        continue;
      }
      
      if (requiresIntegration(node.data.service)) {
        const integration = userIntegrations.find(i => i.service === node.data.service);
        if (!integration) {
          errors.push(`Node "${node.data.label}": ${node.data.service} integration not configured`);
        } else if (!integration.isValid) {
          errors.push(`Node "${node.data.label}": ${node.data.service} integration is invalid`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Validation error:', error);
    errors.push('Failed to validate integrations');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

function validateNodeParameters(node) {
  if (node.data.service === 'trigger') return { valid: true };
  
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

function getRequiredParameters(service) {
  const requirements = {
    'telegram': ['botToken', 'chatId', 'message'],
    'gmail': ['to', 'subject', 'body'],
    'slack': ['channel', 'message'],
    'google-sheets': ['spreadsheetId', 'range'],
    'mysql': ['query'],
    'webhook': ['url'],
    'trigger': []
  };
  
  return requirements[service] || [];
}

function requiresIntegration(service) {
  const integrationServices = [
    'gmail', 'telegram', 'slack', 'google-sheets', 'mysql', 'webhook'
  ];
  return integrationServices.includes(service);
}

// ===== SAFE EXECUTION SYSTEM (NO PARALLEL SAVES) =====
const activeExecutions = new Map();

// Execute workflow with SAFE logging (no parallel saves)
async function executeWorkflowWithSafeLogging(workflow, userId, executionLogId) {
  const executionLog = await ExecutionLog.findById(executionLogId);
  let logsBuffer = [];
  
  // Function to safely add logs without parallel saves
  const safeAddLog = async (level, message, nodeId = null) => {
    const logEntry = {
      level,
      message,
      timestamp: new Date(),
      ...(nodeId && { nodeId })
    };
    
    logsBuffer.push(logEntry);
    
    // Save logs in batches of 10 or if it's an error
    if (logsBuffer.length >= 10 || level === 'error') {
      try {
        // Use findOneAndUpdate to avoid parallel save issues
        await ExecutionLog.findOneAndUpdate(
          { _id: executionLogId },
          { $push: { logs: { $each: logsBuffer } } }
        );
        logsBuffer = []; // Clear buffer after successful save
      } catch (error) {
        console.error('Error saving logs:', error);
      }
    }
  };

  try {
    // Initial logs
    await safeAddLog('info', `Starting execution of workflow: ${workflow.name}`);
    await safeAddLog('info', `Workflow has ${workflow.nodes.length} nodes`);

    // Get user integrations
    const userIntegrations = await Integration.find({ user: userId });
    
    // Execute workflow
    const result = await WorkflowExecutor.executeWorkflowWithLoops(
      workflow.nodes,
      workflow.edges,
      userIntegrations,
      async (nodeId, status) => {
        const node = workflow.nodes.find(n => n.id === nodeId);
        await safeAddLog('info', `Node "${node?.data?.label || nodeId}" status: ${status}`, nodeId);
      },
      async (message, type = 'info') => {
        await safeAddLog(type, message);
      }
    );

    // Save any remaining logs in buffer
    if (logsBuffer.length > 0) {
      await ExecutionLog.findOneAndUpdate(
        { _id: executionLogId },
        { $push: { logs: { $each: logsBuffer } } }
      );
    }

    // Update execution status
    if (result.success) {
      await ExecutionLog.findOneAndUpdate(
        { _id: executionLogId },
        { 
          status: 'success',
          $push: { 
            logs: {
              level: 'success',
              message: 'Workflow execution completed successfully',
              timestamp: new Date()
            }
          }
        }
      );
    } else {
      await ExecutionLog.findOneAndUpdate(
        { _id: executionLogId },
        { 
          status: 'error',
          $push: { 
            logs: {
              level: 'error',
              message: `Workflow execution failed: ${result.error}`,
              timestamp: new Date()
            }
          }
        }
      );
    }

  } catch (error) {
    console.error('Execution error:', error);
    
    // Final error log
    await ExecutionLog.findOneAndUpdate(
      { _id: executionLogId },
      { 
        status: 'error',
        $push: { 
          logs: {
            level: 'error',
            message: `Workflow execution error: ${error.message}`,
            timestamp: new Date()
          }
        }
      }
    );
  } finally {
    // Final update with completion time
    await ExecutionLog.findOneAndUpdate(
      { _id: executionLogId },
      {
        completedAt: new Date(),
        $set: {
          duration: new Date() - executionLog.startedAt
        }
      }
    );
    
    // Update workflow stats
    await Workflow.findOneAndUpdate(
      { _id: workflow._id },
      {
        $inc: { executionCount: 1 },
        lastExecuted: new Date()
      }
    );
  }
}

// Start continuous execution for hosted workflow
async function startContinuousExecution(workflow, userId) {
  const executionId = workflow._id.toString();
  
  // Stop existing execution if running
  if (activeExecutions.has(executionId)) {
    stopContinuousExecution(executionId);
  }

  console.log(`🔄 Starting continuous execution for workflow: ${workflow.name}`);
  
  const executionInterval = setInterval(async () => {
    try {
      // Check if workflow is still active in MongoDB
      const currentWorkflow = await Workflow.findById(workflow._id);
      if (!currentWorkflow || !currentWorkflow.isActive) {
        console.log(`🛑 Stopping execution - workflow no longer active: ${workflow.name}`);
        stopContinuousExecution(executionId);
        return;
      }

      console.log(`🏃 Executing hosted workflow: ${workflow.name}`);
      
      // Create execution log for this iteration
      const executionLog = new ExecutionLog({
        workflow: workflow._id,
        user: userId,
        status: 'running',
        startedAt: new Date(),
        logs: [{
          level: 'info',
          message: 'Continuous execution iteration started',
          timestamp: new Date()
        }]
      });

      await executionLog.save();

      // Execute workflow with safe logging
      await executeWorkflowWithSafeLogging(workflow, userId, executionLog._id);

    } catch (error) {
      console.error(`❌ Continuous execution error for ${workflow.name}:`, error);
    }
  }, 30000); // Execute every 30 seconds

  // Store the interval for this execution
  activeExecutions.set(executionId, {
    interval: executionInterval,
    workflowId: workflow._id,
    startedAt: new Date(),
    workflowName: workflow.name
  });

  console.log(`✅ Continuous execution started for: ${workflow.name}`);
}

// Stop continuous execution
function stopContinuousExecution(executionId) {
  if (activeExecutions.has(executionId)) {
    const execution = activeExecutions.get(executionId);
    clearInterval(execution.interval);
    activeExecutions.delete(executionId);
    console.log(`🛑 Stopped continuous execution: ${executionId}`);
  }
}

export default router;