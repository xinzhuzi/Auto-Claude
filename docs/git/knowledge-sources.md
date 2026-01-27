# Git 知识库来源映射

**最后更新**: 2026-01-27

---

## 知识文件来源

### 1. git-safety-rules.md

**位置**: `apps/backend/prompts/knowledge/git/git-safety-rules.md`
**优先级**: 最高（每个 subtask 都注入）

**内容来源**:
- `apps/backend/security/git_validators.py` - 危险操作检测模式
- `apps/backend/security/hooks.py` - 运行时钩子
- `hooks/pre-commit` - 大规模删除检测

**关键内容**:
- 禁止的危险命令（`rm .git/index`, `rm -rf .git/`）
- 安全的索引恢复方法（`git read-tree HEAD`）
- 4层防御系统说明

---

### 2. git-add-safety.md (新增)

**位置**: `apps/backend/prompts/knowledge/git/git-add-safety.md`
**优先级**: 最高
**添加日期**: 2025-01-26

**关键内容**:
- 禁止的 git add 命令（`.`, `-A`, `--all`, `*`, `-u`）
- 单次提交限制（10文件/500行/5删除）
- 正确的文件添加工作流程

---

### 3. git-common-operations.md

**位置**: `apps/backend/prompts/knowledge/git/git-common-operations.md`
**优先级**: 中等（检测到 Git 关键词时注入）

**内容来源**:
- `apps/backend/core/workspace/git_utils.py` - Git 工具函数
- `apps/backend/merge/git_utils.py` - Merge Git 工具
- Git 官方文档

---

### 4. git-error-recovery.md

**位置**: `apps/backend/prompts/knowledge/git/git-error-recovery.md`
**优先级**: 中等（检测到 error/fix/recover 关键词时注入）

**内容来源**:
- ohshitgit.com - 通用 Git 错误恢复模式
- 2025-01-13 事故分析文档

---

### 5. git-worktree-guide.md

**位置**: `apps/backend/prompts/knowledge/git/git-worktree-guide.md`
**优先级**: 低（检测到 worktree 关键词时注入）

**内容来源**:
- `apps/backend/core/worktree.py` - Worktree 实现
- Git 官方文档

---

### 6. git-best-practices.md

**位置**: `apps/backend/prompts/knowledge/git/git-best-practices.md`
**优先级**: 低（检测到 setup/init/configure 关键词时注入）

**内容来源**:
- Conventional Commits 规范
- GitHub Flow 工作流

---

## 代码文件映射

### 安全系统

| 文件 | 说明 |
|-----|------|
| `apps/backend/security/git_validators.py` | Git 验证器 |
| `apps/backend/security/hooks.py` | 安全钩子 |
| `apps/backend/core/git_executable.py` | Git 执行器 |
| `hooks/pre-commit` | Pre-commit 钩子 |

### Git 工具

| 文件 | 说明 |
|-----|------|
| `apps/backend/core/workspace/git_utils.py` | Workspace Git 工具 |
| `apps/backend/merge/git_utils.py` | Merge Git 工具 |
| `apps/backend/core/worktree.py` | Worktree 管理器 |

### Prompt 系统

| 文件 | 说明 |
|-----|------|
| `apps/backend/prompts_pkg/prompts.py` | Prompt 加载器 |
| `apps/backend/prompts_pkg/prompt_generator.py` | Prompt 生成器 |

---

## 更新日志

### 2026-01-27
- 更新文档结构，简化内容
- 添加 git-add-safety.md 说明

### 2025-01-26
- 新增 `git-add-safety.md` 知识文件
- 添加 git add 安全规则和单次提交限制

### 2025-01-15
- 创建 Git 知识库
- 添加 4 层防御系统
- 记录 2025-01-13 事故

---

## 维护指南

### 更新知识文件

1. 修改 `apps/backend/prompts/knowledge/git/` 下的文件
2. 测试验证知识是否正确注入
3. 更新本文档记录来源

### 添加新知识文件

1. 在 `apps/backend/prompts/knowledge/git/` 创建文件
2. 在 `prompt_generator.py` 添加检测和注入逻辑
3. 更新本文档
