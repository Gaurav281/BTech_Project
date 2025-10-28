import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { setupGuides } from '../../services/setupGuide';

const GuideModal = ({ isOpen, onClose, selectedIntegration }) => {
  if (!isOpen || !selectedIntegration) return null;

  const getIntegrationGuide = (integration) => {
    // For custom integrations, use their setup guide
    if (integration.setupGuide) {
      return {
        title: `${integration.name} Setup Guide`,
        steps: integration.setupGuide.split('\n').filter(line => line.trim()),
        tips: []
      };
    }

    return setupGuides[integration.id] || setupGuides[integration.service] || {
      title: `${integration.name} Setup Guide`,
      steps: ['Documentation coming soon...', 'Check the official documentation for setup instructions'],
      tips: []
    };
  };

  const guide = getIntegrationGuide(selectedIntegration);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {guide.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="space-y-3">
          {guide.steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <p className="text-sm text-gray-700">{step}</p>
            </div>
          ))}
        </div>

        {guide.tips && guide.tips.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Tips:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {guide.tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        {guide.code && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Example Code:</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              {guide.code}
            </pre>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;