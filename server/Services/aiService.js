// server/Services/aiService.js
import axios from 'axios';
import OpenAI from 'openai';

/**
 * AIService
 * - Supports: rule-based (normal), OpenAI, Hugging Face
 * - Provides: parseWorkflowFromPrompt, processCommand, generateScript, and many helpers
 *
 * Note: Keep OPENAI_API_KEY and HUGGINGFACE_API_KEY in your .env (or set via setProvider at runtime)
 */

export class AIService {
  constructor() {
    this.providers = {
      normal: 'Normal (Rule-Based)',
      openai: 'OpenAI GPT',
      huggingface: 'Hugging Face'
    };

    this.currentProvider = 'huggingface';

    this.apiKeys = {
      openai: process.env.OPENAI_API_KEY || null,
      huggingface: process.env.HUGGINGFACE_API_KEY || null
    };

    // default models (can be overridden by env or setProvider if you want)
    this.openAIModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.openAITimeout = parseInt(process.env.OPENAI_TIMEOUT_MS || '120000', 10); // ms
  }

  // ------------------------
  // Provider management
  // ------------------------
  setProvider(provider, apiKey = null) {
    if (!this.providers[provider]) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    this.currentProvider = provider;
    if (apiKey) this.apiKeys[provider] = apiKey;
    console.log(`AI Provider set to: ${this.providers[provider]}`);
  }

  getProviders() {
    return this.providers;
  }

  // ------------------------
  // Main entry points
  // ------------------------
  async parseWorkflowFromPrompt(prompt, provider = null) {
    const selected = provider || this.currentProvider;
    try {
      switch (selected) {
        case 'openai':
          return await this.openAIParser(prompt);
        case 'huggingface':
          return await this.huggingFaceParser(prompt);
        case 'normal':
        default:
          return this.enhancedRuleBasedParser(prompt);
      }
    } catch (err) {
      console.error(`${selected} Error:`, err?.message || err);
      // fallback to rule-based parser
      return this.enhancedRuleBasedParser(prompt);
    }
  }

  async processCommand(command, currentWorkflow, provider = null) {
    const selected = provider || this.currentProvider;
    try {
      console.log(`Processing command with ${selected}:`, command?.slice?.(0, 200) || command);
      switch (selected) {
        case 'openai':
          return await this.openAICommandParser(command, currentWorkflow);
        case 'huggingface':
          return await this.huggingFaceCommandParser(command, currentWorkflow);
        case 'normal':
        default:
          return this.enhancedCommandParser(command, currentWorkflow);
      }
    } catch (err) {
      console.error('Command processing error:', err?.message || err);
      return this.enhancedCommandParser(command, currentWorkflow);
    }
  }

  async generateScript(task, language, provider = null) {
    // Default provider to OpenAI if nothing is passed
    const selectedProvider = provider || this.currentProvider || 'openai';
    console.log('Generating script using provider:', selectedProvider);

    const logError = (err) => {
      console.error(`[${selectedProvider}] Script Generation Error:`, err?.message || err);
    };

    const buildPrompt = (task, language) => `
You are an expert ${language} developer. Generate a complete, fully functional ${language} script that performs the following task:
"${task}"

Requirements:
1. Do not include placeholder comments like "Add your code here".
2. Include all necessary imports, setup, and a main() function or equivalent entry point.
3. Implement all functionality described in the task.
4. Use correct syntax, indentation, and best practices.
5. For tasks involving APIs, bots, or automation (e.g., Telegram, email, web requests), include working code with necessary libraries.
6. If the task involves loops, scheduling, or delays, implement them correctly (e.g., using time.sleep in Python).
7. Do not add explanations, markdown, or triple backticks.
8. Output only the final script, ready to execute.

The script should be ready to run without further modification.
`;

    try {
      switch (selectedProvider.toLowerCase()) {
        case 'openai': {
          const result = await this.openAIScriptGenerator(buildPrompt(task, language));
          console.log('✅ Script generated using OpenAI');
          return { ...result, providerUsed: 'OpenAI' };
        }

        case 'huggingface': {
          const result = await this.huggingFaceScriptGenerator(buildPrompt(task, language));
          console.log('✅ Script generated using Hugging Face');
          return { ...result, providerUsed: 'Hugging Face' };
        }

        default: {
          throw new Error(`Unsupported provider for script generation: ${selectedProvider}`);
        }
      }
    } catch (err) {
      logError(err);
      throw new Error('Script generation failed.');
    }
  }


  // ------------------------
  // OpenAI: workflow parser
  // ------------------------
  async openAIParser(prompt) {
    if (!this.apiKeys.openai) {
      throw new Error('OpenAI API key not configured');
    }
    const client = new OpenAI({ apiKey: this.apiKeys.openai });

    const systemContent = `You are a workflow automation expert. Given the user prompt, return a JSON object ONLY with the structure:
{
  "nodes": [{ "id":"node-1", "type":"custom", "position": {"x":100,"y":100}, "data": { "label":"", "service":"", "description":"", "stepNumber":1, "parameters": {}, "parametersConfigured": false } }],
  "edges": [{ "id":"edge-1", "source":"node-1", "target":"node-2", "type":"smoothstep", "animated": true }]
}
Available services: trigger, telegram, gmail, slack, google-sheets, mysql, webhook, instagram, youtube, arduino, raspberry-pi, smart-switch, sensor-hub.
Return only valid JSON (no markdown fences).`;

    const completion = await client.chat.completions.create({
      model: this.openAIModel,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = completion.choices?.[0]?.message?.content || '';
    const json = this.extractJSON(content);
    if (!json) {
      // try fallback: allow code fences extraction then parsing
      throw new Error('Invalid response format from OpenAI');
    }
    return json;
  }

  // ------------------------
  // Hugging Face: workflow parser
  // ------------------------
  async huggingFaceParser(prompt) {
    if (!this.apiKeys.huggingface) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      const response = await axios.post(
        'https://router.huggingface.co/hf-inference/models/microsoft/DialoGPT-medium',
        {
          inputs: `Generate a workflow automation for: "${prompt}". Return only JSON with nodes and edges array.`,
          parameters: {
            max_length: 800,
            temperature: 0.7,
            do_sample: true
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKeys.huggingface}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const generatedText = response.data?.[0]?.generated_text || response.data?.generated_text || '';
      const json = this.extractJSON(generatedText);
      if (json) return json;
      return this.enhancedRuleBasedParser(prompt);
    } catch (err) {
      console.error('Hugging Face API error:', err?.response?.data || err?.message || err);
      throw new Error('Hugging Face service unavailable');
    }
  }

  // ------------------------
  // OpenAI: command parser
  // ------------------------
  async openAICommandParser(command, currentWorkflow) {
    if (!this.apiKeys.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const client = new OpenAI({ apiKey: this.apiKeys.openai });

    const systemContent = `You are a workflow modification expert. Modify workflows based on user commands.

Current Workflow:
${JSON.stringify(currentWorkflow || {}, null, 2)}

Return JSON with modifications:
{
  "nodes": [/* modified nodes array */],
  "edges": [/* modified edges array */],
  "workflowName": "optional new name",
  "explanation": "What changes were made"
}

Available commands:
- Add/Remove nodes
- Connect/Disconnect nodes
- Update parameters
- Rename workflow
- Reorder steps
- Change node properties

Return valid JSON only.`;

    const completion = await client.chat.completions.create({
      model: this.openAIModel,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: command }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = completion.choices?.[0]?.message?.content || '';
    const json = this.extractJSON(content);

    if (json) {
      return {
        success: true,
        modifications: json,
        explanation: json.explanation || `Processed command: "${command}"`
      };
    } else {
      throw new Error('Invalid response format from OpenAI');
    }
  }

  // ------------------------
  // Hugging Face: command parser
  // ------------------------
  async huggingFaceCommandParser(command, currentWorkflow) {
    if (!this.apiKeys.huggingface) {
      throw new Error('Hugging Face API key not configured');
    }
    try {
      const response = await axios.post(
        'https://router.huggingface.co/hf-inference/models/microsoft/DialoGPT-medium',
        {
          inputs: `Modify workflow based on command: "${command}". Current workflow: ${JSON.stringify(currentWorkflow)}. Return JSON with nodes, edges, workflowName, and explanation.`,
          parameters: {
            max_length: 1000,
            temperature: 0.7
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKeys.huggingface}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const generatedText = response.data?.[0]?.generated_text || '';
      const json = this.extractJSON(generatedText);
      if (json) {
        return {
          success: true,
          modifications: json,
          explanation: json.explanation || `Processed: "${command}"`
        };
      } else {
        return this.enhancedCommandParser(command, currentWorkflow);
      }
    } catch (err) {
      console.error('Hugging Face command error:', err?.message || err);
      return this.enhancedCommandParser(command, currentWorkflow);
    }
  }

  // ------------------------
  // Enhanced rule-based command parser (keeps original detailed logic)
  // ------------------------
  enhancedCommandParser(command, currentWorkflow) {
    const lowerCommand = (command || '').toLowerCase();
    const modifications = {
      nodes: Array.isArray(currentWorkflow?.nodes) ? [...currentWorkflow.nodes] : [],
      edges: Array.isArray(currentWorkflow?.edges) ? [...currentWorkflow.edges] : [],
      workflowName: currentWorkflow?.workflowName || currentWorkflow?.name || '',
      explanation: ''
    };

    let changes = [];

    try {
      // ADD NODE COMMANDS
      if (lowerCommand.includes('add') || lowerCommand.includes('create') || lowerCommand.includes('insert')) {
        const nodeTypes = this.detectNodeTypeFromCommand(lowerCommand);

        nodeTypes.forEach((nodeType, index) => {
          const newNode = this.createNode(nodeType, modifications.nodes.length + index);
          const position = this.calculateNewNodePosition(modifications.nodes.length + index);
          newNode.position = position;

          modifications.nodes.push(newNode);
          changes.push(`Added ${newNode.data.label} node`);
        });

        // Auto-connect new nodes
        if (modifications.nodes.length > 1 && nodeTypes.length === 1) {
          const sourceNode = modifications.nodes[modifications.nodes.length - 2];
          const targetNode = modifications.nodes[modifications.nodes.length - 1];

          const newEdge = {
            id: `edge-${Date.now()}-${modifications.edges.length}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'smoothstep',
            animated: true
          };

          modifications.edges.push(newEdge);
          changes.push(`Connected ${sourceNode.data.label} to ${targetNode.data.label}`);
        }
      }

      // REMOVE NODE COMMANDS
      if ((lowerCommand.includes('remove') || lowerCommand.includes('delete')) &&
        (lowerCommand.includes('node') || lowerCommand.includes('step'))) {

        const stepMatch = lowerCommand.match(/(?:step|node)\s*(\d+)/i);
        const nameMatch = lowerCommand.match(/(?:remove|delete)\s+(?:node|step)\s+["']?([^"'\s]+)["']?/i);

        let nodeToRemove;

        if (stepMatch) {
          const step = parseInt(stepMatch[1]);
          nodeToRemove = modifications.nodes.find(n => n.data.stepNumber === step);
        } else if (nameMatch) {
          const nodeName = nameMatch[1].toLowerCase();
          nodeToRemove = modifications.nodes.find(n =>
            n.data.label.toLowerCase().includes(nodeName) ||
            n.data.service.toLowerCase().includes(nodeName)
          );
        }

        if (nodeToRemove) {
          const nodeIndex = modifications.nodes.findIndex(n => n.id === nodeToRemove.id);
          if (nodeIndex !== -1) {
            modifications.nodes.splice(nodeIndex, 1);

            // Remove connected edges
            modifications.edges = modifications.edges.filter(edge =>
              edge.source !== nodeToRemove.id && edge.target !== nodeToRemove.id
            );

            // Reorder step numbers
            modifications.nodes.forEach((node, index) => {
              node.data.stepNumber = index + 1;
            });

            changes.push(`Removed ${nodeToRemove.data.label}`);
          }
        }
      }

      // CONNECT NODES COMMANDS
      if ((lowerCommand.includes('connect') || lowerCommand.includes('link')) &&
        (lowerCommand.includes('to') || lowerCommand.includes('with'))) {

        const connectionMatch = lowerCommand.match(/(?:step|node)\s*(\d+)\s*(?:to|with)\s*(?:step|node)\s*(\d+)/i);
        const nameMatch = lowerCommand.match(/(["']?[^"']+["']?)\s*(?:to|with)\s*(["']?[^"']+["']?)/i);

        let sourceNode, targetNode;

        if (connectionMatch) {
          const step1 = parseInt(connectionMatch[1]);
          const step2 = parseInt(connectionMatch[2]);
          sourceNode = modifications.nodes.find(n => n.data.stepNumber === step1);
          targetNode = modifications.nodes.find(n => n.data.stepNumber === step2);
        } else if (nameMatch) {
          const sourceName = nameMatch[1].replace(/["']/g, '').toLowerCase();
          const targetName = nameMatch[2].replace(/["']/g, '').toLowerCase();

          sourceNode = modifications.nodes.find(n =>
            n.data.label.toLowerCase().includes(sourceName) ||
            n.data.service.toLowerCase().includes(sourceName)
          );
          targetNode = modifications.nodes.find(n =>
            n.data.label.toLowerCase().includes(targetName) ||
            n.data.service.toLowerCase().includes(targetName)
          );
        }

        if (sourceNode && targetNode) {
          const newEdge = {
            id: `edge-${Date.now()}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'smoothstep',
            animated: true
          };

          // Remove existing edges between these nodes
          modifications.edges = modifications.edges.filter(edge =>
            !(edge.source === sourceNode.id && edge.target === targetNode.id)
          );

          modifications.edges.push(newEdge);
          changes.push(`Connected ${sourceNode.data.label} to ${targetNode.data.label}`);
        }
      }

      // DISCONNECT NODES
      if ((lowerCommand.includes('disconnect') || lowerCommand.includes('unlink')) &&
        (lowerCommand.includes('from') || lowerCommand.includes('between'))) {

        const disconnectMatch = lowerCommand.match(/(?:step|node)\s*(\d+)\s*(?:from|and)\s*(?:step|node)\s*(\d+)/i);

        if (disconnectMatch) {
          const step1 = parseInt(disconnectMatch[1]);
          const step2 = parseInt(disconnectMatch[2]);

          const sourceNode = modifications.nodes.find(n => n.data.stepNumber === step1);
          const targetNode = modifications.nodes.find(n => n.data.stepNumber === step2);

          if (sourceNode && targetNode) {
            modifications.edges = modifications.edges.filter(edge =>
              !(edge.source === sourceNode.id && edge.target === targetNode.id)
            );
            changes.push(`Disconnected step ${step1} from step ${step2}`);
          }
        }
      }

      // UPDATE PARAMETERS
      if ((lowerCommand.includes('set') || lowerCommand.includes('update') || lowerCommand.includes('change')) &&
        (lowerCommand.includes('parameter') || lowerCommand.includes('setting'))) {

        const stepMatch = lowerCommand.match(/(?:step|node)\s*(\d+)/i);
        const paramMatch = lowerCommand.match(/(?:parameter|setting)\s+["']?([^"'\s]+)["']?\s+(?:to|as)\s+["']?([^"']+)["']?/i);

        if (stepMatch && paramMatch) {
          const step = parseInt(stepMatch[1]);
          const paramName = paramMatch[1];
          const paramValue = paramMatch[2];

          const nodeIndex = modifications.nodes.findIndex(n => n.data.stepNumber === step);
          if (nodeIndex !== -1) {
            modifications.nodes[nodeIndex] = {
              ...modifications.nodes[nodeIndex],
              data: {
                ...modifications.nodes[nodeIndex].data,
                parameters: {
                  ...modifications.nodes[nodeIndex].data.parameters,
                  [paramName]: paramValue
                }
              }
            };
            changes.push(`Updated parameter "${paramName}" in step ${step} to "${paramValue}"`);
          }
        }
      }

      // RENAME WORKFLOW
      if ((lowerCommand.includes('rename') || lowerCommand.includes('change name')) && lowerCommand.includes('workflow')) {
        const nameMatch = lowerCommand.match(/(?:to|as)\s+["']?([^"']+)["']?/);
        if (nameMatch) {
          modifications.workflowName = nameMatch[1];
          changes.push(`Renamed workflow to "${nameMatch[1]}"`);
        }
      }

      // REORDER STEPS
      if (lowerCommand.includes('move') && lowerCommand.includes('step')) {
        const moveMatch = lowerCommand.match(/step\s*(\d+)\s+(?:before|after)\s+step\s*(\d+)/);
        if (moveMatch) {
          const stepToMove = parseInt(moveMatch[1]);
          const targetStep = parseInt(moveMatch[2]);
          const before = lowerCommand.includes('before');

          const nodeIndex = modifications.nodes.findIndex(n => n.data.stepNumber === stepToMove);
          const targetIndex = modifications.nodes.findIndex(n => n.data.stepNumber === targetStep);

          if (nodeIndex !== -1 && targetIndex !== -1) {
            const [node] = modifications.nodes.splice(nodeIndex, 1);
            const newIndex = before ? targetIndex : targetIndex + 1;
            modifications.nodes.splice(newIndex, 0, node);

            // Update step numbers
            modifications.nodes.forEach((node, index) => {
              node.data.stepNumber = index + 1;
            });

            changes.push(`Moved step ${stepToMove} ${before ? 'before' : 'after'} step ${targetStep}`);
          }
        }
      }

      if (changes.length === 0) {
        changes.push(`Processed command: "${command}"`);
      }
    } catch (err) {
      console.error('Command parsing error:', err);
      changes.push(`Error processing command: ${err.message}`);
    }

    modifications.explanation = changes.join(', ');
    return {
      success: changes.length > 0,
      modifications,
      explanation: modifications.explanation
    };
  }

  // ------------------------
  // Service detection helpers
  // ------------------------
  detectNodeTypeFromCommand(command) {
    const nodeTypes = [];

    if (command.includes('telegram')) nodeTypes.push('telegram-send');
    if (command.includes('gmail') || command.includes('email')) nodeTypes.push('gmail');
    if (command.includes('slack')) nodeTypes.push('slack');
    if (command.includes('sheet') || command.includes('spreadsheet')) nodeTypes.push('google-sheets');
    if (command.includes('database') || command.includes('mysql')) nodeTypes.push('mysql');
    if (command.includes('webhook')) nodeTypes.push('webhook');
    if (command.includes('arduino')) nodeTypes.push('arduino');
    if (command.includes('raspberry')) nodeTypes.push('raspberry-pi');
    if (command.includes('sensor')) nodeTypes.push('sensor-hub');
    if (command.includes('switch')) nodeTypes.push('smart-switch');

    if (nodeTypes.length === 0) nodeTypes.push('webhook');
    return nodeTypes;
  }

  createNode(service, stepNumber) {
    // baseNodes mirror original detailed templates for common services
    const baseNodes = {
      'telegram-send': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: 'Send Telegram Message',
          service: 'telegram-send',
          description: 'Sends message via Telegram bot',
          stepNumber: stepNumber + 1,
          parameters: {
            botToken: '',
            chatId: '',
            message: 'Hello from WorkflowAI!'
          },
          parametersConfigured: false
        }
      },
      'gmail': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: 'Send Gmail',
          service: 'gmail',
          description: 'Sends email via Gmail',
          stepNumber: stepNumber + 1,
          parameters: {
            to: '',
            subject: '',
            body: ''
          },
          parametersConfigured: false
        }
      },
      'slack': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: 'Post to Slack',
          service: 'slack',
          description: 'Posts message to Slack channel',
          stepNumber: stepNumber + 1,
          parameters: {
            channel: '#general',
            message: ''
          },
          parametersConfigured: false
        }
      },
      'google-sheets': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: 'Save to Google Sheets',
          service: 'google-sheets',
          description: 'Saves data to Google Sheets',
          stepNumber: stepNumber + 1,
          parameters: {
            spreadsheetId: '',
            sheetName: 'Sheet1',
            range: 'A:Z'
          },
          parametersConfigured: false
        }
      },
      'mysql': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: 'Save to Database',
          service: 'mysql',
          description: 'Saves data to MySQL database',
          stepNumber: stepNumber + 1,
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
        position: { x: 0, y: 0 },
        data: {
          label: 'Trigger Webhook',
          service: 'webhook',
          description: 'Triggers webhook endpoint',
          stepNumber: stepNumber + 1,
          parameters: {
            url: '',
            method: 'POST',
            headers: '{"Content-Type": "application/json"}',
            body: '{"data": "example"}'
          },
          parametersConfigured: false
        }
      },
      // add simple defaults for sensors/switches/arduino as needed
      'arduino': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: 'Arduino Command',
          service: 'arduino',
          description: 'Send command to Arduino',
          stepNumber: stepNumber + 1,
          parameters: {
            port: '/dev/ttyUSB0',
            command: ''
          },
          parametersConfigured: false
        }
      },
      'raspberry-pi': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: 'Raspberry Pi Task',
          service: 'raspberry-pi',
          description: 'Run command on Raspberry Pi',
          stepNumber: stepNumber + 1,
          parameters: {
            host: 'raspberrypi.local',
            command: ''
          },
          parametersConfigured: false
        }
      }
    };

    return baseNodes[service] || baseNodes['webhook'];
  }

  calculateNewNodePosition(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return { x: 100 + (col * 300), y: 100 + (row * 150) };
  }

  // ------------------------
  // Rule-based workflow parser (keeps original behavior)
  // ------------------------
  enhancedRuleBasedParser(prompt) {
    const lowerPrompt = (prompt || '').toLowerCase();
    const nodes = [];
    const edges = [];
    let nodeId = 1;

    // Enhanced service detection with proper node structure
    const services = this.detectServices(lowerPrompt);

    // Create trigger node based on prompt
    if (services.includes('telegram') && (lowerPrompt.includes('monitor') || lowerPrompt.includes('listen') || lowerPrompt.includes('watch'))) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: 'Monitor Telegram Messages',
          service: 'telegram-monitor',
          description: 'Listens for incoming messages in Telegram chat',
          stepNumber: 1,
          parameters: {
            botToken: '',
            chatId: '',
            keyword: ''
          },
          parametersConfigured: false
        }
      });
    } else if (services.includes('telegram') && lowerPrompt.includes('send')) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: 'Send Telegram Message',
          service: 'telegram-send',
          description: 'Sends message via Telegram bot',
          stepNumber: 1,
          parameters: {
            botToken: '',
            chatId: '',
            message: ''
          },
          parametersConfigured: false
        }
      });
    } else if (services.includes('gmail') && (lowerPrompt.includes('email') || lowerPrompt.includes('gmail'))) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: 'Monitor Gmail',
          service: 'gmail',
          description: 'Triggers when new email arrives',
          stepNumber: 1,
          parameters: {
            email: '',
            subjectFilter: ''
          },
          parametersConfigured: false
        }
      });
    } else {
      // Default trigger
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
    }

    // Create action nodes with proper structure
    if (services.includes('telegram') && lowerPrompt.includes('send') && nodes[0].data.service === 'telegram-monitor') {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 400, y: 100 },
        data: {
          label: 'Send Telegram Response',
          service: 'telegram-send',
          description: 'Sends automated response when message is received',
          stepNumber: nodes.length + 1,
          parameters: {
            botToken: '',
            chatId: '',
            message: 'Auto-response: Message received!'
          },
          parametersConfigured: false
        }
      });
    }

    if (services.includes('google-sheets') && (lowerPrompt.includes('sheet') || lowerPrompt.includes('spreadsheet'))) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 400, y: 200 },
        data: {
          label: 'Save to Google Sheets',
          service: 'google-sheets',
          description: 'Saves data to Google Sheets',
          stepNumber: nodes.length + 1,
          parameters: {
            spreadsheetId: '',
            sheetName: 'Sheet1',
            range: 'A:Z'
          },
          parametersConfigured: false
        }
      });
    }

    if (services.includes('slack')) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 400, y: 300 },
        data: {
          label: 'Post to Slack',
          service: 'slack',
          description: 'Posts message to Slack channel',
          stepNumber: nodes.length + 1,
          parameters: {
            webhookUrl: '',
            channel: '#general',
            message: '{{input}}'
          },
          parametersConfigured: false
        }
      });
    }

    if (services.includes('mysql') && lowerPrompt.includes('database')) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: 'custom',
        position: { x: 400, y: 400 },
        data: {
          label: 'Save to Database',
          service: 'mysql',
          description: 'Saves data to MySQL database',
          stepNumber: nodes.length + 1,
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

    return {
      nodes,
      edges,
      prompt: prompt
    };
  }

  detectServices(prompt) {
    const services = [];

    if (prompt.includes('gmail') || prompt.includes('email')) services.push('gmail');
    if (prompt.includes('telegram')) services.push('telegram');
    if (prompt.includes('slack')) services.push('slack');
    if (prompt.includes('sheet') || prompt.includes('spreadsheet')) services.push('google-sheets');
    if (prompt.includes('database') || prompt.includes('db') || prompt.includes('mysql')) services.push('mysql');
    if (prompt.includes('webhook')) services.push('webhook');
    if (prompt.includes('instagram')) services.push('instagram');
    if (prompt.includes('youtube') || prompt.includes('yt')) services.push('youtube');

    return services;
  }

  // ------------------------
  // ------------------------
  // OpenAI Script Generator
  // ------------------------
  async openAIScriptGenerator(prompt) {
    if (!this.apiKeys.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const client = new OpenAI({ apiKey: this.apiKeys.openai });

      const completion = await client.chat.completions.create({
        model: this.openAIModel || 'gpt-4o-mini', // or gpt-3.5-turbo if limited
        messages: [
          {
            role: 'system',
            content: `You are an expert code generator. Output only the final working script — no explanations, markdown, or commentary.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      // Extract code and remove any extra formatting
      let content = completion.choices?.[0]?.message?.content || '';
      content = content
        .replace(/```[\s\S]*?```/g, '') // remove markdown code fences
        .replace(/^[#\s]*You are an expert[\s\S]*?developer[\s\S]*?\n/g, '') // remove repeated prompt lines
        .trim();

      return { success: true, script: content };
    } catch (err) {
      console.error('OpenAI script generation failed:', err);
      throw err;
    }
  }



  // In server/Services/aiService.js - ADD this new method:

  async enhanceScriptWithHuggingFace(script, task, language) {
    if (!this.apiKeys.huggingface) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      console.log('🔄 Using Hugging Face for script enhancement');

      const enhancementPrompt = `
You are an expert code reviewer and enhancer. Please review and improve the following ${language} script.

ORIGINAL TASK: "${task}"
ORIGINAL SCRIPT:
${script}

IMPROVEMENTS NEEDED:
1. Fix any syntax errors or bugs
2. Add proper error handling
3. Improve code structure and readability
4. Add necessary comments for clarity
5. Ensure best practices are followed
6. Make sure the script is fully functional
7. Add input validation if needed
8. Improve variable names if unclear

Return ONLY the improved script code with no explanations, markdown, or additional text.
`;

      const response = await axios.post(
        'https://router.huggingface.co/v1/chat/completions',
        {
          messages: [
            {
              role: 'system',
              content: 'You are an expert code reviewer. Return ONLY the improved code with no explanations.'
            },
            {
              role: 'user',
              content: enhancementPrompt
            }
          ],
          model: 'deepseek-ai/DeepSeek-R1',
          max_tokens: 2500,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKeys.huggingface}`,
            'Content-Type': 'application/json'
          },
          timeout: 100000
        }
      );

      console.log('✅ Hugging Face enhancement response received');

      let enhancedContent = '';

      // Handle the chat completion response format
      if (response.data.choices && response.data.choices.length > 0) {
        enhancedContent = response.data.choices[0].message?.content || '';
      }

      // Clean up the output
      if (enhancedContent) {
        enhancedContent = enhancedContent
          .replace(/```[\s\S]*?```/g, '') // Remove markdown code blocks
          .replace(/^.*?(?=import|from|def|class|function|console|<!DOCTYPE)/s, '') // Remove preamble
          .replace(/^[#\/\/].*?(?:improved|enhanced|reviewed).*?\n/gi, '') // Remove enhancement headers
          .replace(/\b(?:Here('s| is)|This (code|script)).*?:\s*/gi, '') // Remove introductory phrases
          .trim();

        if (enhancedContent.length > script.length * 0.8) { // Ensure substantial content
          console.log('✅ Script enhanced successfully with Hugging Face');
          return { success: true, script: enhancedContent, enhanced: true };
        }
      }

      // If enhancement failed or didn't improve much, return original
      console.log('⚠️ Enhancement did not produce better results, using original');
      return { success: true, script: script, enhanced: false };

    } catch (err) {
      console.error('[huggingface] Script Enhancement Error:', err.message);

      // If enhancement fails, return original script
      console.log('⚠️ Enhancement failed, returning original script');
      return { success: true, script: script, enhanced: false };
    }
  }

  // ------------------------
  // Hugging Face Script Generator
  // ------------------------
  async huggingFaceScriptGenerator(prompt) {
    if (!this.apiKeys.huggingface) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      console.log('🔄 Using Hugging Face Chat Completion API');

      const response = await axios.post(
        'https://router.huggingface.co/v1/chat/completions',
        {
          messages: [
            {
              role: 'system',
              content: `STRICT INSTRUCTIONS: Generate ONLY the executable script code. 
- NO explanations, comments about the code, or thinking process
- NO markdown formatting or code fences
- NO introductory text like "Here is", "I'll generate", etc.
- Just pure, ready-to-run code
- If parameters are needed, use input() function for user input
- Include all necessary imports`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'deepseek-ai/DeepSeek-R1',
          max_tokens: 2000,
          temperature: 0.1,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKeys.huggingface}`,
            'Content-Type': 'application/json'
          },
          timeout: 100000
        }
      );

      console.log('✅ Hugging Face API response received');

      let content = '';

      if (response.data.choices && response.data.choices.length > 0) {
        content = response.data.choices[0].message?.content || '';
      }

      // Aggressive cleaning to remove ALL non-code content
      if (content) {
        content = content
          // Remove all markdown code blocks
          .replace(/```[\w]*\n?/g, '')
          .replace(/```/g, '')
          // Remove thinking/explanation blocks (everything between thinking tags)
          .replace(/<think>[\s\S]*?<\/think>/g, '')
          .replace(/```[\s\S]*?```/g, '')
          // Remove common AI introduction patterns
          .replace(/^(Here('s| is)?.+?(script|code):\s*\n?)/im, '')
          .replace(/^(Sure,?.+?(script|code):\s*\n?)/im, '')
          .replace(/^(I('ll| will)?.+?(script|code):\s*\n?)/im, '')
          .replace(/^This (script|code).+?:\s*\n?/im, '')
          .replace(/^The (script|code).+?:\s*\n?/im, '')
          // Remove everything before the first import/def/class/function
          .replace(/^[\s\S]*?(?=import |from |def |class |function |<!DOCTYPE |console\.|public |private |#include|print\()/i, '')
          // Remove any remaining thinking text
          .replace(/^.*?thinking.*?\n/gi, '')
          .replace(/^.*?explanation.*?\n/gi, '')
          .trim();

        // Final validation - must start with code patterns
        const codeStartPatterns = [
          /^import\s+/, /^from\s+/, /^def\s+/, /^class\s+/, /^function\s+/,
          /^<!DOCTYPE/, /^console\./, /^public\s+/, /^private\s+/, /^#include/,
          /^print\(/, /^const\s+/, /^let\s+/, /^var\s+/, /^\/\//
        ];

        const isValidCode = codeStartPatterns.some(pattern => pattern.test(content));

        if (content.length > 30 && isValidCode) {
          console.log('✅ Clean script generated with Hugging Face');
          return { success: true, script: content };
        }
      }

      throw new Error('No valid script content received from Hugging Face');

    } catch (err) {
      console.error('[huggingface] Chat Completion Error:', err.message);
      throw new Error(`Hugging Face API error: ${err.message}`);
    }
  }

  // Helper function to extract task from prompt
  parseTaskFromPrompt(prompt) {
    // Simple parsing - you can enhance this
    const languageMatch = prompt.match(/python|javascript|html|java|php|cpp/i);
    const language = languageMatch ? languageMatch[0].toLowerCase() : 'python';

    return {
      task: prompt,
      language: language
    };
  }





  // ------------------------
  // Rule-based script generator (keeps original templates & telegram special case)
  // ------------------------
  ruleBasedScriptGenerator(task, language) {
    const lowerTask = (task || '').toLowerCase();

    // Telegram-specific script generation
    if (lowerTask.includes('telegram') && lowerTask.includes('listen') && lowerTask.includes('reply')) {
      const telegramMatch = task.match(/chat\s*id\s*:\s*([-\d]+).*bot\s*token\s*:\s*([\w:]+)/i);

      if (telegramMatch) {
        const chatId = telegramMatch[1];
        const botToken = telegramMatch[2];

        if (language === 'python') {
          return {
            script: `import requests
import time
import json

# Telegram Bot Configuration
BOT_TOKEN = "${botToken}"
CHAT_ID = "${chatId}"
BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

def get_updates(offset=None):
    """Get new messages from Telegram"""
    url = f"{BASE_URL}/getUpdates"
    params = {'timeout': 100, 'offset': offset}
    
    try:
        response = requests.get(url, params=params, timeout=110)
        return response.json()
    except Exception as e:
        print(f"Error getting updates: {e}")
        return {'ok': False}

def send_message(chat_id, text):
    """Send message to Telegram chat"""
    url = f"{BASE_URL}/sendMessage"
    data = {'chat_id': chat_id, 'text': text}
    
    try:
        response = requests.post(url, json=data)
        return response.json()
    except Exception as e:
        print(f"Error sending message: {e}")
        return {'ok': False}

def main():
    print("🤖 Telegram Bot Started - Listening for messages...")
    print(f"📱 Chat ID: {CHAT_ID}")
    print("⏳ Waiting for incoming messages...")
    
    last_update_id = None
    
    while True:
        try:
            # Get new messages
            updates = get_updates(last_update_id)
            
            if updates.get('ok'):
                for update in updates.get('result', []):
                    # Process only new messages
                    if last_update_id is None or update['update_id'] > last_update_id:
                        last_update_id = update['update_id'] + 1
                        
                        # Check if message exists
                        if 'message' in update and 'text' in update['message']:
                            message = update['message']
                            chat_id = message['chat']['id']
                            text = message['text']
                            sender = message['from'].get('first_name', 'User')
                            
                            print(f"📨 New message from {sender}: {text}")
                            
                            # Reply with hello
                            response_text = "Hello! Thanks for your message."
                            send_message(chat_id, response_text)
                            print(f"✅ Replied to {sender}: {response_text}")
            
            # Wait before checking again
            time.sleep(2)
            
        except KeyboardInterrupt:
            print("\\n🛑 Bot stopped by user")
            break
        except Exception as e:
            print(f"❌ Error in main loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()`
          };
        }
      }
    }

    // Default template-based script generation
    let script = '';

    switch (language) {
      case 'python':
        script = `# ${task}
def main():
    print("Hello from Python script!")
    # Add your task implementation here
    # ${task}

if __name__ == "__main__":
    main()`;
        break;

      case 'javascript':
        script = `// ${task}
console.log("Hello from JavaScript!");

// Add your task implementation here
function main() {
    // ${task}
}

main();`;
        break;

      case 'html':
        script = `<!DOCTYPE html>
<html>
<head>
    <title>${task}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
    </style>
</head>
<body>
    <h1>Generated HTML</h1>
    <p>Task: ${task}</p>
    <script>
        // JavaScript code here
        console.log("HTML page loaded");
    </script>
</body>
</html>`;
        break;

      default:
        script = `// ${task} in ${language}
// Generated script for: ${task}
console.log("Hello from ${language} script!");`;
    }

    return { script };
  }

  // ------------------------
  // Utility: extract JSON safely from AI responses
  // ------------------------
  extractJSON(content) {
    if (!content || typeof content !== 'string') return null;

    // Try fenced ```json blocks first
    const fencedMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fencedMatch) {
      try {
        return JSON.parse(fencedMatch[1]);
      } catch (err) {
        // continue to other heuristics
      }
    }

    // Try generic fenced block ``` ... ```
    const anyFenced = content.match(/```[\s\S]*?```/);
    if (anyFenced) {
      const inner = anyFenced[0].replace(/```/g, '').trim();
      try {
        return JSON.parse(inner);
      } catch (err) {
        // continue
      }
    }

    // Try to find the first JSON object in the string
    const jsonMatch = content.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const candidate = jsonMatch[0];
      try {
        return JSON.parse(candidate);
      } catch (err) {
        // Attempt a more tolerant parse by fixing trailing commas (best-effort)
        try {
          const cleaned = candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          return JSON.parse(cleaned);
        } catch (err2) {
          return null;
        }
      }
    }
    return null;
  }

  // Add this method to the AIService class
  resolveDependencies(language, imports) {
    const dependencyMap = {
      python: {
        'telegram': 'python-telegram-bot',
        'telegram.ext': 'python-telegram-bot',
        'discord': 'discord.py',
        'flask': 'flask',
        'django': 'django',
        'requests': 'requests',
        'beautifulsoup4': 'beautifulsoup4',
        'selenium': 'selenium',
        'pandas': 'pandas',
        'numpy': 'numpy',
        'matplotlib': 'matplotlib',
        'opencv': 'opencv-python',
        'PIL': 'Pillow',
        'transformers': 'transformers',
        'torch': 'torch',
        'tensorflow': 'tensorflow'
      },
      javascript: {
        'express': 'express',
        'axios': 'axios',
        'cheerio': 'cheerio',
        'puppeteer': 'puppeteer',
        'discord.js': 'discord.js',
        'telegraf': 'telegraf',
        'node-telegram-bot-api': 'node-telegram-bot-api',
        'mongoose': 'mongoose',
        'sequelize': 'sequelize'
      }
    };

    const standardLib = {
      python: ['os', 'sys', 'json', 'time', 'datetime', 'math', 'random', 're'],
      javascript: ['http', 'https', 'fs', 'path', 'url', 'util']
    };

    if (!dependencyMap[language]) {
      return [];
    }

    return imports
      .filter(mod => !standardLib[language]?.includes(mod))
      .map(mod => dependencyMap[language][mod] || mod)
      .filter((pkg, index, self) => self.indexOf(pkg) === index);
  }

  // Add these methods to your AIService class

// ENHANCED WORKFLOW GENERATION WITH AUTO-INTEGRATION
// async generateCompleteWorkflow(prompt, userId, userIntegrations = []) {
//   try {
//     console.log('🚀 Generating complete workflow with auto-integration setup');
    
//     // Step 1: Generate workflow structure
//     const workflow = await this.parseWorkflowFromPrompt(prompt);
    
//     // Step 2: Analyze required integrations
//     const requiredServices = this.extractRequiredServices(workflow.nodes);
//     const missingIntegrations = this.findMissingIntegrations(requiredServices, userIntegrations);
    
//     // Step 3: Generate integration setup instructions
//     const integrationSetup = await this.generateIntegrationSetup(missingIntegrations);
    
//     // Step 4: Generate node parameters based on available integrations
//     const enhancedNodes = await this.enhanceNodesWithParameters(
//       workflow.nodes, 
//       userIntegrations,
//       missingIntegrations
//     );
    
//     return {
//       success: true,
//       workflow: {
//         ...workflow,
//         nodes: enhancedNodes
//       },
//       integrationSetup,
//       missingIntegrations,
//       prompt: prompt
//     };
    
//   } catch (error) {
//     console.error('Complete workflow generation error:', error);
//     throw new Error(`Workflow generation failed: ${error.message}`);
//   }
// }

// EXTRACT REQUIRED SERVICES FROM NODES
// extractRequiredServices(nodes) {
//   const services = new Set();
  
//   nodes.forEach(node => {
//     if (node.data.service && node.data.service !== 'trigger') {
//       services.add(node.data.service);
//     }
//   });
  
//   return Array.from(services);
// }

// FIND MISSING INTEGRATIONS
// findMissingIntegrations(requiredServices, userIntegrations) {
//   const missing = [];
  
//   requiredServices.forEach(service => {
//     const integration = userIntegrations.find(i => i.service === service);
//     if (!integration || !integration.isValid) {
//       missing.push({
//         service,
//         configured: !!integration,
//         isValid: integration?.isValid || false,
//         needsSetup: true
//       });
//     }
//   });
  
//   return missing;
// }

// GENERATE INTEGRATION SETUP INSTRUCTIONS
// async generateIntegrationSetup(missingIntegrations) {
//   const setupInstructions = [];
  
//   for (const integration of missingIntegrations) {
//     const instruction = await this.generateIntegrationInstruction(integration.service);
//     setupInstructions.push({
//       service: integration.service,
//       instruction,
//       priority: this.getIntegrationPriority(integration.service)
//     });
//   }
  
//   return setupInstructions.sort((a, b) => b.priority - a.priority);
// }

// GENERATE SPECIFIC INTEGRATION INSTRUCTIONS
// async generateIntegrationInstruction(service) {
//   const instructions = {
//     'telegram': {
//       title: 'Setup Telegram Bot',
//       steps: [
//         'Message @BotFather on Telegram',
//         'Use /newbot command to create a new bot',
//         'Copy the bot token provided by BotFather',
//         'Start a chat with your bot and send a message',
//         'Use /getUpdates to find your chat ID',
//         'Configure the integration with bot token and chat ID'
//       ],
//       parameters: ['botToken', 'chatId']
//     },
//     'gmail': {
//       title: 'Setup Gmail Integration',
//       steps: [
//         'Enable Gmail API in Google Cloud Console',
//         'Create OAuth 2.0 credentials',
//         'Configure authorized redirect URIs',
//         'Grant necessary Gmail permissions',
//         'Authenticate via OAuth flow'
//       ],
//       parameters: ['tokens']
//     },
//     'slack': {
//       title: 'Setup Slack Integration',
//       steps: [
//         'Go to api.slack.com/apps',
//         'Create a new Slack app',
//         'Enable Incoming Webhooks',
//         'Create a webhook URL for your channel',
//         'Copy the webhook URL',
//         'Configure the integration with the webhook URL'
//       ],
//       parameters: ['webhookUrl']
//     },
//     'mysql': {
//       title: 'Setup MySQL Database',
//       steps: [
//         'Ensure MySQL server is running',
//         'Create a database and user',
//         'Note database credentials: host, port, username, password, database name',
//         'Configure the integration with database details'
//       ],
//       parameters: ['host', 'port', 'database', 'username', 'password']
//     },
//     'webhook': {
//       title: 'Setup Webhook',
//       steps: [
//         'Create an endpoint to receive webhook calls',
//         'Note the webhook URL',
//         'Configure expected payload format',
//         'Set up authentication if required',
//         'Configure the integration with webhook URL'
//       ],
//       parameters: ['url', 'method', 'headers', 'body']
//     }
//   };
  
//   return instructions[service] || {
//     title: `Setup ${service}`,
//     steps: [`Configure ${service} integration in the Integrations tab`],
//     parameters: []
//   };
// }

// ENHANCE NODES WITH SMART PARAMETERS
// async enhanceNodesWithParameters(nodes, userIntegrations, missingIntegrations) {
//   return nodes.map(node => {
//     if (node.data.service === 'trigger') {
//       return {
//         ...node,
//         data: {
//           ...node.data,
//           parameters: {},
//           parametersConfigured: true
//         }
//       };
//     }
    
//     const integration = userIntegrations.find(i => i.service === node.data.service);
//     const isIntegrationMissing = missingIntegrations.some(mi => mi.service === node.data.service);
    
//     // Generate smart parameters based on service type
//     const smartParameters = this.generateSmartParameters(node.data.service, integration);
    
//     return {
//       ...node,
//       data: {
//         ...node.data,
//         parameters: smartParameters,
//         parametersConfigured: !isIntegrationMissing && Object.keys(smartParameters).length > 0,
//         integrationStatus: {
//           configured: !!integration,
//           valid: integration?.isValid || false,
//           needsSetup: isIntegrationMissing
//         }
//       }
//     };
//   });
// }

// GENERATE SMART PARAMETERS FOR EACH SERVICE TYPE
// generateSmartParameters(service, integration) {
//   const parameterTemplates = {
//     'telegram-send': {
//       message: 'Hello from WorkflowAI! 🚀',
//       botToken: integration?.config?.botToken || '',
//       chatId: integration?.config?.chatId || ''
//     },
//     'telegram-monitor': {
//       keyword: 'alert',
//       botToken: integration?.config?.botToken || '',
//       chatId: integration?.config?.chatId || ''
//     },
//     'gmail': {
//       to: 'recipient@example.com',
//       subject: 'Automated Email from WorkflowAI',
//       body: 'This is an automated email sent by your workflow.'
//     },
//     'slack': {
//       channel: '#general',
//       message: 'Hello from WorkflowAI! 👋',
//       webhookUrl: integration?.config?.webhookUrl || ''
//     },
//     'google-sheets': {
//       spreadsheetId: '',
//       sheetName: 'Sheet1',
//       range: 'A:Z'
//     },
//     'mysql': {
//       host: integration?.config?.host || 'localhost',
//       port: integration?.config?.port || 3306,
//       database: integration?.config?.database || '',
//       username: integration?.config?.username || '',
//       password: integration?.config?.password || '',
//       query: 'SELECT * FROM your_table WHERE condition = ?'
//     },
//     'webhook': {
//       url: integration?.config?.webhookUrl || '',
//       method: 'POST',
//       headers: '{"Content-Type": "application/json"}',
//       body: '{"data": "example", "timestamp": "{{timestamp}}"}'
//     }
//   };
  
//   return parameterTemplates[service] || {};
// }

// GET INTEGRATION PRIORITY FOR SETUP ORDER
// getIntegrationPriority(service) {
//   const priorities = {
//     'telegram': 10,
//     'gmail': 9,
//     'slack': 8,
//     'mysql': 7,
//     'webhook': 6,
//     'google-sheets': 5
//   };
  
//   return priorities[service] || 1;
// }

// Add this method to AIService class
async generateIntegrationTemplate(service) {
  const templates = {
    'telegram': {
      name: 'Telegram Bot',
      type: 'software',
      category: 'Communication',
      description: 'Send and receive messages via Telegram bot',
      authType: 'API Key',
      defaultConfig: {
        botToken: '',
        chatId: ''
      },
      setupGuide: `# Telegram Bot Setup Guide

## Steps:
1. Message @BotFather on Telegram
2. Use /newbot command to create a bot
3. Copy the bot token
4. Start chat with your bot and send a message
5. Get your chat ID using /getUpdates

## Parameters:
- **botToken**: Your bot's API token from BotFather
- **chatId**: Your chat ID with the bot`
    },
    'gmail': {
      name: 'Gmail',
      type: 'software',
      category: 'Communication',
      description: 'Send and receive emails via Gmail',
      authType: 'OAuth2',
      defaultConfig: {
        tokens: {}
      },
      setupGuide: `# Gmail Setup Guide

## Steps:
1. Enable Gmail API in Google Cloud Console
2. Create OAuth 2.0 credentials
3. Configure redirect URIs
4. Grant Gmail permissions
5. Authenticate via OAuth flow`
    },
    'slack': {
      name: 'Slack',
      type: 'software',
      category: 'Communication',
      description: 'Send messages to Slack channels',
      authType: 'Webhook',
      defaultConfig: {
        webhookUrl: ''
      },
      setupGuide: `# Slack Setup Guide

## Steps:
1. Go to api.slack.com/apps
2. Create a new Slack app
3. Enable Incoming Webhooks
4. Add a new webhook to your workspace
5. Copy the webhook URL`
    }
  };
  
  return templates[service] || {
    name: service,
    type: 'software',
    category: 'Other',
    description: `Integration with ${service}`,
    authType: 'API Key',
    defaultConfig: {},
    setupGuide: `# ${service} Setup Guide\n\nConfigure ${service} integration.`
  };
}

}


export default new AIService();
