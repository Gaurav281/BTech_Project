// src/services/workflowTemplates.js
export const workflowTemplates = {
  // Complex Template: Google Forms + Telegram + Google Sheets
  surveyWorkflow: {
    id: 'survey-workflow',
    name: 'Survey & Data Collection Workflow',
    description: 'Create Google Forms, share via Telegram, and save responses to Google Sheets',
    category: 'Data Collection',
    complexity: 'advanced',
    nodes: [
      {
        id: 'node-1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: 'Start Survey Workflow',
          service: 'trigger',
          description: 'Manual trigger to start the survey workflow',
          stepNumber: 1,
          parameters: {},
          parametersConfigured: true
        }
      },
      {
        id: 'node-2',
        type: 'custom',
        position: { x: 400, y: 100 },
        data: {
          label: 'Create Google Form',
          service: 'google-forms',
          description: 'Create a new Google Form with predefined questions',
          stepNumber: 2,
          parameters: {
            title: 'Customer Feedback Survey',
            description: 'Please help us improve by completing this survey',
            questions: [
              {
                question: 'How satisfied are you with our service?',
                type: 'scale',
                options: ['1 - Very Poor', '2 - Poor', '3 - Average', '4 - Good', '5 - Excellent']
              },
              {
                question: 'What features would you like to see improved?',
                type: 'text',
                required: false
              }
            ]
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-3',
        type: 'custom',
        position: { x: 700, y: 100 },
        data: {
          label: 'Get Form Share Link',
          service: 'google-forms',
          description: 'Extract the shareable link from the created form',
          stepNumber: 3,
          parameters: {
            action: 'get_share_link',
            shareable: true
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-4',
        type: 'custom',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Send to Telegram Group',
          service: 'telegram-send',
          description: 'Share the form link in Telegram group',
          stepNumber: 4,
          parameters: {
            message: '📋 Please take a moment to fill out our survey: {{formLink}}',
            parse_mode: 'HTML'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-5',
        type: 'custom',
        position: { x: 400, y: 300 },
        data: {
          label: 'Monitor Form Responses',
          service: 'google-forms',
          description: 'Continuously monitor for new form responses',
          stepNumber: 5,
          parameters: {
            action: 'monitor_responses',
            polling_interval: 300 // 5 minutes
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-6',
        type: 'custom',
        position: { x: 700, y: 300 },
        data: {
          label: 'Save to Google Sheets',
          service: 'google-sheets',
          description: 'Save form responses to Google Sheets for analysis',
          stepNumber: 6,
          parameters: {
            action: 'append',
            spreadsheetId: '',
            range: 'Sheet1!A:Z',
            values: '{{formResponses}}'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-7',
        type: 'custom',
        position: { x: 1000, y: 300 },
        data: {
          label: 'Send Summary Report',
          service: 'telegram-send',
          description: 'Send daily summary of responses',
          stepNumber: 7,
          parameters: {
            message: '📊 Daily Survey Summary:\nTotal Responses: {{responseCount}}\nAverage Rating: {{averageRating}}',
            schedule: '0 18 * * *' // 6 PM daily
          },
          parametersConfigured: false
        }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'smoothstep', animated: true },
      { id: 'edge-2', source: 'node-2', target: 'node-3', type: 'smoothstep', animated: true },
      { id: 'edge-3', source: 'node-3', target: 'node-4', type: 'smoothstep', animated: true },
      { id: 'edge-4', source: 'node-4', target: 'node-5', type: 'smoothstep', animated: true },
      { id: 'edge-5', source: 'node-5', target: 'node-6', type: 'smoothstep', animated: true },
      { id: 'edge-6', source: 'node-6', target: 'node-7', type: 'smoothstep', animated: true }
    ]
  },

  // IoT Monitoring Template
  iotMonitoring: {
    id: 'iot-monitoring',
    name: 'Smart Home IoT Monitoring',
    description: 'Monitor sensors and control devices with Bolt WiFi module',
    category: 'IoT',
    complexity: 'intermediate',
    nodes: [
      {
        id: 'node-1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: 'Start IoT Monitoring',
          service: 'trigger',
          description: 'Start monitoring IoT devices',
          stepNumber: 1,
          parameters: {},
          parametersConfigured: true
        }
      },
      {
        id: 'node-2',
        type: 'custom',
        position: { x: 400, y: 100 },
        data: {
          label: 'Read Temperature Sensor',
          service: 'temperature-sensor',
          description: 'Read temperature from DHT sensor',
          stepNumber: 2,
          parameters: {
            pin: 'D2',
            threshold: 30,
            unit: 'celsius'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-3',
        type: 'custom',
        position: { x: 700, y: 100 },
        data: {
          label: 'Read Light Sensor',
          service: 'light-sensor',
          description: 'Monitor ambient light levels',
          stepNumber: 3,
          parameters: {
            pin: 'A0',
            threshold: 500
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-4',
        type: 'custom',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Check Conditions',
          service: 'webhook',
          description: 'Process sensor data and check conditions',
          stepNumber: 4,
          parameters: {
            url: 'http://localhost:5000/api/process-sensor-data',
            method: 'POST',
            body: '{"temperature": {{temperature}}, "light": {{lightLevel}}}'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-5',
        type: 'custom',
        position: { x: 400, y: 300 },
        data: {
          label: 'Control LED',
          service: 'led',
          description: 'Control LED based on conditions',
          stepNumber: 5,
          parameters: {
            pin: 'D3',
            state: '{{shouldTurnOnLED}}',
            brightness: 255
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-6',
        type: 'custom',
        position: { x: 700, y: 300 },
        data: {
          label: 'Activate Buzzer Alert',
          service: 'buzzer',
          description: 'Sound buzzer for alerts',
          stepNumber: 6,
          parameters: {
            pin: 'D4',
            frequency: 1000,
            duration: 2000,
            condition: '{{temperature}} > 30'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-7',
        type: 'custom',
        position: { x: 1000, y: 300 },
        data: {
          label: 'Send Telegram Alert',
          service: 'telegram-send',
          description: 'Send alert notification',
          stepNumber: 7,
          parameters: {
            message: '🚨 Alert! Temperature: {{temperature}}°C, Light: {{lightLevel}} lux',
            condition: '{{temperature}} > 30 || {{lightLevel}} < 100'
          },
          parametersConfigured: false
        }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'smoothstep', animated: true },
      { id: 'edge-2', source: 'node-2', target: 'node-3', type: 'smoothstep', animated: true },
      { id: 'edge-3', source: 'node-3', target: 'node-4', type: 'smoothstep', animated: true },
      { id: 'edge-4', source: 'node-4', target: 'node-5', type: 'smoothstep', animated: true },
      { id: 'edge-5', source: 'node-4', target: 'node-6', type: 'smoothstep', animated: true },
      { id: 'edge-6', source: 'node-4', target: 'node-7', type: 'smoothstep', animated: true }
    ]
  },

  // Data Processing Template
  dataProcessing: {
    id: 'data-processing',
    name: 'Advanced Data Processing Pipeline',
    description: 'Fetch, process, and analyze data from multiple sources',
    category: 'Data Processing',
    complexity: 'advanced',
    nodes: [
      {
        id: 'node-1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: 'Schedule Data Fetch',
          service: 'trigger',
          description: 'Schedule data collection every 6 hours',
          stepNumber: 1,
          parameters: {
            schedule: '0 */6 * * *'
          },
          parametersConfigured: true
        }
      },
      {
        id: 'node-2',
        type: 'custom',
        position: { x: 400, y: 100 },
        data: {
          label: 'Fetch Data from API',
          service: 'webhook',
          description: 'Fetch data from external API',
          stepNumber: 2,
          parameters: {
            url: 'https://api.example.com/data',
            method: 'GET',
            headers: '{"Authorization": "Bearer {{apiKey}}"}'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-3',
        type: 'custom',
        position: { x: 700, y: 100 },
        data: {
          label: 'Process Data',
          service: 'webhook',
          description: 'Process and transform data',
          stepNumber: 3,
          parameters: {
            url: 'http://localhost:5000/api/process-data',
            method: 'POST',
            body: '{{apiResponse}}'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-4',
        type: 'custom',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Save to Database',
          service: 'mysql',
          description: 'Store processed data in MySQL',
          stepNumber: 4,
          parameters: {
            query: 'INSERT INTO processed_data (timestamp, data) VALUES (NOW(), ?)',
            values: '{{processedData}}'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-5',
        type: 'custom',
        position: { x: 400, y: 300 },
        data: {
          label: 'Generate Report',
          service: 'google-sheets',
          description: 'Create automated report',
          stepNumber: 5,
          parameters: {
            action: 'update',
            spreadsheetId: '',
            range: 'Reports!A1',
            values: '{{reportData}}'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-6',
        type: 'custom',
        position: { x: 700, y: 300 },
        data: {
          label: 'Send Email Report',
          service: 'gmail',
          description: 'Email the generated report',
          stepNumber: 6,
          parameters: {
            to: 'team@company.com',
            subject: 'Daily Data Report - {{date}}',
            body: 'Attached is the daily data report.',
            attachments: '{{reportUrl}}'
          },
          parametersConfigured: false
        }
      },
      {
        id: 'node-7',
        type: 'custom',
        position: { x: 1000, y: 300 },
        data: {
          label: 'Slack Notification',
          service: 'slack',
          description: 'Notify team on Slack',
          stepNumber: 7,
          parameters: {
            channel: '#data-reports',
            message: '📈 Daily data processing completed successfully!'
          },
          parametersConfigured: false
        }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'smoothstep', animated: true },
      { id: 'edge-2', source: 'node-2', target: 'node-3', type: 'smoothstep', animated: true },
      { id: 'edge-3', source: 'node-3', target: 'node-4', type: 'smoothstep', animated: true },
      { id: 'edge-4', source: 'node-4', target: 'node-5', type: 'smoothstep', animated: true },
      { id: 'edge-5', source: 'node-5', target: 'node-6', type: 'smoothstep', animated: true },
      { id: 'edge-6', source: 'node-6', target: 'node-7', type: 'smoothstep', animated: true }
    ]
  }
};

// Template categories for organization
export const templateCategories = [
  {
    id: 'data-collection',
    name: 'Data Collection',
    description: 'Workflows for collecting and processing data',
    templates: ['survey-workflow', 'data-processing']
  },
  {
    id: 'iot',
    name: 'IoT & Hardware',
    description: 'Hardware monitoring and control workflows',
    templates: ['iot-monitoring']
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Messaging and notification workflows',
    templates: []
  },
  {
    id: 'automation',
    name: 'Business Automation',
    description: 'Automate business processes and workflows',
    templates: []
  }
];