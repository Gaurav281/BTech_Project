import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { integrationsAPI } from '../../../api/api';
import useWorkflowStore from '../../../store/workflowStore';

export const useWorkflowIntegrations = () => {
  const [userIntegrations, setUserIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { isAuthenticated } = useAuth();
  const { addTerminalLog } = useWorkflowStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUserIntegrations();
    }
  }, [isAuthenticated]);

  const loadUserIntegrations = async () => {
    try {
      setLoading(true);
      const response = await integrationsAPI.getUserIntegrations();
      setUserIntegrations(response.data.integrations || []);
      addTerminalLog('✅ Integrations loaded successfully');
    } catch (error) {
      console.error('Failed to load integrations:', error);
      addTerminalLog('❌ Failed to load integrations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatus = (service) => {
    const integration = userIntegrations.find(i => i.service === service);
    if (!integration) return { configured: false, isValid: false };
    return { 
      configured: true, 
      isValid: integration.isValid,
      config: integration.config
    };
  };

  const hasValidIntegration = (service) => {
    const integration = userIntegrations.find(i => i.service === service);
    return integration && integration.isValid;
  };

  const getMissingIntegrations = (requiredServices = []) => {
    return requiredServices.filter(service => !hasValidIntegration(service));
  };

  return {
    userIntegrations,
    loading,
    loadUserIntegrations,
    getIntegrationStatus,
    hasValidIntegration,
    getMissingIntegrations
  };
};