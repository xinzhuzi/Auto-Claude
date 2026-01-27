# Coding 阶段上游修改记录

## 概述

本文档记录了 Auto-Claude 项目在 Coding 阶段对上游代码的主要修改，特别是子任务大小检测和自动拆分功能。这些修改解决了 Claude 输出 token 限制导致的任务执行失败问题。

## 修改动机

| 问题 | 上游行为 | 优化后行为 |
|------|----------|------------|
| 大型子任务执行失败 | 直接执行，输出截断 | 预检测，自动拆分 |
| Write 工具参数为空 | 任务卡住，需人工干预 | 自动检测并恢复 |
| 矩阵类任务失败 | 50×50 矩阵超出限制 | 拆分为多个小矩阵 |
| 批量任务失败 | 100+ 项目一次生成 | 分批处理 |

## 核心修改文件

| 文件 | 修改类型 | 代码行数 | 说明 |
|------|----------|----------|------|
| `apps/backend/agents/subtask_validator.py` | 新增文件 | ~280 行 | 子任务大小验证和自动拆分 |
| `apps/backend/agents/coder.py` | 增强 | +50 行 | 集成子任务验证 |
| `apps/backend/implementation_plan/subtask.py` | 小改 | +10 行 | 新增拆分相关字段 |

---

## 1. 问题背景

### 1.1 Claude 输出限制

Claude 模型有输出 token 限制（约 8000 tokens/响应）。当子任务要求生成大量内容时：

```
用户请求: "创建 50×50 的关系矩阵"
     ↓
Claude 开始生成 Write 工具调用
     ↓
输出达到 token 限制
     ↓
工具调用被截断
     ↓
file_path 和 content 参数为空
     ↓
Write 工具执行失败
     ↓
任务卡住
```

### 1.2 典型失败场景

**场景 1: 矩阵任务**
```
任务: "创建 50×50 的实体关系矩阵"
问题: 2500 个单元格 + 格式化 = 超出限制
```

**场景 2: 批量任务**
```
任务: "为 100 个 API 端点生成文档"
问题: 100 个详细描述 = 超出限制
```

**场景 3: 组合任务**
```
任务: "同时创建数据模型、API 路由、以及前端组件"
问题: 多个大型文件 = 超出限制
```

### 1.3 错误表现

```python
# 典型错误日志
InputValidationError: Write failed - required parameter 'file_path' is missing
InputValidationError: Write failed - required parameter 'content' is missing

# 或者
Tool call truncated: expected closing brace not found
```

---

## 2. 高风险模式检测 (subtask_validator.py)

### 2.1 检测原理

在子任务执行前，扫描任务描述中的高风险模式，预判是否可能超出输出限制。

### 2.2 高风险模式列表

```python
HIGH_RISK_PATTERNS = [
    # ========== 数量指标（中文）==========
    r"[4-9]\d+个",      # 40+ 项目 (如 "50个", "99个")
    r"\d{3,}个",        # 100+ 项目 (如 "100个", "500个")
    r"所有",            # "所有用户", "所有文件"
    r"全部",            # "全部接口", "全部模块"
    r"完整列表",        # "完整列表"
    r"完整的",          # "完整的文档"
    
    # ========== 数量指标（英文）==========
    r"\b(all|every|complete|comprehensive|exhaustive)\b",
    r"\b[4-9]\d+\s+(items?|entities?|entries?|records?)",  # 40+ items
    r"\b\d{3,}\s+(items?|entities?|entries?|records?)",    # 100+ items
    
    # ========== 矩阵/表格指标 ==========
    r"[2-9]\d+\s*[×xX]\s*[2-9]\d+",  # 20×20 或更大
    r"\d{2,}\s*[×xX]\s*\d{2,}",       # 任意两位数×两位数
    r"矩阵",                          # "关系矩阵"
    r"关系表",                        # "实体关系表"
    r"对照表",                        # "功能对照表"
    
    # ========== 组合任务指标 ==========
    r"同时.{5,}并且",    # "同时创建A并且创建B"
    r"以及.{10,}以及",   # "A以及B以及C"
    r"\band\s+also\b",   # "create X and also create Y"
]
```

### 2.3 模式编译（性能优化）

```python
# 预编译正则表达式，避免重复编译
COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in HIGH_RISK_PATTERNS]
```

### 2.4 大小阈值常量

```python
# 每个子任务的最大实体数
MAX_ENTITIES_PER_SUBTASK = 10

# 矩阵的最大维度
MAX_MATRIX_DIMENSION = 10

# 详细描述的最大项目数
MAX_DETAILED_ITEMS = 5
```

### 2.5 检测函数

```python
def is_subtask_oversized(subtask: dict) -> tuple[bool, list[str]]:
    """
    检查子任务是否可能超出输出限制
    
    Args:
        subtask: 子任务字典，必须包含 'description' 字段
    
    Returns:
        (是否超大, 原因列表)
    
    示例:
        >>> subtask = {"description": "创建 50×50 的关系矩阵"}
        >>> is_oversized, reasons = is_subtask_oversized(subtask)
        >>> print(is_oversized)  # True
        >>> print(reasons)  # ["Large matrix detected: 50×50"]
    """
    description = subtask.get("description", "")
    reasons = []
    
    # 检查 1: 高风险模式匹配
    for pattern in COMPILED_PATTERNS:
        if pattern.search(description):
            reasons.append(f"High-risk pattern detected: {pattern.pattern}")
    
    # 检查 2: 显式大数字
    numbers = re.findall(r"\b(\d+)\b", description)
    for num_str in numbers:
        num = int(num_str)
        if num > 30:
            reasons.append(f"Large quantity detected: {num}")
    
    # 检查 3: 矩阵维度
    matrix_match = re.search(r"(\d+)\s*[×xX]\s*(\d+)", description)
    if matrix_match:
        dim1, dim2 = int(matrix_match.group(1)), int(matrix_match.group(2))
        if dim1 > MAX_MATRIX_DIMENSION or dim2 > MAX_MATRIX_DIMENSION:
            reasons.append(f"Large matrix detected: {dim1}×{dim2}")
    
    return len(reasons) > 0, reasons
```

---

## 3. 自动拆分策略

### 3.1 拆分入口函数

```python
def suggest_split(subtask: dict) -> list[dict]:
    """
    为超大子任务生成拆分建议
    
    Args:
        subtask: 原始子任务
    
    Returns:
        拆分后的子任务列表
    
    拆分策略优先级:
        1. 矩阵任务 → _split_matrix_task()
        2. 数量任务 → _split_quantity_task()
        3. 组合任务 → _split_combined_task()
        4. 无法拆分 → 标记为需人工审查
    """
    description = subtask.get("description", "")
    subtask_id = subtask.get("id", "subtask-unknown")
    
    # 策略 1: 检测矩阵任务
    matrix_match = re.search(r"(\d+)\s*[×xX]\s*(\d+)", description)
    if matrix_match:
        dim1, dim2 = int(matrix_match.group(1)), int(matrix_match.group(2))
        return _split_matrix_task(subtask_id, description, dim1, dim2)
    
    # 策略 2: 检测数量任务
    quantity_match = re.search(r"(\d+)\s*个", description)
    if quantity_match:
        quantity = int(quantity_match.group(1))
        if quantity > MAX_ENTITIES_PER_SUBTASK:
            return _split_quantity_task(subtask_id, description, quantity)
    
    # 策略 3: 检测组合任务
    if re.search(r"(同时|并且|以及|and also)", description, re.IGNORECASE):
        return _split_combined_task(subtask_id, description)
    
    # 策略 4: 无法自动拆分，标记为需人工审查
    return [{
        "id": f"{subtask_id}-review",
        "description": f"[NEEDS MANUAL SPLIT] {description}",
        "status": "pending",
        "notes": "Auto-split could not determine optimal splitting strategy"
    }]
```

### 3.2 矩阵任务拆分 (_split_matrix_task)

**适用场景**: 任务描述中包含 `N×M` 格式的矩阵

**拆分策略**:
1. 核心矩阵: 取前 10×10（或更小）
2. 扩展关系: 核心与剩余项的关系
3. 摘要: 剩余项的简化描述

```python
def _split_matrix_task(subtask_id: str, description: str, dim1: int, dim2: int) -> list[dict]:
    """
    拆分矩阵类任务
    
    示例:
        输入: "创建 50×50 的实体关系矩阵"
        输出:
            - 3.1a: 创建核心矩阵 (10×10)
            - 3.1b: 创建核心与次要项的关系
            - 3.1c: 创建剩余 40 项的简化摘要
    """
    suggestions = []
    suffix = ord('a')  # 子任务后缀: a, b, c...
    
    # Step 1: 核心矩阵（最大 10×10）
    core_size = min(dim1, dim2, MAX_MATRIX_DIMENSION)
    suggestions.append({
        "id": f"{subtask_id}{chr(suffix)}",
        "description": f"Create core matrix (top {core_size}×{core_size})",
        "status": "pending"
    })
    suffix += 1
    
    # Step 2: 核心与剩余项的关系（如果有剩余）
    if dim1 > core_size or dim2 > core_size:
        suggestions.append({
            "id": f"{subtask_id}{chr(suffix)}",
            "description": f"Create relationships between core ({core_size}) and secondary items",
            "status": "pending"
        })
        suffix += 1
    
    # Step 3: 剩余项的简化摘要
    remaining = max(dim1, dim2) - core_size
    if remaining > 0:
        suggestions.append({
            "id": f"{subtask_id}{chr(suffix)}",
            "description": f"Create simplified relationship summary for remaining {remaining} items",
            "status": "pending"
        })
    
    return suggestions
```

**拆分示例**:

| 原始任务 | 拆分后 |
|----------|--------|
| 创建 50×50 关系矩阵 | 3.1a: 核心 10×10 矩阵 |
| | 3.1b: 核心与次要项关系 |
| | 3.1c: 剩余 40 项摘要 |

### 3.3 数量任务拆分 (_split_quantity_task)

**适用场景**: 任务描述中包含 `N个` 格式的数量

**拆分策略**: 按批次处理，每批最多 10 项

```python
def _split_quantity_task(subtask_id: str, description: str, quantity: int) -> list[dict]:
    """
    拆分数量类任务
    
    示例:
        输入: "为 100 个 API 端点生成文档"
        输出:
            - 2.1a: items 1-10
            - 2.1b: items 11-20
            - ...
            - 2.1j: items 91-100
    """
    suggestions = []
    batch_size = MAX_ENTITIES_PER_SUBTASK  # 10
    suffix = ord('a')
    
    for start in range(1, quantity + 1, batch_size):
        end = min(start + batch_size - 1, quantity)
        
        # 替换描述中的数量为批次范围
        batch_desc = re.sub(
            r"\d+\s*个",
            f"items {start}-{end}",
            description
        )
        
        suggestions.append({
            "id": f"{subtask_id}{chr(suffix)}",
            "description": batch_desc,
            "status": "pending"
        })
        
        suffix += 1
        if suffix > ord('z'):
            suffix = ord('a')  # 超过 26 个批次时循环
    
    return suggestions
```

**拆分示例**:

| 原始任务 | 拆分后 |
|----------|--------|
| 为 35 个端点生成文档 | 2.1a: items 1-10 |
| | 2.1b: items 11-20 |
| | 2.1c: items 21-30 |
| | 2.1d: items 31-35 |

### 3.4 组合任务拆分 (_split_combined_task)

**适用场景**: 任务描述中包含 `同时`、`并且`、`以及`、`and also` 等连接词

**拆分策略**: 按连接词分割为独立任务

```python
def _split_combined_task(subtask_id: str, description: str) -> list[dict]:
    """
    拆分组合类任务
    
    示例:
        输入: "创建用户模型，同时添加验证逻辑，并且编写单元测试"
        输出:
            - 4.1a: 创建用户模型
            - 4.1b: 添加验证逻辑
            - 4.1c: 编写单元测试
    """
    suggestions = []
    
    # 按连接词分割
    parts = re.split(
        r"[,，]?\s*(同时|并且|以及|and also|and)\s*",
        description,
        flags=re.IGNORECASE
    )
    
    # 过滤掉连接词本身
    parts = [
        p.strip() for p in parts
        if p.strip() and p.lower() not in ['同时', '并且', '以及', 'and also', 'and']
    ]
    
    if len(parts) > 1:
        for i, part in enumerate(parts):
            suggestions.append({
                "id": f"{subtask_id}{chr(ord('a') + i)}",
                "description": part,
                "status": "pending"
            })
    else:
        # 无法分割，标记为需人工审查
        suggestions.append({
            "id": f"{subtask_id}-review",
            "description": f"[NEEDS MANUAL SPLIT] {description}",
            "status": "pending"
        })
    
    return suggestions
```

**拆分示例**:

| 原始任务 | 拆分后 |
|----------|--------|
| 创建模型，同时添加验证，并且写测试 | 4.1a: 创建模型 |
| | 4.1b: 添加验证 |
| | 4.1c: 写测试 |

---

## 4. 实现计划验证

### 4.1 验证函数

```python
def validate_implementation_plan(plan_path: Path) -> dict:
    """
    验证实现计划中所有子任务的大小
    
    Args:
        plan_path: implementation_plan.json 的路径
    
    Returns:
        {
            "valid": bool,           # 是否全部通过
            "warnings": list[str],   # 警告信息
            "oversized_subtasks": [  # 超大子任务列表
                {
                    "id": "3.1",
                    "phase": 3,
                    "reasons": ["Large matrix detected: 50×50"]
                }
            ],
            "suggestions": {         # 拆分建议
                "3.1": [
                    {"id": "3.1a", "description": "..."},
                    {"id": "3.1b", "description": "..."}
                ]
            }
        }
    """
    if not plan_path.exists():
        return {"error": "Plan file not found", "valid": False}
    
    try:
        plan = json.loads(plan_path.read_text())
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON: {e}", "valid": False}
    
    results = {
        "valid": True,
        "warnings": [],
        "oversized_subtasks": [],
        "suggestions": {}
    }
    
    # 遍历所有阶段和子任务
    for phase in plan.get("phases", []):
        for subtask in phase.get("subtasks", []):
            is_oversized, reasons = is_subtask_oversized(subtask)
            
            if is_oversized:
                results["valid"] = False
                subtask_id = subtask.get("id", "unknown")
                
                results["oversized_subtasks"].append({
                    "id": subtask_id,
                    "phase": phase.get("id"),
                    "reasons": reasons
                })
                
                results["suggestions"][subtask_id] = suggest_split(subtask)
                
                results["warnings"].append(
                    f"Subtask {subtask_id} may exceed output limits: {', '.join(reasons)}"
                )
    
    return results
```

### 4.2 使用示例

```python
# 在 coder.py 中集成验证
from agents.subtask_validator import validate_implementation_plan

async def run_autonomous_agent(...):
    plan_path = spec_dir / "implementation_plan.json"
    
    # 执行前验证
    validation = validate_implementation_plan(plan_path)
    
    if not validation["valid"]:
        print_status("Found oversized subtasks:", "warning")
        for warning in validation["warnings"]:
            print_status(f"  - {warning}", "warning")
        
        # 询问是否自动拆分
        if auto_split_enabled:
            for subtask_id in validation["suggestions"]:
                auto_split_subtask(plan_path, subtask_id)
```

---

## 5. 自动拆分执行

### 5.1 拆分执行函数

```python
def auto_split_subtask(plan_path: Path, subtask_id: str) -> bool:
    """
    自动拆分实现计划中的超大子任务
    
    Args:
        plan_path: implementation_plan.json 的路径
        subtask_id: 要拆分的子任务 ID
    
    Returns:
        是否拆分成功
    
    执行流程:
        1. 加载实现计划
        2. 找到目标子任务
        3. 生成拆分建议
        4. 替换原子任务
        5. 保存更新后的计划
    """
    if not plan_path.exists():
        logger.error(f"Plan file not found: {plan_path}")
        return False
    
    try:
        plan = json.loads(plan_path.read_text())
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in plan: {e}")
        return False
    
    # 遍历查找目标子任务
    for phase in plan.get("phases", []):
        subtasks = phase.get("subtasks", [])
        
        for i, subtask in enumerate(subtasks):
            if subtask.get("id") == subtask_id:
                # 生成拆分建议
                new_subtasks = suggest_split(subtask)
                
                # 检查是否成功拆分
                if not new_subtasks:
                    logger.warning(f"Could not auto-split subtask {subtask_id}")
                    return False
                
                if len(new_subtasks) == 1 and "-review" in new_subtasks[0].get("id", ""):
                    logger.warning(f"Could not auto-split subtask {subtask_id}")
                    return False
                
                # 复制原子任务的元数据到新子任务
                for new_subtask in new_subtasks:
                    new_subtask["service"] = subtask.get("service", "all")
                    new_subtask["files_to_modify"] = subtask.get("files_to_modify", [])
                    new_subtask["files_to_create"] = []  # 由各子任务自行确定
                    new_subtask["patterns_from"] = subtask.get("patterns_from", [])
                    new_subtask["verification"] = subtask.get("verification", {"type": "manual"})
                
                # 替换原子任务
                subtasks[i:i+1] = new_subtasks
                phase["subtasks"] = subtasks
                
                # 保存更新后的计划
                plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False))
                
                logger.info(f"Split subtask {subtask_id} into {len(new_subtasks)} smaller subtasks")
                return True
    
    logger.error(f"Subtask {subtask_id} not found in plan")
    return False
```

### 5.2 拆分前后对比

**拆分前的 implementation_plan.json**:
```json
{
  "phases": [
    {
      "phase": 3,
      "name": "Data Modeling",
      "subtasks": [
        {
          "id": "3.1",
          "description": "创建 50×50 的实体关系矩阵",
          "status": "pending",
          "service": "backend"
        }
      ]
    }
  ]
}
```

**拆分后的 implementation_plan.json**:
```json
{
  "phases": [
    {
      "phase": 3,
      "name": "Data Modeling",
      "subtasks": [
        {
          "id": "3.1a",
          "description": "Create core matrix (top 10×10)",
          "status": "pending",
          "service": "backend"
        },
        {
          "id": "3.1b",
          "description": "Create relationships between core (10) and secondary items",
          "status": "pending",
          "service": "backend"
        },
        {
          "id": "3.1c",
          "description": "Create simplified relationship summary for remaining 40 items",
          "status": "pending",
          "service": "backend"
        }
      ]
    }
  ]
}
```

---

## 6. 错误检测和恢复

### 6.1 空参数错误检测

当 Write 工具因输出截断而失败时，会产生特定的错误模式：

```python
def detect_empty_param_error(error_message: str) -> bool:
    """
    检测是否为 Write 工具空参数错误
    
    Args:
        error_message: 工具执行的错误信息
    
    Returns:
        是否为空参数错误
    
    典型错误信息:
        - "required parameter 'file_path' is missing"
        - "required parameter 'content' is missing"
        - "InputValidationError: Write failed"
    """
    patterns = [
        r"required parameter.*file_path.*missing",
        r"required parameter.*content.*missing",
        r"InputValidationError.*Write failed",
    ]
    
    for pattern in patterns:
        if re.search(pattern, error_message, re.IGNORECASE):
            return True
    
    return False
```

### 6.2 在 coder.py 中的集成

```python
# apps/backend/agents/coder.py

from agents.subtask_validator import (
    is_subtask_oversized,
    auto_split_subtask,
    detect_empty_param_error
)

async def run_autonomous_agent(...):
    while True:
        subtask_id, subtask = get_next_subtask(spec_dir)
        
        if subtask_id is None:
            break
        
        # ========== 新增: 执行前检查 ==========
        is_oversized, reasons = is_subtask_oversized(subtask)
        if is_oversized:
            print_status(f"Subtask {subtask_id} may be too large:", "warning")
            for reason in reasons:
                print_status(f"  - {reason}", "warning")
            
            # 自动拆分
            if auto_split_subtask(plan_path, subtask_id):
                print_status(f"Subtask {subtask_id} has been split", "success")
                continue  # 重新获取下一个子任务
        # ========================================
        
        # 执行子任务
        result, response = await run_agent_session(...)
        
        # ========== 新增: 执行后错误检测 ==========
        if not result.success:
            error_msg = result.error or ""
            
            if detect_empty_param_error(error_msg):
                print_status("Detected output truncation error", "warning")
                
                # 尝试自动拆分并重试
                if auto_split_subtask(plan_path, subtask_id):
                    print_status(f"Subtask {subtask_id} split, will retry", "info")
                    continue
        # ==========================================
        
        await post_session_processing(...)
```

### 6.3 恢复流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    子任务执行与恢复流程                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │ 获取下一个子任务  │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐    是    ┌─────────────────┐              │
│  │ is_oversized?   │────────→│ 自动拆分子任务    │              │
│  └────────┬────────┘          └────────┬────────┘              │
│           │ 否                          │                       │
│           ▼                             │ 成功                  │
│  ┌─────────────────┐                   │                       │
│  │ 执行 AI 会话     │←──────────────────┘                       │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐    是    ┌─────────────────┐              │
│  │ 执行成功?       │────────→│ 后处理          │              │
│  └────────┬────────┘          └─────────────────┘              │
│           │ 否                                                  │
│           ▼                                                     │
│  ┌─────────────────┐    是    ┌─────────────────┐              │
│  │ 空参数错误?     │────────→│ 自动拆分并重试   │              │
│  └────────┬────────┘          └────────┬────────┘              │
│           │ 否                          │                       │
│           ▼                             │                       │
│  ┌─────────────────┐                   │                       │
│  │ 标记任务失败     │                   │                       │
│  └─────────────────┘                   │                       │
│           ▲                             │                       │
│           └─────────────────────────────┘ 拆分失败              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 配置参数

### 7.1 大小阈值

```python
# apps/backend/agents/subtask_validator.py

# 每个子任务的最大实体数量
MAX_ENTITIES_PER_SUBTASK = 10

# 矩阵的最大维度（超过此值将触发拆分）
MAX_MATRIX_DIMENSION = 10

# 详细描述的最大项目数
MAX_DETAILED_ITEMS = 5
```

### 7.2 调整建议

| 场景 | 建议调整 |
|------|----------|
| 使用更强模型 (Opus) | 可适当增大阈值 |
| 输出频繁截断 | 减小阈值 |
| 简单任务被过度拆分 | 增大阈值或调整模式 |

---

## 8. 相关文件清单

| 文件 | 说明 |
|------|------|
| `apps/backend/agents/subtask_validator.py` | 子任务验证器（本文档主要内容） |
| `apps/backend/agents/coder.py` | 集成验证器的主执行循环 |
| `apps/backend/implementation_plan/subtask.py` | Subtask 数据类 |
| `apps/backend/implementation_plan/plan.py` | 实现计划加载/保存 |

---

## 9. 测试用例

### 9.1 矩阵任务测试

```python
def test_matrix_split():
    subtask = {
        "id": "3.1",
        "description": "创建 50×50 的实体关系矩阵"
    }
    
    is_oversized, reasons = is_subtask_oversized(subtask)
    assert is_oversized == True
    assert "Large matrix detected: 50×50" in reasons[0]
    
    splits = suggest_split(subtask)
    assert len(splits) == 3
    assert splits[0]["id"] == "3.1a"
    assert "core matrix" in splits[0]["description"].lower()
```

### 9.2 数量任务测试

```python
def test_quantity_split():
    subtask = {
        "id": "2.1",
        "description": "为 35 个 API 端点生成文档"
    }
    
    is_oversized, reasons = is_subtask_oversized(subtask)
    assert is_oversized == True
    
    splits = suggest_split(subtask)
    assert len(splits) == 4  # 35 / 10 = 4 批次
```

### 9.3 组合任务测试

```python
def test_combined_split():
    subtask = {
        "id": "4.1",
        "description": "创建用户模型，同时添加验证逻辑，并且编写单元测试"
    }
    
    splits = suggest_split(subtask)
    assert len(splits) == 3
    assert "用户模型" in splits[0]["description"]
    assert "验证逻辑" in splits[1]["description"]
    assert "单元测试" in splits[2]["description"]
```

---

## 10. 常见问题

### Q1: 为什么阈值设为 10？

Claude 的输出限制约 8000 tokens。经验表明：
- 10 个详细实体描述 ≈ 3000-4000 tokens
- 留有余量给格式化和其他内容
- 10×10 矩阵 = 100 单元格，在安全范围内

### Q2: 拆分后子任务 ID 的命名规则？

- 原 ID + 小写字母后缀
- 例: `3.1` → `3.1a`, `3.1b`, `3.1c`
- 超过 26 个时循环: `3.1z` → `3.1a`（极少见）

### Q3: 如何处理无法自动拆分的任务？

- 标记为 `[NEEDS MANUAL SPLIT]`
- 状态保持 `pending`
- 需要人工编辑 `implementation_plan.json`

### Q4: 拆分会影响任务依赖吗？

- 拆分后的子任务继承原任务的依赖
- 拆分后的子任务之间默认无依赖（可并行）
- 如需顺序执行，需手动添加依赖

---

## 更新日志

| 日期 | 修改内容 | 影响文件 |
|------|----------|----------|
| 2024-XX | 新增子任务验证器 | subtask_validator.py |
| 2024-XX | 集成到 coder.py | coder.py |
| 2024-XX | 添加空参数错误检测 | subtask_validator.py |
| 2024-XX | 优化矩阵拆分策略 | subtask_validator.py |
