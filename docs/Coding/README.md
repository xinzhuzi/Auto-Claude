# Coding 阶段文档

本目录包含 Auto-Claude Coding 阶段的完整文档。

## 文档列表

| 文档 | 说明 |
|------|------|
| [01-coding-phases.md](./01-coding-phases.md) | Coding 阶段流程详解 |
| [02-upstream-modifications.md](./02-upstream-modifications.md) | 上游修改记录（子任务拆分等） |
| [03-recovery-guide.md](./03-recovery-guide.md) | 恢复指南 |

## 快速导航

### 了解 Coding 阶段结构
→ [01-coding-phases.md](./01-coding-phases.md)
- 执行阶段枚举 (ExecutionPhase)
- Phase 和 Subtask 数据结构
- 验证机制
- 会话管理
- 执行流程图

### 了解上游修改
→ [02-upstream-modifications.md](./02-upstream-modifications.md)
- 子任务大小检测
- 高风险模式识别
- 自动拆分策略（矩阵/数量/组合任务）
- 错误检测和恢复

### 遇到问题需要恢复
→ [03-recovery-guide.md](./03-recovery-guide.md)
- 状态诊断
- 常见问题恢复
- Git 恢复
- 手动恢复代码片段
- 验证脚本

## 相关目录

- [Planning 文档](../Planning/) - Plan 阶段文档
- [Git 文档](../git/) - Git 和 Worktree 相关文档
