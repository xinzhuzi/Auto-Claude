# Coding 阶段恢复指南

## 概述

本文档提供 Coding 阶段执行过程中遇到问题时的诊断和恢复方法。涵盖常见故障场景、诊断步骤、恢复命令和预防措施。

## 快速诊断清单

| 症状 | 可能原因 | 快速修复 |
|------|----------|----------|
| 任务卡在 `in_progress` | AI 会话中断 | 重置状态为 `pending` |
| Write 工具参数为空 | 输出截断 | 拆分子任务 |
| 子任务反复失败 | 依赖未满足 | 检查依赖顺序 |
| 进度不更新 | 状态同步失败 | 手动同步状态 |
| 验证失败 | 命令错误或环境问题 | 检查验证配置 |

---

## 1. 状态诊断

### 1.1 检查当前状态

```bash
# 查看实现计划状态
cat .auto-claude/specs/<spec_name>/implementation_plan.json | jq '.phases[].subtasks[] | {id, status}'

# 查看所有 pending 任务
cat .auto-claude/specs/<spec_name>/implementation_plan.json | jq '.phases[].subtasks[] | select(.status == "pending")'

# 查看所有 in_progress 任务
cat .auto-claude/specs/<spec_name>/implementation_plan.json | jq '.phases[].subtasks[] | select(.status == "in_progress")'

# 查看失败的任务
cat .auto-claude/specs/<spec_name>/implementation_plan.json | jq '.phases[].subtasks[] | select(.status == "failed")'
```

### 1.2 检查日志

```bash
# 查看最近的执行日志
tail -100 .auto-claude/specs/<spec_name>/logs/coding.log

# 搜索错误信息
grep -i "error\|failed\|exception" .auto-claude/specs/<spec_name>/logs/coding.log

# 查看特定子任务的日志
grep "subtask_id: 3.1" .auto-claude/specs/<spec_name>/logs/coding.log
```

### 1.3 检查会话状态

```bash
# 查看会话历史
ls -la .auto-claude/specs/<spec_name>/sessions/

# 查看最后一个会话
cat .auto-claude/specs/<spec_name>/sessions/session_*.json | tail -1 | jq '.'
```

---

## 2. 常见问题恢复

### 2.1 任务卡在 in_progress

**症状**: 子任务状态为 `in_progress`，但没有 AI 会话在运行

**原因**: 
- AI 会话异常中断
- 进程被强制终止
- 网络连接断开

**恢复步骤**:

```bash
# 方法 1: 使用 jq 重置状态
jq '(.phases[].subtasks[] | select(.status == "in_progress")).status = "pending"' \
  .auto-claude/specs/<spec_name>/implementation_plan.json > tmp.json && \
  mv tmp.json .auto-claude/specs/<spec_name>/implementation_plan.json

# 方法 2: 手动编辑
# 打开 implementation_plan.json，找到 status: "in_progress" 改为 "pending"
```

**Python 脚本恢复**:

```python
import json
from pathlib import Path

def reset_in_progress_tasks(spec_dir: str):
    """重置所有 in_progress 任务为 pending"""
    plan_path = Path(spec_dir) / "implementation_plan.json"
    
    if not plan_path.exists():
        print(f"Plan not found: {plan_path}")
        return
    
    plan = json.loads(plan_path.read_text())
    reset_count = 0
    
    for phase in plan.get("phases", []):
        for subtask in phase.get("subtasks", []):
            if subtask.get("status") == "in_progress":
                subtask["status"] = "pending"
                subtask["started_at"] = None
                reset_count += 1
    
    plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False))
    print(f"Reset {reset_count} tasks to pending")

# 使用
reset_in_progress_tasks(".auto-claude/specs/my-feature")
```

### 2.2 Write 工具参数为空

**症状**: 
```
InputValidationError: Write failed - required parameter 'file_path' is missing
```

**原因**: 子任务输出超出 Claude token 限制，导致工具调用被截断

**恢复步骤**:

```python
from agents.subtask_validator import auto_split_subtask
from pathlib import Path

# 自动拆分问题子任务
plan_path = Path(".auto-claude/specs/<spec_name>/implementation_plan.json")
subtask_id = "3.1"  # 失败的子任务 ID

success = auto_split_subtask(plan_path, subtask_id)
if success:
    print(f"Subtask {subtask_id} has been split")
else:
    print("Auto-split failed, manual intervention required")
```

**手动拆分**:

1. 打开 `implementation_plan.json`
2. 找到问题子任务
3. 将其拆分为多个小任务
4. 保存文件

```json
// 拆分前
{
  "id": "3.1",
  "description": "创建 50×50 的关系矩阵",
  "status": "pending"
}

// 拆分后
{
  "id": "3.1a",
  "description": "创建核心 10×10 矩阵",
  "status": "pending"
},
{
  "id": "3.1b",
  "description": "创建扩展关系",
  "status": "pending"
}
```

### 2.3 子任务反复失败

**症状**: 同一子任务多次执行都失败

**诊断步骤**:

```bash
# 1. 查看失败原因
grep "subtask_id: <id>" .auto-claude/specs/<spec_name>/logs/coding.log | grep -i "error"

# 2. 检查依赖是否满足
cat .auto-claude/specs/<spec_name>/implementation_plan.json | jq '.phases[] | select(.phase == <phase_num>) | .depends_on'

# 3. 检查前置任务状态
cat .auto-claude/specs/<spec_name>/implementation_plan.json | jq '.phases[<prev_phase>].subtasks[].status'
```

**常见原因和解决方案**:

| 原因 | 解决方案 |
|------|----------|
| 依赖任务未完成 | 先完成依赖任务 |
| 文件路径错误 | 检查 `files_to_modify` 路径 |
| 验证命令失败 | 检查 `verification.command` |
| 环境问题 | 检查依赖是否安装 |

### 2.4 进度不更新

**症状**: 任务完成但前端显示进度不变

**原因**:
- StatusManager 同步失败
- 前端未接收到事件

**恢复步骤**:

```bash
# 1. 检查状态文件
cat .auto-claude/ccstatusline.json

# 2. 手动触发同步
python -c "
from core.progress import StatusManager
sm = StatusManager()
sm.refresh()
"

# 3. 重启前端（如果需要）
```

---

## 3. Git 恢复

### 3.1 恢复到上一个稳定状态

```bash
# 查看最近的提交
git log --oneline -10

# 恢复到特定提交（保留工作区更改）
git reset --soft <commit_hash>

# 恢复到特定提交（丢弃工作区更改）
git reset --hard <commit_hash>
```

### 3.2 恢复单个文件

```bash
# 恢复到上一个提交的版本
git checkout HEAD~1 -- <file_path>

# 恢复到特定提交的版本
git checkout <commit_hash> -- <file_path>

# 查看文件历史
git log --oneline -- <file_path>
```

### 3.3 Worktree 模式恢复

如果使用了 worktree 模式：

```bash
# 列出所有 worktree
git worktree list

# 进入 worktree 目录
cd .auto-claude/worktrees/<spec_name>

# 检查 worktree 状态
git status

# 同步 worktree 到主仓库
git push origin HEAD:<branch_name>

# 删除有问题的 worktree
git worktree remove .auto-claude/worktrees/<spec_name>

# 重新创建 worktree
git worktree add .auto-claude/worktrees/<spec_name> -b <branch_name>
```

### 3.4 恢复 implementation_plan.json

```bash
# 从 Git 恢复
git checkout HEAD -- .auto-claude/specs/<spec_name>/implementation_plan.json

# 从备份恢复（如果有）
cp .auto-claude/specs/<spec_name>/implementation_plan.json.bak \
   .auto-claude/specs/<spec_name>/implementation_plan.json
```

---

## 4. 手动恢复代码片段

### 4.1 重置所有任务状态

```python
import json
from pathlib import Path

def reset_all_tasks(spec_dir: str, target_status: str = "pending"):
    """重置所有任务到指定状态"""
    plan_path = Path(spec_dir) / "implementation_plan.json"
    plan = json.loads(plan_path.read_text())
    
    for phase in plan.get("phases", []):
        for subtask in phase.get("subtasks", []):
            subtask["status"] = target_status
            subtask["started_at"] = None
            subtask["completed_at"] = None
            subtask["session_id"] = None
    
    plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False))
    print(f"All tasks reset to {target_status}")

# 使用
reset_all_tasks(".auto-claude/specs/my-feature", "pending")
```

### 4.2 标记特定任务为完成

```python
import json
from pathlib import Path
from datetime import datetime

def mark_task_completed(spec_dir: str, subtask_id: str):
    """手动标记任务为完成"""
    plan_path = Path(spec_dir) / "implementation_plan.json"
    plan = json.loads(plan_path.read_text())
    
    for phase in plan.get("phases", []):
        for subtask in phase.get("subtasks", []):
            if subtask.get("id") == subtask_id:
                subtask["status"] = "completed"
                subtask["completed_at"] = datetime.now().isoformat()
                plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False))
                print(f"Task {subtask_id} marked as completed")
                return
    
    print(f"Task {subtask_id} not found")

# 使用
mark_task_completed(".auto-claude/specs/my-feature", "3.1")
```

### 4.3 跳过失败的任务

```python
import json
from pathlib import Path

def skip_failed_tasks(spec_dir: str):
    """将所有失败任务标记为跳过（completed with notes）"""
    plan_path = Path(spec_dir) / "implementation_plan.json"
    plan = json.loads(plan_path.read_text())
    
    skipped = []
    for phase in plan.get("phases", []):
        for subtask in phase.get("subtasks", []):
            if subtask.get("status") == "failed":
                subtask["status"] = "completed"
                subtask["notes"] = "SKIPPED: Manual intervention"
                skipped.append(subtask.get("id"))
    
    plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False))
    print(f"Skipped tasks: {skipped}")

# 使用
skip_failed_tasks(".auto-claude/specs/my-feature")
```

### 4.4 重新生成实现计划

```python
import asyncio
from pathlib import Path

async def regenerate_plan(spec_dir: str):
    """删除现有计划并重新生成"""
    from agents.coder import run_autonomous_agent
    
    plan_path = Path(spec_dir) / "implementation_plan.json"
    
    # 备份现有计划
    if plan_path.exists():
        backup_path = plan_path.with_suffix(".json.bak")
        plan_path.rename(backup_path)
        print(f"Backed up to {backup_path}")
    
    # 重新运行会触发 Planning 阶段
    # 注意：这会重新生成整个计划
    print("Run the build command to regenerate the plan")

# 使用
asyncio.run(regenerate_plan(".auto-claude/specs/my-feature"))
```

---

## 5. 验证脚本

### 5.1 验证实现计划完整性

```python
import json
from pathlib import Path

def validate_plan(spec_dir: str) -> dict:
    """验证实现计划的完整性"""
    plan_path = Path(spec_dir) / "implementation_plan.json"
    
    if not plan_path.exists():
        return {"valid": False, "error": "Plan file not found"}
    
    try:
        plan = json.loads(plan_path.read_text())
    except json.JSONDecodeError as e:
        return {"valid": False, "error": f"Invalid JSON: {e}"}
    
    issues = []
    
    # 检查必需字段
    if "phases" not in plan:
        issues.append("Missing 'phases' field")
    
    # 检查每个阶段
    for i, phase in enumerate(plan.get("phases", [])):
        if "phase" not in phase:
            issues.append(f"Phase {i}: missing 'phase' number")
        if "subtasks" not in phase:
            issues.append(f"Phase {i}: missing 'subtasks'")
        
        # 检查每个子任务
        for j, subtask in enumerate(phase.get("subtasks", [])):
            if "id" not in subtask:
                issues.append(f"Phase {i}, Subtask {j}: missing 'id'")
            if "description" not in subtask:
                issues.append(f"Phase {i}, Subtask {j}: missing 'description'")
            if "status" not in subtask:
                issues.append(f"Phase {i}, Subtask {j}: missing 'status'")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "phase_count": len(plan.get("phases", [])),
        "subtask_count": sum(len(p.get("subtasks", [])) for p in plan.get("phases", []))
    }

# 使用
result = validate_plan(".auto-claude/specs/my-feature")
print(json.dumps(result, indent=2))
```

### 5.2 验证任务进度

```python
import json
from pathlib import Path

def check_progress(spec_dir: str) -> dict:
    """检查任务执行进度"""
    plan_path = Path(spec_dir) / "implementation_plan.json"
    plan = json.loads(plan_path.read_text())
    
    stats = {
        "pending": 0,
        "in_progress": 0,
        "completed": 0,
        "failed": 0,
        "blocked": 0,
        "total": 0
    }
    
    for phase in plan.get("phases", []):
        for subtask in phase.get("subtasks", []):
            status = subtask.get("status", "pending")
            stats[status] = stats.get(status, 0) + 1
            stats["total"] += 1
    
    stats["progress_percent"] = round(
        stats["completed"] / stats["total"] * 100, 1
    ) if stats["total"] > 0 else 0
    
    return stats

# 使用
progress = check_progress(".auto-claude/specs/my-feature")
print(f"Progress: {progress['progress_percent']}%")
print(f"Completed: {progress['completed']}/{progress['total']}")
```

---

## 6. 人工干预机制

### 6.1 请求人工干预

当自动恢复无法解决问题时，可以请求人工干预：

```bash
# 创建人工干预请求文件
echo "Issue: <描述问题>" > .auto-claude/HUMAN_INTERVENTION
echo "Subtask: <子任务 ID>" >> .auto-claude/HUMAN_INTERVENTION
echo "Expected: <期望行为>" >> .auto-claude/HUMAN_INTERVENTION
```

### 6.2 干预文件格式

```
Issue: Write tool failed with empty parameters
Subtask: 3.1
Expected: Create relationship matrix file
Attempted: Auto-split failed
Action Required: Manual task splitting or simplification
```

### 6.3 处理干预请求

```python
from pathlib import Path

def check_human_intervention(project_dir: str) -> dict | None:
    """检查是否有人工干预请求"""
    intervention_file = Path(project_dir) / ".auto-claude" / "HUMAN_INTERVENTION"
    
    if not intervention_file.exists():
        return None
    
    content = intervention_file.read_text()
    lines = content.strip().split("\n")
    
    result = {}
    for line in lines:
        if ":" in line:
            key, value = line.split(":", 1)
            result[key.strip().lower()] = value.strip()
    
    return result

def clear_human_intervention(project_dir: str):
    """清除人工干预请求"""
    intervention_file = Path(project_dir) / ".auto-claude" / "HUMAN_INTERVENTION"
    if intervention_file.exists():
        intervention_file.unlink()
        print("Human intervention request cleared")

# 使用
intervention = check_human_intervention("/path/to/project")
if intervention:
    print(f"Intervention required: {intervention}")
    # 处理后清除
    clear_human_intervention("/path/to/project")
```

---

## 7. 预防措施

### 7.1 执行前检查清单

| 检查项 | 命令/方法 |
|--------|-----------|
| 实现计划有效 | `validate_plan()` |
| 无超大子任务 | `validate_implementation_plan()` |
| 依赖已安装 | `npm install` / `pip install` |
| Git 状态干净 | `git status` |
| 足够磁盘空间 | `df -h` |

### 7.2 定期备份

```bash
# 备份实现计划
cp .auto-claude/specs/<spec_name>/implementation_plan.json \
   .auto-claude/specs/<spec_name>/implementation_plan.json.$(date +%Y%m%d_%H%M%S)

# 备份整个 spec 目录
tar -czf spec_backup_$(date +%Y%m%d).tar.gz .auto-claude/specs/<spec_name>/
```

### 7.3 监控脚本

```python
import json
import time
from pathlib import Path

def monitor_progress(spec_dir: str, interval: int = 30):
    """监控任务执行进度"""
    plan_path = Path(spec_dir) / "implementation_plan.json"
    
    last_completed = 0
    stall_count = 0
    
    while True:
        plan = json.loads(plan_path.read_text())
        
        completed = sum(
            1 for phase in plan.get("phases", [])
            for subtask in phase.get("subtasks", [])
            if subtask.get("status") == "completed"
        )
        
        in_progress = sum(
            1 for phase in plan.get("phases", [])
            for subtask in phase.get("subtasks", [])
            if subtask.get("status") == "in_progress"
        )
        
        total = sum(
            len(phase.get("subtasks", []))
            for phase in plan.get("phases", [])
        )
        
        print(f"[{time.strftime('%H:%M:%S')}] Progress: {completed}/{total} | In Progress: {in_progress}")
        
        # 检测停滞
        if completed == last_completed and in_progress > 0:
            stall_count += 1
            if stall_count >= 3:
                print("WARNING: Progress appears stalled!")
        else:
            stall_count = 0
        
        last_completed = completed
        
        if completed == total:
            print("All tasks completed!")
            break
        
        time.sleep(interval)

# 使用
monitor_progress(".auto-claude/specs/my-feature", interval=30)
```

---

## 8. 故障排除流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                      故障排除流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │ 发现问题        │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ 1. 检查日志     │                                           │
│  │    grep error   │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐    是    ┌─────────────────┐              │
│  │ 任务卡住?       │────────→│ 重置 in_progress │              │
│  └────────┬────────┘          └─────────────────┘              │
│           │ 否                                                  │
│           ▼                                                     │
│  ┌─────────────────┐    是    ┌─────────────────┐              │
│  │ 输出截断?       │────────→│ 拆分子任务       │              │
│  └────────┬────────┘          └─────────────────┘              │
│           │ 否                                                  │
│           ▼                                                     │
│  ┌─────────────────┐    是    ┌─────────────────┐              │
│  │ 依赖问题?       │────────→│ 检查依赖顺序     │              │
│  └────────┬────────┘          └─────────────────┘              │
│           │ 否                                                  │
│           ▼                                                     │
│  ┌─────────────────┐    是    ┌─────────────────┐              │
│  │ 验证失败?       │────────→│ 检查验证配置     │              │
│  └────────┬────────┘          └─────────────────┘              │
│           │ 否                                                  │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ 请求人工干预     │                                           │
│  └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 相关文件

| 文件 | 说明 |
|------|------|
| `apps/backend/recovery.py` | 恢复机制实现 |
| `apps/backend/agents/coder.py` | 主执行循环 |
| `apps/backend/agents/subtask_validator.py` | 子任务验证 |
| `apps/backend/core/progress.py` | 进度跟踪 |

---

## 10. 联系支持

如果以上方法都无法解决问题：

1. 收集诊断信息：
   - `implementation_plan.json`
   - 最近的日志文件
   - 错误截图

2. 创建 Issue 并附上诊断信息

3. 或在 Discord 频道寻求帮助
