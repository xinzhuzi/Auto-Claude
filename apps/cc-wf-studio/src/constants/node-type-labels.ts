/**
 * 节点类型标签
 *
 * 用于 PropertyOverlay 的节点类型标签。
 * 这些是技术术语，不需要翻译，在所有语言中保持一致。
 */

export const NODE_TYPE_LABELS: Record<string, string> = {
  subAgent: 'Sub-Agent',
  subAgentFlow: 'Sub-Agent Flow',
  askUserQuestion: 'Ask User Question',
  branch: 'Branch',
  ifElse: 'If/Else',
  switch: 'Switch',
  prompt: 'Prompt',
  start: 'Start',
  end: 'End',
  skill: 'Skill',
  mcp: 'MCP Tool',
} as const;

export const NODE_TYPE_UNKNOWN = 'Unknown';

/**
 * 获取节点类型的标签
 * @param nodeType - 节点类型字符串（可以是 undefined）
 * @returns 节点类型的标签，如果未找到则返回 'Unknown'
 */
export const getNodeTypeLabel = (nodeType: string | undefined): string => {
  if (!nodeType) return NODE_TYPE_UNKNOWN;
  return NODE_TYPE_LABELS[nodeType] ?? NODE_TYPE_UNKNOWN;
};
