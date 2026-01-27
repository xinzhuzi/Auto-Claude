# Worktree 完整指南

## 概述

Auto-Claude 使用 Git Worktree 来隔离任务的代码修改。本文档包含 worktree 的使用指南、集成说明和功能路线图。

---

## 一、基础使用

### 1.1 默认行为

从最新版本开始，**默认不使用 worktree**（直接模式）：

- 更快的任务启动速度
- 减少磁盘空间占用
- 适合小型项目和快速迭代

用户可以在创建任务时通过 "Git 选项" 手动启用 worktree。

### 1.2 使用 Worktree 的场景

建议在以下场景启用 worktree：

1. **多任务并行** - 同时处理多个独立任务
2. **风险较高的修改** - 需要在合并前仔细审查
3. **团队协作** - 需要创建 PR 进行代码审查

### 1.3 前端界面

在任务创建向导中：

1. 点击 "Git 选项（可选）"
2. 勾选 "使用隔离的工作空间（推荐）" 启用 worktree
3. 可选择基础分支

---

## 二、大型项目优化

### 2.1 稀疏检出 (Sparse Checkout)

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

### 2.2 共享对象存储

Git worktree 天然共享 `.git/objects`，无需额外配置：

- 不会复制整个仓库历史
- 多个 worktree 共享相同的 Git 对象
- 显著减少磁盘空间占用

### 2.3 禁用稀疏检出

如果需要访问完整的工作树：

```python
manager.disable_sparse_checkout("my-task")
```

---

## 三、API 参考

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

---

## 四、AI 任务优化功能 ✅ 已实现

### 4.1 功能概述

在任务创建界面添加"AI 优化描述"按钮，点击后 AI 会：
1. 优化用户输入的任务描述（提示词优化）
2. 分析任务特征，给出是否使用 worktree 的推荐

### 4.2 已创建的文件

#### 后端
- `apps/backend/api/task_optimize_helper.py` - 任务优化 API
- `apps/backend/core/worktree_helper.py` - Worktree 推荐辅助函数

#### 前端
- `apps/frontend/src/renderer/components/TaskOptimizeHelper.tsx` - 优化按钮组件和 hook
- `apps/frontend/src/shared/types/task-optimize.ts` - 类型定义
- `apps/frontend/src/renderer/lib/mocks/task-optimize-mock.ts` - 浏览器 mock
- `apps/frontend/src/main/task-optimize-helper.ts` - Electron main 进程 helper

### 4.3 已完成的集成

| 步骤 | 文件 | 说明 |
|------|------|------|
| ✅ | `ipc.ts` | 添加 API 类型和 `optimizeTaskDescription` 方法 |
| ✅ | `mocks/index.ts` | 导出 mock |
| ✅ | `browser-mock.ts` | 添加 mock |
| ✅ | `TaskFormFields.tsx` | 添加 `descriptionLabelExtra` prop |
| ✅ | `TaskCreationWizard.tsx` | 集成优化功能 |
| ✅ | `zh-CN/tasks.json` | 添加中文翻译 |
| ✅ | `en/tasks.json` | 添加英文翻译 |
| ✅ | `ipc.ts` (constants) | 添加 `TASK_OPTIMIZE_DESCRIPTION` channel |
| ✅ | `task-api.ts` (preload) | 添加 preload API |
| ✅ | `execution-handlers.ts` | 添加 IPC handler |

### 4.4 AI 推荐 Worktree 的场景

| 场景 | 检测方式 | 推荐原因 |
|------|----------|----------|
| **设计/文档类任务** | 任务描述包含"设计"、"文档"等关键词，且目标文件夹包含大量文本内容（>50个文件） | 纯文本操作但影响范围大，需要隔离 |
| **大面积重构** | 任务描述包含"重构"、"refactor"、"migration"等关键词 | 高风险修改，需要安全回滚能力 |
| **复杂度高** | AI 分析任务描述，判断涉及多个模块、多文件修改 | 复杂任务需要隔离审查 |
| **用户明确要求** | 任务描述中包含"worktree"、"隔离"、"独立分支"等关键词 | 尊重用户意图 |

### 4.5 使用方式

1. 启动开发服务器
2. 打开任务创建对话框
3. 输入任务描述
4. 点击 "AI 优化描述" 按钮
5. 验证描述被优化
6. 验证 Worktree 推荐提示显示
7. 验证自动勾选 Worktree 选项（如果 AI 推荐）

---

## 五、功能路线图

### 5.1 当前状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 基础 worktree 管理 | ✅ 已实现 | 创建、删除、列表 |
| 稀疏检出优化 | ✅ 已实现 | 大型项目支持 |
| PR 创建 | ✅ 已实现 | push + gh pr create |
| 分支合并 | ✅ 已实现 | merge_worktree() |
| 默认不使用 worktree | ✅ 已实现 | 前端默认关闭 |
| AI 任务优化按钮 | ✅ 已实现 | 优化描述 + worktree 推荐 |

### 5.2 未实现功能

| 功能 | 优先级 | 复杂度 | 状态 |
|------|--------|--------|------|
| Unity 任务策略 | 中 | 中 | 📋 设计中 |
| QA 合并流程 | 高 | 高 | 📋 设计中 |
| 验证失败恢复 | 高 | 中 | 📋 设计中 |

---

## 六、Unity 项目支持（设计中）

### 6.1 问题描述

Unity 项目有特殊的文件结构（.meta 文件、大型二进制资源），需要特殊处理。

### 6.2 设计方案

```python
def detect_unity_project(project_dir: Path) -> bool:
    """检测是否为 Unity 项目"""
    unity_indicators = [
        "Assets/",
        "ProjectSettings/",
        "Packages/manifest.json",
    ]
    return any((project_dir / ind).exists() for ind in unity_indicators)

def get_unity_sparse_patterns(task_description: str) -> list[str]:
    """为 Unity 项目生成稀疏检出模式"""
    patterns = [
        "ProjectSettings/",
        "Packages/",
        "Assets/Scripts/",
    ]
    # 解析任务描述中提到的路径
    path_matches = re.findall(r"Assets/[a-zA-Z0-9_\-/]+", task_description)
    for path in path_matches:
        patterns.append(path)
        if not path.endswith("/"):
            patterns.append(path + ".meta")
    return patterns
```

---

## 七、QA 验证阶段合并流程（设计中）

### 7.1 问题描述

当前 QA 验证在 worktree 分支上进行，但某些测试（如 E2E 测试）可能需要在合并后的状态下运行。

### 7.2 合并策略

```python
class QAMergeStrategy(str, Enum):
    IN_WORKTREE = "in_worktree"      # 在 worktree 中验证（默认）
    MERGE_PREVIEW = "merge_preview"   # 合并预览后验证
    STAGED_MERGE = "staged_merge"     # 暂存合并后验证
```

### 7.3 流程设计

```
1. 创建临时合并分支
2. 合并 worktree 分支到临时分支
3. 在临时分支上运行 QA
4. 根据结果决定是否保留合并
```

---

## 八、验证失败后修复流程（设计中）

### 8.1 恢复操作类型

```python
class QAFailureAction(str, Enum):
    CONTINUE_FIXING = "continue"    # 继续修复
    ROLLBACK_MERGE = "rollback"     # 回滚合并
    ESCALATE_HUMAN = "escalate"     # 升级人工
    ABORT_TASK = "abort"            # 中止任务
```

### 8.2 恢复策略规则

| 条件 | 推荐操作 |
|------|----------|
| 合并冲突 | 回滚合并 |
| 重复问题 | 升级人工 |
| 迭代次数 ≥ 10 | 升级人工 |
| 预览状态 | 回滚后继续 |
| 默认 | 继续修复 |

---

## 九、相关文件

| 文件 | 说明 |
|------|------|
| `apps/backend/core/worktree.py` | Worktree 管理器 |
| `apps/backend/core/worktree_helper.py` | Worktree 推荐策略 |
| `apps/backend/api/task_optimize_helper.py` | 任务优化 API |
| `apps/backend/qa/loop.py` | QA 循环 |
| `apps/frontend/src/renderer/components/TaskCreationWizard.tsx` | 前端任务创建向导 |
| `apps/frontend/src/renderer/components/TaskOptimizeHelper.tsx` | 优化按钮组件 |
| `apps/frontend/src/shared/types/task-optimize.ts` | 类型定义 |
| `apps/frontend/src/main/task-optimize-helper.ts` | Electron main 进程 helper |

---

## 十、实现优先级

### 第一阶段（已完成）

1. ✅ **AI 任务优化按钮** - 低复杂度，高价值
   - 实现 `optimize_task_description()` API
   - 前端集成优化按钮和推荐提示

### 第二阶段（高优先级）

2. **验证失败后修复流程** - 中复杂度，高价值
   - 实现 `QARecoveryState` 分析
   - 实现回滚功能

3. **QA 验证阶段合并流程** - 高复杂度，中价值
   - 实现 `run_qa_with_merge_preview()`
   - 添加配置选项

### 第三阶段（中优先级）

4. **Unity 任务最佳分支策略** - 中复杂度，低价值（特定用户）
   - 实现 Unity 项目检测
   - 实现 Unity 稀疏检出模式
