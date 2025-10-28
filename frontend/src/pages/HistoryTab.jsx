import React, { useState, useEffect } from 'react';
import { FaPlay, FaTrash, FaEye, FaCalendar, FaClock, FaStop, FaEdit, FaDownload, FaTerminal, FaSearch, FaFilter, FaChartBar } from 'react-icons/fa';
import { workflowAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useWorkflowStore from '../store/workflowStore';
import TerminalPanel from '../components/TerminalPanel';

const HistoryTab = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [runningWorkflows, setRunningWorkflows] = useState(new Set());
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { addTerminalLog } = useWorkflowStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkflows();
    }
  }, [isAuthenticated]);

  const loadWorkflows = async () => {
    try {
      const response = await workflowAPI.getWorkflows();
      setWorkflows(response.data.workflows || []);
      addTerminalLog('✅ Workflows loaded successfully');
    } catch (error) {
      console.error('Failed to load workflows:', error);
      addTerminalLog(`❌ Failed to load workflows: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showPopup = (message, type = 'info') => {
    const popup = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

    popup.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out font-semibold`;
    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 4000);
  };

  const handleStopExecution = async (workflowId, workflowName) => {
    try {
      addTerminalLog(`🛑 Stopping execution for: ${workflowName}`);
      // Add API call to stop workflow execution
      setRunningWorkflows(prev => {
        const newSet = new Set(prev);
        newSet.delete(workflowId);
        return newSet;
      });
      showPopup('🛑 Workflow execution stopped', 'warning');
    } catch (error) {
      console.error('Failed to stop workflow:', error);
      addTerminalLog(`❌ Failed to stop workflow: ${error.message}`, 'error');
    }
  };

  const handleExecute = async (workflowId, workflowName) => {
    try {
      // Add to running workflows immediately
      setRunningWorkflows(prev => new Set(prev).add(workflowId));
      
      addTerminalLog(`🚀 Executing workflow: ${workflowName}`);
      const response = await workflowAPI.executeWorkflow(workflowId);

      addTerminalLog('✅ Workflow execution started successfully!');
      addTerminalLog(`📋 Execution ID: ${response.data.executionId}`);
      showPopup('🚀 Workflow execution started!', 'success');

      // Don't remove from running workflows - let it run continuously
      // The workflow will keep running until manually stopped

    } catch (error) {
      console.error('Failed to execute workflow:', error);
      const errorMsg = error.response?.data?.error || error.message;
      const errorDetails = error.response?.data?.details || [];

      addTerminalLog(`❌ Failed to execute workflow: ${errorMsg}`, 'error');

      // Remove from running workflows on error
      setRunningWorkflows(prev => {
        const newSet = new Set(prev);
        newSet.delete(workflowId);
        return newSet;
      });

      // Log detailed errors
      if (errorDetails.length > 0) {
        errorDetails.forEach(detail => {
          addTerminalLog(`   • ${detail}`, 'error');
        });
      }

      showPopup(`❌ Failed to start workflow: ${errorMsg}`, 'error');
    }
  };

  const handleDelete = async (workflowId, workflowName) => {
    if (!window.confirm(`Are you sure you want to delete "${workflowName}"?`)) return;

    try {
      await workflowAPI.deleteWorkflow(workflowId);
      setWorkflows(workflows.filter(w => w._id !== workflowId));
      addTerminalLog(`🗑️ Workflow "${workflowName}" deleted successfully`);
      showPopup('✅ Workflow deleted successfully!', 'success');
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      const errorMsg = error.response?.data?.error || error.message;
      addTerminalLog(`❌ Failed to delete workflow: ${errorMsg}`, 'error');
      showPopup(`❌ Failed to delete workflow: ${errorMsg}`, 'error');
    }
  };

  const handleUseWorkflow = async (workflow) => {
    try {
      addTerminalLog(`📂 Loading workflow: ${workflow.name}`);

      // Load the specific workflow with proper parameter handling
      const response = await workflowAPI.getWorkflow(workflow._id);
      const workflowData = response.data.workflow;

      // Set the workflow in the store with proper parameters
      useWorkflowStore.setState({
        nodes: workflowData.nodes || [],
        edges: workflowData.edges || [],
        workflowName: `${workflowData.name} (Copy)`,
        selectedNode: null,
        showTerminal: true
      });

      addTerminalLog(`✅ Workflow "${workflowData.name}" loaded successfully`);
      showPopup('✅ Workflow loaded in editor!', 'success');
      navigate('/workflow');

    } catch (error) {
      console.error('Failed to load workflow:', error);
      const errorMsg = error.response?.data?.error || error.message;
      addTerminalLog(`❌ Failed to load workflow: ${errorMsg}`, 'error');
      showPopup(`❌ Failed to load workflow: ${errorMsg}`, 'error');
    }
  };

  const handleExport = (workflow) => {
    try {
      const workflowData = {
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        tags: workflow.tags,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        exportedFrom: 'WorkflowAI'
      };

      const dataStr = JSON.stringify(workflowData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workflow.name.replace(/\s+/g, '_')}_${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addTerminalLog(`📥 Workflow "${workflow.name}" exported successfully`);
      showPopup('📥 Workflow exported successfully!', 'success');

    } catch (error) {
      console.error('Export failed:', error);
      addTerminalLog(`❌ Export failed: ${error.message}`, 'error');
      showPopup('❌ Failed to export workflow', 'error');
    }
  };

  const handleViewDetails = (workflow) => {
  try {
    // Create a detailed string with all workflow information
    const details = `
📋 Workflow Details for "${workflow.name}":
────────────────────────────────
• Name: ${workflow.name}
• Description: ${workflow.description || 'No description'}
• Created: ${new Date(workflow.createdAt).toLocaleString()}
• Updated: ${new Date(workflow.updatedAt).toLocaleString()}
• Nodes: ${workflow.nodes?.length || 0}
• Connections: ${workflow.edges?.length || 0}
• Executions: ${workflow.executionCount || 0}
• Last Executed: ${workflow.lastExecuted ? new Date(workflow.lastExecuted).toLocaleString() : 'Never'}
• Status: ${workflow.isPublic ? 'Public' : 'Private'}
${workflow.tags?.length ? `• Tags: ${workflow.tags.join(', ')}` : ''}
• Workflow ID: ${workflow._id}
    `.trim();
    
    // Log the entire details as a single message to prevent truncation
    alert(details);
    addTerminalLog(details, 'info');
    
    // Show success popup
    showPopup('📋 Workflow details logged in terminal', 'success');
    
  } catch (error) {
    console.error('Error viewing workflow details:', error);
    addTerminalLog(`❌ Error viewing workflow details: ${error.message}`, 'error');
  }
};

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Calculate statistics
  const getStatistics = () => {
    const totalWorkflows = workflows.length;
    const publicWorkflows = workflows.filter(w => w.isPublic).length;
    const privateWorkflows = totalWorkflows - publicWorkflows;
    const totalExecutions = workflows.reduce((total, w) => total + (w.executionCount || 0), 0);
    const totalNodes = workflows.reduce((total, w) => total + (w.nodes?.length || 0), 0);
    const avgNodesPerWorkflow = totalWorkflows > 0 ? (totalNodes / totalWorkflows).toFixed(1) : 0;
    const mostUsedService = getMostUsedService();

    return {
      totalWorkflows,
      publicWorkflows,
      privateWorkflows,
      totalExecutions,
      totalNodes,
      avgNodesPerWorkflow,
      mostUsedService
    };
  };

  const getMostUsedService = () => {
    const serviceCount = {};
    workflows.forEach(workflow => {
      workflow.nodes?.forEach(node => {
        if (node.data.service && node.data.service !== 'trigger') {
          serviceCount[node.data.service] = (serviceCount[node.data.service] || 0) + 1;
        }
      });
    });

    const mostUsed = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0];
    return mostUsed ? { service: mostUsed[0], count: mostUsed[1] } : null;
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesFilter = filter === 'all' ||
      (filter === 'public' && workflow.isPublic) ||
      (filter === 'private' && !workflow.isPublic);
    const matchesSearch = workflow.name.toLowerCase().includes(search.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(search.toLowerCase()) ||
      workflow.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const stats = getStatistics();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Workflow History</h1>
                <p className="text-gray-600 mt-2">Manage and execute your saved workflows</p>
              </div>
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${showTerminal
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
              >
                <FaTerminal size={14} />
                <span>Terminal</span>
              </button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search workflows by name, description, or tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Workflows</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
                <button
                  onClick={loadWorkflows}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaSearch size={14} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Section - ALWAYS SHOW */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FaChartBar className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Workflow Statistics</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalWorkflows}</div>
                <div className="text-sm text-gray-600">Total Workflows</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.publicWorkflows}</div>
                <div className="text-sm text-gray-600">Public</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.privateWorkflows}</div>
                <div className="text-sm text-gray-600">Private</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.totalExecutions}</div>
                <div className="text-sm text-gray-600">Total Executions</div>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{stats.totalNodes}</div>
                <div className="text-sm text-gray-600">Total Nodes</div>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-lg">
                <div className="text-2xl font-bold text-pink-600">{stats.avgNodesPerWorkflow}</div>
                <div className="text-sm text-gray-600">Avg Nodes/Workflow</div>
              </div>
            </div>
            {stats.mostUsedService && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Most used service: <span className="font-semibold text-blue-600">{stats.mostUsedService.service}</span>
                  ({stats.mostUsedService.count} nodes)
                </p>
              </div>
            )}
          </div>

          {filteredWorkflows.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FaCalendar className="mx-auto text-gray-400 text-4xl mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {workflows.length === 0 ? 'No workflows yet' : 'No matching workflows found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {workflows.length === 0
                  ? 'Create your first workflow to get started'
                  : 'Try adjusting your search criteria'}
              </p>
              {workflows.length === 0 && (
                <a
                  href="/workflow"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Workflow
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {filteredWorkflows.map((workflow) => (
                <div key={workflow._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-2">
                        {workflow.name}
                      </h3>
                      {workflow.isPublic && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                          Public
                        </span>
                      )}
                    </div>

                    {workflow.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {workflow.description}
                      </p>
                    )}

                    <div className="space-y-2 text-xs text-gray-500 mb-4">
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{formatDate(workflow.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Updated:</span>
                        <span>{formatDate(workflow.updatedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Executions:</span>
                        <span className="flex items-center space-x-1">
                          <FaPlay size={10} />
                          <span>{workflow.executionCount || 0}</span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nodes:</span>
                        <span>{workflow.nodes?.length || 0}</span>
                      </div>
                    </div>

                    {workflow.tags && workflow.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {workflow.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUseWorkflow(workflow)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        title="Use Workflow"
                      >
                        <FaEdit size={12} />
                        <span>Use</span>
                      </button>
                      {runningWorkflows.has(workflow._id) ? (
                        <button
                          onClick={() => handleStopExecution(workflow._id, workflow.name)}
                          className="flex items-center justify-center space-x-2 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          title="Stop Workflow"
                        >
                          <FaStop size={12} />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleExecute(workflow._id, workflow.name)}
                          className="flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          title="Execute Workflow"
                        >
                          <FaPlay size={12} />
                          <span>Run</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleExport(workflow)}
                        className="flex items-center justify-center bg-yellow-600 text-white py-2 px-3 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                        title="Export Workflow"
                      >
                        <FaDownload size={12} />
                      </button>
                      <button
                        onClick={() => handleViewDetails(workflow)}
                        className="flex items-center justify-center bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        title="View Details"
                      >
                        <FaEye size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(workflow._id, workflow.name)}
                        className="flex items-center justify-center bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        title="Delete Workflow"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Terminal Panel */}
      {showTerminal && (
        <div className="border-t border-gray-300 bg-gray-900">
          <TerminalPanel />
        </div>
      )}
    </div>
  );
};

export default HistoryTab;