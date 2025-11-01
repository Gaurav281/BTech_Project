//src/pages/WorkflowTab/components/SuggestionsSection.jsx
import React from 'react';

const SuggestionsSection = ({ workflowGeneration }) => {
  const { handleGenerateCompleteWorkflow } = workflowGeneration;

  const quickActions = [
    {
      title: "Social Media Monitor",
      description: "Monitor social media and send alerts",
      prompt: "Monitor Instagram for new posts and send Telegram notifications"
    },
    {
      title: "Database Backup",
      description: "Automate database operations",
      prompt: "Backup MySQL database daily to Google Sheets"
    },
    {
      title: "Email Automation",
      description: "Automate email workflows",
      prompt: "Send Gmail emails when new data arrives in database"
    },
    {
      title: "Notification System",
      description: "Create alert systems",
      prompt: "Send Slack notifications when website is down"
    }
  ];

  const handleQuickAction = (prompt) => {
    workflowGeneration.setPrompt(prompt);
    setTimeout(() => {
      handleGenerateCompleteWorkflow();
    }, 100);
  };

  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Start Templates</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleQuickAction(action.prompt)}
            className="bg-white border border-gray-200 rounded-lg p-3 text-left hover:border-blue-300 hover:shadow-sm transition-all duration-200"
          >
            <h5 className="font-semibold text-gray-900 text-sm mb-1">{action.title}</h5>
            <p className="text-xs text-gray-600">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestionsSection;