import React from 'react';
import { 
  FaCheck, FaTimes, FaKey, FaSync, FaExclamationTriangle, 
  FaBook, FaTrash, FaPlay, FaEye 
} from 'react-icons/fa';

const IntegrationCard = ({ 
  integration, 
  status, 
  onConnect, 
  onTest, 
  onDisconnect, 
  onConfigure, 
  onShowGuide, 
  onExecute,
  onViewCode,
  testing = false,
  executing = false,
  isCustom = false 
}) => {
  const Icon = integration.icon;
  
  // Get the correct ID for this integration
  const integrationId = isCustom ? integration._id : integration.id;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            isCustom ? 'bg-purple-100' : 'bg-blue-100'
          }`}>
            <Icon className={`text-xl ${
              isCustom ? 'text-purple-600' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">{integration.authType}</span>
              {isCustom && (
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                  Custom
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${
                isCustom ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {integration.category}
              </span>
            </div>
          </div>
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
          status.connected 
            ? 'bg-green-100 text-green-800' 
            : status.status === 'invalid'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {status.connected ? <FaCheck /> : status.status === 'invalid' ? <FaExclamationTriangle /> : <FaTimes />}
          <span>
            {status.connected ? 'Connected' : 
             status.status === 'invalid' ? 'Needs Repair' : 'Not Connected'}
          </span>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4">{integration.description}</p>

      {status.lastTested && (
        <p className="text-xs text-gray-500 mb-2">
          Last tested: {new Date(status.lastTested).toLocaleString()}
        </p>
      )}

      <div className="flex space-x-2 flex-wrap gap-2">
        {status.connected ? (
          <>
            <button
              onClick={() => onTest(integrationId)}
              disabled={testing}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium flex items-center justify-center space-x-2 min-w-0"
            >
              {testing ? <FaSync className="animate-spin" /> : <FaCheck />}
              <span>{testing ? 'Testing...' : 'Test'}</span>
            </button>
            
            {isCustom && (
              <>
                <button
                  onClick={() => onExecute(integrationId)}
                  disabled={executing}
                  className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium flex items-center justify-center"
                  title="Execute Integration"
                >
                  {executing ? <FaSync className="animate-spin" /> : <FaPlay />}
                </button>
                <button
                  onClick={onViewCode}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center"
                  title="View Code"
                >
                  <FaEye />
                </button>
              </>
            )}
            
            <button
              onClick={() => onDisconnect(integrationId)}
              className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center"
              title="Disconnect"
            >
              <FaTrash />
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(integration)}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            {isCustom ? 'Configure' : 'Connect'}
          </button>
        )}
        
        <button 
          onClick={() => onConfigure(integration)}
          className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium flex items-center justify-center"
          title="Configure"
        >
          <FaKey />
        </button>
        
        <button
          onClick={() => onShowGuide(integration)}
          className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center"
          title="Setup Guide"
        >
          <FaBook />
        </button>
      </div>
    </div>
  );
};

export default IntegrationCard;