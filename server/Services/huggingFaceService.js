//server/Services/huggingFaceService.js 
import axios from 'axios';

export class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseURL = 'https://api-inference.huggingface.co/models';
  }

  async generateWorkflow(prompt) {
    try {
      // Use a smaller model for workflow generation
      const response = await axios.post(
        `${this.baseURL}/microsoft/DialoGPT-medium`,
        {
          inputs: `Generate a workflow automation for: ${prompt}. Return only the workflow steps in JSON format.`,
          parameters: {
            max_length: 500,
            temperature: 0.7,
            do_sample: true
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return this.parseHuggingFaceResponse(response.data, prompt);
    } catch (error) {
      console.error('Hugging Face API error:', error);
      throw new Error('Failed to generate workflow with AI');
    }
  }

  parseHuggingFaceResponse(response, prompt) {
    // Enhanced rule-based parser as fallback
    return this.enhancedRuleBasedParser(prompt);
  }

  enhancedRuleBasedParser(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const nodes = [];
    const edges = [];
    let nodeId = 1;

    // Start with trigger node
    nodes.push({
      id: `node-${nodeId++}`,
      type: 'custom',
      position: { x: 100, y: 100 },
      data: {
        label: 'Manual Trigger',
        service: 'trigger',
        description: 'Starts the workflow manually',
        stepNumber: 1,
        parameters: {},
        parametersConfigured: true
      }
    });

    // Detect services from prompt
    if (lowerPrompt.includes('telegram') || lowerPrompt.includes('message') || lowerPrompt.includes('alert')) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 400, y: 100 },
        data: {
          label: 'Send Telegram Message',
          service: 'telegram-send',
          description: 'Sends message via Telegram bot',
          stepNumber: nodes.length,
          parameters: {
            botToken: '',
            chatId: '',
            message: 'Automated message from workflow'
          },
          parametersConfigured: false
        }
      });
    }

    if (lowerPrompt.includes('gmail') || lowerPrompt.includes('email')) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 400, y: 200 },
        data: {
          label: 'Send Email',
          service: 'gmail',
          description: 'Sends email via Gmail',
          stepNumber: nodes.length,
          parameters: {
            to: '',
            subject: 'Automated Email',
            body: 'This is an automated email from your workflow.'
          },
          parametersConfigured: false
        }
      });
    }

    if (lowerPrompt.includes('slack')) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 400, y: 300 },
        data: {
          label: 'Post to Slack',
          service: 'slack',
          description: 'Posts message to Slack channel',
          stepNumber: nodes.length,
          parameters: {
            channel: '#general',
            message: 'Automated message from workflow'
          },
          parametersConfigured: false
        }
      });
    }

    if (lowerPrompt.includes('sheet') || lowerPrompt.includes('spreadsheet')) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 400, y: 400 },
        data: {
          label: 'Save to Google Sheets',
          service: 'google-sheets',
          description: 'Saves data to Google Sheets',
          stepNumber: nodes.length,
          parameters: {
            spreadsheetId: '',
            sheetName: 'Sheet1',
            range: 'A1'
          },
          parametersConfigured: false
        }
      });
    }

    // Create edges between nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'smoothstep',
        animated: true
      });
    }

    return { nodes, edges, prompt };
  }

  async processCommand(command, currentWorkflow) {
    // Use rule-based command processing to avoid API limits
    return this.enhancedCommandParser(command, currentWorkflow);
  }

  enhancedCommandParser(command, currentWorkflow) {
    const lowerCommand = command.toLowerCase();
    const modifications = {
      nodes: [...currentWorkflow.nodes],
      edges: [...currentWorkflow.edges],
      workflowName: currentWorkflow.workflowName,
      explanation: ''
    };

    let changes = [];

    // Simple command processing without AI
    if (lowerCommand.includes('add telegram')) {
      const newNode = {
        id: `node-${Date.now()}`,
        type: 'custom',
        position: { x: 300, y: 100 },
        data: {
          label: 'Send Telegram Message',
          service: 'telegram-send',
          description: 'Sends message via Telegram bot',
          stepNumber: modifications.nodes.length + 1,
          parameters: {
            botToken: '',
            chatId: '',
            message: 'Hello from workflow!'
          },
          parametersConfigured: false
        }
      };
      modifications.nodes.push(newNode);
      changes.push('Added Telegram node');
    }

    if (lowerCommand.includes('add gmail') || lowerCommand.includes('add email')) {
      const newNode = {
        id: `node-${Date.now()}`,
        type: 'custom',
        position: { x: 300, y: 200 },
        data: {
          label: 'Send Email',
          service: 'gmail',
          description: 'Sends email via Gmail',
          stepNumber: modifications.nodes.length + 1,
          parameters: {
            to: '',
            subject: 'Automated Email',
            body: 'This is an automated email.'
          },
          parametersConfigured: false
        }
      };
      modifications.nodes.push(newNode);
      changes.push('Added Gmail node');
    }

    // Add more command handlers as needed...

    modifications.explanation = changes.length > 0 ? changes.join(', ') : 'Command processed';

    return {
      success: true,
      modifications,
      explanation: modifications.explanation
    };
  }

  // Add to huggingFaceService.js if keeping
  async generateCompleteWorkflow(prompt, userIntegrations = []) {
    // Delegate to enhanced service
    const enhancedAIService = await import('./enhancedAIService.js');
    return enhancedAIService.default.generateStructuredWorkflow(prompt, 'microsoft/DialoGPT-medium', userIntegrations);
  }
}

export default new HuggingFaceService();