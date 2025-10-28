import React from 'react';

const CommandSection = ({ aiCommands }) => {
  const {
    command,
    setCommand,
    isProcessingCommand,
    handleAICommand,
    commandExamples
  } = aiCommands;

  return (
    <>
      {/* AI Command Input */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="AI Command (e.g., 'Add Telegram node', 'Connect step 1 with step 2', 'Update parameters')"
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm md:text-base"
            onKeyPress={(e) => e.key === 'Enter' && handleAICommand()}
          />
        </div>
        <button
          onClick={handleAICommand}
          disabled={isProcessingCommand || !command.trim()}
          className="bg-purple-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-sm md:text-base"
        >
          {isProcessingCommand ? 'Processing...' : 'Execute Command'}
        </button>
      </div>

      {/* Command Examples */}
      <div className="mt-3">
        <div className="text-sm text-gray-600 mb-2">Command Examples:</div>
        <div className="flex flex-wrap gap-2">
          {commandExamples.map((example, index) => (
            <button
              key={index}
              onClick={() => setCommand(example)}
              className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-1 md:px-3 md:py-2 rounded-lg transition-colors border border-purple-200"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CommandSection;