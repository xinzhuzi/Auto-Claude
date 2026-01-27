# Auto-Claude 修改指南

**版本**: 2.0
**最后更新**: 2026-01-27
**用途**: 记录从 cc-wf-studio 迁移功能时，Auto-Claude 需要做的修改

---

## 📋 目录

1. [必须修改的文件](#必须修改的文件)
2. [导入路径修改规则](#导入路径修改规则)
3. [翻译配置](#翻译配置)
4. [IPC 通信适配](#ipc-通信适配)
5. [组件注册](#组件注册)
6. [样式适配](#样式适配)

---

## 📝 必须修改的文件

### 迁移新组件时需要修改的文件清单

| 文件 | 修改场景 | 说明 |
|------|---------|------|
| `workflow/index.ts` | 添加任何组件 | 导出新组件 |
| `workflow/node-types.tsx` | 添加节点组件 | 注册节点类型 |
| `workflow/nodes/index.ts` | 添加节点组件 | 导出节点 |
| `shared/i18n/index.ts` | 添加新语言 | 配置翻译导入 |
| `lib/browser-mock.ts` | 添加新 IPC 调用 | Mock API |

---

## 🔧 导入路径修改规则

### 规则 1: UI 组件导入

```typescript
// cc-wf-studio 原始写法 (路径别名)
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

// Auto-Claude 修改后 (相对路径)
import { Button } from '../../ui/button';
import { Dialog } from '../../ui/dialog';
```

### 规则 2: 工作流组件导入

```typescript
// cc-wf-studio 原始写法
import { NodePalette } from '@/components/canvas/NodePalette';

// Auto-Claude 修改后
import { NodePalette } from './NodePalette';
// 或
import { NodePalette } from '../workflow/NodePalette';
```

### 规则 3: 翻译 Hook 导入

```typescript
// 保持不变，两个项目写法相同
import { useTranslation } from 'react-i18next';

// 使用时指定命名空间
const { t } = useTranslation('workflowStudio');
```

### 规则 4: 类型导入

```typescript
// cc-wf-studio 原始写法
import type { WorkflowNode } from '@/types/workflow';

// Auto-Claude 修改后
import type { WorkflowNode } from '../../types/workflow';
// 或定义在本地
```

---

## 🌍 翻译配置

### 当前配置 (apps/frontend/src/shared/i18n/index.ts)

```typescript
// 从 cc-wf-studio 导入翻译文件
import enWorkflowStudio from '../../../../cc-wf-studio/src/i18n/locales/en/workflowStudio.json';
import frWorkflowStudio from '../../../../cc-wf-studio/src/i18n/locales/fr/workflowStudio.json';
import zhCnWorkflowStudio from '../../../../cc-wf-studio/src/i18n/locales/zh-CN/workflowStudio.json';

export const resources = {
  en: {
    // ... 其他命名空间
    workflowStudio: enWorkflowStudio
  },
  fr: {
    // ... 其他命名空间
    workflowStudio: frWorkflowStudio
  },
  'zh-CN': {
    // ... 其他命名空间
    workflowStudio: zhCnWorkflowStudio
  }
};
```

### 添加新语言支持

如果 cc-wf-studio 新增了语言 (如日语)，需要修改:

```typescript
// 1. 添加导入
import jaWorkflowStudio from '../../../../cc-wf-studio/src/i18n/locales/ja/workflowStudio.json';

// 2. 添加到 resources
export const resources = {
  // ... 现有语言
  'ja': {
    common: jaCommon,           // 如果有
    workflowStudio: jaWorkflowStudio
  }
};

// 3. 添加到 ns 数组 (如果是新命名空间)
i18n.init({
  ns: ['common', 'workflowStudio', /* 新命名空间 */],
});
```

### 添加新翻译 Key

**重要**: 翻译 key 只在 cc-wf-studio 中添加!

```bash
# 1. 编辑 cc-wf-studio 翻译文件
vim apps/cc-wf-studio/src/i18n/locales/en/workflowStudio.json
vim apps/cc-wf-studio/src/i18n/locales/zh-CN/workflowStudio.json

# 2. Auto-Claude 自动获取 (无需修改)
```

---

## 📡 IPC 通信适配

### cc-wf-studio vs Auto-Claude IPC 差异

| 功能 | cc-wf-studio | Auto-Claude |
|------|-------------|-------------|
| 发送消息 | `vscode.postMessage()` | `window.electronAPI.invoke()` |
| 接收消息 | `window.addEventListener('message')` | `window.electronAPI.on()` |
| API 对象 | `acquireVsCodeApi()` | `window.electronAPI` |

### 适配示例

```typescript
// cc-wf-studio 原始写法
const vscode = acquireVsCodeApi();
vscode.postMessage({ type: 'saveWorkflow', data: workflow });

// Auto-Claude 修改后
await window.electronAPI.invoke('workflow:save', workflow);
```

### browser-mock.ts 配置

当添加新的 IPC 调用时，需要在 mock 中添加:

```typescript
// apps/frontend/src/renderer/lib/browser-mock.ts

export const browserMockAPI = {
  workflow: {
    // 现有方法
    executeWorkflow: async (workflowId: string) => { /* ... */ },
    saveWorkflow: async (workflow: any) => { /* ... */ },
    
    // 新增方法
    newFeature: async (params: any) => {
      console.log('[Mock] newFeature called:', params);
      return { success: true };
    }
  }
};

// 确保 window.Electron 包含新方法
(window as any).Electron = {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => {
      if (channel === 'workflow:newFeature') {
        return browserMockAPI.workflow.newFeature(args[0]);
      }
      // ... 其他 channel
    }
  }
};
```

---

## 📦 组件注册

### 注册新节点类型

```typescript
// apps/frontend/src/renderer/components/workflow/node-types.tsx

import { NewNode } from './nodes/NewNode';

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  skill: SkillNode,
  mcp: McpNode,
  subAgent: SubAgentNode,
  subAgentFlow: SubAgentFlowNode,
  ifElse: IfElseNode,
  switch: SwitchNode,
  branch: BranchNode,
  askUser: AskUserQuestionNode,
  // 新增节点
  newNode: NewNode,
};
```

### 更新节点面板

```typescript
// apps/frontend/src/renderer/components/workflow/NodePalette.tsx

const nodeCategories = [
  {
    title: t('basicNodes'),
    nodes: [
      { type: 'start', label: t('nodes.start.label'), icon: Play },
      { type: 'end', label: t('nodes.end.label'), icon: Square },
      // 新增节点
      { type: 'newNode', label: t('nodes.newNode.label'), icon: NewIcon },
    ]
  },
  // ...
];
```

### 导出组件

```typescript
// apps/frontend/src/renderer/components/workflow/nodes/index.ts
export { StartNode } from './StartNode';
export { EndNode } from './EndNode';
// ... 其他节点
export { NewNode } from './NewNode';  // 新增

// apps/frontend/src/renderer/components/workflow/index.ts
export * from './nodes';
export { NewComponent } from './NewComponent';  // 新增
```

---

## 🎨 样式适配

### Tailwind CSS 配置

两个项目使用相同的 Tailwind 配置，通常无需修改样式。

### 特殊情况: VSCode 主题变量

```css
/* cc-wf-studio 可能使用 VSCode 主题变量 */
.component {
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

/* Auto-Claude 需要替换为 Tailwind 类或 CSS 变量 */
.component {
  @apply bg-background text-foreground;
}
```

### 暗色模式适配

```typescript
// 确保组件支持暗色模式
<div className="bg-white dark:bg-gray-900">
  {/* 内容 */}
</div>
```

---

## ✅ 迁移检查清单

迁移新组件时，按此清单检查:

### 文件修改
- [ ] 复制组件文件到正确目录
- [ ] 修改所有导入路径 (相对路径)
- [ ] 更新组件索引文件 (index.ts)
- [ ] 注册节点类型 (如果是节点)

### 翻译
- [ ] 在 cc-wf-studio 中添加翻译 key
- [ ] 确认使用正确的命名空间 `workflowStudio`
- [ ] 测试中英文切换

### IPC 通信
- [ ] 替换 VSCode API 为 Electron API
- [ ] 更新 browser-mock.ts (如需要)
- [ ] 测试 IPC 调用

### 样式
- [ ] 替换 VSCode 主题变量
- [ ] 测试暗色模式
- [ ] 检查响应式布局

### 测试
- [ ] 开发模式测试 (`npm run dev`)
- [ ] 构建测试 (`npm run build`)
- [ ] 打包测试 (`npm run package`)

---

## 🔗 相关文档

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 迁移指南
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 集成指南
- [docs/中文/中文翻译完整指南.md](../中文/中文翻译完整指南.md) - 翻译指南

---

**文档维护者**: Auto-Claude Team
**最后更新**: 2026-01-27
