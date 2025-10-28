export const generateNodeWithParameters = (service, stepNumber, position) => {
  const baseNodes = {
    'trigger': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Start Workflow',
        service: 'trigger',
        description: 'Manual workflow trigger',
        stepNumber,
        parameters: {},
        parametersConfigured: true
      }
    },
    'telegram-send': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Send Telegram Message',
        service: 'telegram-send',
        description: 'Sends message via Telegram bot',
        stepNumber,
        parameters: {
          botToken: '',
          chatId: '',
          message: 'Hello from workflow!'
        },
        parametersConfigured: false
      }
    },
    'telegram-monitor': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Monitor Telegram',
        service: 'telegram-monitor',
        description: 'Listens for Telegram messages',
        stepNumber,
        parameters: {
          botToken: '',
          chatId: '',
          keyword: 'alert'
        },
        parametersConfigured: false
      }
    },
    'gmail': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Send Email',
        service: 'gmail',
        description: 'Sends email via Gmail',
        stepNumber,
        parameters: {
          to: '',
          subject: 'Automated Email',
          body: 'This is an automated email from your workflow.'
        },
        parametersConfigured: false
      }
    },
    'slack': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Post to Slack',
        service: 'slack',
        description: 'Posts message to Slack channel',
        stepNumber,
        parameters: {
          channel: '#general',
          message: 'Hello from workflow!'
        },
        parametersConfigured: false
      }
    },
    'google-sheets': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Save to Google Sheets',
        service: 'google-sheets',
        description: 'Saves data to Google Sheets',
        stepNumber,
        parameters: {
          spreadsheetId: '',
          sheetName: 'Sheet1',
          range: 'A1'
        },
        parametersConfigured: false
      }
    },
    'mysql': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Save to Database',
        service: 'mysql',
        description: 'Saves data to MySQL database',
        stepNumber,
        parameters: {
          host: 'localhost',
          port: 3306,
          database: '',
          username: '',
          password: '',
          query: 'INSERT INTO data VALUES (?)'
        },
        parametersConfigured: false
      }
    },
    'webhook': {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position,
      data: {
        label: 'Trigger Webhook',
        service: 'webhook',
        description: 'Triggers webhook endpoint',
        stepNumber,
        parameters: {
          url: '',
          method: 'POST',
          headers: '{"Content-Type": "application/json"}',
          body: '{"data": "example"}'
        },
        parametersConfigured: false
      }
    }
  };

  return baseNodes[service] || baseNodes['webhook'];
};

export const getRequiredParameters = (service) => {
  const requirements = {
    'telegram-send': ['botToken', 'chatId', 'message'],
    'telegram-monitor': ['botToken', 'chatId', 'keyword'],
    'gmail': ['to', 'subject', 'body'],
    'slack': ['channel', 'message'],
    'google-sheets': ['spreadsheetId', 'sheetName'],
    'mysql': ['host', 'database', 'username', 'password', 'query'],
    'webhook': ['url']
  };
  
  return requirements[service] || [];
};