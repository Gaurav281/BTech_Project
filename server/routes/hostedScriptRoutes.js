//server/routes/hostedScriptRoutes.js
import express from 'express';
import HostedScript from '../models/HostedScript.js';
import { authenticateToken } from '../middleware/auth.js';
import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import cron from 'node-cron';

const router = express.Router();
const execAsync = promisify(exec);

// Store active script processes and scheduled jobs
const activeProcesses = new Map();
const scheduledJobs = new Map();

// Generate unique endpoint name
const generateEndpointName = (name) => {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50) + '-' + Date.now().toString(36);
};

// Execute hosted script
// In server/routes/hostedScriptRoutes.js - FIX the execution function

const executeHostedScript = async (script, language, parameters = {}, environment = {}, inputData = {}) => {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const filename = `hosted_${Date.now()}.${getFileExtension(language)}`;
  const filepath = path.join(tempDir, filename);

  try {
    let processedScript = script;
    
    console.log('Original script length:', script.length);
    console.log('Parameters received:', parameters);
    
    // Enhanced parameter substitution for hosted scripts
    if (parameters && Object.keys(parameters).length > 0) {
      console.log('Applying parameters to hosted script:', parameters);
      
      Object.entries(parameters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          console.log(`Replacing parameter: ${key} with value: ${value}`);
          
          // Replace ${PARAM} pattern
          processedScript = processedScript.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
          // Replace input() patterns with parameter values
          processedScript = processedScript.replace(
            new RegExp(`input\\(\\s*['"][^'"]*${key}[^'"]*['"]\\s*\\)`, 'gi'), 
            `"${value}"`
          );
          // Replace YOUR_* placeholders
          processedScript = processedScript.replace(
            new RegExp(`YOUR_${key.toUpperCase()}`, 'gi'), 
            value
          );
          // Replace variable assignments with empty values
          processedScript = processedScript.replace(
            new RegExp(`(${key}\\s*=\\s*["'])\\s*(["'])`, 'g'), 
            `$1${value}$2`
          );
        }
      });
    }

    console.log('Processed script length:', processedScript.length);
    
    // Write script to file
    fs.writeFileSync(filepath, processedScript, 'utf8');

    // Execute using spawn for better control
    const result = await new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      let command, args;
      if (language === 'python') {
        command = 'python';
        args = [filepath];
      } else if (language === 'javascript') {
        command = 'node';
        args = [filepath];
      } else {
        return resolve({ success: false, error: `Unsupported language: ${language}` });
      }

      console.log(`Executing: ${command} ${args.join(' ')}`);
      
      const childProcess = spawn(command, args, {
        timeout: 30000,
        env: { ...process.env, ...environment },
        cwd: tempDir
      });

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('STDOUT:', data.toString());
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('STDERR:', data.toString());
      });

      childProcess.on('close', (code) => {
        console.log(`Process exited with code: ${code}`);
        if (code === 0) {
          resolve({ success: true, output: stdout, error: stderr });
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });

      childProcess.on('error', (error) => {
        console.log('Process error:', error);
        reject(error);
      });
    });

    // Cleanup
    setTimeout(() => {
      try {
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }, 5000);

    return result;
  } catch (error) {
    // Cleanup on error
    try {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch (err) {
      console.error('Cleanup error:', err);
    }
    return { 
      success: false, 
      error: error.message,
      stderr: error.stderr || ''
    };
  }
};

const getFileExtension = (language) => {
  const exts = { python: 'py', javascript: 'js', html: 'html' };
  return exts[language] || 'txt';
};

// Create hosted script
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, description, script, language, parameters, environment, rateLimit, schedule } = req.body;

    if (!name || !script || !language) {
      return res.status(400).json({ error: 'Name, script, and language are required' });
    }

    const endpoint = generateEndpointName(name);

    // Clean parameters - remove any empty or null values
    const cleanParameters = {};
    if (parameters && typeof parameters === 'object') {
      Object.entries(parameters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value.toString().trim() !== '') {
          cleanParameters[key] = value.toString().trim();
        }
      });
    }

    const hostedScript = await new HostedScript({
      name,
      description,
      script,
      language,
      endpoint,
      parameters: cleanParameters, // Use cleaned parameters
      environment: environment || {},
      rateLimit: rateLimit || { enabled: false, requestsPerMinute: 60 },
      schedule: schedule || { enabled: false, cronExpression: '' },
      createdBy: req.user._id
    }).save();

    // Start scheduled execution if enabled
    if (schedule?.enabled && schedule.cronExpression) {
      startScheduledExecution(hostedScript);
    }

    // Return the full URL that can be used to access the script
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-domain.com' 
      : `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      message: 'Script hosted successfully!',
      hostedScript: {
        ...hostedScript.toObject(),
        url: `${baseUrl}/api/hosted-scripts/run/${hostedScript.endpoint}`,
        fullExampleUrl: `${baseUrl}/api/hosted-scripts/run/${hostedScript.endpoint}?param1=value1&param2=value2`
      }
    });

  } catch (error) {
    console.error('Create hosted script error:', error);
    res.status(500).json({ error: 'Failed to host script' });
  }
});


// Start scheduled execution
const startScheduledExecution = (hostedScript) => {
  const jobId = hostedScript._id.toString();
  
  // Stop existing job if any
  if (scheduledJobs.has(jobId)) {
    scheduledJobs.get(jobId).stop();
    scheduledJobs.delete(jobId);
  }

  if (hostedScript.schedule.enabled && hostedScript.schedule.cronExpression) {
    try {
      const job = cron.schedule(hostedScript.schedule.cronExpression, async () => {
        try {
          console.log(`Executing scheduled script: ${hostedScript.name}`);
          await executeHostedScript(
            hostedScript.script,
            hostedScript.language,
            hostedScript.parameters,
            hostedScript.environment
          );
          
          // Update execution count
          await HostedScript.findByIdAndUpdate(hostedScript._id, {
            $inc: { executionCount: 1 },
            lastExecution: new Date()
          });
        } catch (error) {
          console.error('Scheduled execution error:', error);
        }
      });

      scheduledJobs.set(jobId, job);
      job.start();
    } catch (error) {
      console.error('Failed to schedule script:', error);
    }
  }
};

// Get user's hosted scripts
router.get('/my-scripts', authenticateToken, async (req, res) => {
  try {
    const hostedScripts = await HostedScript.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });

    // Add full URLs to each script
    const scriptsWithUrls = hostedScripts.map(script => ({
      ...script.toObject(),
      url: `${req.protocol}://${req.get('host')}/api/hosted-scripts/run/${script.endpoint}`
    }));

    res.json({ success: true, hostedScripts: scriptsWithUrls });
  } catch (error) {
    console.error('Get hosted scripts error:', error);
    res.status(500).json({ error: 'Failed to get hosted scripts' });
  }
});

// Execute hosted script via endpoint
router.post('/run/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const inputData = req.body;

    console.log(`Executing hosted script: ${endpoint}`);
    console.log('Input data:', inputData);

    const hostedScript = await HostedScript.findOne({ endpoint, isActive: true });
    if (!hostedScript) {
      return res.status(404).json({ error: 'Script not found or inactive' });
    }

    // Merge script parameters with incoming data
    // Script parameters are the default values, incoming data overrides them
    const executionParameters = { ...hostedScript.parameters, ...inputData };
    
    console.log('Execution parameters:', executionParameters);

    // Execute script with merged parameters
    const result = await executeHostedScript(
      hostedScript.script,
      hostedScript.language,
      executionParameters,
      hostedScript.environment,
      inputData
    );

    // Update execution stats
    await HostedScript.findByIdAndUpdate(hostedScript._id, {
      $inc: { executionCount: 1 },
      lastExecution: new Date()
    });

    if (result.success) {
      res.json({
        success: true,
        output: result.output,
        executionId: Date.now(),
        parametersUsed: executionParameters
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        output: result.output,
        parametersUsed: executionParameters
      });
    }

  } catch (error) {
    console.error('Run hosted script error:', error);
    res.status(500).json({ 
      error: 'Failed to execute script',
      details: error.message 
    });
  }
});

// ADD a GET endpoint for testing
router.get('/run/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const inputData = req.query; // Get parameters from query string

    console.log(`GET request to hosted script: ${endpoint}`);
    console.log('Query parameters:', inputData);

    const hostedScript = await HostedScript.findOne({ endpoint, isActive: true });
    if (!hostedScript) {
      return res.status(404).json({ error: 'Script not found or inactive' });
    }

    // Convert query parameters to proper format
    const executionParameters = { ...hostedScript.parameters, ...inputData };
    
    // Execute script
    const result = await executeHostedScript(
      hostedScript.script,
      hostedScript.language,
      executionParameters,
      hostedScript.environment,
      inputData
    );

    // Update execution stats
    await HostedScript.findByIdAndUpdate(hostedScript._id, {
      $inc: { executionCount: 1 },
      lastExecution: new Date()
    });

    if (result.success) {
      res.json({
        success: true,
        output: result.output,
        executionId: Date.now(),
        parametersUsed: executionParameters
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        output: result.output,
        parametersUsed: executionParameters
      });
    }

  } catch (error) {
    console.error('GET hosted script error:', error);
    res.status(500).json({ 
      error: 'Failed to execute script',
      details: error.message 
    });
  }
});


// Update hosted script
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const hostedScript = await HostedScript.findOne({ _id: id, createdBy: req.user._id });
    if (!hostedScript) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const updatedScript = await HostedScript.findByIdAndUpdate(
      id,
      { ...updates, lastExecution: new Date() },
      { new: true }
    );

    // Restart scheduling if schedule was updated
    if (updates.schedule) {
      startScheduledExecution(updatedScript);
    }

    res.json({
      success: true,
      message: 'Script updated successfully',
      hostedScript: {
        ...updatedScript.toObject(),
        url: `${req.protocol}://${req.get('host')}/api/hosted-scripts/run/${updatedScript.endpoint}`
      }
    });

  } catch (error) {
    console.error('Update hosted script error:', error);
    res.status(500).json({ error: 'Failed to update script' });
  }
});

// Delete hosted script
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const hostedScript = await HostedScript.findOne({ _id: id, createdBy: req.user._id });
    if (!hostedScript) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Stop scheduled job if running
    const jobId = id.toString();
    if (scheduledJobs.has(jobId)) {
      scheduledJobs.get(jobId).stop();
      scheduledJobs.delete(jobId);
    }

    await HostedScript.findByIdAndDelete(id);

    res.json({ success: true, message: 'Script deleted successfully' });

  } catch (error) {
    console.error('Delete hosted script error:', error);
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

// Toggle script activity
router.post('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const hostedScript = await HostedScript.findOne({ _id: id, createdBy: req.user._id });
    if (!hostedScript) {
      return res.status(404).json({ error: 'Script not found' });
    }

    hostedScript.isActive = !hostedScript.isActive;
    await hostedScript.save();

    // Start/stop scheduling based on activity
    if (hostedScript.isActive && hostedScript.schedule.enabled) {
      startScheduledExecution(hostedScript);
    } else {
      const jobId = id.toString();
      if (scheduledJobs.has(jobId)) {
        scheduledJobs.get(jobId).stop();
        scheduledJobs.delete(jobId);
      }
    }

    res.json({
      success: true,
      message: `Script ${hostedScript.isActive ? 'activated' : 'deactivated'}`,
      isActive: hostedScript.isActive
    });

  } catch (error) {
    console.error('Toggle script error:', error);
    res.status(500).json({ error: 'Failed to toggle script' });
  }
});

export default router;