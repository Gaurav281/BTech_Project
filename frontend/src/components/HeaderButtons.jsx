import React from 'react';
import { 
  FaPlay, 
  FaStop, 
  FaDownload, 
  FaUpload, 
  FaTerminal,
  FaSave 
} from 'react-icons/fa';
import useWorkflowStore from '../store/workflowStore';
import { workflowAPI } from '../api/api';

const HeaderButtons = ({ onToggleTerminal, showTerminal, onGenerateWorkflow }) => {
  const { 
    nodes, 
    edges, 
    setIsRunning, 
    isRunning, 
    workflowName,
    setWorkflowName,
    addTerminalLog 
  } = useWorkflowStore();

  const handleStart = async () => {
    if (nodes.length === 0) {
      addTerminalLog('No workflow to run. Please generate a workflow first.', 'error');
      return;
    }

    setIsRunning(true);
    addTerminalLog('Starting workflow execution...');

    try {
      const response = await workflowAPI.executeWorkflow({ nodes, edges });
      addTerminalLog('Workflow executed successfully!');
      addTerminalLog(`Result: ${response.data.result}`);
    } catch (error) {
      addTerminalLog(`Error executing workflow: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    addTerminalLog('Workflow execution stopped.');
  };

  const handleExport = () => {
    const workflowData = {
      name: workflowName,
      nodes,
      edges,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(workflowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflowName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addTerminalLog(`Workflow exported as ${link.download}`);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflowData = JSON.parse(e.target.result);
        useWorkflowStore.setState({
          nodes: workflowData.nodes || [],
          edges: workflowData.edges || [],
          workflowName: workflowData.name || 'Imported Workflow'
        });
        addTerminalLog(`Workflow "${workflowData.name}" imported successfully`);
      } catch (error) {
        addTerminalLog('Error importing workflow: Invalid file format', 'error');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleSave = async () => {
    try {
      await workflowAPI.saveWorkflow({
        name: workflowName,
        nodes,
        edges
      });
      addTerminalLog('Workflow saved successfully!');
    } catch (error) {
      addTerminalLog(`Error saving workflow: ${error.message}`, 'error');
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            placeholder="Workflow Name"
          />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onGenerateWorkflow}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
          >
            <FaPlay size={14} />
            <span>Generate Workflow</span>
          </button>

          <button
            onClick={handleStart}
            disabled={isRunning || nodes.length === 0}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <FaPlay size={14} />
            <span>Start</span>
          </button>

          <button
            onClick={handleStop}
            disabled={!isRunning}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <FaStop size={14} />
            <span>Stop</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaSave size={14} />
            <span>Save</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FaDownload size={14} />
            <span>Export</span>
          </button>

          <label className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors cursor-pointer">
            <FaUpload size={14} />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          <button
            onClick={onToggleTerminal}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showTerminal 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <FaTerminal size={14} />
            <span>Terminal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderButtons;