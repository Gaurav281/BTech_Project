import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Integration from '../models/Integration.js';
import  EnhancedAIService  from '../Services/enhancedAIService.js';

const router = express.Router();

/**
 * Enhanced workflow generation with integration awareness
 */
router.post('/generate-complete-workflow', authenticateToken, async (req, res) => {
  try {
    const { prompt, model = 'deepseek-ai/DeepSeek-R1', userIntegrations = [] } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    console.log(`🚀 Generating enhanced workflow for: "${prompt}"`);

    // Get user's integrations from database
    const dbIntegrations = await Integration.find({ 
      user: req.user._id,
      isActive: true 
    });

    // Generate workflow with integration awareness
    const workflow = await EnhancedAIService.generateStructuredWorkflow(
      prompt, 
      model,
      dbIntegrations
    );

    // Analyze required integrations
    const requiredServices = extractRequiredServices(workflow.nodes);
    const missingIntegrations = findMissingIntegrations(requiredServices, dbIntegrations);
    
    // Generate integration setup instructions
    const integrationSetup = await generateIntegrationSetup(missingIntegrations);

    res.json({
      success: true,
      workflow,
      prompt,
      modelUsed: model,
      integrationSetup,
      missingIntegrations,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Enhanced workflow generation error:', error);
    
    // Fallback to rule-based generation
    try {
      const fallbackWorkflow = await generateRuleBasedWorkflow(req.body.prompt, req.user._id);
      
      res.json({
        success: true,
        workflow: fallbackWorkflow,
        prompt: req.body.prompt,
        modelUsed: 'rule-based-fallback',
        integrationSetup: [],
        missingIntegrations: [],
        fallbackUsed: true,
        generatedAt: new Date().toISOString()
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: 'Workflow generation failed',
        details: error.message
      });
    }
  }
});



router.get('/available-models', authenticateToken, (req, res) => {
  try {
    res.json({
      success: true,
      models: EnhancedAIService.availableModels,
      defaultModel: 'deepseek-ai/DeepSeek-R1'
    });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ error: 'Failed to load models' });
  }
});

/**
 * Test Hugging Face connection
 */
router.post('/test-huggingface', authenticateToken, async (req, res) => {
  try {
    const result = await EnhancedAIService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Test failed: ${error.message}`
    });
  }
});

/**
 * Extract required services from workflow nodes
 */
function extractRequiredServices(nodes) {
  const services = new Set();
  
  nodes.forEach(node => {
    if (node.data.service && node.data.service !== 'trigger') {
      services.add(node.data.service);
    }
  });
  
  return Array.from(services);
}

/**
 * Find missing integrations
 */
function findMissingIntegrations(requiredServices, userIntegrations) {
  const missing = [];
  
  requiredServices.forEach(service => {
    const integration = userIntegrations.find(i => i.service === service);
    if (!integration || !integration.isValid) {
      missing.push({
        service,
        configured: !!integration,
        isValid: integration?.isValid || false,
        needsSetup: true
      });
    }
  });
  
  return missing;
}

/**
 * Generate integration setup instructions
 */
async function generateIntegrationSetup(missingIntegrations) {
  const setupInstructions = [];
  
  for (const integration of missingIntegrations) {
    const instruction = await generateIntegrationInstruction(integration.service);
    setupInstructions.push({
      service: integration.service,
      instruction,
      priority: getIntegrationPriority(integration.service)
    });
  }
  
  return setupInstructions.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate specific integration instructions
 */
async function generateIntegrationInstruction(service) {
  const instructions = {
    'telegram-send': {
      title: 'Setup Telegram Bot',
      steps: [
        'Message @BotFather on Telegram',
        'Use /newbot command to create a new bot',
        'Copy the bot token provided by BotFather',
        'Start a chat with your bot and send a message',
        'Use /getUpdates to find your chat ID',
        'Configure the integration with bot token and chat ID'
      ],
      parameters: ['botToken', 'chatId']
    },
    'telegram-monitor': {
      title: 'Setup Telegram Monitoring',
      steps: [
        'Message @BotFather on Telegram',
        'Use /newbot command to create a new bot',
        'Copy the bot token provided by BotFather',
        'Add the bot to your group/channel',
        'Get the chat ID of your group/channel',
        'Configure the integration with bot token and chat ID'
      ],
      parameters: ['botToken', 'chatId', 'keyword']
    },
    'gmail': {
      title: 'Setup Gmail Integration',
      steps: [
        'Enable Gmail API in Google Cloud Console',
        'Create OAuth 2.0 credentials',
        'Configure authorized redirect URIs',
        'Grant necessary Gmail permissions',
        'Authenticate via OAuth flow'
      ],
      parameters: ['tokens']
    },
    'slack': {
      title: 'Setup Slack Integration',
      steps: [
        'Go to api.slack.com/apps',
        'Create a new Slack app',
        'Enable Incoming Webhooks',
        'Create a webhook URL for your channel',
        'Copy the webhook URL',
        'Configure the integration with the webhook URL'
      ],
      parameters: ['webhookUrl']
    },
    'mysql': {
      title: 'Setup MySQL Database',
      steps: [
        'Ensure MySQL server is running',
        'Create a database and user',
        'Note database credentials: host, port, username, password, database name',
        'Configure the integration with database details'
      ],
      parameters: ['host', 'port', 'database', 'username', 'password']
    },
    'webhook': {
      title: 'Setup Webhook',
      steps: [
        'Create an endpoint to receive webhook calls',
        'Note the webhook URL',
        'Configure expected payload format',
        'Set up authentication if required',
        'Configure the integration with webhook URL'
      ],
      parameters: ['url', 'method', 'headers', 'body']
    }
  };
  
  return instructions[service] || {
    title: `Setup ${service}`,
    steps: [`Configure ${service} integration in the Integrations tab`],
    parameters: []
  };
}

/**
 * Get integration priority for setup order
 */
function getIntegrationPriority(service) {
  const priorities = {
    'telegram-send': 10,
    'telegram-monitor': 10,
    'gmail': 9,
    'slack': 8,
    'mysql': 7,
    'webhook': 6,
    'google-sheets': 5
  };
  
  return priorities[service] || 1;
}

/**
 * Rule-based fallback workflow generator
 */
async function generateRuleBasedWorkflow(prompt, userId) {
  const lowerPrompt = prompt.toLowerCase();
  const nodes = [];
  const edges = [];
  
  // Always start with trigger
  nodes.push({
    id: 'node-1',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: {
      label: 'Start Workflow',
      service: 'trigger',
      description: 'Manual workflow trigger',
      stepNumber: 1,
      parameters: {},
      parametersConfigured: true
    }
  });

  let nodeCount = 2;

  // Enhanced service detection
  if (lowerPrompt.includes('telegram') && lowerPrompt.includes('send')) {
    nodes.push({
      id: `node-${nodeCount}`,
      type: 'custom',
      position: { x: 400, y: 100 },
      data: {
        label: 'Send Telegram Message',
        service: 'telegram-send',
        description: 'Sends message via Telegram bot',
        stepNumber: nodeCount,
        parameters: {
          botToken: '',
          chatId: '',
          message: 'Hello from workflow!'
        },
        parametersConfigured: false
      }
    });
    nodeCount++;
  }

  if (lowerPrompt.includes('gmail') || lowerPrompt.includes('email')) {
    nodes.push({
      id: `node-${nodeCount}`,
      type: 'custom',
      position: { x: 400, y: 200 },
      data: {
        label: 'Send Email',
        service: 'gmail',
        description: 'Sends email via Gmail',
        stepNumber: nodeCount,
        parameters: {
          to: '',
          subject: 'Automated Email',
          body: 'This is an automated email.'
        },
        parametersConfigured: false
      }
    });
    nodeCount++;
  }

  // Add more service detection as needed...

  // Create edges
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `edge-${i}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: 'smoothstep',
      animated: true
    });
  }

  return {
    name: `Generated: ${prompt.substring(0, 50)}...`,
    description: `Automation workflow for: ${prompt}`,
    nodes,
    edges,
    version: "1.0"
  };
}

export default router;