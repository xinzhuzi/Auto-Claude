# cc-wf-studio 迁移状态对比文档

> 生成时间: 2026-01-30
> 源项目: `/Users/zhengbingjin/Project/Github/cc-wf-studio`
> 目标项目: `/Users/zhengbingjin/Project/Github/Auto-Claude`

---

## 🎉 迁移状态总结

**实际迁移已基本完成！**

Auto-Claude 项目中有 **两个** cc-wf-studio 相关目录：

| 目录 | 组件数 | 用途 |
|------|--------|------|
| `apps/frontend/src/renderer/components/workflow/` | **80** | 主要工作流组件 (完整) |
| `apps/cc-wf-studio/src/` | 47 | 服务层 (通过 `@cc-wf-studio` 别名引用) |

**源项目 cc-wf-studio**: 77 个组件

✅ **Auto-Claude 的 workflow 组件数量 (80) 已超过源项目 (77)**

---

## 项目架构说明

### 别名配置

在 `apps/frontend/electron.vite.config.ts` 中配置了别名：
```typescript
'@cc-wf-studio': resolve(__dirname, '../cc-wf-studio/src')
```

### 引用关系

以下文件通过 `@cc-wf-studio` 别名引用服务：
- `WorkflowStudioView.tsx` → `@cc-wf-studio/services/workflow-service`
- `WorkflowStudioView.tsx` → `@cc-wf-studio/services/export-service`
- `ExecutionPanel.tsx` → `@cc-wf-studio/services/export-service`
- `LoadWorkflowDialog.tsx` → `@cc-wf-studio/services/workflow-service`

---

## 一、已完成迁移的模块

### 1.1 类型定义 ✅

| 源文件 | Auto-Claude 位置 | 状态 |
|--------|------------------|------|
| workflow-definition.ts | `apps/frontend/src/shared/types/workflow/index.ts` | ✅ 完整迁移 (557行) |
| mcp-node.ts | 合并到 workflow/index.ts | ✅ 已合并 |
| messages.ts | 不需要 (使用 Electron IPC) | ✅ 已替代 |

### 1.2 状态管理 ✅

| 源文件 | Auto-Claude 位置 | 状态 |
|--------|------------------|------|
| workflow-store.ts | `apps/frontend/src/renderer/stores/workflow-store.ts` | ✅ 完整实现 (327行) |
| refinement-store.ts | 不需要 (使用 ai-optimization-store.ts) | ✅ 已替代 |

### 1.3 节点组件 ✅ (100%)

| 组件 | Auto-Claude 位置 |
|------|------------------|
| StartNode.tsx | `workflow/nodes/StartNode.tsx` |
| EndNode.tsx | `workflow/nodes/EndNode.tsx` |
| PromptNode.tsx | `workflow/nodes/PromptNode.tsx` |
| SubAgentNode.tsx | `workflow/nodes/SubAgentNode.tsx` |
| SubAgentFlowNode.tsx | `workflow/nodes/SubAgentFlowNode.tsx` |
| AskUserQuestionNode.tsx | `workflow/nodes/AskUserQuestionNode.tsx` |
| IfElseNode.tsx | `workflow/nodes/IfElseNode.tsx` |
| SwitchNode.tsx | `workflow/nodes/SwitchNode.tsx` |
| BranchNode.tsx | `workflow/nodes/BranchNode.tsx` |
| SkillNode.tsx | `workflow/nodes/SkillNode.tsx` |
| McpNode.tsx | `workflow/nodes/McpNode.tsx` |
| DeleteButton.tsx | `workflow/dialogs/DeleteButton.tsx` |

### 1.4 聊天组件 ✅ (100%)

| 组件 | Auto-Claude 位置 |
|------|------------------|
| MessageBubble.tsx | `workflow/chat/MessageBubble.tsx` |
| MessageInput.tsx | `workflow/chat/MessageInput.tsx` |
| MessageList.tsx | `workflow/chat/MessageList.tsx` |
| ProgressBar.tsx | `workflow/chat/ProgressBar.tsx` |
| SettingsDropdown.tsx | `workflow/chat/SettingsDropdown.tsx` |
| ToolExecutionIndicator.tsx | `workflow/chat/ToolExecutionIndicator.tsx` |
| WarningBanner.tsx | `workflow/chat/WarningBanner.tsx` |

### 1.5 MCP 组件 ✅ (100%)

| 组件 | Auto-Claude 位置 |
|------|------------------|
| McpNodeDialog.tsx | `workflow/mcp/McpNodeDialog.tsx` |
| McpNodeEditDialog.tsx | `workflow/mcp/McpNodeEditDialog.tsx` |
| ParameterFormGenerator.tsx | `workflow/mcp/ParameterFormGenerator.tsx` |
| ArrayParameter.tsx | `workflow/mcp/parameters/ArrayParameter.tsx` |
| BooleanParameter.tsx | `workflow/mcp/parameters/BooleanParameter.tsx` |
| NumberParameter.tsx | `workflow/mcp/parameters/NumberParameter.tsx` |
| ObjectParameter.tsx | `workflow/mcp/parameters/ObjectParameter.tsx` |
| StringParameter.tsx | `workflow/mcp/parameters/StringParameter.tsx` |

### 1.6 模式选择组件 ✅ (扩展)

| 组件 | Auto-Claude 位置 | 备注 |
|------|------------------|------|
| AiParameterConfigInput.tsx | `workflow/mode-selection/AiParameterConfigInput.tsx` | ✅ |
| AiToolSelectionInput.tsx | `workflow/mode-selection/AiToolSelectionInput.tsx` | ✅ |
| ModeIndicatorBadge.tsx | `workflow/mode-selection/ModeIndicatorBadge.tsx` | ✅ |
| ConfigurationStep.tsx | `workflow/mode-selection/ConfigurationStep.tsx` | ✅ 新增 |
| StepIndicator.tsx | `workflow/mode-selection/StepIndicator.tsx` | ✅ 新增 |
| ValidationStep.tsx | `workflow/mode-selection/ValidationStep.tsx` | ✅ 新增 |

### 1.7 工具栏组件 ✅ (100%)

| 组件 | Auto-Claude 位置 |
|------|------------------|
| Toolbar.tsx | `workflow/Toolbar.tsx` |
| MoreActionsDropdown.tsx | `workflow/toolbar/MoreActionsDropdown.tsx` |
| CopilotExecutionModeDropdown.tsx | `workflow/toolbar/CopilotExecutionModeDropdown.tsx` |
| SlashCommandOptionsDropdown.tsx | `workflow/toolbar/SlashCommandOptionsDropdown.tsx` |

### 1.8 通用组件 ✅ (100%)

| 组件 | Auto-Claude 位置 |
|------|------------------|
| AiGenerateButton.tsx | `workflow/common/AiGenerateButton.tsx` |
| ArgumentHintTagInput.tsx | `workflow/common/ArgumentHintTagInput.tsx` |
| Checkbox.tsx | `workflow/common/Checkbox.tsx` |
| ColorPicker.tsx | `workflow/common/ColorPicker.tsx` |
| EditableNameField.tsx | `workflow/common/EditableNameField.tsx` |
| EditInEditorButton.tsx | `workflow/common/EditInEditorButton.tsx` |
| IndeterminateProgressBar.tsx | `workflow/common/IndeterminateProgressBar.tsx` |
| ProcessingOverlay.tsx | `workflow/common/ProcessingOverlay.tsx` |
| ResizeHandle.tsx | `workflow/common/ResizeHandle.tsx` |
| SimpleOverlay.tsx | `workflow/common/SimpleOverlay.tsx` |
| Spinner.tsx | `workflow/common/Spinner.tsx` |
| StyledTooltip.tsx | `workflow/common/StyledTooltip.tsx` |
| TagInput.tsx | `workflow/common/TagInput.tsx` |
| Toggle.tsx | `workflow/common/Toggle.tsx` |
| ToolSelectTagInput.tsx | `workflow/common/ToolSelectTagInput.tsx` |

### 1.9 对话框组件 ✅ (扩展)

| 组件 | Auto-Claude 位置 | 备注 |
|------|------------------|------|
| AlertDialog.tsx | `workflow/dialogs/AlertDialog.tsx` | ✅ |
| ConfirmDialog.tsx | `workflow/dialogs/ConfirmDialog.tsx` | ✅ |
| ErrorNotification.tsx | `workflow/dialogs/ErrorNotification.tsx` | ✅ |
| LoadWorkflowDialog.tsx | `workflow/dialogs/LoadWorkflowDialog.tsx` | ✅ |
| RefinementChatDialog.tsx | `workflow/dialogs/RefinementChatDialog.tsx` | ✅ 重命名 |
| SlackConnectionDialog.tsx | `workflow/dialogs/SlackConnectionDialog.tsx` | ✅ 合并 |
| SlackManualTokenDialog.tsx | `workflow/dialogs/SlackManualTokenDialog.tsx` | ✅ |
| SlackShareDialog.tsx | `workflow/dialogs/SlackShareDialog.tsx` | ✅ |
| TermsOfUseDialog.tsx | `workflow/dialogs/TermsOfUseDialog.tsx` | ✅ |
| SkillBrowserDialog.tsx | `workflow/SkillBrowserDialog.tsx` | ✅ |
| SkillCreationDialog.tsx | `workflow/SkillCreationDialog.tsx` | ✅ |
| SubAgentFlowDialog.tsx | `workflow/SubAgentFlowDialog.tsx` | ✅ |

### 1.10 画布组件 ✅ (100%)

| 组件 | Auto-Claude 位置 |
|------|------------------|
| WorkflowCanvas.tsx | `workflow/WorkflowCanvas.tsx` |
| DescriptionPanel.tsx | `workflow/DescriptionPanel.tsx` |
| InteractionModeToggle.tsx | `workflow/InteractionModeToggle.tsx` |
| MinimapContainer.tsx | `workflow/MinimapContainer.tsx` |
| NodePalette.tsx | `workflow/NodePalette.tsx` |
| PropertyPanel.tsx | `workflow/PropertyPanel.tsx` |
| PreviewCanvas.tsx | `workflow/PreviewCanvas.tsx` |
| Tour.tsx | `workflow/Tour.tsx` |
| DeletableEdge.tsx | `workflow/DeletableEdge.tsx` |
| ExecutionPanel.tsx | `workflow/ExecutionPanel.tsx` |

### 1.11 服务层 ✅

| 服务 | Auto-Claude 位置 | 备注 |
|------|------------------|------|
| workflow-service.ts | `apps/cc-wf-studio/src/services/workflow-service.ts` | ✅ 通过别名引用 |
| export-service.ts | `apps/cc-wf-studio/src/services/export-service.ts` | ✅ 通过别名引用 |
| vscode-bridge.ts | 不需要 | ✅ 使用 Electron IPC 替代 |

---

## 二、Auto-Claude 新增功能

以下是 Auto-Claude 独有的功能，不在源项目中：

| 组件/功能 | 位置 | 说明 |
|-----------|------|------|
| AIGenerationDialog.tsx | `workflow/AIGenerationDialog.tsx` | AI 生成工作流对话框 |
| AIOptimizationPanel.tsx | `workflow/AIOptimizationPanel.tsx` | AI 优化面板 |
| AISkillGenerationDialog.tsx | `workflow/AISkillGenerationDialog.tsx` | AI 技能生成对话框 |
| UserInputDialog.tsx | `workflow/UserInputDialog.tsx` | 用户输入对话框 |
| ExecutionPanel.tsx | `workflow/ExecutionPanel.tsx` | 工作流执行面板 |
| ToolbarSimple.tsx | `workflow/ToolbarSimple.tsx` | 简化工具栏 |
| tour-steps.ts | `workflow/tour-steps.ts` | 引导步骤配置 |
| node-defaults.ts | `workflow/node-defaults.ts` | 节点默认值 |
| node-types.tsx | `workflow/node-types.tsx` | 节点类型注册 |

---

## 三、Extension 层 (设计上不迁移)

VSCode 扩展后端逻辑 (71 个文件)，Auto-Claude 使用以下替代方案：

| 源项目功能 | Auto-Claude 替代方案 |
|-----------|---------------------|
| VSCode Extension API | Electron Main Process |
| vscode-bridge.ts | Electron IPC (preload/api/) |
| i18n-service.ts | react-i18next |
| file-service.ts | Electron fs API |
| mcp-sdk-client.ts | 后端 Python MCP 集成 |

---

## 四、目录结构对照

### 源项目 (cc-wf-studio)
```
src/
├── extension/          # VSCode 扩展后端 (不迁移)
├── shared/types/       # 共享类型 → frontend/shared/types/workflow/
└── webview/src/        # React 前端 → frontend/renderer/components/workflow/
```

### Auto-Claude
```
apps/
├── cc-wf-studio/src/   # 服务层 (通过 @cc-wf-studio 别名引用)
│   └── services/
│       ├── workflow-service.ts
│       └── export-service.ts
└── frontend/src/
    ├── shared/types/workflow/  # 类型定义
    ├── renderer/
    │   ├── stores/workflow-store.ts  # 状态管理
    │   └── components/workflow/      # 80 个组件
    └── main/
        └── ipc-handlers/workflow/    # IPC 处理器
```

---

## 五、结论

### ✅ 迁移已完成

1. **类型定义**: 完整迁移到 `shared/types/workflow/`
2. **状态管理**: 使用 `workflow-store.ts` + `ai-optimization-store.ts`
3. **组件**: 80 个组件，超过源项目的 77 个
4. **服务层**: 通过 `@cc-wf-studio` 别名引用

### 🔧 可选优化

1. **合并目录**: 可以考虑将 `apps/cc-wf-studio/src/services/` 移动到 `apps/frontend/src/renderer/services/workflow/`，消除别名依赖
2. **清理旧代码**: `apps/cc-wf-studio/src/components/` 目录可能是旧的迁移残留，可以删除

### 📝 无需迁移

- Extension 层 (71 个文件) - 使用 Electron 替代
- VSCode 特定功能 - 已有 Electron 等效实现
