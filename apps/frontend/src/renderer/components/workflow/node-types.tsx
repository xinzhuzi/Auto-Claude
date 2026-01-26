/**
 * Node Types Registration
 *
 * Registers all workflow node types with ReactFlow
 */

import { memo } from 'react';
import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { PromptNode } from './nodes/PromptNode';
import { SkillNode } from './nodes/SkillNode';
import { McpNode } from './nodes/McpNode';
import { SubAgentNode } from './nodes/SubAgentNode';
import { IfElseNode } from './nodes/IfElseNode';
import { SwitchNode } from './nodes/SwitchNode';
import { AskUserQuestionNode } from './nodes/AskUserQuestionNode';

// Simple placeholder for branch node (if needed)
const PlaceholderNode = memo(({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 bg-background border rounded-md min-w-32">
      <div className="text-sm font-medium">{data?.type || 'Node'}</div>
    </div>
  );
});

PlaceholderNode.displayName = 'PlaceholderNode';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  skill: SkillNode,
  mcp: McpNode,
  subAgent: SubAgentNode,
  ifElse: IfElseNode,
  switch: SwitchNode,
  askUserQuestion: AskUserQuestionNode,
  branch: PlaceholderNode, // Keep placeholder for branch if needed
};

export default nodeTypes;
