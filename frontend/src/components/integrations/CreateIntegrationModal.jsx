//src/components/integrations/CreateIntegrationModal.jsx
import React from 'react';
import { FaTimes, FaTrash } from 'react-icons/fa';

const CreateIntegrationModal = ({
  isOpen,
  onClose,
  customIntegration,
  setCustomIntegration,
  newParameter,
  setNewParameter,
  onAddParameter,
  onRemoveParameter,
  onGenerateCode,
  onGenerateGuide,
  onCreateIntegration
}) => {
  if (!isOpen) return null;

  const categories = {
    software: ['Communication', 'Productivity', 'Social Media', 'Development', 'Database', 'Analytics', 'Storage', 'Finance', 'Marketing'],
    hardware: ['IoT', 'Home Automation', 'Robotics', 'Sensors', 'Actuators', 'Controllers', 'Industrial', 'Medical']
  };

  const authTypes = ['OAuth2', 'API Key', 'Database', 'Serial', 'SSH', 'MQTT', 'Custom'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create Custom Integration</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Basic Information</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Integration Name *
              </label>
              <input
                type="text"
                value={customIntegration.name}
                onChange={(e) => setCustomIntegration(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., My Custom API"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={customIntegration.type}
                onChange={(e) => setCustomIntegration(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="software">Software</option>
                <option value="hardware">Hardware</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={customIntegration.category}
                onChange={(e) => setCustomIntegration(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories[customIntegration.type]?.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authentication Type *
              </label>
              <select
                value={customIntegration.authType}
                onChange={(e) => setCustomIntegration(prev => ({ ...prev, authType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {authTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={customIntegration.description}
                onChange={(e) => setCustomIntegration(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this integration does..."
              />
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">Parameters</h4>
              <button
                onClick={onGenerateGuide}
                className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
              >
                Generate Guide
              </button>
            </div>
            
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Key *</label>
                  <input
                    type="text"
                    value={newParameter.key}
                    onChange={(e) => setNewParameter(prev => ({ ...prev, key: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="apiKey"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
                  <input
                    type="text"
                    value={newParameter.label}
                    onChange={(e) => setNewParameter(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="API Key"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newParameter.type}
                    onChange={(e) => setNewParameter(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="password">Password</option>
                    <option value="number">Number</option>
                    <option value="url">URL</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center space-x-1 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={newParameter.required}
                      onChange={(e) => setNewParameter(prev => ({ ...prev, required: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Required</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newParameter.description}
                  onChange={(e) => setNewParameter(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Parameter description..."
                />
              </div>

              <button
                onClick={onAddParameter}
                className="w-full bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Add Parameter
              </button>
            </div>

            {/* Parameters List */}
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {customIntegration.parameters.map((param, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{param.label}</span>
                      <span className="text-xs text-gray-500">({param.key})</span>
                      {param.required && (
                        <span className="text-xs bg-red-100 text-red-600 px-1 rounded">Required</span>
                      )}
                      <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">{param.type}</span>
                    </div>
                    {param.description && (
                      <p className="text-xs text-gray-600">{param.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveParameter(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Code Editor */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Execution Code
                </label>
                <button
                  onClick={onGenerateCode}
                  className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                >
                  Generate Template
                </button>
              </div>
              <textarea
                value={customIntegration.customCode}
                onChange={(e) => setCustomIntegration(prev => ({ ...prev, customCode: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="JavaScript code for executing this integration..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreateIntegration}
            disabled={!customIntegration.name || !customIntegration.category}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            Create Integration
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateIntegrationModal;