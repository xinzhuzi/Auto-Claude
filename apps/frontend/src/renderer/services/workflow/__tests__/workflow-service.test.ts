/**
 * Workflow Service 单元测试
 *
 * 测试覆盖：
 * - serializeWorkflow: ReactFlow状态序列化
 * - deserializeWorkflow: 工作流反序列化
 * - validateWorkflow: 工作流验证（ID、名称、节点数、Start/End、路径连通性）
 * - unwrapExportedWorkflow: 解包导出格式
 * - hasValidPath: BFS路径查找
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  serializeWorkflow,
  deserializeWorkflow,
  validateWorkflow,
  unwrapExportedWorkflow,
} from '../workflow-service';
import type { Node, Edge } from 'reactflow';

// 测试数据工厂
function createMockNode(overrides: Partial<Node> = {}): Node {
  return {
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'task',
    position: { x: 0, y: 0 },
    data: { name: 'Test Node' },
    ...overrides,
  };
}

function createMockEdge(overrides: Partial<Edge> = {}): Edge {
  return {
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source: 'node-1',
    target: 'node-2',
    ...overrides,
  };
}

function createValidWorkflow(): {
  nodes: Node[];
  edges: Edge[];
} {
  const startNode = createMockNode({ id: 'start-1', type: 'start', data: { name: 'Start' } });
  const taskNode = createMockNode({ id: 'task-1', type: 'task', data: { name: 'Task1' } });
  const endNode = createMockNode({ id: 'end-1', type: 'end', data: { name: 'End' } });

  const edge1 = createMockEdge({ id: 'e1', source: 'start-1', target: 'task-1' });
  const edge2 = createMockEdge({ id: 'e2', source: 'task-1', target: 'end-1' });

  return {
    nodes: [startNode, taskNode, endNode],
    edges: [edge1, edge2],
  };
}

describe('serializeWorkflow', () => {
  it('应该将 ReactFlow 节点和边序列化为工作流定义', () => {
    const { nodes, edges } = createValidWorkflow();

    const result = serializeWorkflow(nodes, edges, 'test-workflow', 'Test description');

    expect(result.name).toBe('test-workflow');
    expect(result.description).toBe('Test description');
    expect(result.version).toBe('1.0.0');
    expect(result.nodes).toHaveLength(3);
    expect(result.connections).toHaveLength(2);
    expect(result.id).toMatch(/^workflow-\d+$/);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('应该正确转换节点数据', () => {
    const node = createMockNode({
      id: 'custom-id',
      type: 'task',
      position: { x: 100, y: 200 },
      data: { name: 'Custom Task', foo: 'bar' },
    });

    const result = serializeWorkflow([node], [], 'test');

    expect(result.nodes[0]).toEqual({
      id: 'custom-id',
      type: 'task',
      name: 'Custom Task',
      position: { x: 100, y: 200 },
      data: { name: 'Custom Task', foo: 'bar' },
    });
  });

  it('应该使用节点 ID 作为默认名称', () => {
    const node = createMockNode({
      id: 'node-no-name',
      data: {}, // 没有 name
    });

    const result = serializeWorkflow([node], [], 'test');

    expect(result.nodes[0].name).toBe('node-no-name');
  });

  it('应该正确转换边数据（包含 handle）', () => {
    const edge = createMockEdge({
      id: 'e1',
      source: 'node-a',
      target: 'node-b',
      sourceHandle: 'output-1',
      targetHandle: 'input-1',
    });

    const result = serializeWorkflow([], [edge], 'test');

    expect(result.connections[0]).toEqual({
      id: 'e1',
      from: 'node-a',
      to: 'node-b',
      fromPort: 'output-1',
      toPort: 'input-1',
    });
  });

  it('应该为没有 handle 的边设置默认 port', () => {
    const edge = createMockEdge({
      id: 'e1',
      source: 'node-a',
      target: 'node-b',
      // 没有 sourceHandle 和 targetHandle
    });

    const result = serializeWorkflow([], [edge], 'test');

    expect(result.connections[0].fromPort).toBe('output');
    expect(result.connections[0].toPort).toBe('input');
  });

  it('应该支持空描述', () => {
    const { nodes, edges } = createValidWorkflow();

    const result = serializeWorkflow(nodes, edges, 'test');

    expect(result.description).toBe('');
  });
});

describe('deserializeWorkflow', () => {
  it('应该将工作流定义反序列化为 ReactFlow 状态', () => {
    const workflow = {
      id: 'test-wf',
      name: 'Test',
      version: '1.0.0',
      nodes: [
        { id: 'n1', type: 'start', name: 'Start', position: { x: 0, y: 0 }, data: {} },
        { id: 'n2', type: 'end', name: 'End', position: { x: 100, y: 0 }, data: {} },
      ],
      connections: [
        { id: 'c1', from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = deserializeWorkflow(workflow);

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0]).toEqual({
      id: 'n1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: {},
    });
    expect(result.edges[0]).toEqual({
      id: 'c1',
      source: 'n1',
      target: 'n2',
      sourceHandle: 'out',
      targetHandle: 'in',
    });
  });

  it('应该正确处理空工作流', () => {
    const workflow = {
      id: 'empty',
      name: 'Empty',
      version: '1.0.0',
      nodes: [],
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = deserializeWorkflow(workflow);

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});

describe('validateWorkflow', () => {
  describe('ID 验证', () => {
    it('应该拒绝空 ID', () => {
      const workflow: any = {
        id: '',
        name: 'Test',
        nodes: [],
        connections: [],
      };

      const result = validateWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('工作流ID不能为空');
    });

    it('应该接受有效 ID', () => {
      const workflow = {
        id: 'valid-id',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 'e1', fromPort: 'o', toPort: 'i' },
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).not.toContain('工作流ID不能为空');
    });
  });

  describe('名称验证', () => {
    it('应该拒绝空名称', () => {
      const workflow = {
        id: 'test',
        name: '',
        nodes: [],
        connections: [],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('工作流名称不能为空');
    });

    it('应该拒绝只有空格的名称', () => {
      const workflow = {
        id: 'test',
        name: '   ',
        nodes: [],
        connections: [],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('工作流名称不能为空');
    });

    it('应该拒绝包含特殊字符的名称', () => {
      const workflow = {
        id: 'test',
        name: 'test@workflow',
        nodes: [],
        connections: [],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('工作流名称只能包含字母、数字、连字符和下划线');
    });

    it('应该接受有效的名称格式', () => {
      const workflow = {
        id: 'test',
        name: 'My-Test_Workflow123',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 'e1', fromPort: 'o', toPort: 'i' },
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors.some(e => e.includes('工作流名称只能包含'))).toBe(false);
    });

    it('应该拒绝超过 100 字符的名称', () => {
      const workflow = {
        id: 'test',
        name: 'a'.repeat(101),
        nodes: [],
        connections: [],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('工作流名称长度必须在1-100字符之间');
    });
  });

  describe('节点数验证', () => {
    it('应该拒绝超过 50 个节点', () => {
      const nodes = Array.from({ length: 51 }, (_, i) => ({
        id: `n${i}`,
        type: i === 0 ? 'start' : i === 50 ? 'end' : 'task',
        name: `N${i}`,
        position: { x: i * 10, y: 0 },
        data: {},
      }));

      const workflow = {
        id: 'test',
        name: 'Test',
        nodes,
        connections: [],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('工作流节点数不能超过50个');
    });

    it('应该接受 50 个或更少节点', () => {
      const nodes = [
        { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
        ...Array.from({ length: 48 }, (_, i) => ({
          id: `t${i}`,
          type: 'task',
          name: `T${i}`,
          position: { x: (i + 1) * 10, y: 0 },
          data: {},
        })),
        { id: 'e1', type: 'end', name: 'E', position: { x: 500, y: 0 }, data: {} },
      ];

      const connections = [
        { id: 'c0', from: 's1', to: 't0', fromPort: 'o', toPort: 'i' },
        ...Array.from({ length: 47 }, (_, i) => ({
          id: `c${i + 1}`,
          from: `t${i}`,
          to: `t${i + 1}`,
          fromPort: 'o',
          toPort: 'i',
        })),
        { id: 'c48', from: 't47', to: 'e1', fromPort: 'o', toPort: 'i' },
      ];

      const workflow = { id: 'test', name: 'Test', nodes, connections };

      const result = validateWorkflow(workflow);

      expect(result.errors).not.toContain('工作流节点数不能超过50个');
    });
  });

  describe('Start/End 节点验证', () => {
    it('应该要求至少一个 Start 节点', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 't1', type: 'task', name: 'Task', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'End', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('工作流必须至少有一个Start节点');
    });

    it('应该只允许一个 Start 节点', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S1', position: { x: 0, y: 0 }, data: {} },
          { id: 's2', type: 'start', name: 'S2', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('工作流只能有一个Start节点');
    });

    it('应该要求至少一个 End 节点', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('工作流必须至少有一个End节点');
    });
  });

  describe('可执行节点验证', () => {
    it('应该要求至少一个可执行节点', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [{ id: 'c1', from: 's1', to: 'e1', fromPort: 'o', toPort: 'i' }],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('工作流中没有可执行节点，请添加至少一个任务节点');
    });
  });

  describe('路径连通性验证 (BFS)', () => {
    it('应该检测到有效路径', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 'e1', fromPort: 'o', toPort: 'i' },
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).not.toContain('没有从开始到结束的有效路径，请确保节点正确连接');
    });

    it('应该检测到断开的路径', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          // 只有 s1 -> t1，没有到 e1 的连接
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('没有从开始到结束的有效路径，请确保节点正确连接');
    });

    it('应该处理多个 End 节点（任一路径可达即可）', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E1', position: { x: 0, y: 0 }, data: {} },
          { id: 'e2', type: 'end', name: 'E2', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 'e1', fromPort: 'o', toPort: 'i' },
          // e2 不可达
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).not.toContain('没有从开始到结束的有效路径，请确保节点正确连接');
    });

    it('应该处理复杂的多分支路径', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T1', position: { x: 0, y: 0 }, data: {} },
          { id: 't2', type: 'task', name: 'T2', position: { x: 0, y: 0 }, data: {} },
          { id: 't3', type: 'task', name: 'T3', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 't2', fromPort: 'o', toPort: 'i' },
          { id: 'c3', from: 't1', to: 't3', fromPort: 'o', toPort: 'i' },
          { id: 'c4', from: 't2', to: 'e1', fromPort: 'o', toPort: 'i' },
          { id: 'c5', from: 't3', to: 'e1', fromPort: 'o', toPort: 'i' },
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.valid).toBe(true);
    });

    it('应该检测到循环路径中的有效路径', () => {
      // 循环路径：s -> t1 -> t2 -> t1 -> ... -> e
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T1', position: { x: 0, y: 0 }, data: {} },
          { id: 't2', type: 'task', name: 'T2', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 't2', fromPort: 'o', toPort: 'i' },
          { id: 'c3', from: 't2', to: 't1', fromPort: 'o', toPort: 'i' }, // 循环
          { id: 'c4', from: 't2', to: 'e1', fromPort: 'o', toPort: 'i' }, // 到 end
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.valid).toBe(true);
    });
  });

  describe('单个节点验证', () => {
    it('应该拒绝空节点 ID', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: '', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: '', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 'e1', fromPort: 'o', toPort: 'i' },
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors).toContain('节点ID不能为空');
    });

    it('应该拒绝空节点名称', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: '', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'T', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 'e1', fromPort: 'o', toPort: 'i' },
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors.some(e => e.includes('的名称不能为空'))).toBe(true);
    });

    it('应该拒绝包含特殊字符的节点名称', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'Task@1', position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'End', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 'e1', fromPort: 'o', toPort: 'i' },
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors.some(e => e.includes('只能包含字母、数字、连字符和下划线'))).toBe(true);
    });

    it('应该拒绝超过 50 字符的节点名称', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [
          { id: 's1', type: 'start', name: 'S', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'a'.repeat(51), position: { x: 0, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'E', position: { x: 0, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'o', toPort: 'i' },
          { id: 'c2', from: 't1', to: 'e1', fromPort: 'o', toPort: 'i' },
        ],
      };

      const result = validateWorkflow(workflow);

      expect(result.errors.some(e => e.includes('名称长度必须在1-50字符之间'))).toBe(true);
    });
  });

  describe('完整工作流验证', () => {
    it('应该通过有效的工作流', () => {
      const workflow = {
        id: 'valid-workflow',
        name: 'Valid-Workflow_123',
        version: '1.0.0',
        nodes: [
          { id: 's1', type: 'start', name: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 't1', type: 'task', name: 'Task_1', position: { x: 100, y: 0 }, data: {} },
          { id: 'e1', type: 'end', name: 'End', position: { x: 200, y: 0 }, data: {} },
        ],
        connections: [
          { id: 'c1', from: 's1', to: 't1', fromPort: 'output', toPort: 'input' },
          { id: 'c2', from: 't1', to: 'e1', fromPort: 'output', toPort: 'input' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateWorkflow(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('unwrapExportedWorkflow', () => {
  it('应该直接返回已经是 Workflow 格式的数据', () => {
    const workflow = {
      id: 'test',
      name: 'Test',
      nodes: [{ id: 'n1', type: 'start', name: 'N', position: { x: 0, y: 0 }, data: {} }],
      connections: [],
    };

    const result = unwrapExportedWorkflow(workflow);

    expect(result).toEqual(workflow);
  });

  it('应该解包导出格式（包含 workflow 属性）', () => {
    const exportedData = {
      workflow: {
        id: 'test',
        name: 'Test',
        nodes: [{ id: 'n1', type: 'start', name: 'N', position: { x: 0, y: 0 }, data: {} }],
        connections: [],
      },
      slashCommandOptions: { foo: 'bar' },
      exportedAt: '2024-01-01',
      version: '1.0.0',
    };

    const result = unwrapExportedWorkflow(exportedData);

    expect(result.id).toBe('test');
    expect(result.name).toBe('Test');
    expect(result.slashCommandOptions).toEqual({ foo: 'bar' });
  });

  it('应该拒绝 null 输入', () => {
    expect(() => unwrapExportedWorkflow(null)).toThrow('Invalid workflow data: expected an object');
  });

  it('应该拒绝非对象输入', () => {
    expect(() => unwrapExportedWorkflow('string')).toThrow('Invalid workflow data: expected an object');
    expect(() => unwrapExportedWorkflow(123)).toThrow('Invalid workflow data: expected an object');
  });

  it('应该拒绝格式不匹配的数据', () => {
    const invalidData = { foo: 'bar' };

    expect(() => unwrapExportedWorkflow(invalidData)).toThrow('Invalid workflow format: missing nodes or connections');
  });

  it('应该拒绝 nodes 不是数组的情况', () => {
    const invalidData = {
      workflow: {
        id: 'test',
        name: 'Test',
        nodes: 'not-array',
        connections: [],
      },
    };

    expect(() => unwrapExportedWorkflow(invalidData)).toThrow('Invalid workflow format: nodes must be an array');
  });

  it('应该拒绝 connections 不是数组的情况', () => {
    const invalidData = {
      workflow: {
        id: 'test',
        name: 'Test',
        nodes: [],
        connections: 'not-array',
      },
    };

    expect(() => unwrapExportedWorkflow(invalidData)).toThrow('Invalid workflow format: connections must be an array');
  });
});

describe('序列化/反序列化往返测试', () => {
  it('应该正确往返转换', () => {
    const originalNodes: Node[] = [
      { id: 's1', type: 'start', position: { x: 0, y: 0 }, data: { name: 'Start' } },
      { id: 't1', type: 'task', position: { x: 100, y: 0 }, data: { name: 'Task1', config: { value: 42 } } },
      { id: 'e1', type: 'end', position: { x: 200, y: 0 }, data: { name: 'End' } },
    ];

    const originalEdges: Edge[] = [
      { id: 'e1', source: 's1', target: 't1', sourceHandle: 'out', targetHandle: 'in' },
      { id: 'e2', source: 't1', target: 'e1', sourceHandle: 'out', targetHandle: 'in' },
    ];

    // 序列化
    const workflow = serializeWorkflow(originalNodes, originalEdges, 'RoundTrip Test');

    // 反序列化
    const { nodes, edges } = deserializeWorkflow(workflow);

    // 验证节点
    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe('s1');
    expect(nodes[0].type).toBe('start');
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(nodes[1].data.config).toEqual({ value: 42 });

    // 验证边
    expect(edges).toHaveLength(2);
    expect(edges[0].source).toBe('s1');
    expect(edges[0].target).toBe('t1');
    expect(edges[0].sourceHandle).toBe('out');
    expect(edges[0].targetHandle).toBe('in');
  });
});
