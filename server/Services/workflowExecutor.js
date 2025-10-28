//server/Services/workflowExecutor.js
import { google } from 'googleapis';
import TelegramBot from 'node-telegram-bot-api';
import { WebClient } from '@slack/web-api';
import mysql from 'mysql2/promise';
import axios from 'axios';

export class WorkflowExecutor {
  constructor() {
    this.services = {
      gmail: this.executeGmailNode,
      telegram: this.executeTelegramNode,
      slack: this.executeSlackNode,
      'google-sheets': this.executeGoogleSheetsNode,
      webhook: this.executeWebhookNode,
      mysql: this.executeMySQLNode,
    };
  }

  async executeNode(node, integrationConfig, context = {}) {
    try {
      const service = node.data.service;
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

  // REAL TELEGRAM EXECUTION
  async executeTelegramNode(node, config, context) {
    const { parameters } = node.data;
    const { botToken, chatId } = config;

    if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
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

  // REAL SLACK EXECUTION
  async executeSlackNode(node, config, context) {
    const { parameters } = node.data;
    const { webhookUrl } = config;

    if (!webhookUrl || webhookUrl === 'YOUR_WEBHOOK_URL_HERE') {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.interpolateParameters(parameters.message, context);
    const payload = {
      text: message,
      channel: parameters.channel,
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

  // REAL GMAIL EXECUTION
  async executeGmailNode(node, config, context) {
    const { parameters } = node.data;
    const { tokens } = config;

    if (!tokens || !tokens.access_token) {
      throw new Error('Gmail not authenticated');
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Send email
    const message = this.createEmailMessage(
      parameters.to,
      this.interpolateParameters(parameters.subject, context),
      this.interpolateParameters(parameters.body, context)
    );

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: Buffer.from(message).toString('base64')
      }
    });

    return {
      success: true,
      messageId: response.data.id,
      action: 'email_sent',
      timestamp: new Date().toISOString()
    };
  }

  // REAL WEBHOOK EXECUTION
  async executeWebhookNode(node, config, context) {
    const { parameters } = node.data;
    const { webhookUrl } = config;

    if (!webhookUrl || webhookUrl === 'YOUR_WEBHOOK_URL_HERE') {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      ...context,
      timestamp: new Date().toISOString(),
      workflowNode: node.data.label,
      data: parameters.payload ? JSON.parse(parameters.payload) : {}
    };

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
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

    if (!host || host === 'localhost' || !database || database === 'your_database') {
      throw new Error('MySQL database not properly configured');
    }

    const connection = await mysql.createConnection({
      host,
      port: port || 3306,
      database,
      user: username,
      password
    });

    try {
      const query = this.interpolateParameters(parameters.query, context);
      const [rows] = await connection.execute(query);

      return {
        success: true,
        action: 'query_executed',
        rowCount: rows.length,
        data: rows,
        timestamp: new Date().toISOString()
      };
    } finally {
      await connection.end();
    }
  }

  // Helper methods
  createEmailMessage(to, subject, body) {
    const email = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    return email;
  }

  interpolateParameters(template, context) {
    if (!template || typeof template !== 'string') return template;
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? context[key] : match;
    });
  }
}

export default new WorkflowExecutor();