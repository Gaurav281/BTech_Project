
//src/components/HostedScriptPanel.jsx
import React, { useState, useEffect } from 'react';
import { FaGlobe, FaPlay, FaStop, FaCopy, FaEdit, FaTrash, FaEye, FaPause, FaSync } from 'react-icons/fa';
import { hostedScriptsAPI } from '../api/api';

const HostedScriptsPanel = () => {
  const [hostedScripts, setHostedScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState(null);

  useEffect(() => {
    loadHostedScripts();
  }, []);

  const loadHostedScripts = async () => {
    try {
      const response = await hostedScriptsAPI.getMyScripts();
      setHostedScripts(response.data.hostedScripts || []);
    } catch (error) {
      console.error('Failed to load hosted scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleScriptActivity = async (scriptId, currentStatus) => {
    try {
      await hostedScriptsAPI.toggleScript(scriptId);
      setHostedScripts(prev => prev.map(script => 
        script._id === scriptId 
          ? { ...script, isActive: !currentStatus }
          : script
      ));
    } catch (error) {
      console.error('Failed to toggle script:', error);
    }
  };

  const deleteScript = async (scriptId) => {
    if (!window.confirm('Are you sure you want to delete this hosted script?')) return;
    
    try {
      await hostedScriptsAPI.deleteScript(scriptId);
      setHostedScripts(prev => prev.filter(script => script._id !== scriptId));
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Show success message
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Hosted Scripts</h3>
        <p className="text-gray-600 text-sm">Your scripts running as web services</p>
      </div>

      {hostedScripts.length === 0 ? (
        <div className="p-8 text-center">
          <FaGlobe className="mx-auto text-gray-400 text-4xl mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No hosted scripts yet</h4>
          <p className="text-gray-600 mb-4">Host your first script to create a web service</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {hostedScripts.map((script) => (
            <div key={script._id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{script.name}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      script.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {script.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {script.schedule.enabled && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FaSync className="mr-1" size={10} />
                        Scheduled
                      </span>
                    )}
                  </div>
                  
                  {script.description && (
                    <p className="text-gray-600 text-sm mb-3">{script.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <FaGlobe size={12} />
                      <span>{script.language}</span>
                    </span>
                    <span>Executions: {script.executionCount}</span>
                    {script.lastExecution && (
                      <span>Last: {new Date(script.lastExecution).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(script.url)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Copy URL"
                  >
                    <FaCopy size={12} />
                    <span>Copy URL</span>
                  </button>
                  
                  <button
                    onClick={() => toggleScriptActivity(script._id, script.isActive)}
                    className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      script.isActive
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {script.isActive ? <FaPause size={12} /> : <FaPlay size={12} />}
                    <span>{script.isActive ? 'Pause' : 'Activate'}</span>
                  </button>

                  <button
                    onClick={() => deleteScript(script._id)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>

              {/* URL Display */}
              <div className="bg-gray-50 p-3 rounded-lg mb-3">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-700 break-all">{script.url}</code>
                  <button
                    onClick={() => copyToClipboard(script.url)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <FaCopy size={14} />
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(script.url, '_blank')}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <FaEye size={12} />
                  <span>Test Endpoint</span>
                </button>
                
                {script.schedule.enabled && (
                  <span className="inline-flex items-center px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded">
                    <FaSync className="mr-1" size={10} />
                    Schedule: {script.schedule.cronExpression}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HostedScriptsPanel;