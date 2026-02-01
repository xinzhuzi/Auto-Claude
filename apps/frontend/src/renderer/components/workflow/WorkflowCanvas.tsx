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
import { useProjectStore } from '../../stores/project-store';
import { cn } from '../../lib/utils';
import nodeTypesConfig from './node-types';
import { getNodeDefaults, generateNodeId } from './node-defaults';
import { McpNodeDialog, McpNodeEditDialog } from './mcp';
import { SubAgentDialog } from './SubAgentDialog';
import { CommandBrowserDialog } from './CommandBrowserDialog';
import { NodeContextMenu } from './NodeContextMenu';

// Memoize nodeTypes at module level to prevent React Flow warning #002
const memoizedNodeTypes = nodeTypesConfig;

interface WorkflowCanvasProps {
  className?: string;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ className }) => {
  const activeWorkflow = useActiveWorkflow();
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const saveWorkflowToStore = useWorkflowStore((state) => state.saveWorkflow);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Get project path
  const activeProject = useProjectStore((state) => state.getActiveProject());
  const projectPath = activeProject?.path || null;

  // Save workflow to both store and project directory
  const saveWorkflow = useCallback(async (workflow: any) => {
    // Save to store
    await saveWorkflowToStore(workflow);

    // Also save to project directory if available
    if (projectPath) {
      try {
        await window.electronAPI.workflow.saveWorkflowToProject(workflow, projectPath);
      } catch (error) {
        console.error('Failed to save workflow to project:', error);
      }
    }
  }, [saveWorkflowToStore, projectPath]);

  // Track if we're doing an internal update to avoid re-sync loop
  const isInternalUpdate = useRef(false);
  // Track the last workflow ID to detect workflow switches
  const lastWorkflowId = useRef<string | null>(null);
  // Track mounted state to prevent state updates after unmount - Fix #2
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Dialog states
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [mcpEditDialogOpen, setMcpEditDialogOpen] = useState(false);
  const [editingNodeData, setEditingNodeData] = useState<any>(null);
  const [subAgentDialogOpen, setSubAgentDialogOpen] = useState(false);
  const [editingSubAgentData, setEditingSubAgentData] = useState<any>(null);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [editingCommandData, setEditingCommandData] = useState<any>(null);

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
        // Defer save to avoid updating state during render
        setTimeout(() => {
          if (!isMountedRef.current) return; // Fix #2: check mounted
          isInternalUpdate.current = true;
          saveWorkflow({
            ...activeWorkflow,
            nodes: updatedNodes,
            connections: updatedConnections,
          });
        }, 0);
        return;
      }

      // Handle position changes (only when dragging ends)
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.dragging === false
      );
      if (positionChanges.length > 0) {
        // Fix #8: Capture workflow in closure to avoid null access
        const workflow = activeWorkflow;
        // Defer save to avoid updating state during render
        setTimeout(() => {
          if (!isMountedRef.current || !workflow) return; // Fix #2 & #8: check mounted and null
          setNodes((currentNodes) => {
            const updatedWorkflowNodes = workflow.nodes.map((node) => {
              const currentNode = currentNodes.find((n) => n.id === node.id);
              if (currentNode && currentNode.position) {
                return { ...node, position: currentNode.position };
              }
              return node;
            });

            // Save with updated positions
            isInternalUpdate.current = true;
            saveWorkflow({
              ...workflow,
              nodes: updatedWorkflowNodes,
            });

            return currentNodes; // Don't modify React Flow state
          });
        }, 0);
      }
    },
    [onNodesChange, activeWorkflow, saveWorkflow]
  );

  // Handle edge changes including deletion
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // First apply changes to local state
      onEdgesChange(changes);

      if (!activeWorkflow) return;

      // Handle deletions
      const removeChanges = changes.filter((c) => c.type === 'remove');
      if (removeChanges.length > 0) {
        const removedIds = removeChanges.map((c) => c.id);
        const updatedConnections = activeWorkflow.connections.filter(
          (conn) => !removedIds.includes(conn.id)
        );

        // Defer save to avoid updating state during render
        setTimeout(() => {
          if (!isMountedRef.current) return; // Fix #2: check mounted
          isInternalUpdate.current = true;
          saveWorkflow({
            ...activeWorkflow,
            connections: updatedConnections,
          });
        }, 0);
      }
    },
    [onEdgesChange, activeWorkflow, saveWorkflow]
  );

  // Track the last workflow version to detect full reloads
  const lastWorkflowVersion = useRef<string | null>(null);

  // Sync with workflow updates - when workflow changes or node data updates
  // Use setTimeout to defer state updates and avoid "Cannot update component while rendering" error
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (activeWorkflow) {
      // Skip if this is an internal update
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }

      // Create a version string that includes node data hash to detect property changes
      const nodesDataHash = activeWorkflow.nodes.map(n => JSON.stringify(n.data)).join('|');
      const currentVersion = `${activeWorkflow.id}-${activeWorkflow.updatedAt}-${activeWorkflow.nodes.length}-${activeWorkflow.connections.length}-${nodesDataHash}`;
      const workflowChanged = lastWorkflowId.current !== activeWorkflow.id;
      const versionChanged = lastWorkflowVersion.current !== currentVersion;

      lastWorkflowId.current = activeWorkflow.id;
      lastWorkflowVersion.current = currentVersion;

      // Full sync when workflow ID changes or version changes (including node data changes)
      if (workflowChanged || versionChanged) {
        // Defer state update to next tick to avoid updating during render
        timeoutId = setTimeout(() => {
          if (!isMountedRef.current) return; // Fix #2: check mounted
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
        }, 0);
      }
    }
    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkflow]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!activeWorkflow || !connection.source || !connection.target) return;

      // Add to local React Flow state
      setEdges((eds) => addEdge(connection, eds));

      // Create new connection for store
      const newConnection = {
        id: `edge-${Date.now()}`,
        from: connection.source,
        to: connection.target,
        fromPort: connection.sourceHandle || 'output',
        toPort: connection.targetHandle || 'input',
      };

      // Save to store with updated connections
      const updatedWorkflow = {
        ...activeWorkflow,
        connections: [...activeWorkflow.connections, newConnection],
      };

      // Defer save to avoid updating state during render
      setTimeout(() => {
        if (!isMountedRef.current) return; // Fix #2: check mounted
        isInternalUpdate.current = true;
        saveWorkflow(updatedWorkflow);
      }, 0);
    },
    [activeWorkflow, saveWorkflow, setEdges]
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
      console.log('[WorkflowCanvas] onNodeDoubleClick called:', node.type, node.id);
      if (node.type === 'mcp') {
        setEditingNodeData({
          nodeId: node.id,
          ...node.data,
        });
        setMcpDialogOpen(true);
        console.log('[WorkflowCanvas] Opening MCP dialog for node:', node.id);
      } else if (node.type === 'subAgent') {
        setEditingSubAgentData({
          nodeId: node.id,
          ...node.data,
        });
        setSubAgentDialogOpen(true);
        console.log('[WorkflowCanvas] Opening SubAgent dialog for node:', node.id);
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
    [activeWorkflow, saveWorkflow, editingNodeData]
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

  // Handle Command selection from dialog
  const handleCommandSelect = useCallback(
    (command: { name: string; description: string; commandPath: string; validationStatus: 'valid' | 'missing' | 'invalid' }) => {
      if (!activeWorkflow) return;

      // Check if we're editing an existing node
      if (editingCommandData?.nodeId) {
        const updatedNodes = activeWorkflow.nodes.map((node) => {
          if (node.id === editingCommandData.nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                commandName: command.name,
                commandPath: command.commandPath,
                description: command.description,
                validationStatus: command.validationStatus,
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
        setEditingCommandData(null);
        return;
      }

      // Create new node
      const position = contextMenu?.flowPosition || { x: 250, y: 150 };
      const newNodeId = generateNodeId('command');
      const newNode: any = {
        id: newNodeId,
        name: `command-${Date.now()}`,
        type: 'command',
        position,
        data: {
          commandName: command.name,
          commandPath: command.commandPath,
          description: command.description,
          validationStatus: command.validationStatus,
        },
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

      const updatedWorkflow = {
        ...activeWorkflow,
        nodes: [...activeWorkflow.nodes, newNode],
      };
      saveWorkflow(updatedWorkflow as any);
      setContextMenu(null);
    },
    [activeWorkflow, editingCommandData, contextMenu, saveWorkflow, setNodes]
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
      console.log('[WorkflowCanvas] handleContextMenuSelect called:', nodeType, { activeWorkflow: !!activeWorkflow, contextMenu });
      if (!activeWorkflow || !contextMenu) return;

      // 检查 start 和 end 节点是否已存在
      if (nodeType === 'start') {
        const hasStart = activeWorkflow.nodes.some(n => n.type === 'start');
        if (hasStart) {
          console.log('[WorkflowCanvas] Start node already exists');
          setContextMenu(null);
          return;
        }
      }
      if (nodeType === 'end') {
        const hasEnd = activeWorkflow.nodes.some(n => n.type === 'end');
        if (hasEnd) {
          console.log('[WorkflowCanvas] End node already exists');
          setContextMenu(null);
          return;
        }
      }

      // For command nodes, open the command browser dialog
      if (nodeType === 'command') {
        setCommandDialogOpen(true);
        return;
      }

      // For mcp nodes, open the MCP dialog
      if (nodeType === 'mcp') {
        setMcpDialogOpen(true);
        return;
      }

      // For subAgent nodes, open the SubAgent dialog
      if (nodeType === 'subAgent') {
        setSubAgentDialogOpen(true);
        return;
      }

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
        onEdgesChange={handleEdgesChange}
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

      {/* Command Browser Dialog */}
      <CommandBrowserDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
        onSelectCommand={handleCommandSelect}
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
