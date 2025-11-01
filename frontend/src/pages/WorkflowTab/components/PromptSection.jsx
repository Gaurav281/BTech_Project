//src/pages/WorkflowTab/components/PromptSection.jsx
import React from 'react';
import AIProviderSelector from "../../../components/AIProviderSelector";

const PromptSection = ({ workflowGeneration, aiCommands }) => {
  const {
    aiProvider,
    setAiProvider,
    huggingFaceModel,
    setHuggingFaceModel,
    prompt,
    setPrompt,
    isGenerating,
    availableModels,
    handleGenerateCompleteWorkflow
  } = workflowGeneration;

  const suggestions = [
    "Monitor Gmail for important emails and send Telegram notifications",
    "Save new Google Sheets rows to MySQL database automatically",
    "Send daily Slack reminders with weather information",
    "Backup Instagram posts to Google Sheets daily",
    "Create YouTube video summaries and email them weekly",
    "Monitor website uptime and alert on Telegram if down",
    "Sync customer data from webhook to Google Sheets",
    "Generate weekly reports from MySQL and post to Slack"
  ];

  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion);
    // Auto-generate when clicking suggestions
    setTimeout(() => {
      handleGenerateCompleteWorkflow();
    }, 100);
  };

  return (
    <>
      {/* AI Provider Selection */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <AIProviderSelector
          currentProvider={aiProvider}
          onProviderChange={setAiProvider}
        />

        {aiProvider === 'huggingface' && (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Model:</label>
            <select
              value={huggingFaceModel}
              onChange={(e) => setHuggingFaceModel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {availableModels.map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Generate Workflow Input */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your automation task (e.g., 'Send Telegram alerts when website is down')"
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
            onKeyPress={(e) => e.key === 'Enter' && handleGenerateCompleteWorkflow()}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateCompleteWorkflow}
            disabled={isGenerating || !prompt.trim()}
            className="flex-1 bg-blue-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-sm md:text-base"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Generating...
              </>
            ) : (
              'Generate Workflow'
            )}
          </button>
        </div>
      </div>

      {/* Suggestions Section */}
      <div className="mt-4">
        <div className="text-sm text-gray-600 mb-2">Popular automation templates:</div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 md:px-3 md:py-2 rounded-lg transition-colors border border-blue-200 break-words max-w-[200px] md:max-w-none"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default PromptSection;