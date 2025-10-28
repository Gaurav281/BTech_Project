// // server/routes/enhancedWorkflowGeneration.js
// import express from 'express';
// import EnhancedAIService from '../Services/enhancedAIService.js';
// import { authenticateToken } from '../middleware/auth.js';

// const router = express.Router();

// /**
//  * Enhanced workflow generation with Hugging Face
//  */
// router.post('/generate-complete-workflow', authenticateToken, async (req, res) => {
//   try {
//     const { prompt, model = 'deepseek-ai/DeepSeek-R1' } = req.body;

//     if (!prompt) {
//       return res.status(400).json({
//         success: false,
//         error: 'Prompt is required'
//       });
//     }

//     console.log(`🚀 Generating enhanced workflow for: "${prompt}"`);

//     const workflow = await EnhancedAIService.generateStructuredWorkflow(prompt, model);

//     res.json({
//       success: true,
//       workflow,
//       prompt,
//       modelUsed: model,
//       generatedAt: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('❌ Enhanced workflow generation error:', error);
    
//     res.status(500).json({
//       success: false,
//       error: 'Workflow generation failed',
//       details: error.message,
//       fallbackUsed: true
//     });
//   }
// });

// /**
//  * Test Hugging Face connection
//  */
// router.post('/test-huggingface', authenticateToken, async (req, res) => {
//   try {
//     const result = await EnhancedAIService.testConnection();
    
//     res.json(result);
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: `Test failed: ${error.message}`
//     });
//   }
// });

// /**
//  * Get available models
//  */
// router.get('/available-models', authenticateToken, (req, res) => {
//   res.json({
//     success: true,
//     models: EnhancedAIService.availableModels,
//     defaultModel: 'deepseek-ai/DeepSeek-R1'
//   });
// });

// export default router;