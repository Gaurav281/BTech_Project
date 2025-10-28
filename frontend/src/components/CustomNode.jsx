//src/components/CustomNode.jsx
import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaCog } from 'react-icons/fa';
import { integrationsAPI } from '../api/api';

const CustomNode = ({ data, selected }) => {
  const [integrationStatus, setIntegrationStatus] = useState(null);

  useEffect(() => {
    checkIntegrationStatus();
  }, [data.service]);

  const checkIntegrationStatus = async () => {
    if (!data.service || data.service === 'trigger') {
      setIntegrationStatus({ connected: true, isValid: true });
      return;
    }

    try {
      const response = await integrationsAPI.getUserIntegrations();
      const integrations = response.data.integrations || [];
      const integration = integrations.find(i => i.service === data.service);
      
      if (integration) {
        setIntegrationStatus({
          connected: integration.isActive && integration.isValid,
          isValid: integration.isValid,
          lastError: integration.lastError
        });
      } else {
        setIntegrationStatus({ connected: false, isValid: false });
      }
    } catch (error) {
      console.error('Failed to check integration status:', error);
      setIntegrationStatus({ connected: false, isValid: false });
    }
  };

  const getStatusIcon = () => {
    if (!integrationStatus || data.service === 'trigger') return null;
    
    if (integrationStatus.connected && integrationStatus.isValid) {
      return <FaCheckCircle className="text-green-500 text-sm" title="Integration connected" />;
    } else if (integrationStatus.connected && !integrationStatus.isValid) {
      return <FaExclamationTriangle className="text-yellow-500 text-sm" title="Integration needs setup" />;
    } else {
      return <FaTimesCircle className="text-red-500 text-sm" title="Integration not connected" />;
    }
  };

  const getStatusColor = () => {
    if (!integrationStatus || data.service === 'trigger') return 'border-gray-300';
    
    if (integrationStatus.connected && integrationStatus.isValid) {
      return 'border-green-400';
    } else if (integrationStatus.connected && !integrationStatus.isValid) {
      return 'border-yellow-400';
    } else {
      return 'border-red-400';
    }
  };

  return (
    <div className={`
      px-4 py-2 shadow-md rounded-md bg-white border-2 ${getStatusColor()} 
      ${selected ? 'ring-2 ring-blue-500' : ''}
      min-w-[150px] max-w-[200px]
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="rounded-full w-3 h-3 flex items-center justify-center bg-gray-100">
            <FaCog className="text-gray-600 text-xs" />
          </div>
          <div className="font-bold text-sm">{data.label}</div>
        </div>
        {getStatusIcon()}
      </div>
      
      <div className="mt-1 text-xs text-gray-600">
        {data.description}
      </div>

      {/* Step number */}
      <div className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
        {data.stepNumber}
      </div>

      {/* Integration status badge */}
      {integrationStatus && data.service !== 'trigger' && (
        <div className={`
          absolute -top-2 -right-2 rounded-full w-4 h-4 flex items-center justify-center text-xs
          ${integrationStatus.connected && integrationStatus.isValid ? 'bg-green-500' : 
            integrationStatus.connected && !integrationStatus.isValid ? 'bg-yellow-500' : 
            'bg-red-500'}
        `} />
      )}

      {/* Parameters configured badge */}
      {data.parametersConfigured && (
        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-xs">
          ✓
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500"
      />
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
};

export default CustomNode;