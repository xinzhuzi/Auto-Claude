# Plan 阶段流程详解

## 概述

Auto-Claude 的 Plan 阶段负责将用户的任务描述转化为详细的规范文档和实施计划。整个流程由 `SpecOrchestrator` 编排，包含多个子阶段。

## 阶段总览

| 阶段 | 是否需要 AI | 是否可选 | 触发条件 |
|------|------------|----------|----------|
| 1. Discovery | ❌ 脚本执行 | 必须 | - |
| 2. Requirements | ✅ AI 生成 | 必须 | - |
| 3. Complexity Assessment | ✅ AI 评估 / 启发式 | 必须 | - |
| 4. Historical Context | ❌ 查询 Graphiti | 可选 | Graphiti 已启用 |
| 5. Research | ✅ AI 研究 | 可选 | `needs_research=True` |
| 6. Context | ✅ AI 发现 | 条件必须 | STANDARD/COMPLEX |
| 7. Spec Writing | ✅ AI 编写 | 必须 | - |
| 8. Self Critique | ✅ AI 审查 | 可选 | `needs_self_critique=True` |
| 9. Planning | ⚡ 脚本优先，AI 回退 | 必须 | - |
| 10. Validation | ❌ 脚本验证 | 必须 | - |
| 11. Human Review | ❌ 人工操作 | 可跳过 | `auto_approve=False` |

## 阶段流程图

```
用户任务描述
     ↓
┌─────────────────────────────────────────────────────────┐
│                    PLAN 阶段                             │
├─────────────────────────────────────────────────────────┤
│  1. Discovery (项目发现)                                 │
│     ↓                                                   │
│  2. Requirements (需求收集)                              │
│     ↓                                                   │
│  3. Complexity Assessment (复杂度评估)                   │
│     ↓                                                   │
│  [根据复杂度动态选择后续阶段]                             │
│     ↓                                                   │
│  4. Historical Context (历史上下文) - 可选               │
│     ↓                                                   │
│  5. Research (研究) - 可选                               │
│     ↓                                                   │
│  6. Context (上下文发现)                                 │
│     ↓                                                   │
│  7. Spec Writing (规范编写) - 支持分块                   │
│     ↓                                                   │
│  8. Self Critique (自我审查) - 可选                      │
│     ↓                                                   │
│  9. Planning (实施计划)                                  │
│     ↓                                                   │
│  10. Validation (验证)                                   │
│     ↓                                                   │
│  11. Human Review (人工审查)                             │
└─────────────────────────────────────────────────────────┘
     ↓
进入 Coding 阶段
```

## 各阶段详解

### 1. Discovery (项目发现)

**文件**: `apps/backend/spec/phases/discovery_phases.py`

**是否需要 AI**: ❌ 纯脚本执行

**作用**: 分析项目结构，生成 `project_index.json`

**输出**:
- `project_index.json` - 项目文件索引

**流程**:
1. 运行 `discovery.run_discovery_script()` 扫描项目
2. 统计文件数量、服务结构、依赖关系
3. 检测项目类型（monorepo/单体）
4. 生成项目索引供后续阶段使用

**智能缓存**: 只有当依赖文件（package.json, pyproject.toml 等）变化时才重新生成

---

### 2. Requirements (需求收集)

**文件**: `apps/backend/spec/phases/requirements_phases.py`

**是否需要 AI**: ✅ AI 生成需求文档

**作用**: 收集和整理用户需求

**输出**:
- `requirements.json` - 需求文档

**流程**:
1. 如果有任务描述，AI 从描述中提取结构化需求
2. 如果是交互模式（`interactive=True`），引导用户补充需求
3. 提取：工作流类型、涉及的服务、验收标准、约束条件

**输出字段**:
```json
{
  "task_description": "任务描述",
  "workflow_type": "feature/bugfix/refactor/...",
  "services_involved": ["backend", "frontend"],
  "user_requirements": ["需求1", "需求2"],
  "acceptance_criteria": ["验收标准1"],
  "constraints": ["约束条件"]
}
```

---

### 3. Complexity Assessment (复杂度评估)

**文件**: `apps/backend/spec/complexity.py`

**是否需要 AI**: ✅ 默认使用 AI 评估，可回退到启发式

**作用**: 评估任务复杂度，决定后续执行哪些阶段，以及是否需要分块写入

**输出**:
- `complexity_assessment.json` - 复杂度评估结果

#### 3.1 复杂度级别与阶段选择

| 级别 | 综合分数 | 执行的阶段 |
|------|----------|-----------|
| SIMPLE | 0-3.0 | discovery → historical_context → quick_spec → validation |
| STANDARD | 3.1-6.0 | discovery → requirements → [research] → context → spec_writing → planning → validation |
| COMPLEX | 6.1-10.0 | 完整流程 + research + self_critique |

#### 3.2 六维度评估模型

复杂度通过六个维度加权计算：

| 维度 | 权重 | 评估内容 |
|------|------|----------|
| Code Coupling (代码耦合) | 25% | 依赖关系、跨模块影响、接口变更 |
| Cognitive (认知复杂度) | 20% | 业务逻辑、算法、状态管理 |
| Change Impact (变更影响) | 20% | 破坏性变更、回归风险、兼容性 |
| Domain Knowledge (领域知识) | 15% | 技术栈、业务领域、外部 API |
| Test Complexity (测试复杂度) | 10% | 覆盖难度、Mock 需求、E2E 需求 |
| Resource Estimation (资源估算) | 10% | 文件数量、代码量、协作需求 |

#### 3.3 特殊触发规则

即使综合分数较低，以下情况也会触发 COMPLEX：
- 任何维度分数 ≥ 8
- Code Coupling + Change Impact ≥ 12
- Cognitive ≥ 7（复杂算法/并发）
- Domain Knowledge ≥ 7（专家领域）
- 3 个以上维度 ≥ 6

#### 3.4 关键字段

```python
@dataclass
class ComplexityAssessment:
    complexity: Complexity          # 复杂度级别 (SIMPLE/STANDARD/COMPLEX)
    confidence: float               # 置信度 (0.0-1.0)
    needs_research: bool            # 是否需要研究阶段
    needs_self_critique: bool       # 是否需要自我审查
    requires_chunking: bool         # 是否需要分块写入
    suggested_chunks: int           # 建议分块数
    estimated_spec_size: int        # 预估 spec 大小（字符数）
    multi_dimensional: MultiDimensionalAnalysis  # 六维度分析结果
```

---

### 4. Historical Context (历史上下文) - 可选

**文件**: `apps/backend/spec/phases/requirements_phases.py`

**是否需要 AI**: ❌ 查询 Graphiti 知识图谱

**作用**: 从 Graphiti 知识图谱获取历史上下文

**输出**:
- `graph_hints.json` - 历史提示

**触发条件**: 
- Graphiti 服务已启用且可连接
- 默认包含在所有复杂度级别的阶段列表中
- 如果 Graphiti 未配置，会优雅跳过

---

### 5. Research (研究) - 可选

**文件**: `apps/backend/spec/phases/requirements_phases.py`

**是否需要 AI**: ✅ AI 进行外部研究

**作用**: 研究外部集成、依赖库、API 文档

**输出**:
- `research.json` - 研究结果

**触发条件**: 
- `needs_research=True`（由复杂度评估决定）
- 通常在检测到外部集成时触发（如 Stripe、OAuth、GraphQL 等）

**研究内容**:
- 外部 API 文档
- 依赖库使用方法
- 最佳实践和示例代码

---

### 6. Context (上下文发现)

**文件**: `apps/backend/spec/phases/discovery_phases.py`

**是否需要 AI**: ✅ AI 分析相关文件

**作用**: 发现与任务相关的文件

**输出**:
- `context.json` - 上下文信息

**触发条件**: STANDARD 和 COMPLEX 复杂度（SIMPLE 跳过）

**输出内容**:
```json
{
  "files_to_modify": ["需要修改的文件列表"],
  "files_to_reference": ["需要参考的文件列表"],
  "services_involved": ["涉及的服务"],
  "patterns_discovered": ["发现的代码模式"]
}
```

---

### 7. Spec Writing (规范编写)

**文件**: `apps/backend/spec/phases/spec_phases.py`

**是否需要 AI**: ✅ 必须

**作用**: 编写详细的规范文档

**输出**:
- `spec.md` - 规范文档
- `chunks/chunk_*.md` - 分块文件（仅分块模式）

#### 7.1 写入模式选择

根据 `complexity_assessment.json` 中的 `requires_chunking` 字段决定：

| 模式 | 条件 | 说明 |
|------|------|------|
| 单次写入 | `requires_chunking=False` | 一次性生成完整 spec.md |
| 分块写入 | `requires_chunking=True` | 分多次生成，最后合并 |

#### 7.2 分块阈值

```python
SPEC_SIZE_THRESHOLDS = {
    "tiny": 5000,      # < 5K 字符: 不需要分块
    "small": 15000,    # 5K-15K: 可能需要分块
    "medium": 50000,   # 15K-50K: 需要分块 (2-3 块)
    "large": 150000,   # 50K-150K: 需要分块 (4-6 块)
    "huge": 500000,    # > 150K: 需要分块 (7+ 块)
}
```

#### 7.3 分块数量计算

```python
def needs_chunking(estimated_size: int) -> tuple[bool, str, int]:
    if estimated_size <= 15000:
        return False, "small", 1
    elif estimated_size <= 50000:
        return True, "medium", max(2, estimated_size // 20000)
    elif estimated_size <= 150000:
        return True, "large", max(3, estimated_size // 15000)
    else:
        return True, "huge", max(5, estimated_size // 30000)
```

#### 7.4 分块写入流程

```
1. 创建 chunks/ 目录
2. 清理旧的 chunk 文件
3. 删除现有 spec.md（防止 AI 读取旧内容）
4. 循环写入每个 chunk:
   a. 计算该 chunk 负责的章节范围
   b. 调用 AI 写入 chunks/chunk_{n}.md
   c. 验证 chunk 格式（检查 PART 标记）
   d. 最多重试 3 次
5. 合并所有 chunks 到 spec.md
6. 去重重复的标题
7. 验证最终 spec.md 结构
```

#### 7.5 章节分配

Spec 包含 12 个标准章节，按 chunk 数量均匀分配：

```
Overview, Workflow Type, Task Scope, Service Context,
Files to Modify, Files to Reference, Patterns to Follow,
Requirements, Implementation Notes, Development Environment,
Success Criteria, QA Acceptance Criteria
```

例如 3 个 chunk：
- Chunk 1: Overview → Service Context (4 节)
- Chunk 2: Files to Modify → Requirements (4 节)
- Chunk 3: Implementation Notes → QA Acceptance Criteria (4 节)

#### 7.6 Chunk 格式要求

每个 chunk 必须包含标记：
```markdown
<!-- PART 1 START -->
... 内容 ...
<!-- PART 1 END -->
```

最后一个 chunk：
```markdown
<!-- PART 3 START -->
... 内容 ...
<!-- FINAL PART -->
```

---

### 8. Self Critique (自我审查) - 可选

**文件**: `apps/backend/spec/phases/spec_phases.py`

**是否需要 AI**: ✅ AI 使用扩展思考进行审查

**作用**: AI 自我审查规范文档质量

**输出**:
- `critique_report.json` - 审查报告

**触发条件**: 
- `needs_self_critique=True`（由复杂度评估决定）
- 通常在 COMPLEX 复杂度时触发

**审查内容**:
1. **技术准确性**: 代码示例是否与研究结果匹配
2. **完整性**: 是否覆盖所有需求和边缘情况
3. **一致性**: 包名、API、模式是否全文一致
4. **可行性**: 实现方案是否现实可行

**输出格式**:
```json
{
  "issues_found": ["发现的问题列表"],
  "issues_fixed": true,
  "no_issues_found": false,
  "critique_summary": "审查总结"
}
```

---

### 9. Planning (实施计划)

**文件**: `apps/backend/spec/phases/planning_phases.py`

**是否需要 AI**: ⚡ 脚本优先，AI 回退

**作用**: 生成实施计划

**输出**:
- `implementation_plan.json` - 实施计划

**流程**:
1. **优先**: 运行 `planner.py` 脚本（确定性，速度快）
2. **回退**: 如果脚本失败，使用 AI Agent 生成
3. **验证**: 检查计划有效性
4. **修复**: 必要时自动修复格式问题

**计划结构**:
```json
{
  "phases": [
    {
      "name": "阶段名称",
      "subtasks": [
        {
          "id": "1.1",
          "description": "子任务描述",
          "files": ["涉及的文件"],
          "verification": "验证方法"
        }
      ]
    }
  ]
}
```

---

### 10. Validation (验证)

**文件**: `apps/backend/spec/phases/planning_phases.py`

**是否需要 AI**: ❌ 纯脚本验证

**作用**: 验证所有生成的文件格式和完整性

**验证项**:
| 文件 | 验证内容 |
|------|----------|
| `requirements.json` | JSON 格式正确，必填字段存在 |
| `context.json` | JSON 格式正确，文件路径有效 |
| `spec.md` | Markdown 结构完整，必要章节存在 |
| `implementation_plan.json` | JSON 格式正确，任务结构有效 |

---

### 11. Human Review (人工审查)

**文件**: `apps/backend/spec/pipeline/orchestrator.py`

**是否需要 AI**: ❌ 人工操作

**作用**: 人工审查检查点

**选项**:
| 操作 | 结果 |
|------|------|
| 批准 (approve) | 进入 Coding 阶段 |
| 拒绝 (reject) | 停止流程 |
| `auto_approve=True` | 跳过人工审查，自动批准 |

**跳过条件**: 
- 命令行参数 `--auto-approve`
- 配置 `auto_approve=True`

## 相关文件

| 文件 | 作用 |
|------|------|
| `apps/backend/spec/pipeline/orchestrator.py` | 主编排器 |
| `apps/backend/spec/phases/executor.py` | 阶段执行器 |
| `apps/backend/spec/phases/discovery_phases.py` | 发现阶段 |
| `apps/backend/spec/phases/requirements_phases.py` | 需求阶段 |
| `apps/backend/spec/phases/spec_phases.py` | 规范编写阶段 |
| `apps/backend/spec/phases/planning_phases.py` | 计划阶段 |
| `apps/backend/spec/complexity.py` | 复杂度评估 |
| `apps/backend/planner_lib/` | 计划生成库 |

---

## 复杂度与阶段对照表

```
SIMPLE (分数 0-3.0):
┌─────────────┬─────────────────────┬────────────┬────────────┐
│  Discovery  │ Historical Context  │ Quick Spec │ Validation │
│   (脚本)    │     (可选)          │   (AI)     │   (脚本)   │
└─────────────┴─────────────────────┴────────────┴────────────┘

STANDARD (分数 3.1-6.0):
┌──────────┬──────────────┬──────────────┬──────────────┬─────────┐
│Discovery │ Requirements │ [Research]   │   Context    │  Spec   │
│  (脚本)  │    (AI)      │  (AI,可选)   │    (AI)      │ Writing │
└──────────┴──────────────┴──────────────┴──────────────┴─────────┘
                                                              ↓
┌──────────┬────────────┬──────────────┐
│ Planning │ Validation │ Human Review │
│(脚本/AI) │   (脚本)   │   (人工)     │
└──────────┴────────────┴──────────────┘

COMPLEX (分数 6.1-10.0):
┌──────────┬──────────────┬──────────┬─────────┬─────────────┐
│Discovery │ Requirements │ Research │ Context │ Spec Writing│
│  (脚本)  │    (AI)      │   (AI)   │  (AI)   │    (AI)     │
└──────────┴──────────────┴──────────┴─────────┴─────────────┘
                                                      ↓
┌──────────────┬──────────┬────────────┬──────────────┐
│ Self Critique│ Planning │ Validation │ Human Review │
│    (AI)      │(脚本/AI) │   (脚本)   │    (人工)    │
└──────────────┴──────────┴────────────┴──────────────┘
```

---

## 分块写入决策流程

```
估算 spec 大小
      ↓
┌─────────────────────────────────────────┐
│  estimated_size <= 15000 (15K)?         │
│  → 单次写入，1 个文件                    │
├─────────────────────────────────────────┤
│  estimated_size <= 50000 (50K)?         │
│  → 分块写入，2-3 个 chunk               │
├─────────────────────────────────────────┤
│  estimated_size <= 150000 (150K)?       │
│  → 分块写入，4-6 个 chunk               │
├─────────────────────────────────────────┤
│  estimated_size > 150000?               │
│  → 分块写入，7+ 个 chunk                │
└─────────────────────────────────────────┘
```
