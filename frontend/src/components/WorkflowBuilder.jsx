import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import useWorkflowStore from '../store/workflowStore';
import CustomNode from './CustomNode';
import { FaShare, FaLock, FaEye, FaCopy, FaPlay, FaInfoCircle } from 'react-icons/fa';

// Define nodeTypes OUTSIDE the component to prevent recreation
const nodeTypes = {
  custom: CustomNode,
};

const WorkflowBuilder = ({ 
  sharedView = false, 
  initialNodes = [], 
  initialEdges = [], 
  readOnly = false,
  executionProgress = {} 
}) => {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    onNodesChange: onStoreNodesChange,
    onEdgesChange: onStoreEdgesChange,
    onConnect: onStoreConnect,
    setSelectedNode,
    selectedNode,
    workflowName,
    setWorkflowName,
    addTerminalLog
  } = useWorkflowStore();

  // Ensure we always have arrays
  const safeStoreNodes = Array.isArray(storeNodes) ? storeNodes : [];
  const safeStoreEdges = Array.isArray(storeEdges) ? storeEdges : [];

  const [nodes, setNodes, onNodesChange] = useNodesState(safeStoreNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(safeStoreEdges);
  const [isCopied, setIsCopied] = useState(false);

  const reactFlowWrapper = useRef(null);

  // Use useMemo for nodeTypes to ensure it doesn't change
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Sync store with local state for regular workflow view
  useEffect(() => {
    if (!sharedView) {
      if (JSON.stringify(nodes) !== JSON.stringify(safeStoreNodes)) {
        setNodes(safeStoreNodes);
      }
      if (JSON.stringify(edges) !== JSON.stringify(safeStoreEdges)) {
        setEdges(safeStoreEdges);
      }
    }
  }, [safeStoreNodes, safeStoreEdges, setNodes, setEdges, sharedView]);

  // Initialize with provided nodes/edges for shared view
  useEffect(() => {
    if (sharedView && initialNodes.length > 0) {
      setNodes(initialNodes);
    }
    if (sharedView && initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [sharedView, initialNodes, initialEdges, setNodes, setEdges]);

  // Update store when local state changes (debounced) - only for regular view
  useEffect(() => {
    if (!sharedView) {
      const timeoutId = setTimeout(() => {
        if (JSON.stringify(nodes) !== JSON.stringify(safeStoreNodes) ||
          JSON.stringify(edges) !== JSON.stringify(safeStoreEdges)) {
          useWorkflowStore.setState({ nodes, edges });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, safeStoreNodes, safeStoreEdges, sharedView]);

  const onConnect = useCallback(
    (params) => {
      if (readOnly) {
        addTerminalLog('⚠️ Cannot modify connections in shared view', 'warning');
        return;
      }

      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      
      if (!sharedView) {
        onStoreConnect(params);
      }
      
      // Log the connection
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      if (sourceNode && targetNode) {
        addTerminalLog(`🔗 Connected "${sourceNode.data.label}" to "${targetNode.data.label}"`);
      }
    },
    [edges, setEdges, onStoreConnect, sharedView, readOnly, nodes, addTerminalLog]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    
    if (sharedView) {
      addTerminalLog(`👆 Selected node: ${node.data.label} (Shared View - Parameters Hidden)`, 'info');
    } else {
      addTerminalLog(`👆 Selected node: ${node.data.label}`, 'info');
    }
  }, [setSelectedNode, sharedView, addTerminalLog]);

  // Handle pane click to deselect nodes
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Handle node drag events
  const onNodeDragStart = useCallback((event, node) => {
    if (readOnly) {
      event.preventDefault();
      return;
    }
    addTerminalLog(`🎯 Started dragging node: ${node.data.label}`);
  }, [readOnly, addTerminalLog]);

  const onNodeDrag = useCallback((event, node) => {
    if (readOnly) {
      event.preventDefault();
      return;
    }
  }, [readOnly]);

  const onNodeDragStop = useCallback((event, node) => {
    if (readOnly) {
      event.preventDefault();
      return;
    }
    addTerminalLog(`📍 Moved node: ${node.data.label} to new position`);
  }, [readOnly, addTerminalLog]);

  // Copy current URL to clipboard (for sharing)
  const handleCopyShareLink = useCallback(async () => {
    try {
      const currentUrl = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setIsCopied(true);
      addTerminalLog('📋 Share link copied to clipboard!', 'success');
      
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      addTerminalLog('❌ Failed to copy share link', 'error');
    }
  }, [addTerminalLog]);

  // Enhanced nodes with execution progress
  const nodesWithProgress = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        executionStatus: executionProgress[node.id] || 'idle'
      }
    }));
  }, [nodes, executionProgress]);

  // Calculate workflow statistics
  const workflowStats = useMemo(() => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const triggerNodes = nodes.filter(node => node.data.service === 'trigger').length;
    const actionNodes = nodes.filter(node => node.data.service !== 'trigger').length;
    
    const serviceCount = {};
    nodes.forEach(node => {
      const service = node.data.service;
      serviceCount[service] = (serviceCount[service] || 0) + 1;
    });

    return {
      nodeCount,
      edgeCount,
      triggerNodes,
      actionNodes,
      serviceCount
    };
  }, [nodes, edges]);

  // Empty state component
  const EmptyState = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          {sharedView ? 'No Workflow Content' : 'No Workflow Yet'}
        </h3>
        <p className="text-gray-500 mb-4">
          {sharedView 
            ? 'This shared workflow doesn\'t contain any nodes or steps.' 
            : 'Generate a workflow using the prompt above to get started'
          }
        </p>
        {!sharedView && (
          <div className="text-sm text-gray-400">
            Enter a prompt like "Send Telegram message when database updates"
          </div>
        )}
      </div>
    </div>
  );

  // Workflow information panel
  const WorkflowInfoPanel = () => (
    <Panel position="top-left" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
            <FaInfoCircle className="text-blue-500" />
            <span>Workflow Info</span>
          </h3>
          {sharedView && (
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
              Shared
            </span>
          )}
        </div>
        
        {!sharedView && workflowName && (
          <div>
            <label className="text-xs text-gray-500">Workflow Name</label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter workflow name"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-bold text-blue-700">{workflowStats.nodeCount}</div>
            <div className="text-blue-600">Nodes</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-bold text-green-700">{workflowStats.edgeCount}</div>
            <div className="text-green-600">Connections</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="font-bold text-yellow-700">{workflowStats.triggerNodes}</div>
            <div className="text-yellow-600">Triggers</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="font-bold text-red-700">{workflowStats.actionNodes}</div>
            <div className="text-red-600">Actions</div>
          </div>
        </div>

        {Object.keys(workflowStats.serviceCount).length > 0 && (
          <div>
            <label className="text-xs text-gray-500">Services Used</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(workflowStats.serviceCount).map(([service, count]) => (
                <span
                  key={service}
                  className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                >
                  {service}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {sharedView && (
          <button
            onClick={handleCopyShareLink}
            className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              isCopied 
                ? 'bg-green-600 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <FaCopy size={12} />
            <span>{isCopied ? 'Copied!' : 'Copy Share Link'}</span>
          </button>
        )}
      </div>
    </Panel>
  );

  // Execution progress panel
  const ExecutionProgressPanel = () => {
    if (Object.keys(executionProgress).length === 0) return null;

    const executingNodes = Object.values(executionProgress).filter(status => 
      status === 'executing'
    ).length;
    const completedNodes = Object.values(executionProgress).filter(status => 
      status === 'success'
    ).length;
    const errorNodes = Object.values(executionProgress).filter(status => 
      status === 'error'
    ).length;

    return (
      <Panel position="top-right" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs">
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
            <FaPlay className="text-green-500" />
            <span>Execution Progress</span>
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Nodes:</span>
              <span className="font-medium">{nodes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-600">Executing:</span>
              <span className="font-medium text-blue-600">{executingNodes}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Completed:</span>
              <span className="font-medium text-green-600">{completedNodes}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Errors:</span>
              <span className="font-medium text-red-600">{errorNodes}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(completedNodes / nodes.length) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </Panel>
    );
  };

  // Shared view overlay
  const SharedViewOverlay = () => {
    if (!sharedView) return null;

    return (
      <>
        <Panel position="top-center" className="bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <FaEye />
            <span>Shared Workflow View</span>
            <FaLock />
            <span>Parameters Hidden</span>
          </div>
        </Panel>

        {/* Security notice */}
        <Panel position="bottom-left" className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-sm">
          <div className="flex items-start space-x-2">
            <FaLock className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-800 font-medium">Security Notice</p>
              <p className="text-xs text-yellow-700">
                Sensitive parameters are hidden in shared view for security.
              </p>
            </div>
          </div>
        </Panel>
      </>
    );
  };

  // Node selection info panel
  const NodeSelectionPanel = () => {
    if (!selectedNode) return null;

    return (
      <Panel position="bottom-right" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs">
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
            <span>Selected Node</span>
            {executionProgress[selectedNode.id] && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                executionProgress[selectedNode.id] === 'success' ? 'bg-green-100 text-green-800' :
                executionProgress[selectedNode.id] === 'error' ? 'bg-red-100 text-red-800' :
                executionProgress[selectedNode.id] === 'executing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {executionProgress[selectedNode.id]}
              </span>
            )}
          </h4>
          <div className="text-sm space-y-1">
            <div><strong>Label:</strong> {selectedNode.data.label}</div>
            <div><strong>Service:</strong> {selectedNode.data.service}</div>
            <div><strong>Type:</strong> {selectedNode.data.service === 'trigger' ? 'Trigger' : 'Action'}</div>
            {selectedNode.data.description && (
              <div><strong>Description:</strong> {selectedNode.data.description}</div>
            )}
            <div><strong>Step:</strong> {selectedNode.data.stepNumber}</div>
          </div>
        </div>
      </Panel>
    );
  };

  return (
    <ReactFlowProvider>
      <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
        {nodes.length === 0 ? (
          <EmptyState />
        ) : (
          <ReactFlow
            nodes={nodesWithProgress}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={memoizedNodeTypes}
            fitView
            className="bg-gray-50"
            minZoom={0.2}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            selectNodesOnDrag={!readOnly}
            deleteKeyCode={readOnly ? null : 'Delete'}
          >
            <Controls 
              showInteractive={!readOnly}
              position="bottom-right"
            />
            <MiniMap
              nodeColor={(node) => {
                if (executionProgress[node.id] === 'success') return '#10B981';
                if (executionProgress[node.id] === 'error') return '#EF4444';
                if (executionProgress[node.id] === 'executing') return '#3B82F6';
                if (node.data.service === 'trigger') return '#8B5CF6';
                return '#6B7280';
              }}
              maskColor="rgba(255, 255, 255, 0.1)"
              position="bottom-right"
            />
            <Background variant="dots" gap={12} size={1} />

            {/* Custom Panels */}
            <WorkflowInfoPanel />
            <ExecutionProgressPanel />
            <SharedViewOverlay />
            <NodeSelectionPanel />

            {/* Node count badge */}
            <Panel position="bottom-left" className="bg-black/80 text-white px-3 py-1 rounded-full text-sm">
              {nodes.length} node{nodes.length !== 1 ? 's' : ''} • {edges.length} connection{edges.length !== 1 ? 's' : ''}
            </Panel>
          </ReactFlow>
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default WorkflowBuilder;