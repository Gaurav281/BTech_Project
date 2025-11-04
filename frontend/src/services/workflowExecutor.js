//src/services/workflowExecutor.js
import { workflowAPI } from '../api/api';
import { SimpleCommandProcessor } from '../pages/WorkflowTab/utils/simpleCommands';

export class WorkflowExecutor {
  constructor() {
    this.currentExecutionId = null;
    this.isRunning = false;
    this.executionProgress = new Map();
    this.loopCounters = new Map();
    this.MAX_LOOPS = 100; // Prevent infinite loops
    this.pollingInterval = null;
  }

  async executeWorkflow(nodes, edges, integrations, onProgress, onLog) {
    if (this.isRunning) {
      onLog('⚠️ Workflow is already running', 'warning');
      return { success: false, error: 'Workflow is already running' };
    }

    this.isRunning = true;
    this.currentExecutionId = Date.now().toString();
    this.executionProgress.clear();
    this.loopCounters.clear();

    try {
      onLog('🚀 Starting workflow execution...', 'info');
      
      // Validate workflow first
      if (nodes.length === 0) {
        throw new Error('No nodes in workflow');
      }

      // First save the workflow
      const saveResponse = await workflowAPI.saveWorkflow({
        name: `Execution_${this.currentExecutionId}`,
        nodes,
        edges
      });

      const workflowId = saveResponse.data.workflow._id;
      
      // Execute via backend API
      const executeResponse = await workflowAPI.executeWorkflow(workflowId);
      const executionId = executeResponse.data.executionId;

      onLog('✅ Workflow execution started on server', 'success');
      onLog(`📋 Execution ID: ${executionId}`, 'info');
      onLog(`🔗 Workflow ID: ${workflowId}`, 'info');

      // Start polling for execution status
      this.startExecutionPolling(executionId, onProgress, onLog);

      return { 
        success: true, 
        executionId,
        workflowId 
      };

    } catch (error) {
      console.error('Workflow execution error:', error);
      const errorMessage = error.response?.data?.error || error.message;
      onLog(`❌ Failed to execute workflow: ${errorMessage}`, 'error');
      this.isRunning = false;
      return { success: false, error: errorMessage };
    }
  }

  // Enhanced execution with loop detection
  async executeWorkflowWithLoops(nodes, edges, integrations, onProgress, onLog) {
  const executionId = Date.now().toString();
  this.loopCounters.set(executionId, new Map());
  
  try {
    onLog('🚀 Starting workflow execution with loop detection...', 'info');
    
    if (nodes.length === 0) {
      throw new Error('No nodes in workflow');
    }

    // Find start nodes using the FIXED method
    const startNodes = this.findStartNodes(nodes, edges);
    
    if (startNodes.length === 0) {
      throw new Error('No start node found in workflow');
    }

    onLog(`📋 Found ${startNodes.length} start nodes`, 'info');

    // Create execution context that persists across loops
    const executionContext = {
      variables: {},
      loopData: new Map(),
      executionId
    };

    // Execute all start nodes
    for (const startNode of startNodes) {
      await this.executeNodeTreeWithLoops(
        startNode, 
        nodes, 
        edges, 
        integrations, 
        executionContext,
        onProgress, 
        onLog
      );
    }
    
    onLog('✅ Workflow execution completed successfully!', 'success');
    return { success: true, executionId };
    
  } catch (error) {
    onLog(`❌ Workflow execution failed: ${error.message}`, 'error');
    return { success: false, error: error.message, executionId };
  } finally {
    this.loopCounters.delete(executionId);
  }
}

  async executeNodeTree(currentNode, nodes, edges, integrations, onProgress, onLog, visited = new Set(), depth = 0) {
    if (depth > 100) {
      throw new Error('Maximum execution depth exceeded - possible infinite loop');
    }

    const nodeId = currentNode.id;
    
    // Check for loops and increment counter
    if (visited.has(nodeId)) {
      const loopKey = `${this.currentExecutionId}-${nodeId}`;
      const currentCount = this.loopCounters.get(loopKey) || 0;
      
      if (currentCount >= this.MAX_LOOPS) {
        onLog(`🛑 Stopping loop execution for node ${currentNode.data.label} after ${this.MAX_LOOPS} iterations`, 'warning');
        return;
      }
      
      this.loopCounters.set(loopKey, currentCount + 1);
      onLog(`🔄 Loop iteration ${currentCount + 1} for node ${currentNode.data.label}`, 'info');
    } else {
      visited.add(nodeId);
    }

    // Execute current node
    onProgress(currentNode.id, 'executing');
    onLog(`▶️ Executing: ${currentNode.data.label}`, 'info');
    
    try {
      // Simulate node execution (replace with actual API calls)
      const result = await this.simulateNodeExecution(currentNode, integrations);
      
      onProgress(currentNode.id, 'success');
      onLog(`✅ ${currentNode.data.label} executed successfully`, 'success');
      
      // Find next nodes based on connections
      const nextNodes = this.findNextNodes(currentNode, nodes, edges);
      
      if (nextNodes.length > 0) {
        onLog(`➡️ Found ${nextNodes.length} connected nodes`, 'info');
      }
      
      // Execute all connected nodes (sequential execution for proper flow)
      for (const nextNode of nextNodes) {
        await this.executeNodeTree(nextNode, nodes, edges, integrations, onProgress, onLog, new Set(visited), depth + 1);
      }
      
    } catch (error) {
      onProgress(currentNode.id, 'error');
      onLog(`❌ ${currentNode.data.label} failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async executeNodeTreeWithLoops(currentNode, nodes, edges, integrations, context, onProgress, onLog, visited = new Set(), depth = 0) {
  // Prevent infinite recursion
  if (depth > 100) {
    onLog('🛑 Maximum execution depth reached - stopping potential infinite loop', 'warning');
    return;
  }

  const nodeId = currentNode.id;
  
  // Enhanced loop detection with context awareness
  const loopKey = `${context.executionId}-${nodeId}`;
  const currentCount = this.loopCounters.get(context.executionId).get(loopKey) || 0;
  
  if (visited.has(nodeId)) {
    if (currentCount >= this.MAX_LOOPS) {
      onLog(`🛑 Stopping loop execution for node ${currentNode.data.label} after ${this.MAX_LOOPS} iterations`, 'warning');
      return;
    }
    
    this.loopCounters.get(context.executionId).set(loopKey, currentCount + 1);
    onLog(`🔄 Loop iteration ${currentCount + 1} for node ${currentNode.data.label}`, 'info');
  } else {
    visited.add(nodeId);
  }

  // Execute current node
  onProgress(currentNode.id, 'executing');
  onLog(`▶️ Executing: ${currentNode.data.label}`, 'info');
  
  try {
    const integration = integrations.find(i => i.service === currentNode.data.service);
    const result = await this.executeNode(currentNode, integration?.config || {}, context.variables);
    
    // Update context with node results
    context.variables[`${currentNode.id}_result`] = result;
    context.variables[`${currentNode.data.service}_result`] = result;
    
    onProgress(currentNode.id, 'success');
    onLog(`✅ ${currentNode.data.label} executed successfully`, 'success');
    
    // Find next nodes based on connections
    const nextNodes = this.findNextNodes(currentNode, nodes, edges);
    
    if (nextNodes.length > 0) {
      onLog(`➡️ Found ${nextNodes.length} connected nodes`, 'info');
    }
    
    // Execute all connected nodes (sequential for proper flow)
    for (const nextNode of nextNodes) {
      await this.executeNodeTreeWithLoops(
        nextNode, 
        nodes, 
        edges, 
        integrations, 
        context,
        onProgress, 
        onLog, 
        new Set(visited), // New visited set for each branch
        depth + 1
      );
    }
    
  } catch (error) {
    onProgress(currentNode.id, 'error');
    onLog(`❌ ${currentNode.data.label} failed: ${error.message}`, 'error');
    
    // Check if there are error handling paths
    const errorHandlers = this.findErrorHandlerNodes(currentNode, edges);
    if (errorHandlers.length > 0) {
      onLog(`🔄 Executing ${errorHandlers.length} error handler(s)`, 'info');
      for (const handler of errorHandlers) {
        await this.executeNodeTreeWithLoops(
          handler, 
          nodes, 
          edges, 
          integrations, 
          context,
          onProgress, 
          onLog, 
          new Set(visited),
          depth + 1
        );
      }
    } else {
      throw error; // Re-throw if no error handlers
    }
  }
}

findErrorHandlerNodes(node, edges) {
  // Look for edges marked as error handlers
  return edges
    .filter(edge => edge.source === node.id && edge.type === 'error')
    .map(edge => edge.target);
}

  // In server/Services/workflowExecutor.js - FIXED findStartNodes method
findStartNodes(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  // If there's only one node, it's the start node
  if (nodes.length === 1) {
    return [nodes[0]];
  }

  const nodesWithIncomingEdges = new Set();
  
  // Collect all nodes that have incoming edges
  edges.forEach(edge => {
    if (edge.target) {
      nodesWithIncomingEdges.add(edge.target);
    }
  });

  // Start nodes are:
  // 1. Nodes with no incoming edges
  // 2. Trigger nodes (even if they have incoming edges)
  // 3. If no such nodes, use the first node
  const startNodes = nodes.filter(node => {
    const hasIncomingEdges = nodesWithIncomingEdges.has(node.id);
    const isTrigger = node.data.service === 'trigger';
    
    return !hasIncomingEdges || isTrigger;
  });

  // If no start nodes found, use the first node
  if (startNodes.length === 0 && nodes.length > 0) {
    console.log('⚠️ No explicit start node found, using first node');
    return [nodes[0]];
  }

  console.log(`🔍 Found ${startNodes.length} start nodes`);
  return startNodes;
}

  findNextNodes(currentNode, nodes, edges) {
    const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);
    const nextNodeIds = outgoingEdges.map(edge => edge.target);
    return nodes.filter(node => nextNodeIds.includes(node.id));
  }

  async simulateNodeExecution(node, integrations) {
    // Simulate API call delay
    const delay = 1000 + Math.random() * 2000;
    onLog(`⏳ ${node.data.label} processing... (${Math.round(delay/1000)}s)`, 'info');
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Check if integration is configured
    if (node.data.service !== 'trigger') {
      const integration = integrations.find(i => i.service === node.data.service);
      if (!integration || !integration.isValid) {
        throw new Error(`Integration not configured for ${node.data.service}`);
      }
      
      // Check if parameters are configured
      if (!node.data.parametersConfigured) {
        throw new Error(`Parameters not configured for ${node.data.service}`);
      }
    }
    
    return { success: true, message: 'Node executed successfully' };
  }

  async startExecutionPolling(executionId, onProgress, onLog) {
    // Clear any existing polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(this.pollingInterval);
        return;
      }

      try {
        // Get execution status from backend
        const response = await workflowAPI.getExecutionLogs();
        const executions = response.data.executions || [];
        const currentExecution = executions.find(exec => exec._id === executionId);

        if (!currentExecution) {
          onLog('❌ Execution not found', 'error');
          this.isRunning = false;
          clearInterval(this.pollingInterval);
          return;
        }

        // Update progress based on execution logs
        this.updateProgressFromLogs(currentExecution.logs, onProgress, onLog);

        // Check if execution is completed
        if (currentExecution.status === 'success' || currentExecution.status === 'error') {
          onLog(`✅ Workflow execution ${currentExecution.status}`, 
                currentExecution.status === 'success' ? 'success' : 'error');
          
          if (currentExecution.status === 'error' && currentExecution.error) {
            onLog(`❌ Error: ${currentExecution.error}`, 'error');
          }

          this.isRunning = false;
          clearInterval(this.pollingInterval);
        }

      } catch (error) {
        console.error('Polling error:', error);
        onLog('❌ Failed to get execution status', 'error');
        this.isRunning = false;
        clearInterval(this.pollingInterval);
      }
    }, 2000); // Poll every 2 seconds
  }

  updateProgressFromLogs(logs, onProgress, onLog) {
    if (!logs || !Array.isArray(logs)) return;

    logs.forEach(log => {
      if (log.nodeId) {
        const status = this.getStatusFromLogLevel(log.level);
        onProgress(log.nodeId, status);
        
        // Only log node-specific messages if they're not already logged
        if (!this.executionProgress.has(`${log.nodeId}_${log.message}`)) {
          this.executionProgress.set(`${log.nodeId}_${log.message}`, true);
          onLog(`📝 ${log.message}`, log.level);
        }
      }
    });
  }

  getStatusFromLogLevel(level) {
    switch (level) {
      case 'info': return 'executing';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'pending';
    }
  }

  stopExecution() {
    this.isRunning = false;
    this.currentExecutionId = null;
    this.executionProgress.clear();
    this.loopCounters.clear();
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Simple command execution
  async executeSimpleCommand(command, currentState) {
    return SimpleCommandProcessor.processCommand(command, currentState);
  }
}

export default new WorkflowExecutor();