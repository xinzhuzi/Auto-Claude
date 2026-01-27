# cc-wf-studio → Auto-Claude 组件映射表

**生成日期**: 2026-01-24
**映射范围**: 完整组件对应关系
**总组件数**: cc-wf-studio (75) → Auto-Claude (12)

---

## 📊 映射统计

| 状态 | 数量 | 百分比 | 说明 |
|------|------|--------|------|
| ✅ 已迁移 | 12 | 16% | 功能完整或基本完整 |
| ⚠️ 部分迁移 | 1 | 1% | ExecutionPanel 仅占位符 |
| ❌ 未迁移 | 62 | 83% | 完全缺失 |
| **总计** | **75** | **100%** | |

---

## 🗂️ 组件分类映射

### 1. 主布局组件 (7 个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `WorkflowEditor.tsx` | `WorkflowStudioView.tsx` | ✅ 已迁移 | 主容器，已重构并集成到 App.tsx |
| `Toolbar.tsx` | ❌ 缺失 | ❌ 未迁移 | **P0 优先级** - 工具栏完全缺失 |
| `NodePalette.tsx` | `NodePalette.tsx` | ✅ 已迁移 | 节点面板，53 行 |
| `PropertyOverlay.tsx` | `PropertyPanel.tsx` | ✅ 已迁移 | 属性面板，511 行，功能完整 |
| `DescriptionPanel.tsx` | ❌ 缺失 | ❌ 未迁移 | **P3 优先级** - 工作流描述面板 |
| `MinimapContainer.tsx` | ❌ 缺失 | ❌ 未迁移 | **P3 优先级** - 小地图容器 |
| `InteractionModeToggle.tsx` | ❌ 缺失 | ❌ 未迁移 | **P3 优先级** - 平移/选择模式切换 |

**迁移率**: 3/7 (43%)

---

### 2. 节点组件 (11 个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `StartNode.tsx` | `StartNode.tsx` | ✅ 已迁移 | 开始节点，32 行 |
| `EndNode.tsx` | `EndNode.tsx` | ✅ 已迁移 | 结束节点，32 行 |
| `PromptNode.tsx` | `PromptNode.tsx` | ✅ 已迁移 | 提示节点，48 行 |
| `SubAgentNode.tsx` | `node-types.tsx` (占位符) | ❌ 未迁移 | **P0 优先级** - 子代理节点 |
| `SubAgentFlowNode.tsx` | `node-types.tsx` (占位符) | ❌ 未迁移 | **P2 优先级** - 子工作流节点 |
| `SkillNode.tsx` | `node-types.tsx` (占位符) | ❌ 未迁移 | **P0 优先级** - Skill 调用节点 |
| `McpNode/McpNode.tsx` | `node-types.tsx` (占位符) | ❌ 未迁移 | **P0 优先级** - MCP 工具节点 |
| `AskUserQuestionNode.tsx` | `node-types.tsx` (占位符) | ❌ 未迁移 | **P0 优先级** - 用户问题节点 |
| `IfElseNode.tsx` | `node-types.tsx` (占位符) | ❌ 未迁移 | **P0 优先级** - 条件分支节点 |
| `SwitchNode.tsx` | `node-types.tsx` (占位符) | ❌ 未迁移 | **P0 优先级** - 多路分支节点 |
| `BranchNode.tsx` | `node-types.tsx` (占位符) | ❌ 未迁移 | **P3 优先级** - 分支节点 (已废弃) |

**迁移率**: 3/11 (27%)

**注意**: Auto-Claude 的 `node-types.tsx` 中注册了所有节点类型，但仅 Start/End/Prompt 有完整实现，其余 6 个核心节点仅为占位符。

---

### 3. 对话框组件 (12 个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `AlertDialog.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 警告对话框 |
| `ConfirmDialog.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 确认对话框 |
| `McpNodeDialog.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - MCP 工具选择对话框 |
| `McpNodeEditDialog.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - MCP 参数编辑对话框 |
| `RefinementChatPanel.tsx` | `AIOptimizationPanel.tsx` | ⚠️ 部分迁移 | **P2 优先级** - AI 优化面板 (功能不完全相同) |
| `SkillBrowserDialog.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - Skill 浏览对话框 |
| `SkillCreationDialo| `AISkillGenerationDialog.tsx` | ✅ 已迁移 | AI Skill 生成对话框，339 行 |
| `SlackConnectionRequiredDialog.tsx` | ❌ 缺失 | ❌ 不需要 | Slack 功能不迁移 |
| `SlackManualTokenDialog.tsx` | ❌ 缺失 | ❌ 不需要 | Slack 功能不迁移 |
| `SlackShareDialog.tsx` | ❌ 缺失 | ❌ 不需要 | Slack 功能不迁移 |
| `SubAgentFlowDialog.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 子工作流编辑对话框 |
| `TermsOfUseDialog.tsx` | ❌ 缺失 | ❌ 未迁移 | **P3 优先级** - 使用条款对话框 |

**迁移率**: 1/12 (8%) - 不含 Slack 相关

**新增对话框** (Auto-Claude 独有):
- ✅ `AIGenerationDialog.tsx` - AI 工作流生成对话框 (244 行)
- ✅ `UserInputDialog.tsx` - 运行时用户输入对话框 (239 行)

---

### 4. 通用个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `AiGenerateButton.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - AI 生成按钮 |
| `ArgumentHintTagInput.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 参数提示标签输入 |
| `Checkbox.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 自定义复选框 |
| `ColorPicker.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 颜色选择器 |
| `EditInEditorButton.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 在编辑器中打开按钮 |
| `EditableNameField.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 可编辑名称字段 (Toolbar 需要) |
| `IndeterminateProgressBar.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 不确定进度条 |
| `ProcessingOverlay.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 处理中遮罩 |
| `ResizeHandle.t | ❌ 未迁移 | **P1 优先级** - 调整大小手柄 |
| `SimpleOverlay.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 简单遮罩 |
| `Spinner.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 加载旋转器 |
| `StyledTooltip.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 样式化提示框 |
| `TagInput.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 标签输入 |
| `Toggle.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 切换开关 |
| `ToolSelectTagInput.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 工具选择标签输入 |

**迁移率**: 0/15 (0%)

**注意**: 这些通用组件是构建高级 UI 的基础，优先实现 Toolbar 和节点所需的组件。

---

### 5. 聊天组件 (7 个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `MessageBubble.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 消息气泡 |
| `MessageInput.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 消息输入框 |
| `MessageList.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 消息列表 |
| `ProgressBar.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 进度条 |
| `SettingsDropdown.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 设置下拉菜单 |
| `ToolExecutionIndicator.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 工具执行指示器 |
| `WarningBanner.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 警告横幅 |

**迁移率**: 0/7 (0%)

**用途**: 这些组件用于 RefinementChatPanel (AI 对话式优化)，属于高级功能。

---

### 6. Toolbar 子组件 (3 个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `CopilotExecutionModeDropdown.tsx` | ❌ 缺失 | ❌ 不需要 | Copilot 功能不迁移 |
| `MoreActionsDropdown.tsx` | ❌ 缺失 | ❌ 未迁移 | **P0 优先级** - 更多操作下拉菜单 |
| `SlashCommandOptionsDropdown.tsx` | ❌ 缺失 | ❌ 未迁移 | **P0 优先级** - Slash Command 选项下拉菜单 |

**迁移率**: 0/3 (0%) - 不含 Copilot 相关

**注意**: 这些是 Toolbar 的子组件，需要在实现 Toolbar 时一并实现。

---

### 7. MCP 组件 (9 个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `McpServerList.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - MCP 服务器列表 |
| `McpToolList.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - MCP 工具列表 |
| `McpToolSearch.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - MCP 工具搜索 |
| `ParameterFormGenerator.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 动态参数表单生成器 |
| `parameters/ArrayParameter.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 数组参数输入 |
| `parameters/BooleanParameter.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 布尔参数输入 |
| `parameters/NumberParameter.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 数字参数输入 |
| `parameters/ObjectParameter.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 对象参数输入 |
| `parameters/StringParameter.tsx` | ❌ 缺失 | ❌ 未迁移 | **P1 优先级** - 字符串参数输入 |

**迁移率**: 0/9 (0%)

**注意**: MCP 后端功能已完整实现 (`mcp_invoker.py`)，但 UI 组件完全缺失，无法可视化配置 MCP 工具。

---

### 8. 模式选择组件 (6 个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `AiParameterConfigInput.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - AI 参数配置输入 |
| `AiToolSelectionInput.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - AI 工具选择输入 |
| `ModeIndicatorBadge.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 模式指示徽章 |
| `ParameterConfigModeStep.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 参数配置模式步骤 |
| `ParameterDetailedConfigStep.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 参数详细配置步骤 |
| `ToolSelectionModeStep.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 工具选择模式步骤 |

**迁移率**: 0/6 (0%)

**用途**: 这些组件用于高级 AI 配置，属于可选功能。

---

### 9. 其他组件 (5 个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `DeletableEdge.tsx` | ❌ 缺失 | ❌ 未迁移 | **P3 优先级** - 可删除的连接线 |
| `PreviewCanvas.tsx` | ❌ 缺失 | ❌ 未迁移 | **P3 优先级** - 预览画布 |
| `Tour.tsx` | ❌ 缺失 | ❌ 未迁移 | **P3 优先级** - 交互式教程 |
| `ErrorNotification.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 错误通知 |
| `DeleteButton.tsx` | ❌ 缺失 | ❌ 未迁移 | **P2 优先级** - 删除按钮 |

**迁移率**: 0/5 (0%)

---

### 10. 执行面板 (1 个)

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `ExecutionPanel.tsx` (占位符) | `ExecutionPanel.tsx` | ⚠️ 部分迁移 | **P1 优先级** - 仅 42 行占位符，需要增强 |

**迁移率**: 0/1 (0%) - 虽然文件存在，但功能不完整

**需要增强**:
- ❌ 实时执行日志流
- ❌ 节点执行状态可视化
- ❌ 进度条和百分比
- ❌ 错误行时间统计
- ❌ 日志过滤和搜索

---

## 🔄 状态管理映射

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `workflow-store.ts` | `workflow-store.ts` | ✅ 已迁移 | 工作流状态管理，已重构 |
| `refinement-store.ts` | ❌ 缺失 | ❌ 未迁移 | AI 优化状态管理 |

**差异**:
- **cc-wf-studio**: 单工作流编辑器，包含 Sub-Agent Flow 支持
- **Auto-Claude**: 多工作流管理系统，通过 Electron IPC 持久化

---

## 📦 Backend 服务映射

| cc-wf-studio | Auto-Claude | 状态 | 说明 |
|-------------|-------------|------|------|
| `claude-code-service.ts` | `ai_generator.py` | ✅ 已迁移 | AI 工作流生成 |
| `refinement-service.ts` | `ai_optimizer.py` | ✅ 已迁移 | AI 工作流优化 |
| `export-service.ts` | `api.py` | ✅ 已迁移 | 工作流导出 |
| ❌ 无 | `executpy` | ✅ 新增 | 工作流执行引擎 |
| ❌ 无 | `node_executor.py` | ✅ 新增 | 节点执行器 |
| ❌ 无 | `subagent_launcher.py` | ✅ 新增 | 子代理启动器 |
| ❌ 无 | `mcp_invoker.py` | ✅ 新增 | MCP 工具调用器 |
| `slack-api-service.ts` | ❌ 缺失 | ❌ 不需要 | Slack 功能不迁移 |
| `copilot-export-service.ts` | ❌ 缺失 | ❌ 不需要 | Copilot 功能不迁移 |

**迁移率**: 100% (核心功能)

**注意**: Auto-Claude 的 Backend 功能更强大，新增了完整的工作流执行引擎。

---

## 📊 优先级分布

### 按优先级统计

| 优先级 | 缺失组件数 | 说明 |
|--------|-----------|------|
| 🔴 P0 | 8 | Toolbar (1) + 核心节点 (6) + Toolbar 子组件 (2) |
| 🟠 P1 | 24 | MCP UI (9) + ExecutionPanel (1) + 通用组件 (15) |
| 🟡 P2 | 25 | 对话框 (8) + 聊天组件 (7) + 模式选择 (6) + 其他 (4) |
| 🟢 P3 | 6 | 高级 UI (4) + Tour (1) + 国际化 (1) |
| **总计** | **63** | |

### 按类别统计

| 类别 | 总数 | 已迁移 | 部分迁移 | 未迁移 | 迁移率 |
|------|------|--------|---------|--------|--------|
| 主布局组件 | 7 | 3 | 0 | 4 | 43% |
| 节点组件 | 11 | 3 | 0 | 8 | 27% |
| 对话框组件 | 12 | 1 | 1 | 10 | 8% |
| 通用组件 | 15 | 0 | 0 | 15 | 0% |
| 聊天组件 | 7 | 0 | 0 | 7 | 0% |
| Toolbar 子组件 | 3 | 0 | 0 | 3 | 0% |
| MCP 组件 | 9 | 0 | 0 | 9 | 0% |
| 模式选择组件 | 6 | 0 | 0 | 6 | 0% |
| 其他组件 | 5 | 0 | 0 | 5 | 0% |
| 执行面板 | 1 | 0 | 1 | 0 | 0% |
| **总计** | **75** | **7** | **2** | **66** | **12%** |

---

## 🎯 实施路线图

### Phase 1: P0 阻塞性缺漏 (2-3 周)

**目标**: 实现基本可用的工作流编辑器

1. **Toolbar 组件** (1 周)
   - EditableNameField
   - 保存/加载按钮
   - 导出/运行按钮
   - MoreActionsDropdown
   - SlashCommandOptionsDropdown

2. **6 个核心节点** (1-2 周)
   - SkillNode
   - McpNode
   - SubAgentNode
   - IfElseNode
   - SwitchNode
   - AskUserQuestionNode

### Phase 2: P1 高优先级缺漏 (1-2 周)

**目标**: 完善 MCP 集成和执行监控

1. **MCP UI 组件** (1 周)
   - McpNodeDialog
   - McpNodeEditDialog
   - ParameterFormGenerator
   - 5 个参数类型组件

2. **ExecutionPanel 增强** (3 天)
   - 实时日志流
   - 节点状态可视化
   - 进度监控

3. **通用组件** (3 天)
   - ColorPicker
   - TagInput
   - ProcessingOverlay
   - ResizeHandle

### Phase 3: P2 中优先级缺漏 (1-2 周)

**目标**: 添加高级功能

1. **AI 聊天优化** (3 天)
   - RefinementChatPanel 增强
   - 聊天组件 (7 个)

2. **Skill Browser** (2 天)
   - SkillBrowserDialog
   - Skill 搜索和选择

3. **SubAgentFlow** (3 天)
   - SubAgentFlowNode
   - SubAgentFlowDialog

### Phase 4: P3 低优先级缺漏 (1 周)

**目标**: 优化用户体验

1. **交互式教程** (2 天)
   - Tour 组件
   - 引导流程

2. **高级 UI** (2 天)
   - DescriptionPanel
   - MinimapContainer
   - InteractionModeToggle
   - DeletableEdge

3. **国际化** (2 天)
   - 迁移 cc-wf-studio 翻译
   - 集成到 Auto-Claude n---

## 📝 注意事项

### 架构差异

1. **运行环境**
   - cc-wf-studio: VSCode Extension (Webview)
   - Auto-Claude: Electron Desktop App (BrowserWindow)

2. **IPC 通信**
   - cc-wf-studio: VSCode Message Passing
   - Auto-Claude: Electron IPC

3. **工作流存储**
   - cc-wf-studio: `.vscode/workflows/` (本地文件)
   - Auto-Claude: Electron IPC + 持久化存储

4. **AI 调用**
   - cc-wf-studio: Claude Code CLI (nano-spawn)
   - Auto-Claude: Claude Agent SDK (Python)

### 不需要迁移的组件

以下组件不需要迁移到 Auto-Claude:

1. **Slack 相关** (3 个)
   - SlackConnectionRequiredDialog
   - SlackManualTokenDialog
   - Slog

2. **Copilot 相关** (1 个)
   - CopilotExecutionModeDropdown

3. **VSCode 特定** (若干)
   - 依赖 VSCode API 的功能

---

## 🔗 相关文档

- [MIGRATION_GAP_ANALYSIS.md](./MIGRATION_GAP_ANALYSIS.md) - 完整的迁移缺漏分析
- [cc-wf-studio 源代码](https://github.com/anthropics/cc-wf-studio) - 源项目
- [Auto-Claude 项目](https://github.com/zhengbingjin/Auto-Claude) - 目标项目

---

**文档维护者**: Auto-Claude Team
**最后更新**: 2026-01-24
