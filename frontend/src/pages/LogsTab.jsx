// src/pages/LogsTab.jsx - Updated to show both workflow and script executions
import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaDownload, FaTrash, FaPlay, FaStop, FaClock, FaEye, FaExclamationTriangle, FaCode, FaProjectDiagram } from 'react-icons/fa';
import { workflowAPI, scriptAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const LogsTab = () => {
  const [executions, setExecutions] = useState([]);
  const [scriptExecutions, setScriptExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'workflow', 'script'
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadExecutionLogs();
      loadScriptExecutionLogs();
    }
  }, [isAuthenticated]);

  const loadExecutionLogs = async () => {
    try {
      const response = await workflowAPI.getExecutionLogs();
      const workflowExecutions = (response.data.executions || []).map(exec => ({
        ...exec,
        type: 'workflow'
      }));
      setExecutions(workflowExecutions);
    } catch (error) {
      console.error('Failed to load workflow execution logs:', error);
    }
  };

  const loadScriptExecutionLogs = async () => {
    try {
      // You'll need to add this API endpoint to your scriptAPI
      const response = await scriptAPI.getScriptExecutionLogs();
      const scriptExecs = (response.data.executions || []).map(exec => ({
        ...exec,
        type: 'script'
      }));
      setScriptExecutions(scriptExecs);
    } catch (error) {
      console.error('Failed to load script execution logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Combine both types of executions
  const allExecutions = [...executions, ...scriptExecutions].sort((a, b) => 
    new Date(b.startedAt) - new Date(a.startedAt)
  );

  const filteredExecutions = allExecutions.filter(execution => {
    const matchesFilter = filter === 'all' || execution.status === filter;
    const matchesTab = activeTab === 'all' || execution.type === activeTab;
    const matchesSearch = 
      (execution.workflow?.name?.toLowerCase().includes(search.toLowerCase()) ||
       execution.script?.name?.toLowerCase().includes(search.toLowerCase()) ||
       execution.logs?.some(log => log.message.toLowerCase().includes(search.toLowerCase())));
    
    return matchesFilter && matchesTab && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'stopped': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '🔄';
      case 'stopped': return '⏸️';
      default: return '📝';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'workflow': return <FaProjectDiagram className="text-purple-600" />;
      case 'script': return <FaCode className="text-blue-600" />;
      default: return '📝';
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const viewExecutionDetails = (execution) => {
    setSelectedExecution(execution);
    setShowDetails(true);
  };

  const clearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all execution logs? This action cannot be undone.')) {
      // This would call API endpoints to clear logs
      setExecutions([]);
      setScriptExecutions([]);
      showPopup('🗑️ Execution logs cleared', 'info');
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
    }, 3000);
  };

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
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Execution Logs</h1>
        <p className="text-gray-600 mt-2">Monitor all workflow and script executions</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Executions
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === 'workflow' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaProjectDiagram size={14} />
            <span>Workflows</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === 'script' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaCode size={14} />
            <span>Scripts</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs by name or log message..."
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
              <option value="all">All Status</option>
              <option value="success">✅ Success</option>
              <option value="error">❌ Error</option>
              <option value="running">🔄 Running</option>
              <option value="stopped">⏸️ Stopped</option>
            </select>
            <button 
              onClick={() => {
                loadExecutionLogs();
                loadScriptExecutionLogs();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlay size={14} />
              Refresh
            </button>
            <button 
              onClick={clearLogs}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FaTrash size={14} />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{allExecutions.length}</div>
          <div className="text-sm text-gray-600">Total Executions</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {allExecutions.filter(e => e.status === 'success').length}
          </div>
          <div className="text-sm text-gray-600">Successful</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {allExecutions.filter(e => e.status === 'error').length}
          </div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {allExecutions.filter(e => e.status === 'running').length}
          </div>
          <div className="text-sm text-gray-600">Running</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {allExecutions.filter(e => e.type === 'workflow').length}
          </div>
          <div className="text-sm text-gray-600">Workflows</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {allExecutions.filter(e => e.type === 'script').length}
          </div>
          <div className="text-sm text-gray-600">Scripts</div>
        </div>
      </div>

      {/* Logs Table */}
      {filteredExecutions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FaClock className="mx-auto text-gray-400 text-4xl mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No execution logs found</h3>
          <p className="text-gray-600 mb-4">
            {allExecutions.length === 0 
              ? 'Execute your first workflow or script to see logs here!' 
              : 'No logs match your search criteria.'}
          </p>
          {allExecutions.length === 0 && (
            <div className="flex space-x-4 justify-center">
              <a
                href="/workflow"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <FaProjectDiagram className="mr-2" />
                Create Workflow
              </a>
              <a
                href="/script"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaCode className="mr-2" />
                Create Script
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExecutions.map((execution) => (
                  <tr key={execution._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(execution.type)}
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {execution.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {execution.workflow?.name || execution.script?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(execution.status)}`}>
                        {getStatusIcon(execution.status)} {execution.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(execution.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(execution.duration)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      <div className="truncate">
                        {execution.logs && execution.logs.length > 0 
                          ? execution.logs[execution.logs.length - 1].message
                          : 'No messages'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewExecutionDetails(execution)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <FaEye size={12} />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Execution Details Modal */}
      {showDetails && selectedExecution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedExecution.type === 'workflow' ? 'Workflow' : 'Script'} Execution Details: {selectedExecution.workflow?.name || selectedExecution.script?.name || 'Unknown'}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <div className="mt-1 text-sm text-gray-900 capitalize flex items-center space-x-2">
                    {getTypeIcon(selectedExecution.type)}
                    <span>{selectedExecution.type}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedExecution.status)}`}>
                    {getStatusIcon(selectedExecution.status)} {selectedExecution.status}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Duration</label>
                  <div className="mt-1 text-sm text-gray-900">{formatDuration(selectedExecution.duration)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Started</label>
                  <div className="mt-1 text-sm text-gray-900">{new Date(selectedExecution.startedAt).toLocaleString()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Completed</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {selectedExecution.completedAt ? new Date(selectedExecution.completedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Execution Logs</h4>
                <div className="space-y-2">
                  {selectedExecution.logs && selectedExecution.logs.length > 0 ? (
                    selectedExecution.logs.map((log, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${
                        log.level === 'error' ? 'bg-red-50 border-red-200' :
                        log.level === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${
                                log.level === 'error' ? 'text-red-800' :
                                log.level === 'warning' ? 'text-yellow-800' :
                                'text-gray-800'
                              }`}>
                                {log.level.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                              {log.nodeId && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Node: {log.nodeId}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm ${
                              log.level === 'error' ? 'text-red-700' :
                              log.level === 'warning' ? 'text-yellow-700' :
                              'text-gray-700'
                            }`}>
                              {log.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No logs available for this execution
                    </div>
                  )}
                </div>
              </div>

              {selectedExecution.error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaExclamationTriangle className="text-red-600" />
                    <h4 className="text-md font-semibold text-red-800">Error Details</h4>
                  </div>
                  <p className="text-sm text-red-700">{selectedExecution.error}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsTab;