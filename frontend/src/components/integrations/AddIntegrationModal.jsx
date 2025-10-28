//src/components/integrations/addIntegrationModal.jsx
import React from 'react';
import { FaTimes } from 'react-icons/fa';

const AddIntegrationModal = ({ 
  isOpen, 
  onClose, 
  newIntegrationInput, 
  setNewIntegrationInput, 
  onCreateIntegration 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Integration</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Integration Name
            </label>
            <input
              type="text"
              value={newIntegrationInput}
              onChange={(e) => setNewIntegrationInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Telegram, Gmail, Arduino..."
              onKeyPress={(e) => e.key === 'Enter' && onCreateIntegration()}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the name of the integration you want to add
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Available integrations:</strong> Telegram, Gmail, Slack, Google Sheets, Instagram, YouTube, Webhook, MySQL, Arduino, Raspberry Pi, Smart Switch, Sensor Hub
            </p>
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
            disabled={!newIntegrationInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            Add Integration
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddIntegrationModal;