//src/services/availableIntegrations.js
import { 
  FaGoogle, FaTelegram, FaSlack, FaInstagram, FaYoutube, 
  FaDatabase, FaCog, FaMicrochip, FaServer, FaWifi, FaRobot 
} from 'react-icons/fa';

export const availableIntegrations = {
  software: [
    {
      id: 'gmail',
      name: 'Gmail',
      icon: FaGoogle,
      description: 'Connect your Gmail account to send and receive emails',
      authType: 'OAuth2',
      category: 'Communication',
      type: 'software',
      scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
      fields: []
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: FaTelegram,
      description: 'Connect Telegram bot to send and receive messages',
      authType: 'API Key',
      category: 'Communication',
      type: 'software',
      fields: [
        { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
        { key: 'chatId', label: 'Chat ID', type: 'text', required: true }
      ]
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: FaSlack,
      description: 'Connect Slack workspace to send messages and notifications',
      authType: 'OAuth2',
      category: 'Communication',
      type: 'software',
      scopes: ['channels:read', 'chat:write'],
      fields: []
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      icon: FaGoogle,
      description: 'Connect Google Sheets to read and write data',
      authType: 'OAuth2',
      category: 'Productivity',
      type: 'software',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      fields: []
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: FaInstagram,
      description: 'Connect Instagram account for automation',
      authType: 'OAuth2',
      category: 'Social Media',
      type: 'software',
      fields: [
        { key: 'accessToken', label: 'Access Token', type: 'password', required: true }
      ]
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: FaYoutube,
      description: 'Connect YouTube channel for video automation',
      authType: 'OAuth2',
      category: 'Social Media',
      type: 'software',
      scopes: ['https://www.googleapis.com/auth/youtube.upload'],
      fields: []
    },
    {
      id: 'webhook',
      name: 'Webhook',
      icon: FaCog,
      description: 'Configure custom webhook endpoints',
      authType: 'API Key',
      category: 'Development',
      type: 'software',
      fields: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'url', required: true },
        { key: 'secret', label: 'Secret Key', type: 'password', required: false }
      ]
    },
    {
      id: 'mysql',
      name: 'MySQL',
      icon: FaDatabase,
      description: 'Connect to MySQL database',
      authType: 'Database',
      category: 'Database',
      type: 'software',
      fields: [
        { key: 'host', label: 'Host', type: 'text', required: true },
        { key: 'port', label: 'Port', type: 'number', required: true, default: 3306 },
        { key: 'database', label: 'Database', type: 'text', required: true },
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true }
      ]
    }
  ],
  hardware: [
    {
      id: 'arduino',
      name: 'Arduino',
      icon: FaMicrochip,
      description: 'Connect Arduino devices for IoT automation',
      authType: 'Serial',
      category: 'IoT',
      type: 'hardware',
      fields: [
        { key: 'port', label: 'Serial Port', type: 'text', required: true },
        { key: 'baudRate', label: 'Baud Rate', type: 'number', required: true, default: 9600 }
      ]
    },
    {
      id: 'raspberry-pi',
      name: 'Raspberry Pi',
      icon: FaServer,
      description: 'Connect Raspberry Pi for hardware control',
      authType: 'SSH',
      category: 'IoT',
      type: 'hardware',
      fields: [
        { key: 'host', label: 'Host/IP', type: 'text', required: true },
        { key: 'port', label: 'SSH Port', type: 'number', required: true, default: 22 },
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true }
      ]
    },
    {
      id: 'smart-switch',
      name: 'Smart Switch',
      icon: FaWifi,
      description: 'Control smart switches and relays',
      authType: 'API Key',
      category: 'Home Automation',
      type: 'hardware',
      fields: [
        { key: 'deviceId', label: 'Device ID', type: 'text', required: true },
        { key: 'apiKey', label: 'API Key', type: 'password', required: true }
      ]
    },
    {
      id: 'sensor-hub',
      name: 'Sensor Hub',
      icon: FaRobot,
      description: 'Connect sensor hubs for data collection',
      authType: 'MQTT',
      category: 'IoT',
      type: 'hardware',
      fields: [
        { key: 'brokerUrl', label: 'MQTT Broker', type: 'text', required: true },
        { key: 'topic', label: 'Topic', type: 'text', required: true },
        { key: 'username', label: 'Username', type: 'text', required: false },
        { key: 'password', label: 'Password', type: 'password', required: false }
      ]
    }
  ]
};