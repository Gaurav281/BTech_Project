//server/Services/workflowExecutor.js
import { google } from 'googleapis';
import TelegramBot from 'node-telegram-bot-api';
import { WebClient } from '@slack/web-api';
import mysql from 'mysql2/promise';
import axios from 'axios';

import HardwareService from './hardwareService.js';

export class WorkflowExecutor {
  constructor() {
    this.services = {
      gmail: this.executeGmailNode,
      telegram: this.executeTelegramNode,
      slack: this.executeSlackNode,
      'google-sheets': this.executeGoogleSheetsNode,
      webhook: this.executeWebhookNode,
      mysql: this.executeMySQLNode,
      trigger: this.executeTriggerNode,
      'bolt-wifi': this.executeBoltDevice,
      'temperature-sensor': this.executeTemperatureSensor,
      'light-sensor': this.executeLightSensor,
      'push-button': this.executePushButton,
      'led': this.executeLED,
      'buzzer': this.executeBuzzer,
      // New software services
      'google-forms': this.executeGoogleForms,
      'whatsapp': this.executeWhatsApp
    };
    this.executionHistory = new Map();
    this.loopCounters = new Map();
    this.MAX_LOOPS = 100; // Prevent infinite loops
  }

  // Add hardware execution methods
async executeBoltDevice(node, config, context) {
  const { parameters } = node.data;
  return await HardwareService.controlBoltDevice(config, parameters.command, parameters.data);
}

async executeTemperatureSensor(node, config, context) {
  const { parameters } = node.data;
  return await HardwareService.readTemperatureSensor({ ...config, ...parameters });
}

async executeLightSensor(node, config, context) {
  const { parameters } = node.data;
  return await HardwareService.readLightSensor({ ...config, ...parameters });
}

async executeLED(node, config, context) {
  const { parameters } = node.data;
  return await HardwareService.controlLED({ ...config, ...parameters });
}

async executeBuzzer(node, config, context) {
  const { parameters } = node.data;
  return await HardwareService.controlBuzzer({ ...config, ...parameters });
}

// Add new software services
async executeGoogleForms(node, config, context) {
  const { parameters } = node.data;
  const { tokens } = config;

  // Implementation for Google Forms API
  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  // Create form, get responses, etc.
  // This would be implemented based on Google Forms API
}

async executeWhatsApp(node, config, context) {
  const { parameters } = node.data;
  const { apiKey, phoneNumber } = config;

  // Implementation for WhatsApp API
  // This would use a service like Twilio or WhatsApp Business API
}

  async executeWorkflow(nodes, edges, integrations, onProgress, onLog) {
    const executionId = Date.now().toString();
    this.loopCounters.set(executionId, new Map());

    try {
      onLog('🚀 Starting workflow execution...', 'info');

      // Find start nodes (nodes with no incoming edges)
      const startNodes = this.findStartNodes(nodes, edges);

      if (startNodes.length === 0) {
        throw new Error('No start node found in workflow');
      }

      // Execute all start nodes
      for (const startNode of startNodes) {
        await this.executeNodeTree(startNode, nodes, edges, integrations, executionId, onProgress, onLog);
      }

      onLog('✅ Workflow execution completed successfully!', 'success');
      return { success: true, executionId };

    } catch (error) {
      onLog(`❌ Workflow execution failed: ${error.message}`, 'error');
      return { success: false, error: error.message, executionId };
    } finally {
      this.loopCounters.delete(executionId);
    }
  }

  async executeNodeTree(currentNode, nodes, edges, integrations, executionId, onProgress, onLog, visited = new Set(), depth = 0) {
    if (depth > 100) {
      throw new Error('Maximum execution depth exceeded - possible infinite loop');
    }

    const nodeId = currentNode.id;

    // Check for loops and increment counter
    if (visited.has(nodeId)) {
      const loopKey = `${executionId}-${nodeId}`;
      const currentCount = this.loopCounters.get(executionId).get(loopKey) || 0;

      if (currentCount >= this.MAX_LOOPS) {
        onLog(`🛑 Stopping loop execution for node ${currentNode.data.label} after ${this.MAX_LOOPS} iterations`, 'warning');
        return;
      }

      this.loopCounters.get(executionId).set(loopKey, currentCount + 1);
      onLog(`🔄 Loop iteration ${currentCount + 1} for node ${currentNode.data.label}`, 'info');
    } else {
      visited.add(nodeId);
    }

    // Execute current node
    onProgress(currentNode.id, 'executing');
    onLog(`▶️ Executing: ${currentNode.data.label}`, 'info');

    const context = {};
    try {
      const integration = integrations.find(i => i.service === currentNode.data.service);
      const result = await this.executeNode(currentNode, integration?.config || {}, context);

      onProgress(currentNode.id, 'success');
      onLog(`✅ ${currentNode.data.label} executed successfully`, 'success');

      // Find next nodes based on connections
      const nextNodes = this.findNextNodes(currentNode, nodes, edges);

      // Execute all connected nodes (parallel execution)
      const nextPromises = nextNodes.map(nextNode =>
        this.executeNodeTree(nextNode, nodes, edges, integrations, executionId, onProgress, onLog, new Set(visited), depth + 1)
      );

      await Promise.all(nextPromises);

    } catch (error) {
      onProgress(currentNode.id, 'error');
      onLog(`❌ ${currentNode.data.label} failed: ${error.message}`, 'error');
      throw error;
    }
  }

  findStartNodes(nodes, edges) {
    // Start nodes are nodes with no incoming edges OR trigger nodes
    const nodesWithIncomingEdges = new Set();
    edges.forEach(edge => nodesWithIncomingEdges.add(edge.target));

    return nodes.filter(node =>
      !nodesWithIncomingEdges.has(node.id) || node.data.service === 'trigger'
    );
  }

  findNextNodes(currentNode, nodes, edges) {
    const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);
    const nextNodeIds = outgoingEdges.map(edge => edge.target);
    return nodes.filter(node => nextNodeIds.includes(node.id));
  }

  async executeNode(node, integrationConfig, context = {}) {
    try {
      const service = node.data.service;

      if (service === 'trigger') {
        return await this.executeTriggerNode(node, integrationConfig, context);
      }

      const executor = this.services[service];
      if (!executor) {
        throw new Error(`No executor found for service: ${service}`);
      }

      console.log(`🔧 Executing ${service} node: ${node.data.label}`);

      const result = await executor.call(this, node, integrationConfig, context);

      console.log(`✅ ${service} node executed successfully`);
      return result;

    } catch (error) {
      console.error(`❌ ${node.data.service} execution failed:`, error);
      throw error;
    }
  }

  // TRIGGER NODE EXECUTION
  async executeTriggerNode(node, config, context) {
    return {
      success: true,
      action: 'workflow_triggered',
      timestamp: new Date().toISOString(),
      message: 'Workflow started manually'
    };
  }

  // REAL TELEGRAM EXECUTION
  async executeTelegramNode(node, config, context) {
    const { parameters } = node.data;
    const { botToken, chatId } = config;

    if (!botToken || botToken === 'YOUR_BOT_TOKEN') {
      throw new Error('Telegram bot token not configured');
    }

    const bot = new TelegramBot(botToken);
    const message = this.interpolateParameters(parameters.message, context);

    try {
      await bot.sendMessage(chatId, message, {
        parse_mode: 'HTML'
      });

      return {
        success: true,
        action: 'message_sent',
        timestamp: new Date().toISOString(),
        message: 'Telegram message sent successfully'
      };
    } catch (error) {
      throw new Error(`Telegram API error: ${error.message}`);
    }
  }

  // REAL GMAIL EXECUTION
  async executeGmailNode(node, config, context) {
    const { parameters } = node.data;
    const { tokens } = config;

    if (!tokens || !tokens.access_token) {
      throw new Error('Gmail not authenticated - Please configure Gmail integration first');
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials(tokens);

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const emailLines = [
        `To: ${this.interpolateParameters(parameters.to, context)}`,
        'Content-Type: text/html; charset=utf-8',
        `Subject: ${this.interpolateParameters(parameters.subject, context)}`,
        '',
        this.interpolateParameters(parameters.body, context)
      ];

      const email = emailLines.join('\r\n').trim();
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      return {
        success: true,
        messageId: response.data.id,
        action: 'email_sent',
        timestamp: new Date().toISOString(),
        message: 'Email sent successfully via Gmail'
      };

    } catch (error) {
      console.error('Gmail execution error:', error);
      throw new Error(`Gmail API error: ${error.message}`);
    }
  }

  // REAL GOOGLE SHEETS EXECUTION WITH INTEGRATION DATA
  // In the executeGoogleSheetsNode method, add better error handling:
  async executeGoogleSheetsNode(node, config, context) {
    const { parameters } = node.data;
    const { tokens } = config;

    if (!tokens || !tokens.access_token) {
      throw new Error('Google Sheets not authenticated - Please configure Google Sheets integration first');
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials(tokens);

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      // Use integration data for spreadsheetId if available, otherwise use node parameters
      const spreadsheetId = config.spreadsheetId || parameters.spreadsheetId;
      const range = parameters.range || 'Sheet1!A:Z';

      if (!spreadsheetId) {
        throw new Error('Spreadsheet ID not configured');
      }

      // Validate spreadsheet ID format
      if (!this.isValidSpreadsheetId(spreadsheetId)) {
        throw new Error('Invalid Spreadsheet ID format');
      }

      // First, try to get spreadsheet info to verify access
      try {
        const spreadsheetInfo = await sheets.spreadsheets.get({
          spreadsheetId,
          fields: 'properties.title,spreadsheetId'
        });

        console.log(`✅ Access verified for spreadsheet: ${spreadsheetInfo.data.properties.title}`);
      } catch (accessError) {
        if (accessError.code === 404) {
          throw new Error('Spreadsheet not found. Please check the Spreadsheet ID and ensure it\'s shared with your service account.');
        } else if (accessError.code === 403) {
          throw new Error('Access denied. Please ensure the spreadsheet is shared with your service account and the Google Sheets API is enabled.');
        }
        throw accessError;
      }

      // Example: Read data from sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      return {
        success: true,
        action: 'sheet_accessed',
        data: response.data.values,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Google Sheets API error:', error);

      // Provide more helpful error messages
      if (error.code === 404) {
        throw new Error('Google Sheets API: Spreadsheet not found. Please check the Spreadsheet ID.');
      } else if (error.code === 403) {
        throw new Error('Google Sheets API: Access denied. Please check permissions and ensure the spreadsheet is shared.');
      } else if (error.message.includes('invalid_grant')) {
        throw new Error('Google Sheets API: Authentication expired. Please reconnect your Google account.');
      }

      throw new Error(`Google Sheets API error: ${error.message}`);
    }
  }

  // Helper method to validate spreadsheet ID
  isValidSpreadsheetId(spreadsheetId) {
    // Basic validation for Google Sheets ID format
    return spreadsheetId && spreadsheetId.length > 5 && !spreadsheetId.includes(' ');
  }

  // REAL SLACK EXECUTION
  async executeSlackNode(node, config, context) {
    const { parameters } = node.data;
    const { webhookUrl } = config;

    if (!webhookUrl || webhookUrl === 'YOUR_WEBHOOK_URL') {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.interpolateParameters(parameters.message, context);
    const payload = {
      text: message,
      channel: parameters.channel || '#general',
      username: parameters.username || 'Workflow Bot'
    };

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      return {
        success: true,
        action: 'message_posted',
        timestamp: new Date().toISOString(),
        messageId: response.data.ts
      };
    } catch (error) {
      throw new Error(`Slack API error: ${error.response?.data || error.message}`);
    }
  }

  // REAL WEBHOOK EXECUTION
  async executeWebhookNode(node, config, context) {
    const { parameters } = node.data;
    const { webhookUrl } = config;

    if (!webhookUrl || webhookUrl === 'YOUR_WEBHOOK_URL') {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      ...context,
      timestamp: new Date().toISOString(),
      workflowNode: node.data.label,
      data: parameters.body ? JSON.parse(parameters.body) : {}
    };

    try {
      const response = await axios({
        method: parameters.method || 'POST',
        url: webhookUrl,
        headers: parameters.headers ? JSON.parse(parameters.headers) : { 'Content-Type': 'application/json' },
        data: payload,
        timeout: 10000
      });

      return {
        success: true,
        action: 'webhook_triggered',
        status: response.status,
        response: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Webhook error: ${error.response?.data || error.message}`);
    }
  }

  // REAL MYSQL EXECUTION
  async executeMySQLNode(node, config, context) {
    const { parameters } = node.data;
    const { host, port, database, username, password } = config;

    if (!host || !database || !username) {
      throw new Error('MySQL database configuration incomplete');
    }

    let connection;
    try {
      connection = await mysql.createConnection({
        host,
        port: port || 3306,
        database,
        user: username,
        password,
        connectTimeout: 10000
      });

      const query = this.interpolateParameters(parameters.query, context);
      const [rows] = await connection.execute(query);

      return {
        success: true,
        action: 'query_executed',
        rowCount: rows.length,
        data: rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`MySQL error: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // Helper methods
  interpolateParameters(template, context) {
    if (!template || typeof template !== 'string') return template;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? context[key] : match;
    });
  }

  stopExecution(executionId) {
    this.loopCounters.delete(executionId);
    // Additional cleanup logic can be added here
  }


  // server/Services/WorkflowExecutor.js - ENHANCED LOOP EXECUTION
  async executeWorkflowWithLoops(nodes, edges, integrations, onProgress, onLog) {
    const executionId = Date.now().toString();
    this.loopCounters.set(executionId, new Map());

    // Buffer for logs to avoid too many saves
    const logBuffer = [];
    const flushLogs = () => {
      if (logBuffer.length > 0) {
        logBuffer.forEach(log => onLog(log.message, log.type));
        logBuffer.length = 0;
      }
    };

    try {
      onLog('🚀 Starting workflow execution with loop detection...', 'info');

      if (nodes.length === 0) {
        throw new Error('No nodes in workflow');
      }

      // Find start nodes
      const startNodes = this.findStartNodes(nodes, edges);

      if (startNodes.length === 0) {
        onLog('⚠️ No explicit start node found, using first node', 'warning');
        startNodes.push(nodes[0]);
      }

      onLog(`📋 Found ${startNodes.length} start nodes`, 'info');

      // Create execution context
      const executionContext = {
        variables: {},
        loopData: new Map(),
        executionId
      };

      // Execute all start nodes
      for (const startNode of startNodes) {
        await this.executeNodeWithLoopDetection(
          startNode,
          nodes,
          edges,
          integrations,
          executionContext,
          (nodeId, status) => {
            onProgress(nodeId, status);
            // Buffer progress logs
            logBuffer.push({
              message: `Node ${nodeId} progress: ${status}`,
              type: 'info'
            });
            if (logBuffer.length >= 3) flushLogs();
          },
          (message, type = 'info') => {
            // Buffer regular logs
            logBuffer.push({ message, type });
            if (logBuffer.length >= 3 || type === 'error') flushLogs();
          }
        );
      }

      // Flush any remaining logs
      flushLogs();

      onLog('✅ Workflow execution completed successfully!', 'success');
      return { success: true, executionId };

    } catch (error) {
      flushLogs(); // Ensure error is logged
      onLog(`❌ Workflow execution failed: ${error.message}`, 'error');
      return { success: false, error: error.message, executionId };
    } finally {
      this.loopCounters.delete(executionId);
    }
  }

  async executeNodeWithLoopDetection(currentNode, nodes, edges, integrations, context, onProgress, onLog, visited = new Set(), depth = 0) {
    // Prevent infinite recursion
    if (depth > 100) {
      onLog('🛑 Maximum execution depth reached - stopping potential infinite loop', 'warning');
      return;
    }

    const nodeId = currentNode.id;

    // Enhanced loop detection
    const loopKey = `${context.executionId}-${nodeId}`;
    const currentCount = this.loopCounters.get(context.executionId).get(loopKey) || 0;

    if (visited.has(nodeId)) {
      if (currentCount >= this.MAX_LOOPS) {
        onLog(`🛑 Stopping loop execution for node ${currentNode.data.label} after ${this.MAX_LOOPS} iterations`, 'warning');
        return;
      }

      this.loopCounters.get(context.executionId).set(loopKey, currentCount + 1);
      onLog(`🔄 Loop iteration ${currentCount + 1} for node ${currentNode.data.label}`, 'info');
    } else {
      visited.add(nodeId);
    }

    // Execute current node
    onProgress(currentNode.id, 'executing');
    onLog(`▶️ Executing: ${currentNode.data.label}`, 'info');

    try {
      const integration = integrations.find(i => i.service === currentNode.data.service);
      const result = await this.executeNode(currentNode, integration?.config || {}, context.variables);

      // Update context with node results
      context.variables[`${currentNode.id}_result`] = result;
      context.variables[`${currentNode.data.service}_result`] = result;

      onProgress(currentNode.id, 'success');
      onLog(`✅ ${currentNode.data.label} executed successfully`, 'success');

      // Find next nodes based on connections
      const nextNodes = this.findNextNodes(currentNode, nodes, edges);

      if (nextNodes.length > 0) {
        onLog(`➡️ Found ${nextNodes.length} connected nodes`, 'info');
      }

      // Execute all connected nodes (sequential for proper flow)
      for (const nextNode of nextNodes) {
        await this.executeNodeWithLoopDetection(
          nextNode,
          nodes,
          edges,
          integrations,
          context,
          onProgress,
          onLog,
          new Set(visited), // New visited set for each branch
          depth + 1
        );
      }

    } catch (error) {
      onProgress(currentNode.id, 'error');
      onLog(`❌ ${currentNode.data.label} failed: ${error.message}`, 'error');
      throw error;
    }
  }
  

  // Helper method to find next nodes
  findNextNodes(currentNode, nodes, edges) {
    const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);
    const nextNodeIds = outgoingEdges.map(edge => edge.target);
    return nodes.filter(node => nextNodeIds.includes(node.id));
  }

  async executeNodeTreeWithLoops(currentNode, nodes, edges, integrations, context, onProgress, onLog, visited = new Set(), depth = 0) {
    // Prevent infinite recursion
    if (depth > 100) {
      onLog('🛑 Maximum execution depth reached - stopping potential infinite loop', 'warning');
      return;
    }

    const nodeId = currentNode.id;

    // Enhanced loop detection with context awareness
    const loopKey = `${context.executionId}-${nodeId}`;
    const currentCount = this.loopCounters.get(context.executionId).get(loopKey) || 0;

    if (visited.has(nodeId)) {
      if (currentCount >= this.MAX_LOOPS) {
        onLog(`🛑 Stopping loop execution for node ${currentNode.data.label} after ${this.MAX_LOOPS} iterations`, 'warning');
        return;
      }

      this.loopCounters.get(context.executionId).set(loopKey, currentCount + 1);
      onLog(`🔄 Loop iteration ${currentCount + 1} for node ${currentNode.data.label}`, 'info');
    } else {
      visited.add(nodeId);
    }

    // Execute current node
    onProgress(currentNode.id, 'executing');
    onLog(`▶️ Executing: ${currentNode.data.label}`, 'info');

    try {
      const integration = integrations.find(i => i.service === currentNode.data.service);
      const result = await this.executeNode(currentNode, integration?.config || {}, context.variables);

      // Update context with node results
      context.variables[`${currentNode.id}_result`] = result;
      context.variables[`${currentNode.data.service}_result`] = result;

      onProgress(currentNode.id, 'success');
      onLog(`✅ ${currentNode.data.label} executed successfully`, 'success');

      // Find next nodes based on connections
      const nextNodes = this.findNextNodes(currentNode, nodes, edges);

      if (nextNodes.length > 0) {
        onLog(`➡️ Found ${nextNodes.length} connected nodes`, 'info');
      }

      // Execute all connected nodes (sequential for proper flow)
      for (const nextNode of nextNodes) {
        await this.executeNodeTreeWithLoops(
          nextNode,
          nodes,
          edges,
          integrations,
          context,
          onProgress,
          onLog,
          new Set(visited), // New visited set for each branch
          depth + 1
        );
      }

    } catch (error) {
      onProgress(currentNode.id, 'error');
      onLog(`❌ ${currentNode.data.label} failed: ${error.message}`, 'error');

      // Check if there are error handling paths
      const errorHandlers = this.findErrorHandlerNodes(currentNode, edges);
      if (errorHandlers.length > 0) {
        onLog(`🔄 Executing ${errorHandlers.length} error handler(s)`, 'info');
        for (const handler of errorHandlers) {
          await this.executeNodeTreeWithLoops(
            handler,
            nodes,
            edges,
            integrations,
            context,
            onProgress,
            onLog,
            new Set(visited),
            depth + 1
          );
        }
      } else {
        throw error; // Re-throw if no error handlers
      }
    }
  }
}

export default new WorkflowExecutor();