export class SimpleCommandProcessor {
  static processCommand(command, currentState) {
    const lowerCommand = command.toLowerCase().trim();
    const { nodes, edges, workflowName } = currentState;
    
    const modifications = {
      nodes: [...nodes],
      edges: [...edges],
      workflowName,
      explanation: ''
    };

    let changes = [];

    // ADD NODE COMMANDS
    if (lowerCommand.includes('add telegram node') || lowerCommand.includes('add telegram')) {
      modifications.nodes.push(this.createNode('telegram', modifications.nodes.length));
      changes.push('Added Telegram node');
    }
    
    if (lowerCommand.includes('add gmail node') || lowerCommand.includes('add email')) {
      modifications.nodes.push(this.createNode('gmail', modifications.nodes.length));
      changes.push('Added Gmail node');
    }
    
    if (lowerCommand.includes('add slack node') || lowerCommand.includes('add slack')) {
      modifications.nodes.push(this.createNode('slack', modifications.nodes.length));
      changes.push('Added Slack node');
    }
    
    if (lowerCommand.includes('add google sheets node') || lowerCommand.includes('add sheets')) {
      modifications.nodes.push(this.createNode('google-sheets', modifications.nodes.length));
      changes.push('Added Google Sheets node');
    }
    
    if (lowerCommand.includes('add webhook node') || lowerCommand.includes('add webhook')) {
      modifications.nodes.push(this.createNode('webhook', modifications.nodes.length));
      changes.push('Added Webhook node');
    }
    
    if (lowerCommand.includes('add mysql node') || lowerCommand.includes('add database')) {
      modifications.nodes.push(this.createNode('mysql', modifications.nodes.length));
      changes.push('Added MySQL node');
    }
    
    if (lowerCommand.includes('add trigger node') || lowerCommand.includes('add start')) {
      modifications.nodes.push(this.createNode('trigger', modifications.nodes.length));
      changes.push('Added Trigger node');
    }

    // REMOVE NODE COMMANDS
    if ((lowerCommand.includes('remove node') || lowerCommand.includes('delete node')) && 
        (lowerCommand.match(/node\s+(\d+)/) || lowerCommand.includes('last'))) {
      
      if (lowerCommand.includes('last')) {
        if (modifications.nodes.length > 0) {
          modifications.nodes.pop();
          changes.push('Removed last node');
        }
      } else {
        const nodeMatch = lowerCommand.match(/node\s+(\d+)/);
        if (nodeMatch) {
          const nodeNumber = parseInt(nodeMatch[1]);
          if (nodeNumber > 0 && nodeNumber <= modifications.nodes.length) {
            modifications.nodes.splice(nodeNumber - 1, 1);
            // Reorder step numbers
            modifications.nodes.forEach((node, index) => {
              node.data.stepNumber = index + 1;
            });
            changes.push(`Removed node ${nodeNumber}`);
          }
        }
      }
    }

    // CONNECTION COMMANDS
    if (lowerCommand.includes('connect') && lowerCommand.includes('to')) {
      const connectMatch = lowerCommand.match(/(\d+)\s+to\s+(\d+)/);
      if (connectMatch) {
        const sourceIdx = parseInt(connectMatch[1]) - 1;
        const targetIdx = parseInt(connectMatch[2]) - 1;
        
        if (sourceIdx >= 0 && sourceIdx < modifications.nodes.length && 
            targetIdx >= 0 && targetIdx < modifications.nodes.length) {
          
          const sourceNode = modifications.nodes[sourceIdx];
          const targetNode = modifications.nodes[targetIdx];
          
          // Remove existing edges between these nodes
          modifications.edges = modifications.edges.filter(edge => 
            !(edge.source === sourceNode.id && edge.target === targetNode.id)
          );
          
          const newEdge = {
            id: `edge-${Date.now()}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'smoothstep',
            animated: true
          };
          
          modifications.edges.push(newEdge);
          changes.push(`Connected node ${connectMatch[1]} to node ${connectMatch[2]}`);
        }
      }
    }

    // DISCONNECT COMMANDS
    if (lowerCommand.includes('disconnect') && lowerCommand.includes('from')) {
      const disconnectMatch = lowerCommand.match(/(\d+)\s+from\s+(\d+)/);
      if (disconnectMatch) {
        const sourceIdx = parseInt(disconnectMatch[1]) - 1;
        const targetIdx = parseInt(disconnectMatch[2]) - 1;
        
        if (sourceIdx >= 0 && sourceIdx < modifications.nodes.length && 
            targetIdx >= 0 && targetIdx < modifications.nodes.length) {
          
          const sourceNode = modifications.nodes[sourceIdx];
          const targetNode = modifications.nodes[targetIdx];
          
          modifications.edges = modifications.edges.filter(edge => 
            !(edge.source === sourceNode.id && edge.target === targetNode.id)
          );
          
          changes.push(`Disconnected node ${disconnectMatch[1]} from node ${disconnectMatch[2]}`);
        }
      }
    }

    // WORKFLOW NAME COMMANDS
    if ((lowerCommand.includes('rename workflow') || lowerCommand.includes('change name')) && 
        (lowerCommand.includes('to'))) {
      const nameMatch = command.match(/to\s+["']?([^"']+)["']?/i);
      if (nameMatch) {
        modifications.workflowName = nameMatch[1];
        changes.push(`Renamed workflow to "${nameMatch[1]}"`);
      }
    }

    // CLEAR COMMANDS
    if (lowerCommand.includes('clear workflow') || lowerCommand.includes('reset workflow')) {
      modifications.nodes = [];
      modifications.edges = [];
      changes.push('Cleared entire workflow');
    }

    // EXECUTION CONTROL
    if (lowerCommand.includes('start workflow') || lowerCommand.includes('run workflow')) {
      changes.push('Workflow execution started');
      // This will be handled by the execution system
    }

    if (lowerCommand.includes('stop workflow') || lowerCommand.includes('pause workflow')) {
      changes.push('Workflow execution stopped');
      // This will be handled by the execution system
    }

    // Update node positions after modifications
    if (changes.length > 0) {
      modifications.nodes.forEach((node, index) => {
        node.position = this.calculateNodePosition(index);
      });
    }

    modifications.explanation = changes.length > 0 ? changes.join(', ') : 'No changes made';
    
    return {
      success: changes.length > 0,
      modifications,
      explanation: modifications.explanation
    };
  }

  static createNode(service, index) {
    const baseNodes = {
      'trigger': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: this.calculateNodePosition(index),
        data: {
          label: 'Start Workflow',
          service: 'trigger',
          description: 'Manual workflow trigger',
          stepNumber: index + 1,
          parameters: {},
          parametersConfigured: true
        }
      },
      'telegram': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: this.calculateNodePosition(index),
        data: {
          label: 'Send Telegram Message',
          service: 'telegram',
          description: 'Sends message via Telegram bot',
          stepNumber: index + 1,
          parameters: {
            botToken: '',
            chatId: '',
            message: 'Hello from workflow!'
          },
          parametersConfigured: false
        }
      },
      'gmail': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: this.calculateNodePosition(index),
        data: {
          label: 'Send Email',
          service: 'gmail',
          description: 'Sends email via Gmail',
          stepNumber: index + 1,
          parameters: {
            to: '',
            subject: 'Automated Email',
            body: 'This is an automated email from your workflow.'
          },
          parametersConfigured: false
        }
      },
      'slack': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: this.calculateNodePosition(index),
        data: {
          label: 'Post to Slack',
          service: 'slack',
          description: 'Posts message to Slack channel',
          stepNumber: index + 1,
          parameters: {
            channel: '#general',
            message: 'Hello from workflow!'
          },
          parametersConfigured: false
        }
      },
      'google-sheets': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: this.calculateNodePosition(index),
        data: {
          label: 'Save to Google Sheets',
          service: 'google-sheets',
          description: 'Saves data to Google Sheets',
          stepNumber: index + 1,
          parameters: {
            spreadsheetId: '',
            sheetName: 'Sheet1',
            range: 'A1'
          },
          parametersConfigured: false
        }
      },
      'mysql': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: this.calculateNodePosition(index),
        data: {
          label: 'Save to Database',
          service: 'mysql',
          description: 'Saves data to MySQL database',
          stepNumber: index + 1,
          parameters: {
            host: 'localhost',
            port: 3306,
            database: '',
            username: '',
            password: '',
            query: 'INSERT INTO data VALUES (?)'
          },
          parametersConfigured: false
        }
      },
      'webhook': {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom',
        position: this.calculateNodePosition(index),
        data: {
          label: 'Trigger Webhook',
          service: 'webhook',
          description: 'Triggers webhook endpoint',
          stepNumber: index + 1,
          parameters: {
            url: '',
            method: 'POST',
            headers: '{"Content-Type": "application/json"}',
            body: '{"data": "example"}'
          },
          parametersConfigured: false
        }
      }
    };

    return baseNodes[service] || baseNodes['webhook'];
  }

  static calculateNodePosition(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      x: 100 + (col * 300),
      y: 100 + (row * 150)
    };
  }

  static getCommandExamples() {
    return [
      "Add Telegram node",
      "Add Gmail node",
      "Add Google Sheets node", 
      "Add Slack node",
      "Add Webhook node",
      "Add MySQL node",
      "Add Trigger node",
      "Remove node 2",
      "Remove last node",
      "Connect node 1 to node 2",
      "Disconnect node 1 from node 2",
      "Rename workflow to 'My Automation'",
      "Clear workflow",
      "Start workflow",
      "Stop workflow"
    ];
  }
}