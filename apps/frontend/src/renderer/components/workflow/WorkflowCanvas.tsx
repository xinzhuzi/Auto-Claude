/**
 * WorkflowCanvas Component
 *
 * React Flow canvas for visual workflow editing
 * Part of cc-wf-studio integration
 */

import React, { useCallback, useMemo, useRef } from 'react';
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
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore, useActiveWorkflow } from '../../stores/workflow-store';
import { cn } from '../../lib/utils';
import nodeTypes from './node-types';
import { getNodeDefaults, generateNodeId } from './node-defaults';

interface WorkflowCanvasProps {
  className?: string;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ className }) => {
  const activeWorkflow = useActiveWorkflow();
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Convert workflow nodes and edges to ReactFlow format
  const initialNodes: Node[] = useMemo(() => {
    if (!activeWorkflow?.nodes) return [];
    return activeWorkflow.nodes.map(node => ({
      id: node.id,
      type: node.type || 'default',
      position: node.position || { x: 0, y: 0 },
      data: node.data || {},
    }));
  }, [activeWorkflow]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!activeWorkflow?.connections) return [];
    return activeWorkflow.connections.map(conn => ({
      id: conn.id,
      source: conn.from,
      target: conn.to,
      animated: true,
    }));
  }, [activeWorkflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync with workflow updates
  React.useEffect(() => {
    if (activeWorkflow) {
      const newNodes = activeWorkflow.nodes.map(node => ({
        id: node.id,
        type: node.type || 'default',
        position: node.position || { x: 0, y: 0 },
        data: node.data || {},
      }));
      const newEdges = activeWorkflow.connections.map(conn => ({
        id: conn.id,
        source: conn.from,
        target: conn.to,
        animated: true,
      }));
      setNodes(newNodes);
      setEdges(newEdges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkflow]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!activeWorkflow || !reactFlowWrapper.current) return;

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      // Get the position where the node was dropped
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Generate new node
      const newNodeId = generateNodeId(nodeType);
      const newNode: any = {
        id: newNodeId,
        name: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: getNodeDefaults(nodeType),
      };

      // Add node to workflow
      const updatedWorkflow = {
        ...activeWorkflow,
        nodes: [...activeWorkflow.nodes, newNode],
      };

      // Save to store
      saveWorkflow(updatedWorkflow);
    },
    [activeWorkflow, saveWorkflow, screenToFlowPosition]
  );

  return (
    <div ref={reactFlowWrapper} className={cn("h-full w-full bg-background", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        className="workflow-canvas"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={16} />
      </ReactFlow>
    </div>
  );
};

// Wrap with ReactFlowProvider
const WorkflowCanvasWithProvider: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvasWithProvider;
