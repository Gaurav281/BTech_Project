import { useState, useCallback } from 'react';
import useWorkflowStore from '../../../store/workflowStore';
import { aiAPI } from '../../../api/api';
import { showPopup } from '../utils/workflowHelpers';
import { SimpleCommandProcessor } from '../utils/simpleCommands';

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

  // Smart command processing - try simple commands first, then AI
  const handleAICommand = useCallback(async () => {
    if (!command.trim()) {
      addTerminalLog('Please enter a command to modify the workflow', 'error');
      return;
    }

    setIsProcessingCommand(true);
    addTerminalLog(`🤖 Processing command: "${command}"`);

    try {
      // First try simple command processing
      const simpleResult = SimpleCommandProcessor.processCommand(command, { 
        nodes, 
        edges, 
        workflowName 
      });
      
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

  const commandExamples = SimpleCommandProcessor.getCommandExamples();

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