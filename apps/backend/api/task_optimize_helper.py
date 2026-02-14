"""
Task Optimize Helper
====================

提供任务描述优化和 worktree 推荐功能。

通过 AI 分析任务描述，优化提示词并给出是否使用 worktree 的建议。

使用方式:
    from api.task_optimize_helper import optimize_task_description, OptimizeTaskRequest

    request = OptimizeTaskRequest(
        task_description="在 docs 文件夹下写一个设计文档",
        project_path="/path/to/project",
        target_paths=["docs/"],
    )
    response = await optimize_task_description(request)
"""

import json
import logging
from pathlib import Path

from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ============================================================
# 数据模型
# ============================================================


class OptimizeTaskRequest(BaseModel):
    """任务优化请求"""

    task_description: str
    project_path: str
    target_paths: list[str] | None = None  # 用户 @ 引用的文件/文件夹


class WorktreeRecommendation(BaseModel):
    """Worktree 推荐结果"""

    use_worktree: bool
    reason: str
    confidence: str  # "high" | "medium" | "low"


class OptimizeTaskResponse(BaseModel):
    """任务优化响应"""

    optimized_description: str
    worktree_recommendation: WorktreeRecommendation
    improvements: list[str]  # AI 做了哪些优化


# ============================================================
# 系统提示词
# ============================================================

OPTIMIZE_TASK_SYSTEM_PROMPT = """你是一个 AI 编码代理的任务需求优化专家。你的目标是将用户的简短任务描述转化为结构化的、可执行的任务需求，使 AI 编码代理（如 Claude Code）能高效完成任务。

## 你的核心能力

1. **任务分类** — 识别任务类型并应用对应的优化模板
2. **需求补全** — 从简短描述中推断缺失的关键信息
3. **约束明确** — 添加必要的技术约束和边界条件
4. **验收标准** — 定义清晰的完成标准

## 任务类型与优化策略

### Bug 修复类（关键词：修复、fix、bug、报错、崩溃、异常）
优化重点：
- 明确问题现象和期望行为
- 指出可能的问题位置（如果用户提供了线索）
- 要求修复后不引入新问题

### 新功能类（关键词：添加、新增、实现、开发、创建）
优化重点：
- 明确功能的输入/输出/交互方式
- 指定技术实现约束（复用现有组件、遵循现有架构）
- 定义功能边界（做什么、不做什么）

### 重构/优化类（关键词：重构、优化、改进、性能、清理）
优化重点：
- 明确重构范围和目标
- 要求保持现有功能不变
- 指定性能指标（如果是性能优化）

### 文档/设计类（关键词：文档、设计、说明、README）
优化重点：
- 明确文档的目标读者和用途
- 指定格式和结构要求
- 要求与代码保持一致

## 优化原则

1. **保持原意** — 不改变用户的核心意图
2. **结构化输出** — 使用清晰的层级结构
3. **可执行性** — 每个要求都应该是可验证的
4. **适度补全** — 只补充明显缺失的关键信息，不过度发挥
5. **技术准确** — 如果提供了项目上下文，确保技术术语准确

## 输出格式

优化后的描述应包含以下结构（根据任务类型灵活调整）：

```
## 任务目标
[一句话概括]

## 具体要求
1. [要求1]
2. [要求2]
...

## 技术约束
- [约束1]
- [约束2]

## 验收标准
- [ ] [标准1]
- [ ] [标准2]
```

## Worktree 推荐规则

1. 设计/文档类任务，且目标文件夹包含大量文件（>50个）→ 推荐
2. 大面积重构、迁移、架构修改 → 推荐
3. 任务复杂度高（涉及多模块、多文件联动修改）→ 推荐
4. 用户明确提到 worktree/隔离/独立分支 → 推荐
5. 简单的单文件修改、bug 修复 → 不需要

## 返回格式

严格返回以下 JSON（不要包含其他内容）：
{
    "optimized_description": "优化后的结构化描述（Markdown格式）",
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
    import os
    from core.auth import ensure_claude_code_oauth_token, get_auth_token
    from core.model_config import get_utility_model_config

    # Debug logging
    logger.info(f"Environment check: ANTHROPIC_AUTH_TOKEN={bool(os.environ.get('ANTHROPIC_AUTH_TOKEN'))}, "
                f"CLAUDE_CODE_OAUTH_TOKEN={bool(os.environ.get('CLAUDE_CODE_OAUTH_TOKEN'))}, "
                f"ANTHROPIC_API_KEY={bool(os.environ.get('ANTHROPIC_API_KEY'))}")

    # Check for both OAuth token and API key (from custom API profiles)
    # Note: API profiles set ANTHROPIC_AUTH_TOKEN, not ANTHROPIC_API_KEY
    has_oauth = bool(get_auth_token())
    has_api_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_auth_token = bool(os.environ.get("ANTHROPIC_AUTH_TOKEN"))

    if not has_oauth and not has_api_key and not has_auth_token:
        logger.warning("No authentication token found (neither OAuth nor API key)")
        raise ValueError("Claude authentication required. Please authenticate in Settings > Claude Profiles or configure an API Profile.")

    ensure_claude_code_oauth_token()

    try:
        from core.simple_client import create_simple_client
    except ImportError:
        logger.warning("core.simple_client not available")
        return ""

    # 获取模型配置
    model, thinking_budget = get_utility_model_config()

    logger.info(
        f"Task optimization using model={model}, thinking_budget={thinking_budget}"
    )

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
# 辅助函数
# ============================================================


def should_use_worktree_for_doc_task(
    project_dir: Path,
    target_paths: list[str],
) -> tuple[bool, str]:
    """
    判断文档/设计类任务是否需要 worktree

    判断逻辑:
        1. 如果目标文件夹包含大量文本文件（>50个），推荐 worktree
        2. 如果只是简单的单文件文档修改，不需要 worktree
    """
    text_extensions = {
        ".md",
        ".txt",
        ".rst",
        ".adoc",
        ".org",
        ".json",
        ".yaml",
        ".yml",
        ".toml",
        ".xml",
        ".html",
        ".css",
        ".js",
        ".ts",
        ".py",
        ".java",
        ".go",
        ".rs",
        ".c",
        ".cpp",
        ".h",
        ".hpp",
    }

    for target_path in target_paths:
        full_path = project_dir / target_path

        if full_path.is_dir():
            # 统计文本文件数量
            try:
                text_file_count = sum(
                    1
                    for f in full_path.rglob("*")
                    if f.is_file() and f.suffix.lower() in text_extensions
                )
                if text_file_count > 50:
                    return (
                        True,
                        f"目标文件夹 {target_path} 包含 {text_file_count} 个文本文件，建议隔离",
                    )
            except (PermissionError, OSError) as e:
                logger.warning(f"Failed to scan directory {target_path}: {e}")

    return False, "简单文档修改，直接模式更快"


def _is_doc_task(description: str) -> bool:
    """检测是否为文档/设计类任务"""
    doc_patterns = [
        "文档",
        "document",
        "readme",
        "设计",
        "design",
        "说明",
        "specification",
        "spec",
        "wiki",
        "changelog",
        "release notes",
        "api doc",
    ]
    desc_lower = description.lower()
    return any(p in desc_lower for p in doc_patterns)


def _collect_project_context(project_path: str) -> str:
    """
    收集项目上下文信息，帮助 AI 更好地理解项目

    按优先级读取：CLAUDE.md > README.md > package.json
    每个文件最多取前 80 行，总上下文不超过 300 行
    """
    context_parts = []
    total_lines = 0
    max_total_lines = 300
    max_per_file = 80

    project_dir = Path(project_path)

    # 优先级文件列表
    context_files = [
        (".claude/CLAUDE.md", "项目规范 (CLAUDE.md)"),
        ("CLAUDE.md", "项目规范 (CLAUDE.md)"),
        ("README.md", "项目说明 (README.md)"),
        ("package.json", "项目配置 (package.json)"),
        ("pyproject.toml", "项目配置 (pyproject.toml)"),
        ("Cargo.toml", "项目配置 (Cargo.toml)"),
    ]

    for rel_path, label in context_files:
        if total_lines >= max_total_lines:
            break

        file_path = project_dir / rel_path
        if not file_path.is_file():
            continue

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            lines = content.splitlines()[:max_per_file]
            if lines:
                snippet = "\n".join(lines)
                context_parts.append(f"### {label}\n```\n{snippet}\n```")
                total_lines += len(lines) + 3  # 加上标题和代码块标记
        except (PermissionError, OSError):
            continue

    if not context_parts:
        return ""

    return "## 项目上下文\n\n" + "\n\n".join(context_parts)


# ============================================================
# 主函数
# ============================================================


async def optimize_task_description(
    request: OptimizeTaskRequest,
) -> OptimizeTaskResponse:
    """
    调用 AI 优化任务描述并给出 worktree 推荐

    Args:
        request: 包含任务描述、项目路径、目标文件的请求

    Returns:
        优化后的描述和 worktree 推荐
    """
    # 收集项目上下文
    project_context = _collect_project_context(request.project_path)

    # 构建提示词
    prompt_parts = [
        "请优化以下任务描述，使其成为 AI 编码代理可高效执行的结构化需求。",
        "",
        f"## 原始任务描述\n{request.task_description}",
        "",
        f"## 项目路径\n{request.project_path}",
    ]

    if request.target_paths:
        paths_str = "\n".join(f"- {p}" for p in request.target_paths)
        prompt_parts.append(f"\n## 引用的文件/文件夹\n{paths_str}")

    if project_context:
        prompt_parts.append(f"\n{project_context}")

    prompt_parts.append("\n请严格返回 JSON 格式的优化结果，不要包含其他内容。")
    prompt = "\n".join(prompt_parts)

    # 调用 AI
    response_text = await _call_claude_for_optimization(prompt)

    # 解析响应
    try:
        # 尝试从响应中提取 JSON
        # 使用非贪婪匹配，找到第一个完整的 JSON 对象
        # 通过查找匹配的大括号来确保提取完整的 JSON
        json_start = response_text.find("{")
        if json_start == -1:
            raise ValueError("No JSON object found in response")

        # 计算匹配的大括号
        brace_count = 0
        json_end = json_start
        for i, char in enumerate(response_text[json_start:], json_start):
            if char == "{":
                brace_count += 1
            elif char == "}":
                brace_count -= 1
                if brace_count == 0:
                    json_end = i + 1
                    break

        if brace_count != 0:
            raise ValueError("Unbalanced braces in JSON")

        json_str = response_text[json_start:json_end]
        result = json.loads(json_str)

        worktree_analysis = result.get("worktree_analysis", {})

        response = OptimizeTaskResponse(
            optimized_description=result.get(
                "optimized_description", request.task_description
            ),
            worktree_recommendation=WorktreeRecommendation(
                use_worktree=worktree_analysis.get("use_worktree", False),
                reason=worktree_analysis.get("reason", ""),
                confidence=worktree_analysis.get("confidence", "low"),
            ),
            improvements=result.get("improvements", []),
        )

        # 额外检查：如果是文档类任务，进行文件夹分析
        if _is_doc_task(request.task_description) and request.target_paths:
            folder_check, folder_reason = should_use_worktree_for_doc_task(
                Path(request.project_path),
                request.target_paths,
            )
            if folder_check and not response.worktree_recommendation.use_worktree:
                response.worktree_recommendation.use_worktree = True
                response.worktree_recommendation.reason = folder_reason
                response.worktree_recommendation.confidence = "high"

        return response

    except (json.JSONDecodeError, ValueError) as e:
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


# ============================================================
# 同步版本（供非异步环境使用）
# ============================================================


def optimize_task_description_sync(
    request: OptimizeTaskRequest,
) -> OptimizeTaskResponse:
    """
    同步版本的任务优化函数

    Args:
        request: 包含任务描述、项目路径、目标文件的请求

    Returns:
        优化后的描述和 worktree 推荐
    """
    import asyncio

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # 已在异步上下文中，使用线程池
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = pool.submit(
                lambda: asyncio.run(optimize_task_description(request))
            ).result()
        return result
    else:
        return asyncio.run(optimize_task_description(request))
