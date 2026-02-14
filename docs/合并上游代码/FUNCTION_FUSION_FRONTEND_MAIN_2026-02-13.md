# 前端 main 层函数级融合方案（近似为顶层符号）
生成时间：2026-02-14 07:48:49
范围：冲突清单中的 `apps/frontend/src/main/*`
说明：基于顶层符号（class/function/interface/type/enum/export const）对比，给出融合导向建议。

---
## `apps/frontend/src/main/agent/agent-manager.ts`
- 顶层符号数：上游 1 / 本地 1
- 差异统计：上游 vs 本地 约 +92 / -219 行
**融合建议**
- 以 **上游主流程** 为基线，回填本地终端/mcp/任务扩展逻辑。
- 若出现 IPC 契约变更，优先保持兼容并补全类型定义。
**验证要点**
- 启动、任务流转、终端会话、IPC 通道

---
## `apps/frontend/src/main/claude-profile/usage-monitor.ts`
- 顶层符号数：上游 10 / 本地 10
- 差异统计：上游 vs 本地 约 +15 / -61 行
**融合建议**
- 以 **上游主流程** 为基线，回填本地终端/mcp/任务扩展逻辑。
- 若出现 IPC 契约变更，优先保持兼容并补全类型定义。
**验证要点**
- 启动、任务流转、终端会话、IPC 通道

---
## `apps/frontend/src/main/index.ts`
- 顶层符号数：上游 4 / 本地 4
- 差异统计：上游 vs 本地 约 +24 / -155 行
**融合建议**
- 以 **上游主流程** 为基线，回填本地终端/mcp/任务扩展逻辑。
- 若出现 IPC 契约变更，优先保持兼容并补全类型定义。
**验证要点**
- 启动、任务流转、终端会话、IPC 通道

---
## `apps/frontend/src/main/ipc-handlers/agent-events-handlers.ts`
- 顶层符号数：上游 1 / 本地 3
- 差异统计：上游 vs 本地 约 +293 / -171 行
**本地新增顶层符号（建议保留）**
- `ExecutionPhase`
- `validateStatusTransition`
**融合建议**
- 以 **上游主流程** 为基线，回填本地终端/mcp/任务扩展逻辑。
- 若出现 IPC 契约变更，优先保持兼容并补全类型定义。
**验证要点**
- 启动、任务流转、终端会话、IPC 通道

---
## `apps/frontend/src/main/ipc-handlers/mcp-handlers.ts`
- 顶层符号数：上游 3 / 本地 3
- 差异统计：上游 vs 本地 约 +366 / -52 行
**融合建议**
- 以 **上游主流程** 为基线，回填本地终端/mcp/任务扩展逻辑。
- 若出现 IPC 契约变更，优先保持兼容并补全类型定义。
**验证要点**
- 启动、任务流转、终端会话、IPC 通道

---
## `apps/frontend/src/main/ipc-handlers/task/execution-handlers.ts`
- 顶层符号数：上游 3 / 本地 4
- 差异统计：上游 vs 本地 约 +306 / -276 行
**本地新增顶层符号（建议保留）**
- `atomicWriteFileSync`
**融合建议**
- 以 **上游主流程** 为基线，回填本地终端/mcp/任务扩展逻辑。
- 若出现 IPC 契约变更，优先保持兼容并补全类型定义。
**验证要点**
- 启动、任务流转、终端会话、IPC 通道

---
## `apps/frontend/src/main/project-initializer.ts`
- 顶层符号数：上游 12 / 本地 12
- 差异统计：上游 vs 本地 约 +25 / -30 行
**融合建议**
- 以 **上游主流程** 为基线，回填本地终端/mcp/任务扩展逻辑。
- 若出现 IPC 契约变更，优先保持兼容并补全类型定义。
**验证要点**
- 启动、任务流转、终端会话、IPC 通道
