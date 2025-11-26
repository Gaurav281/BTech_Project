// server/routes/scripts.js
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

// In-memory helpers / caches
const activeProcesses = new Map(); // key: `${userId}-${executionId}` => childProcess
const globalInstalledDependencies = new Set();
const userStartLocks = new Set();
let cachedPythonExecutable = null;

// -----------------------------
// Additional helpers for idempotency & cooldown
// -----------------------------
const userLastStartAt = new Map(); // userId -> timestamp (ms)
function isUserAlreadyRunning(userId) {
  for (const key of activeProcesses.keys()) {
    if (String(key).startsWith(`${userId}-`)) return true;
  }
  return false;
}

// -----------------------------
// Logging & utility helpers
// -----------------------------
const MAX_LOG_ENTRIES = parseInt(process.env.MAX_LOG_ENTRIES || '2000', 10);
function generateLogId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
async function pushLog(executionLog, level, message) {
  if (!executionLog) return;
  try {
    const entry = {
      id: generateLogId(),
      level: level || 'info',
      message: String(message || ''),
      timestamp: new Date()
    };
    executionLog.logs = executionLog.logs || [];
    executionLog.logs.push(entry);

    // Trim logs to most recent MAX_LOG_ENTRIES
    if (executionLog.logs.length > MAX_LOG_ENTRIES) {
      executionLog.logs = executionLog.logs.slice(-MAX_LOG_ENTRIES);
    }
    // do not await here to keep responsive; caller may call saveTimer
  } catch (err) {
    console.error('pushLog error:', err);
  }
}

// -----------------------------
// Utility functions
// -----------------------------
function getFileExtension(language) {
  const exts = { python: 'py', javascript: 'js', html: 'html', cpp: 'cpp', java: 'java', php: 'php' };
  return exts[language] || 'txt';
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
        if (!imports.includes(baseModule)) imports.push(baseModule);
      }
    }
  }
  return imports;
}

function resolvePythonPackages(imports) {
  const standardLib = [
    'os', 'sys', 'json', 'csv', 'datetime', 'time', 'sqlite3', 'math',
    'random', 're', 'collections', 'itertools', 'functools', 'pathlib',
    'logging', 'http', 'email', 'unittest', 'subprocess', 'threading'
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
    .filter((pkg, index, self) => self.indexOf(pkg) === index);
}

async function checkIfPackageInstalledPython(pkg) {
  const candidates = [
    'python3 -m pip show',
    'python -m pip show',
    'py -3 -m pip show',
    'pip show'
  ];

  for (const base of candidates) {
    try {
      const { stdout } = await execAsync(`${base} ${pkg}`, { timeout: 15000, shell: true });
      if (stdout && stdout.trim().length > 0) return true;
    } catch (err) {
      // try next
    }
  }
  return false;
}

async function installPythonPackage(pkg, tempDir) {
  const cmds = [
    `python3 -m pip install ${pkg}`,
    `python -m pip install ${pkg}`,
    `py -3 -m pip install ${pkg}`,
    `pip install ${pkg}`
  ];

  let lastErr = null;
  for (const cmd of cmds) {
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: tempDir, timeout: 180000, shell: true });
      return { success: true, stdout: stdout || '', stderr: stderr || '', cmd };
    } catch (err) {
      lastErr = err;
    }
  }
  return { success: false, error: lastErr?.message || String(lastErr) };
}

async function findPythonExecutable() {
  if (cachedPythonExecutable !== null) return cachedPythonExecutable;

  const probes = [
    { cmd: 'python3 --version', exe: 'python3' },
    { cmd: 'python --version', exe: 'python' },
    { cmd: 'py -3 --version', exe: 'py -3' },
    { cmd: 'py --version', exe: 'py' }
  ];

  for (const p of probes) {
    try {
      const { stdout, stderr } = await execAsync(p.cmd, { timeout: 8000, shell: true });
      const out = (stdout + '\n' + stderr).toLowerCase();
      if (out.includes('python')) {
        cachedPythonExecutable = p.exe;
        return cachedPythonExecutable;
      }
    } catch (err) {
      // continue
    }
  }

  cachedPythonExecutable = null;
  return null;
}

function detectInputPrompts(script) {
  const prompts = [];
  const inputRegex = /input\s*\(\s*['"]([^'"]*)['"]\s*\)/gi;
  let m;
  while ((m = inputRegex.exec(script)) !== null) {
    prompts.push(m[1] || '');
  }
  return prompts;
}

function cleanupTempFiles(filepath) {
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch (err) {
    console.error('Cleanup temp error:', err);
  }
}

// -----------------------------
// Routes
// -----------------------------

// Generate script (AI or rule-based)
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { task, language, provider } = req.body;
    if (!task || !language) return res.status(400).json({ error: 'Task and language required' });

    const selectedProvider = provider || 'huggingface';
    let result;
    let providerUsed = selectedProvider;

    try {
      result = await aiService.generateScript(task, language, selectedProvider);
    } catch (aiError) {
      if (selectedProvider === 'huggingface') {
        try {
          result = await aiService.generateScript(task, language, 'openai');
          providerUsed = 'OpenAI (Fallback)';
        } catch (openaiError) {
          result = aiService.ruleBasedScriptGenerator(task, language);
          providerUsed = 'Rule-Based Fallback';
        }
      } else if (selectedProvider === 'openai') {
        result = aiService.ruleBasedScriptGenerator(task, language);
        providerUsed = 'Rule-Based Fallback';
      } else {
        result = aiService.ruleBasedScriptGenerator(task, language);
        providerUsed = 'Rule-Based Fallback';
      }
    }

    res.json({
      script: result.script,
      message: 'Script generated successfully',
      providerUsed
    });
  } catch (err) {
    console.error('Generate script error:', err);
    try {
      const { task, language } = req.body;
      const fallbackResult = aiService.ruleBasedScriptGenerator(task, language);
      res.json({
        script: fallbackResult.script,
        message: 'Script generated with fallback method',
        providerUsed: 'Rule-Based Fallback'
      });
    } catch (fallbackError) {
      res.status(500).json({ error: 'Script generation failed' });
    }
  }
});

// Execute script - prevents double start via per-user lock and cooldown
router.post('/execute', authenticateToken, async (req, res) => {
  const userId = req.user._id.toString();
  try {
    const { script, language, parameters, clientRunId } = req.body;
    if (!script || !language) return res.status(400).json({ error: 'Script and language required' });

    // Quick cooldown to avoid accidental double-submits (3 seconds)
    const now = Date.now();
    const lastStart = userLastStartAt.get(userId) || 0;
    const COOLDOWN_MS = 3000;
    if (now - lastStart < COOLDOWN_MS) {
      return res.status(429).json({ error: 'Please wait a moment before starting another execution (cooldown)' });
    }

    // Prevent concurrent starts from multiple requests
    if (userStartLocks.has(userId)) {
      return res.status(409).json({ error: 'Execution startup in progress. Please wait.' });
    }

    // If there is ANY running execution for user in memory, reject with 409
    if (isUserAlreadyRunning(userId)) {
      return res.status(409).json({ error: 'You already have a script running. Stop it first.' });
    }

    // Also check persisted executions in DB as a defensive check
    const activeExecution = await ExecutionLog.findOne({
      user: req.user._id,
      status: 'running'
    });

    if (activeExecution) {
      if (clientRunId && activeExecution.clientRunId && activeExecution.clientRunId === clientRunId) {
        return res.json({ message: 'Execution already running (same clientRunId)', executionId: activeExecution._id });
      }
      return res.status(409).json({
        error: 'You already have a script running. Please stop it first.',
        executionId: activeExecution._id
      });
    }

    // Acquire lock
    userStartLocks.add(userId);
    userLastStartAt.set(userId, now);

    try {
      const scriptDoc = await new Script({
        name: `Execution_${Date.now()}`,
        description: 'Temporary execution script',
        language,
        script,
        parameters: Object.keys(parameters || {}),
        createdBy: req.user._id,
        isPublic: false,
        clientRunId: clientRunId || null
      }).save();

      const executionLog = await new ExecutionLog({
        script: scriptDoc._id,
        user: req.user._id,
        status: 'running',
        startedAt: new Date(),
        language,
        parameters,
        logs: [],
        clientRunId: clientRunId || null
      }).save();

      // initial log
      await pushLog(executionLog, 'info', 'Execution started');
      await executionLog.save();

      // spawn in background
      executeScriptInBackground(script, language, parameters || {}, executionLog._id.toString(), scriptDoc._id.toString(), req.user._id.toString());

      // release lock
      userStartLocks.delete(userId);

      res.json({ message: 'Script execution started', executionId: executionLog._id });
    } catch (innerErr) {
      userStartLocks.delete(userId);
      throw innerErr;
    }
  } catch (err) {
    console.error('Execute script error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Stop execution
router.post('/stop/:executionId', authenticateToken, async (req, res) => {
  try {
    const execution = await ExecutionLog.findById(req.params.executionId);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (execution.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not authorized' });

    const processKey = `${execution.user}-${execution._id}`;
    const activeProcess = activeProcesses.get(processKey);
    if (activeProcess) {
      try {
        activeProcess.kill();
      } catch (e) {
        console.error('Error killing process:', e);
      }
      activeProcesses.delete(processKey);
    }

    execution.status = 'stopped';
    execution.completedAt = new Date();
    execution.logs = execution.logs || [];
    execution.logs.push({ id: generateLogId(), level: 'info', message: 'Execution stopped by user', timestamp: new Date() });
    await execution.save();

    res.json({ message: 'Script execution stopped' });
  } catch (err) {
    console.error('Stop script error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get active executions for current user
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

// Get execution status (used by client polling)
router.get('/execution/:executionId', authenticateToken, async (req, res) => {
  try {
    const execution = await ExecutionLog.findById(req.params.executionId);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (execution.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not authorized' });

    // Return trimmed logs (server already trims on push)
    res.json({
      status: execution.status,
      logs: execution.logs || [],
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      duration: execution.duration
    });
  } catch (err) {
    console.error('Get execution status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Save script
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

// Script history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const scripts = await Script.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ scripts });
  } catch (err) {
    console.error('Get script history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Publish
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

// Marketplace list
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

// Use marketplace script (copy to user's scripts)
router.post('/marketplace/:id/use', authenticateToken, async (req, res) => {
  try {
    const original = await Script.findOne({
      _id: req.params.id,
      isPublic: true
    });

    if (!original) return res.status(404).json({ error: 'Public script not found' });

    const newScript = await new Script({
      name: `${original.name} (Copy)`,
      description: original.description,
      language: original.language,
      script: original.script,
      parameters: original.parameters || [],
      createdBy: req.user._id,
      isPublic: false,
      originalScript: original._id,
      downloadCount: 0,
      executionCount: 0
    }).save();

    await Script.findByIdAndUpdate(original._id, { $inc: { downloadCount: 1 } });

    res.json({ message: 'Script imported successfully', script: newScript });
  } catch (err) {
    console.error('Use script error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Popular public scripts
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

// Search public scripts
router.get('/marketplace/search', async (req, res) => {
  try {
    const { q, language, sortBy = 'recent' } = req.query;

    let query = { isPublic: true };
    let sort = { publishedAt: -1 };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    if (language && language !== 'all') query.language = language;

    if (sortBy === 'popular') sort = { downloadCount: -1, executionCount: -1 };
    else if (sortBy === 'name') sort = { name: 1 };

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

// Delete script
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ error: 'Script not found' });

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

// Get script execution logs for user (list)
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

// Get specific execution details
router.get('/executions/:id', authenticateToken, async (req, res) => {
  try {
    const execution = await ExecutionLog.findById(req.params.id).populate('script', 'name language');
    if (!execution) return res.status(404).json({ error: 'Execution not found' });

    if (execution.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not authorized' });

    res.json({ execution });
  } catch (err) {
    console.error('Get script execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Install dependencies route
router.post('/install-dependencies', authenticateToken, async (req, res) => {
  try {
    const { language, packages, executionId } = req.body;
    if (!language || !packages || !Array.isArray(packages)) {
      return res.status(400).json({ error: 'Language and packages array are required' });
    }

    let executionLog = null;
    if (executionId) {
      executionLog = await ExecutionLog.findById(executionId);
      if (!executionLog) return res.status(404).json({ error: 'Execution log not found' });
    }

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const results = [];

    for (const pkg of packages) {
      const normalizedPkg = String(pkg).trim();
      try {
        const low = normalizedPkg.toLowerCase();
        const stdlibChecks = ['os','sys','json','logging','time','datetime','re','math'];
        if (stdlibChecks.includes(low)) {
          results.push({ package: normalizedPkg, status: 'skipped', message: 'Standard library - no install needed' });
          continue;
        }

        if (globalInstalledDependencies.has(normalizedPkg)) {
          results.push({ package: normalizedPkg, status: 'skipped', message: 'Already installed (cached)' });
          continue;
        }

        const alreadyInstalled = await checkIfPackageInstalledPython(normalizedPkg);
        if (alreadyInstalled) {
          globalInstalledDependencies.add(normalizedPkg);
          results.push({ package: normalizedPkg, status: 'skipped', message: 'Already installed (system)' });
          continue;
        }

        if (language === 'python') {
          const installResult = await installPythonPackage(normalizedPkg, tempDir);
          if (installResult.success) {
            globalInstalledDependencies.add(normalizedPkg);
            results.push({ package: normalizedPkg, status: 'success', message: `Installed via ${installResult.cmd}`, output: installResult.stdout });
            if (executionLog) {
              await pushLog(executionLog, 'info', `Successfully installed ${normalizedPkg}`);
              await executionLog.save();
            }
          } else {
            results.push({ package: normalizedPkg, status: 'error', message: installResult.error || 'Install failed' });
            if (executionLog) {
              await pushLog(executionLog, 'error', `Failed to install ${normalizedPkg}: ${installResult.error || 'unknown'}`);
              await executionLog.save();
            }
          }
        } else if (language === 'javascript') {
          try {
            const { stdout, stderr } = await execAsync(`npm install ${normalizedPkg}`, { cwd: tempDir, timeout: 120000, shell: true });
            results.push({ package: normalizedPkg, status: 'success', message: 'npm installed', stdout, stderr });
            if (executionLog) {
              await pushLog(executionLog, 'info', `Successfully npm installed ${normalizedPkg}`);
              await executionLog.save();
            }
          } catch (err) {
            results.push({ package: normalizedPkg, status: 'error', message: err.message || String(err) });
            if (executionLog) {
              await pushLog(executionLog, 'error', `Failed npm install ${normalizedPkg}: ${err.message || String(err)}`);
              await executionLog.save();
            }
          }
        } else {
          results.push({ package: normalizedPkg, status: 'skipped', message: `No install handler for ${language}` });
        }
      } catch (err) {
        console.error(`Install loop error for ${pkg}:`, err);
        results.push({ package: pkg, status: 'error', message: err.message || String(err) });
        if (executionLog) {
          await pushLog(executionLog, 'error', `Install error for ${pkg}: ${err.message || String(err)}`);
          await executionLog.save();
        }
      }
    }

    res.json({ success: true, results, message: `Dependency installation attempted for ${packages.length} packages` });
  } catch (err) {
    console.error('Install dependencies error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Install custom commands
router.post('/install-custom-dependencies', authenticateToken, async (req, res) => {
  try {
    const { commands, executionId } = req.body;
    if (!commands || !Array.isArray(commands)) return res.status(400).json({ error: 'Commands array is required' });

    let executionLog = null;
    if (executionId) {
      executionLog = await ExecutionLog.findById(executionId);
      if (!executionLog) return res.status(404).json({ error: 'Execution log not found' });
    }

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const results = [];

    for (const command of commands) {
      try {
        if (executionLog) {
          await pushLog(executionLog, 'info', `Running custom command: ${command}`);
          await executionLog.save();
        }

        const { stdout, stderr } = await execAsync(command, { cwd: tempDir, timeout: 120000, windowsHide: true, shell: true });

        results.push({ command, status: 'success', message: 'Executed successfully', stdout, stderr });

        if (executionLog) {
          await pushLog(executionLog, 'info', `✅ ${command} - Success`);
          await executionLog.save();
        }
      } catch (err) {
        console.error(`Custom command failed: ${command}`, err);
        results.push({ command, status: 'error', message: err.message || String(err), error: err.stderr || err.message });
        if (executionLog) {
          await pushLog(executionLog, 'error', `❌ ${command} - Failed: ${err.message || String(err)}`);
          if (err.stdout) await pushLog(executionLog, 'info', `Output: ${err.stdout}`);
          await executionLog.save();
        }
      }
    }

    res.json({ success: true, results, message: 'Custom commands executed' });
  } catch (err) {
    console.error('Custom dependency installation error:', err);
    res.status(500).json({ error: err.message, details: 'Make sure npm and pip are properly installed on the server' });
  }
});

// -----------------------------
// Background execution - central function
// -----------------------------
async function executeScriptInBackground(script, language, parameters, executionId, scriptId, userId) {
  let executionLog;
  const processKey = `${userId}-${executionId}`;

  try {
    executionLog = await ExecutionLog.findById(executionId);
    if (!executionLog) return;

    // Prevent duplicate spawn for same processKey
    if (activeProcesses.has(processKey)) {
      await pushLog(executionLog, 'warning', 'Execution already running (duplicate start prevented)');
      await executionLog.save();
      return;
    }

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const filename = `script_${Date.now()}.${getFileExtension(language)}`;
    const filepath = path.join(tempDir, filename);

    let processedScript = script;

    // Parameter substitution (various patterns)
    if (parameters && Object.keys(parameters).length > 0) {
      await pushLog(executionLog, 'info', `Applying parameters: ${JSON.stringify(parameters)}`);
      await executionLog.save();

      Object.entries(parameters).forEach(([key, value]) => {
        if (key === '__stdin__') return;
        if (value && String(value).trim() !== '') {
          processedScript = processedScript.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
          processedScript = processedScript.replace(new RegExp(`YOUR_${key.toUpperCase()}`, 'gi'), value);
          processedScript = processedScript.replace(new RegExp(`(${key}\\s*=\\s*['"]?)['"]?(['"]?)`, 'g'), `$1${value}$2`);
        }
      });
    }

    if (language === 'python') {
      processedScript = `# -*- coding: utf-8 -*-\nimport sys\ntry:\n    sys.stdout.reconfigure(encoding='utf-8')\nexcept Exception:\n    pass\n${processedScript}`;
    }

    fs.writeFileSync(filepath, processedScript, 'utf8');
    await pushLog(executionLog, 'info', `Created file ${filename}`);
    await executionLog.save();

    // Dependency detection & installation
    const imports = language === 'python' ? detectPythonImports(processedScript) : [];
    const packagesToInstall = language === 'python' ? resolvePythonPackages(imports) : [];

    const pkgsToInstall = [];
    for (const pkg of packagesToInstall) {
      if (globalInstalledDependencies.has(pkg)) continue;
      const isInstalled = await checkIfPackageInstalledPython(pkg);
      if (isInstalled) {
        globalInstalledDependencies.add(pkg);
        continue;
      }
      pkgsToInstall.push(pkg);
    }

    if (pkgsToInstall.length > 0) {
      await pushLog(executionLog, 'info', `Detected new dependencies: ${pkgsToInstall.join(', ')}`);
      await executionLog.save();

      for (const pkg of pkgsToInstall) {
        try {
          await pushLog(executionLog, 'info', `Installing ${pkg}...`);
          await executionLog.save();
          const result = await installPythonPackage(pkg, tempDir);
          if (result.success) {
            globalInstalledDependencies.add(pkg);
            await pushLog(executionLog, 'info', `Successfully installed ${pkg} (via ${result.cmd})`);
          } else {
            await pushLog(executionLog, 'warning', `Failed to install ${pkg}: ${result.error || 'unknown'}`);
          }
          await executionLog.save();
        } catch (err) {
          await pushLog(executionLog, 'warning', `Failed to install ${pkg}: ${err.message || String(err)}`);
          await executionLog.save();
        }
      }
    } else if (packagesToInstall.length > 0) {
      await pushLog(executionLog, 'info', `Dependencies already satisfied: ${packagesToInstall.join(', ')}`);
      await executionLog.save();
    }

    // Build command/args
    let cmd;
    let args = [];

    if (language === 'python') {
      const pyExec = await findPythonExecutable();
      if (!pyExec) {
        await pushLog(executionLog, 'error', 'Python executable not found. Ensure python or python3 (or py) is installed and on PATH.');
        executionLog.status = 'error';
        executionLog.completedAt = new Date();
        executionLog.duration = executionLog.completedAt - executionLog.startedAt;
        await executionLog.save();
        return;
      }

      if (pyExec === 'py -3') {
        cmd = 'py';
        args = ['-3', filepath];
      } else {
        cmd = pyExec;
        args = [filepath];
      }
    } else if (language === 'javascript') {
      cmd = 'node';
      args = [filepath];
    } else if (language === 'html') {
      await pushLog(executionLog, 'info', 'HTML cannot be executed on the server. Serve or download instead.');
      executionLog.status = 'error';
      executionLog.completedAt = new Date();
      executionLog.duration = executionLog.completedAt - executionLog.startedAt;
      await executionLog.save();
      return;
    } else {
      await pushLog(executionLog, 'error', `Language ${language} not supported for execution.`);
      executionLog.status = 'error';
      executionLog.completedAt = new Date();
      executionLog.duration = executionLog.completedAt - executionLog.startedAt;
      await executionLog.save();
      return;
    }

    // Spawn process (no shell)
    const childProcess = spawn(cmd, args, {
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      shell: false
    });

    // Register process
    activeProcesses.set(processKey, childProcess);

    // Small debounce save
    let saveTimer = null;
    const scheduleSave = async () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try { await executionLog.save(); } catch (e) { console.error('Error saving executionLog:', e); }
      }, 400);
    };

    childProcess.stdout.on('data', (data) => {
      const out = data.toString();
      out.split('\n').filter(Boolean).forEach(async (line) => {
        await pushLog(executionLog, 'info', line);
      });
      scheduleSave();
    });

    childProcess.stderr.on('data', (data) => {
      const out = data.toString();
      out.split('\n').filter(Boolean).forEach(async (line) => {
        await pushLog(executionLog, 'error', line);
      });
      scheduleSave();
    });

    childProcess.stdin.on('error', (err) => {
      console.log('child stdin error:', err);
    });

    // Prepare and feed stdin if needed
    try {
      const stdinValues = [];
      if (Array.isArray(parameters?.__stdin__)) {
        parameters.__stdin__.forEach(v => stdinValues.push(String(v ?? '')));
      } else {
        const prompts = detectInputPrompts(processedScript);
        if (prompts.length > 0) {
          const paramKeys = Object.keys(parameters || {}).filter(k => k !== '__stdin__');
          const unused = [...paramKeys];
          prompts.forEach((prompt) => {
            let matched = '';
            for (const k of unused) {
              if (prompt.toLowerCase().includes(k.toLowerCase())) {
                matched = parameters[k];
                const idx = unused.indexOf(k);
                if (idx !== -1) unused.splice(idx, 1);
                break;
              }
            }
            if (matched === '' && unused.length > 0) {
              matched = parameters[unused.shift()] || '';
            }
            stdinValues.push(String(matched ?? ''));
          });
        } else {
          const paramKeys = Object.keys(parameters || {}).filter(k => k !== '__stdin__');
          if (paramKeys.length > 0) {
            paramKeys.forEach(k => stdinValues.push(String(parameters[k] ?? '')));
          }
        }
      }

      if (stdinValues.length > 0) {
        childProcess.stdin.write(stdinValues.join('\n') + '\n', 'utf8', (err) => {
          if (err) console.error('stdin write error:', err);
          try { childProcess.stdin.end(); } catch (e) {}
        });
      } else {
        try { childProcess.stdin.end(); } catch (e) {}
      }
    } catch (err) {
      console.error('Error preparing stdin values:', err);
    }

    const MAX_RUNTIME_MS = parseInt(process.env.SCRIPT_MAX_RUNTIME_MS || '300000', 10);
    const killTimer = setTimeout(async () => {
      try {
        if (!childProcess.killed) childProcess.kill('SIGTERM');
        await pushLog(executionLog, 'error', 'Execution timed out and was killed');
        await executionLog.save();
      } catch (e) {
        console.error('Error killing process on timeout:', e);
      }
    }, MAX_RUNTIME_MS);

    childProcess.on('close', async (code, signal) => {
      clearTimeout(killTimer);
      if (saveTimer) clearTimeout(saveTimer);

      activeProcesses.delete(processKey);

      if (!executionLog) return;

      if (code === 0) {
        executionLog.status = 'completed';
        await pushLog(executionLog, 'info', 'Process completed with exit code 0');
      } else if (code !== null) {
        executionLog.status = 'error';
        await pushLog(executionLog, 'error', `Process exited with code ${code}`);
      } else if (signal) {
        executionLog.status = 'stopped';
        await pushLog(executionLog, 'error', `Process killed by signal: ${signal}`);
      } else {
        executionLog.status = 'error';
        await pushLog(executionLog, 'error', 'Process exited with unknown status (code null, no signal)');
      }

      executionLog.completedAt = new Date();
      executionLog.duration = executionLog.completedAt - executionLog.startedAt;

      try { await Script.findByIdAndUpdate(scriptId, { $inc: { executionCount: 1 } }); } catch (e) { console.error('Error incrementing executionCount:', e); }

      try { await executionLog.save(); } catch (e) { console.error('Error saving executionLog on close:', e); }

      setTimeout(() => cleanupTempFiles(filepath), 5000);
    });

    childProcess.on('error', async (err) => {
      clearTimeout(killTimer);
      if (saveTimer) clearTimeout(saveTimer);
      activeProcesses.delete(processKey);

      if (!executionLog) return;

      executionLog.status = 'error';
      executionLog.completedAt = new Date();
      executionLog.duration = executionLog.completedAt - executionLog.startedAt;
      await pushLog(executionLog, 'error', `Process error: ${err.message || String(err)}`);
      try { await executionLog.save(); } catch (e) { console.error('Save after process error failed:', e); }
    });

  } catch (err) {
    console.error('Execution setup error:', err);
    if (executionLog) {
      executionLog.status = 'error';
      executionLog.completedAt = new Date();
      executionLog.duration = executionLog.completedAt - executionLog.startedAt;
      await pushLog(executionLog, 'error', err.message || String(err));
      try { await executionLog.save(); } catch (e) { console.error('Save after setup error failed:', e); }
    }
    activeProcesses.delete(processKey);
  }
}

export default router;
