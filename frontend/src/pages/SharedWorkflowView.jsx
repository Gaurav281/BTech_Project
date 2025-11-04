// src/pages/SharedWorkflowView.jsx - COMPLETELY FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workflowAPI } from '../api/api';
import WorkflowBuilder from '../components/WorkflowBuilder';
import { FaArrowLeft, FaShare, FaLock, FaEye, FaExclamationTriangle } from 'react-icons/fa';
import useWorkflowStore from '../store/workflowStore';

const SharedWorkflowView = () => {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

   // Get store actions
  const { setNodes, setEdges, setWorkflowName, addTerminalLog } = useWorkflowStore();

  useEffect(() => {
    loadSharedWorkflow();
  }, [id]);

  const loadSharedWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading shared workflow with ID:', id);
      
      const response = await workflowAPI.getSharedWorkflow(id);
      console.log('✅ Shared workflow loaded:', response.data.workflow);
      
      if (response.data.workflow && response.data.workflow.nodes) {
        setWorkflow(response.data.workflow);
      } else {
        throw new Error('Invalid workflow data received');
      }
    } catch (error) {
      console.error('❌ Failed to load shared workflow:', error);
      setError(error.response?.data?.error || 'Failed to load shared workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleUseWorkflow = () => {
    if (workflow) {
      try {
        // Clear any existing workflow in the store
        setNodes([]);
        setEdges([]);
        
        // Set the shared workflow data to the store
        setNodes(workflow.nodes || []);
        setEdges(workflow.edges || []);
        setWorkflowName(`${workflow.name} (Copy)`);
        
        // Add success message
        addTerminalLog(`✅ Shared workflow "${workflow.name}" loaded successfully!`, 'success');
        addTerminalLog('💡 Click "Save" to add this workflow to your account', 'info');
        
        // Navigate to workflow tab
        navigate('/workflow');
        
      } catch (error) {
        console.error('Error loading shared workflow:', error);
        addTerminalLog('❌ Failed to load shared workflow', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared workflow...</p>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Workflow Not Found</h1>
          <p className="text-gray-600 mb-4">
            {error || 'The shared workflow could not be loaded. It may have been deleted or the link may be invalid.'}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={loadSharedWorkflow}
              className="w-full bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FaArrowLeft />
              <span>Back to Home</span>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{workflow.name}</h1>
              {workflow.description && (
                <p className="text-gray-600 mt-1">{workflow.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>Created by: {workflow.createdBy?.name || 'Unknown'}</span>
                {workflow.tags && workflow.tags.length > 0 && (
                  <span>Tags: {workflow.tags.join(', ')}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              <FaEye />
              <span className="text-sm font-medium">Shared View</span>
            </div>
            <button
              onClick={handleUseWorkflow}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FaShare />
              <span>Use This Workflow</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
        <div className="flex items-center justify-center space-x-2">
          <FaLock className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 text-center">
            <strong>Security Notice:</strong> This is a shared workflow view. Sensitive parameters like API keys, credentials, and configuration details are hidden for security purposes.
          </p>
        </div>
      </div>

      {/* Workflow Builder */}
      <div className="flex-1 relative">
        {workflow && workflow.nodes && workflow.nodes.length > 0 ? (
          <div className="absolute inset-0">
            <WorkflowBuilder 
              sharedView={true}
              initialNodes={workflow.nodes || []}
              initialEdges={workflow.edges || []}
              readOnly={true}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FaExclamationTriangle className="text-yellow-500 text-4xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workflow Content</h3>
              <p className="text-gray-600">This shared workflow doesn't contain any nodes or steps.</p>
            </div>
          </div>
        )}
      </div>

      {/* Node Count Info */}
      {workflow && workflow.nodes && workflow.nodes.length > 0 && (
        <div className="fixed bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-sm font-medium">
            {workflow.nodes.length} node{workflow.nodes.length !== 1 ? 's' : ''} • {workflow.edges?.length || 0} connection{workflow.edges?.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedWorkflowView;