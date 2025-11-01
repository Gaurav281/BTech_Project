//src/pages/WorkflowTab/index.jsx
import React from 'react';
import WorkflowHeader from '../../components/WorkflowHeader';
import WorkflowBuilder from '../../components/WorkflowBuilder';
import NodeSettingsPanel from '../../components/NodeSettingsPanel';
import TerminalPanel from '../../components/TerminalPanel';
import useWorkflowStore from '../../store/workflowStore';

// Import custom hooks
import { useWorkflowGeneration } from './hooks/useWorkflowGeneration';
import { useAICommands } from './hooks/useAICommands';
import { useWorkflowExecution } from './hooks/useWorkflowExecution';
import { useWorkflowValidation } from './hooks/useWorkflowValidation';
import { useWorkflowIntegrations } from './hooks/useWorkflowIntegrations';

// Import components
import PromptSection from './components/PromptSection';
import CommandSection from './components/CommandSection';
import SuggestionsSection from './components/SuggestionsSection';
import IntegrationStatus from './components/IntegrationStatus';

const WorkflowTab = () => {
  const {
    showTerminal,
    setShowTerminal,
    nodes,
    edges,
    workflowName,
    setWorkflowName,
    isRunning,
    setIsRunning,
    selectedNode,
    setSelectedNode,
    addTerminalLog,
    clearTerminalLogs,
    clearWorkflow,
    setNodes,
    setEdges,
    updateNodeData
  } = useWorkflowStore();

  // Initialize custom hooks
  const workflowGeneration = useWorkflowGeneration();
  const aiCommands = useAICommands();
  const workflowExecution = useWorkflowExecution();
  const workflowValidation = useWorkflowValidation();
  const workflowIntegrations = useWorkflowIntegrations();

  // Ensure nodes and edges are arrays to prevent React Flow errors
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];

  const handleClear = () => {
    clearWorkflow();
    clearTerminalLogs();
    workflowGeneration.setPrompt('');
    aiCommands.setCommand('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 relative">
      <WorkflowHeader
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
        showTerminal={showTerminal}
        onGenerateWorkflow={workflowGeneration.handleGenerateCompleteWorkflow}
        userIntegrations={workflowIntegrations.userIntegrations}
        validateWorkflow={() =>
          workflowValidation.validateAndExecuteWorkflow(workflowIntegrations.userIntegrations)
        }
        onExecuteWorkflow={workflowExecution.handleExecuteWorkflow}
        onStopWorkflow={workflowExecution.handleStopWorkflow}
        isRunning={isRunning}
      />

      {/* Input Sections */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <PromptSection workflowGeneration={workflowGeneration} aiCommands={aiCommands} />
          <CommandSection aiCommands={aiCommands} />
          <SuggestionsSection workflowGeneration={workflowGeneration} />
          <IntegrationStatus userIntegrations={workflowIntegrations.userIntegrations} />
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col md:flex-row relative overflow-hidden z-20"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        {/* React Flow Area */}
        <div className="flex-1 bg-white min-w-0 border-r border-gray-200 relative z-30 overflow-hidden">
          <div className="absolute inset-0">
            <WorkflowBuilder />
          </div>
        </div>

        {/* Node Settings Panel */}
        <div
          className="w-full md:w-80 lg:w-96 bg-white flex flex-col relative z-30 border-l border-gray-200"
          style={{ minHeight: '500px' }}
        >
          <div className="p-4 border-b border-gray-200 shrink-0 sticky top-0 bg-white z-40">
            <h3 className="text-lg font-semibold text-gray-900">Node Settings</h3>
            <p className="text-sm text-gray-600">Configure your node parameters</p>
          </div>
          <div className="flex-1 overflow-auto">
            <NodeSettingsPanel />
          </div>
        </div>
      </div>

      {/* Terminal Panel */}
      {showTerminal && (
        <div
          className="border-t border-gray-300 bg-gray-900 fixed bottom-0 left-0 right-0 z-50"
          style={{ height: '256px' }}
        >
          <TerminalPanel />
        </div>
      )}
    </div>
  );

};

export default WorkflowTab;