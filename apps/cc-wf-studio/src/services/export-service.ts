/**
 * Export Service - 工作流导出服务
 *
 * 将工作流导出为 .claude/commands/*.md 格式
 * 基于原始 cc-wf-studio 的 export-service.ts
 */

import type { Workflow, WorkflowNode } from '@frontend/src/shared/types/workflow';

/**
 * 节点名称转文件名
 */
export function nodeNameToFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

/**
 * 清理节点 ID（用于 Mermaid）
 */
function sanitizeNodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * 转义 Mermaid 标签中的特殊字符
 */
function escapeLabel(label: string): string {
  return label.replace(/"/g, '#quot;').replace(/\[/g, '#91;').replace(/\]/g, '#93;');
}

/**
 * 转义 YAML 字符串
 */
function escapeYamlString(value: string, alwaysQuote = false): string {
  if (
    alwaysQuote ||
    /[:[\]{}&*?|<>=!%@#`'",\n\r\\]/.test(value) ||
    value.startsWith(' ') ||
    value.endsWith(' ')
  ) {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/[\n\r]/g, '');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * 生成 Mermaid 流程图
 */
export function generateMermaidFlowchart(workflow: Workflow): string {
  const { nodes, connections } = workflow;
  const lines: string[] = [];

  lines.push('```mermaid');
  lines.push('flowchart TD');

  // 生成节点定义
  for (const node of nodes) {
    const nodeId = sanitizeNodeId(node.id);
    const nodeType = node.type as string;

    if (nodeType === 'start') {
      lines.push(`    ${nodeId}([Start])`);
    } else if (nodeType === 'end') {
      lines.push(`    ${nodeId}([End])`);
    } else if (nodeType === 'prompt') {
      const promptText = node.data?.prompt?.split('\n')[0] || node.name || 'Prompt';
      const label = promptText.length > 30 ? `${promptText.substring(0, 27)}...` : promptText;
      lines.push(`    ${nodeId}[${escapeLabel(label)}]`);
    } else if (nodeType === 'skill') {
      const skillName = node.data?.name || node.name || 'Skill';
      lines.push(`    ${nodeId}[[${escapeLabel(`Skill: ${skillName}`)}]]`);
    } else if (nodeType === 'mcp') {
      const mcpLabel = node.data?.toolName ? `MCP: ${node.data.toolName}` : 'MCP Tool';
      lines.push(`    ${nodeId}[[${escapeLabel(mcpLabel)}]]`);
    } else if (nodeType === 'subAgent') {
      const agentName = node.name || 'Sub-Agent';
      lines.push(`    ${nodeId}[${escapeLabel(agentName)}]`);
    } else if (nodeType === 'askUserQuestion') {
      const questionText = node.data?.questionText || 'Question';
      lines.push(`    ${nodeId}{${escapeLabel(`AskUserQuestion:<br/>${questionText}`)}}`);
    } else if (nodeType === 'ifElse' || nodeType === 'branch' || nodeType === 'switch') {
      lines.push(`    ${nodeId}{${escapeLabel('Conditional Branch')}}`);
    } else {
      // 默认节点
      lines.push(`    ${nodeId}[${escapeLabel(node.name || node.id)}]`);
    }
  }

  lines.push('');

  // 生成连接
  for (const conn of connections) {
    const fromId = sanitizeNodeId(conn.from);
    const toId = sanitizeNodeId(conn.to);
    lines.push(`    ${fromId} --> ${toId}`);
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * 生成执行指令
 */
export function generateExecutionInstructions(workflow: Workflow): string {
  const { nodes } = workflow;
  const sections: string[] = [];

  sections.push('## Workflow Execution Guide');
  sections.push('');
  sections.push('Follow the Mermaid flowchart above to execute the workflow. Each node type has specific execution methods as described below.');
  sections.push('');

  // 节点类型说明
  sections.push('### Execution Methods by Node Type');
  sections.push('');
  sections.push('- **Rectangle nodes**: Execute Sub-Agents using the Task tool');
  sections.push('- **Diamond nodes (AskUserQuestion:...)**: Use the AskUserQuestion tool to prompt the user');
  sections.push('- **Diamond nodes (Branch/Switch:...)**: Automatically branch based on previous results');
  sections.push('- **Rectangle nodes (Prompt nodes)**: Execute the prompts described below');
  sections.push('');

  // Prompt 节点详情
  const promptNodes = nodes.filter((n) => n.type === 'prompt');
  if (promptNodes.length > 0) {
    sections.push('### Prompt Node Details');
    sections.push('');
    for (const node of promptNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const label = node.data?.prompt?.split('\n')[0] || node.name || 'Prompt';
      const displayLabel = label.length > 30 ? `${label.substring(0, 27)}...` : label;
      sections.push(`#### ${nodeId}(${displayLabel})`);
      sections.push('');
      sections.push('```');
      sections.push(node.data?.prompt || '');
      sections.push('```');
      sections.push('');
    }
  }

  // Skill 节点详情
  const skillNodes = nodes.filter((n) => n.type === 'skill');
  if (skillNodes.length > 0) {
    sections.push('### Skill Nodes');
    sections.push('');
    for (const node of skillNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(${node.data?.name || node.name})`);
      sections.push('');
      sections.push(`**Description**: ${node.data?.description || ''}`);
      sections.push('');
      if (node.data?.skillPath) {
        sections.push(`**Skill Path**: \`${node.data.skillPath}\``);
        sections.push('');
      }
    }
  }

  // MCP 节点详情
  const mcpNodes = nodes.filter((n) => n.type === 'mcp');
  if (mcpNodes.length > 0) {
    sections.push('### MCP Tool Nodes');
    sections.push('');
    for (const node of mcpNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(${node.data?.toolName || 'MCP Tool'})`);
      sections.push('');
      sections.push(`**MCP Server**: ${node.data?.serverId || ''}`);
      sections.push('');
      sections.push(`**Tool Name**: ${node.data?.toolName || ''}`);
      sections.push('');
    }
  }

  return sections.join('\n');
}

/**
 * 生成 SlashCommand 文件内容
 */
export function generateSlashCommandFile(workflow: Workflow): string {
  // YAML frontmatter
  const frontmatterLines = [
    '---',
    `description: ${escapeYamlString(workflow.description || workflow.name)}`,
  ];

  // 添加可选字段
  if (workflow.slashCommandOptions?.allowedTools) {
    frontmatterLines.push(`allowed-tools: ${workflow.slashCommandOptions.allowedTools}`);
  }

  if (workflow.slashCommandOptions?.model && workflow.slashCommandOptions.model !== 'default') {
    frontmatterLines.push(`model: ${workflow.slashCommandOptions.model}`);
  }

  if (workflow.slashCommandOptions?.context && workflow.slashCommandOptions.context !== 'default') {
    frontmatterLines.push(`context: ${workflow.slashCommandOptions.context}`);
  }

  frontmatterLines.push('---', '');
  const frontmatter = frontmatterLines.join('\n');

  // Mermaid 流程图
  const mermaidFlowchart = generateMermaidFlowchart(workflow);

  // 执行指令
  const executionLogic = generateExecutionInstructions(workflow);

  return `${frontmatter}${mermaidFlowchart}\n\n${executionLogic}`;
}

/**
 * 导出工作流为 .claude/commands/*.md 格式
 */
export interface ExportResult {
  success: boolean;
  files: string[];
  error?: string;
}

export async function exportWorkflowToClaudeFormat(
  workflow: Workflow,
  projectPath: string
): Promise<ExportResult> {
  try {
    const fileName = nodeNameToFileName(workflow.name);
    const content = generateSlashCommandFile(workflow);

    // 返回文件内容，让调用者决定如何保存
    return {
      success: true,
      files: [`${fileName}.md`],
      // 附加生成的内容供下载
      content,
    } as ExportResult & { content: string };
  } catch (error) {
    return {
      success: false,
      files: [],
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}
