"""
Directory Scanner - 目录扫描模块
================================

用于准确估算任务涉及的文件数量和内容量。
从任务描述中提取路径，扫描目录获取实际文件统计。
"""

import re
from pathlib import Path

# 常量
MAX_SAMPLE_FILES = 10
FALLBACK_CHARS_PER_FILE = 5000
MAX_FILES_CAP = 100


def scan_directory(dir_path: Path, max_samples: int = MAX_SAMPLE_FILES) -> tuple[int, int]:
    """
    扫描目录，返回文件数量和估算字符数。

    使用采样方式估算总内容量，避免读取所有文件。

    Args:
        dir_path: 要扫描的目录路径
        max_samples: 采样文件数量上限

    Returns:
        (file_count, estimated_chars) 元组
        扫描失败时返回 (0, 0)
    """
    try:
        # 递归获取所有文件
        all_files = [f for f in dir_path.rglob("*") if f.is_file()]
        file_count = len(all_files)

        if file_count == 0:
            return (0, 0)

        # 采样文件估算内容量
        sample_size = min(max_samples, file_count)
        sample_chars = 0

        for f in all_files[:sample_size]:
            try:
                # 使用 stat() 获取文件大小，不读取内容
                sample_chars += f.stat().st_size
            except (OSError, PermissionError):
                pass

        # 外推估算总字符数
        if sample_size > 0 and sample_chars > 0:
            avg_size = sample_chars / sample_size
            total_chars = int(avg_size * file_count)
        else:
            total_chars = file_count * FALLBACK_CHARS_PER_FILE

        return (min(file_count, MAX_FILES_CAP), total_chars)

    except (OSError, PermissionError):
        return (0, 0)


def extract_paths_from_text(text: str) -> list[str]:
    """
    从文本中提取路径。

    支持：
    - 双引号路径: "Design/xxx"
    - 单引号路径: 'Design/xxx'
    - 反引号路径: `Design/xxx`

    Args:
        text: 任务描述文本

    Returns:
        提取到的路径列表
    """
    patterns = [
        r'"([^"]+)"',  # "path"
        r"'([^']+)'",  # 'path'
        r"`([^`]+)`",  # `path`
    ]

    paths = []
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            match = match.strip()
            # 过滤明显不是路径的内容
            if len(match) < 2:
                continue
            if match.startswith("http"):
                continue
            if "/" in match or "\\" in match or match.endswith(("/", "\\")):
                paths.append(match)

    return paths


def estimate_from_paths(
    task_description: str,
    project_dir: Path | None = None,
) -> tuple[int, int] | None:
    """
    从任务描述提取路径并扫描，估算文件数量和内容量。

    这是主入口函数，供 ComplexityAnalyzer._estimate_files() 调用。

    Args:
        task_description: 任务描述文本
        project_dir: 项目根目录（用于解析相对路径）

    Returns:
        (file_count, total_chars) 元组
        无法扫描时返回 None（调用方应回退到原有逻辑）
    """
    if not task_description:
        return None

    # 提取路径
    paths = extract_paths_from_text(task_description)
    if not paths:
        return None

    # 尝试扫描每个路径
    for path_str in paths:
        # 解析路径
        if project_dir and not path_str.startswith("/"):
            full_path = project_dir / path_str
        else:
            full_path = Path(path_str)

        # 安全检查：确保路径在项目目录内
        if project_dir:
            try:
                resolved = full_path.resolve()
                project_resolved = project_dir.resolve()
                if not str(resolved).startswith(str(project_resolved)):
                    continue  # 跳过项目外的路径
            except (OSError, ValueError):
                continue

        # 扫描目录
        if full_path.exists() and full_path.is_dir():
            file_count, total_chars = scan_directory(full_path)
            if file_count > 0:
                return (file_count, total_chars)

    return None
