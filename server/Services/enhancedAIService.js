//server/Services/enhancedAIService.js
import axios from 'axios';
import Integration from '../models/Integration.js';

export class EnhancedAIService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseURL = 'https://router.huggingface.co/v1/chat/completions';
    this.availableModels = [
      'deepseek-ai/DeepSeek-R1',
      'microsoft/DialoGPT-medium',
      'microsoft/DialoGPT-large',
      'distilgpt2',
      'gpt2',
      'EleutherAI/gpt-neo-125M'
    ];
  }

  /**
   * Enhanced workflow generation using Hugging Face Chat Completion with integration awareness
   */
  async generateStructuredWorkflow(prompt, model = 'deepseek-ai/DeepSeek-R1', userIntegrations = []) {
    try {
      console.log(`🔄 Generating workflow with ${model} for: "${prompt}"`);
      console.log(`🔗 Available integrations:`, userIntegrations.map(i => ({ service: i.service, valid: i.isValid })));

      const availableServices = userIntegrations
        .filter(i => i.isValid)
        .map(i => i.service);

      // SIMPLIFIED PROMPT for better JSON response
      const systemPrompt = `You are a workflow automation expert. Generate ONLY valid JSON for the workflow.

AVAILABLE SERVICES: ${availableServices.join(', ')}

USER REQUEST: "${prompt}"

Return JSON in this exact format:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "nodes": [
    {
      "id": "node-1",
      "type": "custom", 
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "Node Label",
        "service": "service-name",
        "description": "What this node does",
        "stepNumber": 1,
        "parameters": {}
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1", 
      "target": "node-2",
      "type": "smoothstep"
    }
  ]
}

RULES:
1. Start with trigger node as node-1
2. Use only: ${availableServices.join(', ')} or 'webhook'
3. Make it simple: 2-3 nodes maximum
4. Return ONLY JSON, no other text`;

      const response = await axios.post(this.baseURL, {
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Create workflow for: ${prompt}`
          }
        ],
        model: model,
        max_tokens: 2000,
        temperature: 0.1, // Lower temperature for more consistent JSON
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 100000
      });

      console.log('✅ Received response from Hugging Face');
      console.log('Raw response:', response.data.choices[0]?.message?.content);

      // Extract and clean the response
      let content = response.data.choices[0]?.message?.content || '';
      
      // Enhanced JSON extraction with better error handling
      const jsonData = this.extractAndValidateJSON(content);
      
      if (!jsonData) {
        console.log('❌ No valid JSON found, using rule-based fallback');
        throw new Error('Invalid JSON response from AI model');
      }

      // Validate and enhance the workflow structure
      const enhancedWorkflow = this.enhanceWorkflowStructure(jsonData, prompt, userIntegrations);
      
      console.log(`✅ Generated workflow with ${enhancedWorkflow.nodes.length} nodes and ${enhancedWorkflow.edges.length} edges`);
      
      return enhancedWorkflow;

    } catch (error) {
      console.error('❌ Hugging Face workflow generation error:', error);
      
      // Fallback to rule-based generation with integration awareness
      console.log('🔄 Falling back to rule-based generation');
      return this.ruleBasedWorkflowGenerator(prompt, userIntegrations);
    }
  }

  /**
   * Enhanced JSON extraction with multiple fallback methods
   */
  extractAndValidateJSON(content) {
    if (!content) {
      console.log('❌ No content to parse');
      return null;
    }

    console.log('🔍 Parsing content:', content.substring(0, 200) + '...');

    // Method 1: Try to find and clean JSON more aggressively
    try {
      // Remove any text before the first {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.log('❌ No JSON object found in content');
        return null;
      }

      let jsonStr = content.substring(jsonStart, jsonEnd);
      
      // More aggressive cleaning
      jsonStr = jsonStr
        .replace(/(\w+):/g, '"$1":') // Convert unquoted keys
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/,\s*}/g, '}') // Remove trailing commas in objects
        .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
        .replace(/\n/g, ' ') // Remove newlines
        .replace(/\t/g, ' ') // Remove tabs
        .replace(/\\"/g, '"') // Fix escaped quotes
        .trim();

      console.log('🔧 Cleaned JSON string:', jsonStr.substring(0, 200) + '...');

      const parsed = JSON.parse(jsonStr);
      
      // Basic validation
      if (this.validateWorkflowStructure(parsed)) {
        console.log('✅ Successfully parsed and validated JSON');
        return parsed;
      } else {
        console.log('❌ Parsed JSON failed structure validation');
        return null;
      }
    } catch (error) {
      console.log('❌ JSON parsing failed:', error.message);
      
      // Method 2: Try to extract from code blocks
      try {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          console.log('🔄 Trying code block extraction');
          const cleaned = codeBlockMatch[1]
            .replace(/(\w+):/g, '"$1":')
            .replace(/'/g, '"')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .trim();
          
          const parsed = JSON.parse(cleaned);
          if (this.validateWorkflowStructure(parsed)) {
            console.log('✅ Successfully parsed JSON from code block');
            return parsed;
          }
        }
      } catch (e) {
        console.log('❌ Code block extraction also failed');
      }
    }

    return null;
  }

  /**
   * Enhanced JSON extraction with multiple fallback methods
   */
  extractAndValidateJSON(content) {
    if (!content) return null;

    // Method 1: Try direct JSON parsing
    try {
      const directJSON = JSON.parse(content);
      if (this.validateWorkflowStructure(directJSON)) {
        return directJSON;
      }
    } catch (e) {
      // Continue to other methods
    }

    // Method 2: Extract JSON from code fences
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const json = JSON.parse(jsonMatch[1]);
        if (this.validateWorkflowStructure(json)) {
          return json;
        }
      } catch (e) {
        // Continue to other methods
      }
    }

    // Method 3: Find JSON object in text
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        // Clean the JSON string
        let jsonStr = objectMatch[0]
          .replace(/(\w+):/g, '"$1":') // Convert unquoted keys
          .replace(/'/g, '"') // Replace single quotes
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

        const json = JSON.parse(jsonStr);
        if (this.validateWorkflowStructure(json)) {
          return json;
        }
      } catch (e) {
        console.error('JSON parsing failed:', e);
      }
    }

    return null;
  }

  /**
   * Validate workflow structure
   */
  validateWorkflowStructure(workflow) {
    if (!workflow) return false;
    
    const hasNodes = Array.isArray(workflow.nodes) && workflow.nodes.length > 0;
    const hasEdges = Array.isArray(workflow.edges);
    
    // Basic validation
    if (!hasNodes) return false;
    
    // Validate node structure
    const validNodes = workflow.nodes.every(node => 
      node.id && 
      node.type && 
      node.data && 
      node.data.label && 
      node.data.service
    );
    
    return validNodes;
  }

  /**
   * Enhance workflow structure with missing properties and integration awareness
   */
  enhanceWorkflowStructure(workflow, prompt, userIntegrations) {
    const enhanced = {
      workflow: {
        name: workflow.workflow?.name || this.generateWorkflowName(prompt),
        description: workflow.workflow?.description || `Automation workflow for: ${prompt}`,
        version: workflow.workflow?.version || "1.0",
        generatedFrom: prompt
      },
      nodes: [],
      edges: [],
      integrations: this.extractIntegrationsFromNodes(workflow.nodes),
      executionOrder: workflow.executionOrder || []
    };

    // Enhance nodes with integration awareness
    enhanced.nodes = workflow.nodes.map((node, index) => {
      const service = node.data?.service || node.service || 'webhook';
      const integration = userIntegrations.find(i => i.service === service);
      const hasValidIntegration = integration && integration.isValid;

      return {
        id: node.id || `node-${index + 1}`,
        type: node.type || 'custom',
        position: node.position || this.calculateNodePosition(index),
        data: {
          label: node.data?.label || `Step ${index + 1}`,
          service: service,
          description: node.data?.description || this.getServiceDescription(service),
          stepNumber: node.data?.stepNumber || index + 1,
          parameters: this.enhanceNodeParameters(node.data?.parameters || {}, service, integration),
          parametersConfigured: hasValidIntegration && this.areParametersConfigured(node.data?.parameters || {}, service),
          integrationStatus: {
            configured: !!integration,
            valid: integration?.isValid || false,
            needsSetup: !hasValidIntegration
          }
        }
      };
    });

    // Enhance edges
    enhanced.edges = workflow.edges?.map((edge, index) => ({
      id: edge.id || `edge-${index + 1}`,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'smoothstep',
      animated: edge.animated !== undefined ? edge.animated : true
    })) || this.generateDefaultEdges(enhanced.nodes);

    return enhanced;
  }

  /**
   * Enhance node parameters with integration data
   */
  enhanceNodeParameters(parameters, service, integration) {
    const defaultParams = this.getDefaultParameters(service);
    
    // Merge with integration config if available
    if (integration && integration.config) {
      const integrationParams = this.getIntegrationParameters(service, integration.config);
      return {
        ...defaultParams,
        ...integrationParams,
        ...parameters // User/AI provided parameters take precedence
      };
    }
    
    return {
      ...defaultParams,
      ...parameters
    };
  }

  /**
   * Get parameters from integration config
   */
  getIntegrationParameters(service, config) {
    const parameterMapping = {
      'telegram-send': {
        botToken: config.botToken,
        chatId: config.chatId
      },
      'telegram-monitor': {
        botToken: config.botToken,
        chatId: config.chatId
      },
      'slack': {
        webhookUrl: config.webhookUrl
      },
      'mysql': {
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username
        // Don't auto-fill password for security
      }
    };

    return parameterMapping[service] || {};
  }

  /**
   * Check if parameters are configured
   */
  areParametersConfigured(parameters, service) {
    if (service === 'trigger') return true;
    
    const requiredParams = this.getRequiredParameters(service);
    return requiredParams.every(param => 
      parameters[param] && parameters[param].toString().trim() !== ''
    );
  }

  /**
   * Calculate node positions for better visualization
   */
  calculateNodePosition(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      x: 100 + (col * 300),
      y: 100 + (row * 150)
    };
  }

  /**
   * Generate default edges between consecutive nodes
   */
  generateDefaultEdges(nodes) {
    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i + 1}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'smoothstep',
        animated: true
      });
    }
    return edges;
  }

  /**
   * Extract required integrations from nodes
   */
  extractIntegrationsFromNodes(nodes) {
    const integrations = new Set();
    
    nodes.forEach(node => {
      if (node.data.service && node.data.service !== 'trigger') {
        integrations.add(node.data.service);
      }
    });
    
    return Array.from(integrations);
  }

  /**
   * Get service description
   */
  getServiceDescription(service) {
    const descriptions = {
      'trigger': 'Starts the workflow manually',
      'telegram-send': 'Sends messages via Telegram bot',
      'telegram-monitor': 'Monitors Telegram for incoming messages',
      'gmail': 'Sends or receives emails via Gmail',
      'slack': 'Posts messages to Slack channels',
      'google-sheets': 'Reads or writes data to Google Sheets',
      'mysql': 'Executes database operations',
      'webhook': 'Makes HTTP requests to webhook endpoints'
    };
    
    return descriptions[service] || 'Automation step';
  }

  /**
   * Get default parameters for each service
   */
  getDefaultParameters(service) {
    const parameters = {
      'trigger': {},
      'telegram-send': {
        botToken: '',
        chatId: '',
        message: 'Hello from workflow automation!'
      },
      'telegram-monitor': {
        botToken: '',
        chatId: '',
        keyword: 'alert'
      },
      'gmail': {
        to: '',
        subject: 'Automated gmail @@',
        body: 'This is an automated email from your workflow.'
      },
      'slack': {
        webhookUrl: '',
        channel: '#general',
        message: 'Hello from workflow automation!'
      },
      'google-sheets': {
        spreadsheetId: '',
        sheetName: 'Sheet1',
        range: 'A:Z'
      },
      'mysql': {
        host: 'localhost',
        port: 3306,
        database: '',
        username: '',
        password: '',
        query: 'SELECT * FROM data'
      },
      'webhook': {
        url: '',
        method: 'POST',
        headers: '{"Content-Type": "application/json"}',
        body: '{"data": "example"}'
      }
    };
    
    return parameters[service] || {};
  }

  /**
   * Get required parameters for service validation
   */
  getRequiredParameters(service) {
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
  }

  /**
   * Generate workflow name from prompt
   */
  generateWorkflowName(prompt) {
    const words = prompt.split(' ').slice(0, 5).join(' ');
    return `${words} Automation`;
  }

  /**
   * Integration-aware rule-based fallback generator
   */
  ruleBasedWorkflowGenerator(prompt, userIntegrations = []) {
    console.log('🔄 Using integration-aware rule-based workflow generator');
    
    const lowerPrompt = prompt.toLowerCase();
    const nodes = [];
    const edges = [];
    
    // Get available services from valid integrations
    const availableServices = userIntegrations
      .filter(i => i.isValid)
      .map(i => i.service);

    console.log('🔍 Available services for rule-based:', availableServices);

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

    let nodeId = 2;

    // Enhanced service detection with better matching
    const detectedServices = this.detectServicesFromPrompt(lowerPrompt, availableServices);
    
    console.log('🎯 Detected services:', detectedServices);

    detectedServices.forEach((service, index) => {
      const integration = userIntegrations.find(i => i.service === service);
      const hasValidIntegration = integration && integration.isValid;

      nodes.push({
        id: `node-${nodeId}`,
        type: 'custom',
        position: { x: 400, y: 100 + (index * 100) },
        data: {
          label: this.getNodeLabel(service),
          service: service,
          description: this.getServiceDescription(service),
          stepNumber: nodeId,
          parameters: this.enhanceNodeParameters({}, service, integration),
          parametersConfigured: hasValidIntegration,
          integrationStatus: {
            configured: !!integration,
            valid: hasValidIntegration,
            needsSetup: !hasValidIntegration
          }
        }
      });
      nodeId++;
    });

    // Add default node if no specific services detected
    if (nodes.length === 1) {
      // Try to find any available service that makes sense
      let fallbackService = 'webhook';
      
      if (availableServices.includes('webhook')) {
        fallbackService = 'webhook';
      } else if (availableServices.length > 0) {
        fallbackService = availableServices[0]; // Use first available service
      }
      
      const integration = userIntegrations.find(i => i.service === fallbackService);
      
      nodes.push({
        id: `node-${nodeId}`,
        type: 'custom',
        position: { x: 400, y: 100 },
        data: {
          label: this.getNodeLabel(fallbackService),
          service: fallbackService,
          description: this.getServiceDescription(fallbackService),
          stepNumber: nodeId,
          parameters: this.getDefaultParameters(fallbackService),
          parametersConfigured: false,
          integrationStatus: {
            configured: !!integration,
            valid: integration?.isValid || false,
            needsSetup: !integration?.isValid
          }
        }
      });
      nodeId++;
    }

    // Create edges
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i + 1}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'smoothstep',
        animated: true
      });
    }

    const workflow = {
      workflow: {
        name: this.generateWorkflowName(prompt),
        description: `Automation workflow for: ${prompt}`,
        version: "1.0",
        generatedFrom: prompt
      },
      nodes,
      edges,
      integrations: this.extractIntegrationsFromNodes(nodes),
      executionOrder: nodes.map(node => node.id)
    };

    console.log('✅ Rule-based workflow generated:', workflow);
    return workflow;
  }


  /**
   * Detect services from prompt considering available integrations
   */
  detectServicesFromPrompt(prompt, availableServices) {
    const services = [];
    
    // Service detection logic
    if (prompt.includes('telegram') && prompt.includes('send') && availableServices.includes('telegram-send')) {
      services.push('telegram-send');
    }
    if (prompt.includes('telegram') && prompt.includes('monitor') && availableServices.includes('telegram-monitor')) {
      services.push('telegram-monitor');
    }
    if ((prompt.includes('gmail') || prompt.includes('email')) && availableServices.includes('gmail')) {
      services.push('gmail');
    }
    if (prompt.includes('slack') && availableServices.includes('slack')) {
      services.push('slack');
    }
    if ((prompt.includes('sheet') || prompt.includes('spreadsheet')) && availableServices.includes('google-sheets')) {
      services.push('google-sheets');
    }
    if ((prompt.includes('database') || prompt.includes('mysql')) && availableServices.includes('mysql')) {
      services.push('mysql');
    }
    if (prompt.includes('webhook') && availableServices.includes('webhook')) {
      services.push('webhook');
    }

    return services;
  }

  /**
   * Get node label based on service
   */
  getNodeLabel(service) {
    const labels = {
      'telegram-send': 'Send Telegram Message',
      'telegram-monitor': 'Monitor Telegram',
      'gmail': 'Send Email',
      'slack': 'Post to Slack',
      'google-sheets': 'Save to Google Sheets',
      'mysql': 'Save to Database',
      'webhook': 'Trigger Webhook'
    };
    
    return labels[service] || 'Action Node';
  }

  /**
   * Test Hugging Face connection
   */
  async testConnection() {
    try {
      const response = await axios.post(this.baseURL, {
        messages: [
          {
            role: "user",
            content: "Say 'Connection successful'"
          }
        ],
        model: 'deepseek-ai/DeepSeek-R1',
        max_tokens: 10,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return {
        success: true,
        message: 'Hugging Face connection successful',
        model: 'deepseek-ai/DeepSeek-R1'
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }
}

export default new EnhancedAIService();