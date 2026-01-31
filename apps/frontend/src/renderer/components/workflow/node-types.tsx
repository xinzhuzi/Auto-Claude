/**
 * Node Types Registration
 *
 * Registers all workflow node types with ReactFlow
 * Wraps each node with delete button functionality
 *
 * IMPORTANT: nodeTypes must be defined outside of component to avoid
 * React Flow warning #002 about recreating nodeTypes on each render
 */

import React, { memo, useState, ComponentType, useCallback } from 'react';
import { NodeProps, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';
import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { PromptNode } from './nodes/PromptNode';
import { SkillNode } from './nodes/SkillNode';
import { McpNode } from './nodes/McpNode';
import { SubAgentNode } from './nodes/SubAgentNode';
import { IfElseNode } from './nodes/IfElseNode';
import { SwitchNode } from './nodes/SwitchNode';
import { AskUserQuestionNode } from './nodes/AskUserQuestionNode';
import { CommandNode } from './nodes/CommandNode';

/**
 * Delete button component for nodes (pure, no hooks)
 */
const DeleteButton: React.FC<{
  visible: boolean;
  onDelete: (e: React.MouseEvent) => void;
}> = memo(({ visible, onDelete }) => {
  if (!visible) return null;

  return (
    <button
      onClick={onDelete}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '-10px',
        right: '-10px',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        backgroundColor: '#ef4444',
        color: 'white',
        border: '2px solid white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
      title="删除节点"
    >
      <X style={{ width: '14px', height: '14px' }} />
    </button>
  );
});

DeleteButton.displayName = 'DeleteButton';

/**
 * Wrapper component that adds delete button to any node
 */
const createNodeWithDelete = <T extends NodeProps>(
  WrappedComponent: ComponentType<T>,
  displayName: string
): React.FC<T> => {
  const NodeWithDelete: React.FC<T> = memo((props: T) => {
    const { id, selected } = props;
    const [isHovered, setIsHovered] = useState(false);
    const { deleteElements } = useReactFlow();

    const handleDelete = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      deleteElements({ nodes: [{ id }] });
    }, [id, deleteElements]);

    return (
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <DeleteButton visible={selected || isHovered} onDelete={handleDelete} />
        <WrappedComponent {...props} />
      </div>
    );
  }) as React.FC<T>;

  (NodeWithDelete as any).displayName = `NodeWithDelete(${displayName})`;
  return NodeWithDelete;
};

// Simple placeholder for branch node (if needed)
const PlaceholderNode = memo(({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 bg-background border rounded-md min-w-32">
      <div className="text-sm font-medium">{data?.type || 'Node'}</div>
    </div>
  );
});

PlaceholderNode.displayName = 'PlaceholderNode';

// Create wrapped node components ONCE at module level (not inside any component)
const WrappedStartNode = createNodeWithDelete(StartNode, 'StartNode');
const WrappedEndNode = createNodeWithDelete(EndNode, 'EndNode');
const WrappedPromptNode = createNodeWithDelete(PromptNode, 'PromptNode');
const WrappedSkillNode = createNodeWithDelete(SkillNode, 'SkillNode');
const WrappedMcpNode = createNodeWithDelete(McpNode, 'McpNode');
const WrappedSubAgentNode = createNodeWithDelete(SubAgentNode, 'SubAgentNode');
const WrappedIfElseNode = createNodeWithDelete(IfElseNode, 'IfElseNode');
const WrappedSwitchNode = createNodeWithDelete(SwitchNode, 'SwitchNode');
const WrappedAskUserQuestionNode = createNodeWithDelete(AskUserQuestionNode, 'AskUserQuestionNode');
const WrappedCommandNode = createNodeWithDelete(CommandNode, 'CommandNode');
const WrappedPlaceholderNode = createNodeWithDelete(PlaceholderNode, 'PlaceholderNode');

// Define nodeTypes object ONCE at module level
const nodeTypes = {
  start: WrappedStartNode,
  end: WrappedEndNode,
  prompt: WrappedPromptNode,
  skill: WrappedSkillNode,
  mcp: WrappedMcpNode,
  subAgent: WrappedSubAgentNode,
  ifElse: WrappedIfElseNode,
  switch: WrappedSwitchNode,
  askUserQuestion: WrappedAskUserQuestionNode,
  command: WrappedCommandNode,
  branch: WrappedPlaceholderNode,
} as const;

export default nodeTypes;
