// src/store/workflowStore.jsx
import { create } from 'zustand';
import { addEdge, applyEdgeChanges, applyNodeChanges } from 'reactflow';

const useWorkflowStore = create((set, get) => ({
  // State
  nodes: [],
  edges: [],
  selectedNode: null,
  terminalLogs: [],
  isRunning: false,
  workflowName: 'Untitled Workflow',
  showTerminal: false,

  // Actions
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection) => {
    set({
      edges: addEdge({ ...connection, type: 'smoothstep' }, get().edges),
    });
  },
  
  setSelectedNode: (node) => set({ selectedNode: node }),
  
  updateNodeData: (nodeId, newData) => {
  set({
    nodes: get().nodes.map((node) =>
      node.id === nodeId 
        ? { 
            ...node, 
            data: { 
              ...node.data, 
              ...newData,
              // Auto-set parametersConfigured if parameters are provided
              parametersConfigured: newData.parameters ? 
                Object.keys(newData.parameters).length > 0 && 
                Object.values(newData.parameters).every(val => val && val.toString().trim() !== '')
                : node.data.parametersConfigured
            } 
          } 
        : node
    ),
  });
},
  
  addTerminalLog: (log, type = 'info') => {
    set((state) => ({
      terminalLogs: [...state.terminalLogs, {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        message: log,
        type: type
      }].slice(-100) // Keep only last 100 logs
    }));
  },
  
  clearTerminalLogs: () => set({ terminalLogs: [] }),
  
  setIsRunning: (isRunning) => set({ isRunning }),
  
  setWorkflowName: (name) => set({ workflowName: name }),
  
  setShowTerminal: (show) => set({ showTerminal: show }),

  // FIXED: Generate workflow from AI response with proper structure
  // generateWorkflowFromAI: (aiResponse) => {
  //   console.log('AI Response:', aiResponse); // Debug log
    
  //   // Ensure we have the correct data structure
  //   const nodes = aiResponse.nodes || aiResponse.data?.nodes || [];
  //   const edges = aiResponse.edges || aiResponse.data?.edges || [];
    
  //   if (!nodes || nodes.length === 0) {
  //     console.error('No nodes found in AI response:', aiResponse);
  //     return;
  //   }

  //   // Process nodes to ensure they have the correct structure
  //   const processedNodes = nodes.map((node, index) => {
  //     // If node is missing data property, create it
  //     if (!node.data) {
  //       return {
  //         id: node.id || `node-${index + 1}`,
  //         type: 'custom',
  //         position: node.position || { x: index * 300, y: 100 },
  //         data: {
  //           label: node.label || `Step ${index + 1}`,
  //           service: node.service || 'action',
  //           description: node.description || '',
  //           stepNumber: index + 1,
  //           parameters: node.parameters || {},
  //           parametersConfigured: false,
  //           ...node
  //         }
  //       };
  //     }
      
  //     // If node has data property but missing required fields
  //     return {
  //       id: node.id || `node-${index + 1}`,
  //       type: node.type || 'custom',
  //       position: node.position || { x: index * 300, y: 100 },
  //       data: {
  //         label: node.data.label || `Step ${index + 1}`,
  //         service: node.data.service || 'action',
  //         description: node.data.description || '',
  //         stepNumber: index + 1,
  //         parameters: node.data.parameters || {},
  //         parametersConfigured: node.data.parametersConfigured || false,
  //         ...node.data
  //       }
  //     };
  //   });

  //   // Process edges to ensure they have the correct structure
  //   const processedEdges = edges.map((edge, index) => ({
  //     id: edge.id || `edge-${index}`,
  //     source: edge.source,
  //     target: edge.target,
  //     type: edge.type || 'smoothstep',
  //     animated: edge.animated !== false,
  //     style: { strokeWidth: 2 }
  //   }));

  //   console.log('Processed Nodes:', processedNodes);
  //   console.log('Processed Edges:', processedEdges);

  //   set({ 
  //     nodes: processedNodes, 
  //     edges: processedEdges,
  //     selectedNode: null
  //   });
  // },

  // Clear workflow
  clearWorkflow: () => set({ 
    nodes: [], 
    edges: [], 
    selectedNode: null,
    workflowName: 'Untitled Workflow',
    terminalLogs: []
  })
}));

export default useWorkflowStore;