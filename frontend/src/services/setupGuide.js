export const setupGuides = {
  telegram: {
    title: 'Telegram Bot Setup Guide',
    steps: [
      'Open Telegram and search for "@BotFather"',
      'Start a chat with BotFather and send "/newbot"',
      'Follow the instructions to name your bot',
      'Copy the bot token provided by BotFather',
      'Start a chat with your new bot and send a message',
      'Visit "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates" to get your chat ID',
      'Enter both token and chat ID in the configuration'
    ],
    tips: [
      'Keep your bot token secure - it can be used to control your bot',
      'Your bot needs to be started first (send /start) before it can message you',
      'For group chats, you need to add the bot to the group and get the group chat ID'
    ]
  },
  gmail: {
    title: 'Gmail OAuth Setup Guide',
    steps: [
      'Visit Google Cloud Console (https://console.cloud.google.com)',
      'Create a new project or select existing one',
      'Enable Gmail API for your project',
      'Configure OAuth consent screen',
      'Create OAuth 2.0 credentials (Web application)',
      'Add authorized redirect URIs: http://localhost:3000/integrations/oauth/callback',
      'Copy client ID and secret',
      'Test the integration'
    ],
    tips: [
      'Make sure to enable the Gmail API in your Google Cloud project',
      'Configure the OAuth consent screen with proper scopes',
      'Keep your client secret secure'
    ]
  },
  slack: {
    title: 'Slack App Setup Guide',
    steps: [
      'Visit https://api.slack.com/apps',
      'Click "Create New App"',
      'Choose "From scratch" and name your app',
      'Navigate to "OAuth & Permissions"',
      'Add redirect URLs',
      'Install the app to your workspace',
      'Copy the OAuth tokens'
    ],
    tips: [
      'Make sure to add the proper scopes for your app',
      'Install the app to your workspace to get the tokens',
      'Keep your signing secret secure'
    ]
  },
  'google-sheets': {
    title: 'Google Sheets Setup Guide',
    steps: [
      'Visit Google Cloud Console',
      'Enable Google Sheets API',
      'Create OAuth 2.0 credentials',
      'Configure consent screen',
      'Add redirect URIs',
      'Get API credentials',
      'Test the connection'
    ],
    tips: [
      'Make sure to enable Google Sheets API',
      'Configure proper scopes for read/write access',
      'Share your Google Sheet with the service account email'
    ]
  },
  instagram: {
    title: 'Instagram Setup Guide',
    steps: [
      'Create a Facebook Developer account',
      'Create a new app',
      'Add Instagram Basic Display product',
      'Configure valid OAuth redirect URIs',
      'Add Instagram testers',
      'Get access token',
      'Configure integration'
    ],
    tips: [
      'Instagram API requires business or creator account',
      'You need to go through app review for production use',
      'Test with Instagram testers first'
    ]
  },
  youtube: {
    title: 'YouTube Setup Guide',
    steps: [
      'Visit Google Cloud Console',
      'Enable YouTube Data API v3',
      'Create OAuth 2.0 credentials',
      'Configure consent screen',
      'Add redirect URIs',
      'Get API credentials',
      'Test the connection'
    ],
    tips: [
      'YouTube API has quota limits',
      'Different scopes for different access levels',
      'Verify your app for certain actions'
    ]
  },
  webhook: {
    title: 'Webhook Setup Guide',
    steps: [
      'Create a webhook endpoint in your application',
      'Ensure it accepts POST requests',
      'Configure the endpoint URL',
      'Set up authentication if required',
      'Test with sample data',
      'Configure in WorkflowAI'
    ],
    tips: [
      'Use HTTPS for production webhooks',
      'Implement signature verification for security',
      'Handle retries and errors gracefully'
    ]
  },
  mysql: {
    title: 'MySQL Database Setup Guide',
    steps: [
      'Ensure MySQL server is running',
      'Create a dedicated database user',
      'Grant necessary permissions',
      'Whitelist WorkflowAI server IP',
      'Test connection with credentials',
      'Configure in WorkflowAI'
    ],
    tips: [
      'Use a dedicated user with minimal permissions',
      'Enable SSL for secure connections',
      'Monitor database performance'
    ]
  },
  arduino: {
    title: 'Arduino Setup Guide',
    steps: [
      'Connect your Arduino via USB to your computer',
      'Install Arduino IDE from https://arduino.cc',
      'Install required drivers for your Arduino board',
      'Upload the WorkflowAI client sketch to your Arduino',
      'Note the serial port (COM3 on Windows, /dev/ttyUSB0 on Linux)',
      'Set baud rate to 9600 (default) or match your sketch',
      'Test connection with simple commands'
    ],
    code: `// Arduino WorkflowAI Client Sketch
void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readString();
    command.trim();
    
    if (command == "LED_ON") {
      digitalWrite(LED_BUILTIN, HIGH);
      Serial.println("LED turned ON");
    } else if (command == "LED_OFF") {
      digitalWrite(LED_BUILTIN, LOW);
      Serial.println("LED turned OFF");
    }
  }
}`,
    tips: [
      'Use a stable USB connection',
      'Check device manager for correct COM port',
      'Test with simple commands first'
    ]
  },
  'raspberry-pi': {
    title: 'Raspberry Pi Setup Guide',
    steps: [
      'Set up your Raspberry Pi with Raspberry Pi OS',
      'Enable SSH in the Raspberry Pi configuration',
      'Note the IP address of your Raspberry Pi',
      'Install required Python packages',
      'Set up the WorkflowAI agent on the Pi',
      'Configure firewall to allow SSH connections',
      'Test remote command execution'
    ],
    tips: [
      'Use static IP for reliable connections',
      'Set up key-based authentication for security',
      'Monitor Pi resources and temperature'
    ]
  },
  'smart-switch': {
    title: 'Smart Switch Setup Guide',
    steps: [
      'Install and set up your smart switch',
      'Connect it to your home network',
      'Get the device ID from manufacturer app',
      'Generate API key if required',
      'Test switch control manually',
      'Configure in WorkflowAI'
    ],
    tips: [
      'Ensure proper network connectivity',
      'Check manufacturer API documentation',
      'Test with manufacturer app first'
    ]
  },
  'sensor-hub': {
    title: 'Sensor Hub Setup Guide',
    steps: [
      'Set up your sensor hub hardware',
      'Connect sensors to the hub',
      'Configure MQTT broker settings',
      'Set up topics for sensor data',
      'Test MQTT connectivity',
      'Configure in WorkflowAI'
    ],
    tips: [
      'Use secure MQTT connections (TLS)',
      'Organize topics logically',
      'Monitor sensor data quality'
    ]
  }
};