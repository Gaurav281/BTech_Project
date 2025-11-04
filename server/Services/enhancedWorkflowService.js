//server/Services/enhancedWorkflowService.js
import axios from 'axios';
import Integration from '../models/Integration.js';

export class EnhancedWorkflowService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseURL = 'https://router.huggingface.co/v1/chat/completions';
  }

  /**
   * Enhanced workflow generation with robust JSON parsing
   */
  async generateStructuredWorkflow(prompt, model = 'deepseek-ai/DeepSeek-R1', userIntegrations = []) {
    try {
      console.log(`🚀 Generating enhanced workflow for: "${prompt}"`);
      console.log(`🔗 Available integrations:`, userIntegrations.map(i => ({ service: i.service, valid: i.isValid })));

      const availableServices = userIntegrations
        .filter(i => i.isValid)
        .map(i => i.service);

      // IMPROVED PROMPT for better JSON response
      const systemPrompt = `You are a workflow automation expert. Generate ONLY valid JSON for the workflow.

USER REQUEST: "${prompt}"

AVAILABLE SERVICES: ${availableServices.join(', ') || 'webhook, telegram, gmail, slack, mysql'}

Return JSON in this EXACT format - NO OTHER TEXT:
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
        "parameters": {
          "key1": "value1",
          "key2": "value2"
        }
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

CRITICAL RULES:
1. Use only these services: ${availableServices.join(', ') || 'webhook, telegram, gmail, slack, mysql'}
2. If prompt starts with action (like "send telegram message"), DON'T add trigger node
3. Include ALL required parameters for each service
4. For Telegram sending messages, use service: "telegram"
5. For Gmail sending emails, use service: "gmail"
6. Maximum 3 nodes
7. Return PURE JSON only - no thinking, no explanations`;

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
        temperature: 0.1,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 100000
      });

      console.log('✅ Received response from Hugging Face');
      
      let content = response.data.choices[0]?.message?.content || '';
      console.log('Raw response:', content);

      // Enhanced JSON extraction
      const jsonData = this.extractAndValidateJSON(content);
      
      if (!jsonData) {
        console.log('❌ No valid JSON found, using rule-based fallback');
        return this.ruleBasedWorkflowGenerator(prompt, userIntegrations);
      }

      // Enhance workflow with proper parameters
      const enhancedWorkflow = this.enhanceWorkflowStructure(jsonData, prompt, userIntegrations);
      
      console.log(`✅ Generated workflow with ${enhancedWorkflow.nodes.length} nodes`);
      return enhancedWorkflow;

    } catch (error) {
      console.error('❌ Workflow generation error:', error);
      return this.ruleBasedWorkflowGenerator(prompt, userIntegrations);
    }
  }

  /**
   * ROBUST JSON extraction with multiple fallback methods
   */
  extractAndValidateJSON(content) {
    if (!content) {
      console.log('❌ No content to parse');
      return null;
    }

    console.log('🔍 Parsing content:', content.substring(0, 200) + '...');

    // Method 1: Remove thinking tags first
    let cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '');
    cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```/g, '');

    // Method 2: Try direct JSON parsing
    try {
      const directJSON = JSON.parse(cleanedContent.trim());
      if (this.validateWorkflowStructure(directJSON)) {
        console.log('✅ Direct JSON parsing successful');
        return directJSON;
      }
    } catch (e) {
      // Continue to other methods
    }

    // Method 3: Extract JSON object from text
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let jsonStr = jsonMatch[0];
        
        // Fix common JSON issues
        jsonStr = jsonStr
          .replace(/(\w+):/g, '"$1":') // Convert unquoted keys
          .replace(/'/g, '"') // Replace single quotes
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .replace(/\n/g, ' ') // Remove newlines that break JSON
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        console.log('🔧 Cleaned JSON string:', jsonStr.substring(0, 200));

        const json = JSON.parse(jsonStr);
        if (this.validateWorkflowStructure(json)) {
          console.log('✅ JSON extraction successful');
          return json;
        }
      } catch (error) {
        console.log('❌ JSON extraction failed:', error.message);
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
    if (!hasNodes) return false;
    
    // Validate each node has required properties
    const validNodes = workflow.nodes.every(node => 
      node.id && 
      node.type && 
      node.position &&
      node.data && 
      node.data.label && 
      node.data.service
    );
    
    return validNodes;
  }

  /**
   * Enhance workflow with proper parameters and structure
   */
  enhanceWorkflowStructure(workflow, prompt, userIntegrations) {
    // Remove trigger node if not needed (when prompt starts with action)
    const shouldRemoveTrigger = prompt.toLowerCase().includes('send') || 
                               prompt.toLowerCase().includes('post') ||
                               prompt.toLowerCase().includes('execute');

    let filteredNodes = workflow.nodes;
    if (shouldRemoveTrigger) {
      filteredNodes = workflow.nodes.filter(node => 
        !node.data.service.includes('trigger') && 
        !node.data.label.toLowerCase().includes('trigger')
      );
    }

    // Enhance nodes with proper parameters
    const enhancedNodes = filteredNodes.map((node, index) => {
      const service = node.data.service;
      const integration = userIntegrations.find(i => i.service === service);
      
      return {
        id: node.id || `node-${index + 1}`,
        type: node.type || 'custom',
        position: node.position || this.calculateNodePosition(index),
        data: {
          label: node.data.label,
          service: service,
          description: node.data.description || this.getServiceDescription(service),
          stepNumber: index + 1,
          parameters: this.getEnhancedParameters(service, node.data.parameters || {}, integration),
          parametersConfigured: this.areParametersConfigured(service, node.data.parameters || {})
        }
      };
    });

    // Generate edges if none provided
    let enhancedEdges = workflow.edges || [];
    if (enhancedEdges.length === 0 && enhancedNodes.length > 1) {
      enhancedEdges = this.generateDefaultEdges(enhancedNodes);
    }

    return {
      name: workflow.name || `Workflow: ${prompt.substring(0, 30)}...`,
      description: workflow.description || `Automation for: ${prompt}`,
      nodes: enhancedNodes,
      edges: enhancedEdges,
      version: "1.0"
    };
  }

  /**
   * Get enhanced parameters for each service type
   */
  getEnhancedParameters(service, existingParams = {}, integration = null) {
    const parameterTemplates = {
      'telegram': {
        botToken: integration?.config?.botToken || existingParams.botToken || '',
        chatId: integration?.config?.chatId || existingParams.chatId || '',
        message: existingParams.message || existingParams.text || 'Hello from workflow automation!'
      },
      'gmail': {
        to: existingParams.to || '',
        subject: existingParams.subject || 'Automated Email]]]',
        body: existingParams.body || existingParams.message || 'This is an automated email from your workflow.'
      },
      'slack': {
        webhookUrl: integration?.config?.webhookUrl || existingParams.webhookUrl || '',
        channel: existingParams.channel || '#general',
        message: existingParams.message || 'Hello from workflow automation!'
      },
      'webhook': {
        url: existingParams.url || '',
        method: existingParams.method || 'POST',
        headers: existingParams.headers || '{"Content-Type": "application/json"}',
        body: existingParams.body || '{"data": "example"}'
      },
      'mysql': {
        host: integration?.config?.host || existingParams.host || 'localhost',
        port: integration?.config?.port || existingParams.port || 3306,
        database: integration?.config?.database || existingParams.database || '',
        username: integration?.config?.username || existingParams.username || '',
        password: integration?.config?.password || existingParams.password || '',
        query: existingParams.query || 'SELECT * FROM data'
      }
    };

    return {
      ...parameterTemplates[service],
      ...existingParams
    };
  }

  /**
   * Check if parameters are configured
   */
  areParametersConfigured(service, parameters) {
    if (service === 'trigger') return true;
    
    const requiredParams = this.getRequiredParameters(service);
    return requiredParams.every(param => 
      parameters[param] && parameters[param].toString().trim() !== ''
    );
  }

  /**
   * Get required parameters for service
   */
  getRequiredParameters(service) {
    const requirements = {
      'telegram': ['botToken', 'chatId', 'message'],
      'gmail': ['to', 'subject', 'body'],
      'slack': ['channel', 'message'],
      'webhook': ['url'],
      'mysql': ['host', 'database', 'username', 'password', 'query']
    };
    
    return requirements[service] || [];
  }

  /**
   * Rule-based fallback generator
   */
  ruleBasedWorkflowGenerator(prompt, userIntegrations = []) {
    console.log('🔄 Using rule-based workflow generator');
    
    const lowerPrompt = prompt.toLowerCase();
    const nodes = [];
    const edges = [];

    // Don't always add trigger - only if needed
    const needsTrigger = !lowerPrompt.includes('send') && 
                        !lowerPrompt.includes('post') && 
                        !lowerPrompt.includes('execute');

    if (needsTrigger) {
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
    }

    // Create action nodes based on prompt
    let nodeId = needsTrigger ? 2 : 1;

    if (lowerPrompt.includes('telegram') && lowerPrompt.includes('send')) {
      const integration = userIntegrations.find(i => i.service === 'telegram');
      
      nodes.push({
        id: `node-${nodeId}`,
        type: 'custom',
        position: { x: 400, y: 100 },
        data: {
          label: 'Send Telegram Message',
          service: 'telegram',
          description: 'Sends message via Telegram bot',
          stepNumber: nodeId,
          parameters: {
            botToken: integration?.config?.botToken || '',
            chatId: integration?.config?.chatId || '',
            message: this.extractMessageFromPrompt(prompt) || 'Hello from workflow!'
          },
          parametersConfigured: !!integration?.isValid
        }
      });
      nodeId++;
    }

    if ((lowerPrompt.includes('gmail') || lowerPrompt.includes('email')) && lowerPrompt.includes('send')) {
      const integration = userIntegrations.find(i => i.service === 'gmail');
      
      nodes.push({
        id: `node-${nodeId}`,
        type: 'custom',
        position: { x: 400, y: 200 },
        data: {
          label: 'Send Email',
          service: 'gmail',
          description: 'Sends email via Gmail',
          stepNumber: nodeId,
          parameters: {
            to: '',
            subject: 'Automated Email',
            body: 'This is an automated email from your workflow.'
          },
          parametersConfigured: !!integration?.isValid
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

    return {
      name: `Workflow: ${prompt.substring(0, 30)}...`,
      description: `Automation for: ${prompt}`,
      nodes,
      edges,
      version: "1.0"
    };
  }

  /**
   * Extract message from prompt
   */
  extractMessageFromPrompt(prompt) {
    const messageMatch = prompt.match(/"([^"]+)"/);
    return messageMatch ? messageMatch[1] : null;
  }

  calculateNodePosition(index) {
    return {
      x: 100 + (index * 300),
      y: 100
    };
  }

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

  getServiceDescription(service) {
    const descriptions = {
      'trigger': 'Starts the workflow manually',
      'telegram': 'Sends messages via Telegram bot',
      'gmail': 'Sends or receives emails via Gmail',
      'slack': 'Posts messages to Slack channels',
      'webhook': 'Makes HTTP requests to webhook endpoints',
      'mysql': 'Executes database operations'
    };
    
    return descriptions[service] || 'Automation step';
  }
}

export default new EnhancedWorkflowService();