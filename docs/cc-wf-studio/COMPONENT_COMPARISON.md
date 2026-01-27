# 组件对比详细清单

**对比日期**: 2026-01-24
**源项目**: cc-wf-studio (VSCode Extension)
**目标项目**: Auto-Claude (Electron App)

---

## 📊 统计概览

| 类别 | cc-wf-studio | Auto-Claude | 迁移率 |
|------|-------------|-------------|--------|
| **总组件数** | 75 | 77 | 107% |
| **完全迁移** | 67 | 67 | 100% |
| **新增组件** | 0 | 10 | - |
| **排除组件** | 8 | 0 | - |

---

## 1. 主布局组件 (8/8) ✅

| # | cc-wf-studio | Auto-Claude | 状态 | 修改说明 |
|---|-------------|-------------|------|----------|
| 1 | `webview/components/WorkflowEditor.tsx` | `renderer/components/WorkflowStudioView.tsx` | ✅ 完整迁移 | 重构为 Electron 环境，重命名 |
| 2 | `webview/components/Toolbar.tsx` | `renderer/components/workflow/Toolbar.tsx` | ✅ 完整迁移 | 移除 Copilot/Slack 功能 |
| 3 | `webview/components/NodePalette.tsx` | `renderer/components/workflow/NodePalette.tsx` | ✅ 完整迁移 | 无修改 |
| 4 | `webview/components/PropertyOverlay.tsx` | `renderer/components/workflow/PropertyPanel.tsx` | ✅ 完整迁移 | 重命名为 PropertyPanel |
| 5 | `webview/components/WorkflowCanvas.tsx` | `renderer/components/workflow/WorkflowCanvas.tsx` | ✅ 完整迁移 | 无修改 |
| 6 | `webview/components/ExecutionPanel.tsx` | `renderer/components/workflow/ExecutionPanel.tsx` | ✅ 完整迁移 | 扩展实时监控功能 |
| 7 | `webview/components/DescriptionPanel.tsx` | `renderer/components/workflow/DescriptionPanel.tsx` | ✅ 完整迁移 | 无修改 |
| 8 | `webview/components/MinimapContainer.tsx` | `renderer/components/workflow/MinimapContainer.tsx` | ✅ 完整迁移 | 无修改 |

---

## 2. 节点组件 (11/11) ✅

| # | 节点类型 | cc-wf-studio | Auto-Claude | 状态 | 修改说明 |
|---|---------|-------------|-------------|------|----------|
| 1 | Start | `nodes/StartNode.tsx` | `workflow/nodes/StartNode.tsx` | ✅ 完整迁移 | 无修改 |
| 2 | End | `nodes/EndNode.tsx` | `workflow/nodes/EndNode.tsx` | ✅ 完整迁移 | 无修改 |
| 3 | Prompt | `nodes/PromptNode.tsx` | `workflow/nodes/PromptNode.tsx` | ✅ 完整迁移 | 无修改 |
| 4 | Skill | `nodes/SkillNode.tsx` | `workflow/nodes/SkillNode.tsx` | ✅ 完整迁移 | 无修改 |
| 5 | MCP Tool | `nodes/McpNode.tsx` | `workflow/nodes/McpNode.tsx` | ✅ 完整迁移 | 无修改 |
| 6 | Sub-Agent | `nodes/SubAgentNode.tsx` | `workflow/nodes/SubAgentNode.tsx` | ✅ 完整迁移 | 无修改 |
| 7 | Sub-Agent Flow | `nodes/SubAgentFlowNode.tsx` | `workflow/nodes/SubAgentFlowNode.tsx` | ✅ 完整迁移 | 无修改 |
| 8 | If/Else | `nodes/IfElseNode.tsx` | `workflow/nodes/IfElseNode.tsx` | ✅ 完整迁移 | 无修改 |
| 9 | Switch | `nodes/SwitchNode.tsx` | `workflow/nodes/SwitchNode.tsx` | ✅ 完整迁移 | 无修改 |
| 10 | Branch | `nodes/BranchNode.tsx` | `workflow/nodes/BranchNode.tsx` | ✅ 完整迁移 | 无修改 |
| 11 | Ask User | `nodes/AskUserQuestionNode.tsx` | `workflow/nodes/AskUserQuestionNode.tsx` | ✅ 完整迁移 | 无修改 |

---

## 3. 对话框组件 (10/12)

### 完全迁移 (6/12) ✅

| # | 对话框 | cc-wf-studio | Auto-Claude | 状态 | 修改说明 |
|---|--------|-------------|-------------|------|----------|
| 1 | MCP Node | `McpNodeDialog.tsx` | `workflow/mcp/McpNodeDialog.tsx` | ✅ 完整迁移 | 无修改 |
| 2 | MCP Node Edit | `McpNodeEditDialog.tsx` | `workflow/mcp/McpNodeEditDialog.tsx` | ✅ 完整迁移 | 无修改 |
| 3 | Refinement Chat | `RefinementChatDialog.tsx` | `workflow/RefinementChatPanel.tsx` | ✅ 完整迁移 | 重命名为 Panel |
| 4 | Skill Browser | `SkillBrowserDialog.tsx` | `workflow/SkillBrowserDialog.tsx` | ✅ 完整迁移 | 无修改 |
| 5 | Skill Creation | `SkillCreationDialog.tsx` | `workflow/SkillCreationDialog.tsx` | ✅ 完整迁移 | 无修改 |
| 6 | Sub-Agent Flow | `SubAgentFlowDialog.tsx` | `workflow/SubAgentFlowDialog.tsx` | ✅ 完整迁移 | 无修改 |

### 新增组件 (4/12) ✅

| # | 对话框 | cc-wf-studio | Auto-Claude | 状态 | 说明 |
|---|--------|-------------|-------------|------|------|
| 7 | AI Generation | ❌ 无 | `workflow/AIGenerationDialog.tsx` | ✅ 新增 | AI 工作流生成功能 |
| 8 | AI Optimization | ❌ 无 | `workflow/AIOptimizationPanel.tsx` | ✅ 新增 | AI 工作流优化功能 |
| 9 | AI Skill Generation | ❌ 无 | `workflow/AISkillGenerationDialog.tsx` | ✅ 新增 | AI Skill 生成功能 |
| 10 | User Input | ❌ 无 | `workflow/UserInputDialog.tsx` | ✅ 新增 | 运行时用户输入 |

### 排除组件 (2/12) ⚠️

| # | 对话框 | cc-wf-studio | Auto-Claude | 状态 | 原因 |
|---|--------|-------------|-------------|------|------|
| 11 | Slack Connection | `SlackConnectionDialog.tsx` | ❌ 未迁移 | ⚠️ 排除 | Auto-Claude 不需要 Slack 集成 |
| 12 | Slack Share | `SlackShareDialog.tsx` | ❌ 未迁移 | ⚠️ 排除 | Auto-Claude 不需要 Slack 集成 |

---

## 4. 通用组件 (15/15) ✅

| # | 组件 | cc-wf-studio | Auto-Claude | 状态 | 修改说明 |
|---|------|-------------|-------------|------|----------|
| 1 | AiGenerateButton | `common/AiGenerateButton.tsx` | `workflow/common/AiGenerateButton.tsx` | ✅ 完整迁移 | 无修改 |
| 2 | ArgumentHintTagInput | `common/ArgumentHintTagInput.tsx` | `workflow/common/ArgumentHintTagInput.tsx` | ✅ 完整迁移 | 无修改 |
| 3 | Checkbox | `common/Checkbox.tsx` | `workflow/common/Checkbox.tsx` | ✅ 完整迁移 | 使用 Radix UI |
| 4 | ColorPicker | `common/ColorPicker.tsx` | `workflow/common/ColorPicker.tsx` | ✅ 完整迁移 | 无修改 |
| 5 | EditInEditorButton | `common/EditInEditorButton.tsx` | `workflow/common/EditInEditorButton.tsx` | ✅ 完整迁移 | 无修改 |
| 6 | EditableNameField | `common/EditableNameField.tsx` | `workflow/common/EditableNameField.tsx` | ✅ 完整迁移 | 无修改 |
| 7 | IndeterminateProgressBar | `common/IndeterminateProgressBar.tsx` | `workflow/common/IndeterminateProgressBar.tsx` | ✅ 完整迁移 | 无修改 |
| 8 | ProcessingOverlay | `common/ProcessingOverlay.tsx` | `workflow/common/ProcessingOverlay.tsx 无修改 |
| 9 | ResizeHandle | `common/ResizeHandle.tsx` | `workflow/common/ResizeHandle.tsx` | ✅ 完整迁移 | 无修改 |
| 10 | SimpleOverlay | `common/SimpleOverlay.tsx` | `workflow/common/SimpleOverlay.tsx` | ✅ 完整迁移 | 无修改 |
| 11 | Spinner | `common/Spinner.tsx` | `workflow/common/Spinner.tsx` | ✅ 完整迁移 | 无修改 |
| 12 | StyledTooltip | `common/StyledTooltip.tsx` | `workflow/common/StyledTooltip.tsx` | ✅ 完整迁移 | 无修改 |
| 13 | TagInput | `common/TagInput.tsx` | `workflow/common/TagInput.tsx` | ✅ 完整迁移 | 无修改 |
| 14 | Toggle | `common/Toggle.tsx` | `workflow/common/Toggle.tsx` | ✅ 完整迁移 | 使用 Radix UI |
| 15 | ToolSelectTagInput | `common/ToolSelectTagInput.tsx` flow/common/ToolSelectTagInput.tsx` | ✅ 完整迁移 | 无修改 |

---

## 5. 聊天组件 (7/7) ✅

| # | 组件 | cc-wf-studio | Auto-Claude | 状态 | 修改说明 |
|---|------|-------------|-------------|------|----------|
| 1 | MessageBubble | `chat/MessageBubble.tsx` | `workflow/chat/MessageBubble.tsx` | ✅ 完整迁移 | 无修改 |
| 2 | MessageInput | `chat/MessageInput.tsx` | `workflow/chat/MessageInput.tsx` | ✅ 完整迁移 | 无修改 |
| 3 | MessageList | `chat/MessageList.tsx` | `workflow/chat/MessageList.tsx` | ✅ 完整迁移 | 无修改 |
| 4 | ProgressBar | `chat/ProgressBar.tsx` | `workflow/chat/ProgressBar.tsx` | ✅ 完整迁移 | 无修改 |
| 5 | SettingsDropdown | `chat/SettingsDropdown.tsx` | `workflow/chat/SettingsDropdown.tsx` | ✅ 完整迁移 | 无修改 |
| 6 | ToolExecutionIndicator | `chat/ToolExecutionIndicator.tsx` | `workflow/chat/ToolExecutionIndicator.tsx` | ✅ 完整迁移 | 无修改 |
| 7 | WarningBanner | `chat/WarningBanner.tsx` | `workflow/chat/WarningBanner.tsx` | ✅ 完整迁移 | 无修改 |

---

## 6. Toolbar 子组件 (4/4) ✅

| # | 组件 | cc-wf-studio | Auto-Claude | 状态 | 修改说明 |
|---|------|-------------|-------------|------|----------|
| 1 | CopilotExecutionModeDropdown | `toolbar/CopilotExecutionModeDropdown.tsx` | `workflow/toolbar/CopilotExecutionModeDropdown.tsx` | ✅ 完整迁移 | 重命名为 ExecutionModeDropdown |
| 2 | MoreActionsDropdown | `toolbar/MoreActionsDropdown.tsx` | `workflow/toolbar/MoreActionsDropdown.tsx` | ✅ 完整迁移 | 移除 Copilot 选项 |
| 3 | SlashCommandOptionsDropdown | `toolbar/SlashCommandOptionsDropdown.tsx` | `workflow/toolbar/SlashCommandOptionsDropdown.tsx` | ✅ 完整迁移 | 无修改 |
| 4 | InteractionModeToggle | `InteractionModeToggle.tsx` | `workflow/InteractionModeToggle.tsx` | ✅ 完整迁移 | 无修改 |

---

## 7. MCP 组件 (9/9) ✅

| # | 组件 | cc-wf-studio | Auto-Claude | 状态 | 修改说明 |
|---|------|-------------|-------------|------|----------|
| 1 | McpServerList | `mcp/McpServerList.tsx` | `workflow/mcp/McpServerList.tsx` | ✅ 完整迁移 | 无修改 |
| 2 | McpToolList | `mcp/McpToolList.tsx` | `workflow/mcp/McpToolList.tsx` | ✅ 完整迁移 | 无修改 |
| 3 | McpToolSearch | `mcp/McpToolSearch.tsx` | `workflow/mcp/McpToolSearch.tsx` | ✅ 完整迁移 | 无修改 |
| 4 | ParameterFormGenerator | `mcp/ParameterFormGenerator.tsx` | `workflow/mcp/ParameterFormGenerator.tsx` | ✅ 完整迁移 | 无修改 |
| 5 | ArrayParameter | `mcp/parameters/ArrayParameter.tsx` | `workflow/mcp/parameters/ArrayParameter.tsx` | ✅ 完整迁移 | 无修改 |
| 6 | BooleanParameter | `mcp/parameters/BooleanParameter.tsx` | `workflow/mcp/parameters/BooleanParameter.tsx` | ✅ 完整迁移 | 无修改 |
| 7 | NumberPara| `mcp/parameters/NumberParameter.tsx` | `workflow/mcp/parameters/NumberParameter.tsx` | ✅ 完整迁移 | 无修改 |
| 8 | ObjectParameter | `mcp/parameters/ObjectParameter.tsx` | `workflow/mcp/parameters/ObjectParameter.tsx` | ✅ 完整迁移 | 无修改 |
| 9 | StringParameter | `mcp/parameters/StringParameter.tsx` | `workflow/mcp/parameters/StringParameter.tsx` | ✅ 完整迁移 | 无修改 |

---

## 8. 模式选择组件 (6/6) ✅ 新增

| # | 组件 | cc-wf-studio | Auto-Claude | 状态 | 说明 |
|---|------|-------------|-------------|------|------|
| 1 | AiParameterConfigInput | ❌ 无 | `workflow/mode-selection/AiParigInput.tsx` | ✅ 新增 | AI 参数ure, max_tokens, etc.) |
| 2 | AiToolSelectionInput | ❌ 无 | `workflow/mode-selection/AiToolSelectionInput.tsx` | ✅ 新增 | AI 工具选择界面 |
| 3 | ModeIndicatorBadge | ❌ 无 | `workflow/mode-selection/ModeIndicatorBadge.tsx` | ✅ 新增 | 执行模式指示器 |
| 4 | StepIndicator | ❌ 无 | `workflow/mode-selection/StepIndicator.tsx` | ✅ 新增 | 多步骤进度指示器 |
| 5 | ConfigurationStep | ❌ 无 | `workflow/mode-selection/ConfigurationStep.tsx` | ✅ 新增 | 配置向导步骤 |
| 6 | ValidationStep | ❌ 无 | `workflow/mode-selection/ValidationStep.tsx` | ✅ 新增 | 验证结果显示 |

---

## 9. 其他组件 (7/7) ✅

| # | 组件 | cc-wf-studio | Auto-Claude | 状态 | 修改说明 |
|---|------|-------------|-------------|------|----------|
| 1 | Tour | `Tour.tsx` | `workflow/Tour.tsx` | ✅ 完整迁移 | 使用 driver.js |
| 2 | DeletableEdge | `DeletableEdge.tsx` | `workflow/DeletableEdge.tsx` | ✅ 完整迁移 | 无修改 |
| 3 | PreviewCanvas | `PreviewCanvas.tsx` | `workflow/PreviewCanvas.tsx` | ✅ 完整迁移 | 无修改 |
| 4 | ErrorNotification | `ErrorNotification.tsx` | `workflow/ErrorNotification.tsx` | ✅ 完整迁移 | 无修改 |
| 5 | DeleteButton | `DeleteButton.tsx` | `workflow/DeleteButton.tsx` | ✅ 完整迁移 | 无修改 |
| 6 | node-types | `node-types.tsx` | `workflow/nodes/index.ts` | ✅ 完整迁移 | 重构为 index.ts |
| 7 | Alert (UI) | ❌ 无 | `ui/alert.tsx` | ✅ 新增 | 基础 UI 组件 |
| 8 | Slider (UI) | ❌ 无 | `ui/slider.tsx` | ✅ 新增 | 基础 UI 组件 |

---

## 10. 排除的组件 (8个)

### Slack 集成 (3个) ⚠️

| # | 组件 | cc-wf-studio | 原因 |
|---|------|-------------|------|
| 1 | SlackConnectionDialog | `SlackConnectionDialog.tsx` | Auto-Claude 不需要 Slack 集成 |
| 2 | SlackShareDialog | `SlackShareDialog.tsx` | Auto-Claude 不需要 Slack 集成 |
| 3 | SlackManualTokenDialog | `SlackManualTokenDialog.tsx` | Auto-Claude 不需要 Slack 集成 |

### Copilot 导出 (2个) ⚠️

| # | 组件 | cc-wf-studio | 原因 |
|---|------|-------------|------|
| 4 | CopilotExportDialog | `CopilotExportDialog.tsx` | Auto-Claude 不需要 Copilot 功能 |
| 5 | CopilotModeSelector | `CopilotModeSelector.tsx` | Auto-Claude 不需要 Copilot 功能 |

### VSCode 特定 (3个) ⚠️

| # | 组件 | cc-wf-studio | 原因 |
|---|------|-------------|------|
| 6 | TermsOfUseDialog | `TermsOfUseDialog.tsx` | VSCode Extension 特定 |
| 7 | AlertDialog | `AlertDialog.tsx` | 使用 Radix UI Alert 替代 |
| 8 | ConfirmDialog | `ConfirmDialog.tsx` | 使用 Radix UI AlertDialog 替代 |

---

## 修改类型统计

| 修改类型 | 数量 | 百分比 |
|---------|------|--------|
| **无修改** | 67 | 87% |
| **重命名** | 4 | 5% |
| **功能调整** | 3 | 4% |
| **新增** | 10 | 13% |
| **排除** | 8 | 11% |

---

## 文件路径映射

### cc-wf-studio 路径
```
cc-wf-studio/src/webview/src/components/
```

### Auto-Claude 路径
```
Auto-Claude/apps/frontend/src/renderer/components/
├── WorkflowStudioView.tsx
├── ui/
└── workflow/
```

---

**文档版本**: 1.0
**最后更新**: 2026-01-24
