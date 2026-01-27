# Validation 阶段流程详解

## 概述

Validation（验证）阶段是 Auto-Claude 任务执行的最后一个主要阶段，负责验证实现是否满足所有验收标准。该阶段采用自我验证循环（Self-Validating Loop），由 QA Reviewer 和 QA Fixer 两个 Agent 协作完成。

## 阶段总览

| 阶段 | 是否需要 AI | 是否可选 | 说明 |
|------|------------|----------|------|
| QA Review | ✅ AI 审查 | 必须 | 验证验收标准 |
| QA Fixing | ✅ AI 修复 | 条件触发 | 修复发现的问题 |
| Human Escalation | ❌ 人工 | 条件触发 | 重复问题升级 |
| Manual Test Plan | ❌ 脚本生成 | 条件触发 | 无测试框架时生成 |

## 执行阶段枚举

```python
class ExecutionPhase(str, Enum):
    QA_REVIEW = "qa_review"   # QA 审查阶段
    QA_FIXING = "qa_fixing"   # QA 修复阶段
    COMPLETE = "complete"     # 任务成功完成
    FAILED = "failed"         # 任务执行失败
```

**代码位置**: `apps/backend/core/phase_event.py`

---

## 1. QA 验证循环 (QA Validation Loop)

### 1.1 循环入口

```python
async def run_qa_validation_loop(
    project_dir: Path,
    spec_dir: Path,
    model: str,
    verbose: bool = False,
) -> bool:
    """
    运行完整的 QA 验证循环
    
    循环流程:
        1. QA Reviewer 审查
        2. 如果拒绝 → QA Fixer 修复
        3. QA Reviewer 重新审查
        4. 循环直到通过或达到最大迭代次数
    """
```

**代码位置**: `apps/backend/qa/loop.py`

### 1.2 循环前置条件

```python
# 验证构建是否完成
if not is_build_complete(spec_dir):
    print("❌ Build is not complete. Cannot run QA validation.")
    return False

# 检查是否已通过
if is_qa_approved(spec_dir):
    print("✅ Build already approved by QA.")
    return True
```

### 1.3 循环配置参数

```python
# apps/backend/qa/loop.py

MAX_QA_ITERATIONS = 50           # 最大 QA 迭代次数
MAX_CONSECUTIVE_ERRORS = 3       # 最大连续错误次数（无进展时停止）
```

### 1.4 循环终止条件

| 条件 | 结果 | 动作 |
|------|------|------|
| QA 通过 | `True` | 任务完成 |
| 达到最大迭代次数 | `False` | 人工升级 |
| 发现重复问题 (3+次) | `False` | 人工升级 |
| 连续错误 (3次) | `False` | 人工升级 |

### 1.5 循环流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    QA VALIDATION LOOP                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                              │
│  │ Build Complete│ ──No──► ❌ Cannot run QA                     │
│  └──────┬───────┘                                              │
│         │ Yes                                                  │
│         ▼                                                      │
│  ┌──────────────┐    Yes   ┌─────────────┐                    │
│  │ Already      │─────────►│ ✅ COMPLETE  │                    │
│  │ Approved?    │          └─────────────┘                    │
│  └──────┬───────┘                                              │
│         │ No                                                   │
│         ▼                                                      │
│  ┌──────────────┐                                              │
│  │ QA Reviewer  │◄─────────────────────────┐                  │
│  │  Agent       │                          │                  │
│  └──────┬───────┘                          │                  │
│         │                                  │                  │
│         ├─────────────────┐                │                  │
│         │                 │                │                  │
│      Approved          Rejected            │                  │
│         │                 │                │                  │
│         ▼                 ▼                │                  │
│    ┌─────────┐    ┌──────────────┐        │                  │
│    │COMPLETE │    │ Recurring?   │        │                  │
│    └─────────┘    └──────┬───────┘        │                  │
│                          │                 │                  │
│                    Yes ──┴── No            │                  │
│                      │      │              │                  │
│                      ▼      ▼              │                  │
│                 ┌──────────┐ ┌──────────┐ │                  │
│                 │Human     │ │ QA Fixer │─┘                  │
│                 │Escalation│ │  Agent   │                    │
│                 └──────────┘ └──────────┘                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. QA Reviewer Agent

### 2.1 职责

1. **验收标准验证**
   - 检查所有 acceptance criteria 是否满足
   - 验证功能完整性
   - 确认非功能性需求

2. **代码质量检查**
   - 代码风格一致性
   - 潜在 bug 检测
   - 安全漏洞扫描

3. **测试验证**
   - 单元测试通过
   - 集成测试通过
   - E2E 测试通过（如有）

### 2.2 会话执行

```python
async def run_qa_agent_session(
    client: ClaudeSDKClient,
    project_dir: Path,
    spec_dir: Path,
    qa_session: int,
    max_iterations: int,
    verbose: bool = False,
    previous_error: dict | None = None,  # 自我纠正上下文
) -> tuple[str, str]:
    """
    运行 QA Reviewer 会话
    
    Returns:
        (status, response_text)
        status: "approved" | "rejected" | "error"
    """
```

**代码位置**: `apps/backend/qa/reviewer.py`

### 2.3 Memory 集成

Reviewer 使用 Graphiti Memory 进行跨会话学习：

```python
# 获取历史上下文
qa_memory_context = await get_graphiti_context(
    spec_dir,
    project_dir,
    {
        "description": "QA validation and acceptance criteria review",
        "id": f"qa_reviewer_{qa_session}",
    },
)

# 保存会话发现
await save_session_memory(
    spec_dir=spec_dir,
    project_dir=project_dir,
    subtask_id=f"qa_reviewer_{qa_session}",
    session_num=qa_session,
    success=True,  # or False
    discoveries=qa_discoveries,
)
```

### 2.4 输出结果

**通过 (Approved)**:
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

**拒绝 (Rejected)**:
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

### 2.5 自我纠正机制

当 Reviewer 未正确更新 `implementation_plan.json` 时，系统会提供错误上下文：

```python
if previous_error:
    prompt += f"""
## ⚠️ CRITICAL: PREVIOUS ITERATION FAILED - SELF-CORRECTION REQUIRED

The previous QA session failed with the following error:
**Error**: {previous_error.get("error_message")}
**Consecutive Failures**: {previous_error.get("consecutive_errors")}

### Required Action
You MUST update implementation_plan.json with qa_signoff object...
"""
```

---

## 3. QA Fixer Agent

### 3.1 职责

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

### 3.2 触发条件

- QA Reviewer 返回 `rejected` 状态
- 存在 `QA_FIX_REQUEST.md` 文件（包括人工反馈）

### 3.3 人工反馈处理

```python
# 检查是否有人工反馈需要处理
fix_request_file = spec_dir / "QA_FIX_REQUEST.md"
has_human_feedback = fix_request_file.exists()

if has_human_feedback:
    print("📝 Human feedback detected. Running QA Fixer first...")
    # 运行 Fixer 处理人工反馈
    fix_status, fix_response = await run_qa_fixer_session(...)
    
    # 处理后删除文件
    fix_request_file.unlink()
```

---

## 4. 问题类型与严重程度

### 4.1 问题类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `critical` | 关键问题 - 阻止发布 | 空指针异常、安全漏洞、数据丢失 |
| `major` | 主要问题 - 严重影响功能 | 功能不完整、性能严重下降 |
| `minor` | 次要问题 - 轻微影响 | UI 小问题、非关键路径 bug |
| `info` | 信息提示 - 建议改进 | 代码风格、文档不完整 |

### 4.2 问题数据结构

```python
{
    "type": "critical",              # 严重程度
    "title": "Null pointer exception",  # 问题标题
    "file": "src/utils.ts",          # 文件路径
    "line": 42,                      # 行号
    "location": "src/utils.ts:42",   # 完整位置
    "description": "Function doesn't handle null input",
    "fix_required": "Add null check"  # 修复建议
}
```

---

## 5. 迭代历史与问题追踪

### 5.1 迭代记录

每次 QA 循环都会记录到 `implementation_plan.json`:

```python
def record_iteration(
    spec_dir: Path,
    iteration: int,
    status: str,           # "approved" | "rejected" | "error"
    issues: list[dict],
    duration_seconds: float | None = None,
) -> bool:
    """记录 QA 迭代到历史"""
```

**代码位置**: `apps/backend/qa/report.py`

### 5.2 迭代历史结构

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

---

## 6. 重复问题检测

### 6.1 检测配置

```python
# apps/backend/qa/report.py

RECURRING_ISSUE_THRESHOLD = 3      # 同一问题出现 3 次触发升级
ISSUE_SIMILARITY_THRESHOLD = 0.8   # 相似度 >= 80% 视为相同问题
```

### 6.2 问题相似度计算

```python
def _normalize_issue_key(issue: dict) -> str:
    """创建标准化的问题键用于比较"""
    title = (issue.get("title") or "").lower().strip()
    file = (issue.get("file") or "").lower().strip()
    line = issue.get("line") or ""
    
    # 移除常见前缀
    for prefix in ["error:", "issue:", "bug:", "fix:"]:
        if title.startswith(prefix):
            title = title[len(prefix):].strip()
    
    return f"{title}|{file}|{line}"

def _issue_similarity(issue1: dict, issue2: dict) -> float:
    """计算两个问题的相似度 (0.0 - 1.0)"""
    key1 = _normalize_issue_key(issue1)
    key2 = _normalize_issue_key(issue2)
    return SequenceMatcher(None, key1, key2).ratio()
```

### 6.3 重复检测函数

```python
def has_recurring_issues(
    current_issues: list[dict],
    history: list[dict],
    threshold: int = RECURRING_ISSUE_THRESHOLD,
) -> tuple[bool, list[dict]]:
    """
    检查当前问题是否在历史中重复出现
    
    Returns:
        (has_recurring, recurring_issues)
    """
```

---

## 7. 人工升级机制

### 7.1 触发条件

1. **达到最大迭代次数** (默认 50 次)
2. **重复问题检测** (同一问题出现 3+ 次)
3. **连续错误** (3 次连续错误无进展)

### 7.2 升级文件生成

```python
async def escalate_to_human(
    spec_dir: Path,
    recurring_issues: list[dict],
    iteration: int,
) -> None:
    """创建人工升级文件"""
```

生成 `QA_ESCALATION.md`，包含：
- 迭代历史摘要
- 重复问题列表
- 最常见问题
- 建议操作

### 7.3 升级文件示例

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
### 1. Null pointer exception
- **File**: src/utils.ts
- **Line**: 42
- **Type**: critical
- **Occurrences**: 3

## Recommended Actions
1. Review the recurring issues manually
2. Check if the issue stems from unclear specification
3. Update the spec or acceptance criteria if needed
```

---

## 8. 无测试项目处理

### 8.1 检测逻辑

```python
def is_no_test_project(spec_dir: Path, project_dir: Path) -> bool:
    """检测项目是否没有测试框架"""
    
    # 检查测试配置文件
    test_indicators = [
        "pytest.ini", "pyproject.toml", "setup.cfg",
        "jest.config.js", "jest.config.ts",
        "vitest.config.js", "vitest.config.ts",
        "karma.conf.js", "cypress.config.js",
        "playwright.config.ts", ".rspec",
    ]
    
    # 检查测试目录
    test_dirs = ["tests", "test", "__tests__", "spec"]
    
    # 如果都不存在，返回 True
```

### 8.2 手动测试计划生成

```python
def create_manual_test_plan(spec_dir: Path, spec_name: str) -> Path:
    """为无测试框架的项目创建手动测试计划"""
```

生成 `MANUAL_TEST_PLAN.md`，包含：
- 验收标准检查清单
- 功能测试项
- 边界情况测试
- 非功能测试（性能、安全）

---

## 9. Linear 集成

### 9.1 状态更新

| QA 事件 | Linear 状态 |
|---------|-------------|
| QA 开始 | In Review |
| QA 通过 | QA Approved (Awaiting Human Review) |
| QA 拒绝 | Rejected |
| 达到最大迭代 | Needs Human Intervention |

### 9.2 集成代码

```python
from linear_updater import (
    linear_qa_started,
    linear_qa_approved,
    linear_qa_rejected,
    linear_qa_max_iterations,
)

# QA 开始时
await linear_qa_started(spec_dir)

# QA 通过时
await linear_qa_approved(spec_dir)

# QA 拒绝时
await linear_qa_rejected(spec_dir, issues_count, qa_iteration)

# 达到最大迭代时
await linear_qa_max_iterations(spec_dir, qa_iteration)
```

---

## 10. 输出文件

### 10.1 QA 生成的文件

| 文件 | 说明 | 生成条件 |
|------|------|----------|
| `qa_report.md` | QA 报告 | 每次审查 |
| `QA_FIX_REQUEST.md` | 修复请求 | QA 拒绝时 |
| `QA_ESCALATION.md` | 人工升级请求 | 重复问题/最大迭代 |
| `MANUAL_TEST_PLAN.md` | 手动测试计划 | 无测试框架时 |

### 10.2 implementation_plan.json 更新

QA 阶段会更新以下字段：
- `qa_signoff` - QA 签核状态
- `qa_iteration_history` - 迭代历史
- `qa_stats` - 统计信息

---

## 11. 关键文件清单

| 文件 | 说明 |
|------|------|
| `apps/backend/qa/loop.py` | QA 循环编排 |
| `apps/backend/qa/reviewer.py` | QA Reviewer Agent |
| `apps/backend/qa/fixer.py` | QA Fixer Agent |
| `apps/backend/qa/report.py` | 报告生成与问题追踪 |
| `apps/backend/qa/criteria.py` | 验收标准处理 |
| `apps/backend/phase_config.py` | 阶段配置 |
| `apps/backend/core/phase_event.py` | 阶段事件定义 |

---

## 12. 阶段配置

### 12.1 模型配置

```python
DEFAULT_PHASE_MODELS = {
    "qa": "sonnet",  # QA 使用 Sonnet 模型
}

DEFAULT_PHASE_THINKING = {
    "qa": True,  # QA 启用思考模式
}
```

### 12.2 获取配置

```python
# 获取 QA 阶段模型
qa_model = get_phase_model(spec_dir, "qa", default_model)

# 获取思考预算
qa_thinking_budget = get_phase_thinking_budget(spec_dir, "qa")
```

**代码位置**: `apps/backend/phase_config.py`
