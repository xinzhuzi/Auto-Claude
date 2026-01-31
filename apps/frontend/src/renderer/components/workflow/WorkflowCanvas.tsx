/**
 * WorkflowCanvas Component
 *
 * React Flow canvas for visual workflow editing
 * Part of cc-wf-studio integration
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore, useActiveWorkflow } from '../../stores/workflow-store';
import { cn } from '../../lib/utils';
import nodeTypesConfig from './node-types';
import { getNodeDefaults, generateNodeId } from './node-defaults';
import { McpNodeDialog, McpNodeEditDialog } from './mcp';
import { SubAgentDialog } from './SubAgentDialog';
import { NodeContextMenu } from './NodeContextMenu';

// Memoize nodeTypes at module level to prevent React Flow warning #002
const memoizedNodeTypes = nodeTypesConfig;

interface WorkflowCanvasProps {
  className?: string;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ className }) => {
  const activeWorkflow = useActiveWorkflow();
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Track if we're doing an internal update to avoid re-sync loop
  const isInternalUpdate = useRef(false);
  // Track the last workflow ID to detect workflow switches
  const lastWorkflowId = useRef<string | null>(null);

  // Dialog states
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [mcpEditDialogOpen, setMcpEditDialogOpen] = useState(false);
  const [editingNodeData, setEditingNodeData] = useState<any>(null);
  const [subAgentDialogOpen, setSubAgentDialogOpen] = useState(false);
  const [editingSubAgentData, setEditingSubAgentData] = useState<any>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    flowPosition: { x: number; y: number };
  } | null>(null);

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

  // Handle node changes including deletion and position updates
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // First apply changes to local state
      onNodesChange(changes);

      if (!activeWorkflow) return;

      // Handle deletions
      const removeChanges = changes.filter((c) => c.type === 'remove');
      if (removeChanges.length > 0) {
        const removedIds = removeChanges.map((c) => c.id);
        const updatedNodes = activeWorkflow.nodes.filter(
          (node) => !removedIds.includes(node.id)
        );
        const updatedConnections = activeWorkflow.connections.filter(
          (conn) => !removedIds.includes(conn.from) && !removedIds.includes(conn.to)
        );
        isInternalUpdate.current = true;
        saveWorkflow({
          ...activeWorkflow,
          nodes: updatedNodes,
          connections: updatedConnections,
        });
        return;
      }

      // Handle position changes (only when dragging ends)
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.dragging === false && c.position
      );
      if (positionChanges.length > 0) {
        const updatedNodes = activeWorkflow.nodes.map((node) => {
          const change = positionChanges.find((c) => c.id === node.id);
          if (change && change.type === 'position' && change.position) {
            return { ...node, position: change.position };
          }
          return node;
        });
        isInternalUpdate.current = true;
        saveWorkflow({
          ...activeWorkflow,
          nodes: updatedNodes,
        });
      }
    },
    [onNodesChange, activeWorkflow, saveWorkflow]
  );

  // Sync with workflow updates - only when workflow changes externally
  React.useEffect(() => {
    if (activeWorkflow) {
      // Skip if this is an internal update
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }

      // Always sync when workflow ID changes (switching workflows)
      const workflowChanged = lastWorkflowId.current !== activeWorkflow.id;
      lastWorkflowId.current = activeWorkflow.id;

      if (workflowChanged) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkflow?.id]);

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

  // Handle node double click - open MCP dialog or SubAgent dialog
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'mcp') {
        setEditingNodeData({
          nodeId: node.id,
          ...node.data,
        });
        setMcpDialogOpen(true);
      } else if (node.type === 'subAgent') {
        setEditingSubAgentData({
          nodeId: node.id,
          ...node.data,
        });
        setSubAgentDialogOpen(true);
      }
    },
    []
  );

  // Handle MCP tool selection from dialog (for new nodes or updating existing)
  const handleMcpToolSelect = useCallback(
    (serverId: string, toolName: string, config: any) => {
      if (!activeWorkflow) return;

      // Check if we're editing an existing node
      if (editingNodeData?.nodeId) {
        const updatedNodes = activeWorkflow.nodes.map((node) => {
          if (node.id === editingNodeData.nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                serverId,
                toolName,
                ...config,
                validationStatus: 'valid',
              },
            };
          }
          return node;
        });

        const updatedWorkflow = {
          ...activeWorkflow,
          nodes: updatedNodes,
        };
        saveWorkflow(updatedWorkflow);
        setEditingNodeData(null);
        return;
      }

      // Create new node
      const position = { x: 250, y: 150 };
      const newNodeId = generateNodeId('mcp');
      const newNode: any = {
        id: newNodeId,
        name: `mcp-${Date.now()}`,
        type: 'mcp',
        position,
        data: {
          serverId,
          toolName,
          ...config,
          validationStatus: 'valid',
        },
      };

      const updatedWorkflow = {
        ...activeWorkflow,
        nodes: [...activeWorkflow.nodes, newNode],
      };
      saveWorkflow(updatedWorkflow);
    },
    [activeWorkflow, saveWorkflow]
  );

  // Handle MCP node edit save
  const handleMcpEditSave = useCallback(
    (data: any) => {
      if (!activeWorkflow || !editingNodeData) return;

      const updatedNodes = activeWorkflow.nodes.map((node) => {
        if (node.id === editingNodeData.nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
        }
        return node;
      });

      const updatedWorkflow = {
        ...activeWorkflow,
        nodes: updatedNodes,
      };
      saveWorkflow(updatedWorkflow);
      setMcpEditDialogOpen(false);
      setEditingNodeData(null);
    },
    [activeWorkflow, editingNodeData, saveWorkflow]
  );

  // Handle SubAgent selection from dialog
  const handleSubAgentSelect = useCallback(
    (agent: { id: string; name: string; description: string; icon?: string }, prompt: string) => {
      if (!activeWorkflow) return;

      // Check if we're editing an existing node
      if (editingSubAgentData?.nodeId) {
        const updatedNodes = activeWorkflow.nodes.map((node) => {
          if (node.id === editingSubAgentData.nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                agentId: agent.id,
                description: agent.name,
                prompt,
                icon: agent.icon,
              },
            };
          }
          return node;
        });

        const updatedWorkflow = {
          ...activeWorkflow,
          nodes: updatedNodes,
        };
        saveWorkflow(updatedWorkflow as any);
        setEditingSubAgentData(null);
        return;
      }

      // Create new node
      const position = { x: 250, y: 150 };
      const newNodeId = generateNodeId('subAgent');
      const newNode: any = {
        id: newNodeId,
        name: `subAgent-${Date.now()}`,
        type: 'subAgent',
        position,
        data: {
          agentId: agent.id,
          description: agent.name,
          prompt,
          icon: agent.icon,
        },
      };

      const updatedWorkflow = {
        ...activeWorkflow,
        nodes: [...activeWorkflow.nodes, newNode],
      };
      saveWorkflow(updatedWorkflow as any);
    },
    [activeWorkflow, editingSubAgentData, saveWorkflow]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle right-click context menu
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        visible: true,
        position: { x: event.clientX, y: event.clientY },
        flowPosition,
      });
    },
    [screenToFlowPosition]
  );

  // Handle context menu node selection
  const handleContextMenuSelect = useCallback(
    (nodeType: string) => {
      if (!activeWorkflow || !contextMenu) return;

      const position = contextMenu.flowPosition;
      const newNodeId = generateNodeId(nodeType);
      const newNode: any = {
        id: newNodeId,
        name: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: getNodeDefaults(nodeType),
      };

      // Add to local React Flow state first
      setNodes((nds) => [...nds, {
        id: newNode.id,
        type: newNode.type,
        position: newNode.position,
        data: newNode.data,
      }]);

      // Mark as internal update to prevent re-sync
      isInternalUpdate.current = true;

      // Add node to workflow store
      const updatedWorkflow = {
        ...activeWorkflow,
        nodes: [...activeWorkflow.nodes, newNode],
      };

      // Save to store
      saveWorkflow(updatedWorkflow);
      setContextMenu(null);
    },
    [activeWorkflow, contextMenu, saveWorkflow, setNodes]
  );

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
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

      // Add to local React Flow state first
      setNodes((nds) => [...nds, {
        id: newNode.id,
        type: newNode.type,
        position: newNode.position,
        data: newNode.data,
      }]);

      // Mark as internal update to prevent re-sync
      isInternalUpdate.current = true;

      // Add node to workflow store
      const updatedWorkflow = {
        ...activeWorkflow,
        nodes: [...activeWorkflow.nodes, newNode],
      };

      // Save to store
      saveWorkflow(updatedWorkflow);
    },
    [activeWorkflow, saveWorkflow, screenToFlowPosition, setNodes]
  );

  return (
    <div ref={reactFlowWrapper} className={cn("h-full w-full bg-background", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={memoizedNodeTypes}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        className="workflow-canvas"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} />
      </ReactFlow>

      {/* Context Menu for adding nodes */}
      {contextMenu?.visible && (
        <NodeContextMenu
          position={contextMenu.position}
          onSelect={handleContextMenuSelect}
          onClose={closeContextMenu}
        />
      )}

      {/* MCP Tool Selection Dialog */}
      <McpNodeDialog
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
        onSelect={handleMcpToolSelect}
      />

      {/* MCP Node Edit Dialog */}
      {editingNodeData && (
        <McpNodeEditDialog
          open={mcpEditDialogOpen}
          onOpenChange={setMcpEditDialogOpen}
          nodeData={editingNodeData}
          onSave={handleMcpEditSave}
        />
      )}

      {/* SubAgent Selection Dialog */}
      <SubAgentDialog
        open={subAgentDialogOpen}
        onOpenChange={setSubAgentDialogOpen}
        onSelect={handleSubAgentSelect}
        initialData={editingSubAgentData ? {
          agentId: editingSubAgentData.agentId,
          prompt: editingSubAgentData.prompt,
        } : undefined}
      />
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
