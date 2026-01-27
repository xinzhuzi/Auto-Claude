# Auto-Claude Coding 阶段 - 完整文档

> **版本**: 1.0
> **更新日期**: 2025-01-27
> **目的**: 记录 Coding 阶段的结构和所有小阶段的含义

---

## 目录

1. [执行阶段概述](#执行阶段概述)
2. [Coding 阶段结构](#coding-阶段结构)
3. [PhaseType 类型详解](#phasetype-类型详解)
4. [编号阶段 (Phase 1, 2, 3...)](#编号阶段-phase-1-2-3)
5. [子任务状态](#子任务状态)
6. [阶段配置](#阶段配置)

---

## 执行阶段概述

Auto-Claude 的任务执行分为 6 个主要阶段（ExecutionPhase）：

| 阶段 | 枚举值 | 说明 |
|------|--------|------|
| **空闲** | `idle` | 任务未开始 |
| **规划** | `planning` | 分析需求，生成实现计划 |
| **编码** | `coding` | 执行实现计划中的子任务 |
| **QA审查** | `qa_review` | 代码审查和质量检查 |
| **QA修复** | `qa_fixing` | 修复发现的问题 |
| **完成** | `complete` | 任务成功完成 |
| **失败** | `failed` | 任务执行失败 |

**代码位置**:
- 后端: `apps/backend/core/phase_event.py`
- 前端: `apps/frontend/src/shared/constants/phase-protocol.ts`

---

## Coding 阶段结构

Coding 阶段是执行实现计划的核心阶段。在这个阶段中，任务被组织成多个**编号阶段**（Phase 1, Phase 2, Phase 3...），每个编号阶段包含一组相关的子任务。

### 层级结构

```
ExecutionPhase: coding
│
├── Phase 1 (编号阶段)
│   ├── type: PhaseType (e.g., SETUP)
│   ├── subtasks: [...]
│   └── depends_on: []
│
├── Phase 2
│   ├── type: PhaseType
│   ├── subtasks: [...]
│   └── depends_on: [1]
│
└── Phase 3
    ├── type: PhaseType
    ├── subtasks: [...]
    └── depends_on: [2]
```

### Phase 数据结构

```python
@dataclass
class Phase:
    phase: int              # 编号 (1, 2, 3...)
    name: str               # 阶段名称
    type: PhaseType         # 阶段类型
    subtasks: list[Subtask] # 子任务列表
    depends_on: list[int]   # 依赖的阶段编号
    parallel_safe: bool     # 是否可并行执行
```

**代码位置**: `apps/backend/implementation_plan/phase.py`

---

## PhaseType 类型详解

每个编号阶段都有一个 `PhaseType`，定义该阶段的性质和目的。

### 1. SETUP - 环境准备阶段

**用途**: 建立开发环境，准备依赖

**典型任务**:
- 安装依赖包 (`npm install`, `pip install`)
- 配置文件初始化
- 环境变量设置
- 创建必要的目录结构

**示例**:
```json
{
  "phase": 1,
  "name": "Environment Setup",
  "type": "setup"
}
```

### 2. IMPLEMENTATION - 实现阶段

**用途**: 核心功能代码实现

**典型任务**:
- 创建新的组件/模块
- 实现业务逻辑
- 编写算法
- 数据模型定义

**示例**:
```json
{
  "phase": 2,
  "name": "Feature Implementation",
  "type": "implementation"
}
```

### 3. INVESTIGATION - 调研阶段

**用途**: 代码库分析、问题诊断、技术调研

**典型任务**:
- 分析现有代码结构
- 查找相关函数/类
- 调查 bug 根因
- API 调研

**示例**:
```json
{
  "phase": 3,
  "name": "Code Investigation",
  "type": "investigation"
}
```

### 4. INTEGRATION - 集成阶段

**用途**: 将各部分整合到一起

**典型任务**:
- 模块间连接
- API 对接
- 数据流集成
- 系统级测试

**示例**:
```json
{
  "phase": 4,
  "name": "Integration",
  "type": "integration"
}
```

### 5. CLEANUP - 清理阶段

**用途**: 代码清理、优化、收尾

**典型任务**:
- 删除未使用的代码
- 代码格式化
- 性能优化
- 添加注释

**示例**:
```json
{
  "phase": 5,
  "name": "Code Cleanup",
  "type": "cleanup"
}
```

---

## 编号阶段 (Phase 1, 2, 3...)

编号阶段是执行计划中的具体阶段分组。它们按顺序执行，每个阶段完成后再进入下一阶段。

### 阶段依赖

使用 `depends_on` 字段定义依赖关系：

```python
# Phase 2 依赖 Phase 1
Phase(
    phase=2,
    name="Implementation",
    depends_on=[1]  # 等待 Phase 1 完成
)
```

### 并行执行

如果 `parallel_safe=True`，多个阶段可以并行执行：

```python
Phase(
    phase=3,
    name="Feature A",
    parallel_safe=True  # 可与其他并行阶段同时执行
)
```

### 典型执行流程

```
Phase 1 (SETUP)
       ↓
Phase 2 (INVESTIGATION)
       ↓
Phase 3 (IMPLEMENTATION)
       ↓
Phase 4 (INTEGRATION)
       ↓
Phase 5 (CLEANUP)
```

---

## 子任务状态

每个阶段内的子任务有以下状态：

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `in_progress` | 正在执行 |
| `completed` | 已完成 |
| `blocked` | 被阻塞（有未满足的依赖） |
| `failed` | 执行失败 |

**代码位置**: `apps/backend/implementation_plan/subtask.py`

---

## 阶段配置

不同阶段可以配置不同的模型和思考级别：

```python
DEFAULT_PHASE_MODELS: dict[str, str] = {
    "spec": "sonnet",      # 需求规格阶段
    "planning": "sonnet",  # 规划阶段
    "coding": "sonnet",    # 编码阶段
    "qa": "sonnet",        # QA 阶段
}
```

**思考配置**:
```python
DEFAULT_PHASE_THINKING: dict[str, bool] = {
    "spec": True,
    "planning": True,
    "coding": True,
    "qa": True,
}
```

**代码位置**: `apps/backend/phase_config.py`

---

## 关键文件清单

| 文件 | 说明 |
|------|------|
| `apps/backend/core/phase_event.py` | 执行阶段枚举定义 |
| `apps/backend/phase_config.py` | 阶段配置（模型、思考级别） |
| `apps/backend/implementation_plan/phase.py` | Phase 数据类 |
| `apps/backend/implementation_plan/enums.py` | PhaseType 枚举 |
| `apps/backend/implementation_plan/subtask.py` | 子任务数据结构 |
| `apps/frontend/src/shared/constants/phase-protocol.ts` | 前端阶段常量 |

---

## 阶段流转图

```
┌─────────────────────────────────────────────────────────────────┐
│                         任务执行流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌──────────────────────────┐    │
│  │ Planning│ →  │ Coding  │ →  │     QA Review/Fixing     │    │
│  └─────────┘    └────┬────┘    └────────────┬─────────────┘    │
│                      │                       │                   │
│                      ▼                       ▼                   │
│              ┌───────────────┐       ┌─────────────┐            │
│              │ Phase 1       │       │   Complete  │            │
│              │ (SETUP)       │       └─────────────┘            │
│              └───────┬───────┘                                │
│                      │                                         │
│              ┌───────▼───────┐                                │
│              │ Phase 2       │                                │
│              │ (INVESTIGATE) │                                │
│              └───────┬───────┘                                │
│                      │                                         │
│              ┌───────▼───────┐                                │
│              │ Phase 3       │                                │
│              │ (IMPLEMENT)   │                                │
│              └───────┬───────┘                                │
│                      │                                         │
│              ┌───────▼───────┐                                │
│              │ Phase 4       │                                │
│              │ (INTEGRATE)   │                                │
│              └───────┬───────┘                                │
│                      │                                         │
│              ┌───────▼───────┐                                │
│              │ Phase 5       │                                │
│              │ (CLEANUP)     │                                │
│              └───────────────┘                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 开发指南

### 添加新的 PhaseType

如需添加新的阶段类型：

1. 在 `apps/backend/implementation_plan/enums.py` 中添加：

```python
class PhaseType(str, Enum):
    SETUP = "setup"
    IMPLEMENTATION = "implementation"
    INVESTIGATION = "investigation"
    INTEGRATION = "integration"
    CLEANUP = "cleanup"
    # 新增类型
    CUSTOM_TYPE = "custom_type"
```

2. 在文档中记录新类型的用途

### 修改阶段配置

如需修改特定阶段的模型配置：

```python
PHASE_MODELS = DEFAULT_PHASE_MODELS.copy()
PHASE_MODELS["coding"] = "opus"  # 使用更强的模型
```

---

**文档维护**: 如阶段系统有变更，请及时更新本文档。
