/**
 * Auto-Claude Workflow Studio - Workflow Type Definitions
 *
 * Migrated from cc-wf-studio with adaptations for Auto-Claude monorepo
 * Source: /Users/zhengbingjin/Project/Github/cc-wf-studio/src/shared/types/workflow-definition.ts
 *
 * Schema Version: 1.2.0
 * - Supports Start/End/Prompt nodes
 * - Supports SubAgentFlow nodes
 * - Supports all 12 node types
 */

// ============================================================================
// Core Enums
// ============================================================================

export enum NodeType {
  SubAgent = 'subAgent',
  AskUserQuestion = 'askUserQuestion',
  Branch = 'branch', // Legacy: kept for backward compatibility
  IfElse = 'ifElse', // New: 2-way branch exclusive
  Switch = 'switch', // New: multi-way branch exclusive
  Start = 'start',
  End = 'end',
  Prompt = 'prompt',
  Skill = 'skill', // Claude Code Skill integration
  Mcp = 'mcp', // MCP (Model Context Protocol) tool integration
  SubAgentFlow = 'subAgentFlow', // Sub-Agent Flow reference node
}

// ============================================================================
// Base Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface WorkflowMetadata {
  tags?: string[];
  author?: string;
  [key: string]: unknown;
}

/**
 * Slash Command export options
 *
 * Options that affect how the workflow is exported as a Slash Command (.md file)
 */
export type SlashCommandContext = 'default' | 'fork';

export type SlashCommandModel = 'default' | 'sonnet' | 'opus' | 'haiku' | 'inherit';

export interface SlashCommandOptions {
  /** Context mode for execution */
  context?: SlashCommandContext;
  /** Model to use for Slash Command execution */
  model?: SlashCommandModel;
  /** Hooks configuration for workflow execution */
  hooks?: WorkflowHooks;
  /** Comma-separated list of allowed tools */
  allowedTools?: string;
  /** Disable model invocation */
  disableModelInvocation?: boolean;
  /** Argument hint for auto-completion */
  argumentHint?: string;
}

// ============================================================================
// Hooks Configuration Types
// ============================================================================

export type HookType = 'PreToolUse' | 'PostToolUse' | 'Stop';

export interface HookAction {
  /** Hook type: 'command' for shell commands, 'prompt' for LLM-based (Stop only) */
  type: 'command' | 'prompt';
  /** Shell command to execute (required for type: 'command') */
  command: string;
  /** Run hook only once per session (optional) */
  once?: boolean;
}

export interface HookEntry {
  /** Tool name pattern to match (e.g., "Bash", "Edit|Write", "*") */
  matcher?: string;
  /** Array of hook actions to execute */
  hooks: HookAction[];
}

export interface WorkflowHooks {
  /** Hooks to execute before a tool is used */
  PreToolUse?: HookEntry[];
  /** Hooks to execute after a tool is used */
  PostToolUse?: HookEntry[];
  /** Hooks to execute when the agent stops */
  Stop?: HookEntry[];
}

// ============================================================================
// Node Data Types
// ============================================================================

export interface SubAgentData {
  description: string;
  prompt: string;
  tools?: string;
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'cyan';
  outputPorts?: number;
  agentId?: string;
  icon?: string;
}

export const SUB_AGENT_COLORS = {
  red: '#C33531',
  blue: '#475DE3',
  green: '#54A254',
  yellow: '#BC8D2E',
  purple: '#892CE2',
  orange: '#D2602A',
  pink: '#C33476',
  cyan: '#4E8FAF',
} as const;

export interface QuestionOption {
  id?: string;
  label: string;
  description: string;
}

export interface AskUserQuestionData {
  questionText: string;
  options: QuestionOption[];
  multiSelect?: boolean;
  useAiSuggestions?: boolean;
  outputPorts: number;
}

export interface StartNodeData {
  label?: string;
}

export interface EndNodeData {
  label?: string;
}

export interface PromptNodeData {
  label?: string;
  prompt: string;
  variables?: Record<string, string>;
}

export interface BranchCondition {
  id?: string;
  label: string;
  condition: string;
}

export interface BranchNodeData {
  branchType: 'conditional' | 'switch';
  branches: BranchCondition[];
  outputPorts: number;
}

export type IfElseCondition = BranchCondition;

export interface SwitchCondition extends BranchCondition {
  /** If true, this is the default branch (must be last, cannot be deleted or edited) */
  isDefault?: boolean;
}

export interface IfElseNodeData {
  evaluationTarget?: string;
  branches: IfElseCondition[];
  outputPorts: 2;
}

export interface SwitchNodeData {
  evaluationTarget?: string;
  branches: SwitchCondition[];
  outputPorts: number;
}

export interface SkillNodeData {
  name: string;
  description: string;
  skillPath: string;
  scope: 'user' | 'project' | 'local';
  allowedTools?: string;
  validationStatus: 'valid' | 'missing' | 'invalid';
  outputPorts: 1;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object';
  description?: string | null;
  required: boolean;
  default?: unknown;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    enum?: (string | number)[];
  };
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface SubAgentFlow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  conversationHistory?: ConversationHistory;
}

export interface SubAgentFlowNodeData {
  subAgentFlowId: string;
  label: string;
  description?: string;
  outputPorts: 1;
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  tools?: string;
  color?: keyof typeof SUB_AGENT_COLORS;
}

export interface McpNodeData {
  serverId: string;
  toolName?: string;
  toolDescription?: string;
  parameters?: ToolParameter[];
  parameterValues?: Record<string, unknown>;
  validationStatus: 'valid' | 'missing' | 'invalid';
  outputPorts: 1;
  mode?: 'manualParameterConfig' | 'aiParameterConfig' | 'aiToolSelection';
  aiParameterConfig?: {
    description: string;
    timestamp: string;
  };
  aiToolSelectionConfig?: {
    taskDescription: string;
    availableTools: string[];
    timestamp: string;
  };
  preservedManualParameterConfig?: {
    parameterValues: Record<string, unknown>;
  };
}

// ============================================================================
// Node Types
// ============================================================================

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  position: Position;
}

export interface SubAgentNode extends BaseNode {
  type: NodeType.SubAgent;
  data: SubAgentData;
}

export interface AskUserQuestionNode extends BaseNode {
  type: NodeType.AskUserQuestion;
  data: AskUserQuestionData;
}

export interface StartNode extends BaseNode {
  type: NodeType.Start;
  data: StartNodeData;
}

export interface EndNode extends BaseNode {
  type: NodeType.End;
  data: EndNodeData;
}

export interface PromptNode extends BaseNode {
  type: NodeType.Prompt;
  data: PromptNodeData;
}

export interface BranchNode extends BaseNode {
  type: NodeType.Branch;
  data: BranchNodeData;
}

export interface IfElseNode extends BaseNode {
  type: NodeType.IfElse;
  data: IfElseNodeData;
}

export interface SwitchNode extends BaseNode {
  type: NodeType.Switch;
  data: SwitchNodeData;
}

export interface SkillNode extends BaseNode {
  type: NodeType.Skill;
  data: SkillNodeData;
}

export interface McpNode extends BaseNode {
  type: NodeType.Mcp;
  data: McpNodeData;
}

export interface SubAgentFlowNode extends BaseNode {
  type: NodeType.SubAgentFlow;
  data: SubAgentFlowNodeData;
}

export type WorkflowNode =
  | SubAgentNode
  | AskUserQuestionNode
  | BranchNode
  | IfElseNode
  | SwitchNode
  | StartNode
  | EndNode
  | PromptNode
  | SkillNode
  | McpNode
  | SubAgentFlowNode;

// ============================================================================
// Connection Type
// ============================================================================

export interface Connection {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
  condition?: string;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface ConversationMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  workflowSnapshotId?: string;
  translationKey?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorCode?:
    | 'COMMAND_NOT_FOUND'
    | 'TIMEOUT'
    | 'PARSE_ERROR'
    | 'VALIDATION_ERROR'
    | 'PROHIBITED_NODE_TYPE'
    | 'UNKNOWN_ERROR';
  toolInfo?: string | null;
}

export interface ConversationHistory {
  schemaVersion: '1.0.0';
  messages: ConversationMessage[];
  currentIteration: number;
  maxIterations: 20;
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
}

// ============================================================================
// Workflow Type
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  schemaVersion?: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  createdAt: Date | string;
  updatedAt: Date | string;
  metadata?: WorkflowMetadata;
  conversationHistory?: ConversationHistory;
  subAgentFlows?: SubAgentFlow[];
  slashCommandOptions?: SlashCommandOptions;
}

// ============================================================================
// Execution Types
// ============================================================================

export interface ExecutionConfig {
  sessionId?: string;
  inputVariables?: Record<string, unknown>;
  dryRun?: boolean;
  timeout?: number;
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  config: ExecutionConfig;
  results?: Record<string, unknown>;
  error?: string;
  currentNodeId?: string;
  logs?: string[];  // Execution logs (array of log lines)
}

export interface ExecutionLog {
  nodeId: string;
  timestamp: string;
  status: 'started' | 'completed' | 'failed';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Canvas Types (ReactFlow integration)
// ============================================================================

import type { Node, Edge } from 'reactflow';

export type CanvasNode = Node<WorkflowNode['data'], string>;
export type CanvasEdge = Edge;

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

// ============================================================================
// Template Types
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>;
  tags: string[];
  author?: string;
}

// ============================================================================
// Validation Rules
// ============================================================================

export const VALIDATION_RULES = {
  WORKFLOW: {
    MAX_NODES: 50,
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 100,
    NAME_PATTERN: /^[a-z0-9_-]+$/,
    VERSION_PATTERN: /^\d+\.\d+\.\d+$/,
  },
  NODE: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 50,
    NAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  SUB_AGENT: {
    DESCRIPTION_MIN_LENGTH: 1,
    DESCRIPTION_MAX_LENGTH: 200,
    PROMPT_MIN_LENGTH: 1,
    PROMPT_MAX_LENGTH: 10000,
    OUTPUT_PORTS: 1,
  },
  ASK_USER_QUESTION: {
    QUESTION_MIN_LENGTH: 1,
    QUESTION_MAX_LENGTH: 500,
    OPTIONS_MIN_COUNT: 2,
    OPTIONS_MAX_COUNT: 4,
    OPTION_LABEL_MIN_LENGTH: 1,
    OPTION_LABEL_MAX_LENGTH: 50,
    OPTION_DESCRIPTION_MIN_LENGTH: 1,
    OPTION_DESCRIPTION_MAX_LENGTH: 200,
  },
  BRANCH: {
    CONDITION_MIN_LENGTH: 1,
    CONDITION_MAX_LENGTH: 500,
    LABEL_MIN_LENGTH: 1,
    LABEL_MAX_LENGTH: 50,
    MIN_BRANCHES: 2,
    MAX_BRANCHES: 10,
  },
  IF_ELSE: {
    CONDITION_MIN_LENGTH: 1,
    CONDITION_MAX_LENGTH: 500,
    LABEL_MIN_LENGTH: 1,
    LABEL_MAX_LENGTH: 50,
    BRANCHES: 2,
    OUTPUT_PORTS: 2,
  },
  SWITCH: {
    CONDITION_MIN_LENGTH: 1,
    CONDITION_MAX_LENGTH: 500,
    LABEL_MIN_LENGTH: 1,
    LABEL_MAX_LENGTH: 50,
    MIN_BRANCHES: 2,
    MAX_BRANCHES: 10,
  },
  SKILL: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 64,
    NAME_PATTERN: /^[a-z0-9-]+$/,
    DESCRIPTION_MIN_LENGTH: 1,
    DESCRIPTION_MAX_LENGTH: 1024,
    OUTPUT_PORTS: 1,
  },
  MCP: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 64,
    NAME_PATTERN: /^[a-z0-9-]+$/,
    SERVER_ID_MIN_LENGTH: 1,
    SERVER_ID_MAX_LENGTH: 100,
    TOOL_NAME_MIN_LENGTH: 1,
    TOOL_NAME_MAX_LENGTH: 200,
    TOOL_DESCRIPTION_MAX_LENGTH: 2048,
    OUTPUT_PORTS: 1,
  },
  SUB_AGENT_FLOW: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 50,
    NAME_PATTERN: /^[a-z0-9_-]+$/,
    DESCRIPTION_MAX_LENGTH: 200,
    MAX_NODES: 30,
    LABEL_MIN_LENGTH: 1,
    LABEL_MAX_LENGTH: 50,
    OUTPUT_PORTS: 1,
  },
  HOOKS: {
    COMMAND_MIN_LENGTH: 1,
    COMMAND_MAX_LENGTH: 2000,
    MATCHER_MAX_LENGTH: 200,
    MAX_ENTRIES_PER_HOOK: 10,
    MAX_ACTIONS_PER_ENTRY: 5,
  },
} as const;
