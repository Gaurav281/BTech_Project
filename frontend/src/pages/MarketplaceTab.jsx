import React, { useState, useEffect } from 'react';
import { FaSearch, FaStar, FaDownload, FaEye, FaUser, FaPlay, FaTrash, FaFileExport, FaCode, FaCopy } from 'react-icons/fa';
import { workflowAPI, scriptAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const MarketplaceTab = () => {
  const [workflows, setWorkflows] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [activeTab, setActiveTab] = useState('workflows'); // 'workflows' or 'scripts'
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadPublicContent();
    }
  }, [isAuthenticated]);

  const loadPublicContent = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading public content...');
      
      // Load both workflows and scripts
      const [workflowsResponse, scriptsResponse] = await Promise.all([
        workflowAPI.getPublicWorkflows(),
        scriptAPI.getPublicScripts()
      ]);
      
      console.log('📦 Workflows response:', workflowsResponse.data);
      console.log('📦 Scripts response:', scriptsResponse.data);
      
      setWorkflows(workflowsResponse.data.workflows || []);
      setScripts(scriptsResponse.data.scripts || []);
    } catch (error) {
      console.error('❌ Failed to load public content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadWorkflow = async (workflow) => {
    try {
      await workflowAPI.downloadWorkflow(workflow._id);
      
      const workflowData = {
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        tags: workflow.tags,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        exportedFrom: 'WorkflowAI Marketplace',
        originalAuthor: workflow.createdBy?.name || 'Unknown'
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

      showNotification('📥 Workflow downloaded successfully!', 'success');
      loadPublicContent();
      
    } catch (error) {
      console.error('Download error:', error);
      showNotification('❌ Failed to download workflow', 'error');
    }
  };

  const handleUseScript = async (scriptId) => {
    try {
      const response = await scriptAPI.useScript(scriptId);
      showNotification('✅ Script imported successfully! Check your Script tab.', 'success');
      loadPublicContent();
    } catch (error) {
      console.error('Failed to import script:', error);
      showNotification('❌ Failed to import script', 'error');
    }
  };

  const handleUseWorkflow = async (workflowId) => {
    try {
      await workflowAPI.useWorkflow(workflowId);
      showNotification('✅ Workflow imported successfully! Check your History tab.', 'success');
    } catch (error) {
      console.error('Failed to import workflow:', error);
      showNotification('❌ Failed to import workflow', 'error');
    }
  };

  const handleDeleteWorkflow = async (workflowId, workflowName) => {
    if (!window.confirm(`Are you sure you want to delete "${workflowName}"? This action cannot be undone.`)) return;
    
    try {
      console.log('🗑️ Deleting workflow:', workflowId);
      await workflowAPI.deleteWorkflow(workflowId);
      showNotification('✅ Workflow deleted successfully!', 'success');
      setWorkflows(workflows.filter(w => w._id !== workflowId));
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      showNotification('❌ Failed to delete workflow', 'error');
    }
  };

  const handleDeleteScript = async (scriptId, scriptName) => {
    if (!window.confirm(`Are you sure you want to delete "${scriptName}"? This action cannot be undone.`)) return;
    
    try {
      console.log('🗑️ Deleting script:', scriptId);
      await scriptAPI.deleteScript(scriptId);
      showNotification('✅ Script deleted successfully!', 'success');
      setScripts(scripts.filter(s => s._id !== scriptId));
    } catch (error) {
      console.error('Failed to delete script:', error);
      showNotification('❌ Failed to delete script', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    const popup = document.createElement('div');
    popup.className = `fixed top-4 right-4 ${
      type === 'error' ? 'bg-red-500' : 
      type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    } text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out`;
    popup.textContent = message;
    document.body.appendChild(popup);
    
    setTimeout(() => {
      document.body.removeChild(popup);
    }, 3000);
  };

  const isContentOwner = (content) => {
    if (!user || !content.createdBy) return false;
    
    const userId = user.id || user._id;
    const ownerId = content.createdBy._id || content.createdBy.id;
    
    const isOwner = userId && ownerId && userId.toString() === ownerId.toString();
    
    console.log('🔍 Ownership check:', {
      content: content.name,
      userId,
      ownerId,
      isOwner
    });
    
    return isOwner;
  };

  const getLanguageColor = (language) => {
    const colors = {
      python: 'bg-blue-100 text-blue-800',
      javascript: 'bg-yellow-100 text-yellow-800',
      html: 'bg-orange-100 text-orange-800',
      cpp: 'bg-purple-100 text-purple-800',
      java: 'bg-red-100 text-red-800',
      php: 'bg-indigo-100 text-indigo-800'
    };
    return colors[language] || 'bg-gray-100 text-gray-800';
  };

  // Combine tags from both workflows and scripts
  const allTags = ['all', ...new Set([
    ...workflows.flatMap(wf => wf.tags || []),
    ...scripts.flatMap(script => script.tags || [])
  ])];

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(search.toLowerCase()) ||
                         workflow.description?.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === 'all' || (workflow.tags && workflow.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  const filteredScripts = scripts.filter(script => {
    const matchesSearch = script.name.toLowerCase().includes(search.toLowerCase()) ||
                         script.description?.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === 'all' || (script.tags && script.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  const getContentCount = () => {
    return activeTab === 'workflows' ? filteredWorkflows.length : filteredScripts.length;
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
        <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-600 mt-2">Discover and use workflows and scripts created by the community</p>
        <div className="flex space-x-4 mt-4 text-sm text-gray-500">
          <span>Workflows: {workflows.length}</span>
          <span>Scripts: {scripts.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'workflows'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Workflows ({workflows.length})
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'scripts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Scripts ({scripts.length})
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allTags.map(tag => (
              <option key={tag} value={tag}>
                {tag === 'all' ? 'All Tags' : tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {getContentCount() === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FaEye className="mx-auto text-gray-400 text-4xl mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No public {activeTab} found
          </h3>
          <p className="text-gray-600 mb-4">
            {activeTab === 'workflows' && workflows.length === 0 
              ? 'Be the first to publish a workflow to the marketplace!' 
              : activeTab === 'scripts' && scripts.length === 0
              ? 'Be the first to publish a script to the marketplace!'
              : 'No content matches your search criteria.'}
          </p>
          {((activeTab === 'workflows' && workflows.length === 0) || 
            (activeTab === 'scripts' && scripts.length === 0)) && (
            <a
              href={activeTab === 'workflows' ? '/workflow' : '/script'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create {activeTab === 'workflows' ? 'Workflow' : 'Script'}
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'workflows' ? (
            // Workflows Grid
            filteredWorkflows.map((workflow) => {
              const isOwner = isContentOwner(workflow);
              
              return (
                <div key={workflow._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 truncate flex-1 mr-2">
                        {workflow.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                          Public
                        </span>
                        {isOwner && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                            Owner
                          </span>
                        )}
                      </div>
                    </div>

                    {workflow.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {workflow.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <FaUser size={12} />
                        <span>{workflow.createdBy?.name || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FaDownload size={12} />
                        <span>{workflow.downloadCount || 0}</span>
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

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUseWorkflow(workflow._id)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <FaPlay size={12} />
                        <span>Use Workflow</span>
                      </button>
                      
                      <button
                        onClick={() => handleDownloadWorkflow(workflow)}
                        className="flex items-center justify-center bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        title="Download as JSON"
                      >
                        <FaFileExport size={12} />
                      </button>
                      
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteWorkflow(workflow._id, workflow.name)}
                          className="flex items-center justify-center bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          title="Delete Workflow"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // Scripts Grid
            filteredScripts.map((script) => {
              const isOwner = isContentOwner(script);
              
              return (
                <div key={script._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 truncate flex-1 mr-2">
                        {script.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLanguageColor(script.language)} shrink-0`}>
                          {script.language}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                          Public
                        </span>
                        {isOwner && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                            Owner
                          </span>
                        )}
                      </div>
                    </div>

                    {script.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {script.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <FaUser size={12} />
                        <span>{script.createdBy?.name || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FaDownload size={12} />
                        <span>{script.downloadCount || 0}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-4">
                      <div className="flex items-center space-x-2">
                        <span>Lines: {script.script?.split('\n').length || 0}</span>
                        <span>•</span>
                        <span>Parameters: {script.parameters?.length || 0}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUseScript(script._id)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <FaCopy size={12} />
                        <span>Use Script</span>
                      </button>
                      
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteScript(script._id, script.name)}
                          className="flex items-center justify-center bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          title="Delete Script"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default MarketplaceTab;