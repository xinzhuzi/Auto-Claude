# cc-wf-studio 集成指南

**版本**: 2.0
**最后更新**: 2026-01-27
**用途**: 完整的端到端集成示例和最佳实践

---

## 📋 目录

1. [架构图解](#架构图解)
2. [完整迁移示例](#完整迁移示例)
3. [翻译集成](#翻译集成)
4. [状态管理](#状态管理)
5. [最佳实践](#最佳实践)

---

## 🏗️ 架构图解

### 文件结构总览

```
Auto-Claude/
├── apps/
│   ├── cc-wf-studio/                    # 源项目 (权威来源)
│   │   └── src/
│   │       ├── components/              # 组件源码
│   │       │   ├── canvas/              # 画布组件
│   │       │   ├── nodes/               # 节点组件
│   │       │   ├── toolbar/             # 工具栏组件
│   │       │   └── dialogs/             # 对话框组件
│   │       ├── i18n/
│   │       │   └── locales/             # 翻译文件 (权威来源!)
│   │       │       ├── en/workflowStudio.json
│   │       │       ├── fr/workflowStudio.json
│   │       │       └── zh-CN/workflowStudio.json
│   │       ├── services/                # 服务层
│   │       ├── stores/                  # 状态管理
│   │       └── types/                   # 类型定义
│   │
│   └── frontend/                        # 目标项目
│       └── src/
│           ├── renderer/
│           │   ├── components/
│           │   │   ├── workflow/        # 迁移后的组件
│           │   │   │   ├── nodes/
│           │   │   │   ├── dialogs/
│           │   │   │   ├── common/
│           │   │   │   ├── mcp/
│           │   │   │   ├── chat/
│           │   │   │   ├── toolbar/
│           │   │   │   └── mode-selection/
│           │   │   └── ui/              # 基础 UI 组件
│           │   └── lib/
│           │       └── browser-mock.ts  # IPC Mock
│           └── shared/
│               └── i18n/
│                   └── index.ts         # 翻译配置 (导入 cc-wf-studio)
```

### 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户界面                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ NodePalette │  │WorkflowCanvas│  │PropertyPanel│             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                          ▼                                      │
│                  ┌───────────────┐                              │
│                  │ Zustand Store │                              │
│                  │ (workflow-store)│                            │
│                  └───────┬───────┘                              │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Electron IPC                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ window.electronAPI.invoke('workflow:save', data)            ││
│  │ window.electronAPI.invoke('workflow:execute', id)           ││
│  │ window.electronAPI.invoke('workflow:load', path)            ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Python Backend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ executor.py │  │mcp_invoker.py│  │ai_generator.py│           │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📝 完整迁移示例

### 示例: 迁移一个新节点组件

假设 cc-wf-studio 新增了 `TimerNode` 节点，以下是完整迁移步骤:

#### 步骤 1: 复制组件文件

```bash
# 复制节点组件
cp apps/cc-wf-studio/src/components/nodes/TimerNode.tsx \
   apps/frontend/src/renderer/components/workflow/nodes/
```

#### 步骤 2: 修改导入路径

```typescript
// apps/frontend/src/renderer/components/workflow/nodes/TimerNode.tsx

// 修改前 (cc-wf-studio)
import { useTranslation } from 'react-i18next';
import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// 修改后 (Auto-Claude)
import { useTranslation } from 'react-i18next';
import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';  // 相对路径

export function TimerNode({ data, selected }: NodeProps) {
  const { t } = useTranslation('workflowStudio');
  
  return (
    <div className={cn(
      'px-4 py-2 shadow-md rounded-md bg-white border-2',
      selected ? 'border-blue-500' : 'border-gray-200'
    )}>
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span>{t('nodes.timer.label')}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

#### 步骤 3: 添加翻译 (在 cc-wf-studio 中)

```json
// apps/cc-wf-studio/src/i18n/locales/en/workflowStudio.json
{
  "nodes": {
    "timer": {
      "label": "Timer",
      "description": "Wait for a specified duration"
    }
  }
}

// apps/cc-wf-studio/src/i18n/locales/zh-CN/workflowStudio.json
{
  "nodes": {
    "timer": {
      "label": "定时器",
      "description": "等待指定的时间"
    }
  }
}
```

#### 步骤 4: 导出节点

```typescript
// apps/frontend/src/renderer/components/workflow/nodes/index.ts
export { StartNode } from './StartNode';
export { EndNode } from './EndNode';
// ... 其他节点
export { TimerNode } from './TimerNode';  // 新增
```

#### 步骤 5: 注册节点类型

```typescript
// apps/frontend/src/renderer/components/workflow/node-types.tsx
import { TimerNode } from './nodes/TimerNode';

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  // ... 其他节点
  timer: TimerNode,  // 新增
};
```

#### 步骤 6: 更新节点面板

```typescript
// apps/frontend/src/renderer/components/workflow/NodePalette.tsx
import { Clock } from 'lucide-react';

const nodeCategories = [
  {
    title: t('controlFlow'),
    nodes: [
      { type: 'ifElse', label: t('nodes.ifElse.label'), icon: GitBranch },
      { type: 'switch', label: t('nodes.switch.label'), icon: GitMerge },
      // 新增
      { type: 'timer', label: t('nodes.timer.label'), icon: Clock },
    ]
  },
];
```

#### 步骤 7: 测试

```bash
cd apps/frontend
npm run dev
# 访问 http://localhost:5173/
# 1. 打开 Workflow Studio
# 2. 检查节点面板是否显示 Timer 节点
# 3. 拖拽节点到画布
# 4. 切换语言检查翻译
```

---

## 🌍 翻译集成

### 翻译文件关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                    cc-wf-studio (权威来源)                       │
│                                                                  │
│  apps/cc-wf-studio/src/i18n/locales/                            │
│  ├── en/workflowStudio.json   ◄─────┐                           │
│  ├── fr/workflowStudio.json   ◄─────┤                           │
│  └── zh-CN/workflowStudio.json◄─────┤                           │
│                                      │                           │
└──────────────────────────────────────┼───────────────────────────┘
                                       │ import
                                       │
┌──────────────────────────────────────┼───────────────────────────┐
│                    Auto-Claude                                   │
│                                      │                           │
│  apps/frontend/src/shared/i18n/index.ts                         │
│  ┌───────────────────────────────────┴─────────────────────────┐│
│  │ import enWorkflowStudio from                                ││
│  │   '../../../../cc-wf-studio/src/i18n/locales/en/...';       ││
│  │                                                              ││
│  │ export const resources = {                                   ││
│  │   en: { workflowStudio: enWorkflowStudio },                 ││
│  │   'zh-CN': { workflowStudio: zhCnWorkflowStudio },          ││
│  │ };                                                           ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 使用翻译的正确方式

```typescript
// 组件中使用翻译
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  // 指定命名空间为 'workflowStudio'
  const { t } = useTranslation('workflowStudio');
  
  return (
    <div>
      {/* 使用翻译 key */}
      <h1>{t('nodes.timer.label')}</h1>
      <p>{t('nodes.timer.description')}</p>
      
      {/* 带参数的翻译 */}
      <span>{t('savedTo', { path: '/path/to/file' })}</span>
    </div>
  );
}
```

---

## 📦 状态管理

### Zustand Store 结构

```typescript
// apps/frontend/src/renderer/stores/workflow-store.ts

import { create } from 'zustand';
import { Node, Edge } from 'reactflow';

interface WorkflowState {
  // 状态
  workflows: Workflow[];
  activeWorkflowId: string | null;
  nodes: Node[];
  edges: Edge[];
  
  // 操作
  createWorkflow: () => void;
  updateWorkflow: (id: string, data: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  setActiveWorkflow: (id: string) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, data: any) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  activeWorkflowId: null,
  nodes: [],
  edges: [],
  
  createWorkflow: () => {
    const newWorkflow = {
      id: `workflow-${Date.now()}`,
      name: 'Untitled Workflow',
      nodes: [],
      edges: [],
    };
    set(state => ({
      workflows: [...state.workflows, newWorkflow],
      activeWorkflowId: newWorkflow.id,
    }));
  },
  
  // ... 其他方法
}));
```

### 在组件中使用 Store

```typescript
import { useWorkflowStore } from '../../stores/workflow-store';

export function WorkflowCanvas() {
  const { nodes, edges, addNode, addEdge } = useWorkflowStore();
  
  const onDrop = (event: React.DragEvent) => {
    const type = event.dataTransfer.getData('nodeType');
    const newNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: event.clientX, y: event.clientY },
      data: {},
    };
    addNode(newNode);
  };
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onDrop={onDrop}
    />
  );
}
```

---

## ✨ 最佳实践

### 1. 组件迁移原则

```
✅ DO:
- 保持组件功能不变
- 只修改导入路径
- 使用相对路径导入
- 在 cc-wf-studio 中添加翻译

❌ DON'T:
- 在 Auto-Claude 中创建 workflowStudio.json
- 修改组件核心逻辑 (除非必要)
- 使用路径别名 (@/)
- 硬编码文本 (应使用 t())
```

### 2. 翻译管理原则

```
✅ DO:
- 所有翻译 key 在 cc-wf-studio 中添加
- 使用命名空间 'workflowStudio'
- 同时更新所有语言文件

❌ DON'T:
- 在 Auto-Claude 的 locales 目录创建 workflowStudio.json
- 在组件中硬编码文本
- 只更新一种语言
```

### 3. IPC 通信原则

```
✅ DO:
- 使用 window.electronAPI.invoke()
- 在 browser-mock.ts 中添加 mock
- 处理异步错误

❌ DON'T:
- 使用 VSCode API
- 忘记添加 mock (会导致开发模式报错)
- 忽略错误处理
```

### 4. 测试原则

```
✅ DO:
- 开发模式测试 (npm run dev)
- 构建测试 (npm run build)
- 多语言测试
- 暗色模式测试

❌ DON'T:
- 只测试一种语言
- 跳过构建测试
- 忽略控制台错误
```

---

## 📊 迁移状态追踪

### 当前迁移进度

| 类别 | 总数 | 已迁移 | 进度 |
|------|------|--------|------|
| 节点组件 | 11 | 11 | 100% |
| 画布/根目录组件 | 18 | 18 | 100% |
| 工具栏组件 | 4 | 4 | 100% |
| 对话框组件 | 10 | 10 | 100% |
| 通用组件 | 15 | 15 | 100% |
| MCP 组件 | 8 | 8 | 100% |
| 聊天组件 | 7 | 7 | 100% |
| 模式选择组件 | 6 | 6 | 100% |
| **总计** | **79** | **79** | **100%** |

### 翻译支持状态

| 语言 | cc-wf-studio | Auto-Claude 导入 | 状态 |
|------|-------------|-----------------|------|
| English | ✅ | ✅ | 完成 |
| French | ✅ | ✅ | 完成 |
| 简体中文 | ✅ | ✅ | 完成 |
| 日本語 | ✅ | ❌ | 待配置 |
| 한국어 | ✅ | ❌ | 待配置 |
| 繁體中文 | ✅ | ❌ | 待配置 |

---

## 🔗 相关文档

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 迁移指南
- [AUTO_CLAUDE_MODIFICATIONS.md](./AUTO_CLAUDE_MODIFICATIONS.md) - Auto-Claude 修改指南
- [docs/中文/中文翻译完整指南.md](../中文/中文翻译完整指南.md) - 翻译指南

---

**文档维护者**: Auto-Claude Team
**最后更新**: 2026-01-27
