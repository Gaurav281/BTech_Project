//src/pages/GenerateWorkflow.jsx
import React, { useState } from 'react';
import WorkflowBuilder from '../components/WorkflowBuilder';
import NodeSettingsPanel from '../components/NodeSettingsPanel';
import TerminalPanel from '../components/TerminalPanel';
import HeaderButtons from '../components/HeaderButtons';
import useWorkflowStore from '../store/workflowStore';
import { aiAPI } from '../api/api';

const GenerateWorkflow = () => {
  const [showTerminal, setShowTerminal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateWorkflowFromAI, addTerminalLog, clearTerminalLogs } = useWorkflowStore();

  const handleGenerateWorkflow = async () => {
    if (!prompt.trim()) {
      addTerminalLog('Please enter a prompt to generate workflow', 'error');
      return;
    }

    setIsGenerating(true);
    addTerminalLog(`Processing prompt: "${prompt}"`);
    addTerminalLog('Analyzing requirements and generating workflow...');

    try {
      const response = await aiAPI.generateWorkflow(prompt);
      
      // Debug log to see the response structure
      console.log('API Response:', response);
      
      if (!response.data) {
        throw new Error('No data received from AI service');
      }

      // Check if we have valid workflow data
      if (!response.data.nodes && !response.data.edges) {
        throw new Error('Invalid workflow data structure received');
      }

      generateWorkflowFromAI(response.data);
      addTerminalLog('Workflow generated successfully!');
      
      const nodeCount = response.data.nodes?.length || 0;
      const edgeCount = response.data.edges?.length || 0;
      addTerminalLog(`Detected ${nodeCount} nodes and ${edgeCount} connections`);
      
    } catch (error) {
      console.error('Generation error details:', error);
      
      // More specific error messages
      if (error.response?.data?.error) {
        addTerminalLog(`Error generating workflow: ${error.response.data.error}`, 'error');
      } else if (error.message.includes('service')) {
        addTerminalLog('Error: Invalid workflow structure received from AI service', 'error');
      } else {
        addTerminalLog(`Error generating workflow: ${error.message}`, 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    useWorkflowStore.getState().clearWorkflow();
    clearTerminalLogs();
    setPrompt('');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <HeaderButtons 
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
        showTerminal={showTerminal}
        onGenerateWorkflow={handleGenerateWorkflow}
      />

      {/* Prompt Input */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your workflow (e.g., 'When I get an email, save it to Google Sheets and send a Telegram message')"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleGenerateWorkflow()}
              />
            </div>
            <button
              onClick={handleGenerateWorkflow}
              disabled={isGenerating || !prompt.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
            <button
              onClick={handleClear}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
            >
              Clear
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Examples: "When I receive a Gmail, save to Sheets" • "Send Telegram message on new Slack message" • "Post to Slack when database updates"
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Workflow Builder */}
        <div className="flex-1">
          <WorkflowBuilder />
        </div>

        {/* Node Settings Panel */}
        <NodeSettingsPanel />
      </div>

      {/* Terminal Panel */}
      {showTerminal && <TerminalPanel />}
    </div>
  );
};

export default GenerateWorkflow;