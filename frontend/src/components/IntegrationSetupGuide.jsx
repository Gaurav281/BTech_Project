import React from 'react';
import { FaExternalLinkAlt, FaCopy, FaCheck } from 'react-icons/fa';

const IntegrationSetupGuide = ({ service, onClose }) => {
  const guides = {
    telegram: {
      title: 'Setup Telegram Bot',
      steps: [
        'Open Telegram and search for @BotFather',
        'Send /newbot command and follow instructions',
        'Copy the bot token provided by BotFather',
        'Configure your bot in the Integrations tab'
      ],
      link: 'https://core.telegram.org/bots#how-do-i-create-a-bot'
    },
    slack: {
      title: 'Setup Slack Webhook',
      steps: [
        'Go to your Slack workspace',
        'Navigate to Settings & Administration > Manage apps',
        'Search for "Incoming Webhooks" and install',
        'Create a new webhook for your channel',
        'Copy the webhook URL and configure in Integrations tab'
      ],
      link: 'https://api.slack.com/messaging/webhooks'
    },
    gmail: {
      title: 'Setup Gmail Integration',
      steps: [
        'Click the "Connect" button for Gmail',
        'You will be redirected to Google OAuth',
        'Grant the necessary permissions',
        'Return to the application'
      ],
      link: null
    }
  };

  const guide = guides[service];

  if (!guide) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{guide.title}</h3>
        
        <div className="space-y-3 mb-4">
          {guide.steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                {index + 1}
              </div>
              <p className="text-sm text-gray-700 flex-1">{step}</p>
            </div>
          ))}
        </div>

        {guide.link && (
          <a
            href={guide.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm mb-4"
          >
            <span>View detailed documentation</span>
            <FaExternalLinkAlt size={12} />
          </a>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              // Navigate to integrations tab
              window.location.href = '/integrations';
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Integrations
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetupGuide;