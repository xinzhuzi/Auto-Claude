# Git 安全与知识系统

**最后更新**: 2026-01-27

---

## 概览

Auto-Claude 的 Git 安全系统包含多层防护，防止 AI 代理执行危险的 Git 操作。

---

## 安全架构

### 4 层防御系统

| 层级 | 组件 | 说明 |
|-----|------|------|
| Layer 1 | Prompt 教育 | Git 知识文件注入到 AI 代理的 prompt 中 |
| Layer 2 | 代码验证 | `git_validators.py` 正则检测危险命令 |
| Layer 3 | 运行时钩子 | `hooks.py` 在命令执行前拦截 |
| Layer 4 | Pre-commit | 检测大规模删除，拒绝提交 |

---

## 核心文件

### 安全验证

| 文件 | 说明 |
|-----|------|
| `apps/backend/security/git_validators.py` | Git 命令验证器 |
| `apps/backend/security/hooks.py` | 运行时安全钩子 |
| `apps/backend/core/git_executable.py` | Git 执行器（环境隔离） |
| `hooks/pre-commit` | Pre-commit 钩子 |

### 知识文件

位置: `apps/backend/prompts/knowledge/git/`

| 文件 | 说明 | 优先级 |
|-----|------|--------|
| `git-safety-rules.md` | 安全规则 | 最高 |
| `git-add-safety.md` | Git Add 安全规则 | 最高 |
| `git-common-operations.md` | 常用操作 | 中等 |
| `git-error-recovery.md` | 错误恢复 | 中等 |
| `git-worktree-guide.md` | Worktree 指南 | 低 |
| `git-best-practices.md` | 最佳实践 | 低 |

---

## 禁止的危险命令

### Git 索引操作

```bash
# 绝对禁止 - 会导致所有文件被标记为删除
rm .git/index
rm -rf .git/
rm .git/index && git reset
```

### Git Add 操作

```bash
# 禁止 - 可能添加不相关文件
git add .
git add -A
git add --all
git add *
git add -u
```

### 安全替代方案

```bash
# 安全的索引恢复
rm -f .git/index.lock    # 只删除锁文件
git read-tree HEAD       # 安全重建索引

# 安全的文件添加
git add specific-file.txt    # 明确指定文件
git add file1.txt file2.txt  # 添加多个特定文件
```

---

## 验证器实现

### git_validators.py

危险 Git 操作的正则模式:

```python
DANGEROUS_GIT_PATTERNS = [
    r"\brm\s+(?:-[rf]+\s+)?\.git/index(?!\.(lock|backup))\b",
    r"\brm\s+-[rf]+\s+\.git/?(?:\s|$|;|&&|\|)",
    r"\brm\s+.*\.git/index.*(?:&&|\|\||;).*\bgit\s+reset\b",
    r"\bgit\s+rm\s+--cached\s+-r\s+\.",
]
```

禁止修改的 Git 配置:

```python
BLOCKED_GIT_CONFIG_KEYS = {
    "user.name", "user.email",
    "author.name", "author.email",
    "committer.name", "committer.email",
}
```

### hooks.py

`bash_security_hook` 在 bash 命令执行前验证安全性:
1. 检查危险 Git 操作
2. 检查命令是否在允许列表中
3. 运行额外的敏感命令验证

---

## 环境隔离

### git_executable.py

需要清除的 Git 环境变量（防止 worktree 交叉污染）:

```python
GIT_ENV_VARS_TO_CLEAR = [
    "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_AUTHOR_DATE",
    "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL", "GIT_COMMITTER_DATE",
]
```

`get_isolated_git_env()` 创建隔离的 Git 执行环境，并禁用用户的 pre-commit 钩子 (`HUSKY=0`)。

---

## 知识注入机制

### prompts.py

```python
def _load_git_knowledge(filename: str) -> str:
    """从 prompts/knowledge/git/ 加载 Git 知识文件"""
    git_knowledge_dir = PROMPTS_DIR / "knowledge" / "git"
    knowledge_file = git_knowledge_dir / filename
    if not knowledge_file.exists():
        return ""
    return knowledge_file.read_text()
```

### 动态注入

根据任务类型选择性注入知识:

| 任务类型 | 注入内容 | Token 消耗 |
|---------|---------|-----------|
| 普通代码修改 | 仅安全规则 | ~200 |
| Git 提交 | 安全规则 + 常用操作 + Add 安全 | ~1000 |
| Worktree 操作 | 安全规则 + 常用操作 + Worktree 指南 | ~1200 |
| Git 错误修复 | 安全规则 + 常用操作 + 错误恢复 | ~1300 |

---

## Git Add 安全规则

### 单次提交限制

| 限制项 | 最大值 |
|-------|-------|
| 文件数量 | 10 个 |
| 代码行数 | 500 行 |
| 删除文件 | 5 个 |

### 正确的工作流程

```bash
# 1. 查看状态
git status

# 2. 查看更改详情
git diff

# 3. 逐个添加需要的文件
git add src/feature/new-file.ts

# 4. 确认暂存内容
git diff --cached

# 5. 提交
git commit -m "auto-claude: task-id - Description"
```

---

## 历史事故

### 2025-01-13 索引损坏事故

时间线:
- 14:59:56 - Error: Unable to create '.git/index.lock'
- 14:59:58 - Attempt #1: rm -f .git/index.lock (正确)
- 15:00:04 - Attempt #2: git reset (失败)
- 15:00:06 - Attempt #3: rm .git/index && git reset (灾难!)

影响: 223,907 个文件被标记为删除

教训: 永远不要删除 `.git/index`，使用 `git read-tree HEAD` 安全恢复索引

---

## 相关文档

- [知识来源映射](./knowledge-sources.md)
- [合并上游代码指南](../合并上游代码/README.md)
