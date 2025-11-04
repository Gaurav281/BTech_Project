// src/pages/HostedWorkflows.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { 
  FaPlay, 
  FaStop, 
  FaTrash, 
  FaEdit, 
  FaCloud, 
  FaSync,
  FaHistory,
  FaChartLine,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import { workflowAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const HostedWorkflows = () => {
  const [hostedWorkflows, setHostedWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [executionLogs, setExecutionLogs] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    loadHostedWorkflows();
  }, []);

 // src/pages/HostedWorkflows.jsx - FIXED loadHostedWorkflows function
const loadHostedWorkflows = async () => {
  try {
    setLoading(true);
    // Get all user workflows and filter hosted ones
    const response = await workflowAPI.getWorkflows();
    const hostedWorkflows = response.data.workflows.filter(w => w.isActive === true);
    setHostedWorkflows(hostedWorkflows);
  } catch (error) {
    console.error('Failed to load hosted workflows:', error);
    setHostedWorkflows([]);
  } finally {
    setLoading(false);
  }
};

  const loadExecutionLogs = async (workflowId) => {
    try {
      const response = await workflowAPI.getExecutions(workflowId);
      setExecutionLogs(prev => ({
        ...prev,
        [workflowId]: response.data.executions || []
      }));
    } catch (error) {
      console.error('Failed to load execution logs:', error);
    }
  };

  const handleHostWorkflow = async (workflowData) => {
    try {
      // First save the workflow
      const saveResponse = await workflowAPI.saveWorkflow(workflowData);
      const workflowId = saveResponse.data.workflow._id;
      
      // Then host it - FIXED: Use the correct host endpoint
      await workflowAPI.hostWorkflow(workflowId, {
        startImmediately: true
      });

      await loadHostedWorkflows();
      showPopup('✅ Workflow hosted successfully!', 'success');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to host workflow:', error);
      showPopup('❌ Failed to host workflow', 'error');
    }
  };

 const handleStopWorkflow = async (workflowId) => {
  try {
    // Stop the workflow without deleting it
    await workflowAPI.stopHostedWorkflow(workflowId);
    
    // Update local state to reflect stopped status
    setHostedWorkflows(prev => 
      prev.map(w => w._id === workflowId ? { ...w, isActive: false } : w)
    );
    
    showPopup('⏹️ Workflow stopped successfully', 'info');
  } catch (error) {
    console.error('Failed to stop workflow:', error);
    showPopup('❌ Failed to stop workflow', 'error');
  }
};

  const handleDeleteWorkflow = async (workflowId) => {
    if (window.confirm('Are you sure you want to delete this hosted workflow?')) {
      try {
        await workflowAPI.deleteWorkflow(workflowId);
        await loadHostedWorkflows();
        showPopup('🗑️ Workflow deleted', 'info');
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        showPopup('❌ Failed to delete workflow', 'error');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <FaCheckCircle className="text-green-500" />;
      case 'stopped': return <FaExclamationTriangle className="text-yellow-500" />;
      case 'error': return <FaExclamationTriangle className="text-red-500" />;
      default: return <FaClock className="text-gray-500" />;
    }
  };

  const showPopup = (message, type = 'info') => {
    const popup = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
      type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

    popup.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out font-semibold text-sm md:text-base`;
    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hosted Workflows</h1>
              <p className="text-gray-600 mt-2">
                Workflows that run continuously in the cloud
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FaCloud />
              <span>Host New Workflow</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hosted</p>
                <p className="text-2xl font-bold text-gray-900">{hostedWorkflows.length}</p>
              </div>
              <FaCloud className="text-blue-500 text-xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Running</p>
                <p className="text-2xl font-bold text-gray-900">
                  {hostedWorkflows.filter(w => w.isActive).length}
                </p>
              </div>
              <FaPlay className="text-green-500 text-xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stopped</p>
                <p className="text-2xl font-bold text-gray-900">
                  {hostedWorkflows.filter(w => !w.isActive).length}
                </p>
              </div>
              <FaStop className="text-yellow-500 text-xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Executions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {hostedWorkflows.reduce((total, w) => total + (w.executionCount || 0), 0)}
                </p>
              </div>
              <FaHistory className="text-purple-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Workflows List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {hostedWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <FaCloud className="mx-auto text-gray-400 text-4xl mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hosted workflows yet
              </h3>
              <p className="text-gray-600 mb-4">
                Host your first workflow to run it continuously in the cloud
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Host Your First Workflow
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Workflow
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Execution
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Executions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hostedWorkflows.map((workflow) => (
                    <tr key={workflow._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {workflow.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {workflow.description || 'No description'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workflow.isActive ? 'running' : 'stopped')}`}>
                          {getStatusIcon(workflow.isActive ? 'running' : 'stopped')}
                          <span className="ml-1">
                            {workflow.isActive ? 'Running' : 'Stopped'}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {workflow.lastExecuted ? 
                          new Date(workflow.lastExecuted).toLocaleString() : 
                          'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {workflow.executionCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {workflow.isActive ? (
                          <button
                            onClick={() => handleStopWorkflow(workflow._id)}
                            className="text-yellow-600 hover:text-yellow-900 flex items-center space-x-1"
                          >
                            <FaStop size={12} />
                            <span>Stop</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleHostWorkflow(workflow)}
                            className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                          >
                            <FaPlay size={12} />
                            <span>Start</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteWorkflow(workflow._id)}
                          className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                        >
                          <FaTrash size={12} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Hosted Workflow Modal */}
      {showCreateModal && (
        <CreateHostedWorkflowModal
          onClose={() => setShowCreateModal(false)}
          onHost={handleHostWorkflow}
        />
      )}
    </div>
  );
};

// Modal component for creating hosted workflows
const CreateHostedWorkflowModal = ({ onClose, onHost }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startImmediately: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onHost(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 md:w-96 max-w-md">
        <h3 className="text-lg font-semibold mb-4">Host New Workflow</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workflow Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter workflow name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what this workflow does..."
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.startImmediately}
                onChange={(e) => setFormData(prev => ({ ...prev, startImmediately: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Start workflow immediately</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Host Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HostedWorkflows;