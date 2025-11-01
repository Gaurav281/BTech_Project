import { useState, useCallback } from 'react';
import useWorkflowStore from '../../../store/workflowStore';
import { aiAPI } from '../../../api/api';
import { showPopup } from '../utils/workflowHelpers';

export const useAICommands = () => {
  const [command, setCommand] = useState('');
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [aiProvider, setAiProvider] = useState('huggingface');

  const { 
    nodes, 
    edges, 
    workflowName, 
    setNodes, 
    setEdges, 
    setWorkflowName, 
    addTerminalLog,
    updateNodeData
  } = useWorkflowStore();

  // Smart command processing - try simple logic first, then AI
  const handleAICommand = useCallback(async () => {
    if (!command.trim()) {
      addTerminalLog('Please enter a command to modify the workflow', 'error');
      return;
    }

    setIsProcessingCommand(true);
    addTerminalLog(`🤖 Processing command: "${command}"`);

    try {
      // First try simple command processing
      const simpleResult = processSimpleCommand(command, { nodes, edges, workflowName });
      
      if (simpleResult.success) {
        // Apply simple modifications
        if (simpleResult.modifications.nodes) setNodes(simpleResult.modifications.nodes);
        if (simpleResult.modifications.edges) setEdges(simpleResult.modifications.edges);
        if (simpleResult.modifications.workflowName) setWorkflowName(simpleResult.modifications.workflowName);

        addTerminalLog('✅ Command processed successfully!');
        addTerminalLog(`📝 Changes: ${simpleResult.explanation}`);
        showPopup('✅ Command processed successfully!', 'success');
        setCommand('');
      } else {
        // Fall back to AI for complex commands
        addTerminalLog('🔄 Using AI for complex command...');
        await processAICommand(command);
      }
    } catch (error) {
      console.error('Command processing error:', error);
      addTerminalLog(`❌ Error processing command: ${error.message}`, 'error');
      showPopup('❌ Command processing failed', 'error');
    } finally {
      setIsProcessingCommand(false);
    }
  }, [command, nodes, edges, workflowName, setNodes, setEdges, setWorkflowName, addTerminalLog]);

  // Process simple commands without AI
  const processSimpleCommand = (command, currentWorkflow) => {
    const lowerCommand = command.toLowerCase();
    const modifications = {
      nodes: [...currentWorkflow.nodes],
      edges: [...currentWorkflow.edges],
      workflowName: currentWorkflow.workflowName,
      explanation: ''
    };

    let changes = [];

    // Simple command patterns
    if (lowerCommand.includes('rename workflow to') || lowerCommand.includes('change name to')) {
      const newName = command.split('to')[1]?.trim().replace(/["']/g, '');
      if (newName) {
        modifications.workflowName = newName;
        changes.push(`Renamed workflow to "${newName}"`);
      }
    }

    if (lowerCommand.includes('add telegram node')) {
      const newNode = {
        id: `node-${Date.now()}`,
        type: 'custom',
        position: { x: 100 + (modifications.nodes.length * 300), y: 100 },
        data: {
          label: 'Send Telegram Message',
          service: 'telegram',
          description: 'Sends message via Telegram bot',
          stepNumber: modifications.nodes.length + 1,
          parameters: {
            botToken: '',
            chatId: '',
            message: 'Hello from workflow!'
          },
          parametersConfigured: false
        }
      };
      modifications.nodes.push(newNode);
      changes.push('Added Telegram node');
    }

    if (lowerCommand.includes('add gmail node')) {
      const newNode = {
        id: `node-${Date.now()}`,
        type: 'custom',
        position: { x: 100 + (modifications.nodes.length * 300), y: 100 },
        data: {
          label: 'Send Email',
          service: 'gmail',
          description: 'Sends email via Gmail',
          stepNumber: modifications.nodes.length + 1,
          parameters: {
            to: '',
            subject: 'Automated Email',
            body: 'This is an automated email from your workflow.'
          },
          parametersConfigured: false
        }
      };
      modifications.nodes.push(newNode);
      changes.push('Added Gmail node');
    }

    if (lowerCommand.includes('delete node') || lowerCommand.includes('remove node')) {
      const nodeMatch = command.match(/node\s+(\d+)/i);
      if (nodeMatch) {
        const nodeIndex = parseInt(nodeMatch[1]) - 1;
        if (nodeIndex >= 0 && nodeIndex < modifications.nodes.length) {
          const removedNode = modifications.nodes.splice(nodeIndex, 1)[0];
          // Remove connected edges
          modifications.edges = modifications.edges.filter(edge => 
            edge.source !== removedNode.id && edge.target !== removedNode.id
          );
          // Reorder step numbers
          modifications.nodes.forEach((node, index) => {
            node.data.stepNumber = index + 1;
          });
          changes.push(`Removed node ${nodeMatch[1]}`);
        }
      }
    }

    if (lowerCommand.includes('connect') && lowerCommand.includes('to')) {
      const connectMatch = command.match(/(\d+)\s+to\s+(\d+)/i);
      if (connectMatch) {
        const sourceIndex = parseInt(connectMatch[1]) - 1;
        const targetIndex = parseInt(connectMatch[2]) - 1;
        
        if (sourceIndex >= 0 && sourceIndex < modifications.nodes.length && 
            targetIndex >= 0 && targetIndex < modifications.nodes.length) {
          
          const sourceNode = modifications.nodes[sourceIndex];
          const targetNode = modifications.nodes[targetIndex];
          
          const newEdge = {
            id: `edge-${Date.now()}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'smoothstep',
            animated: true
          };
          
          modifications.edges.push(newEdge);
          changes.push(`Connected node ${connectMatch[1]} to node ${connectMatch[2]}`);
        }
      }
    }

    if (changes.length > 0) {
      modifications.explanation = changes.join(', ');
      return { success: true, modifications };
    }

    return { success: false, error: 'No simple command pattern matched' };
  };

  // Process complex commands with AI
  const processAICommand = async (command) => {
    try {
      const response = await aiAPI.processCommand({
        command: command,
        currentWorkflow: { nodes, edges, workflowName },
        provider: aiProvider
      });

      const result = response.data;
      if (result.success) {
        // Apply AI modifications
        if (result.modifications.nodes) setNodes(result.modifications.nodes);
        if (result.modifications.edges) setEdges(result.modifications.edges);
        if (result.modifications.workflowName) setWorkflowName(result.modifications.workflowName);

        addTerminalLog('✅ AI command processed successfully!');
        addTerminalLog(`📝 AI Changes: ${result.explanation}`);
        showPopup('✅ AI command processed successfully!', 'success');
        setCommand('');
      } else {
        addTerminalLog(`❌ AI failed to process command: ${result.error}`, 'error');
        showPopup('❌ AI command failed', 'error');
      }
    } catch (error) {
      console.error('AI command processing error:', error);
      addTerminalLog(`❌ AI command error: ${error.message}`, 'error');
      showPopup('❌ AI command processing failed', 'error');
    }
  };

  const commandExamples = [
    "Add Telegram node",
    "Add Gmail node", 
    "Connect node 1 to node 2",
    "Delete node 2",
    "Rename workflow to 'Daily Report'",
    "Change message to 'Hello World'"
  ];

  return {
    command,
    setCommand,
    isProcessingCommand,
    aiProvider,
    setAiProvider,
    handleAICommand,
    commandExamples
  };
};