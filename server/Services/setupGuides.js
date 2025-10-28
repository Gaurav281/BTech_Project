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
    ]
  },
  // ... guides for all other integrations
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
}`
  }
};