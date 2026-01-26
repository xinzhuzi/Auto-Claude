/**
 * WorkflowCanvas Component
 *
 * ReactFlow-based workflow visualization canvas
 * Part of cc-wf-studio integration into Auto-Claude
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useCanvasStore } from '@frontend/src/renderer/stores/canvas-store';
import { useWorkflowStore, useActiveWorkflow } from '@frontend/src/renderer/stores/workflow-store';
import { cn } from '@frontend/src/renderer/lib/utils';

import nodeTypes from '../nodes';
import { Toolbar } from '../toolbar/Toolbar';

interface WorkflowCanvasProps {
  className?: string;
}

/**
 * WorkflowCanvas Component (Internal)
 *
 * Wrapped by ReactFlowProvider for context access
 */
const WorkflowCanvasInner: React.FC<WorkflowCanvasProps> = ({ className }) => {
  // Get Zustand stores
  const {
    nodes: storeNodes,
    edges: storeEdges,
    viewport,
    addNode,
    removeNode,
    updateNode,
    connectNodes,
    selectNode,
    selectMultiple,
    clearSelection,
    setViewport,
  } = useCanvasStore();

  const { updateWorkflow } = useWorkflowStore();

  // 使用正确的 hook 获取活动工作流
  const activeWorkflow = useActiveWorkflow();

  // ReactFlow state management
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(storeEdges);

  // Sync active workflow to local state
  useEffect(() => {
    if (activeWorkflow) {
      setNodes(activeWorkflow.nodes || []);
      setEdges(activeWorkflow.connections || []);
    }
  }, [activeWorkflow, setNodes, setEdges]);

  // Sync local changes back to workflow store
  useEffect(() => {
    if (activeWorkflow && (nodes !== storeNodes || edges !== storeEdges)) {
      updateWorkflow(activeWorkflow.id, {
        nodes,
        connections: edges,
      });
    }
  }, [nodes, edges, activeWorkflow, storeNodes, storeEdges, updateWorkflow]);

  // Initialize default Start/End nodes if canvas is empty
  useEffect(() => {
    if (nodes.length === 0) {
      const startNode: Node = {
        id: 'start-node-default',
        type: 'start',
        position: { x: 100, y: 200 },
        data: {
          label: 'Start',
          name: 'Start',
        },
      };

      const endNode: Node = {
        id: 'end-node-default',
        type: 'end',
        position: { x: 600, y: 200 },
        data: {
          label: 'End',
          name: 'End',
        },
      };

      setNodes([startNode, endNode]);
      addNode(startNode as any);
      addNode(endNode as any);
    }
  }, []); // Run once on mount

  // Handle node connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const edge = {
        ...connection,
        id: `edge_${Date.now()}`,
        animated: true,
      };

      setEdges((eds) => addEdge(edge, eds));
      connectNodes(connection.source!, connection.target!);
    },
    [setEdges, connectNodes]
  );

  // Handle node selection
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      if (selectedNodes && selectedNodes.length > 0) {
        const selectedIds = selectedNodes.map((n) => n.id);
        if (selectedIds.length === 1) {
          selectNode(selectedIds[0]);
        } else {
          selectMultiple(selectedIds);
        }
      } else {
        clearSelection();
      }
    },
    [selectNode, selectMultiple, clearSelection]
  );

  // Handle node drop from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      // Calculate position
      const reactFlowBounds = (event.target as HTMLElement)
        .getBoundingClientRect()
        .closest('.react-flow');

      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.getBoundingClientRect().left,
        y: event.clientY - reactFlowBounds.getBoundingClientRect().top,
      };

      // Create new node
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: {
          label: `${type} node`,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      addNode(newNode);
    },
    [setNodes, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Node types registration
  const nodeTypesObject = useMemo(() => nodeTypes, []);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar - 顶部工具栏 */}
      <Toolbar />

      {/* Canvas - 画布区域 */}
      <div
        className={cn('flex-1 w-full bg-background', className)}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypesObject}
          fitView
          attributionPosition="bottom-left"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color="hsl(var(--border))"
          />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'start':
                  return '#10b981';
                case 'end':
                  return '#ef4444';
                case 'subAgent':
                  return '#3b82f6';
                case 'mcp':
                  return '#8b5cf6';
                case 'skill':
                  return '#ec4899';
                default:
                  return '#64748b';
              }
            }}
            maskColor="hsl(var(--muted) / 0.5)"
          />

          {/* Empty state when no workflow is active */}
          {!activeWorkflow && (
            <Panel position="top-center">
              <div className="bg-background border rounded-lg p-6 shadow-lg max-w-md text-center">
                <h3 className="text-lg font-semibold mb-2">
                  No workflow selected
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a new workflow or select an existing one to start
                  designing
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

/**
 * WorkflowCanvas Component (Export)
 *
 * Wrapped with ReactFlowProvider for context
 */
const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;
