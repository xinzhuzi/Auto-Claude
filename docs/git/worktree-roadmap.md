# Worktree 功能路线图

## 概述

本文档记录 worktree 相关的未实现功能及其设计方案。

## 当前状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 基础 worktree 管理 | ✅ 已实现 | 创建、删除、列表 |
| 稀疏检出优化 | ✅ 已实现 | 大型项目支持 |
| PR 创建 | ✅ 已实现 | push + gh pr create |
| 分支合并 | ✅ 已实现 | merge_worktree() |
| 默认不使用 worktree | ✅ 已实现 | 前端默认关闭 |

## 未实现功能

| 功能 | 优先级 | 复杂度 |
|------|--------|--------|
| Unity 任务最佳分支策略 | 中 | 中 |
| QA 验证阶段合并流程 | 高 | 高 |
| 验证失败后修复流程 | 高 | 中 |
| 任务类型自动选择 | 中 | 低 |

---

## 1. 任务类型自动选择

### 1.1 问题描述

当前用户需要手动选择是否使用 worktree。应该根据任务类型自动推荐最佳策略。

### 1.2 "优化任务描述" 按钮功能

在任务创建界面添加一个"优化任务描述"按钮，点击后与 AI 通信，AI 会：
1. 优化用户输入的任务描述（提示词优化）
2. 分析任务特征，给出是否使用 worktree 的推荐

#### 1.2.1 功能流程

```
用户输入描述 → 点击"优化任务描述"按钮 → 调用 AI API → 返回优化后的描述 + worktree 推荐
                                                              ↓
                                              自动填入描述框 + 显示推荐提示
```

#### 1.2.2 AI 推荐 Worktree 的场景

AI 在以下情况下会推荐使用 worktree：

| 场景 | 检测方式 | 推荐原因 |
|------|----------|----------|
| **设计/文档类任务** | 任务描述包含"设计"、"文档"、"README"等关键词，且目标文件夹包含大量文本内容 | 纯文本操作但影响范围大，需要隔离 |
| **大面积重构** | 任务描述包含"重构"、"refactor"、"migration"、"迁移"等关键词 | 高风险修改，需要安全回滚能力 |
| **复杂度高** | AI 分析任务描述，判断涉及多个模块、多文件修改 | 复杂任务需要隔离审查 |
| **用户明确要求** | 任务描述中包含"worktree"、"隔离"、"独立分支"等关键词 | 尊重用户意图 |

#### 1.2.3 设计/文档类任务的特殊判断

对于设计类和文档类任务，需要额外检查目标文件夹：

```python
# apps/backend/core/worktree_helper.py
def should_use_worktree_for_doc_task(
    project_dir: Path,
    task_description: str,
    target_paths: list[str],
) -> tuple[bool, str]:
    """
    判断文档/设计类任务是否需要 worktree
    
    判断逻辑:
        1. 如果目标文件夹包含大量文本文件（>50个），推荐 worktree
        2. 如果只是简单的单文件文档修改，不需要 worktree
    """
    text_extensions = {
        '.md', '.txt', '.rst', '.adoc', '.org',
        '.json', '.yaml', '.yml', '.toml', '.xml',
        '.html', '.css', '.js', '.ts', '.py', '.java',
        '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
    }
    
    for target_path in target_paths:
        full_path = project_dir / target_path
        
        if full_path.is_dir():
            # 统计文本文件数量
            text_file_count = sum(
                1 for f in full_path.rglob("*") 
                if f.is_file() and f.suffix.lower() in text_extensions
            )
            if text_file_count > 50:
                return True, f"目标文件夹 {target_path} 包含 {text_file_count} 个文本文件，建议隔离"
    
    return False, "简单文档修改，直接模式更快"
```

#### 1.2.4 后端 API 设计

使用项目现有的 `create_simple_client` 调用 AI：

```python
# apps/backend/api/task_optimize_helper.py

import logging
from pathlib import Path
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ============================================================
# 数据模型
# ============================================================

class OptimizeTaskRequest(BaseModel):
    task_description: str
    project_path: str
    target_paths: list[str] | None = None  # 用户 @ 引用的文件/文件夹

class WorktreeRecommendation(BaseModel):
    use_worktree: bool
    reason: str
    confidence: str  # "high" | "medium" | "low"

class OptimizeTaskResponse(BaseModel):
    optimized_description: str
    worktree_recommendation: WorktreeRecommendation
    improvements: list[str]  # AI 做了哪些优化

# ============================================================
# 系统提示词
# ============================================================

OPTIMIZE_TASK_SYSTEM_PROMPT = """你是一个任务描述优化专家。你的工作是：
1. 优化用户的任务描述，使其更清晰、更具体、更易于执行
2. 分析任务特征，判断是否需要使用 worktree 隔离模式

优化规则：
- 保持原意，但使描述更具体
- 添加必要的上下文信息
- 如果涉及文件路径，确保路径清晰
- 使用结构化的格式（如编号列表）

Worktree 推荐规则：
1. 如果是设计/文档类任务，且目标文件夹包含大量文本内容（>50个文件），推荐使用
2. 如果涉及大面积重构、迁移、架构修改，推荐使用
3. 如果任务复杂度高（涉及多模块、多文件），推荐使用
4. 如果用户描述中明确提到 worktree/隔离/独立分支，推荐使用
5. 简单的单文件修改、bug 修复，不需要使用

返回 JSON 格式：
{
    "optimized_description": "优化后的描述",
    "improvements": ["改进点1", "改进点2"],
    "worktree_analysis": {
        "use_worktree": true/false,
        "reason": "推荐原因",
        "confidence": "high/medium/low"
    }
}"""

# ============================================================
# AI 调用
# ============================================================

async def _call_claude_for_optimization(prompt: str) -> str:
    """
    调用 Claude 进行任务优化
    
    复用项目现有的 create_simple_client 模式
    """
    from core.auth import ensure_claude_code_oauth_token, get_auth_token
    from core.model_config import get_utility_model_config

    if not get_auth_token():
        logger.warning("No authentication token found")
        return ""

    ensure_claude_code_oauth_token()

    try:
        from core.simple_client import create_simple_client
    except ImportError:
        logger.warning("core.simple_client not available")
        return ""

    # 获取模型配置
    model, thinking_budget = get_utility_model_config()

    logger.info(f"Task optimization using model={model}, thinking_budget={thinking_budget}")

    # 创建客户端 - 使用 commit_message agent_type（文本生成，无工具）
    client = create_simple_client(
        agent_type="commit_message",  # 复用现有的文本生成配置
        model=model,
        system_prompt=OPTIMIZE_TASK_SYSTEM_PROMPT,
        max_thinking_tokens=thinking_budget,
    )

    try:
        async with client:
            await client.query(prompt)

            response_text = ""
            async for msg in client.receive_response():
                msg_type = type(msg).__name__
                if msg_type == "AssistantMessage" and hasattr(msg, "content"):
                    for block in msg.content:
                        block_type = type(block).__name__
                        if block_type == "TextBlock" and hasattr(block, "text"):
                            response_text += block.text

            logger.info(f"Task optimization response: {len(response_text)} chars")
            return response_text.strip()

    except Exception as e:
        logger.error(f"Claude SDK call failed: {e}")
        return ""

# ============================================================
# 主函数
# ============================================================

async def optimize_task_description(
    request: OptimizeTaskRequest,
) -> OptimizeTaskResponse:
    """
    调用 AI 优化任务描述并给出 worktree 推荐
    """
    import json
    
    # 构建提示词
    prompt = f"""请优化以下任务描述：

原始描述:
{request.task_description}

项目路径: {request.project_path}
引用的文件/文件夹: {request.target_paths or "无"}

请返回 JSON 格式的优化结果。"""

    # 调用 AI
    response_text = await _call_claude_for_optimization(prompt)
    
    # 解析响应
    try:
        # 尝试从响应中提取 JSON
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
            
            return OptimizeTaskResponse(
                optimized_description=result.get("optimized_description", request.task_description),
                worktree_recommendation=WorktreeRecommendation(
                    use_worktree=result.get("worktree_analysis", {}).get("use_worktree", False),
                    reason=result.get("worktree_analysis", {}).get("reason", ""),
                    confidence=result.get("worktree_analysis", {}).get("confidence", "low"),
                ),
                improvements=result.get("improvements", []),
            )
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
    
    # 解析失败时返回原始描述
    return OptimizeTaskResponse(
        optimized_description=request.task_description,
        worktree_recommendation=WorktreeRecommendation(
            use_worktree=False,
            reason="AI 响应解析失败",
            confidence="low",
        ),
        improvements=[],
    )
```

#### 1.2.5 前端实现

按钮位置：在"描述 *"标签后面，横向排布，放在最右侧。

```typescript
// apps/frontend/src/renderer/components/TaskCreationHelper.tsx

import { Sparkles, Loader2 } from 'lucide-react';

interface OptimizeTaskResponse {
  optimized_description: string;
  worktree_recommendation: {
    use_worktree: boolean;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  };
  improvements: string[];
}

// 状态（添加到 TaskCreationWizard 组件中）
const [isOptimizing, setIsOptimizing] = useState(false);
const [worktreeRecommendation, setWorktreeRecommendation] = useState<{
  use_worktree: boolean;
  reason: string;
} | null>(null);

// 优化任务描述
const handleOptimizeDescription = async () => {
  if (!description.trim() || !projectPath) return;
  
  setIsOptimizing(true);
  try {
    const response = await window.electronAPI.optimizeTaskDescription({
      task_description: description,
      project_path: projectPath,
      target_paths: referencedFiles.map(f => f.path),
    });
    
    if (response.success && response.data) {
      // 更新描述
      setDescription(response.data.optimized_description);
      
      // 显示 worktree 推荐
      setWorktreeRecommendation(response.data.worktree_recommendation);
      
      // 如果 AI 推荐使用 worktree，自动勾选
      if (response.data.worktree_recommendation.use_worktree) {
        setUseWorktree(true);
        setShowGitOptions(true);  // 展开 Git Options 让用户看到
      }
    }
  } catch (err) {
    console.error('Failed to optimize description:', err);
  } finally {
    setIsOptimizing(false);
  }
};

// UI 渲染 - 按钮在"描述 *"标签行的最右侧
<div className="space-y-2">
  {/* 标签行：描述 * 在左侧，优化按钮在右侧 */}
  <div className="flex items-center justify-between">
    <Label htmlFor="description">
      {t('tasks:form.description')} <span className="text-destructive">*</span>
    </Label>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleOptimizeDescription}
      disabled={isOptimizing || !description.trim()}
      className="gap-1.5 h-7 text-xs"
    >
      {isOptimizing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('tasks:wizard.optimizing')}
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3" />
          {t('tasks:wizard.optimizeDescription')}
        </>
      )}
    </Button>
  </div>
  
  {/* 描述输入框 */}
  <Textarea
    id="description"
    value={description}
    onChange={(e) => handleDescriptionChange(e.target.value)}
    placeholder={t('tasks:wizard.descriptionPlaceholder')}
  />
  
  {/* Worktree 推荐提示 - 显示在描述框下方 */}
  {worktreeRecommendation && (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-md text-sm",
      worktreeRecommendation.use_worktree
        ? "bg-warning/10 text-warning border border-warning/20"
        : "bg-muted text-muted-foreground"
    )}>
      <span className="mt-0.5">
        {worktreeRecommendation.use_worktree ? '⚠️' : '💡'}
      </span>
      <div>
        <p className="font-medium">
          {worktreeRecommendation.use_worktree
            ? t('tasks:wizard.worktreeRecommended')
            : t('tasks:wizard.directModeRecommended')}
        </p>
        <p className="text-xs mt-1 opacity-80">
          {worktreeRecommendation.reason}
        </p>
      </div>
    </div>
  )}
</div>
```

#### 1.2.6 i18n 翻译键

```json
// apps/frontend/src/renderer/locales/zh-CN/tasks.json
{
  "wizard": {
    "optimizeDescription": "AI 优化描述",
    "optimizing": "优化中...",
    "worktreeRecommended": "建议使用隔离工作空间 (Worktree)",
    "directModeRecommended": "建议使用直接模式"
  }
}

// apps/frontend/src/renderer/locales/en/tasks.json
{
  "wizard": {
    "optimizeDescription": "AI Optimize",
    "optimizing": "Optimizing...",
    "worktreeRecommended": "Recommend using isolated workspace (Worktree)",
    "directModeRecommended": "Recommend using direct mode"
  }
}
```

#### 1.2.7 AI 提示词优化示例

**输入**：
```
在 docs 文件夹下写一个设计文档
```

**AI 优化后**：
```
在 docs/ 目录下创建一个新的设计文档，包含以下内容：
1. 功能概述
2. 技术方案
3. 接口设计
4. 数据模型
5. 实现计划

文件命名建议：docs/design/[feature-name]-design.md
```

**Worktree 推荐**：
```json
{
  "use_worktree": true,
  "reason": "docs 文件夹包含 120 个文本文件，建议使用隔离工作空间以便于审查",
  "confidence": "high"
}
```

---

## 2. Unity 任务最佳分支策略

### 2.1 问题描述

Unity 项目有特殊的文件结构（.meta 文件、大型二进制资源），需要特殊处理。

### 2.2 设计方案

```python
# apps/backend/core/worktree.py

def detect_unity_project(project_dir: Path) -> bool:
    """检测是否为 Unity 项目"""
    unity_indicators = [
        "Assets/",
        "ProjectSettings/",
        "Packages/manifest.json",
        "*.unity",
    ]
    
    for indicator in unity_indicators:
        if "*" in indicator:
            # glob 模式
            if list(project_dir.glob(indicator)):
                return True
        else:
            if (project_dir / indicator).exists():
                return True
    return False

def get_unity_sparse_patterns(task_description: str) -> list[str]:
    """为 Unity 项目生成稀疏检出模式"""
    patterns = [
        # 必须包含的配置文件
        "ProjectSettings/",
        "Packages/",
        
        # 根据任务描述推断需要的目录
        # 默认包含 Scripts 目录
        "Assets/Scripts/",
    ]
    
    # 解析任务描述中提到的路径
    path_matches = re.findall(r"Assets/[a-zA-Z0-9_\-/]+", task_description)
    for path in path_matches:
        # 确保包含 .meta 文件
        patterns.append(path)
        if not path.endswith("/"):
            patterns.append(path + ".meta")
    
    return patterns

def create_unity_worktree(
    manager: WorktreeManager,
    spec_name: str,
    task_description: str,
) -> WorktreeInfo:
    """为 Unity 项目创建优化的 worktree"""
    sparse_patterns = get_unity_sparse_patterns(task_description)
    
    return manager.create_worktree_optimized(
        spec_name,
        sparse_patterns=sparse_patterns,
        use_sparse_checkout=True,
    )
```

### 2.3 Unity 特殊处理

```python
# Unity 项目的 .gitattributes 建议
UNITY_GITATTRIBUTES = """
# Unity YAML files
*.unity text merge=unityyamlmerge
*.prefab text merge=unityyamlmerge
*.asset text merge=unityyamlmerge
*.meta text merge=unityyamlmerge

# Binary files
*.png binary
*.jpg binary
*.fbx binary
*.wav binary
*.mp3 binary
"""

def setup_unity_merge_driver(project_dir: Path) -> bool:
    """配置 Unity YAML 合并驱动"""
    # 检查 UnityYAMLMerge 是否可用
    unity_merge_tool = shutil.which("UnityYAMLMerge")
    if not unity_merge_tool:
        print("Warning: UnityYAMLMerge not found, using default merge")
        return False
    
    # 配置 git merge driver
    run_git([
        "config", "merge.unityyamlmerge.name",
        "Unity YAML Merge"
    ], cwd=project_dir)
    
    run_git([
        "config", "merge.unityyamlmerge.driver",
        f'"{unity_merge_tool}" merge -p "%O" "%A" "%B" "%A"'
    ], cwd=project_dir)
    
    return True
```

---

## 3. QA 验证阶段合并流程

### 3.1 问题描述

当前 QA 验证在 worktree 分支上进行，但某些测试（如 E2E 测试）可能需要在合并后的状态下运行。

### 3.2 设计方案

```python
# apps/backend/qa/worktree_qa.py

from enum import Enum
from pathlib import Path
from core.worktree import WorktreeManager

class QAMergeStrategy(str, Enum):
    IN_WORKTREE = "in_worktree"      # 在 worktree 中验证（默认）
    MERGE_PREVIEW = "merge_preview"   # 合并预览后验证
    STAGED_MERGE = "staged_merge"     # 暂存合并后验证

async def run_qa_with_merge_preview(
    project_dir: Path,
    spec_dir: Path,
    spec_name: str,
    model: str,
) -> bool:
    """
    在合并预览状态下运行 QA
    
    流程:
        1. 创建临时合并分支
        2. 合并 worktree 分支到临时分支
        3. 在临时分支上运行 QA
        4. 根据结果决定是否保留合并
    """
    manager = WorktreeManager(project_dir)
    worktree_info = manager.get_worktree_info(spec_name)
    
    if not worktree_info:
        print("No worktree found, running QA in direct mode")
        return await run_qa_validation_loop(project_dir, spec_dir, model)
    
    # Step 1: 创建临时合并预览分支
    preview_branch = f"qa-preview/{spec_name}"
    _create_preview_branch(manager, worktree_info, preview_branch)
    
    try:
        # Step 2: 在预览分支上运行 QA
        preview_worktree = manager.create_worktree(f"qa-preview-{spec_name}")
        
        # Step 3: 运行 QA 验证
        qa_result = await run_qa_validation_loop(
            preview_worktree.path,
            spec_dir,
            model,
        )
        
        if qa_result:
            print("✅ QA passed on merge preview")
            # 可选: 自动合并到 main
            return True
        else:
            print("❌ QA failed on merge preview")
            return False
    
    finally:
        # Step 4: 清理临时分支
        _cleanup_preview_branch(manager, preview_branch)

def _create_preview_branch(
    manager: WorktreeManager,
    worktree_info: WorktreeInfo,
    preview_branch: str,
) -> None:
    """创建合并预览分支"""
    # 从 base branch 创建预览分支
    manager._run_git([
        "checkout", "-b", preview_branch, manager.base_branch
    ])
    
    # 合并 worktree 分支（不提交）
    manager._run_git([
        "merge", "--no-commit", "--no-ff", worktree_info.branch
    ])

def _cleanup_preview_branch(
    manager: WorktreeManager,
    preview_branch: str,
) -> None:
    """清理预览分支"""
    # 切回 base branch
    manager._run_git(["checkout", manager.base_branch])
    
    # 删除预览分支
    manager._run_git(["branch", "-D", preview_branch])
```

### 3.3 QA 循环集成

```python
# apps/backend/qa/loop.py 修改

async def run_qa_validation_loop(
    project_dir: Path,
    spec_dir: Path,
    model: str,
    verbose: bool = False,
    merge_strategy: QAMergeStrategy = QAMergeStrategy.IN_WORKTREE,
) -> bool:
    """
    运行 QA 验证循环
    
    新增参数:
        merge_strategy: QA 合并策略
            - IN_WORKTREE: 在 worktree 中验证（默认，最快）
            - MERGE_PREVIEW: 合并预览后验证（更准确）
            - STAGED_MERGE: 暂存合并后验证（最准确，但有风险）
    """
    # 检测是否使用 worktree
    spec_name = spec_dir.name
    manager = WorktreeManager(project_dir)
    worktree_info = manager.get_worktree_info(spec_name)
    
    if worktree_info and merge_strategy == QAMergeStrategy.MERGE_PREVIEW:
        return await run_qa_with_merge_preview(
            project_dir, spec_dir, spec_name, model
        )
    
    # 默认行为: 在当前目录（worktree 或 main）验证
    # ... 现有代码 ...
```

### 3.4 配置选项

```python
# apps/backend/phase_config.py

# QA 合并策略配置
DEFAULT_QA_MERGE_STRATEGY = "in_worktree"

# 可在 spec 级别覆盖
# .auto-claude/specs/{spec_name}/config.json
# {
#   "qa_merge_strategy": "merge_preview"
# }
```

---

## 4. 验证失败后修复流程

### 4.1 问题描述

当 QA 验证失败时，需要明确的回退和修复策略，特别是在合并预览模式下。

### 4.2 设计方案

```python
# apps/backend/qa/recovery.py

from dataclasses import dataclass
from enum import Enum
from pathlib import Path

class QAFailureAction(str, Enum):
    CONTINUE_FIXING = "continue"    # 继续修复
    ROLLBACK_MERGE = "rollback"     # 回滚合并
    ESCALATE_HUMAN = "escalate"     # 升级人工
    ABORT_TASK = "abort"            # 中止任务

@dataclass
class QARecoveryState:
    """QA 恢复状态"""
    spec_name: str
    failure_iteration: int
    failure_reason: str
    merge_state: str  # "none" | "preview" | "staged" | "committed"
    can_rollback: bool
    suggested_action: QAFailureAction

def analyze_qa_failure(
    spec_dir: Path,
    project_dir: Path,
) -> QARecoveryState:
    """
    分析 QA 失败状态，推荐恢复策略
    """
    spec_name = spec_dir.name
    manager = WorktreeManager(project_dir)
    
    # 获取迭代历史
    history = get_iteration_history(spec_dir)
    last_iteration = history[-1] if history else None
    
    # 检测合并状态
    merge_state = _detect_merge_state(manager, spec_name)
    
    # 分析失败原因
    failure_reason = _analyze_failure_reason(last_iteration)
    
    # 推荐操作
    suggested_action = _suggest_recovery_action(
        history, merge_state, failure_reason
    )
    
    return QARecoveryState(
        spec_name=spec_name,
        failure_iteration=len(history),
        failure_reason=failure_reason,
        merge_state=merge_state,
        can_rollback=merge_state in ["preview", "staged"],
        suggested_action=suggested_action,
    )

def _detect_merge_state(manager: WorktreeManager, spec_name: str) -> str:
    """检测当前合并状态"""
    # 检查是否有未提交的合并
    result = manager._run_git(["status", "--porcelain"])
    if "UU" in result.stdout:  # 合并冲突
        return "conflict"
    
    # 检查是否在预览分支
    current = manager._get_current_branch()
    if current.startswith("qa-preview/"):
        return "preview"
    
    # 检查是否有暂存的合并
    if "MERGE_HEAD" in result.stdout:
        return "staged"
    
    return "none"

def _suggest_recovery_action(
    history: list,
    merge_state: str,
    failure_reason: str,
) -> QAFailureAction:
    """推荐恢复操作"""
    # 规则 1: 合并冲突 → 回滚
    if merge_state == "conflict":
        return QAFailureAction.ROLLBACK_MERGE
    
    # 规则 2: 重复问题 → 升级人工
    if "recurring" in failure_reason.lower():
        return QAFailureAction.ESCALATE_HUMAN
    
    # 规则 3: 迭代次数过多 → 升级人工
    if len(history) >= 10:
        return QAFailureAction.ESCALATE_HUMAN
    
    # 规则 4: 预览状态 → 可以回滚后继续
    if merge_state == "preview":
        return QAFailureAction.ROLLBACK_MERGE
    
    # 默认: 继续修复
    return QAFailureAction.CONTINUE_FIXING

async def execute_recovery_action(
    action: QAFailureAction,
    spec_dir: Path,
    project_dir: Path,
) -> bool:
    """执行恢复操作"""
    manager = WorktreeManager(project_dir)
    spec_name = spec_dir.name
    
    if action == QAFailureAction.ROLLBACK_MERGE:
        return _rollback_merge(manager, spec_name)
    
    elif action == QAFailureAction.ESCALATE_HUMAN:
        await escalate_to_human(spec_dir, [], 0)
        return False
    
    elif action == QAFailureAction.ABORT_TASK:
        _abort_task(manager, spec_name)
        return False
    
    # CONTINUE_FIXING: 不需要特殊操作
    return True

def _rollback_merge(manager: WorktreeManager, spec_name: str) -> bool:
    """回滚合并操作"""
    # 中止任何进行中的合并
    manager._run_git(["merge", "--abort"])
    
    # 如果在预览分支，切回 worktree 分支
    current = manager._get_current_branch()
    if current.startswith("qa-preview/"):
        worktree_branch = manager.get_branch_name(spec_name)
        manager._run_git(["checkout", worktree_branch])
        manager._run_git(["branch", "-D", current])
    
    print(f"✅ Rolled back merge for {spec_name}")
    return True

def _abort_task(manager: WorktreeManager, spec_name: str) -> None:
    """中止任务并清理"""
    # 回滚任何合并
    _rollback_merge(manager, spec_name)
    
    # 可选: 保留 worktree 供人工检查
    print(f"Task {spec_name} aborted. Worktree preserved for inspection.")
```

### 4.3 QA 循环集成

```python
# apps/backend/qa/loop.py 修改

async def run_qa_validation_loop(...) -> bool:
    # ... 现有代码 ...
    
    # 在 QA 失败时分析恢复策略
    if not qa_result:
        recovery_state = analyze_qa_failure(spec_dir, project_dir)
        
        print(f"\n📊 QA Failure Analysis:")
        print(f"   Iteration: {recovery_state.failure_iteration}")
        print(f"   Reason: {recovery_state.failure_reason}")
        print(f"   Merge State: {recovery_state.merge_state}")
        print(f"   Suggested Action: {recovery_state.suggested_action.value}")
        
        if recovery_state.can_rollback:
            print(f"\n💡 Tip: You can rollback the merge with:")
            print(f"   python run.py --spec {spec_name} --qa-rollback")
        
        # 自动执行恢复操作（如果配置允许）
        if AUTO_RECOVERY_ENABLED:
            await execute_recovery_action(
                recovery_state.suggested_action,
                spec_dir,
                project_dir,
            )
    
    return qa_result
```

---

## 5. 实现优先级

### 5.1 第一阶段（高优先级）

1. **任务类型自动选择** - 低复杂度，高价值
   - 实现 `recommend_worktree_strategy()`
   - 前端显示推荐

2. **验证失败后修复流程** - 中复杂度，高价值
   - 实现 `QARecoveryState` 分析
   - 实现回滚功能

### 5.2 第二阶段（中优先级）

3. **QA 验证阶段合并流程** - 高复杂度，中价值
   - 实现 `run_qa_with_merge_preview()`
   - 添加配置选项

4. **Unity 任务最佳分支策略** - 中复杂度，低价值（特定用户）
   - 实现 Unity 项目检测
   - 实现 Unity 稀疏检出模式

---

## 6. 相关文件

| 文件 | 说明 |
|------|------|
| `apps/backend/core/worktree.py` | Worktree 管理器 |
| `apps/backend/qa/loop.py` | QA 循环 |
| `apps/backend/qa/qa_recovery_helper.py` | QA 恢复（待创建） |
| `apps/backend/qa/worktree_qa_helper.py` | Worktree QA 集成（待创建） |
| `apps/backend/core/worktree_helper.py` | Worktree 推荐策略（待创建） |
| `apps/backend/api/task_optimize_helper.py` | 任务优化 API（待创建） |
| `apps/frontend/src/renderer/components/TaskCreationHelper.tsx` | 前端优化按钮组件（待创建） |
