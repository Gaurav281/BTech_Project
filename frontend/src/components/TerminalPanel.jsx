import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import useWorkflowStore from '../store/workflowStore';

const TerminalPanel = () => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const fitAddon = useRef(null);
  const { terminalLogs } = useWorkflowStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (terminalRef.current && !terminal.current) {
      try {
        terminal.current = new Terminal({
          theme: {
            background: '#1a202c',
            foreground: '#e2e8f0',
            cursor: '#e2e8f0',
          },
          fontSize: 12,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          cols: 80,
          rows: 15,
          allowTransparency: true,
          cursorBlink: true
        });

        fitAddon.current = new FitAddon();
        terminal.current.loadAddon(fitAddon.current);
        terminal.current.open(terminalRef.current);
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          try {
            fitAddon.current.fit();
            setIsInitialized(true);
          } catch (error) {
            console.warn('Terminal fit error:', error);
          }
        }, 100);

        // Add welcome message
        terminal.current.writeln('🚀 Workflow Automation Terminal');
        terminal.current.writeln('Ready to receive logs...\r\n');

      } catch (error) {
        console.error('Terminal initialization error:', error);
      }
    }

    return () => {
      if (terminal.current) {
        try {
          terminal.current.dispose();
        } catch (error) {
          console.warn('Terminal disposal error:', error);
        }
        terminal.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (terminal.current && isInitialized && terminalLogs.length > 0) {
      try {
        const lastLog = terminalLogs[terminalLogs.length - 1];
        const timestamp = new Date(lastLog.timestamp).toLocaleTimeString();
        
        let logPrefix = '[INFO]';
        let logColor = '\x1b[32m'; // Green
        
        if (lastLog.type === 'error') {
          logPrefix = '[ERROR]';
          logColor = '\x1b[31m'; // Red
        } else if (lastLog.type === 'warning') {
          logPrefix = '[WARN]';
          logColor = '\x1b[33m'; // Yellow
        }

        terminal.current.write(
          `${logColor}${logPrefix}\x1b[0m [${timestamp}] ${lastLog.message}\r\n`
        );
      } catch (error) {
        console.warn('Terminal write error:', error);
      }
    }
  }, [terminalLogs, isInitialized]);

  const handleClear = () => {
    if (terminal.current) {
      try {
        terminal.current.clear();
        terminal.current.writeln('Terminal cleared\r\n');
      } catch (error) {
        console.warn('Terminal clear error:', error);
      }
    }
  };

  return (
    <div className="h-64 bg-gray-900 border-t border-gray-700 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="text-white font-semibold">Terminal</div>
        <div className="flex space-x-2">
          <button
            onClick={handleClear}
            className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>
      <div 
        ref={terminalRef} 
        className="flex-1 w-full p-2 terminal-container"
        style={{ minHeight: '200px' }}
      />
    </div>
  );
};

export default TerminalPanel;