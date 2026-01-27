"""
Worktree Helper
===============

提供 worktree 相关的辅助功能，包括：
- 文档/设计类任务的 worktree 推荐判断
- 目标文件夹分析

这是一个独立的 helper 文件，不修改现有的 worktree.py。
使用时需要手动合并到主模块或直接导入使用。

使用方式:
    from core.worktree_helper import should_use_worktree_for_doc_task

    use_worktree, reason = should_use_worktree_for_doc_task(
        project_dir=Path("/path/to/project"),
        target_paths=["docs/", "README.md"],
    )
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


# ============================================================
# 文本文件扩展名
# ============================================================

TEXT_EXTENSIONS = {
    # 文档
    ".md",
    ".txt",
    ".rst",
    ".adoc",
    ".org",
    # 配置
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".xml",
    ".ini",
    ".cfg",
    ".conf",
    # 前端
    ".html",
    ".css",
    ".scss",
    ".less",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".vue",
    ".svelte",
    # 后端
    ".py",
    ".java",
    ".kt",
    ".scala",
    ".go",
    ".rs",
    ".rb",
    ".php",
    ".cs",
    ".fs",
    # 系统
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cc",
    ".cxx",
    # 脚本
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".ps1",
    ".bat",
    ".cmd",
    # 其他
    ".sql",
    ".graphql",
    ".proto",
    ".thrift",
}


# ============================================================
# 文档任务检测
# ============================================================

DOC_TASK_PATTERNS = [
    # 中文
    "文档",
    "设计",
    "说明",
    "规范",
    "指南",
    "手册",
    # 英文
    "document",
    "readme",
    "design",
    "specification",
    "spec",
    "wiki",
    "changelog",
    "release notes",
    "api doc",
    "guide",
    "manual",
    "tutorial",
]


def is_doc_task(description: str) -> bool:
    """
    检测是否为文档/设计类任务

    Args:
        description: 任务描述

    Returns:
        是否为文档类任务
    """
    desc_lower = description.lower()
    return any(p in desc_lower for p in DOC_TASK_PATTERNS)


# ============================================================
# Worktree 推荐判断
# ============================================================


def should_use_worktree_for_doc_task(
    project_dir: Path,
    target_paths: list[str],
    threshold: int = 50,
) -> tuple[bool, str]:
    """
    判断文档/设计类任务是否需要 worktree

    判断逻辑:
        1. 如果目标文件夹包含大量文本文件（>threshold 个），推荐 worktree
        2. 如果只是简单的单文件文档修改，不需要 worktree

    Args:
        project_dir: 项目根目录
        target_paths: 目标文件/文件夹路径列表
        threshold: 文件数量阈值，超过此值推荐使用 worktree

    Returns:
        (是否推荐 worktree, 推荐原因)
    """
    for target_path in target_paths:
        full_path = project_dir / target_path

        if full_path.is_dir():
            try:
                # 统计文本文件数量
                text_file_count = sum(
                    1
                    for f in full_path.rglob("*")
                    if f.is_file() and f.suffix.lower() in TEXT_EXTENSIONS
                )

                if text_file_count > threshold:
                    return (
                        True,
                        f"目标文件夹 {target_path} 包含 {text_file_count} 个文本文件，建议隔离",
                    )

            except PermissionError as e:
                logger.warning(f"Permission denied scanning {target_path}: {e}")
            except OSError as e:
                logger.warning(f"Failed to scan directory {target_path}: {e}")

    return False, "简单文档修改，直接模式更快"


def count_text_files(directory: Path) -> int:
    """
    统计目录中的文本文件数量

    Args:
        directory: 目录路径

    Returns:
        文本文件数量
    """
    if not directory.is_dir():
        return 0

    try:
        return sum(
            1
            for f in directory.rglob("*")
            if f.is_file() and f.suffix.lower() in TEXT_EXTENSIONS
        )
    except (PermissionError, OSError) as e:
        logger.warning(f"Failed to count files in {directory}: {e}")
        return 0


# ============================================================
# 高风险任务检测
# ============================================================

HIGH_RISK_PATTERNS = [
    # 中文
    "重构",
    "迁移",
    "删除",
    "架构",
    "数据库",
    "全局",
    "批量",
    # 英文
    "refactor",
    "migration",
    "migrate",
    "remove",
    "delete",
    "architecture",
    "database",
    "schema",
    "global",
    "batch",
    "breaking",
]


def is_high_risk_task(description: str) -> bool:
    """
    检测是否为高风险任务

    Args:
        description: 任务描述

    Returns:
        是否为高风险任务
    """
    desc_lower = description.lower()
    return any(p in desc_lower for p in HIGH_RISK_PATTERNS)


# ============================================================
# 用户明确要求检测
# ============================================================

WORKTREE_REQUEST_PATTERNS = [
    # 中文
    "worktree",
    "隔离",
    "独立分支",
    "单独分支",
    "新分支",
    # 英文
    "isolated",
    "separate branch",
    "new branch",
    "feature branch",
]


def user_requests_worktree(description: str) -> bool:
    """
    检测用户是否明确要求使用 worktree

    Args:
        description: 任务描述

    Returns:
        用户是否明确要求 worktree
    """
    desc_lower = description.lower()
    return any(p in desc_lower for p in WORKTREE_REQUEST_PATTERNS)


# ============================================================
# 综合推荐
# ============================================================


def recommend_worktree(
    description: str,
    project_dir: Path | None = None,
    target_paths: list[str] | None = None,
) -> tuple[bool, str, str]:
    """
    综合判断是否推荐使用 worktree

    Args:
        description: 任务描述
        project_dir: 项目根目录（可选）
        target_paths: 目标文件/文件夹路径列表（可选）

    Returns:
        (是否推荐, 推荐原因, 置信度)
    """
    # 规则 1: 用户明确要求
    if user_requests_worktree(description):
        return True, "用户明确要求使用隔离模式", "high"

    # 规则 2: 高风险任务
    if is_high_risk_task(description):
        return True, "高风险修改，建议隔离", "high"

    # 规则 3: 文档类任务 + 大量文件
    if is_doc_task(description) and project_dir and target_paths:
        use_worktree, reason = should_use_worktree_for_doc_task(
            project_dir, target_paths
        )
        if use_worktree:
            return True, reason, "high"

    # 默认: 不推荐
    return False, "简单任务，直接模式更快", "medium"
