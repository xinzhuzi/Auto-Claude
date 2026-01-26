/**
 * Node Types Export
 *
 * Central export point for all workflow node components
 * Register with ReactFlow as nodeTypes
 */

import { NodeTypes } from 'reactflow';
import StartNode from './StartNode';
import EndNode from './EndNode';
import SubAgentNode from './SubAgentNode';
import McpNode from './McpNode';
import IfElseNode from './IfElseNode';
import SwitchNode from './SwitchNode';
import AskUserQuestionNode from './AskUserQuestionNode';
import PromptNode from './PromptNode';
import SkillNode from './SkillNode';
import BranchNode from './BranchNode';
import SubAgentFlowNode from './SubAgentFlowNode';

// ReactFlow node type registration
export const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  subAgent: SubAgentNode,
  mcp: McpNode,
  ifElse: IfElseNode,
  switch: SwitchNode,
  askUserQuestion: AskUserQuestionNode,
  prompt: PromptNode,
  skill: SkillNode,
  branch: BranchNode,
  subAgentFlow: SubAgentFlowNode,
};

// Export all node components
export {
  StartNode,
  EndNode,
  SubAgentNode,
  McpNode,
  IfElseNode,
  SwitchNode,
  AskUserQuestionNode,
  PromptNode,
  SkillNode,
  BranchNode,
  SubAgentFlowNode,
};

// Re-export types for convenience
export type from 'reactflow';
