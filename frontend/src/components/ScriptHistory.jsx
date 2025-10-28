//src/components/ScriptHistory.jsx
import React, { useState } from 'react';
import { FaEye, FaPlay, FaTrash, FaDownload, FaCopy } from 'react-icons/fa';

const ScriptHistory = ({ scripts, onLoadScript, onExecuteScript, onDeleteScript }) => {
  const [selectedScript, setSelectedScript] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleViewDetails = (script) => {
    setSelectedScript(script);
    setShowDetails(true);
  };

  const handleDownload = (script) => {
    const blob = new Blob([script.script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${script.name}.${getFileExtension(script.language)}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (script) => {
    navigator.clipboard.writeText(script.script);
    // You can add a toast notification here
  };

  const getFileExtension = (language) => {
    const extensions = {
      python: 'py',
      javascript: 'js',
      html: 'html',
      cpp: 'cpp',
      java: 'java',
      php: 'php'
    };
    return extensions[language] || 'txt';
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Scripts</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {scripts.map((script) => (
          <div
            key={script._id}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">{script.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  script.isPublic 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {script.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded capitalize">
                {script.language}
              </span>
            </div>
            
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
              {script.description || 'No description'}
            </p>
            
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Created: {new Date(script.createdAt).toLocaleDateString()}</span>
              <span>Used: {script.executionCount || 0} times</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex space-x-2">
                <button
                  onClick={() => onLoadScript(script)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  <FaCopy size={10} />
                  <span>Load</span>
                </button>
                
                <button
                  onClick={() => onExecuteScript(script)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  <FaPlay size={10} />
                  <span>Run</span>
                </button>

                <button
                  onClick={() => handleViewDetails(script)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  <FaEye size={10} />
                  <span>View</span>
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(script)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                >
                  <FaDownload size={10} />
                </button>

                <button
                  onClick={() => onDeleteScript(script._id)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  <FaTrash size={10} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Script Details Modal */}
      {showDetails && selectedScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{selectedScript.name}</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Language:</strong> {selectedScript.language}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Description:</strong> {selectedScript.description || 'No description'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Created:</strong> {new Date(selectedScript.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">{selectedScript.script}</pre>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => handleCopy(selectedScript)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Copy Script
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
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

export default ScriptHistory;