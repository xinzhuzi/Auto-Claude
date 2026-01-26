/**
 * Workflow Service - 工作流序列化和验证服务
 *
 * 提供ReactFlow状态与工作流定义之间的转换
 * 适配Auto-Claude的类型系统
 */

import type { Edge, Node } from 'reactflow';

// 定义本地类型，避免跨包导入问题
interface Position {
  x: number;
  y: number;
}

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: Position;
  data: any;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  createdAt: Date | string;
  updatedAt: Date | string;
  slashCommandOptions?: any;
}

/**
 * 将ReactFlow状态序列化为工作流定义
 *
 * @param nodes - ReactFlow节点
 * @param edges - ReactFlow边
 * @param workflowName - 工作流名称
 * @param workflowDescription - 工作流描述（可选）
 * @returns 工作流定义
 */
export function serializeWorkflow(
  nodes: Node[],
  edges: Edge[],
  workflowName: string,
  workflowDescription?: string
): Workflow {
  // 转换ReactFlow节点为工作流节点
  const workflowNodes: WorkflowNode[] = nodes.map((node) => ({
    id: node.id,
    type: node.type as WorkflowNode['type'],
    name: node.data.name || node.id,
    position: node.position,
    data: node.data,
  }));

  // 转换ReactFlow边为连接
  const connections: Connection[] = edges.map((edge) => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    fromPort: edge.sourceHandle || 'output',
    toPort: edge.targetHandle || 'input',
  }));

  // 创建工作流对象
  const workflow: Workflow = {
    id: `workflow-${Date.now()}`,
    name: workflowName,
    description: workflowDescription || '',
    version: '1.0.0',
    nodes: workflowNodes,
    connections,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return workflow;
}

/**
 * 将工作流定义反序列化为ReactFlow状态
 *
 * @param workflow - 工作流定义
 * @returns ReactFlow节点和边
 */
export function deserializeWorkflow(workflow: Workflow): {
  nodes: Node[];
  edges: Edge[];
} {
  // 转换工作流节点为ReactFlow节点
  const nodes: Node[] = workflow.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }));

  // 转换连接为ReactFlow边
  const edges: Edge[] = workflow.connections.map((connection) => ({
    id: connection.id,
    source: connection.from,
    target: connection.to,
    sourceHandle: connection.fromPort,
    targetHandle: connection.toPort,
  }));

  return { nodes, edges };
}

/**
 * 验证工作流定义
 *
 * @param workflow - 要验证的工作流
 * @returns 验证结果
 */
export function validateWorkflow(workflow: Workflow): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 检查必需字段
  if (!workflow.id) {
    errors.push('工作流ID不能为空');
  }

  if (!workflow.name || workflow.name.trim() === '') {
    errors.push('工作流名称不能为空');
  }

  // 验证名称格式（小写字母、数字、连字符、下划线）
  const namePattern = /^[a-z0-9_-]+$/;
  if (workflow.name && !namePattern.test(workflow.name)) {
    errors.push(
      '工作流名称只能包含小写字母、数字、连字符和下划线'
    );
  }

  // 检查名称长度（1-100字符）
  if (workflow.name && (workflow.name.length < 1 || workflow.name.length > 100)) {
    errors.push('工作流名称长度必须在1-100字符之间');
  }

  // 检查最大节点数（50）
  if (workflow.nodes && workflow.nodes.length > 50) {
    errors.push('工作流节点数不能超过50个');
  }

  // 验证节点
  if (workflow.nodes) {
    for (const node of workflow.nodes) {
      const nodeErrors = validateNode(node);
      errors.push(...nodeErrors);
    }
  }

  // 验证Start/End节点
  const startNodes = workflow.nodes.filter((n) => n.type === 'start');
  const endNodes = workflow.nodes.filter((n) => n.type === 'end');

  if (startNodes.length === 0) {
    errors.push('工作流必须至少有一个Start节点');
  }

  if (startNodes.length > 1) {
    errors.push('工作流只能有一个Start节点');
  }

  if (endNodes.length === 0) {
    errors.push('工作流必须至少有一个End节点');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证单个节点
 *
 * @param node - 要验证的节点
 * @returns 错误消息数组
 */
function validateNode(node: WorkflowNode): string[] {
  const errors: string[] = [];

  if (!node.id) {
    errors.push('节点ID不能为空');
  }

  if (!node.name || node.name.trim() === '') {
    errors.push(`节点"${node.id}"的名称不能为空`);
  }

  // 验证名称格式
  const namePattern = /^[a-zA-Z0-9_-]+$/;
  if (node.name && !namePattern.test(node.name)) {
    errors.push(
      `节点"${node.id}"的名称只能包含字母、数字、连字符和下划线`
    );
  }

  if (node.name && (node.name.length < 1 || node.name.length > 50)) {
    errors.push(`节点"${node.id}"的名称长度必须在1-50字符之间`);
  }

  return errors;
}

/**
 * 解包导出的工作流文件格式
 *
 * 导出的文件格式：
 * {
 *   workflow: { ... },
 *   slashCommandOptions: { ... },
 *   exportedAt: "...",
 *   version: "..."
 * }
 *
 * 需要提取其中的 workflow 对象
 *
 * @param data - 可能包含外层包装的工作流数据
 * @returns 解包后的工作流对象
 */
export function unwrapExportedWorkflow(data: any): Workflow {
  // 验证输入
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid workflow data: expected an object');
  }

  // 如果已经是 Workflow 格式（有 nodes 和 connections），直接返回
  if (data.nodes && data.connections) {
    return data as Workflow;
  }

  // 如果是导出格式（有 workflow 属性），提取 workflow
  if (data.workflow) {
    const workflow = data.workflow;

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      throw new Error('Invalid workflow format: nodes must be an array');
    }

    if (!workflow.connections || !Array.isArray(workflow.connections)) {
      throw new Error('Invalid workflow format: connections must be an array');
    }

    // 合并 slashCommandOptions（如果存在）
    if (data.slashCommandOptions) {
      workflow.slashCommandOptions = data.slashCommandOptions;
    }

    return workflow as Workflow;
  }

  // 格式不匹配，抛出错误
  throw new Error('Invalid workflow format: missing nodes or connections');
}
