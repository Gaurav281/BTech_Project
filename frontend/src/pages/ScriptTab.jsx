// src/pages/ScriptTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FaPlay, FaStop, FaSave, FaShare, FaDownload, FaUpload,
  FaTerminal, FaCode, FaGlobe, FaCopy, FaHistory, FaRobot,
  FaPython, FaJs, FaHtml5, FaFileCode, FaCog, FaSpinner, FaMagic,
  FaWrench, FaBox, FaCheck, FaSearch, FaPlus, FaTimes, FaUndo, FaRedo
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { scriptAPI, aiAPI } from '../api/api';
import AIProviderSelector from '../components/AIProviderSelector';
import ScriptHistory from "../components/ScriptHistory";
import HostScriptModal from '../components/HostScriptModal';
import HostedScriptsPanel from '../components/HostedScriptsPanel';
import { hostedScriptsAPI } from '../api/api';

const ScriptTab = () => {
  // Load state from localStorage or use defaults
  const loadState = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(`scriptTab_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const saveState = (key, value) => {
    try {
      localStorage.setItem(`scriptTab_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  };

  const [task, setTask] = useState(() => loadState('task', ''));
  const [language, setLanguage] = useState(() => loadState('language', 'python'));
  const [generatedScript, setGeneratedScript] = useState(() => loadState('generatedScript', ''));
  const [modifiedScript, setModifiedScript] = useState(() => loadState('modifiedScript', ''));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showTerminal, setShowTerminal] = useState(() => loadState('showTerminal', true));
  const [executionLogs, setExecutionLogs] = useState(() => loadState('executionLogs', []));
  const [parameters, setParameters] = useState(() => loadState('parameters', {}));
  const [scriptHistory, setScriptHistory] = useState([]);
  const [aiProvider, setAiProvider] = useState('openai');
  const [currentScript, setCurrentScript] = useState(() => loadState('currentScript', null));
  const [isPublished, setIsPublished] = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const [activeExecutions, setActiveExecutions] = useState([]);

  // NEW STATES
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [showCustomDependencyModal, setShowCustomDependencyModal] = useState(false);
  const [showParameterModal, setShowParameterModal] = useState(false);
  const [detectedDependencies, setDetectedDependencies] = useState([]);
  const [isInstallingDeps, setIsInstallingDeps] = useState(false);
  const [customDependencyCommand, setCustomDependencyCommand] = useState('');
  const [customDependencyCommands, setCustomDependencyCommands] = useState([]);
  const [detectedParameters, setDetectedParameters] = useState([]);
  const [missingParameters, setMissingParameters] = useState([]);
  const [showHostScriptModal, setShowHostScriptModal] = useState(false);
  const [hostedScripts, setHostedScripts] = useState([]);
  const [removedParameters, setRemovedParameters] = useState([]);

  const executionRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  const languages = [
    { value: 'python', label: 'Python', icon: FaPython },
    { value: 'javascript', label: 'JavaScript', icon: FaJs },
    { value: 'html', label: 'HTML', icon: FaHtml5 },
    { value: 'cpp', label: 'C++', icon: FaFileCode },
    { value: 'java', label: 'Java', icon: FaFileCode },
    { value: 'php', label: 'PHP', icon: FaFileCode },
  ];

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState('task', task);
  }, [task]);

  useEffect(() => {
    saveState('language', language);
  }, [language]);

  useEffect(() => {
    saveState('generatedScript', generatedScript);
  }, [generatedScript]);

  useEffect(() => {
    saveState('modifiedScript', modifiedScript);
  }, [modifiedScript]);

  useEffect(() => {
    saveState('showTerminal', showTerminal);
  }, [showTerminal]);

  useEffect(() => {
    saveState('executionLogs', executionLogs);
  }, [executionLogs]);

  useEffect(() => {
    saveState('parameters', parameters);
  }, [parameters]);

  useEffect(() => {
    saveState('currentScript', currentScript);
  }, [currentScript]);

  useEffect(() => {
    if (isAuthenticated) {
      loadScriptHistory();
    }
  }, [isAuthenticated]);


  const refreshScript = () => {
    if (modifiedScript.trim()) {
      // Clear terminal and show refresh message
      setExecutionLogs([]);
      addLog('🔄 Script environment refreshed');
      addLog('📝 All temporary files and processes cleared');

      // Clear any active execution
      if (executionId) {
        setExecutionId(null);
        setIsExecuting(false);
      }

      // Clear any active processes
      if (executionRef.current) {
        clearInterval(executionRef.current);
        executionRef.current = null;
      }
    } else {
      addLog('No script to refresh', 'warning');
    }
  };

  // In ScriptTab.jsx - UPDATE the handleHostScript function
  const handleHostScript = async (hostConfig) => {
    try {
      addLog('🚀 Hosting script as web service...');

      // Include current parameters in the host config
      const hostConfigWithParams = {
        ...hostConfig,
        parameters: parameters, // Include all current parameter values
        script: modifiedScript,
        language: language
      };

      const response = await hostedScriptsAPI.createHostedScript(hostConfigWithParams);

      if (response.data.success) {
        addLog('✅ Script hosted successfully!');
        addLog(`🌐 Endpoint URL: ${response.data.hostedScript.url}`);
        addLog('📝 Your script is now available as a web service');
        addLog('⚙️ Parameters are automatically included in the hosted script');

        // Show example of how to use the endpoint
        if (Object.keys(parameters).length > 0) {
          addLog(`🔧 Using parameters: ${JSON.stringify(parameters)}`);
        }

        // Load updated hosted scripts list
        const scriptsResponse = await hostedScriptsAPI.getMyScripts();
        setHostedScripts(scriptsResponse.data.hostedScripts || []);
      }
    } catch (error) {
      console.error('Host script error:', error);
      addLog(`❌ Failed to host script: ${error.response?.data?.error || error.message}`, 'error');
    }
  };

  const checkActiveExecutions = async () => {
    try {
      const response = await scriptAPI.getActiveExecutions();
      setActiveExecutions(response.data.executions || []);

      if (response.data.executions.length > 0) {
        const latestExecution = response.data.executions[0];
        setExecutionId(latestExecution._id);
        setIsExecuting(true);
        startExecutionMonitoring(latestExecution._id);
        addLog('🔄 Resumed monitoring of active script execution');
      }
    } catch (error) {
      console.error('Failed to check active executions:', error);
    }
  };

  useEffect(() => {
    checkActiveExecutions();
  }, []);

  const removeParameter = (paramName) => {
    // Store the current value before removing
    const currentValue = parameters[paramName] || '';

    setParameters(prev => {
      const newParams = { ...prev };
      delete newParams[paramName];
      return newParams;
    });

    // Add to removed parameters list
    setRemovedParameters(prev => [...prev, { name: paramName, value: currentValue }]);

    // Also update detected parameters
    setDetectedParameters(prev => prev.filter(p => p !== paramName));
    setMissingParameters(prev => prev.filter(p => p !== paramName));

    addLog(`🗑️ Removed parameter: ${paramName}`);
    addLog('ℹ️ This parameter will be ignored when running the script');
  };

  // Add restoreParameter function
  const restoreParameter = (paramName) => {
    // Find the removed parameter
    const removedParam = removedParameters.find(p => p.name === paramName);

    if (removedParam) {
      // Restore the parameter with its previous value
      setParameters(prev => ({
        ...prev,
        [paramName]: removedParam.value
      }));

      // Remove from removed parameters
      setRemovedParameters(prev => prev.filter(p => p.name !== paramName));

      // Add back to detected parameters
      setDetectedParameters(prev => [...prev, paramName]);

      addLog(`↩️ Restored parameter: ${paramName}`);
      if (removedParam.value) {
        addLog(`💾 Restored previous value: ${removedParam.value}`);
      }
    }
  };


  // Add this useEffect to load saved provider
  useEffect(() => {
    const savedProvider = localStorage.getItem('aiCurrentProvider');
    if (savedProvider) {
      setAiProvider(savedProvider);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (executionRef.current) {
        clearInterval(executionRef.current);
      }
    };
  }, []);

  // Add this useEffect to handle shared scripts on component mount
  useEffect(() => {
    const loadSharedScript = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('shared');

      if (sharedData) {
        try {
          // Decode the shared data
          const decodedData = decodeURIComponent(sharedData);
          const binary = window.atob(decodedData);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const decoder = new TextDecoder();
          const jsonString = decoder.decode(bytes);
          const scriptData = JSON.parse(jsonString);

          // Load the shared script
          setModifiedScript(scriptData.script);
          setGeneratedScript(scriptData.script);
          setLanguage(scriptData.language);
          setTask(scriptData.task || '');
          setParameters(scriptData.parameters || {});

          setCurrentScript({
            id: `shared-${scriptData.timestamp}`,
            name: `${scriptData.name} (Shared)`,
            language: scriptData.language,
            task: scriptData.task,
            script: scriptData.script,
            createdAt: new Date(scriptData.timestamp).toISOString()
          });

          addLog(`✅ Loaded shared script: ${scriptData.name}`);

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error loading shared script:', error);
          addLog('❌ Failed to load shared script', 'error');
        }
      }
    };

    loadSharedScript();
  }, []);

  const detectDependencies = (script, language) => {
    const dependencies = new Set();

    if (language === 'python') {
      // Detect Python imports
      const importPatterns = [
        /^\s*import\s+([a-zA-Z0-9_]+)/gm,
        /^\s*from\s+([a-zA-Z0-9_\.]+)\s+import/gm
      ];

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
        'discord': 'discord.py',
        'openai': 'openai',
        'transformers': 'transformers',
        'torch': 'torch',
        'tensorflow': 'tensorflow'
      };

      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(script)) !== null) {
          if (match[1]) {
            const baseModule = match[1].split('.')[0];
            if (!standardLib.includes(baseModule)) {
              const packageName = packageMap[baseModule] || baseModule;
              dependencies.add(packageName);
            }
          }
        }
      }
    }

    return Array.from(dependencies);
  };

  const installDependencies = async () => {
    if (detectedDependencies.length === 0) {
      addLog('No dependencies detected to install', 'warning');
      return;
    }

    setIsInstallingDeps(true);
    addLog(`📦 Installing ${detectedDependencies.length} dependencies: ${detectedDependencies.join(', ')}`);

    try {
      const response = await scriptAPI.installDependencies({
        language,
        packages: detectedDependencies,
        executionId: executionId
      });

      const results = response.data.results;
      let successCount = 0;
      let errorCount = 0;

      results.forEach(result => {
        if (result.status === 'success') {
          addLog(`✅ ${result.message}`);
          successCount++;
        } else {
          addLog(`❌ ${result.message}`, 'error');
          errorCount++;
        }
      });

      addLog(`📊 Installation complete: ${successCount} successful, ${errorCount} failed`);

      if (errorCount === 0) {
        setShowDependencyModal(false);
      }

    } catch (error) {
      console.error('Dependency installation error:', error);
      addLog(`❌ Failed to install dependencies: ${error.message}`, 'error');
    } finally {
      setIsInstallingDeps(false);
    }
  };

  // INSTALL CUSTOM DEPENDENCIES
  const installCustomDependencies = async () => {
    if (customDependencyCommands.length === 0) {
      addLog('No custom dependency commands to execute', 'warning');
      return;
    }

    setIsInstallingDeps(true);
    addLog(`📦 Executing ${customDependencyCommands.length} custom commands`);

    try {
      const response = await scriptAPI.installCustomDependencies({
        commands: customDependencyCommands,
        executionId: executionId
      });

      const results = response.data.results;
      let successCount = 0;
      let errorCount = 0;

      results.forEach(result => {
        if (result.status === 'success') {
          addLog(`✅ ${result.command} - Success`);
          successCount++;
        } else {
          addLog(`❌ ${result.command} - Failed: ${result.message}`, 'error');
          errorCount++;
        }
      });

      addLog(`📊 Custom installation complete: ${successCount} successful, ${errorCount} failed`);

      if (errorCount === 0) {
        setShowCustomDependencyModal(false);
        setCustomDependencyCommands([]);
        setCustomDependencyCommand('');
      }

    } catch (error) {
      console.error('Custom dependency installation error:', error);
      addLog(`❌ Failed to execute custom commands: ${error.message}`, 'error');
    } finally {
      setIsInstallingDeps(false);
    }
  };

  // ADD CUSTOM DEPENDENCY COMMAND
  const addCustomDependencyCommand = () => {
    if (customDependencyCommand.trim()) {
      setCustomDependencyCommands(prev => [...prev, customDependencyCommand.trim()]);
      setCustomDependencyCommand('');
    }
  };

  // REMOVE CUSTOM DEPENDENCY COMMAND
  const removeCustomDependencyCommand = (index) => {
    setCustomDependencyCommands(prev => prev.filter((_, i) => i !== index));
  };

  // CHECK DEPENDENCIES
  const checkDependencies = () => {
    if (!modifiedScript.trim()) {
      addLog('No script to check for dependencies', 'error');
      return;
    }

    const dependencies = detectDependencies(modifiedScript, language);

    if (dependencies.length > 0) {
      setDetectedDependencies(dependencies);
      setShowDependencyModal(true);
      addLog(`🔍 Detected ${dependencies.length} dependencies: ${dependencies.join(', ')}`);
    } else {
      addLog('✅ No external dependencies detected', 'info');
    }
  };

  const addLog = (message, type = 'info') => {
    const log = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message,
      type
    };
    setExecutionLogs(prev => [...prev.slice(-99), log]); // Keep last 100 logs
  };

  const loadScriptHistory = async () => {
    try {
      const response = await scriptAPI.getScriptHistory();
      setScriptHistory(response.data.scripts || []);
    } catch (error) {
      console.error('Failed to load script history:', error);
    }
  };

  // In ScriptTab.jsx - UPDATE the extractParameters function
  const extractParameters = (script) => {
    const paramPatterns = [
      // Match input() calls with prompts
      /input\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // Match environment variables
      /process\.env\.(\w+)/g,
      // Match ${PARAM} template literals
      /\${(\w+)}/g,
      // Match variable assignments with empty values or placeholder values
      /(\w+)\s*=\s*['"]\s*['"]/g,
      /(\w+)\s*=\s*""/g,
      /(\w+)\s*=\s*''/g,
      // Match variables assigned to YOUR_* placeholders
      /(\w+)\s*=\s*YOUR_([A-Z_]+)/gi,
      // Match variables with placeholder comments
      /(\w+)\s*=\s*["']?[^"'\n]*replace[^"'\n]*["']?/gi
    ];

    const matches = new Set();

    paramPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(script)) !== null) {
        let paramName = match[1] || match[0];

        if (paramName) {
          // Clean up parameter names
          const cleanParam = paramName
            .replace(/^enter_/i, '')
            .replace(/^your_/i, '')
            .replace(/^replace_/i, '')
            .replace(/^input_/i, '')
            .replace(/[^a-zA-Z0-9_]/g, '')
            .toLowerCase();

          // Filter out common non-parameter words and ensure reasonable length
          const excludedWords = ['missing', 'required', 'enter', 'your', 'replace', 'input', 'add', 'bot', 'token', 'id', 'message', 'interval', 'url'];
          if (cleanParam &&
            cleanParam.length > 1 &&
            cleanParam.length < 30 &&
            !excludedWords.includes(cleanParam) &&
            !/^\d+$/.test(cleanParam)) {

            // Check if this is actually a defined variable with a real value
            const variableDefinedPattern = new RegExp(`${paramName}\\s*=\\s*["'][^"']{5,}["']`, 'g');
            const isActuallyDefined = variableDefinedPattern.test(script);

            if (!isActuallyDefined) {
              matches.add(cleanParam);
            }
          }
        }
      }
    });

    // Remove duplicates and return as array
    return Array.from(matches);
  };

  // ENHANCE the checkParameters function to be smarter about what's actually needed
  const checkParameters = () => {
    if (!modifiedScript.trim()) {
      addLog('No script to check for parameters', 'error');
      return;
    }

    const params = extractParameters(modifiedScript);

    // Filter out parameters that are already properly defined in the script
    const filteredParams = params.filter(param => {
      // Check if this parameter has a real default value in the script
      const valuePatterns = [
        new RegExp(`${param}\\s*=\\s*["'][^"']{3,}["']`, 'i'), // Has a value with at least 3 chars
        new RegExp(`${param}\\s*=\\s*\\d+`, 'i'), // Has a numeric value
        new RegExp(`${param}\\s*=\\s*\\w+\\s*\\+?\\s*\\w+`, 'i') // Has an expression
      ];

      return !valuePatterns.some(pattern => pattern.test(modifiedScript));
    });

    setDetectedParameters(filteredParams);

    // Update parameters state with new parameters, preserve existing values
    const updatedParams = { ...parameters };
    filteredParams.forEach(param => {
      if (!updatedParams[param] && updatedParams[param] !== 'REMOVED') {
        updatedParams[param] = '';
      }
    });

    // Clean up parameters that are no longer detected
    Object.keys(updatedParams).forEach(param => {
      if (!filteredParams.includes(param)) {
        delete updatedParams[param];
      }
    });

    setParameters(updatedParams);

    // Find missing parameters (only those that are actually required)
    const missing = filteredParams.filter(param =>
      !parameters[param] ||
      parameters[param].trim() === ''
    );
    setMissingParameters(missing);

    setShowParameterModal(true);

    if (filteredParams.length > 0) {
      addLog(`🔍 Detected ${filteredParams.length} parameters: ${filteredParams.join(', ')}`);
      if (missing.length > 0) {
        addLog(`⚠️ Missing values for: ${missing.join(', ')}`, 'warning');
      } else {
        addLog('✅ All parameters have values', 'info');
      }
    } else {
      addLog('✅ No required parameters detected in script', 'info');
    }
  };

  const generateScript = async () => {
    if (!task.trim()) {
      addLog('Please enter a task description', 'error');
      return;
    }

    setIsGenerating(true);
    addLog(`🤖 Generating ${language} script for: "${task}"`);
    addLog(`🔧 Using AI provider: ${aiProvider}`);

    try {
      // Save provider preference
      localStorage.setItem('aiCurrentProvider', aiProvider);

      const response = await scriptAPI.generateScript({
        task,
        language,
        provider: aiProvider
      });

      const script = response.data.script;
      setGeneratedScript(script);
      setModifiedScript(script);
      setCurrentScript({
        id: Date.now().toString(),
        name: `Script_${Date.now()}`,
        language,
        task,
        script,
        createdAt: new Date().toISOString()
      });

      addLog('✅ Script generated successfully!');
      addLog(`📝 Language: ${language}, Lines: ${script.split('\n').length}`);
      addLog(`🔧 Provider: ${response.data.providerUsed}`);

      // Auto-detect parameters
      // Auto-detect parameters - IMPROVED VERSION
      const params = extractParameters(script);
      if (params.length > 0) {
        const initialParams = {};
        const uniqueParams = [...new Set(params)]; // Remove any remaining duplicates

        uniqueParams.forEach(param => {
          // Don't overwrite existing parameter values
          if (!parameters[param]) {
            initialParams[param] = '';
          } else {
            initialParams[param] = parameters[param];
          }
        });

        setParameters(initialParams);
        setDetectedParameters(uniqueParams);
        addLog(`⚙️ Detected ${uniqueParams.length} unique parameters: ${uniqueParams.join(', ')}`);
      }

      // Auto-detect dependencies
      const dependencies = detectDependencies(script, language);
      if (dependencies.length > 0) {
        addLog(`🔍 Detected dependencies: ${dependencies.join(', ')}`);
        setDetectedDependencies(dependencies);
      }

      // Show enhancement status if applicable
      if (response.data.enhanced) {
        addLog('✨ Script enhanced with AI code review', 'info');
      }

    } catch (error) {
      console.error('Script generation error:', error);

      // Enhanced error handling with auto-fallback
      if (error.response?.data?.error?.includes('Hugging Face')) {
        addLog(`❌ Hugging Face error: ${error.response.data.error}`, 'error');

        // Auto-switch to OpenAI if Hugging Face fails
        if (aiProvider === 'huggingface') {
          addLog('🔄 Auto-switching to OpenAI provider...', 'warning');
          setAiProvider('openai');
          localStorage.setItem('aiCurrentProvider', 'openai');

          // Retry with OpenAI after a short delay
          setTimeout(() => {
            addLog('🔄 Retrying with OpenAI provider...');
            generateScript();
          }, 1500);
          return;
        }
      } else if (error.response?.data?.error?.includes('OpenAI')) {
        addLog(`❌ OpenAI error: ${error.response.data.error}`, 'error');
        addLog('🔑 Please check your OpenAI API key in provider settings', 'warning');

        // Auto-switch to rule-based if OpenAI fails
        addLog('🔄 Switching to rule-based generation...', 'warning');
        setAiProvider('normal');
        localStorage.setItem('aiCurrentProvider', 'normal');

        setTimeout(() => {
          addLog('🔄 Retrying with rule-based generation...');
          generateScript();
        }, 1500);
        return;
      } else {
        addLog(`❌ Failed to generate script: ${error.message}`, 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // In ScriptTab.jsx - UPDATE the executeScript function
  const executeScript = async () => {
    if (!modifiedScript.trim()) {
      addLog('No script to execute', 'error');
      return;
    }

    if (isExecuting) {
      addLog('Script is already running', 'warning');
      return;
    }

    // Get only the parameters that are actually detected as required
    const requiredParams = detectedParameters.filter(param => {
      // Check if this parameter is actually used in a way that requires user input
      const isInputCall = new RegExp(`input\\s*\\([^)]*${param}[^)]*\\)`, 'i').test(modifiedScript);
      const isTemplateVar = new RegExp(`\\$\\{${param}\\}`, 'i').test(modifiedScript);
      const isEmptyAssignment = new RegExp(`${param}\\s*=\\s*["']\\s*["']`, 'i').test(modifiedScript);

      return isInputCall || isTemplateVar || isEmptyAssignment;
    });

    // Check for missing parameters (only from required ones)
    const missing = requiredParams.filter(param => !parameters[param] || parameters[param].trim() === '');

    if (missing.length > 0) {
      addLog(`❌ Missing parameter values: ${missing.join(', ')}`, 'error');
      addLog('Please provide values for all required parameters', 'warning');
      setMissingParameters(missing);
      setShowParameterModal(true);
      return;
    }

    setIsExecuting(true);
    addLog('🚀 Starting script execution...');

    try {
      // Only pass parameters that are actually required
      const executionParams = {};
      requiredParams.forEach(param => {
        if (parameters[param] && parameters[param].trim() !== '') {
          executionParams[param] = parameters[param];
        }
      });

      const response = await scriptAPI.executeScript({
        script: modifiedScript,
        language,
        parameters: executionParams
      });

      const execId = response.data.executionId;
      setExecutionId(execId);

      addLog('✅ Script execution started!');
      addLog(`📋 Execution ID: ${execId}`);
      if (Object.keys(executionParams).length > 0) {
        addLog(`⚙️ Using parameters: ${JSON.stringify(executionParams)}`);
      }

      // Start monitoring execution
      startExecutionMonitoring(execId);

    } catch (error) {
      addLog(`❌ Execution failed to start: ${error.message}`, 'error');
      setIsExecuting(false);
    }
  };

  // ENHANCE SCRIPT - WITH PARAMETER PRESERVATION
  const enhanceScript = async () => {
    if (!modifiedScript.trim()) {
      addLog('No script to enhance', 'error');
      return;
    }

    setIsGenerating(true);
    addLog('🔧 Enhancing script with AI code review...');

    try {
      const response = await aiAPI.enhanceScript({
        script: modifiedScript,
        task: task,
        language: language
      });

      if (response.data.enhanced) {
        setModifiedScript(response.data.script);
        setGeneratedScript(response.data.script);

        // Re-detect parameters after enhancement
        const newParams = extractParameters(response.data.script);
        if (newParams.length > 0) {
          const updatedParams = { ...parameters };
          newParams.forEach(param => {
            if (!updatedParams[param]) {
              updatedParams[param] = '';
            }
          });
          setParameters(updatedParams);
          setDetectedParameters(newParams);
        }

        addLog('✨ Script enhanced with AI code review!', 'info');
        addLog('✅ Improved error handling, structure, and best practices');
      } else {
        addLog('ℹ️ Script is already optimal, no changes needed', 'info');
      }

    } catch (error) {
      console.error('Script enhancement error:', error);
      addLog(`❌ Failed to enhance script: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const stopScript = async () => {
    if (!executionId) {
      addLog('No active execution to stop', 'warning');
      return;
    }

    try {
      await scriptAPI.stopScript(executionId);
      addLog('🛑 Stopping script execution...');

      // Clear monitoring
      if (executionRef.current) {
        clearInterval(executionRef.current);
        executionRef.current = null;
      }

      setIsExecuting(false);
      setExecutionId(null);
      addLog('✅ Script execution stopped');

    } catch (error) {
      addLog(`❌ Failed to stop script: ${error.message}`, 'error');
    }
  };

  const startExecutionMonitoring = (execId) => {
    // Clear any existing monitoring
    if (executionRef.current) {
      clearInterval(executionRef.current);
    }

    // Start new monitoring
    executionRef.current = setInterval(async () => {
      try {
        const response = await scriptAPI.getExecutionStatus(execId);
        const status = response.data.status;

        // Update logs with execution progress
        if (response.data.logs) {
          response.data.logs.forEach(log => {
            if (!executionLogs.some(existingLog => existingLog.id === log._id)) {
              addLog(log.message, log.level);
            }
          });
        }

        // Check if execution is completed
        if (status === 'completed' || status === 'error' || status === 'stopped') {
          if (executionRef.current) {
            clearInterval(executionRef.current);
            executionRef.current = null;
          }
          setIsExecuting(false);
          setExecutionId(null);

          if (status === 'completed') {
            addLog('✅ Script execution completed successfully!');
          } else if (status === 'error') {
            addLog('❌ Script execution failed', 'error');
          } else if (status === 'stopped') {
            addLog('🛑 Script execution stopped by user');
          }
        }

      } catch (error) {
        console.error('Error monitoring execution:', error);
        // Don't add log to avoid spam
      }
    }, 2000); // Check every 2 seconds
  };

  const handleParameterChange = (paramName, value) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const importScript = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        setModifiedScript(content);
        setGeneratedScript(content);

        // Try to detect language from file extension
        const extension = file.name.split('.').pop().toLowerCase();
        const langMap = {
          'py': 'python',
          'js': 'javascript',
          'html': 'html',
          'cpp': 'cpp',
          'java': 'java',
          'php': 'php'
        };

        if (langMap[extension]) {
          setLanguage(langMap[extension]);
        }

        setCurrentScript({
          id: Date.now().toString(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          language: langMap[extension] || 'python',
          task: 'Imported script',
          script: content,
          createdAt: new Date().toISOString()
        });

        // Auto-detect parameters and dependencies
        const params = extractParameters(content);
        if (params.length > 0) {
          const initialParams = {};
          params.forEach(param => {
            initialParams[param] = parameters[param] || '';
          });
          setParameters(initialParams);
          setDetectedParameters(params);
        }

        const dependencies = detectDependencies(content, langMap[extension] || 'python');
        if (dependencies.length > 0) {
          setDetectedDependencies(dependencies);
        }

        addLog(`✅ Script imported from: ${file.name}`);

      } catch (error) {
        addLog('❌ Failed to import script: Invalid file', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportScript = () => {
    if (!modifiedScript.trim()) {
      addLog('No script to export', 'error');
      return;
    }

    const blob = new Blob([modifiedScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `script_${Date.now()}.${getFileExtension(language)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addLog(`📁 Script exported as ${link.download}`);
  };

  const getFileExtension = (lang) => {
    const extensions = {
      python: 'py',
      javascript: 'js',
      html: 'html',
      cpp: 'cpp',
      java: 'java',
      php: 'php'
    };
    return extensions[lang] || 'txt';
  };

  const saveScript = async () => {
    if (!modifiedScript.trim()) {
      addLog('No script to save', 'error');
      return;
    }

    try {
      const response = await scriptAPI.saveScript({
        name: currentScript?.name || `Script_${Date.now()}`,
        description: task,
        language,
        script: modifiedScript,
        parameters: Object.keys(parameters)
      });

      addLog('✅ Script saved to history!');
      loadScriptHistory();

    } catch (error) {
      addLog(`❌ Failed to save script: ${error.message}`, 'error');
    }
  };

  const publishScript = async () => {
    if (!modifiedScript.trim()) {
      addLog('No script to publish', 'error');
      return;
    }

    try {
      await scriptAPI.publishScript({
        name: currentScript?.name || `Script_${Date.now()}`,
        description: task,
        language,
        script: modifiedScript,
        isPublic: true
      });

      setIsPublished(true);
      addLog('🌐 Script published to marketplace!');

    } catch (error) {
      addLog(`❌ Failed to publish script: ${error.message}`, 'error');
    }
  };

  const shareScript = () => {
    if (!currentScript) {
      addLog('No script to share', 'error');
      return;
    }

    const scriptData = {
      name: currentScript.name,
      language,
      script: modifiedScript,
      task,
      parameters: parameters,
      timestamp: Date.now()
    };

    try {
      // Use TextEncoder for proper Unicode support
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(scriptData));

      // Convert to base64 using a different method
      let binary = '';
      const bytes = new Uint8Array(data);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const shareableData = window.btoa(binary);

      const shareUrl = `${window.location.origin}/script?shared=${encodeURIComponent(shareableData)}`;

      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          addLog('🔗 Shareable link copied to clipboard!');
          addLog('📋 Share this link with others to import your script');
        }).catch(() => {
          fallbackCopyToClipboard(shareUrl);
        });
      } else {
        fallbackCopyToClipboard(shareUrl);
      }
    } catch (error) {
      console.error('Share error:', error);
      addLog('❌ Failed to generate share link', 'error');
    }
  };

  // Fallback copy method
  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      addLog('🔗 Shareable link copied to clipboard!');
      addLog('📋 Share this link with others to import your script');
    } catch (err) {
      console.error('Fallback copy failed:', err);
      addLog('❌ Failed to copy to clipboard', 'error');

      // Last resort - show the URL to user
      addLog(`🔗 Share URL: ${text}`);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const loadFromHistory = (script) => {
    setCurrentScript(script);
    setModifiedScript(script.script);
    setLanguage(script.language);
    setTask(script.task || '');

    // Load parameters if available
    if (script.parameters && Array.isArray(script.parameters)) {
      const initialParams = {};
      script.parameters.forEach(param => {
        initialParams[param] = parameters[param] || '';
      });
      setParameters(initialParams);
      setDetectedParameters(script.parameters);
    }

    addLog(`📚 Loaded script: ${script.name}`);
  };

  const clearTerminal = () => {
    setExecutionLogs([]);
    addLog('Terminal cleared');
  };

  // CLEAR ALL DATA
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      // Clear localStorage
      const keys = [
        'task', 'language', 'generatedScript', 'modifiedScript',
        'showTerminal', 'executionLogs', 'parameters', 'currentScript'
      ];

      keys.forEach(key => {
        localStorage.removeItem(`scriptTab_${key}`);
      });

      // Reset state
      setTask('');
      setLanguage('python');
      setGeneratedScript('');
      setModifiedScript('');
      setShowTerminal(true);
      setExecutionLogs([]);
      setParameters({});
      setCurrentScript(null);
      setDetectedParameters([]);
      setDetectedDependencies([]);

      addLog('🗑️ All data cleared');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Script Generator</h1>
            <p className="text-gray-600">Generate and execute scripts in multiple programming languages</p>
          </div>
          <div className="flex items-center space-x-3">
            <AIProviderSelector
              currentProvider={aiProvider}
              onProviderChange={setAiProvider}
            />

            {/* CHECK PARAMETERS BUTTON */}
            <button
              onClick={checkParameters}
              disabled={!modifiedScript.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              <FaCheck size={14} />
              <span>Check Parameters</span>
            </button>

            {/* CHECK DEPENDENCIES BUTTON */}
            <button
              onClick={checkDependencies}
              disabled={!modifiedScript.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
            >
              <FaBox size={14} />
              <span>Check Dependencies</span>
            </button>

            {/* CLEAR DATA BUTTON */}
            <button
              onClick={clearAllData}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="Clear all data"
            >
              <FaTimes size={14} />
              <span>Clear</span>
            </button>

            <button
              onClick={refreshScript}
              disabled={!modifiedScript.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              title="Refresh script environment"
            >
              <FaRedo size={14} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${showTerminal
                ? 'bg-gray-700 text-white'
                : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
            >
              <FaTerminal size={14} />
              <span>Terminal</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Input and Controls */}
        <div className="lg:w-1/3 bg-white border-r border-gray-200 p-6 overflow-y-auto">
          {/* Task Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Description
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe what you want the script to do (e.g., 'Create a web scraper for news websites', 'Generate a report from CSV data')"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Programming Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {languages.map((lang) => {
                const Icon = lang.icon;
                return (
                  <button
                    key={lang.value}
                    onClick={() => setLanguage(lang.value)}
                    className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${language === lang.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs mt-1">{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={generateScript}
              disabled={isGenerating || !task.trim()}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {isGenerating ? (
                <FaSpinner className="animate-spin" size={16} />
              ) : (
                <FaRobot size={16} />
              )}
              <span>{isGenerating ? 'Generating...' : 'Generate Script'}</span>
            </button>

            <button
              onClick={enhanceScript}
              disabled={!modifiedScript.trim() || isGenerating}
              className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              <FaMagic size={14} />
              <span>{isGenerating ? 'Enhancing...' : 'Enhance'}</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              {!isExecuting ? (
                <button
                  onClick={executeScript}
                  disabled={!modifiedScript.trim()}
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  <FaPlay size={14} />
                  <span>Run</span>
                </button>
              ) : (
                <button
                  onClick={stopScript}
                  className="flex items-center justify-center space-x-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FaStop size={14} />
                  <span>Stop</span>
                </button>
              )}

              <button
                onClick={saveScript}
                disabled={!modifiedScript.trim()}
                className="flex items-center justify-center space-x-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                <FaSave size={14} />
                <span>Save</span>
              </button>

              {/* Add this button with your other action buttons */}
              <button
                onClick={() => setShowHostScriptModal(true)}
                disabled={!modifiedScript.trim()}
                className="flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
              >
                <FaGlobe size={14} />
                <span>Host Script</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center justify-center space-x-2 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
                <FaUpload size={14} />
                <span>Import</span>
                <input
                  type="file"
                  accept=".py,.js,.html,.cpp,.java,.php,.txt"
                  onChange={importScript}
                  className="hidden"
                />
              </label>

              <button
                onClick={exportScript}
                disabled={!modifiedScript.trim()}
                className="flex items-center justify-center space-x-2 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
              >
                <FaDownload size={14} />
                <span>Export</span>
              </button>

              <button
                onClick={shareScript}
                disabled={!currentScript}
                className="flex items-center justify-center space-x-2 bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
              >
                <FaShare size={14} />
                <span>Share</span>
              </button>
            </div>

            {/* CUSTOM DEPENDENCY BUTTON */}
            <button
              onClick={() => setShowCustomDependencyModal(true)}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FaWrench size={14} />
              <span>Custom Dependencies</span>
            </button>

            <button
              onClick={publishScript}
              disabled={!modifiedScript.trim() || isPublished}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              <FaGlobe size={14} />
              <span>{isPublished ? 'Published' : 'Publish'}</span>
            </button>
          </div>

          {/* Parameters Section */}
          {Object.keys(parameters).length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Script Parameters</h3>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  {Object.keys(parameters).length} parameters
                </span>
              </div>
              <div className="space-y-3">
                {Object.entries(parameters).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                      {missingParameters.includes(key) && (
                        <span className="ml-2 text-xs text-red-600">(Required)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleParameterChange(key, e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${missingParameters.includes(key) ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder={`Enter ${key}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Script History */}
          {scriptHistory.length > 0 && (
            <ScriptHistory
              scripts={scriptHistory}
              onLoadScript={loadFromHistory}
              onExecuteScript={(script) => {
                setModifiedScript(script.script);
                setLanguage(script.language);
                setTask(script.description || '');
                setTimeout(executeScript, 500); // Execute after loading
              }}
              onDeleteScript={async (scriptId) => {
                try {
                  await scriptAPI.deleteScript(scriptId);
                  addLog('✅ Script deleted successfully');
                  loadScriptHistory();
                } catch (error) {
                  addLog(`❌ Failed to delete script: ${error.message}`, 'error');
                }
              }}
            />
          )}
        </div>

        {/* Right Panel - Code Editor */}
        <div className="lg:w-2/3 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentScript?.name || 'Generated Script'}
                {isExecuting && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FaSpinner className="animate-spin mr-1" size={10} />
                    Running
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FaCode />
                <span className="capitalize">{language}</span>
                <span>•</span>
                <span>{modifiedScript.split('\n').length} lines</span>
                {Object.keys(parameters).length > 0 && (
                  <>
                    <span>•</span>
                    <span>{Object.keys(parameters).length} parameters</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-auto">
            <textarea
              value={modifiedScript}
              onChange={(e) => setModifiedScript(e.target.value)}
              placeholder="Generated script will appear here... You can modify it as needed."
              className="w-full h-full font-mono text-sm bg-gray-900 text-gray-100 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              spellCheck={false}
              style={{ minHeight: '400px' }}
            />
          </div>
        </div>
      </div>

      {/* Terminal */}
      {showTerminal && (
        <div className="border-t border-gray-300 bg-gray-900 text-white">
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <h4 className="font-semibold">Execution Logs</h4>
            <div className="flex space-x-2">
              <button
                onClick={clearTerminal}
                className="px-3 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="h-48 overflow-y-auto font-mono text-sm p-4">
            {executionLogs.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No logs yet. Generate and run a script to see execution logs.
              </div>
            ) : (
              executionLogs.map((log, index) => (
                <div
                  key={`${log.id}-${index}-${log.timestamp}`}
                  className={`py-1 border-l-4 pl-2 mb-1 ${log.type === 'error'
                    ? 'border-red-500 bg-red-900/20'
                    : log.type === 'warning'
                      ? 'border-yellow-500 bg-yellow-900/20'
                      : 'border-green-500 bg-green-900/20'
                    }`}
                >
                  <span className="text-gray-400 text-xs">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="ml-2">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PARAMETER MODAL */}
      {showParameterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Script Parameters</h3>
              <button
                onClick={() => setShowParameterModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                {detectedParameters.length > 0
                  ? `Detected ${detectedParameters.length} parameters in your script:`
                  : 'No parameters detected in your script.'
                }
              </p>

              {detectedParameters.length > 0 && (
                <div className="bg-gray-100 p-3 rounded-lg max-h-40 overflow-y-auto mb-4">
                  <ul className="space-y-2">
                    {detectedParameters.map((param, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FaSearch className="text-blue-500" size={12} />
                          <span className="text-sm font-mono">{param}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded ${parameters[param] && parameters[param].trim() !== ''
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {parameters[param] && parameters[param].trim() !== '' ? 'Set' : 'Missing'}
                          </span>
                          <button
                            onClick={() => removeParameter(param)}
                            className="text-red-500 hover:text-red-700 text-xs"
                            title="Remove parameter"
                          >
                            <FaTimes size={10} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Show removed parameters section */}
              {removedParameters.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Removed Parameters</h4>
                  <div className="bg-yellow-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                    <ul className="space-y-2">
                      {removedParameters.map((param, index) => (
                        <li key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FaTimes className="text-red-500" size={12} />
                            <span className="text-sm font-mono line-through">{param.name}</span>
                          </div>
                          <button
                            onClick={() => restoreParameter(param.name)}
                            className="text-green-600 hover:text-green-800 text-xs flex items-center space-x-1"
                            title="Restore parameter"
                          >
                            <FaUndo size={10} />
                            <span>Restore</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {missingParameters.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Missing values for:</strong> {missingParameters.join(', ')}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Please provide values for these parameters before running the script.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowParameterModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              {missingParameters.length === 0 && detectedParameters.length > 0 && (
                <button
                  onClick={() => {
                    setShowParameterModal(false);
                    executeScript();
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Run Script
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEPENDENCY MODAL */}
      {showDependencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Install Dependencies</h3>
              <button
                onClick={() => setShowDependencyModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                The following dependencies were detected in your script:
              </p>

              <div className="bg-gray-100 p-3 rounded-lg max-h-40 overflow-y-auto">
                {detectedDependencies.length > 0 ? (
                  <ul className="space-y-2">
                    {detectedDependencies.map((dep, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <FaBox className="text-blue-500" size={12} />
                        <span className="text-sm font-mono">{dep}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 text-center">No dependencies detected</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDependencyModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                disabled={isInstallingDeps}
              >
                Cancel
              </button>
              <button
                onClick={installDependencies}
                disabled={isInstallingDeps || detectedDependencies.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
              >
                {isInstallingDeps ? (
                  <FaSpinner className="animate-spin" size={14} />
                ) : (
                  <FaWrench size={14} />
                )}
                <span>{isInstallingDeps ? 'Installing...' : 'Install'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DEPENDENCY MODAL */}
      {showCustomDependencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Custom Dependencies</h3>
              <button
                onClick={() => setShowCustomDependencyModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Enter custom dependency installation commands:
              </p>

              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={customDependencyCommand}
                  onChange={(e) => setCustomDependencyCommand(e.target.value)}
                  placeholder="e.g., pip install numpy, npm install axios"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addCustomDependencyCommand}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <FaPlus size={14} />
                </button>
              </div>

              {customDependencyCommands.length > 0 && (
                <div className="bg-gray-100 p-3 rounded-lg max-h-32 overflow-y-auto">
                  <ul className="space-y-2">
                    {customDependencyCommands.map((cmd, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <span className="text-sm font-mono">{cmd}</span>
                        <button
                          onClick={() => removeCustomDependencyCommand(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTimes size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCustomDependencyModal(false);
                  setCustomDependencyCommands([]);
                  setCustomDependencyCommand('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                disabled={isInstallingDeps}
              >
                Cancel
              </button>
              <button
                onClick={installCustomDependencies}
                disabled={isInstallingDeps || customDependencyCommands.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
              >
                {isInstallingDeps ? (
                  <FaSpinner className="animate-spin" size={14} />
                ) : (
                  <FaWrench size={14} />
                )}
                <span>{isInstallingDeps ? 'Installing...' : 'Install'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add this before the closing </div> */}
      <HostedScriptsPanel />

      <HostScriptModal
        isOpen={showHostScriptModal}
        onClose={() => setShowHostScriptModal(false)}
        script={{
          name: currentScript?.name || `Script_${Date.now()}`,
          description: task,
          script: modifiedScript
        }}
        language={language}
        onHostScript={handleHostScript}
      />
    </div>
  );
};

export default ScriptTab;