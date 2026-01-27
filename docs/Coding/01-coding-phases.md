# Coding 阶段流程详解

## 概述

Auto-Claude 的 Coding 阶段负责执行实现计划中的子任务，将规划转化为实际代码。整个流程由 `coder.py` 中的 `run_autonomous_agent` 函数编排。

## 阶段总览

| 阶段 | 是否需要 AI | 是否可选 | 说明 |
|------|------------|----------|------|
| Planning Session | ✅ AI 生成 | 首次必须 | 生成 implementation_plan.json |
| Subtask Execution | ✅ AI 执行 | 必须 | 逐个执行子任务 |
| Post-Session Processing | ❌ 脚本 | 必须 | 同步状态、更新 Linear |
| QA Review | ✅ AI 审查 | 可选 | 代码质量审查 |
| QA Fixing | ✅ AI 修复 | 可选 | 修复发现的问题 |

## 执行阶段枚举 (ExecutionPhase)

```python
class ExecutionPhase(str, Enum):
    IDLE = "idle"           # 任务未开始
    PLANNING = "planning"   # 分析需求，生成实现计划
    CODING = "coding"       # 执行实现计划中的子任务
    QA_REVIEW = "qa_review" # 代码审查和质量检查
    QA_FIXING = "qa_fixing" # 修复发现的问题
    COMPLETE = "complete"   # 任务成功完成
    FAILED = "failed"       # 任务执行失败
```

**代码位置**: `apps/backend/core/phase_event.py`

---

## 1. Planning Session (规划会话)

### 1.1 触发条件

- 首次运行（`is_first_run(spec_dir)` 返回 True）
- `implementation_plan.json` 不存在

### 1.2 执行流程

```
1. 检测是否首次运行
2. 设置状态为 PLANNING
3. 启动 Planning 日志阶段
4. 调用 AI 生成实现计划
5. 验证计划有效性
6. 如果无效，自动修复或重试
7. 切换到 CODING 阶段
```

### 1.3 计划验证

```python
def _validate_and_fix_implementation_plan() -> tuple[bool, list[str]]:
    """验证并自动修复实现计划"""
    spec_validator = SpecValidator(spec_dir)
    result = spec_validator.validate_implementation_plan()
    
    if result.valid:
        return True, []
    
    # 尝试自动修复
    fixed = auto_fix_plan(spec_dir)
    if fixed:
        result = spec_validator.validate_implementation_plan()
        if result.valid:
            return True, []
    
    return False, result.errors
```

### 1.4 输出文件

- `implementation_plan.json` - 实现计划

---

## 2. Subtask Execution (子任务执行)

### 2.1 子任务获取

```python
def get_next_subtask(spec_dir: Path) -> tuple[str | None, dict | None]:
    """获取下一个待执行的子任务"""
    plan = load_implementation_plan(spec_dir)
    
    for phase in plan.get("phases", []):
        for subtask in phase.get("subtasks", []):
            if subtask.get("status") == "pending":
                return subtask.get("id"), subtask
    
    return None, None
```

### 2.2 执行循环

```python
async def run_autonomous_agent(...):
    iteration = 0
    
    while True:
        iteration += 1
        
        # 检查是否完成
        if is_build_complete(spec_dir):
            break
        
        # 获取下一个子任务
        subtask_id, subtask = get_next_subtask(spec_dir)
        
        if subtask_id is None:
            break
        
        # 生成子任务提示词
        prompt = generate_subtask_prompt(spec_dir, subtask_id)
        
        # 运行 AI 会话
        result, response = await run_agent_session(
            project_dir, spec_dir, prompt, ...
        )
        
        # 后处理
        await post_session_processing(...)
```

### 2.3 子任务状态流转

```
PENDING → IN_PROGRESS → COMPLETED
                     ↘ FAILED
                     ↘ BLOCKED
```

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `in_progress` | 正在执行 |
| `completed` | 已完成 |
| `blocked` | 被阻塞（依赖未满足） |
| `failed` | 执行失败 |

### 2.4 子任务数据结构

```python
@dataclass
class Subtask:
    id: str                              # 子任务 ID (如 "1.1", "2.3")
    description: str                     # 任务描述
    status: SubtaskStatus = PENDING      # 状态
    
    # 范围
    service: str | None = None           # 所属服务 (backend/frontend/worker)
    all_services: bool = False           # 是否跨服务
    
    # 文件
    files_to_modify: list[str] = []      # 需要修改的文件
    files_to_create: list[str] = []      # 需要创建的文件
    patterns_from: list[str] = []        # 参考的模式文件
    
    # 验证
    verification: Verification | None    # 验证方式
    
    # 调研任务
    expected_output: str | None          # 预期输出
    actual_output: str | None            # 实际输出
    
    # 跟踪
    started_at: str | None               # 开始时间
    completed_at: str | None             # 完成时间
    session_id: int | None               # 完成该任务的会话 ID
```

---

## 3. Phase 结构

### 3.1 Phase 数据结构

```python
@dataclass
class Phase:
    phase: int                    # 编号 (1, 2, 3...)
    name: str                     # 阶段名称
    type: PhaseType               # 阶段类型
    subtasks: list[Subtask]       # 子任务列表
    depends_on: list[int]         # 依赖的阶段编号
    parallel_safe: bool           # 是否可并行执行
```

### 3.2 PhaseType 类型

| 类型 | 说明 | 典型任务 |
|------|------|----------|
| `setup` | 环境准备 | 安装依赖、配置文件 |
| `implementation` | 核心实现 | 编写业务逻辑 |
| `investigation` | 调研分析 | 代码分析、bug 调查 |
| `integration` | 集成测试 | 模块连接、API 对接 |
| `cleanup` | 清理收尾 | 删除旧代码、优化 |

### 3.3 阶段依赖

```python
# Phase 2 依赖 Phase 1
Phase(
    phase=2,
    name="Implementation",
    depends_on=[1]  # 等待 Phase 1 完成
)
```

### 3.4 典型执行流程

```
Phase 1 (SETUP)
    ├── 1.1 安装依赖
    └── 1.2 配置环境
         ↓
Phase 2 (INVESTIGATION)
    ├── 2.1 分析现有代码
    └── 2.2 确定修改方案
         ↓
Phase 3 (IMPLEMENTATION)
    ├── 3.1 创建新模块
    ├── 3.2 实现核心逻辑
    └── 3.3 添加测试
         ↓
Phase 4 (INTEGRATION)
    ├── 4.1 连接模块
    └── 4.2 集成测试
         ↓
Phase 5 (CLEANUP)
    ├── 5.1 删除旧代码
    └── 5.2 代码格式化
```

---

## 4. 验证机制 (Verification)

### 4.1 验证类型

```python
class VerificationType(str, Enum):
    COMMAND = "command"      # 运行 shell 命令
    API = "api"              # 发送 API 请求
    BROWSER = "browser"      # 浏览器自动化
    COMPONENT = "component"  # 组件渲染检查
    MANUAL = "manual"        # 人工验证
    NONE = "none"            # 无需验证（调研任务）
```

### 4.2 验证数据结构

```python
@dataclass
class Verification:
    type: VerificationType
    command: str | None = None      # COMMAND 类型的命令
    endpoint: str | None = None     # API 类型的端点
    expected: str | None = None     # 预期结果
    timeout: int = 30               # 超时时间（秒）
```

---

## 5. 会话管理

### 5.1 会话配置

```python
# 每个阶段可配置不同的模型
DEFAULT_PHASE_MODELS = {
    "spec": "sonnet",
    "planning": "sonnet",
    "coding": "sonnet",
    "qa": "sonnet",
}

# 思考级别配置
DEFAULT_PHASE_THINKING = {
    "spec": True,
    "planning": True,
    "coding": True,
    "qa": True,
}
```

### 5.2 会话后处理

```python
async def post_session_processing(
    spec_dir: Path,
    subtask_id: str,
    session_id: int,
    ...
):
    """会话完成后的处理"""
    # 1. 同步 spec 到源目录（worktree 模式）
    sync_spec_to_source(spec_dir, source_spec_dir)
    
    # 2. 更新 Linear 任务状态
    if linear_enabled:
        await update_linear_progress(...)
    
    # 3. 更新状态管理器
    status_manager.update_subtasks(...)
```

---

## 6. 恢复机制

### 6.1 RecoveryManager

```python
class RecoveryManager:
    """处理任务恢复和内存持久化"""
    
    def __init__(self, spec_dir: Path, project_dir: Path):
        self.spec_dir = spec_dir
        self.project_dir = project_dir
    
    def save_state(self):
        """保存当前状态"""
        ...
    
    def restore_state(self):
        """恢复之前的状态"""
        ...
```

### 6.2 人工干预

当任务卡住时，可以创建 `HUMAN_INTERVENTION` 文件请求人工干预：

```python
HUMAN_INTERVENTION_FILE = ".auto-claude/HUMAN_INTERVENTION"

# 检测人工干预请求
if Path(HUMAN_INTERVENTION_FILE).exists():
    print_status("Human intervention requested", "warning")
    # 暂停执行，等待人工处理
```

---

## 7. 状态同步

### 7.1 前端同步协议

```python
# 阶段事件协议
# 格式: __EXEC_PHASE__:{"phase":"coding","message":"Starting"}

def emit_phase(phase: ExecutionPhase, message: str, ...):
    """发送阶段事件到前端"""
    event = {
        "phase": phase.value,
        "message": message,
    }
    print(f"__EXEC_PHASE__:{json.dumps(event)}")
```

### 7.2 StatusManager

```python
class StatusManager:
    """管理 ccstatusline 状态"""
    
    def set_active(self, spec_name: str, state: BuildState):
        """设置当前活动的 spec"""
        ...
    
    def update_subtasks(self, completed: int, total: int, in_progress: int):
        """更新子任务进度"""
        ...
```

---

## 8. 关键文件清单

| 文件 | 说明 |
|------|------|
| `apps/backend/agents/coder.py` | 主执行循环 |
| `apps/backend/agents/session.py` | 会话管理 |
| `apps/backend/implementation_plan/phase.py` | Phase 数据类 |
| `apps/backend/implementation_plan/subtask.py` | Subtask 数据类 |
| `apps/backend/implementation_plan/enums.py` | 枚举定义 |
| `apps/backend/progress.py` | 进度跟踪 |
| `apps/backend/prompt_generator.py` | 提示词生成 |
| `apps/backend/phase_config.py` | 阶段配置 |
| `apps/backend/core/phase_event.py` | 阶段事件 |
| `apps/backend/recovery.py` | 恢复机制 |

---

## 9. 执行流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Coding 阶段执行流程                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │ 首次运行检测     │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐    是    ┌─────────────────┐              │
│  │ is_first_run?   │────────→│ Planning Session │              │
│  └────────┬────────┘          └────────┬────────┘              │
│           │ 否                          │                       │
│           ▼                             ▼                       │
│  ┌─────────────────┐          ┌─────────────────┐              │
│  │ 加载实现计划     │←─────────│ 生成实现计划     │              │
│  └────────┬────────┘          └─────────────────┘              │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ 获取下一个子任务  │◄──────────────────────┐                  │
│  └────────┬────────┘                        │                  │
│           │                                  │                  │
│           ▼                                  │                  │
│  ┌─────────────────┐    无    ┌────────────┐│                  │
│  │ 有待执行子任务?  │────────→│ 构建完成    ││                  │
│  └────────┬────────┘          └────────────┘│                  │
│           │ 有                               │                  │
│           ▼                                  │                  │
│  ┌─────────────────┐                        │                  │
│  │ 生成子任务提示词  │                        │                  │
│  └────────┬────────┘                        │                  │
│           │                                  │                  │
│           ▼                                  │                  │
│  ┌─────────────────┐                        │                  │
│  │ 运行 AI 会话     │                        │                  │
│  └────────┬────────┘                        │                  │
│           │                                  │                  │
│           ▼                                  │                  │
│  ┌─────────────────┐                        │                  │
│  │ 后处理          │                        │                  │
│  │ - 同步状态      │                        │                  │
│  │ - 更新 Linear   │                        │                  │
│  └────────┬────────┘                        │                  │
│           │                                  │                  │
│           └──────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
