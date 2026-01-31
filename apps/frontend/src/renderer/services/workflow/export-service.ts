/**
 * Export Service - 工作流导出服务
 *
 * 将工作流导出为 .claude/commands/*.md 格式
 * 基于原始 cc-wf-studio 的 export-service.ts
 */

import type { Workflow, WorkflowNode } from '@shared/types/workflow';

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
 * 提取提示词中的变量引用
 * 匹配 {{step_1}}, {{previous}}, {{workflow.input}} 等格式
 */
function extractVariableReferences(text: string): string[] {
  const pattern = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    matches.push(`{{${match[1]}}}`);
  }
  return [...new Set(matches)];
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
    } else if (nodeType === 'command') {
      const commandName = node.data?.commandName || 'Command';
      lines.push(`    ${nodeId}[[${escapeLabel(`/${commandName}`)}]]`);
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
 * 计算节点执行顺序（拓扑排序）
 */
function calculateExecutionOrder(workflow: Workflow): WorkflowNode[] {
  const { nodes, connections } = workflow;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // 初始化
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // 构建图
  for (const conn of connections) {
    adjacency.get(conn.from)?.push(conn.to);
    inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
  }

  // 拓扑排序
  const queue: string[] = [];
  const result: WorkflowNode[] = [];

  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) result.push(node);

    for (const next of adjacency.get(id) || []) {
      const newDegree = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDegree);
      if (newDegree === 0) queue.push(next);
    }
  }

  return result;
}

/**
 * 生成执行指令 (参考 cc-wf-studio 的实现)
 */
export function generateExecutionInstructions(workflow: Workflow): string {
  const { nodes } = workflow;
  const sections: string[] = [];

  // 计算执行顺序
  const executionOrder = calculateExecutionOrder(workflow);
  const executableNodes = executionOrder.filter((n) => n.type !== 'start' && n.type !== 'end');

  // Introduction - 更强调连续执行
  sections.push('## Workflow Execution Guide');
  sections.push('');
  sections.push('**THIS IS A MULTI-STEP WORKFLOW. YOU MUST COMPLETE ALL STEPS.**');
  sections.push('');
  sections.push('After completing EACH step, output: "✓ Step N completed. Proceeding to Step N+1..."');
  sections.push('');
  sections.push('The workflow is ONLY complete when you output: "✓ Workflow complete."');
  sections.push('');

  // 添加变量传递规则
  sections.push('### Variable Passing Rules');
  sections.push('');
  sections.push('**Track outputs from each step as variables for use in subsequent steps**:');
  sections.push('- `{{step_N}}` - Output of step N (e.g., `{{step_1}}`, `{{step_2}}`)');
  sections.push('- `{{previous}}` - Alias for the immediately previous step output');
  sections.push('');
  sections.push('**After each step**: Store result as `{{step_N}}`. If next step references variables, substitute with actual values.');
  sections.push('');

  // 添加明确的执行顺序
  if (executableNodes.length > 0) {
    sections.push('### Steps to Execute');
    sections.push('');
    for (let i = 0; i < executableNodes.length; i++) {
      const node = executableNodes[i];
      const nodeId = sanitizeNodeId(node.id);
      const nodeType = node.type as string;
      let nodeLabel = node.name || node.id;

      if (nodeType === 'prompt') {
        nodeLabel = node.data?.prompt?.split('\n')[0] || 'Prompt';
        if (nodeLabel.length > 40) nodeLabel = `${nodeLabel.substring(0, 37)}...`;
      } else if (nodeType === 'command') {
        nodeLabel = `/${node.data?.commandName || 'command'}`;
      } else if (nodeType === 'skill') {
        nodeLabel = `Skill: ${node.data?.name || 'Skill'}`;
      }

      sections.push(`**Step ${i + 1}**: ${nodeLabel}`);
      sections.push(`- Node ID: ${nodeId}`);
      sections.push(`- Type: ${nodeType}`);
      sections.push(`- After completion: Output "✓ Step ${i + 1} completed. Result: [brief summary]"`);
      sections.push(`- Store result as: \`{{step_${i + 1}}}\` for reference in later steps`);
      sections.push('');
    }
    sections.push(`**Step ${executableNodes.length + 1}**: Output "✓ Workflow complete."`);
    sections.push('');
  }

  // Node type explanations
  sections.push('### Execution Methods by Node Type');
  sections.push('');
  sections.push('- **Oval nodes (Start/End)**: Flow control markers - Start begins the workflow, End completes it');
  sections.push('- **Rectangle nodes (Prompt)**: Execute the prompt text directly as instructions');
  sections.push('- **Double-bordered nodes (/command)**: Execute slash commands using the Skill tool');
  sections.push('- **Double-bordered nodes (Skill:...)**: Execute the referenced skill');
  sections.push('- **Double-bordered nodes (MCP:...)**: Execute MCP tools with the specified parameters');
  sections.push('- **Rectangle nodes (Sub-Agent)**: Execute Sub-Agents using the Task tool');
  sections.push('- **Diamond nodes (AskUserQuestion)**: Use the AskUserQuestion tool to prompt the user');
  sections.push('- **Diamond nodes (If/Else, Switch)**: Evaluate conditions and branch accordingly');
  sections.push('');

  // Prompt node details
  const promptNodes = nodes.filter((n) => n.type === 'prompt');
  if (promptNodes.length > 0) {
    sections.push('### Prompt Node Details');
    sections.push('');
    sections.push('When you reach a Prompt node, execute the following prompt:');
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

      // 检测变量引用
      const promptText = node.data?.prompt || '';
      const variableRefs = extractVariableReferences(promptText);
      if (variableRefs.length > 0) {
        sections.push(`**Variables Referenced**: ${variableRefs.join(', ')}`);
        sections.push('');
      }
    }
  }

  // Command node details
  const commandNodes = nodes.filter((n) => n.type === 'command');
  if (commandNodes.length > 0) {
    sections.push('### Command Node Details');
    sections.push('');
    sections.push('When you reach a Command node, read and execute the referenced command file inline. Do NOT use the Skill tool - instead, read the command file and execute its instructions directly within this workflow context.');
    sections.push('');
    for (const node of commandNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const commandName = node.data?.commandName || 'command';
      const commandPath = node.data?.commandPath || `.claude/commands/${commandName}.md`;
      sections.push(`#### ${nodeId}(/${commandName})`);
      sections.push('');
      sections.push(`**Command**: \`/${commandName}\``);
      sections.push('');
      if (node.data?.description) {
        sections.push(`**Description**: ${node.data.description}`);
        sections.push('');
      }
      sections.push(`**Command File**: \`${commandPath}\``);
      sections.push('');
      sections.push('**Execution Method**: Read the command file above using the Read tool, then execute its instructions inline. After completing the command, continue to the next node in this workflow.');
      sections.push('');
    }
  }

  // Skill node details
  const skillNodes = nodes.filter((n) => n.type === 'skill');
  if (skillNodes.length > 0) {
    sections.push('### Skill Node Details');
    sections.push('');
    for (const node of skillNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const skillName = node.data?.name || node.name || 'Skill';
      sections.push(`#### ${nodeId}(${skillName})`);
      sections.push('');
      sections.push(`**Description**: ${node.data?.description || ''}`);
      sections.push('');
      sections.push(`**Scope**: ${node.data?.scope || 'project'}`);
      sections.push('');
      if (node.data?.skillPath) {
        sections.push(`**Skill Path**: \`${node.data.skillPath}\``);
        sections.push('');
      }
    }
  }

  // MCP node details
  const mcpNodes = nodes.filter((n) => n.type === 'mcp');
  if (mcpNodes.length > 0) {
    sections.push('### MCP Tool Node Details');
    sections.push('');
    for (const node of mcpNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const toolName = node.data?.toolName || 'MCP Tool';
      sections.push(`#### ${nodeId}(${toolName})`);
      sections.push('');
      sections.push(`**MCP Server**: ${node.data?.serverId || ''}`);
      sections.push('');
      sections.push(`**Tool Name**: ${toolName}`);
      sections.push('');
      if (node.data?.parameterValues && Object.keys(node.data.parameterValues).length > 0) {
        sections.push('**Parameters**:');
        for (const [key, value] of Object.entries(node.data.parameterValues)) {
          sections.push(`- \`${key}\`: ${JSON.stringify(value)}`);
        }
        sections.push('');
      }
    }
  }

  // SubAgent node details
  const subAgentNodes = nodes.filter((n) => n.type === 'subAgent');
  if (subAgentNodes.length > 0) {
    sections.push('### Sub-Agent Node Details');
    sections.push('');
    sections.push('**Execute each Sub-Agent using the Task tool**. The Task tool will spawn a specialized agent to handle the task.');
    sections.push('');
    for (const node of subAgentNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const agentName = node.data?.description || node.name || 'Sub-Agent';
      const agentType = node.data?.agentType || 'general-purpose';
      sections.push(`#### ${nodeId}(${agentName})`);
      sections.push('');
      if (node.data?.prompt) {
        // 在 prompt 前添加权限说明
        const permissionNote = 'You have permission to use: Read, Write, Edit, Bash, Glob, Grep tools. Do NOT delete any files.';
        const fullPrompt = `${permissionNote}\n\nTask:\n${node.data.prompt}`;
        sections.push('**Task Prompt** (with permissions):');
        sections.push('```');
        sections.push(fullPrompt);
        sections.push('```');
        sections.push('');
        sections.push(`**Execution**: Use Task tool with \`subagent_type: "${agentType}"\` and the prompt above (including permission note).`);
        sections.push('');
      }
    }
  }

  // AskUserQuestion node details
  const askUserQuestionNodes = nodes.filter((n) => n.type === 'askUserQuestion');
  if (askUserQuestionNodes.length > 0) {
    sections.push('### AskUserQuestion Node Details');
    sections.push('');
    sections.push('Use the AskUserQuestion tool to prompt the user:');
    sections.push('');
    for (const node of askUserQuestionNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const question = node.data?.questionText || 'Question';
      sections.push(`#### ${nodeId}(${question})`);
      sections.push('');
      sections.push(`**Question**: ${question}`);
      sections.push('');
      if (node.data?.options && node.data.options.length > 0) {
        sections.push('**Options**:');
        for (const option of node.data.options) {
          sections.push(`- **${option.label}**: ${option.description || ''}`);
        }
        sections.push('');
      }
    }
  }

  // 添加完成检查提醒
  sections.push('### Workflow Completion');
  sections.push('');
  sections.push('After completing ALL steps above, output: "✓ Workflow complete."');
  sections.push('');
  sections.push('If you have not output "✓ Workflow complete.", the workflow is NOT finished. Check the Steps to Execute section and continue from where you left off.');
  sections.push('');

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

  // 添加 allowed-tools - 如果用户配置了就用用户的，否则使用默认值
  if (workflow.slashCommandOptions?.allowedTools) {
    frontmatterLines.push(`allowed-tools: ${workflow.slashCommandOptions.allowedTools}`);
  } else {
    // 默认授权常用工具，避免执行时频繁请求权限
    frontmatterLines.push('allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task');
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
