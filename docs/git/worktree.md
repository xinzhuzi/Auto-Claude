# Worktree 优化指南

## 概述

Auto-Claude 使用 Git Worktree 来隔离任务的代码修改。本文档记录了 worktree 的优化策略和使用方式。

## 默认行为变更

从最新版本开始，**默认不使用 worktree**（直接模式）：

- 更快的任务启动速度
- 减少磁盘空间占用
- 适合小型项目和快速迭代

用户可以在创建任务时通过 "Git 选项" 手动启用 worktree。

## 使用 Worktree 的场景

建议在以下场景启用 worktree：

1. **多任务并行** - 同时处理多个独立任务
2. **风险较高的修改** - 需要在合并前仔细审查
3. **团队协作** - 需要创建 PR 进行代码审查

## 大型项目优化

对于大型仓库（如 monorepo），提供了以下优化：

### 1. 稀疏检出 (Sparse Checkout)

只检出需要的目录，减少磁盘占用：

```python
from core.worktree import WorktreeManager

manager = WorktreeManager(project_dir)

# 使用自动检测的模式
info = manager.create_worktree_optimized("my-task")

# 或指定特定目录
info = manager.create_worktree_optimized(
    "my-task",
    sparse_patterns=["src/", "package.json", "tsconfig.json"]
)
```

### 2. 共享对象存储

Git worktree 天然共享 `.git/objects`，无需额外配置。这意味着：

- 不会复制整个仓库历史
- 多个 worktree 共享相同的 Git 对象
- 显著减少磁盘空间占用

### 3. 禁用稀疏检出

如果需要访问完整的工作树：

```python
manager.disable_sparse_checkout("my-task")
```

## API 参考

### WorktreeManager

```python
class WorktreeManager:
    def __init__(self, project_dir: Path, base_branch: str | None = None):
        """初始化 worktree 管理器"""

    def create_worktree(self, spec_name: str) -> WorktreeInfo:
        """创建标准 worktree"""

    def create_worktree_optimized(
        self,
        spec_name: str,
        sparse_patterns: list[str] | None = None,
        use_sparse_checkout: bool = True,
    ) -> WorktreeInfo:
        """创建优化的 worktree（支持稀疏检出）"""

    def disable_sparse_checkout(self, spec_name: str) -> bool:
        """禁用稀疏检出，恢复完整工作树"""

    def get_or_create_worktree(self, spec_name: str) -> WorktreeInfo:
        """获取或创建 worktree"""

    def remove_worktree(self, spec_name: str, delete_branch: bool = False) -> None:
        """删除 worktree"""
```

## 前端界面

在任务创建向导中：

1. 点击 "Git 选项（可选）"
2. 勾选 "使用隔离的工作空间（推荐）" 启用 worktree
3. 可选择基础分支

## 相关文件

- `apps/backend/core/worktree.py` - 后端 worktree 管理器
- `apps/frontend/src/renderer/components/TaskCreationWizard.tsx` - 前端任务创建向导
- `apps/frontend/src/shared/i18n/locales/*/tasks.json` - 翻译文件
