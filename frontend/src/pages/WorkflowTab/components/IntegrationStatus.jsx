//src/pages/WorkflowTab/components/IntegrationStatus.jsx
import React from 'react';

const IntegrationStatus = ({ userIntegrations }) => {
  if (!userIntegrations || userIntegrations.length === 0) {
    return null;
  }

  const validIntegrations = userIntegrations.filter(i => i.isValid);
  const invalidIntegrations = userIntegrations.filter(i => !i.isValid);

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-600 mb-2">Connected Services:</div>
      <div className="flex flex-wrap gap-2">
        {validIntegrations.map(integration => (
          <span key={integration._id} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
            ✅ {integration.service}
          </span>
        ))}
        {invalidIntegrations.map(integration => (
          <span key={integration._id} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
            ⚠️ {integration.service}
          </span>
        ))}
      </div>
      
      {invalidIntegrations.length > 0 && (
        <p className="text-xs text-yellow-600 mt-2">
          Some integrations need setup. Go to Integrations tab to configure.
        </p>
      )}
    </div>
  );
};

export default IntegrationStatus;