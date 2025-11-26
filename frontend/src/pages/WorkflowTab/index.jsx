import React, { useState, useCallback, useEffect } from 'react';
import WorkflowHeader from '../../components/WorkflowHeader';
import WorkflowBuilder from '../../components/WorkflowBuilder';
import NodeSettingsPanel from '../../components/NodeSettingsPanel';
import TerminalPanel from '../../components/TerminalPanel';
import useWorkflowStore from '../../store/workflowStore';

import { FaAndroid, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import TemplatesPanel from '../../components/TemplatesPanle';

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

// Import frontend WorkflowExecutor
import WorkflowExecutor from '../../services/WorkflowExecutor';

// IMPORT THE MISSING API
import { workflowAPI } from '../../api/api';

const MIN_PANEL_WIDTH = 220;
const MAX_PANEL_WIDTH = 600;

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
    addTerminalLog,
    clearTerminalLogs,
    clearWorkflow,
    setNodes,
    setEdges
  } = useWorkflowStore();

  const [executionProgress, setExecutionProgress] = useState({});
  const [hostedWorkflows, setHostedWorkflows] = useState([]);
  const [showJSONModal, setShowJSONModal] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWorkflowInfo, setShowWorkflowInfo] = useState(true);

  // Resizable layout state
  const [templatesWidth, setTemplatesWidth] = useState(280);
  const [settingsWidth, setSettingsWidth] = useState(360);
  const [isResizingTemplates, setIsResizingTemplates] = useState(false);
  const [isResizingSettings, setIsResizingSettings] = useState(false);

  // Initialize custom hooks
  const workflowGeneration = useWorkflowGeneration();
  const aiCommands = useAICommands();
  const workflowExecution = useWorkflowExecution();
  const workflowValidation = useWorkflowValidation();
  const workflowIntegrations = useWorkflowIntegrations();

  // Popup (hoisted as normal function so it’s safe to use below)
  function showPopup(message, type = 'info') {
    const popup = document.createElement('div');
    const bgColor =
      type === 'success'
        ? 'bg-green-500'
        : type === 'error'
        ? 'bg-red-500'
        : type === 'warning'
        ? 'bg-yellow-500'
        : 'bg-blue-500';

    popup.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out font-semibold text-sm md:text-base`;
    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 4000);
  }

  // Global mouse move/up for resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingTemplates) {
        setTemplatesWidth((prev) => {
          const next = prev + e.movementX;
          return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, next));
        });
      } else if (isResizingSettings) {
        // Dragging the left edge of settings: moving mouse left increases width
        setSettingsWidth((prev) => {
          const next = prev - e.movementX;
          return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, next));
        });
      }
    };

    const handleMouseUp = () => {
      if (isResizingTemplates) setIsResizingTemplates(false);
      if (isResizingSettings) setIsResizingSettings(false);
    };

    if (isResizingTemplates || isResizingSettings) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTemplates, isResizingSettings]);

  // Execute Workflow
  const handleExecuteWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      addTerminalLog('No workflow to execute', 'error');
      return;
    }

    setIsRunning(true);
    setExecutionProgress({});
    addTerminalLog('🚀 Starting workflow execution...');

    try {
      let workflowId;

      const saveResponse = await workflowAPI.saveWorkflow({
        name: workflowName,
        nodes,
        edges
      });
      workflowId = saveResponse.data.workflow._id;
      addTerminalLog('💾 Workflow saved before execution');

      const executeResponse = await workflowAPI.executeWorkflow(workflowId);

      addTerminalLog('✅ Workflow execution started!');
      addTerminalLog(`📋 Execution ID: ${executeResponse.data.executionId}`);
      addTerminalLog('🔄 Workflow is now executing...');
    } catch (error) {
      console.error('Workflow execution error:', error);
      addTerminalLog(
        `❌ Workflow execution failed: ${
          error.response?.data?.error || error.message
        }`,
        'error'
      );
      setIsRunning(false);
    }
  }, [nodes, edges, workflowName, setIsRunning, addTerminalLog]);

  const handleStopWorkflow = useCallback(() => {
    WorkflowExecutor.stopExecution();
    setIsRunning(false);
    setExecutionProgress({});
    addTerminalLog('⏹️ Workflow execution stopped', 'warning');
  }, [setIsRunning, addTerminalLog]);

  // JSON Editor
  const handleEditJSON = useCallback(() => {
    if (nodes.length === 0) {
      addTerminalLog('No workflow to edit', 'error');
      return;
    }

    const workflowData = {
      name: workflowName,
      nodes: nodes,
      edges: edges,
      version: '1.0',
      updatedAt: new Date().toISOString()
    };

    setJsonContent(JSON.stringify(workflowData, null, 2));
    setShowJSONModal(true);
    addTerminalLog('📝 Opening JSON editor...', 'info');
  }, [workflowName, nodes, edges, addTerminalLog]);

  const handleJSONSave = useCallback(() => {
    try {
      const parsedData = JSON.parse(jsonContent);

      if (parsedData.name) setWorkflowName(parsedData.name);
      if (parsedData.nodes) setNodes(parsedData.nodes);
      if (parsedData.edges) setEdges(parsedData.edges);

      setShowJSONModal(false);
      addTerminalLog('✅ Workflow updated from JSON', 'success');
      showPopup('✅ Workflow updated from JSON', 'success');
    } catch (error) {
      addTerminalLog(`❌ Invalid JSON: ${error.message}`, 'error');
      showPopup('❌ Invalid JSON format', 'error');
    }
  }, [jsonContent, setWorkflowName, setNodes, setEdges, addTerminalLog]);

  // Host Workflow
  const handleHostWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      addTerminalLog('No workflow to host', 'error');
      return;
    }

    try {
      addTerminalLog('🌐 Hosting workflow...', 'info');

      const saveResponse = await workflowAPI.saveWorkflow({
        name: workflowName,
        nodes,
        edges
      });

      const workflowId = saveResponse.data.workflow._id;

      await workflowAPI.hostWorkflow(workflowId, {
        startImmediately: true
      });

      const hostedWorkflow = {
        id: workflowId,
        name: workflowName,
        hostedAt: new Date().toISOString(),
        status: 'running'
      };

      setHostedWorkflows(prev => [...prev, hostedWorkflow]);
      addTerminalLog('✅ Workflow hosted successfully!', 'success');
      addTerminalLog(
        '🔄 Workflow will continue running even when browser is closed',
        'info'
      );
      showPopup('✅ Workflow hosted successfully!', 'success');
    } catch (error) {
      console.error('Host workflow error:', error);
      addTerminalLog(`❌ Failed to host workflow: ${error.message}`, 'error');
      showPopup('❌ Failed to host workflow', 'error');
    }
  }, [workflowName, nodes, edges, addTerminalLog]);

  // Refresh
  const handleRefresh = useCallback(() => {
    addTerminalLog('🔄 Refreshing workflow environment...', 'info');

    if (isRunning) {
      handleStopWorkflow();
    }

    setExecutionProgress({});
    workflowIntegrations.loadUserIntegrations();
    clearTerminalLogs();

    addTerminalLog('✅ Workflow environment refreshed', 'success');
    showPopup('🔄 Workflow refreshed', 'info');
  }, [
    isRunning,
    handleStopWorkflow,
    workflowIntegrations,
    clearTerminalLogs,
    addTerminalLog
  ]);

  // Share
  const handleShare = useCallback(async () => {
    if (nodes.length === 0) {
      addTerminalLog(
        'No workflow to share. Please generate a workflow first.',
        'error'
      );
      showPopup('❌ No workflow to share', 'error');
      return;
    }

    try {
      const saveResponse = await workflowAPI.saveWorkflow({
        name: workflowName,
        nodes,
        edges,
        isPublic: true
      });

      const workflowId = saveResponse.data.workflow._id;

      const shareableLink = `${window.location.origin}/workflow/shared/${workflowId}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareableLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      addTerminalLog('✅ Shareable link copied to clipboard!');
      addTerminalLog(`🔗 Share Link: ${shareableLink}`);
      showPopup('✅ Share link copied to clipboard!', 'success');
    } catch (error) {
      console.error('Share error:', error);
      addTerminalLog(
        `❌ Error sharing workflow: ${
          error.response?.data?.error || error.message
        }`,
        'error'
      );
      showPopup('❌ Failed to share workflow', 'error');
    }
  }, [workflowName, nodes, edges, addTerminalLog]);

  const handleClear = () => {
    clearWorkflow();
    clearTerminalLogs();
    workflowGeneration.setPrompt('');
    aiCommands.setCommand('');
    setExecutionProgress({});
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 relative">
      {/* 🔹 TOP AREA – NORMAL FLOW (NO STICKY, NO OVERLAP) */}
      <WorkflowHeader
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
        showTerminal={showTerminal}
        onGenerateWorkflow={workflowGeneration.handleGenerateCompleteWorkflow}
        userIntegrations={workflowIntegrations.userIntegrations}
        validateWorkflow={() =>
          workflowValidation.validateAndExecuteWorkflow(
            workflowIntegrations.userIntegrations
          )
        }
        onExecuteWorkflow={handleExecuteWorkflow}
        onStopWorkflow={handleStopWorkflow}
        onEditJSON={handleEditJSON}
        onHostWorkflow={handleHostWorkflow}
        onRefresh={handleRefresh}
        onShare={handleShare}
        isRunning={isRunning}
      />

      {/* Input Sections (Prompt / Command / Suggestions / Connected Services) */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <PromptSection
            workflowGeneration={workflowGeneration}
            aiCommands={aiCommands}
          />
          <CommandSection aiCommands={aiCommands} />
          <SuggestionsSection workflowGeneration={workflowGeneration} />
          <IntegrationStatus
            userIntegrations={workflowIntegrations.userIntegrations}
          />
        </div>
      </div>

      {/* Execution Progress */}
      {isRunning && Object.keys(executionProgress).length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">
                Execution Progress
              </span>
              <span className="text-xs text-blue-600">
                {
                  Object.values(executionProgress).filter(
                    status => status === 'success'
                  ).length
                }{' '}
                / {nodes.length} completed
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {nodes.map(node => (
                <div key={node.id} className="flex items-center space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      executionProgress[node.id] === 'success'
                        ? 'bg-green-500'
                        : executionProgress[node.id] === 'executing'
                        ? 'bg-yellow-500'
                        : executionProgress[node.id] === 'error'
                        ? 'bg-red-500'
                        : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-xs text-gray-600">
                    {node.data.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workflow Info Toggle */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b">
        <button
          onClick={() => setShowWorkflowInfo(!showWorkflowInfo)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
          {showWorkflowInfo ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />}
          <span>Workflow Information</span>
        </button>

        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${
            showTemplates
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FaAndroid size={12} />
          <span>Templates</span>
        </button>
      </div>

      {/* Workflow Info Section */}
      {showWorkflowInfo && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="font-bold text-blue-700 text-lg">
                  {nodes.length}
                </div>
                <div className="text-blue-600">Total Nodes</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="font-bold text-green-700 text-lg">
                  {nodes.filter(n => n.data.parametersConfigured).length}
                </div>
                <div className="text-green-600">Configured</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="font-bold text-yellow-700 text-lg">
                  {nodes.filter(n => n.data.service === 'trigger').length}
                </div>
                <div className="text-yellow-600">Triggers</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="font-bold text-purple-700 text-lg">
                  {edges.length}
                </div>
                <div className="text-purple-600">Connections</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT: scrolls normally – Templates (optional) + React Flow + Node Settings */}
      <div
        className="flex-1 flex flex-row relative"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        {/* Templates Panel (left) */}
        {showTemplates && (
          <div
            className="h-full bg-white border-r border-gray-200 overflow-y-auto shrink-0"
            style={{ width: templatesWidth }}
          >
            <TemplatesPanel />
          </div>
        )}

        {/* Resizer between Templates and React Flow */}
        {showTemplates && (
          <div
            className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize shrink-0"
            onMouseDown={() => setIsResizingTemplates(true)}
          />
        )}

        {/* React Flow Area (center) */}
        <div className="flex-1 bg-white min-w-0 border-r border-gray-200 relative overflow-hidden">
          <div className="absolute inset-0">
            <WorkflowBuilder executionProgress={executionProgress} />
          </div>
        </div>

        {/* Resizer between React Flow and Node Settings */}
        <div
          className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize shrink-0"
          onMouseDown={() => setIsResizingSettings(true)}
        />

        {/* Node Settings Panel (right) */}
        <div
          className="h-full bg-white flex flex-col relative border-l border-gray-200 shrink-0"
          style={{ width: settingsWidth, minHeight: '500px' }}
        >
          {/* Sticky only inside panel is fine */}
          <div className="p-4 border-b border-gray-200 shrink-0 sticky top-0 bg-white z-40">
            <h3 className="text-lg font-semibold text-gray-900">
              Node Settings
            </h3>
            <p className="text-sm text-gray-600">
              Configure your node parameters
            </p>
          </div>
          <div className="flex-1 overflow-auto">
            <NodeSettingsPanel
              userIntegrations={workflowIntegrations.userIntegrations}
            />
          </div>
        </div>
      </div>

      {/* Terminal Panel (fixed bottom, keeps working same) */}
      {showTerminal && (
        <div
          className="border-t border-gray-300 bg-gray-900 fixed bottom-0 left-0 right-0 z-50"
          style={{ height: '256px' }}
        >
          <TerminalPanel />
        </div>
      )}

      {/* JSON Editor Modal */}
      {showJSONModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-4xl mx-4 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">
              Edit Workflow JSON
            </h3>

            <div className="flex-1 mb-4">
              <textarea
                value={jsonContent}
                onChange={e => setJsonContent(e.target.value)}
                className="w-full h-64 md:h-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Paste your workflow JSON here..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowJSONModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJSONSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hosted Workflows Panel */}
      {hostedWorkflows.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
            <h4 className="font-semibold text-gray-900 mb-2">
              Hosted Workflows
            </h4>
            <div className="space-y-2">
              {hostedWorkflows.map(workflow => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-2 bg-green-50 rounded"
                >
                  <span className="text-sm font-medium text-green-800">
                    {workflow.name}
                  </span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-green-600">Running</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowTab;
