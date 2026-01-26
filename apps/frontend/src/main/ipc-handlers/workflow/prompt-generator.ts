/**
 * Workflow Prompt Generator
 *
 * Converts workflow nodes into a prompt that Claude can understand and execute.
 */

import type { Workflow, WorkflowNode, Connection } from '../../../shared/types/workflow';

/**
 * Generate a prompt from a workflow that Claude can execute
 */
export function generateWorkflowPrompt(workflow: Workflow): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Workflow Execution: ${workflow.name}`);
  sections.push('');

  if (workflow.description) {
    sections.push(`## Description`);
    sections.push(workflow.description);
    sections.push('');
  }

  // Get execution order
  const orderedNodes = getTopologicalOrder(workflow.nodes, workflow.connections);

  // Generate execution instructions
  sections.push('## Execution Instructions');
  sections.push('');
  sections.push('Execute the following steps in order. For each step, complete the task before moving to the next.');
  sections.push('');

  let stepNumber = 1;
  for (const node of orderedNodes) {
    const instruction = generateNodeInstruction(node, stepNumber);
    if (instruction) {
      sections.push(instruction);
      sections.push('');
      stepNumber++;
    }
  }

  // Footer
  sections.push('---');
  sections.push('');
  sections.push('After completing all steps, provide a summary of what was accomplished.');

  return sections.join('\n');
}

/**
 * Get nodes in topological order (respecting connections)
 */
function getTopologicalOrder(nodes: WorkflowNode[], connections: Connection[]): WorkflowNode[] {
  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // Build graph
  for (const conn of connections) {
    const fromList = adjacency.get(conn.from) || [];
    fromList.push(conn.to);
    adjacency.set(conn.from, fromList);

    const currentDegree = inDegree.get(conn.to) || 0;
    inDegree.set(conn.to, currentDegree + 1);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  const result: WorkflowNode[] = [];

  // Find nodes with no incoming edges (start nodes)
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      result.push(node);
    }

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

/**
 * Generate instruction for a single node
 */
function generateNodeInstruction(node: WorkflowNode, stepNumber: number): string | null {
  const nodeType = node.type;
  const data = node.data || {};

  switch (nodeType) {
    case 'start':
      return `### Step ${stepNumber}: Start\nBegin workflow execution.`;

    case 'end':
      return `### Step ${stepNumber}: End\nWorkflow execution complete.`;

    case 'prompt':
      return generatePromptNodeInstruction(node, stepNumber, data);

    case 'skill':
      return generateSkillNodeInstruction(node, stepNumber, data);

    case 'subAgent':
      return generateSubAgentNodeInstruction(node, stepNumber, data);

    case 'mcp':
      return generateMcpNodeInstruction(node, stepNumber, data);

    case 'askUserQuestion':
      return generateAskUserNodeInstruction(node, stepNumber, data);

    case 'ifElse':
    case 'branch':
    case 'switch':
      return generateConditionalNodeInstruction(node, stepNumber, data);

    default:
      return `### Step ${stepNumber}: ${node.name || nodeType}\nExecute node: ${node.name || node.id}`;
  }
}

/**
 * Generate instruction for prompt node
 */
function generatePromptNodeInstruction(node: WorkflowNode, stepNumber: number, data: any): string {
  const prompt = data.prompt || data.content || '';
  const name = node.name || 'Prompt';

  return `### Step ${stepNumber}: ${name}

Execute the following prompt:

\`\`\`
${prompt}
\`\`\``;
}

/**
 * Generate instruction for skill node
 */
function generateSkillNodeInstruction(node: WorkflowNode, stepNumber: number, data: any): string {
  const skillName = data.skillName || data.skill || node.name || 'Unknown Skill';
  const skillPath = data.skillPath || `/${skillName}`;
  const description = data.description || '';

  let instruction = `### Step ${stepNumber}: Execute Skill - ${skillName}

Invoke the Claude Code skill: \`${skillPath}\``;

  if (description) {
    instruction += `\n\nDescription: ${description}`;
  }

  if (data.parameters) {
    instruction += `\n\nParameters:\n\`\`\`json\n${JSON.stringify(data.parameters, null, 2)}\n\`\`\``;
  }

  return instruction;
}

/**
 * Generate instruction for sub-agent node
 */
function generateSubAgentNodeInstruction(node: WorkflowNode, stepNumber: number, data: any): string {
  const agentName = data.agentName || node.name || 'Sub-Agent';
  const prompt = data.prompt || data.task || '';
  const model = data.model || 'default';

  let instruction = `### Step ${stepNumber}: Sub-Agent Task - ${agentName}

Create a sub-task with the following instructions:

\`\`\`
${prompt}
\`\`\``;

  if (model !== 'default') {
    instruction += `\n\nModel: ${model}`;
  }

  return instruction;
}

/**
 * Generate instruction for MCP tool node
 */
function generateMcpNodeInstruction(node: WorkflowNode, stepNumber: number, data: any): string {
  const toolName = data.toolName || data.tool || node.name || 'MCP Tool';
  const serverName = data.serverName || data.server || '';

  let instruction = `### Step ${stepNumber}: MCP Tool - ${toolName}`;

  if (serverName) {
    instruction += `\n\nServer: ${serverName}`;
  }

  if (data.parameters) {
    instruction += `\n\nParameters:\n\`\`\`json\n${JSON.stringify(data.parameters, null, 2)}\n\`\`\``;
  }

  return instruction;
}

/**
 * Generate instruction for ask user question node
 */
function generateAskUserNodeInstruction(node: WorkflowNode, stepNumber: number, data: any): string {
  const question = data.question || data.prompt || 'Please provide input';
  const options = data.options || [];

  let instruction = `### Step ${stepNumber}: User Input Required

Ask the user: "${question}"`;

  if (options.length > 0) {
    instruction += '\n\nOptions:';
    for (const option of options) {
      instruction += `\n- ${option.label || option}`;
    }
  }

  return instruction;
}

/**
 * Generate instruction for conditional node
 */
function generateConditionalNodeInstruction(node: WorkflowNode, stepNumber: number, data: any): string {
  const condition = data.condition || data.expression || '';
  const name = node.name || 'Conditional Branch';

  let instruction = `### Step ${stepNumber}: ${name}

Evaluate the following condition and proceed accordingly:

\`\`\`
${condition}
\`\`\``;

  if (data.branches) {
    instruction += '\n\nBranches:';
    for (const branch of data.branches) {
      instruction += `\n- ${branch.label || branch.name}: ${branch.condition || 'default'}`;
    }
  }

  return instruction;
}

/**
 * Generate a simple prompt for basic workflow execution
 */
export function generateSimplePrompt(workflow: Workflow): string {
  const promptNodes = workflow.nodes.filter(n => n.type === 'prompt');

  if (promptNodes.length === 0) {
    return `Execute workflow: ${workflow.name}\n\n${workflow.description || 'No specific instructions provided.'}`;
  }

  // Combine all prompt nodes
  const prompts = promptNodes.map(n => (n.data as any)?.prompt || (n.data as any)?.content || '').filter(Boolean);

  return prompts.join('\n\n---\n\n');
}
