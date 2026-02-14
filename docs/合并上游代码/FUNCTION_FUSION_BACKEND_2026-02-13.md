# 后端函数级融合方案（agents/core/spec）
生成时间：2026-02-14 07:44:22
范围：冲突清单中的 `apps/backend/agents/*`、`apps/backend/core/*`、`apps/backend/spec/*`
说明：基于函数/方法哈希对比，给出融合导向建议。

---
## `apps/backend/agents/coder.py`
- 上游定义数：6 | 本地定义数：1
- 仅上游：5 | 仅本地：0 | 同名变更：1 | 同名一致：0
**上游新增函数/类/方法（建议引入）**
- `_check_and_clear_resume_file`
- `parse_rate_limit_reset_time`
- `validate_subtask_files`
- `wait_for_auth_resume`
- `wait_for_rate_limit_reset`
**同名但内容变化（需融合）**
- `run_autonomous_agent`
**融合建议**
- 以 **上游执行链路** 为基线，回填本地“计划续接/自定义执行流”相关逻辑。
- 重点检查：任务阶段解析、输出格式、异常恢复与重试。
**验证要点**
- 任务执行、计划续接、输出与错误恢复

---
## `apps/backend/agents/session.py`
- 上游定义数：3 | 本地定义数：2
- 仅上游：1 | 仅本地：0 | 同名变更：2 | 同名一致：0
**上游新增函数/类/方法（建议引入）**
- `_execute_recovery_action`
**同名但内容变化（需融合）**
- `post_session_processing`
- `run_agent_session`
**融合建议**
- 以 **上游执行链路** 为基线，回填本地“计划续接/自定义执行流”相关逻辑。
- 重点检查：任务阶段解析、输出格式、异常恢复与重试。
**验证要点**
- 任务执行、计划续接、输出与错误恢复

---
## `apps/backend/core/git_executable.py`
- 上游定义数：4 | 本地定义数：5
- 仅上游：0 | 仅本地：1 | 同名变更：2 | 同名一致：2
**本地新增函数/类/方法（建议保留）**
- `_ensure_common_paths_in_env`
**同名但内容变化（需融合）**
- `_find_git_executable`
- `get_isolated_git_env`
**融合建议**
- 以 **上游稳定性修复** 为基线，回填本地扩展（如终端/本地特性）。
- 重点检查：鉴权、客户端、工作树生命周期。
**验证要点**
- 登录鉴权、工作树创建/删除、核心 API 行为
