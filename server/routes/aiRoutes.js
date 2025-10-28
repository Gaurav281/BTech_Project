// server/routes/aiRoutes.js
import express from 'express';
import { AIService } from '../Services/aiService.js';
import { authenticateToken } from '../middleware/auth.js';
import OpenAI from 'openai'; // ADD THIS IMPORT
import axios from 'axios';
import EnhancedAIService from '../Services/enhancedAIService.js';


const router = express.Router();
const aiService = new AIService();

// Get available AI providers
router.get('/providers', authenticateToken, (req, res) => {
  try {
    const providers = aiService.getProviders();
    res.json({
      success: true,
      providers,
      currentProvider: aiService.currentProvider
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to get AI providers' });
  }
});

// Set AI provider
router.post('/set-provider', authenticateToken, (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    aiService.setProvider(provider, apiKey);

    res.json({
      success: true,
      message: `AI provider set to ${aiService.getProviders()[provider]}`,
      currentProvider: provider
    });
  } catch (error) {
    console.error('Set provider error:', error);
    res.status(500).json({ error: 'Failed to set AI provider' });
  }
});

// Enhanced workflow generation route
router.post('/generate-complete-workflow', authenticateToken, async (req, res) => {
  try {
    const { prompt, model = 'deepseek-ai/DeepSeek-R1', userIntegrations = [] } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    console.log(`🚀 Generating enhanced workflow for: "${prompt}"`);

    const workflow = await EnhancedAIService.generateStructuredWorkflow(prompt, model, userIntegrations);

    res.json({
      success: true,
      workflow,
      prompt,
      modelUsed: model,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Enhanced workflow generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Workflow generation failed',
      details: error.message,
      fallbackUsed: true
    });
  }
});


// Test AI service connection - FIXED VERSION
// Test AI service connection - FIXED VERSION
router.post('/test-connection', authenticateToken, async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    let testResult;

    if (provider === 'openai' && apiKey) {
      try {
        // Test OpenAI connection
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Say "Connection successful"' }],
          max_tokens: 10
        });
        testResult = {
          valid: true,
          message: 'OpenAI connection successful! API key is valid.'
        };
      } catch (error) {
        if (error.status === 401) {
          testResult = {
            valid: false,
            message: 'Invalid OpenAI API key. Please check your key.'
          };
        } else if (error.status === 429) {
          testResult = {
            valid: false,
            message: 'OpenAI quota exceeded. Please check your billing.'
          };
        } else {
          testResult = {
            valid: false,
            message: `OpenAI connection failed: ${error.message}`
          };
        }
      }
    } else if (provider === 'huggingface' && apiKey) {
      try {
        // Test using the chat completion API with a simple prompt
        const response = await axios.post(
          'https://router.huggingface.co/v1/chat/completions',
          {
            messages: [
              {
                role: 'user',
                content: 'Say only "Connection successful" with no other text'
              }
            ],
            model: 'deepseek-ai/DeepSeek-R1',
            max_tokens: 10,
            temperature: 0.1
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (response.data.choices && response.data.choices.length > 0) {
          const content = response.data.choices[0].message?.content || '';
          if (content.includes('Connection successful')) {
            testResult = {
              valid: true,
              message: 'Hugging Face Chat API connection successful!'
            };
          } else {
            testResult = {
              valid: true,
              message: 'Hugging Face API connected but response format unexpected'
            };
          }
        } else {
          testResult = {
            valid: false,
            message: 'Hugging Face API responded but no choices returned'
          };
        }
      } catch (error) {
        if (error.response?.status === 401) {
          testResult = {
            valid: false,
            message: 'Invalid Hugging Face API token'
          };
        } else if (error.response?.status === 404) {
          testResult = {
            valid: false,
            message: 'Hugging Face model not found'
          };
        } else if (error.response?.status === 429) {
          testResult = {
            valid: false,
            message: 'Hugging Face rate limit exceeded'
          };
        } else {
          testResult = {
            valid: false,
            message: `Hugging Face connection failed: ${error.message}`
          };
        }
      }
    } else if (provider === 'normal') {
      testResult = {
        valid: true,
        message: 'Normal provider selected. No API key required.'
      };
    } else {
      testResult = {
        valid: false,
        message: 'API key is required for this provider.'
      };
    }

    res.json(testResult);
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      valid: false,
      message: `Connection test failed: ${error.message}`
    });
  }
});


// In server/routes/aiRoutes.js - ADD this new route:

// Enhance existing script
router.post('/enhance-script', authenticateToken, async (req, res) => {
  try {
    const { script, task, language } = req.body;

    if (!script || !task || !language) {
      return res.status(400).json({ error: 'Script, task, and language are required' });
    }

    console.log('🔧 Enhancing existing script with Hugging Face');

    const enhancedResult = await aiService.enhanceScriptWithHuggingFace(script, task, language);

    res.json({
      success: true,
      script: enhancedResult.script,
      enhanced: enhancedResult.enhanced,
      message: enhancedResult.enhanced ? 'Script enhanced successfully' : 'Script used as-is (enhancement skipped)'
    });

  } catch (error) {
    console.error('❌ Script enhancement error:', error);
    res.status(500).json({
      error: 'Failed to enhance script',
      details: error.message
    });
  }
});

// Generate workflow
router.post('/generate-workflow', authenticateToken, async (req, res) => {
  try {
    const { prompt, provider } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🔧 Generating workflow for prompt:', prompt, 'with provider:', provider);

    const workflow = await aiService.parseWorkflowFromPrompt(prompt, provider);

    res.json({
      success: true,
      nodes: workflow.nodes,
      edges: workflow.edges,
      prompt: prompt
    });

  } catch (error) {
    console.error('❌ Error generating workflow:', error);
    res.status(500).json({
      error: 'Failed to generate workflow',
      details: error.message
    });
  }
});


// Add this to server/routes/aiRoutes.js

router.post('/test-huggingface', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const testModels = [
      'microsoft/DialoGPT-medium',
      'microsoft/DialoGPT-large',
      'distilgpt2',
      'gpt2',
      'EleutherAI/gpt-neo-125M'
    ];

    const results = [];

    for (const model of testModels) {
      try {
        const response = await axios.post(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            inputs: 'Test connection',
            parameters: { max_new_tokens: 10 }
          },
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 30000
          }
        );

        results.push({ model, status: 'working', data: response.data });
      } catch (error) {
        results.push({
          model,
          status: 'failed',
          error: error.message,
          statusCode: error.response?.status
        });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process AI commands
router.post('/process-command', authenticateToken, async (req, res) => {
  try {
    const { command, currentWorkflow, provider } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    console.log('🔧 Processing AI command:', command, 'with provider:', provider);

    const result = await aiService.processCommand(command, currentWorkflow, provider);

    res.json(result);

  } catch (error) {
    console.error('❌ Error processing command:', error);
    res.status(500).json({
      error: 'Failed to process command',
      details: error.message
    });
  }
});

// Generate script - ENHANCED VERSION
router.post('/generate-script', authenticateToken, async (req, res) => {
  try {
    const { task, language, provider } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    console.log('🔧 Generating script - Task:', task, 'Language:', language, 'Provider:', provider);

    // Use specified provider or default
    const selectedProvider = provider || aiService.currentProvider || 'huggingface';

    const result = await aiService.generateScript(task, language, selectedProvider);

    console.log('✅ Script generated successfully');

    res.json({
      success: true,
      script: result.script,
      language: language,
      task: task,
      providerUsed: result.providerUsed || selectedProvider
    });

  } catch (error) {
    console.error('❌ Error generating script:', error);

    // Try fallback to rule-based generation
    try {
      console.log('🔄 Attempting rule-based fallback generation');
      const { task, language } = req.body;
      const fallbackResult = aiService.ruleBasedScriptGenerator(task, language);

      res.json({
        success: true,
        script: fallbackResult.script,
        language: language,
        task: task,
        providerUsed: 'Rule-Based Fallback'
      });
    } catch (fallbackError) {
      console.error('❌ Fallback generation also failed:', fallbackError);
      res.status(500).json({
        error: 'Script generation failed',
        details: error.message,
        fallbackError: fallbackError.message
      });
    }
  }
});

export default router;