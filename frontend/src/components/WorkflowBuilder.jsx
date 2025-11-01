import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import useWorkflowStore from '../store/workflowStore';
import CustomNode from './CustomNode';

// Define nodeTypes OUTSIDE the component to prevent recreation
const nodeTypes = {
  custom: CustomNode,
};

const WorkflowBuilder = () => {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    onNodesChange: onStoreNodesChange,
    onEdgesChange: onStoreEdgesChange,
    onConnect: onStoreConnect,
    setSelectedNode,
  } = useWorkflowStore();

  // Ensure we always have arrays
  const safeStoreNodes = Array.isArray(storeNodes) ? storeNodes : [];
  const safeStoreEdges = Array.isArray(storeEdges) ? storeEdges : [];

  const [nodes, setNodes, onNodesChange] = useNodesState(safeStoreNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(safeStoreEdges);

  const reactFlowWrapper = useRef(null);

  // Use useMemo for nodeTypes to ensure it doesn't change
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Sync store with local state
  useEffect(() => {
    if (JSON.stringify(nodes) !== JSON.stringify(safeStoreNodes)) {
      setNodes(safeStoreNodes);
    }
    if (JSON.stringify(edges) !== JSON.stringify(safeStoreEdges)) {
      setEdges(safeStoreEdges);
    }
  }, [safeStoreNodes, safeStoreEdges, setNodes, setEdges]);

  // Update store when local state changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (JSON.stringify(nodes) !== JSON.stringify(safeStoreNodes) ||
        JSON.stringify(edges) !== JSON.stringify(safeStoreEdges)) {
        useWorkflowStore.setState({ nodes, edges });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, safeStoreNodes, safeStoreEdges]);

  const onConnect = useCallback(
    (params) => {
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      onStoreConnect(params);
    },
    [edges, setEdges, onStoreConnect]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  // Handle pane click to deselect nodes
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Empty state component
  const EmptyState = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Workflow Yet</h3>
        <p className="text-gray-500 mb-4">Generate a workflow using the prompt above to get started</p>
        <div className="text-sm text-gray-400">
          Enter a prompt like "Send Telegram message when database updates"
        </div>
      </div>
    </div>
  );

  return (
    <ReactFlowProvider>
      <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
        {nodes.length === 0 ? (
          <EmptyState />
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={memoizedNodeTypes}
            fitView
            className="bg-gray-50"
            minZoom={0.2}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            selectNodesOnDrag={true}
          >
            <Controls />
            <MiniMap
              nodeColor="#6b7280"
              maskColor="rgba(255, 255, 255, 0.1)"
              position="bottom-right"
            />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default WorkflowBuilder;