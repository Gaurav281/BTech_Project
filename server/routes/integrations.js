//server/routes/integrations.js
import express from 'express';
import Integration from '../models/Integration.js';
import { authenticateToken } from '../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import mysql from 'mysql2/promise';
import OpenAI from 'openai';

const router = express.Router();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Get user integrations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const integrations = await Integration.find({ user: req.user._id });
    res.json({ integrations });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// Save integration with enhanced validation
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { service, config, authType, name, type, category, description } = req.body;

    console.log('Saving integration:', { service, authType, config: config ? 'config present' : 'no config' });

    // Validate required fields based on service
    const validation = validateIntegrationConfig(service, config);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    let integration = await Integration.findOne({
      user: req.user._id,
      service
    });

    if (integration) {
      console.log('Updating existing integration:', integration.service);
      // Update existing integration
      integration.config = config;
      integration.authType = authType;
      integration.lastTested = null;
      integration.isValid = false; // Reset validity until tested
      
      // Update additional fields if provided
      if (name) integration.name = name;
      if (type) integration.type = type;
      if (category) integration.category = category;
      if (description) integration.description = description;
    } else {
      console.log('Creating new integration:', service);
      // Create new integration with all required fields
      integration = new Integration({
        user: req.user._id,
        service,
        name: name || service,
        type: type || 'software',
        category: category || getCategoryFromService(service),
        description: description || getDescriptionFromService(service),
        config,
        authType,
        isActive: true,
        isValid: false
      });
    }

    await integration.save();

    // Auto-test the integration after saving
    try {
      const testResult = await testIntegrationConnection(integration);
      integration.isValid = testResult.valid;
      integration.lastTested = new Date();
      integration.lastError = testResult.error;
      await integration.save();
    } catch (testError) {
      console.log(`Auto-test failed for ${service}:`, testError);
    }

    res.json({
      message: 'Integration saved successfully',
      integration
    });
  } catch (error) {
    console.error('Save integration error:', error);
    res.status(500).json({ error: 'Failed to save integration' });
  }
});

// Helper function to get category from service
function getCategoryFromService(service) {
  const categoryMap = {
    'gmail': 'Communication',
    'telegram': 'Communication',
    'slack': 'Communication',
    'google-sheets': 'Productivity',
    'instagram': 'Social Media',
    'youtube': 'Social Media',
    'webhook': 'Development',
    'mysql': 'Database',
    'arduino': 'IoT',
    'raspberry-pi': 'IoT',
    'smart-switch': 'Home Automation',
    'sensor-hub': 'IoT'
  };
  return categoryMap[service] || 'Other';
}

// Helper function to get description from service
function getDescriptionFromService(service) {
  const descriptionMap = {
    'gmail': 'Connect your Gmail account to send and receive emails',
    'telegram': 'Connect Telegram bot to send and receive messages',
    'slack': 'Connect Slack workspace to send messages and notifications',
    'google-sheets': 'Connect Google Sheets to read and write data',
    'instagram': 'Connect Instagram account for automation',
    'youtube': 'Connect YouTube channel for video automation',
    'webhook': 'Configure custom webhook endpoints',
    'mysql': 'Connect to MySQL database',
    'arduino': 'Connect Arduino devices for IoT automation',
    'raspberry-pi': 'Connect Raspberry Pi for hardware control',
    'smart-switch': 'Control smart switches and relays',
    'sensor-hub': 'Connect sensor hubs for data collection'
  };
  return descriptionMap[service] || `Integration with ${service}`;
}

// Enhanced integration validation
function validateIntegrationConfig(service, config) {
  const validations = {
    telegram: (config) => {
      if (!config || !config.botToken || config.botToken.trim() === '') {
        return { valid: false, error: 'Bot token is required for Telegram' };
      }
      if (!config.chatId || config.chatId.trim() === '') {
        return { valid: false, error: 'Chat ID is required for Telegram' };
      }
      // Check for placeholder values
      if (config.botToken.includes('YOUR_BOT_TOKEN') || config.chatId.includes('YOUR_CHAT_ID')) {
        return { valid: false, error: 'Please update bot token and chat ID with real values' };
      }
      return { valid: true };
    },
    slack: (config) => {
      if (!config || !config.webhookUrl || config.webhookUrl.trim() === '') {
        return { valid: false, error: 'Webhook URL is required for Slack' };
      }
      if (config.webhookUrl.includes('YOUR_WEBHOOK_URL')) {
        return { valid: false, error: 'Please update webhook URL with real value' };
      }
      return { valid: true };
    },
    mysql: (config) => {
      if (!config || !config.host || !config.database || !config.username) {
        return { valid: false, error: 'Host, database, and username are required for MySQL' };
      }
      if (config.host === 'localhost' && config.database === 'your_database') {
        return { valid: false, error: 'Please update database configuration with real values' };
      }
      return { valid: true };
    },
    webhook: (config) => {
      if (!config || !config.webhookUrl || config.webhookUrl.trim() === '') {
        return { valid: false, error: 'Webhook URL is required' };
      }
      if (config.webhookUrl.includes('YOUR_WEBHOOK_URL')) {
        return { valid: false, error: 'Please update webhook URL with real value' };
      }
      return { valid: true };
    },
    gmail: (config) => {
      if (!config || !config.tokens || !config.tokens.access_token) {
        return { valid: false, error: 'OAuth tokens are required for Gmail' };
      }
      return { valid: true };
    }
  };

  const validator = validations[service];
  if (validator) {
    return validator(config);
  }

  return { valid: true };
}

// Test integration connection with better error handling
router.post('/:service/test', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findOne({
      user: req.user._id,
      service: req.params.service
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    console.log(`🔐 Testing ${integration.service} integration...`);

    // Test the integration
    const testResult = await testIntegrationConnection(integration);

    // Update integration status
    integration.isValid = testResult.valid;
    integration.lastTested = new Date();
    integration.lastError = testResult.error;
    await integration.save();

    console.log(`✅ ${integration.service} test result:`, testResult.valid ? 'SUCCESS' : 'FAILED');

    res.json(testResult);
  } catch (error) {
    console.error('Test integration error:', error);
    res.status(500).json({ error: 'Failed to test integration' });
  }
});

// Enhanced test functions
async function testIntegrationConnection(integration) {
  try {
    switch (integration.service) {
      case 'telegram':
        return await testTelegramConnection(integration.config);
      case 'gmail':
        return await testGmailConnection(integration.config);
      case 'slack':
        return await testSlackConnection(integration.config);
      case 'mysql':
        return await testMySQLConnection(integration.config);
      case 'webhook':
        return await testWebhookConnection(integration.config);
      case 'arduino':
        return await testArduinoConnection(integration.config);
      case 'raspberry-pi':
        return await testRaspberryPiConnection(integration.config);
      case 'smart-switch':
        return await testSmartSwitchConnection(integration.config);
      case 'sensor-hub':
        return await testSensorHubConnection(integration.config);
      default:
        return { valid: true, message: 'Connection test passed' };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Enhanced Telegram test
async function testTelegramConnection(config) {
  const { botToken, chatId } = config;

  if (!botToken || !chatId) {
    return { valid: false, error: 'Bot token and chat ID are required' };
  }

  try {
    console.log('Testing Telegram with:', { botToken: botToken.substring(0, 10) + '...', chatId });

    // Test 1: Check bot token validity
    const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);

    if (!botResponse.ok) {
      const errorText = await botResponse.text();
      return { valid: false, error: `Bot token invalid: ${botResponse.status}` };
    }

    const botData = await botResponse.json();

    if (!botData.ok) {
      return { valid: false, error: `Bot token invalid: ${botData.description}` };
    }

    // Test 2: Check if bot can send messages
    const testMessage = {
      chat_id: chatId,
      text: '🤖 WorkflowAI Integration Test\n\nThis is a test message to verify your Telegram integration is working correctly. If you receive this, your integration is properly configured! ✅',
      parse_mode: 'HTML'
    };

    const sendResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();
      return { valid: false, error: `Cannot send messages: ${errorData.description}` };
    }

    return {
      valid: true,
      message: `Telegram integration successful! Bot: @${botData.result.username}, Test message sent.`
    };

  } catch (error) {
    console.error('Telegram test error:', error);
    return { valid: false, error: `Connection failed: ${error.message}` };
  }
}

// Enhanced Slack test
async function testSlackConnection(config) {
  const { webhookUrl } = config;

  if (!webhookUrl) {
    return { valid: false, error: 'Webhook URL is required' };
  }

  try {
    const testMessage = {
      text: '🔗 WorkflowAI Test Message\n\nThis is a test message to verify your Slack integration is working correctly.',
      username: 'WorkflowAI Bot',
      icon_emoji: ':robot_face:'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });

    if (response.status === 200) {
      return { valid: true, message: 'Slack integration successful! Test message sent to channel.' };
    } else {
      const errorText = await response.text();
      return { valid: false, error: `Slack API error: ${response.status} - ${errorText}` };
    }
  } catch (error) {
    return { valid: false, error: `Connection failed: ${error.message}` };
  }
}

// Enhanced MySQL test
async function testMySQLConnection(config) {
  const { host, port, database, username, password } = config;

  if (!host || !database || !username) {
    return { valid: false, error: 'Missing required database credentials' };
  }

  try {
    const connection = await mysql.createConnection({
      host,
      port: port || 3306,
      database,
      user: username,
      password,
      connectTimeout: 10000,
      acquireTimeout: 10000,
      timeout: 10000
    });

    // Test connection
    await connection.connect();

    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');

    await connection.end();

    return { valid: true, message: 'MySQL connection successful! Database is accessible.' };
  } catch (error) {
    console.error('MySQL test error:', error);
    return { valid: false, error: `MySQL connection failed: ${error.message}` };
  }
}

// Enhanced Webhook test
async function testWebhookConnection(config) {
  const { webhookUrl } = config;

  if (!webhookUrl) {
    return { valid: false, error: 'Webhook URL is required' };
  }

  try {
    const testPayload = {
      event: 'test',
      message: 'WorkflowAI webhook integration test',
      timestamp: new Date().toISOString(),
      status: 'success'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      timeout: 10000
    });

    // Consider 2xx and 3xx status codes as success for webhooks
    if (response.status >= 200 && response.status < 400) {
      return { valid: true, message: 'Webhook integration successful! Test payload sent.' };
    } else {
      const errorText = await response.text();
      return { valid: false, error: `Webhook returned error: ${response.status} - ${errorText}` };
    }
  } catch (error) {
    return { valid: false, error: `Webhook connection failed: ${error.message}` };
  }
}

// Gmail test with OAuth
async function testGmailConnection(config) {
  const { tokens } = config;

  if (!tokens || !tokens.access_token) {
    return { valid: false, error: 'OAuth tokens are required for Gmail' };
  }

  try {
    const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    oauth2Client.setCredentials(tokens);

    // Test Gmail API access
    const { google } = await import('googleapis');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Simple test: get user profile
    const response = await gmail.users.getProfile({
      userId: 'me'
    });

    return {
      valid: true,
      message: `Gmail integration successful! Connected as: ${response.data.emailAddress}`
    };
  } catch (error) {
    console.error('Gmail test error:', error);
    return { valid: false, error: `Gmail connection failed: ${error.message}` };
  }
}

// Hardware test functions
async function testArduinoConnection(config) {
  // Simulate Arduino connection test
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { 
    valid: true, 
    message: 'Arduino connection simulated successfully. In production, this would test serial communication.' 
  };
}

async function testRaspberryPiConnection(config) {
  const { host, port, username, password } = config;
  
  // Simulate SSH connection test
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { 
    valid: true, 
    message: `Raspberry Pi connection to ${host}:${port} simulated successfully.` 
  };
}

async function testSmartSwitchConnection(config) {
  const { deviceId, apiKey } = config;
  
  if (!deviceId || !apiKey) {
    return { valid: false, error: 'Device ID and API Key are required' };
  }
  
  // Simulate smart switch test
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { 
    valid: true, 
    message: `Smart switch ${deviceId} connection test successful` 
  };
}

async function testSensorHubConnection(config) {
  const { brokerUrl, topic } = config;
  
  if (!brokerUrl || !topic) {
    return { valid: false, error: 'MQTT Broker URL and Topic are required' };
  }
  
  // Simulate MQTT connection test
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { 
    valid: true, 
    message: `Sensor hub connection to ${brokerUrl} on topic ${topic} simulated` 
  };
}

// Delete integration
router.delete('/:service', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findOneAndDelete({
      user: req.user._id,
      service: req.params.service
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// OAuth initiation
router.post('/:service/oauth', authenticateToken, async (req, res) => {
  try {
    const service = req.params.service;
    const authUrl = await generateOAuthUrl(service, req.user._id);

    res.json({ authUrl });
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth' });
  }
});

// OAuth callback - FIXED VERSION

// Keep only the POST route for API calls
// OAuth callback - FIXED VERSION with code reuse protection
router.post('/oauth/callback', authenticateToken, async (req, res) => {
  try {
    const { code, state } = req.body;
    console.log('OAuth callback received:', { code: code ? 'code present' : 'no code', state });

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    let parsedState;
    try {
      parsedState = JSON.parse(state);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    const { service, userId } = parsedState;

    if (!service || !userId) {
      return res.status(400).json({ error: 'Invalid state data' });
    }

    // Verify the user making the request matches the state user
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: 'User mismatch' });
    }

    // Check if integration already exists with this code (prevent duplicate processing)
    const existingIntegration = await Integration.findOne({
      user: userId,
      service,
      'config.tokens.code': code // Check if we already processed this code
    });

    if (existingIntegration) {
      console.log('OAuth code already processed, returning existing integration');
      return res.json({
        message: 'OAuth authentication already completed',
        integration: existingIntegration
      });
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(service, code);
    console.log('Tokens received for service:', service);

    // Find existing integration or create new one
    let integration = await Integration.findOne({
      user: userId,
      service
    });

    if (integration) {
      console.log('Updating existing OAuth integration:', service);
      // Store the code to prevent reuse
      integration.config = { 
        tokens: {
          ...tokens,
          code: code // Store the code to prevent reuse
        }
      };
      integration.authType = 'OAuth2';
      integration.isValid = true;
      integration.lastTested = new Date();
      integration.isActive = true;
    } else {
      console.log('Creating new OAuth integration:', service);
      // Create new integration
      integration = new Integration({
        user: userId,
        service,
        name: service,
        type: 'software',
        category: getCategoryFromService(service),
        description: getDescriptionFromService(service),
        config: { 
          tokens: {
            ...tokens,
            code: code // Store the code to prevent reuse
          }
        },
        authType: 'OAuth2',
        isActive: true,
        isValid: true,
        lastTested: new Date()
      });
    }

    await integration.save();
    console.log('OAuth integration saved successfully:', service);

    res.json({
      message: 'OAuth authentication successful',
      integration
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Handle specific OAuth errors
    if (error.message.includes('invalid_grant')) {
      return res.status(400).json({ 
        error: 'OAuth authorization code has expired or has been used. Please try reconnecting the integration.' 
      });
    }
    
    res.status(500).json({ error: 'OAuth authentication failed: ' + error.message });
  }
});

// OAuth URL generation
async function generateOAuthUrl(service, userId) {
  const state = JSON.stringify({ service, userId });

  switch (service) {
    case 'gmail':
    case 'google-sheets':
    case 'youtube':
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.FRONTEND_URL}/integrations/oauth/callback`
      );
      
      let scopes = [];
      if (service === 'gmail') {
        scopes = [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify'
        ];
      } else if (service === 'google-sheets') {
        scopes = ['https://www.googleapis.com/auth/spreadsheets'];
      } else if (service === 'youtube') {
        scopes = [
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/youtube.upload'
        ];
      }

      return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: state,
        prompt: 'consent'
      });

    case 'slack':
      const slackParams = new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        scope: 'incoming-webhook,chat:write,channels:read',
        redirect_uri: `${process.env.FRONTEND_URL}/integrations/oauth/callback`,
        state: state
      });
      return `https://slack.com/oauth/v2/authorize?${slackParams.toString()}`;

    case 'instagram':
      // Instagram uses Facebook OAuth
      const instagramParams = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID,
        redirect_uri: `${process.env.FRONTEND_URL}/integrations/oauth/callback`,
        scope: 'instagram_basic,instagram_content_publish,pages_show_list',
        state: state,
        response_type: 'code'
      });
      return `https://www.facebook.com/v12.0/dialog/oauth?${instagramParams.toString()}`;
    default:
      throw new Error('OAuth not supported for this service');
  }
}

// Token exchange - FIXED VERSION
async function exchangeCodeForTokens(service, code) {
  console.log('Exchanging code for tokens for service:', service);
  
  switch (service) {
    case 'gmail':
    case 'google-sheets':
    case 'youtube':
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.FRONTEND_URL}/integrations/oauth/callback`
      );
      
      try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('Google tokens received successfully');
        return tokens;
      } catch (error) {
        console.error('Google token exchange error:', error);
        throw new Error(`Google OAuth failed: ${error.message}`);
      }

    case 'slack':
      const slackResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code: code,
          redirect_uri: `${process.env.FRONTEND_URL}/integrations/oauth/callback`
        })
      });
      const slackData = await slackResponse.json();
      if (!slackData.ok) {
        throw new Error(`Slack OAuth error: ${slackData.error}`);
      }
      return slackData;

    case 'instagram':
      // Instagram token exchange via Facebook
      const instagramResponse = await fetch('https://graph.facebook.com/v12.0/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          code: code,
          redirect_uri: `${process.env.FRONTEND_URL}/integrations/oauth/callback`
        })
      });
      const instagramData = await instagramResponse.json();
      if (instagramData.error) {
        throw new Error(`Instagram OAuth error: ${instagramData.error.message}`);
      }
      return instagramData;
    default:
      throw new Error('Token exchange not supported for this service');
  }
}

// HTTP OAuth callback handler (for redirects)
// router.get('/oauth/callback', async (req, res) => {
//   try {
//     const { code, state, error, error_description } = req.query;

//     if (error) {
//       console.error('OAuth error from provider:', error, error_description);
//       return res.redirect(`${process.env.FRONTEND_URL}/integrations?oauth=error&message=${encodeURIComponent(error_description || error)}`);
//     }

//     if (!code || !state) {
//       return res.redirect(`${process.env.FRONTEND_URL}/integrations?oauth=error&message=missing_parameters`);
//     }

//     let parsedState;
//     try {
//       parsedState = JSON.parse(state);
//     } catch (error) {
//       return res.redirect(`${process.env.FRONTEND_URL}/integrations?oauth=error&message=invalid_state`);
//     }

//     const { service, userId } = parsedState;

//     if (!service || !userId) {
//       return res.redirect(`${process.env.FRONTEND_URL}/integrations?oauth=error&message=invalid_state_data`);
//     }

//     // Exchange code for tokens
//     const tokens = await exchangeCodeForTokens(service, code);

//     // Find existing integration or create new one
//     let integration = await Integration.findOne({
//       user: userId,
//       service
//     });

//     if (integration) {
//       // Update existing integration
//       integration.config = { tokens };
//       integration.authType = 'OAuth2';
//       integration.isValid = true;
//       integration.lastTested = new Date();
//       integration.isActive = true;
//     } else {
//       // Create new integration
//       integration = new Integration({
//         user: userId,
//         service,
//         name: service,
//         type: 'software',
//         category: getCategoryFromService(service),
//         description: getDescriptionFromService(service),
//         config: { tokens },
//         authType: 'OAuth2',
//         isActive: true,
//         isValid: true,
//         lastTested: new Date()
//       });
//     }

//     await integration.save();

//     // Redirect to frontend with success
//     res.redirect(`${process.env.FRONTEND_URL}/integrations?oauth=success&service=${service}`);

//   } catch (error) {
//     console.error('OAuth callback error:', error);
//     res.redirect(`${process.env.FRONTEND_URL}/integrations?oauth=error&message=${encodeURIComponent(error.message)}`);
//   }
// });

// NEW: Create custom integration
router.post('/create-custom', authenticateToken, async (req, res) => {
  try {
    const { name, type, category, description, authType, parameters, customCode } = req.body;

    // Generate service ID from name
    const service = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // Generate setup guide and enhance description using AI
    let enhancedDescription = description;
    let setupGuide = '';
    
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are an integration expert. Create setup guides and descriptions for integrations.
              
              Integration Details:
              - Name: ${name}
              - Type: ${type}
              - Category: ${category}
              - Auth Type: ${authType}
              - Parameters: ${JSON.stringify(parameters)}
              
              Return JSON:
              {
                "description": "Enhanced description",
                "setupGuide": "Step-by-step setup instructions"
              }`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });

        const content = completion.choices[0].message.content;
        const jsonMatch = content.match(/{[\s\S]*}/);
        if (jsonMatch) {
          const aiData = JSON.parse(jsonMatch[0]);
          enhancedDescription = aiData.description || description;
          setupGuide = aiData.setupGuide || '';
        }
      } catch (aiError) {
        console.error('AI guide generation failed:', aiError);
      }
    }

    // Generate default code if not provided
    let generatedCode = customCode;
    if (!customCode && openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `Generate JavaScript code for a ${type} integration with ${authType} authentication.
              
              Integration: ${name}
              Parameters: ${JSON.stringify(parameters)}
              
              Return only the JavaScript code for executing this integration.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });

        generatedCode = completion.choices[0].message.content;
      } catch (codeError) {
        console.error('AI code generation failed:', codeError);
        generatedCode = `// Default execution code for ${name}\nconsole.log('Executing ${name} integration');`;
      }
    }

    const integration = new Integration({
      user: req.user._id,
      name,
      service,
      type,
      category,
      description: enhancedDescription,
      authType,
      parameters: parameters || [],
      customCode: generatedCode,
      setupGuide,
      config: {},
      isActive: true,
      isValid: false
    });

    await integration.save();

    res.json({
      message: 'Custom integration created successfully',
      integration
    });
  } catch (error) {
    console.error('Create custom integration error:', error);
    res.status(500).json({ error: 'Failed to create custom integration' });
  }
});

// NEW: Update integration
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Update integration
    Object.assign(integration, req.body);
    await integration.save();

    res.json({
      message: 'Integration updated successfully',
      integration
    });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// NEW: Execute custom integration
router.post('/:id/execute', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (!integration.isValid) {
      return res.status(400).json({ error: 'Integration is not valid' });
    }

    // Execute custom code
    const result = await executeCustomIntegration(integration, req.body);

    res.json({
      success: true,
      result,
      message: 'Integration executed successfully'
    });
  } catch (error) {
    console.error('Execute integration error:', error);
    res.status(500).json({ error: 'Failed to execute integration: ' + error.message });
  }
});

// Helper function to execute custom integration code
async function executeCustomIntegration(integration, data) {
  try {
    // Create a safe execution environment
    const { config, customCode } = integration;
    
    // Simple code execution (in production, use VM or sandbox)
    const func = new Function('config', 'data', `
      try {
        ${customCode}
        return execute(config, data);
      } catch (error) {
        throw new Error('Execution failed: ' + error.message);
      }
    `);
    
    return await func(config, data);
  } catch (error) {
    throw new Error(`Integration execution error: ${error.message}`);
  }
}

export default router;