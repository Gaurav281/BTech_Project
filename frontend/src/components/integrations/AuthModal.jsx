import React from 'react';
import { FaTimes } from 'react-icons/fa';

const AuthModal = ({ 
  isOpen, 
  onClose, 
  selectedIntegration, 
  authData, 
  setAuthData, 
  onSave,
  isConnected = false 
}) => {
  if (!isOpen || !selectedIntegration) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Configure {selectedIntegration.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* For predefined integrations */}
          {selectedIntegration.fields && selectedIntegration.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={field.type}
                value={authData[field.key] || field.default || ''}
                onChange={(e) => setAuthData(prev => ({
                  ...prev,
                  [field.key]: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${field.label.toLowerCase()}`}
                required={field.required}
              />
            </div>
          ))}

          {/* For custom integrations */}
          {selectedIntegration.parameters && selectedIntegration.parameters.map((param) => (
            <div key={param.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {param.label} {param.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={param.type}
                value={authData[param.key] || param.defaultValue || ''}
                onChange={(e) => setAuthData(prev => ({
                  ...prev,
                  [param.key]: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${param.label.toLowerCase()}`}
                required={param.required}
              />
              {param.description && (
                <p className="text-xs text-gray-500 mt-1">{param.description}</p>
              )}
            </div>
          ))}
          
          {selectedIntegration.authType === 'OAuth2' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                This integration uses OAuth2 authentication. Click "Connect" to be redirected to the authentication page.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isConnected ? 'Update' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;