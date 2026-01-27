# Git 知识库

**创建日期**: 2025-01-15
**目的**: 为 Auto-Claude AI 代理提供 Git 操作知识，防止危险操作

---

## 📋 概览

Auto-Claude 在执行任务时需要了解 Git 相关知识，以便：
1. 安全地执行 Git 操作
2. 避免危险命令（如 `rm .git/index`）
3. 正确处理 Git 错误
4. 遵循 Git 最佳实践

本知识库采用简单的文件加载方式，而非复杂的 Skills 系统。

---

## 📁 文件结构

### 实际知识库位置

**路径**: `/Users/zhengbingjin/Project/Github/Auto-Claude/apps/backend/prompts/knowledge/git/`

这是 AI 代理实际使用的知识库文件位置。

```
apps/backend/prompts/knowledge/git/
├── git-safety-rules.md          # Git 安全规则（核心，必须注入）
├── git-common-operations.md     # 常用 Git 操作
├── git-error-recovery.md        # Git 错误恢复
├── git-worktree-guide.md        # Worktree 使用指南
└── git-best-practices.md        # Git 最佳实践
```

### 备份文档位置

**路径**: `/Users/zhengbingjin/Project/Github/Auto-Claude/docs/git知识库/`

本目录（`docs/git知识库/`）仅作为备份和说明文档，不被 AI 代理直接使用。

---

## 📚 知识文件说明

### 1. git-safety-rules.md (332行)

**优先级**: 🔴 最高（每个 subtask 都注入）

**内容**:
- 禁止的危险命令（`rm .git/index`, `rm -rf .git/`）
- 安全的索引恢复方法（`git read-tree HEAD`）
- Auto-Claude 的 4 层防御系统
- 路径混淆预防
- Worktree 安全
- Git 配置保护（防止修改 user.name/email）
- 秘密扫描

**来源**:
- `apps/backend/security/git_validators.py` - 危险操作检测模式
- `apps/backend/security/hooks.py` - 运行时钩子
- `docs/2025-01-14-git-safety-system.md` - 安全系统文档
- `docs/git-index-corruption-root-cause-analysis.md` - 2025-01-13 事故分析

**真实案例**:
- 2025-01-13: AI 代理执行 `rm .git/index` 导致 223,907 个文件被标记为删除

---

### 2. git-common-operations.md (564行)

**优先级**: 🟡 中等（检测到 Git 关键词时注入）

**内容**:
- 基本操作（status, diff, add, commit）
- 分支管理（create, switch, delete）
- 提交操作（commit, amend）
- 文件操作（track, untrack, move, restore）
- 历史查看（log, show, blame）
- 远程操作（fetch, pull, push）
- Auto-Claude 特定操作（scoped git add, file content from ref, rename detection）

**来源**:
- `apps/backend/core/workspace/git_utils.py` - Git 工具函数（12个函数）
- `apps/backend/merge/git_utils.py` - Merge Git 工具
- Git 官方文档

**Auto-Claude 特定功能**:
```python
# Scoped git add - 只添加特定服务目录的更改
def get_git_add_paths(scoped_services: list[str]) -> str:
    if not scoped_services:
        return "-A"  # 添加所有更改
    quoted_paths = [f'"{service}"' for service in scoped_services]
    return " ".join(quoted_paths)
```

---

### 3. git-error-recovery.md (522行)

**优先级**: 🟡 中等（检测到 error/fix/recover 关键词时注入）

**内容**:
- 索引损坏恢复（安全方法 vs 危险方法）
- 锁文件问题（`.git/index.lock`）
- 合并冲突解决
- Detached HEAD 恢复
- 丢失的提交恢复（使用 reflog）
- 损坏的对象恢复
- Auto-Claude 特定事故案例

**来源**:
- [ohshitgit.com](https://ohshitgit.com) - 通用 Git 错误恢复模式
- `docs/git-index-corruption-root-cause-analysis.md` - 事故分析
- `docs/git-index-corruption-fix-summary.md` - 修复总结
- Git 官方文档

**真实案例**:
```
2025-01-13 事故时间线:
14:59:5or: Unable to create '.git/index.lock'
14:59:58 - Attempt #1: rm -f .git/index.lock (正确)
15:00:04 - Attempt #2: git reset (失败 - 索引损坏)
15:00:06 - Attempt #3: rm .git/index && git reset (灾难)
15:00:07 - Attempt #4: rm -f .git/index.lock .git/index (更糟)
```

---

### 4. git-worktree-guide.md (约400行)

**优先级**: 🟢 低（检测到 worktree 关键词时注入）

**内容**:
- Worktree 概念和使用场景
- 基本操作（create, list, remove, prune）
- Auto-Claude 的 LFS 优化
  - 稀疏检出（sparse checkout）
  - 共享 LFS 存储
- 安全特性（大规模删除检测）
- 生命周期管理
- 最佳实践

**来源**:
- `apps/backend/core/worktree.py` - Worktree 实现（1611行）
- `docs/2025-01-14-worktree-optimization.md` - Worktree 优化文档
- Git 官方文档

**Auto-Claude 特定优化**:
```python
# LFS 项目检测
def _is_lfs_project(self) -> bool:
    # 检查 .gitattributes 是否包含 filter=lfs
    # 检查 .git/lfs 目录是否存在

# 稀疏检出配置（节省 70-90% 磁盘空间）
def _setup_sparse_checkout(self, worktree_path: Path):
    # 只包含必要文件（源代码、配置、文档）
    # 排除大型二进制文件

# 共享 LFS 存储（去重）
def _setup_lfs_shared_storage(self, worktree_path: Path):
    # 所有 worktree 共享同一个 LFS 存储

# 大规模删除检测
if deleted_count > total_files * 0.5:
    print("ERROR: Refusing to commit - mass deletion detected!")
    return False
```

---

### 5. git-best-practices.md (约350行)

**优先级**: 🟢 低（检测到 setup/init/configure 关键词时注入）

**内容**:
- 提交最佳实践（Conventional Commits）
- 分支管理策略
- 协作工作流（Pull Request, Code Review）
- 代码审查指南
- 仓库维护
- 安全最佳实践（不提交秘密）
- Auto-Claude 特定实践

**来源**:
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- Auto-Claude 工作流实践

**Auto-Claude 提交规范**:
```bash
# 格式: auto-claude: <subtask-id> - <description>
git commit -m "auto-claude: subtask-1-2 - Implement user authentication"
git commit -m "auto-claude: fix-subtask-1-2 - Fix login validation"
git commit -m "auto-claude: worktree-task-123 - Add new component"
```

---

## 🔧 集成方式

### 代码位置

**加载函数**: `apps/backend/prompts_pkg/prompts.py`
```python
def _load_git_knowledge(filename: str) -> str:
    """从 knowledge/git/ 加载 Git 知识文件"""
    git_knowledge_dir = PROMPTS_DIR / "knowledge" / "git"
    knowledge_file = git_knowledge_dir / filename
    if not knowledge_file.exists():
        return ""
    return knowledge_file.read_text()
```

**安全规则生成**: `apps/backend/prompts_pkg/prompt_generator.py`
```python
def generate_git_safety_rules() -> str:
    """生成 Git 安全规则（从知识库加载，回退到硬编码）"""
    from .prompts import _load_git_knowledge
    safety_rules = _load_git_knowledge("git-safety-rules.md")
    if safety_rules:
        return safety_rules
    # 回退到硬编码版本
    return """..."""
```

**检测函数**: `apps/backend/prompts_pkg/prompt_generator.py`
```python
def _needs_git_knowledge(subtask: dict) -> bool:
    """检测 subtask 是否涉及 Git 操作"""
    git_keywords = [
        "git", "commit", "branch", "merge", "rebase", "push", "pull",
        "checkout", "stash", "cherry-pick", "worktree", "repository",
        "repo", "clone", "fetch", "remote", "tag", "log", "diff",
        "reset", "revert", "index", ".git"
    ]
    description = subtask.get("description", "").lower()
    ssubtask.get("id", "").lower()
    return any(keyword in description or keyword in subtask_id
               for keyword in git_keywords)
```

**动态注入**: `apps/backend/prompts_pkg/prompt_generator.py`
```python
def generate_subtask_prompt(...) -> str:
    sections = []

    # 1. 环境上下文
    sections.append(generate_environment_context(project_dir, spec_dir))

    # 2. Git 安全规则（每个 subtask 都注入）
    sections.append(generate_git_safety_rules())

    # 3. 动态 Git 知识注入（按需）
    if _needs_git_knowledge(subtask):
        # 3.1 常用操作（总是包含）
        common_o_load_git_knowledge("git-common-operations.md")
        if common_ops:
            sections.append(common_ops)

        # 3.2 Worktree 指南（如果提到 worktree）
        if "worktree" in description.lower():
            worktree_guide = _load_git_knowledge("git-worktree-guide.md")
            if worktree_guide:
                sections.append(worktree_guide)

        # 3.3 错误恢复（如果提到 error/fix/recover）
        error_keywords = ["error", "fix", "recover", "corrupt", "broken"]
        if any(keyword in description.lower() for keyword in error_keywords):
            error_recovery = _load_git_knowledge(-recovery.md")
            if error_recovery:
                sections.append(error_recovery)

        # 3.4 最佳实践（如果提到 setup/init/configure）
        setup_keywords = ["setup", "init", "configure", "install", "create"]
        if any(keyword in description.lower() for keyword in setup_keywords):
            best_practices = _load_git_knowledge("git-best-practices.md")
            if best_practices:
                sections.append(best_practices)

    # ... 其他部分
    return "\n\n".join(sections)
```

---

## 📊 Token 消耗估算

| 场景 | 注入内容 | 预计 Token |
|-----|---------|------------ 无 Git 操作的任务 | 仅安全规则 | ~200 tokens |
| 简单 Git 操作 | 安全规则 + 常用操作 | ~800 tokens |
| Worktree 操作 | 安全规则 + 常用操作 + Worktree 指南 | ~1,200 tokens |
| Git 错误修复 | 安全规则 + 常用操作 + 错误恢复 | ~1,300 tokens |
| Git 初始化设置 | 安全规则 + 常用操作 + 最佳实践 | ~1,100 tokens |

**优化策略**:
- 按需加载：只在检测到 Git 关键词时注入知识
- 分层注入：根据任务类型选择性注入不同知识文件
- 回退机制：知识文件缺失时使用硬编码版本

---

## 🎯 使用场景

### 场景 1: 普通代码修改任务

**Subtask**: "修改 user.py 添加验证逻辑"

**注入内容**:
- ✅ Git 安全规则（总是注入）
- ❌ 其他 Git 知识（不涉及 Git 操作）

**Token 消耗**: ~200 tokens

---

### 场景 2: Git 提交任务

**Subtask**: "提交代码更改并推送到远程仓库"

**注入内容**:
- ✅ Git 安全规则
常用操作

**Token 消耗**: ~800 tokens

---

### 场景 3: Worktree 任务

**Subtask**: "在 worktree 中实现新功能"

**注入内容**:
- ✅ Git 安全规则
- ✅ Git 常用操作
- ✅ Worktree 指南

**Token 消耗**: ~1,200 tokens

---

### 场景 4: Git 错误修复

**Subtask**: "修复 Git 索引损坏错误"

**注入内容**:
- ✅ Git 安全规则
- ✅ Git 常用操作
- ✅ 错误恢复指南

**Token 消耗**: ~1,300 tokens

---

## 🔒 安全保障

### 4 层防御系统

**Layer 1: Prompt 教育**
- 每个 subtask 都注入 Git 安全规则
- 明确列出禁止的命令
- 提供安全的替代方案

**Layer 2: 代码验证**
- `apps/backend/security/git_validators.py`
- 正则表达式检测危险命令
- 在代码生成阶段拦截

**Layer 3: 运行时钩子**
- `apps/backend/security/hooks.py`
- 在命令执行前拦截
- 阻止危险操作

**Layer 4: Pre-commit 钩子**
- `hooks/pre-commit`
- 检测大规模删除（>50% 文件）
- 拒绝提交

---

## 📝 维护指南

### 更新知识文件

1. **修改实际文件**:
   ```bash
   cd /Users/zhengbingjin/Project/Github/Auto-Claude
   vim apps/backend/prompts/knowledge/git/git-safety-rules.md
   ```

2. **测试验证**:
   - 创建包含 Git 操作的测试 subtask
   - 验证知识是否正确注入
   - 检查 AI 代理是否遵循规则

3. **更新文档**:
   - 更新本 README.md
   - 更新 `knowledge-sources.md`
   - 记录更改原因和日期

### 添加新知识文件

1. **创建文件**:
   ```bash
   touch apps/backend/prompts/knowledge/git/git-new-topic.md
   ```

2. **编写内容**:
   - 使用英文
   - 包含实用示例
   - 添加 Auto-Claude 特定上下文

3. **修改注入逻辑**:
   - 在 `prompt_generator.py` 的 `generate_subtask_prompt()` 中添加检测和注入逻辑

4. **更新文档**:
   - 在本 README.md 中添加说明
   - 更新 `knowledge-sources.md`

---

## 🐛 故障排查

### 问题 1: Git 知识未注入

**症状**: AI 代理不知道 Git 操作

**检查**:
1. 知识文件是否存在？
   ```bash
   ls -la apps/backend/prompts/knowledge/git/
   ```

2. 检测函数是否正确？
   ```python
   # 在 prompt_generator.py 中添加调试输出
   if _needs_git_knowledge(subtask):
       print(f"✅ Git knowledge detected for: {subtask_id}")
   ```

3. 文件是否正确加载？
   ```python
   # 在 prompts.py 中添加调def _load_git_knowledge(filename: str) -> str:
       content = knowledge_file.read_text()
       print(f"✅ Loaded {filename}: {len(content)} chars")
       return content
   ```

---

### 问题 2: Token 消耗过高

**症状**: Prompt 太长，超出上下文窗口

**解决方案**:
1. 检查是否过度注入知识
2. 优化检测关键词
3. 考虑拆分大型知识文件

---

### 问题 3: AI 仍然执行危险命令

**症状**: AI 代理执行了 `rm .git/index`

**检查**:
1. Git 安全规则是否注入？
2. 代码验证器是否启用？
3. 运行时钩子是否工作？
4. Pre-commit 钩子是否安装？

**紧急措施**:
```bash
# 立即停止 AI 代理
# 检查 Git 状态
git status

# 如果发现大规模删除
git reset --hard HEAD@{1}  # 恢复到上一个状态
```

---

## 📚 相关文档

### Auto-Claude 文档

- **安全系统**: `/docs/2025-01-14-git-safety-system.md`
- **事故分析**: `/docs/git-index-corruption-root-cause-analysis.md`
- **Worktree 优化**: `/docs/2025-01-14-worktree-optimization.md`

### 代码参考

- **Git 验证器**: `apps/backend/security/git_validators.py`
- **安全钩子**: `apps/backend/security/hooks.py`
- **Worktree 管理**: `apps/backend/core/worktree.py`
- **Git 工具**: `apps/backend/core/workspace/git_utils.py`

### 外部资源

- [Git 官方文档](https://git-scm.com/doc)
- [Oh Shit, Git!?!](https://ohshitgit.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

---

**最后更新**: 2025-01-15
**维护者**: zhengbingjin
**状态**: ✅ 已实施并测试
