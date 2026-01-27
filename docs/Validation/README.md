# Auto-Claude Validation (QA) 阶段 - 完整文档

> **版本**: 1.0
> **更新日期**: 2025-01-27
> **目的**: 记录 Validation 阶段的结构和工作流程

---

## 目录

1. [Validation 阶段概述](#validation-阶段概述)
2. [QA Review 阶段](#qa-review-阶段)
3. [QA Fixing 阶段](#qa-fixing-阶段)
4. [QA 循环流程](#qa-循环流程)
5. [问题类型与严重程度](#问题类型与严重程度)
6. [迭代历史与问题追踪](#迭代历史与问题追踪)
7. [人工升级机制](#人工升级机制)
8. [配置参数](#配置参数)

---

## Validation 阶段概述

Validation（验证）阶段是 Auto-Claude 任务执行的最后一个主要阶段，负责验证实现是否满足所有验收标准。

### 执行阶段位置

```
Planning → Coding → Validation → Complete
                   ↑              ↑
                   ├────── QA ──────┤
                   ├─ Review ───────┤
                   └─ Fixing ───────┘
```

### 阶段枚举值

| 枚举值 | 说明 |
|--------|------|
| `qa_review` | QA 审查阶段 - 验证代码质量 |
| `qa_fixing` | QA 修复阶段 - 修复发现的问题 |

**代码位置**:
- 后端: `apps/backend/core/phase_event.py`
- 前端: `apps/frontend/src/shared/constants/phase-protocol.ts`

---

## QA Review 阶段

QA Review 阶段由 **QA Reviewer Agent** 执行，负责审查实现并验证验收标准。

### Reviewer 职责

1. **验收标准验证**
   - 检查所有 acceptance criteria 是否满足
   - 验证功能完整性
   - 确认非功能性需求（性能、安全等）

2. **代码质量检查**
   - 代码风格一致性
   - 潜在 bug 检测
   - 安全漏洞扫描
   - 错误处理验证

3. **测试验证**
   - 单元测试通过
   - 集成测试通过
   - E2E 测试通过（如有）

4. **文档更新**
   - 生成 `qa_report.md`
   - 更新 `implementation_plan.json` 中的 `qa_signoff`

### Reviewer 输出

#### 通过 (Approved)

```json
{
  "qa_signoff": {
    "status": "approved",
    "timestamp": "2025-01-27T10:00:00Z",
    "qa_session": 1,
    "report_file": "qa_report.md",
    "tests_passed": {
      "unit": "10/10",
      "integration": "5/5",
      "e2e": "3/3"
    },
    "verified_by": "qa_agent"
  }
}
```

#### 拒绝 (Rejected)

```json
{
  "qa_signoff": {
    "status": "rejected",
    "timestamp": "2025-01-27T10:00:00Z",
    "qa_session": 1,
    "issues_found": [
      {
        "type": "critical",
        "title": "Null pointer exception",
        "location": "src/utils.ts:42",
        "description": "Function doesn't handle null input",
        "fix_required": "Add null check"
      }
    ],
    "fix_request_file": "QA_FIX_REQUEST.md"
  }
}
```

### Memory 集成

Reviewer 使用 Graphiti Memory:
- **读取**: 过去的模式、陷阱、验证经验
- **保存**: QA 发现的问题和成功模式

---

## QA Fixing 阶段

QA Fixing 阶段由 **QA Fixer Agent** 执行，负责修复 Reviewer 发现的问题。

### Fixer 职责

1. **读取修复请求**
   - 从 `QA_FIX_REQUEST.md` 读取问题列表
   - 理解每个问题的根本原因

2. **应用修复**
   - 修改代码
   - 添加缺失的测试
   - 修复安全问题

3. **验证修复**
   - 确认修复有效
   - 检查未引入新问题
   - 更新 `implementation_plan.json` 状态

### Fixer 输出

```json
{
  "qa_signoff": {
    "status": "fixes_applied",
    "timestamp": "2025-01-27T11:00:00Z",
    "qa_session": 1,
    "ready_for_qa_revalidation": true
  }
}
```

### Memory 集成

Fixer 使用 Graphiti Memory:
- **读取**: 过去的修复方案、常见问题模式
- **保存**: 修复结果和学到的经验

---

## QA 循环流程

QA 采用 **自我验证循环**（Self-Validating Loop）直到通过或达到最大迭代次数。

### 流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    QA VALIDATION LOOP                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                          │
│  │ Build Complete│ ──No──► ❌ Cannot run QA                 │
│  └──────┬───────┘                                          │
│         │ Yes                                              │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │ QA Reviewer  │                                          │
│  │  Agent       │                                          │
│  └──────┬───────┘                                          │
│         │                                                  │
│         ├─────────────────┐                                │
│         │                 │                                │
│      Approved          Rejected                            │
│         │                 │                                │
│         ▼                 ▼                                │
│    ┌─────────┐    ┌──────────────┐                        │
│    │ COMPLETE│    │ Recurring?   │                        │
│    └─────────┘    └──────┬───────┘                        │
│                          │                                 │
│                    Yes ──┴── No                            │
│                      │      │                              │
│                      ▼      ▼                              │
│                 ┌──────────┐ ┌──────────────┐            │
│                 │Human     │ │ QA Fixer     │            │
│                 │Escalation│ │  Agent       │            │
│                 └──────────┘ └──────┬───────┘            │
│                                     │                      │
│                                     └──────► (Back to      │
│                                              QA Reviewer)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 循环终止条件

| 条件 | 动作 |
|------|------|
| QA 通过 | 任务完成 (`complete`) |
| 达到最大迭代次数 | 人工升级 (`failed`) |
| 发现重复问题 | 人工升级 (`failed`) |
| 连续错误 (3次) | 人工升级 (`failed`) |

---

## 问题类型与严重程度

### 问题类型 (type)

| 类型 | 说明 | 示例 |
|------|------|------|
| `critical` | 关键问题 - 阻止发布 | 空指针异常、安全漏洞、数据丢失 |
| `major` | 主要问题 - 严重影响功能 | 功能不完整、性能严重下降 |
| `minor` | 次要问题 - 轻微影响 | UI 小问题、非关键路径 bug |
| `info` | 信息提示 - 建议改进 | 代码风格、文档不完整 |

### 问题结构

```typescript
{
  "type": "critical",           // 严重程度
  "title": "Null pointer exception",  // 问题标题
  "location": "src/utils.ts:42",     // 文件位置
  "description": "Function doesn't handle null input",  // 描述
  "fix_required": "Add null check"   // 修复建议
}
```

---

## 迭代历史与问题追踪

### 迭代记录结构

每次 QA 循环都会记录到 `implementation_plan.json`:

```json
{
  "qa_iteration_history": [
    {
      "iteration": 1,
      "status": "rejected",
      "timestamp": "2025-01-27T10:00:00Z",
      "duration_seconds": 45.2,
      "issues": [
        {
          "type": "critical",
          "title": "Null pointer exception",
          "file": "src/utils.ts",
          "line": 42
        }
      ]
    },
    {
      "iteration": 2,
      "status": "approved",
      "timestamp": "2025-01-27T11:00:00Z",
      "duration_seconds": 30.5,
      "issues": []
    }
  ],
  "qa_stats": {
    "total_iterations": 2,
    "last_iteration": 2,
    "last_status": "approved",
    "issues_by_type": {
      "critical": 1,
      "major": 0,
      "minor": 0
    }
  }
}
```

### 重复问题检测

系统自动检测重复出现的问题：

| 参数 | 值 | 说明 |
|------|-----|------|
| **阈值** | 3 次 | 同一问题出现 3 次触发升级 |
| **相似度** | 0.8 | 问题相似度 >= 80% 视为相同 |

### 问题相似度计算

```python
# 基于标题和文件位置计算相似度
def _issue_similarity(issue1, issue2) -> float:
    key1 = f"{issue1.title.lower()}|{issue1.file.lower()}|{issue1.line}"
    key2 = f"{issue2.title.lower()}|{issue2.file.lower()}|{issue2.line}"
    return SequenceMatcher(None, key1, key2).ratio()
```

---

## 人工升级机制

当 QA 无法自动完成验证时，会升级给人工处理。

### 触发条件

1. **达到最大迭代次数** (默认 50 次)
2. **重复问题检测** (同一问题出现 3+ 次)
3. **连续错误** (3 次连续错误)

### 升级文件

`QA_ESCALATION.md` 自动生成，包含：

- 迭代历史摘要
- 重复问题列表
- 最常见问题
- 建议操作

### 升级文件示例

```markdown
# QA Escalation - Human Intervention Required

**Generated**: 2025-01-27T12:00:00Z
**Iteration**: 5/50
**Reason**: Recurring issues detected (3+ occurrences)

## Summary

- **Total QA Iterations**: 5
- **Total Issues Found**: 12
- **Unique Issues**: 4
- **Fix Success Rate**: 0%

## Recurring Issues

These issues have appeared 3+ times without being resolved:

### 1. Null pointer exception
- **File**: src/utils.ts
- **Line**: 42
- **Type**: critical
- **Occurrences**: 3
- **Description**: Function doesn't handle null input
```

---

## 配置参数

### QA 循环配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `MAX_QA_ITERATIONS` | 50 | 最大 QA 迭代次数 |
| `MAX_CONSECUTIVE_ERRORS` | 3 | 最大连续错误次数 |
| `RECURRING_ISSUE_THRESHOLD` | 3 | 重复问题阈值 |
| `ISSUE_SIMILARITY_THRESHOLD` | 0.8 | 问题相似度阈值 |

### 阶段模型配置

```python
DEFAULT_PHASE_MODELS = {
    "qa": "sonnet",  # QA 使用 Sonnet 模型
}

DEFAULT_PHASE_THINKING = {
    "qa": True,  # QA 启用思考模式
}
```

**代码位置**: `apps/backend/phase_config.py`

---

## 无测试项目处理

对于没有自动化测试框架的项目：

1. **自动检测**: 扫描常见测试框架配置
2. **创建手动测试计划**: 生成 `MANUAL_TEST_PLAN.md`
3. **提醒用户**: 说明需要手动验证

### 测试框架检测

检测以下框架：
- Python: pytest, unittest
- JavaScript: Jest, Vitest, Mocha, Cypress, Playwright
- Ruby: RSpec

---

## 关键文件清单

| 文件 | 说明 |
|------|------|
| `apps/backend/qa/reviewer.py` | QA Reviewer Agent 实现 |
| `apps/backend/qa/fixer.py` | QA Fixer Agent 实现 |
| `apps/backend/qa/loop.py` | QA 循环编排 |
| `apps/backend/qa/criteria.py` | QA 验收标准处理 |
| `apps/backend/qa/report.py` | QA 报告生成与问题追踪 |
| `apps/backend/phase_config.py` | 阶段配置 |
| `apps/backend/core/phase_event.py` | 阶段事件定义 |

---

## 输出文件

### QA 生成的文件

| 文件 | 说明 |
|------|------|
| `qa_report.md` | QA 报告 |
| `QA_FIX_REQUEST.md` | 修复请求 |
| `QA_ESCALATION.md` | 人工升级请求 |
| `MANUAL_TEST_PLAN.md` | 手动测试计划 |

---

## 与 Linear 集成

QA 阶段会更新 Linear 任务状态：

| QA 事件 | Linear 状态 |
|---------|-------------|
| QA 开始 | In Review |
| QA 通过 | QA Approved (Awaiting Human Review) |
| QA 拒绝 | Rejected |
| 达到最大迭代 | Needs Human Intervention |

**代码位置**: `apps/backend/integrations/linear/updater.py`

---

**文档维护**: 如 Validation 系统有变更，请及时更新本文档。
