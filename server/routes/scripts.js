//server/routes/scripts.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import Script from '../models/Script.js';
import ExecutionLog from '../models/ScriptExecutionLog.js';
import { authenticateToken } from '../middleware/auth.js';
import { AIService } from '../Services/aiService.js';

const router = express.Router();
const execAsync = promisify(exec);
const aiService = new AIService();

// Store active processes to prevent multiple instances
const activeProcesses = new Map();

// -----------------------------
// Route: Generate AI Script
// -----------------------------
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { task, language, provider } = req.body;
    if (!task || !language) return res.status(400).json({ error: 'Task and language required' });
    
    console.log(`🔧 Generating script - Task: "${task}", Language: ${language}, Provider: ${provider || 'default'}`);
    
    const selectedProvider = provider || 'huggingface';
    let result;
    let providerUsed = selectedProvider;
    
    try {
      result = await aiService.generateScript(task, language, selectedProvider);
      console.log(`✅ Script generated successfully with ${selectedProvider}`);
    } catch (aiError) {
      console.log(`❌ ${selectedProvider} generation failed:`, aiError.message);
      
      if (selectedProvider === 'huggingface') {
        console.log('🔄 Hugging Face failed, trying OpenAI fallback...');
        try {
          result = await aiService.generateScript(task, language, 'openai');
          providerUsed = 'OpenAI (Fallback)';
          console.log('✅ Script generated with OpenAI fallback');
        } catch (openaiError) {
          console.log('❌ OpenAI fallback also failed, using rule-based');
          result = aiService.ruleBasedScriptGenerator(task, language);
          providerUsed = 'Rule-Based Fallback';
        }
      } else if (selectedProvider === 'openai') {
        console.log('🔄 OpenAI failed, using rule-based fallback');
        result = aiService.ruleBasedScriptGenerator(task, language);
        providerUsed = 'Rule-Based Fallback';
      } else {
        console.log('🔄 Using rule-based generation');
        result = aiService.ruleBasedScriptGenerator(task, language);
        providerUsed = 'Rule-Based Fallback';
      }
    }
    
    res.json({ 
      script: result.script, 
      message: 'Script generated successfully',
      providerUsed: providerUsed
    });

  } catch (err) {
    console.error('❌ Generate script error:', err.message);
    
    try {
      const { task, language } = req.body;
      const fallbackResult = aiService.ruleBasedScriptGenerator(task, language);
      
      res.json({ 
        script: fallbackResult.script, 
        message: 'Script generated with fallback method',
        providerUsed: 'Rule-Based Fallback'
      });
    } catch (fallbackError) {
      console.error('❌ All generation methods failed:', fallbackError);
      res.status(500).json({ 
        error: 'Script generation failed',
        details: 'Please try a different task description or check your AI provider settings'
      });
    }
  }
});

// -----------------------------
// Route: Execute Script
// -----------------------------
router.post('/execute', authenticateToken, async (req, res) => {
  try {
    const { script, language, parameters } = req.body;
    if (!script || !language) return res.status(400).json({ error: 'Script and language required' });

    // Check if there's already an active execution for this user
    const activeExecution = await ExecutionLog.findOne({
      user: req.user._id,
      status: 'running'
    });

    if (activeExecution) {
      return res.status(400).json({ 
        error: 'You already have a script running. Please stop it first.',
        executionId: activeExecution._id
      });
    }

    const scriptDoc = await new Script({
      name: `Execution_${Date.now()}`,
      description: 'Temporary execution script',
      language,
      script,
      parameters: Object.keys(parameters || {}),
      createdBy: req.user._id,
      isPublic: false
    }).save();

    const executionLog = await new ExecutionLog({
      script: scriptDoc._id,
      user: req.user._id,
      status: 'running',
      startedAt: new Date(),
      language,
      parameters,
      logs: [{ level: 'info', message: 'Execution started', timestamp: new Date() }]
    }).save();

    executeScriptInBackground(script, language, parameters, executionLog._id, scriptDoc._id, req.user._id);

    res.json({ message: 'Script execution started', executionId: executionLog._id });

  } catch (err) {
    console.error('Execute script error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Install Dependencies
// -----------------------------
router.post('/install-dependencies', authenticateToken, async (req, res) => {
  try {
    const { language, packages, executionId } = req.body;
    
    if (!language || !packages || !Array.isArray(packages)) {
      return res.status(400).json({ error: 'Language and packages array are required' });
    }

    let executionLog;
    if (executionId) {
      executionLog = await ExecutionLog.findById(executionId);
      if (!executionLog) {
        return res.status(404).json({ error: 'Execution log not found' });
      }
    }

    const installResults = [];
    const tempDir = path.join(process.cwd(), 'temp');

    for (const pkg of packages) {
      try {
        let installCommand;
        
        if (language === 'python') {
          installCommand = `pip install ${pkg}`;
        } else if (language === 'javascript') {
          installCommand = `npm install ${pkg}`;
        } else {
          installResults.push({
            package: pkg,
            status: 'skipped',
            message: `No installation method for ${language}`
          });
          continue;
        }

        if (executionLog) {
          executionLog.logs.push({ 
            level: 'info', 
            message: `Installing ${pkg}...`, 
            timestamp: new Date() 
          });
          await executionLog.save();
        }

        const { stdout, stderr } = await execAsync(installCommand, { 
          timeout: 120000, 
          cwd: tempDir, 
          windowsHide: true 
        });

        installResults.push({
          package: pkg,
          status: 'success',
          message: `Successfully installed ${pkg}`
        });

        if (executionLog) {
          executionLog.logs.push({ 
            level: 'info', 
            message: `Successfully installed ${pkg}`, 
            timestamp: new Date() 
          });
        }

      } catch (error) {
        installResults.push({
          package: pkg,
          status: 'error',
          message: `Failed to install ${pkg}: ${error.message}`
        });

        if (executionLog) {
          executionLog.logs.push({ 
            level: 'error', 
            message: `Failed to install ${pkg}: ${error.message}`, 
            timestamp: new Date() 
          });
        }
      }
    }

    if (executionLog) {
      await executionLog.save();
    }

    res.json({
      success: true,
      results: installResults,
      message: `Dependency installation completed for ${packages.length} packages`
    });

  } catch (err) {
    console.error('Install dependencies error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Stop Execution
// -----------------------------
router.post('/stop/:executionId', authenticateToken, async (req, res) => {
  try {
    const execution = await ExecutionLog.findById(req.params.executionId);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (execution.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not authorized' });

    // Kill the process if it's running
    const processKey = `${execution.user}-${execution._id}`;
    const activeProcess = activeProcesses.get(processKey);
    if (activeProcess) {
      activeProcess.kill();
      activeProcesses.delete(processKey);
    }

    execution.status = 'stopped';
    execution.completedAt = new Date();
    execution.logs.push({ level: 'info', message: 'Execution stopped by user', timestamp: new Date() });
    await execution.save();

    res.json({ message: 'Script execution stopped' });

  } catch (err) {
    console.error('Stop script error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Get Active Executions
// -----------------------------
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const activeExecutions = await ExecutionLog.find({
      user: req.user._id,
      status: 'running'
    }).sort({ startedAt: -1 });

    res.json({ executions: activeExecutions });
  } catch (err) {
    console.error('Get active executions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Get Execution Status
// -----------------------------
router.get('/execution/:executionId', authenticateToken, async (req, res) => {
  try {
    const execution = await ExecutionLog.findById(req.params.executionId);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (execution.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not authorized' });

    res.json({
      status: execution.status,
      logs: execution.logs,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      duration: execution.duration
    });

  } catch (err) {
    console.error('Get execution status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Save Script
// -----------------------------
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { name, description, language, script, parameters } = req.body;
    const scriptDoc = await new Script({ name, description, language, script, parameters, createdBy: req.user._id }).save();
    res.json({ message: 'Script saved', script: scriptDoc });
  } catch (err) {
    console.error('Save script error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Script History
// -----------------------------
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const scripts = await Script.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ scripts });
  } catch (err) {
    console.error('Get script history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Publish Script
// -----------------------------
router.post('/publish', authenticateToken, async (req, res) => {
  try {
    const { name, description, language, script, isPublic } = req.body;
    const scriptDoc = await new Script({
      name, description, language, script,
      isPublic: isPublic || false,
      createdBy: req.user._id,
      publishedAt: new Date()
    }).save();
    res.json({ message: 'Published successfully', script: scriptDoc });
  } catch (err) {
    console.error('Publish script error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Marketplace - FIXED VERSION
// -----------------------------
router.get('/marketplace', async (req, res) => {
  try {
    const scripts = await Script.find({ 
      isPublic: true,
      publishedAt: { $exists: true } 
    })
    .populate('createdBy', 'name email')
    .sort({ publishedAt: -1 })
    .limit(50);
    
    res.json({ scripts });
  } catch (err) {
    console.error('Get public scripts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Use Marketplace Script - FIXED VERSION
// -----------------------------
router.post('/marketplace/:id/use', authenticateToken, async (req, res) => {
  try {
    const original = await Script.findOne({ 
      _id: req.params.id, 
      isPublic: true 
    });
    
    if (!original) {
      return res.status(404).json({ error: 'Public script not found' });
    }

    // Create a copy for the current user
    const newScript = await new Script({
      name: `${original.name} (Copy)`,
      description: original.description,
      language: original.language,
      script: original.script,
      parameters: original.parameters || [],
      createdBy: req.user._id,
      isPublic: false, // User's copy is private by default
      originalScript: original._id, // Reference to original
      downloadCount: 0,
      executionCount: 0
    }).save();

    // Increment download count on original script
    await Script.findByIdAndUpdate(original._id, { 
      $inc: { downloadCount: 1 } 
    });

    res.json({ 
      message: 'Script imported successfully', 
      script: newScript 
    });

  } catch (err) {
    console.error('Use script error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Get Popular Public Scripts
// -----------------------------
router.get('/marketplace/popular', async (req, res) => {
  try {
    const scripts = await Script.find({ 
      isPublic: true,
      publishedAt: { $exists: true }
    })
    .populate('createdBy', 'name email')
    .sort({ downloadCount: -1, executionCount: -1 })
    .limit(20);
    
    res.json({ scripts });
  } catch (err) {
    console.error('Get popular scripts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Search Public Scripts
// -----------------------------
router.get('/marketplace/search', async (req, res) => {
  try {
    const { q, language, sortBy = 'recent' } = req.query;
    
    let query = { isPublic: true };
    let sort = { publishedAt: -1 };
    
    // Search by query
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    
    // Filter by language
    if (language && language !== 'all') {
      query.language = language;
    }
    
    // Sort options
    if (sortBy === 'popular') {
      sort = { downloadCount: -1, executionCount: -1 };
    } else if (sortBy === 'name') {
      sort = { name: 1 };
    }
    
    const scripts = await Script.find(query)
      .populate('createdBy', 'name email')
      .sort(sort)
      .limit(50);
    
    res.json({ scripts });
  } catch (err) {
    console.error('Search public scripts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Route: Delete Script
// -----------------------------
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    
    // Only allow owner to delete
    if (script.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this script' });
    }

    await Script.findByIdAndDelete(req.params.id);
    res.json({ message: 'Script deleted successfully' });
  } catch (err) {
    console.error('Delete script error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get script execution logs for user
router.get('/executions/logs', authenticateToken, async (req, res) => {
  try {
    const executions = await ExecutionLog.find({ user: req.user._id })
      .populate('script', 'name language')
      .sort({ startedAt: -1 })
      .limit(50);

    res.json({ executions });
  } catch (err) {
    console.error('Get script executions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific script execution
router.get('/executions/:id', authenticateToken, async (req, res) => {
  try {
    const execution = await ExecutionLog.findById(req.params.id)
      .populate('script', 'name language');
    
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    // Check if user owns this execution
    if (execution.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ execution });
  } catch (err) {
    console.error('Get script execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// --- ENHANCED HELPER FUNCTIONS ---
// -----------------------------
function getFileExtension(language) {
  const exts = { python: 'py', javascript: 'js', html: 'html', cpp: 'cpp', java: 'java', php: 'php' };
  return exts[language] || 'txt';
}

// In the executeScriptInBackground function, 

// Track installed dependencies globally to avoid reinstallation
const globalInstalledDependencies = new Set();

async function executeScriptInBackground(script, language, parameters, executionId, scriptId, userId) {
  let executionLog;
  const processKey = `${userId}-${executionId}`;
  
  try {
    executionLog = await ExecutionLog.findById(executionId);
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const filename = `script_${Date.now()}.${getFileExtension(language)}`;
    const filepath = path.join(tempDir, filename);

    let processedScript = script;
    
    // ENHANCED PARAMETER SUBSTITUTION - FIXED
    if (parameters && Object.keys(parameters).length > 0) {
      executionLog.logs.push({ 
        level: 'info', 
        message: `Applying parameters: ${JSON.stringify(parameters)}`, 
        timestamp: new Date() 
      });
      
      // Replace various parameter patterns
      Object.entries(parameters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          // Replace ${PARAM} pattern
          processedScript = processedScript.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
          // Replace input() patterns - ONLY replace if it's actually an input call for this parameter
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
    
    // Add encoding configuration for Python
    if (language === 'python') {
      processedScript = `# -*- coding: utf-8 -*-\nimport sys\nsys.stdout.reconfigure(encoding='utf-8')\n${processedScript}`;
    }
    
    fs.writeFileSync(filepath, processedScript, 'utf8');

    executionLog.logs.push({ level: 'info', message: `Created file ${filename}`, timestamp: new Date() });
    await executionLog.save();

    // FIXED: Check for dependencies only if not already installed globally
    const imports = detectPythonImports(processedScript);
    const packagesToInstall = resolvePythonPackages(imports);
    
    // Filter out already installed dependencies (global check)
    const newPackagesToInstall = packagesToInstall.filter(pkg => !globalInstalledDependencies.has(pkg));
    
    if (newPackagesToInstall.length > 0) {
      executionLog.logs.push({ 
        level: 'info', 
        message: `Detected new dependencies: ${newPackagesToInstall.join(', ')}`, 
        timestamp: new Date() 
      });
      
      // Install dependencies
      for (const pkg of newPackagesToInstall) {
        try {
          executionLog.logs.push({ level: 'info', message: `Installing ${pkg}...`, timestamp: new Date() });
          await execAsync(`pip install ${pkg}`, { timeout: 120000, cwd: tempDir, windowsHide: true });
          executionLog.logs.push({ level: 'info', message: `Successfully installed ${pkg}`, timestamp: new Date() });
          globalInstalledDependencies.add(pkg); // Mark as installed globally
        } catch (err) {
          executionLog.logs.push({ 
            level: 'warning', 
            message: `Failed to install ${pkg}: ${err.message}`, 
            timestamp: new Date() 
          });
        }
      }
      await executionLog.save();
    } else if (packagesToInstall.length > 0) {
      executionLog.logs.push({ 
        level: 'info', 
        message: `Dependencies already installed: ${packagesToInstall.join(', ')}`, 
        timestamp: new Date() 
      });
      await executionLog.save();
    }

    const command = getExecutionCommand(language, filepath);
    
    // Use spawn instead of exec for better process control
    const childProcess = spawn(command[0], command.slice(1), {
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
      windowsHide: true
    });

    // Store the process reference
    activeProcesses.set(processKey, childProcess);

    let stdoutData = '';
    let stderrData = '';

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      output.split('\n').filter(Boolean).forEach(line => {
        executionLog.logs.push({ level: 'info', message: line, timestamp: new Date() });
      });
    });

    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;
      output.split('\n').filter(Boolean).forEach(line => {
        executionLog.logs.push({ level: 'error', message: line, timestamp: new Date() });
      });
    });

    // Handle stdin if needed (for input() calls)
    childProcess.stdin.on('error', (error) => {
      console.log('Stdin error:', error);
    });

    childProcess.on('close', async (code) => {
      activeProcesses.delete(processKey);
      
      executionLog.status = code === 0 ? 'completed' : 'error';
      executionLog.completedAt = new Date();
      executionLog.duration = executionLog.completedAt - executionLog.startedAt;

      if (code !== 0) {
        executionLog.logs.push({ 
          level: 'error', 
          message: `Process exited with code ${code}`, 
          timestamp: new Date() 
        });
      }

      await Script.findByIdAndUpdate(scriptId, { $inc: { executionCount: 1 } });
      await executionLog.save();
      
      // Cleanup temp files after execution
      setTimeout(() => cleanupTempFiles(filepath), 5000);
    });

    childProcess.on('error', async (error) => {
      activeProcesses.delete(processKey);
      console.error('Process error:', error);
      
      executionLog.status = 'error';
      executionLog.completedAt = new Date();
      executionLog.duration = executionLog.completedAt - executionLog.startedAt;
      executionLog.logs.push({ level: 'error', message: error.message, timestamp: new Date() });
      await executionLog.save();
    });

  } catch (err) {
    console.error('Execution setup error:', err);
    if (executionLog) {
      executionLog.status = 'error';
      executionLog.completedAt = new Date();
      executionLog.duration = executionLog.completedAt - executionLog.startedAt;
      executionLog.logs.push({ level: 'error', message: err.message, timestamp: new Date() });
      await executionLog.save();
    }
    activeProcesses.delete(processKey);
  }
}

// -----------------------------
// Route: Install Custom Dependencies
// -----------------------------
router.post('/install-custom-dependencies', authenticateToken, async (req, res) => {
  try {
    const { commands, executionId } = req.body;
    
    if (!commands || !Array.isArray(commands)) {
      return res.status(400).json({ error: 'Commands array is required' });
    }

    let executionLog;
    if (executionId) {
      executionLog = await ExecutionLog.findById(executionId);
      if (!executionLog) {
        return res.status(404).json({ error: 'Execution log not found' });
      }
    }

    const installResults = [];
    const tempDir = path.join(process.cwd(), 'temp');

    for (const command of commands) {
      try {
        if (executionLog) {
          executionLog.logs.push({ 
            level: 'info', 
            message: `Running: ${command}`, 
            timestamp: new Date() 
          });
          await executionLog.save();
        }

        // Enhanced command execution with better error handling
        let execCommand = command;
        let execOptions = { 
          timeout: 120000, 
          cwd: tempDir, 
          windowsHide: true,
          shell: true // Use shell to handle npm commands properly
        };

        // For npm commands, use a more specific approach
        if (command.startsWith('npm ')) {
          execOptions.env = {
            ...process.env,
            NODE_ENV: 'production',
            // Add npm-specific environment variables if needed
          };
        }

        const { stdout, stderr } = await execAsync(execCommand, execOptions);

        installResults.push({
          command: command,
          status: 'success',
          message: `Command executed successfully`,
          output: stdout
        });

        if (executionLog) {
          executionLog.logs.push({ 
            level: 'info', 
            message: `✅ ${command} - Success`, 
            timestamp: new Date() 
          });
        }

      } catch (error) {
        console.error(`Command execution failed: ${command}`, error);
        
        installResults.push({
          command: command,
          status: 'error',
          message: `Command failed: ${error.message}`,
          error: error.stderr || error.message,
          details: error.stdout // Include stdout for additional context
        });

        if (executionLog) {
          executionLog.logs.push({ 
            level: 'error', 
            message: `❌ ${command} - Failed: ${error.message}`, 
            timestamp: new Date() 
          });
          
          // Log additional details for debugging
          if (error.stdout) {
            executionLog.logs.push({
              level: 'error',
              message: `Additional info: ${error.stdout}`,
              timestamp: new Date()
            });
          }
        }
      }
    }

    if (executionLog) {
      await executionLog.save();
    }

    res.json({
      success: true,
      results: installResults,
      message: `Custom dependency installation completed`
    });

  } catch (err) {
    console.error('Custom dependency installation error:', err);
    res.status(500).json({ 
      error: err.message,
      details: 'Make sure npm and pip are properly installed on the server'
    });
  }
});

function getExecutionCommand(language, filepath) {
  switch (language) {
    case 'python':
      return ['python', filepath];
    case 'javascript':
      return ['node', filepath];
    case 'html':
      return ['echo', 'HTML files cannot be executed directly'];
    default:
      return ['echo', `Cannot execute ${language} scripts`];
  }
}

async function checkSystemDependencies(language, executionLog) {
  try {
    executionLog.logs.push({ level: 'info', message: `Checking ${language} environment`, timestamp: new Date() });
    
    let checkCommand;
    switch (language) {
      case 'python':
        checkCommand = 'python --version';
        break;
      case 'javascript':
        checkCommand = 'node --version';
        break;
      default:
        checkCommand = `echo "No specific dependency check for ${language}"`;
    }
    
    await execAsync(checkCommand);
    executionLog.logs.push({ level: 'info', message: `${language} environment is ready`, timestamp: new Date() });
    await executionLog.save();
  } catch (error) {
    executionLog.logs.push({ level: 'error', message: `${language} not found in PATH: ${error.message}`, timestamp: new Date() });
    await executionLog.save();
    throw new Error(`${language} environment not properly configured`);
  }
}

async function installPythonDependencies(script, executionLog, tempDir) {
  const imports = detectPythonImports(script);
  const packagesToInstall = resolvePythonPackages(imports);
  
  if (packagesToInstall.length > 0) {
    executionLog.logs.push({ 
      level: 'info', 
      message: `Detected dependencies: ${packagesToInstall.join(', ')}`, 
      timestamp: new Date() 
    });
  }
  
  for (const pkg of packagesToInstall) {
    try {
      executionLog.logs.push({ level: 'info', message: `Installing ${pkg}...`, timestamp: new Date() });
      await execAsync(`pip install ${pkg}`, { timeout: 120000, cwd: tempDir, windowsHide: true });
      executionLog.logs.push({ level: 'info', message: `Successfully installed ${pkg}`, timestamp: new Date() });
    } catch (err) {
      executionLog.logs.push({ 
        level: 'warning', 
        message: `Failed to install ${pkg}: ${err.message}. You may need to install it manually.`, 
        timestamp: new Date() 
      });
    }
  }
  await executionLog.save();
}

function detectPythonImports(script) {
  const imports = [];
  const patterns = [
    /^\s*import\s+([a-zA-Z0-9_]+)/gm,
    /^\s*from\s+([a-zA-Z0-9_\.]+)\s+import/gm
  ];
  
  for (const p of patterns) {
    let match;
    while ((match = p.exec(script)) !== null) {
      if (match[1]) {
        const baseModule = match[1].split('.')[0];
        if (!imports.includes(baseModule)) {
          imports.push(baseModule);
        }
      }
    }
  }
  return imports;
}

function resolvePythonPackages(imports) {
  const standardLib = [
    'os', 'sys', 'json', 'csv', 'datetime', 'time', 'sqlite3', 'math', 
    'random', 're', 'collections', 'itertools', 'functools', 'pathlib'
  ];
  
  const packageMap = {
    'requests': 'requests',
    'telegram': 'python-telegram-bot',
    'telegram.ext': 'python-telegram-bot',
    'beautifulsoup4': 'beautifulsoup4',
    'bs4': 'beautifulsoup4',
    'selenium': 'selenium',
    'pandas': 'pandas',
    'numpy': 'numpy',
    'matplotlib': 'matplotlib',
    'flask': 'flask',
    'django': 'django',
    'sqlalchemy': 'sqlalchemy',
    'pymongo': 'pymongo',
    'psycopg2': 'psycopg2-binary',
    'mysql': 'mysql-connector-python',
    'openai': 'openai',
    'transformers': 'transformers',
    'torch': 'torch',
    'tensorflow': 'tensorflow',
    'PIL': 'Pillow',
    'yaml': 'PyYAML'
  };

  return imports
    .filter(mod => !standardLib.includes(mod))
    .map(mod => packageMap[mod] || mod)
    .filter((pkg, index, self) => self.indexOf(pkg) === index); // Remove duplicates
}

function cleanupTempFiles(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.error('Cleanup temp error:', err);
  }
}

// Cleanup active processes on server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down... Killing active processes');
  activeProcesses.forEach((process, key) => {
    process.kill();
  });
  process.exit(0);
});

export default router;