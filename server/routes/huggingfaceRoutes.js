//server/routes/huggingfaceRoutes.js
import express from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Working Hugging Face models for inference
const WORKING_MODELS = [
  'microsoft/DialoGPT-large',
  'microsoft/DialoGPT-small', 
  'distilgpt2',
  'EleutherAI/gpt-neo-125M',
  'facebook/blenderbot-400M-distill',
  'microsoft/DialoGPT-medium' // Try medium again
];

// Test Hugging Face connection with multiple models
router.post('/test-models', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const testResults = [];
    
    for (const model of WORKING_MODELS) {
      try {
        console.log(`Testing model: ${model}`);
        
        const response = await axios.post(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            inputs: 'Test connection',
            parameters: {
              max_new_tokens: 10,
              temperature: 0.7
            }
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        testResults.push({
          model,
          status: 'success',
          response: response.data
        });
        
        console.log(`✅ Model ${model} is working`);
        break; // Stop at first working model
        
      } catch (error) {
        testResults.push({
          model,
          status: 'error',
          error: error.message,
          statusCode: error.response?.status
        });
        console.log(`❌ Model ${model} failed:`, error.message);
      }
    }

    const workingModel = testResults.find(result => result.status === 'success');
    
    if (workingModel) {
      res.json({
        valid: true,
        message: `Hugging Face connection successful! Working model: ${workingModel.model}`,
        workingModel: workingModel.model,
        allResults: testResults
      });
    } else {
      res.json({
        valid: false,
        message: 'No working Hugging Face models found. Please try different models.',
        allResults: testResults
      });
    }
    
  } catch (error) {
    console.error('Hugging Face test error:', error);
    res.status(500).json({
      valid: false,
      message: `Test failed: ${error.message}`
    });
  }
});

// Generate script using Hugging Face
router.post('/generate-script', authenticateToken, async (req, res) => {
  try {
    const { task, language, apiKey } = req.body;
    
    if (!task || !language || !apiKey) {
      return res.status(400).json({ 
        error: 'Task, language, and API key are required' 
      });
    }

    const prompt = `You are an expert ${language} developer. Generate a complete, fully functional ${language} script that performs the following task:
"${task}"

Requirements:
1. Do not include placeholder comments like "Add your code here".
2. Include all necessary imports, setup, and a main() function or equivalent entry point.
3. Implement all functionality described in the task.
4. Use correct syntax, indentation, and best practices.
5. For tasks involving APIs, bots, or automation, include working code with necessary libraries.
6. If the task involves loops, scheduling, or delays, implement them correctly.
7. Do not add explanations, markdown, or triple backticks.
8. Output only the final script, ready to execute.

The script should be ready to run without further modification.`;

    let lastError;
    
    for (const model of WORKING_MODELS) {
      try {
        console.log(`🔄 Trying Hugging Face model: ${model}`);
        
        const response = await axios.post(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            inputs: prompt,
            parameters: {
              max_new_tokens: 800,
              temperature: 0.7,
              do_sample: true,
              return_full_text: false
            }
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );

        let output = '';
        
        // Handle different response formats
        if (Array.isArray(response.data)) {
          output = response.data[0]?.generated_text || '';
        } else if (response.data?.generated_text) {
          output = response.data.generated_text;
        } else if (typeof response.data === 'string') {
          output = response.data;
        }

        // Clean up the output
        if (output) {
          output = output
            .replace(/```[\s\S]*?```/g, '')
            .replace(/^.*?(?=import|from|def|class|function|console|<!DOCTYPE)/s, '')
            .replace(/^[#\/\/].*?developer.*?\n/gi, '')
            .replace(/\b(?:Here('s| is)|This (code|script)).*?:\s*/gi, '')
            .trim();

          if (output.length > 50) {
            console.log(`✅ Success with model: ${model}`);
            
            return res.json({
              success: true,
              script: output,
              modelUsed: model,
              task: task,
              language: language
            });
          }
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ Model ${model} failed:`, error.message);
        continue;
      }
    }

    // If all models failed
    throw lastError || new Error('All Hugging Face models failed');

  } catch (error) {
    console.error('Hugging Face generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate script with Hugging Face',
      details: error.message
    });
  }
});

export default router;