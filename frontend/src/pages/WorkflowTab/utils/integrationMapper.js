// Maps services to their required integrations and parameters

export const serviceIntegrationMap = {
  'telegram-send': {
    integrationService: 'telegram',
    requiredParameters: ['botToken', 'chatId', 'message'],
    description: 'Send messages via Telegram bot'
  },
  'telegram-monitor': {
    integrationService: 'telegram',
    requiredParameters: ['botToken', 'chatId', 'keyword'],
    description: 'Monitor Telegram for incoming messages'
  },
  'gmail': {
    integrationService: 'gmail',
    requiredParameters: ['to', 'subject', 'body'],
    description: 'Send emails via Gmail'
  },
  'slack': {
    integrationService: 'slack',
    requiredParameters: ['channel', 'message'],
    description: 'Post messages to Slack channels'
  },
  'google-sheets': {
    integrationService: 'google-sheets',
    requiredParameters: ['spreadsheetId', 'sheetName', 'range'],
    description: 'Read/write data to Google Sheets'
  },
  'mysql': {
    integrationService: 'mysql',
    requiredParameters: ['host', 'database', 'username', 'password', 'query'],
    description: 'Execute database operations'
  },
  'webhook': {
    integrationService: 'webhook',
    requiredParameters: ['url', 'method', 'headers', 'body'],
    description: 'Trigger webhook endpoints'
  }
};

export const getServiceIntegration = (service) => {
  return serviceIntegrationMap[service] || {
    integrationService: service,
    requiredParameters: [],
    description: 'Custom service'
  };
};

export const validateServiceIntegration = (service, userIntegrations) => {
  const serviceConfig = serviceIntegrationMap[service];
  if (!serviceConfig) return { valid: true, message: 'No integration required' };

  const integration = userIntegrations.find(i => i.service === serviceConfig.integrationService);
  
  if (!integration) {
    return {
      valid: false,
      message: `Integration required: ${serviceConfig.integrationService}`,
      needsSetup: true
    };
  }

  if (!integration.isValid) {
    return {
      valid: false,
      message: `Integration ${serviceConfig.integrationService} is not valid`,
      needsSetup: false
    };
  }

  return {
    valid: true,
    message: `Integration ${serviceConfig.integrationService} is configured and valid`
  };
};

export const autoFillIntegrationParameters = (service, integrationConfig) => {
  const parameterMapping = {
    'telegram': {
      'telegram-send': {
        botToken: integrationConfig.botToken,
        chatId: integrationConfig.chatId
      },
      'telegram-monitor': {
        botToken: integrationConfig.botToken,
        chatId: integrationConfig.chatId
      }
    },
    'slack': {
      'slack': {
        webhookUrl: integrationConfig.webhookUrl
      }
    },
    'mysql': {
      'mysql': {
        host: integrationConfig.host,
        port: integrationConfig.port,
        database: integrationConfig.database,
        username: integrationConfig.username
      }
    }
  };

  const integrationService = getServiceIntegration(service).integrationService;
  return parameterMapping[integrationService]?.[service] || {};
};