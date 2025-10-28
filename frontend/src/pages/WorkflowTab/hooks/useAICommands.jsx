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
    addTerminalLog 
  } = useWorkflowStore();

  const handleAICommand = useCallback(async () => {
    if (!command.trim()) {
      addTerminalLog('Please enter a command to modify the workflow', 'error');
      return;
    }

    setIsProcessingCommand(true);
    addTerminalLog(`🤖 Processing command with ${aiProvider}: "${command}"`);

    try {
      const response = await aiAPI.processCommand({
        command: command,
        currentWorkflow: { nodes, edges, workflowName },
        provider: aiProvider
      });

      const result = response.data;
      if (result.success) {
        // Apply modifications
        if (result.modifications.nodes) setNodes(result.modifications.nodes);
        if (result.modifications.edges) setEdges(result.modifications.edges);
        if (result.modifications.workflowName) setWorkflowName(result.modifications.workflowName);

        addTerminalLog('✅ Workflow modified successfully!');
        addTerminalLog(`📝 Changes: ${result.explanation}`);
        showPopup('✅ Command processed successfully!', 'success');
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
  }, [command, aiProvider, nodes, edges, workflowName, setNodes, setEdges, setWorkflowName, addTerminalLog]);

  const commandExamples = [
    "Add Telegram node",
    "Connect step 1 with step 2",
    "Add message parameter",
    "Remove step 2",
    "Change workflow name to 'Daily Report'",
    "Add Gmail integration",
    "Create Slack notification"
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