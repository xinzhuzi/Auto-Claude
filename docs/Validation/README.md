# Validation 阶段文档

本目录包含 Auto-Claude Validation（QA）阶段的完整文档。

## 文档列表

| 文档 | 说明 |
|------|------|
| [01-validation-phases.md](./01-validation-phases.md) | Validation 阶段流程详解 |

## 快速导航

### 了解 Validation 阶段结构
→ [01-validation-phases.md](./01-validation-phases.md)
- QA 验证循环 (Self-Validating Loop)
- QA Reviewer Agent
- QA Fixer Agent
- 问题类型与严重程度
- 迭代历史与问题追踪
- 重复问题检测
- 人工升级机制
- 无测试项目处理
- Linear 集成

## 阶段概述

Validation 阶段是任务执行的最后一个主要阶段：

```
Planning → Coding → Validation → Complete
                   ↑              ↑
                   ├────── QA ──────┤
                   ├─ Review ───────┤
                   └─ Fixing ───────┘
```

### 核心组件

| 组件 | 说明 |
|------|------|
| QA Reviewer | 验证验收标准，检查代码质量 |
| QA Fixer | 修复 Reviewer 发现的问题 |
| 迭代追踪 | 记录每次 QA 循环的结果 |
| 重复检测 | 检测反复出现的问题 |
| 人工升级 | 无法自动解决时升级给人工 |

### 关键配置

```python
MAX_QA_ITERATIONS = 50           # 最大迭代次数
MAX_CONSECUTIVE_ERRORS = 3       # 最大连续错误次数
RECURRING_ISSUE_THRESHOLD = 3    # 重复问题阈值
ISSUE_SIMILARITY_THRESHOLD = 0.8 # 问题相似度阈值
```

## 相关目录

- [Planning 文档](../Planning/) - Plan 阶段文档
- [Coding 文档](../Coding/) - Coding 阶段文档
- [Git 文档](../git/) - Git 和 Worktree 相关文档
