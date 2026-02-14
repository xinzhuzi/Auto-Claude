# 上游合并计划（2026-02-13）

## 目标
- 将 `upstream/main` 合并进当前 `main`。
- 尽量保留本地修改，同时完整引入上游新增功能。
- 把合并风险降到最低，并提供可回滚路径。

## 变更范围摘要
- 仅上游存在：162 个文件
- 仅本地存在：18216 个文件
- 双方都有且内容不同：507 个文件
- 重叠热点文件：78 个

完整清单见：`docs/合并上游代码/MERGE_DIFF_FULL_2026-02-13.txt`

## 合并原则（保留本地 + 引入新增）
- 使用 `merge`，保留历史，冲突可控。
- 上游新增文件全部引入。
- 本地新增文件全部保留。
- 同文件冲突按“冲突处理规则”执行，并记录到 `docs/合并上游代码/CONFLICT_RESOLUTION.md`。

## 冲突处理规则（优先级）
- 上游修复影响稳定性或核心流程时，优先引入上游，再恢复本地定制逻辑。
- 本地定制功能与上游逻辑冲突时，优先保留本地，再按需合并上游改动。
- 依赖与配置冲突时，优先对齐上游版本，同时保留本地新增依赖与配置项。
- 若出现行为分歧，优先保证主流程可用，再通过 feature toggle 或分支化逻辑兼容。

## 执行流程
1. 处理未提交修改：当前未提交文件 `apps/backend/spec/pipeline/agent_runner.py`，选择提交 / `git stash` / 丢弃。
2. 切换到主分支并拉取最新：`git checkout main && git pull origin main`。
3. 创建备份分支：`git branch backup/main-pre-merge-20260213`。
4. 获取上游最新：`git fetch upstream`。
5. 执行合并：`git merge upstream/main`。
6. 解决冲突：参考"冲突重点文件清单"及 `CONFLICT_RESOLUTION_LOG_2026-02-13.md`。
7. 运行验证：参考"验证清单"。
8. 收尾：`git status` 确认干净，提交合并结果并推送到 `origin/main`。

## 冲突重点文件清单
- `apps/backend/agents/coder.py`
- `apps/backend/agents/session.py`
- `apps/backend/core/auth.py`
- `apps/backend/core/worktree.py`
- `apps/backend/spec/complexity.py`
- `apps/backend/spec/pipeline/agent_runner.py`
- `apps/backend/spec/pipeline/orchestrator.py`
- `apps/frontend/src/main/agent/agent-manager.ts`
- `apps/frontend/src/main/agent/agent-process.ts`
- `apps/frontend/src/main/index.ts`
- `apps/frontend/package.json`

## 验证清单
- 后端核心流程：计划、任务、终端、工作树
- 前端核心流程：任务、终端、PR Review、Roadmap
- 关键构建与打包流程

## 回滚方案
- 直接切回备份分支：`git checkout backup/main-pre-merge-20260213`

## 验收标准
- 核心流程可用（任务、终端、工作树、PR Review、Roadmap）
- 核心构建脚本可用
- 无未解决冲突、工作区干净

