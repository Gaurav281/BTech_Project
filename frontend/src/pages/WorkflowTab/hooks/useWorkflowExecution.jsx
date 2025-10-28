import { useCallback } from 'react';
import useWorkflowStore from '../../../store/workflowStore';
import { workflowAPI } from '../../../api/api';
import { showPopup } from '../utils/workflowHelpers';

export const useWorkflowExecution = () => {
  const {
    nodes,
    edges,
    workflowName,
    setIsRunning,
    addTerminalLog
  } = useWorkflowStore();

  const handleExecuteWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      addTerminalLog('❌ No workflow to execute. Please generate a workflow first.', 'error');
      return false;
    }

    try {
      setIsRunning(true);
      addTerminalLog('🚀 Starting workflow execution...');

      // Save workflow first
      const saveResponse = await workflowAPI.saveWorkflow({
        name: workflowName,
        nodes,
        edges
      });

      const workflowId = saveResponse.data.workflow._id;

      // Execute workflow
      const executeResponse = await workflowAPI.executeWorkflow(workflowId);

      addTerminalLog('✅ Workflow execution started successfully!');
      addTerminalLog(`📋 Execution ID: ${executeResponse.data.executionId}`);

      showPopup('✅ Workflow execution started!', 'success');
      return true;

    } catch (error) {
      console.error('Execution error:', error);
      addTerminalLog(`❌ Failed to execute workflow: ${error.response?.data?.error || error.message}`, 'error');
      showPopup('❌ Failed to execute workflow', 'error');
      setIsRunning(false);
      return false;
    }
  }, [nodes, edges, workflowName, setIsRunning, addTerminalLog]);

  const handleStopWorkflow = useCallback(async () => {
    try {
      setIsRunning(false);
      addTerminalLog('🛑 Stopping workflow execution...');
      showPopup('🛑 Workflow execution stopped', 'warning');
    } catch (error) {
      console.error('Stop error:', error);
      addTerminalLog(`❌ Failed to stop workflow: ${error.message}`, 'error');
    }
  }, [setIsRunning, addTerminalLog]);

  return {
    handleExecuteWorkflow,
    handleStopWorkflow
  };
};