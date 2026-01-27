# Git 知识库来源映射

**创建日期**: 2025-01-15
**目的**: 记录每个 Git 知识文件的内容来源和维护指南

---

## 📋 知识文件来源

### 1. git-safety-rules.md

**文件位置**: `apps/backend/prompts/knowledge/git/git-safety-rules.md`
**大小**: 7,241 字符 (332 行)
**优先级**: 🔴 最高（每个 subtask 都注入）

**内容来源**:

| 来源 | 类型 | 贡献内容 |
|-----|------|---------|
| `apps/backend/security/git_validators.py` | 代码 | 危险操作检测模式（正则表达式） |
| `apps/backend/security/hooks.py` | 代码 | 运行时钩子实现 |
| `docs/2025-01-14-git-safety-system.md` | 文档 | 4层防御系统架构 |
| `docs/git-index-corruption-root-cause-analysis.md` | 文档 | 2025-01-13 事故分析 |
| `hooks/pre-commit` | 代码 | 大规模删除检测逻辑 |

**关键内容**:
- 禁止的危险命令（`rm .git/index`, `rm -rf .git/`）
- 安全的索引恢复方法（`git read-tree HEAD`）
- 4层防御系统说明
- 路径混淆预防
- Worktree 安全
- Git 配置保护
- 秘密扫描

**真实案例**:
- 2025-01-13: AI 代理执行 `rm .git/index` 导致 223,907 个文件被标记为删除

**维护指南**:
- 每次发现新的危险 Git 操作时更新
- 与 `git_validators.py` 中的模式保持同步
- 添加真实案例时注明日期和影响范围

---

### 2. git-common-operations.md

**文件位置**: `apps/backend/prompts/knowledge/git/git-common-operations.md`
**大小**: 10,587 字符 (564 行)
**优先级**: 🟡 中等（检测到 Git 关键词时注入）

**内容来源**:

| 来源 | 类型 | 贡献内容 |
|-----|------|---------|
| `apps/backend/core/workspace/git_utils.py` | 代码 | Git 工具函数（12个函数） |
| `apps/backend/merge/git_utils.py` | 代码 | Merge Git 工具 |
| [Git 官方文档](https://git-scm.com/doc) | 外部 | 标准 Git 命令说明 |
| Auto-Claude 工作流实践 | 内部 | 特定使用模式 |

**关键内容**:
- 基本操作（status, diff, add, commit）
- 分支管理（create, switch, delete）
- 提交操作（commit, amend）
- 文件操作（track, untrack, move, restore）
- 历史查看（log, show, blame）
- 远程操作（fetch, pull, push）
- Auto-Claude 特定操作（scoped git add, file content from ref, rename detection）

**Auto-Claude 特定功能**:
```python
# Scoped git add - 只添加特定服务目录的更改
def get_git_add_paths(scoped_services: list[str]) -> str:
    if not scoped_services:
        return "-A"  # 添加所有更改
    quoted_paths = [f'"{service}"' for service in scoped_services]
    return " ".join(quoted_paths)
```

**维护指南**:
- 添加新的 Git 工具函数时同步更新
- 保持与 `git_utils.py` 的一致性
- 添加实用示例和常见错误

---

### 3. git-error-recovery.md

**文件位置**: `apps/backend/prompts/knowledge/git/git-error-recovery.md`
**大小**: 10,240 字符 (522 行)
**优先级**: 🟡 中等（检测到 error/fix/recover 关键词时注入）

**内容来源**:

| 来源 | 类型 | 贡献内容 |
|-----|------|---------|
| [ohshitgit.com](https://ohshitgit.com) | 外部 | 通用 Git 错误恢复模式 |
| `docs/git-index-corruption-root-cause-analysis.md` | 文档 | 索引损坏事故分析 |
| `docs/git-index-corruption-fix-summary.md` | 文档 | 修复总结 |
| [Git 官方文档](https://git-scm.com/doc) | 外部 | 官方恢复方法 |

**关键内容**:
- 索引损坏恢复（安全方法 vs 危险方法）
- 锁文件问题（`.git/index.lock`）
- 合并冲突解决
- Detached HEAD 恢复
- 丢失的提交恢复（使用 reflog）
- 损坏的对象恢复
- Auto-Claude 特定事故案例

**真实案例时间线**:
```
2025-01-13 事故:
14:59:56 - Error: Unable to create '.git/index.lock'
14:59:58 - Attempt #1: rm -f .git/index.lock (正确)
15:00:04 - Attempt #2: git reset (失败 - 索引损坏)
15:00:06 - Attempt #3: rm .git/index && git reset (灾难)
15:00:07 - Attempt #4: rm -f .git/index.lock .git/index (更糟)
```

**维护指南**:
- 每次遇到新的 Git 错误时添加恢复方法
- 记录真实案例的时间线和解决方案
- 区分安全方法和危险方法

---

### 4. git-worktree-guide.md

**文件位置**: `apps/backend/prompts/knowledge/git/git-worktree-guide.md`
**大小**: 15,750 字符 (~400 行)
**优先级**: 🟢 低（检测到 worktree 关键词时注入）

**内容来源**:

| 来源 | 类型 | 贡献内容 |
|-----|------|---------|
| `apps/backend/core/worktree.py` | 代码 | Worktree 实现（1611行） |
| `docs/2025-01-14-worktree-optimization.md` | 文档 | Worktree 优化文档 |
| [Git 官方文档](https://git-scm.com/docs/git-worktree) | 外部 | Worktree 标准用法 |

**关键内容**:
- Worktree 概念和使用场景
- 基本操作（create, list, remove, prune）
- Auto-Claude 的 LFS 优化
  - 稀疏检出（sparse checkout）
  - 共享 LFS 存储
- 安全特性（大规模删除检测）
- 生命周期管理
- 最佳实践

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

**维护指南**:
- 与 `worktree.py` 的实现保持同步
- 添加新的优化特性时更新文档
- 记录磁盘空间节省的实际数据

---

### 5. git-best-practices.md

**文件位置**: `apps/backend/prompts/knowledge/git/git-best-practices.md`
**大小**: 13,084 字符 (~350 行)
**优先级**: 🟢 低（检测到 setup/init/configure 关键词时注入）

**内容来源**:

| 来源 | 类型 | 贡献内容 |
|-----|------|---------|
| [Conventional Commits](https://www.conventionalcommits.org/) | 外部 | 提交消息规范 |
| [GitHub Flow](https://guides.github.com/introduction/flow/) | 外部 | 分支管理策略 |
| Auto-Claude 工作流实践 | 内部 | 特定最佳实践 |

**关键内容**:
- 提交最佳实践（Conventional Commits）
- 分支管理策略
- 协作工作流（Pull Request, Code Review）
- 代码审查指南
- 仓库维护
- 安全最佳实践（不提交秘密）
- Auto-Claude 特定实践

**Auto-Claude 提交规范**:
```bash
# 格式: auto-claude: <subtask-id> - <description>
git commit -m "auto-claude: subtask-1-2 - Implement user authentication"
git commit -m "auto-claude: fix-subtask-1-2 - Fix login validation"
git commit -m "auto-claude: worktree-task-123 - Add new component"
```

**维护指南**:
- 根据团队实践更新最佳实践
- 添加常见错误和解决方案
- 保持与行业标准的一致性

---

## 🔄 知识更新流程

### 1. 发现新知识

**来源**:
- 代码实现中的新功能
- 真实事故和问题
- 外部资源和最佳实践
- 用户反馈和建议

### 2. 评估和分类

**评估标准**:
- 是否通用（适用于所有 Git 用户）
- 是否特定于 Auto-Claude
- 优先级（高/中/低）
- 影响范围

### 3. 更新知识文件

**步骤**:
1. 确定应该更新哪个知识文件
2. 编写清晰的说明和示例
3. 添加 Auto-Claude 特定上下文（如果适用）
4. 更新本文档记录来源

### 4. 验证和测试

**验证清单**:
- [ ] 知识文件语法正确（Markdown）
- [ ] 代码示例可执行
- [ ] 与实际代码实现一致
- [ ] 测试脚本通过

### 5. 同步到代码

**需要同步的位置**:
- `apps/backend/security/git_validators.py` - 危险操作模式
- `apps/backend/security/hooks.py` - 运行时钩子
- `hooks/pre-commit` - Pre-commit 钩子
- 相关文档

---

## 📊 知识文件统计

| 文件 | 大小 | 行数 | 优先级 | 最后更新 |
|-----|------|------|--------|---------|
| git-safety-rules.md | 7,241 | 332 | 🔴 最高 | 2025-01-15 |
| git-common-operations.md | 10,587 | 564 | 🟡 中等 | 2025-01-15 |
| git-error-recovery.md | 10,240 | 522 | 🟡 中等 | 2025-01-15 |
| git-worktree-guide.md | 15,750 | ~400 | 🟢 低 | 2025-01-15 |
| git-best-practices.md | 13,084 | ~350 | 🟢 低 | 2025-01-15 |
| **总计** | **56,902** | **~2,168** | - | - |

---

## 🔗 相关代码文件

### 安全系统

| 文件 | 说明 | 与知识库的关系 |
|-----|------|--------------|
| `apps/backend/security/git_validators.py` | Git 验证器 | 提供危险操作模式 |
| `apps/backend/security/bash_validators.py` | Bash 验证器 | 提供命令验证逻辑 |
| `apps/backend/security/hooks.py` | 安全钩子 | 提供运行时拦截 |
| `hooks/pre-commit` | Pre-commit 钩子 | 提供提交前检查 |

### Git 工具

| 文件 | 说明 | 与知识库的关系 |
|-----|------|--------------|
| `apps/backend/core/workspace/git_utils.py` | Workspace Git 工具 | 提供常用操作实现 |
| `apps/backend/merge/git_utils.py` | Merge Git 工具 | 提供合并相关操作 |
| `apps/backend/core/worktree.py` | Worktree 管理器 | 提供 Worktree 实现 |

### Prompt 系统

| 文件 | 说明 | 与知识库的关系 |
|-----|------|--------------|
| `apps/backend/prompts_pkg/prompts.py` | Prompt 加载器 | 加载知识文件 |
| `apps/backend/prompts_pkg/prompt_generator.py` | Prompt 生成器 | 动态注入知识 |

---

## 🐛 故障排查

### 问题 1: 知识文件未加载

**症状**: AI 代理不知道 Git 操作

**检查步骤**:
1. 知识文件是否存在？
   ```bash
   ls -la apps/backend/prompts/knowledge/git/
   ```

2. 文件内容是否正确？
   ```bash
   head -20 apps/backend/prompts/knowledge/git/git-safety-rules.md
   ```

3. 加载函数是否正常？
   ```python
   from prompts_pkg.prompts import _load_git_knowledge
   content = _load_git_knowledge("git-safety-rules.md")
   print(f"Loaded: {len(content)} chars")
   ```

### 问题 2: 知识与代码不一致

**症状**: 知识文件说明与实际代码行为不符

**解决方案**:
1. 检查代码最近的修改
2. 更新知识文件以匹配代码
3. 或修改代码以匹配知识文件
4. 运行测试验证一致性

### 问题 3: Token 消耗过高

**症状**: Prompt 太长，超出上下文窗口

**解决方案**:
1. 检查是否过度注入知识
2. 优化检测关键词
3. 考虑拆分大型知识文件
4. 使用更精确的注入条件

---

## 📝 维护检查清单

### 每周检查

- [ ] 检查是否有新的 Git 相关代码修改
- [ ] 检查是否有新的 Git 错误或事故
- [ ] 验证知识文件与代码的一致性

### 每月检查

- [ ] 审查所有知识文件的准确性
- [ ] 更新外部资源链接
- [ ] 检查是否有过时的内容
- [ ] 运行完整测试套件

### 重大更新后

- [ ] 更新相关知识文件
- [ ] 更新本文档的来源映射
- [ ] 运行测试验证
- [ ] 更新相关文档

---

## 🎯 未来改进方向

### 短期（本月）

1. [ ] 添加更多真实案例
2. [ ] 增强错误恢复指南
3. [ ] 添加性能优化建议

### 中期（本季度）

4. [ ] 创建交互式示例
5. [ ] 添加视频教程链接
6. [ ] 建立知识库版本控制

### 长期（本年度）

7. [ ] 支持多语言版本
8. [ ] 建立知识库自动更新机制
9. [ ] 集成到 CI/CD 流程

---

**文档创建**: 2025-01-15
**维护者**: zhengbingjin
**状态**: ✅ 活跃维护
