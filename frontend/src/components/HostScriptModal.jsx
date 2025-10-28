//src/components/HostedScriptModal.jsx
import React, { useState } from 'react';
import { FaGlobe, FaClock, FaBan, FaPlay, FaStop, FaCopy, FaEdit } from 'react-icons/fa';

const HostScriptModal = ({ isOpen, onClose, script, language, onHostScript }) => {
  const [hostConfig, setHostConfig] = useState({
    name: script?.name || 'My Hosted Script',
    description: script?.description || '',
    environment: {},
    rateLimit: { enabled: false, requestsPerMinute: 60 },
    schedule: { enabled: false, cronExpression: '' }
  });

  const [newEnvVar, setNewEnvVar] = useState({ key: '', value: '' });

  if (!isOpen) return null;

  const addEnvironmentVariable = () => {
    if (newEnvVar.key && newEnvVar.value) {
      setHostConfig(prev => ({
        ...prev,
        environment: {
          ...prev.environment,
          [newEnvVar.key]: newEnvVar.value
        }
      }));
      setNewEnvVar({ key: '', value: '' });
    }
  };

  const removeEnvironmentVariable = (key) => {
    setHostConfig(prev => {
      const newEnv = { ...prev.environment };
      delete newEnv[key];
      return { ...prev, environment: newEnv };
    });
  };

  const handleSubmit = () => {
    onHostScript({
      ...hostConfig,
      script: script.script,
      language: language
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Host Script</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Script Name
            </label>
            <input
              type="text"
              value={hostConfig.name}
              onChange={(e) => setHostConfig(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter script name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={hostConfig.description}
              onChange={(e) => setHostConfig(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what this script does"
            />
          </div>

          {/* Environment Variables */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Environment Variables
              </label>
              <span className="text-xs text-gray-500">Secure configuration</span>
            </div>
            
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newEnvVar.key}
                onChange={(e) => setNewEnvVar(prev => ({ ...prev, key: e.target.value }))}
                placeholder="Variable name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newEnvVar.value}
                onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Value"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addEnvironmentVariable}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>

            {Object.keys(hostConfig.environment).length > 0 && (
              <div className="space-y-2">
                {Object.entries(hostConfig.environment).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div>
                      <span className="font-mono text-sm">{key}</span>
                      <span className="text-gray-500 mx-2">→</span>
                      <span className="font-mono text-sm">••••••••</span>
                    </div>
                    <button
                      onClick={() => removeEnvironmentVariable(key)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rate Limiting */}
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                checked={hostConfig.rateLimit.enabled}
                onChange={(e) => setHostConfig(prev => ({
                  ...prev,
                  rateLimit: { ...prev.rateLimit, enabled: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Enable Rate Limiting
              </label>
            </div>
            
            {hostConfig.rateLimit.enabled && (
              <div className="ml-6">
                <label className="block text-sm text-gray-600 mb-2">
                  Requests per minute
                </label>
                <input
                  type="number"
                  value={hostConfig.rateLimit.requestsPerMinute}
                  onChange={(e) => setHostConfig(prev => ({
                    ...prev,
                    rateLimit: { ...prev.rateLimit, requestsPerMinute: parseInt(e.target.value) }
                  }))}
                  min="1"
                  max="1000"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Scheduling */}
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                checked={hostConfig.schedule.enabled}
                onChange={(e) => setHostConfig(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, enabled: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Enable Scheduled Execution
              </label>
            </div>
            
            {hostConfig.schedule.enabled && (
              <div className="ml-6">
                <label className="block text-sm text-gray-600 mb-2">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={hostConfig.schedule.cronExpression}
                  onChange={(e) => setHostConfig(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, cronExpression: e.target.value }
                  }))}
                  placeholder="*/5 * * * *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Examples: "0 * * * *" (hourly), "*/5 * * * *" (every 5 minutes), "0 9 * * *" (daily at 9 AM)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Host Script
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostScriptModal;