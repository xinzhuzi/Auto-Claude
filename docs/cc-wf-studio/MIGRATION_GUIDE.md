# cc-wf-studio 迁移指南

**版本**: 2.0
**最后更新**: 2026-01-27
**用途**: 指导从 cc-wf-studio 源码迁移新功能到 Auto-Claude

---

## 📋 目录

1. [架构概览](#架构概览)
2. [目录结构对照](#目录结构对照)
3. [迁移流程](#迁移流程)
4. [组件迁移清单](#组件迁移清单)
5. [常见问题](#常见问题)

---

## 🏗️ 架构概览

### 两个项目的关系

```
┌─────────────────────────────────────────────────────────────────┐
│                        cc-wf-studio (源)                         │
│                   VSCode Extension 工作流编辑器                   │
│                                                                  │
│  apps/cc-wf-studio/src/                                         │
│  ├── components/     # UI 组件 (源)                              │
│  ├── i18n/          # 翻译文件 (权威来源)                         │
│  ├── services/      # 服务层                                     │
│  ├── stores/        # 状态管理                                   │
│  ├── types/         # 类型定义                                   │
│  └── utils/         # 工具函数                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 迁移
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Auto-Claude (目标)                          │
│                   Electron 桌面应用                               │
│                                                                  │
│  apps/frontend/src/renderer/components/workflow/                │
│  ├── nodes/         # 节点组件                                   │
│  ├── dialogs/       # 对话框组件                                 │
│  ├── common/        # 通用组件                                   │
│  ├── mcp/           # MCP 相关组件                               │
│  ├── chat/          # 聊天组件                                   │
│  ├── toolbar/       # 工具栏子组件                               │
│  └── mode-selection/ # 模式选择组件                              │
│                                                                  │
│  apps/frontend/src/shared/i18n/                                 │
│  └── index.ts       # 从 cc-wf-studio 导入翻译                   │
└─────────────────────────────────────────────────────────────────┘
```

### 核心差异

| 维度 | cc-wf-studio | Auto-Claude |
|------|-------------|-------------|
| **运行环境** | VSCode Extension (Webview) | Electron Desktop App |
| **IPC 通信** | VSCode Message Passing | Electron IPC |
| **Backend** | TypeScript (Extension Host) | Python 3.12+ |
| **AI 调用** | Claude Code CLI | Claude Agent SDK |
| **翻译文件** | 权威来源 | 从 cc-wf-studio 导入 |

---

## 📁 目录结构对照

### 组件目录映射

| cc-wf-studio 路径 | Auto-Claude 路径 | 说明 |
|------------------|-----------------|------|
| `src/components/nodes/` | `workflow/nodes/` | 节点组件 |
| `src/components/canvas/` | `workflow/` (根目录) | 画布相关组件 |
| `src/components/toolbar/` | `workflow/toolbar/` | 工具栏组件 |
| `src/components/dialogs/` | `workflow/dialogs/` | 对话框组件 |
| `src/i18n/locales/` | **不复制** | 翻译文件保留在源位置 |

### 翻译文件位置 (重要!)

```
翻译文件的权威来源:
apps/cc-wf-studio/src/i18n/locales/
├── en/workflowStudio.json      # 英文
├── fr/workflowStudio.json      # 法文
├── zh-CN/workflowStudio.json   # 简体中文
├── ja/workflowStudio.json      # 日文
├── ko/workflowStudio.json      # 韩文
└── zh-TW/workflowStudio.json   # 繁体中文

⚠️ 注意: 不要在 apps/frontend/src/shared/i18n/locales/ 下创建 workflowStudio.json
```

---

## 🔄 迁移流程

### 步骤 1: 确认迁移范围

1. 确定要迁移的组件/功能
2. 检查 cc-wf-studio 源码中的最新版本
3. 对比 Auto-Claude 中是否已有该组件

### 步骤 2: 复制组件文件

```bash
# 示例: 迁移新节点组件
cp apps/cc-wf-studio/src/components/nodes/NewNode.tsx \
   apps/frontend/src/renderer/components/workflow/nodes/
```

### 步骤 3: 修改导入路径

```typescript
// cc-wf-studio 原始导入
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

// Auto-Claude 修改后
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/button';  // 相对路径
```

### 步骤 4: 更新翻译文件

如果新组件需要新的翻译 key:

1. **在 cc-wf-studio 中添加翻译** (权威来源)
   ```bash
   # 编辑翻译文件
   apps/cc-wf-studio/src/i18n/locales/en/workflowStudio.json
   apps/cc-wf-studio/src/i18n/locales/zh-CN/workflowStudio.json
   # ... 其他语言
   ```

2. **Auto-Claude 自动获取** (无需额外操作)
   - `apps/frontend/src/shared/i18n/index.ts` 已配置从 cc-wf-studio 导入

### 步骤 5: 更新组件索引

```typescript
// apps/frontend/src/renderer/components/workflow/nodes/index.ts
export { NewNode } from './NewNode';
```

### 步骤 6: 注册节点类型 (如果是节点组件)

```typescript
// apps/frontend/src/renderer/components/workflow/node-types.tsx
import { NewNode } from './nodes/NewNode';

export const nodeTypes = {
  // ... 现有节点
  newNode: NewNode,
};
```

### 步骤 7: 测试验证

```bash
cd apps/frontend
npm run dev
# 访问 http://localhost:5173/ 测试新功能
```

---

## 📦 组件迁移清单

### 节点组件 (12 个)

| 组件 | cc-wf-studio | Auto-Claude | 状态 |
|------|-------------|-------------|------|
| StartNode | ✅ | ✅ | 已迁移 |
| EndNode | ✅ | ✅ | 已迁移 |
| PromptNode | ✅ | ✅ | 已迁移 |
| SkillNode | ✅ | ✅ | 已迁移 |
| McpNode | ✅ | ✅ | 已迁移 |
| SubAgentNode | ✅ | ✅ | 已迁移 |
| SubAgentFlowNode | ✅ | ✅ | 已迁移 |
| IfElseNode | ✅ | ✅ | 已迁移 |
| SwitchNode | ✅ | ✅ | 已迁移 |
| BranchNode | ✅ | ✅ | 已迁移 |
| AskUserQuestionNode | ✅ | ✅ | 已迁移 |

**文件位置**:
- cc-wf-studio: `apps/cc-wf-studio/src/components/nodes/`
- Auto-Claude: `apps/frontend/src/renderer/components/workflow/nodes/`

### 画布组件 (5 个)

| 组件 | cc-wf-studio | Auto-Claude | 状态 |
|------|-------------|-------------|------|
| WorkflowCanvas | ✅ | ✅ | 已迁移 |
| NodePalette | ✅ | ✅ | 已迁移 |
| PropertyPanel | ✅ | ✅ | 已迁移 |
| ExecutionPanel | ✅ | ✅ | 已迁移 |
| LoadWorkflowDialog | ✅ | ✅ | 已迁移 |

### 工具栏组件 (4 个)

| 组件 | cc-wf-studio | Auto-Claude | 状态 |
|------|-------------|-------------|------|
| Toolbar | ✅ | ✅ | 已迁移 |
| EditableNameField | ✅ | ✅ | 已迁移 |
| MoreActionsDropdown | - | ✅ | Auto-Claude 独有 |
| SlashCommandOptionsDropdown | - | ✅ | Auto-Claude 独有 |
| CopilotExecutionModeDropdown | - | ✅ | Auto-Claude 独有 |

**文件位置**:
- cc-wf-studio: `apps/cc-wf-studio/src/components/toolbar/`
- Auto-Claude: `apps/frontend/src/renderer/components/workflow/toolbar/`

### 对话框组件 (11 个)

| 组件 | cc-wf-studio | Auto-Claude | 状态 |
|------|-------------|-------------|------|
| LoadWorkflowDialog | ✅ | ✅ | 已迁移 |
| AlertDialog | - | ✅ | Auto-Claude 独有 |
| ConfirmDialog | - | ✅ | Auto-Claude 独有 |
| DeleteButton | - | ✅ | Auto-Claude 独有 |
| ErrorNotification | - | ✅ | Auto-Claude 独有 |
| RefinementChatDialog | - | ✅ | Auto-Claude 独有 |
| SlackConnectionDialog | - | ✅ | Auto-Claude 独有 |
| SlackManualTokenDialog | - | ✅ | Auto-Claude 独有 |
| SlackShareDialog | - | ✅ | Auto-Claude 独有 |
| TermsOfUseDialog | - | ✅ | Auto-Claude 独有 |

**文件位置**: `apps/frontend/src/renderer/components/workflow/dialogs/`

### 通用组件 (16 个)

| 组件 | 状态 | 说明 |
|------|------|------|
| AiGenerateButton | ✅ | AI 生成按钮 |
| ArgumentHintTagInput | ✅ | 参数提示标签输入 |
| Checkbox | ✅ | 复选框 |
| ColorPicker | ✅ | 颜色选择器 |
| EditableNameField | ✅ | 可编辑名称字段 |
| EditInEditorButton | ✅ | 在编辑器中打开按钮 |
| IndeterminateProgressBar | ✅ | 不确定进度条 |
| ProcessingOverlay | ✅ | 处理中遮罩 |
| ResizeHandle | ✅ | 调整大小手柄 |
| SimpleOverlay | ✅ | 简单遮罩 |
| Spinner | ✅ | 加载旋转器 |
| StyledTooltip | ✅ | 样式化提示框 |
| TagInput | ✅ | 标签输入 |
| Toggle | ✅ | 切换开关 |
| ToolSelectTagInput | ✅ | 工具选择标签输入 |

**文件位置**: `apps/frontend/src/renderer/components/workflow/common/`

### MCP 组件 (9 个)

| 组件 | 状态 | 说明 |
|------|------|------|
| McpNodeDialog | ✅ | MCP 节点对话框 |
| McpNodeEditDialog | ✅ | MCP 节点编辑对话框 |
| ParameterFormGenerator | ✅ | 参数表单生成器 |
| ArrayParameter | ✅ | 数组参数输入 |
| BooleanParameter | ✅ | 布尔参数输入 |
| NumberParameter | ✅ | 数字参数输入 |
| ObjectParameter | ✅ | 对象参数输入 |
| StringParameter | ✅ | 字符串参数输入 |

**文件位置**: `apps/frontend/src/renderer/components/workflow/mcp/`

### 聊天组件 (7 个)

| 组件 | 状态 | 说明 |
|------|------|------|
| MessageBubble | ✅ | 消息气泡 |
| MessageInput | ✅ | 消息输入框 |
| MessageList | ✅ | 消息列表 |
| ProgressBar | ✅ | 进度条 |
| SettingsDropdown | ✅ | 设置下拉菜单 |
| ToolExecutionIndicator | ✅ | 工具执行指示器 |
| WarningBanner | ✅ | 警告横幅 |

**文件位置**: `apps/frontend/src/renderer/components/workflow/chat/`

### 模式选择组件 (6 个)

| 组件 | 状态 | 说明 |
|------|------|------|
| AiParameterConfigInput | ✅ | AI 参数配置输入 |
| AiToolSelectionInput | ✅ | AI 工具选择输入 |
| ConfigurationStep | ✅ | 配置步骤 |
| ModeIndicatorBadge | ✅ | 模式指示徽章 |
| StepIndicator | ✅ | 步骤指示器 |
| ValidationStep | ✅ | 验证步骤 |

**文件位置**: `apps/frontend/src/renderer/components/workflow/mode-selection/`

### 其他根目录组件 (15 个)

| 组件 | 状态 | 说明 |
|------|------|------|
| WorkflowCanvas | ✅ | 工作流画布 |
| NodePalette | ✅ | 节点面板 |
| PropertyPanel | ✅ | 属性面板 |
| ExecutionPanel | ✅ | 执行面板 |
| Toolbar | ✅ | 工具栏 |
| ToolbarSimple | ✅ | 简化工具栏 |
| AIGenerationDialog | ✅ | AI 生成对话框 |
| AIOptimizationPanel | ✅ | AI 优化面板 |
| AISkillGenerationDialog | ✅ | AI Skill 生成对话框 |
| UserInputDialog | ✅ | 用户输入对话框 |
| SkillBrowserDialog | ✅ | Skill 浏览对话框 |
| SubAgentFlowDialog | ✅ | 子代理流程对话框 |
| Tour | ✅ | 交互式教程 |
| DeletableEdge | ✅ | 可删除连接线 |
| PreviewCanvas | ✅ | 预览画布 |
| DescriptionPanel | ✅ | 描述面板 |
| InteractionModeToggle | ✅ | 交互模式切换 |
| MinimapContainer | ✅ | 小地图容器 |

**文件位置**: `apps/frontend/src/renderer/components/workflow/`

### 翻译文件 (6 种语言)

| 语言 | cc-wf-studio | Auto-Claude 导入 | 状态 |
|------|-------------|-----------------|------|
| English (en) | ✅ | ✅ | 已配置 |
| French (fr) | ✅ | ✅ | 已配置 |
| 简体中文 (zh-CN) | ✅ | ✅ | 已配置 |
| 日本語 (ja) | ✅ | ❌ | 待配置 |
| 한국어 (ko) | ✅ | ❌ | 待配置 |
| 繁體中文 (zh-TW) | ✅ | ❌ | 待配置 |

---

## ❓ 常见问题

### Q1: 翻译不生效怎么办?

**检查步骤**:
1. 确认翻译 key 在 `apps/cc-wf-studio/src/i18n/locales/zh-CN/workflowStudio.json` 中存在
2. 确认组件使用了正确的命名空间: `useTranslation('workflowStudio')`
3. 重启开发服务器

### Q2: 组件导入路径报错?

**解决方案**:
```typescript
// 使用相对路径而非路径别名
// ❌ 错误
import { Button } from '@/components/ui/button';

// ✅ 正确
import { Button } from '../../ui/button';
```

### Q3: window.Electron 未定义?

**解决方案**:
确保 `browser-mock.ts` 中有对应的 mock:
```typescript
(window as any).Electron = {
  ipcRenderer: {
    invoke: browserMockAPI.workflow.executeWorkflow,
    on: () => {},
    removeListener: () => {}
  }
};
```

### Q4: 新增语言支持怎么做?

参考 [AUTO_CLAUDE_MODIFICATIONS.md](./AUTO_CLAUDE_MODIFICATIONS.md) 中的「添加新语言支持」章节。

---

## 🔗 相关文档

- [AUTO_CLAUDE_MODIFICATIONS.md](./AUTO_CLAUDE_MODIFICATIONS.md) - Auto-Claude 修改指南
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 集成指南
- [docs/中文/中文翻译完整指南.md](../中文/中文翻译完整指南.md) - 翻译指南

---

**文档维护者**: Auto-Claude Team
**最后更新**: 2026-01-27
