#!/usr/bin/env python3
"""
完整报告功能测试脚本
===================

测试 /Users/zhengbingjin/Project/Github/Auto-Claude/docs/完整合并与问题解决报告-2025-01-15.md
中记录的所有功能。

测试范围:
1. Git 安全系统 (4层防御)
2. Git 知识库系统
3. Worktree 优化功能
4. 子任务大小验证
5. 文件完整性检查
"""

import sys
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple
import pytest

# Add backend to path
script_dir = Path(__file__).parent
project_root = script_dir.parent
backend_dir = project_root / "apps" / "backend"
sys.path.insert(0, str(backend_dir))


class ReportTestResult:
    """测试结果记录"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.details = []

    def add_pass(self, test_name: str, message: str = ""):
        self.passed += 1
        self.details.append(("✅", test_name, message))

    def add_fail(self, test_name: str, message: str = ""):
        self.failed += 1
        self.details.append(("❌", test_name, message))

    def add_warning(self, test_name: str, message: str = ""):
        self.warnings += 1
        self.details.append(("⚠️", test_name, message))

    def print_summary(self):
        print("\n" + "=" * 80)
        print("测试总结")
        print("=" * 80)
        print(f"✅ 通过: {self.passed}")
        print(f"❌ 失败: {self.failed}")
        print(f"⚠️  警告: {self.warnings}")
        print(f"总计: {self.passed + self.failed + self.warnings}")
        print("=" * 80)

        if self.failed > 0:
            print("\n失败的测试:")
            for icon, name, msg in self.details:
                if icon == "❌":
                    print(f"  {icon} {name}")
                    if msg:
                        print(f"     {msg}")



@pytest.fixture
def result() -> ReportTestResult:
    """Provide pytest fixture for report-style tests."""
    return ReportTestResult()


def print_section(title: str):
    """打印测试章节标题"""
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def test_git_safety_layer1_prompt_education(result: ReportTestResult):
    """测试 Layer 1: Prompt 教育"""
    print_section("Layer 1: Prompt 教育 - Git 安全规则注入")

    try:
        from prompts_pkg.prompt_generator import generate_git_safety_rules

        # 测试安全规则生成
        safety_rules = generate_git_safety_rules()

        if not safety_rules:
            result.add_fail("安全规则生成", "generate_git_safety_rules() 返回空字符串")
            return

        result.add_pass("安全规则生成", f"生成了 {len(safety_rules)} 字符的安全规则")

        # 检查关键内容
        critical_content = [
            ("rm .git/index", "禁止命令警告"),
            ("git read-tree HEAD", "安全恢复方法"),
            ("CRITICAL", "严重警告标记"),
            ("FORBIDDEN", "禁止标记"),
        ]

        for keyword, desc in critical_content:
            if keyword in safety_rules:
                result.add_pass(f"包含: {desc}", f"找到关键词: {keyword}")
            else:
                result.add_fail(f"缺失: {desc}", f"未找到关键词: {keyword}")

    except Exception as e:
        result.add_fail("Layer 1 测试", f"异常: {e}")


def test_git_safety_layer2_code_validation(result: ReportTestResult):
    """测试 Layer 2: 代码验证"""
    print_section("Layer 2: 代码验证 - Git 验证器")

    try:
        from security.git_validators import validate_git_command

        # 测试危险命令检测
        dangerous_commands = [
            "rm .git/index",
            "rm -f .git/index",
            "rm -rf .git/",
            "git rm --cached -r .",
        ]

        for cmd in dangerous_commands:
            is_safe, reason = validate_git_command(cmd)
            if not is_safe:
                result.add_pass(f"检测危险命令", f"正确拦截: {cmd}")
            else:
                result.add_fail(f"未检测危险命令", f"应该拦截但未拦截: {cmd}")

        # 测试安全命令
        safe_commands = [
            "git status",
            "git add .",
            "git commit -m 'test'",
            "git read-tree HEAD",
        ]

        for cmd in safe_commands:
            is_safe, reason = validate_git_command(cmd)
            if is_safe:
                result.add_pass(f"允许安全命令", f"正确允许: {cmd}")
            else:
                result.add_fail(f"误拦截安全命令", f"不应该拦截: {cmd}")

    except ImportError as e:
        result.add_fail("Layer 2 测试", f"无法导入 git_validators: {e}")
    except Exception as e:
        result.add_fail("Layer 2 测试", f"异常: {e}")


def test_git_safety_layer3_runtime_hooks(result: ReportTestResult):
    """测试 Layer 3: 运行时钩子"""
    print_section("Layer 3: 运行时钩子")

    try:
        from security.hooks import bash_security_hook
        import asyncio

        # 测试 Bash 工具参数验证
        test_cases = [
            # (command, should_pass, description)
            ("git status", True, "安全的 git 命令"),
            ("rm .git/index", False, "危险的 git 命令"),
            ("ls -la", True, "非 git 命令"),
        ]

        for command, should_pass, desc in test_cases:
            input_data = {
                "tool_name": "Bash",
                "tool_input": {"command": command}
            }

            # Run async hook
            result_dict = asyncio.run(bash_security_hook(input_data))

            is_blocked = result_dict.get("decision") == "block"

            if should_pass and not is_blocked:
                result.add_pass(f"钩子验证: {desc}", "正确允许")
            elif not should_pass and is_blocked:
                result.add_pass(f"钩子验证: {desc}", f"正确拦截: {result_dict.get('reason', '')}")
            elif should_pass and is_blocked:
                result.add_fail(f"钩子验证: {desc}", f"误拦截: {result_dict.get('reason', '')}")
            else:
                result.add_fail(f"钩子验证: {desc}", "应该拦截但未拦截")

    except ImportError as e:
        result.add_fail("Layer 3 测试", f"无法导入 hooks: {e}")
    except Exception as e:
        result.add_fail("Layer 3 测试", f"异常: {e}")


def test_git_safety_layer4_precommit_hook(result: ReportTestResult):
    """测试 Layer 4: Pre-commit 钩子"""
    print_section("Layer 4: Pre-commit 钩子")

    precommit_hook = project_root / "hooks" / "pre-commit"

    if not precommit_hook.exists():
        result.add_fail("Pre-commit 钩子", "文件不存在")
        return

    result.add_pass("Pre-commit 钩子", "文件存在")

    try:
        content = precommit_hook.read_text()

        # 检查关键功能
        checks = [
            ("deleted_count", "删除文件计数"),
            ("total_files", "总文件数统计"),
            ("threshold=50", "50% 删除阈值"),
            ("Mass Deletion Detected", "大规模删除检测"),
        ]

        for keyword, desc in checks:
            if keyword in content:
                result.add_pass(f"Pre-commit 功能: {desc}", f"找到: {keyword}")
            else:
                result.add_warning(f"Pre-commit 功能: {desc}", f"未找到: {keyword}")

    except Exception as e:
        result.add_fail("Pre-commit 钩子", f"读取失败: {e}")


def test_git_knowledge_base(result: ReportTestResult):
    """测试 Git 知识库系统"""
    print_section("Git 知识库系统")

    knowledge_dir = backend_dir / "prompts" / "knowledge" / "git"

    if not knowledge_dir.exists():
        result.add_fail("知识库目录", f"目录不存在: {knowledge_dir}")
        return

    result.add_pass("知识库目录", "目录存在")

    # 检查所有知识文件
    knowledge_files = [
        ("git-safety-rules.md", 7000, "Git 安全规则"),
        ("git-common-operations.md", 10000, "常用 Git 操作"),
        ("git-error-recovery.md", 10000, "Git 错误恢复"),
        ("git-worktree-guide.md", 15000, "Worktree 使用指南"),
        ("git-best-practices.md", 13000, "Git 最佳实践"),
    ]

    for filename, min_size, desc in knowledge_files:
        file_path = knowledge_dir / filename
        if not file_path.exists():
            result.add_fail(f"知识文件: {desc}", f"文件不存在: {filename}")
            continue

        size = len(file_path.read_text())
        if size >= min_size:
            result.add_pass(f"知识文件: {desc}", f"{filename} ({size} 字符)")
        else:
            result.add_warning(f"知识文件: {desc}", f"{filename} 大小不足 ({size} < {min_size})")

    # 测试知识加载函数
    try:
        from prompts_pkg.prompts import _load_git_knowledge

        for filename, _, desc in knowledge_files:
            content = _load_git_knowledge(filename)
            if content:
                result.add_pass(f"加载知识: {desc}", f"成功加载 {len(content)} 字符")
            else:
                result.add_fail(f"加载知识: {desc}", f"加载失败或返回空")

    except Exception as e:
        result.add_fail("知识加载测试", f"异常: {e}")


def test_git_knowledge_injection(result: ReportTestResult):
    """测试 Git 知识动态注入"""
    print_section("Git 知识动态注入")

    try:
        from prompts_pkg.prompt_generator import _needs_git_knowledge, generate_subtask_prompt
        from pathlib import Path

        # 测试检测函数
        test_subtasks = [
            ({"id": "task-1", "description": "Fix git merge conflict"}, True, "Git 合并冲突"),
            ({"id": "git-setup", "description": "Setup project"}, True, "Git 设置任务"),
            ({"id": "task-2", "description": "Implement user auth"}, False, "非 Git 任务"),
        ]

        for subtask, should_detect, desc in test_subtasks:
            detected = _needs_git_knowledge(subtask)
            if detected == should_detect:
                result.add_pass(f"Git 检测: {desc}", f"正确检测: {detected}")
            else:
                result.add_fail(f"Git 检测: {desc}", f"检测错误: 期望 {should_detect}, 实际 {detected}")

        # 测试 prompt 生成（使用临时目录）
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            spec_dir = Path(tmpdir) / "spec"
            spec_dir.mkdir()
            project_dir = Path(tmpdir) / "project"
            project_dir.mkdir()

            git_subtask = {
                "id": "test-git",
                "description": "Commit changes to repository",
                "service": "all",
                "files_to_modify": [],
                "files_to_create": [],
                "patterns_from": [],
                "verification": {"type": "manual"},
            }

            phase = {"id": "phase-1", "name": "Test Phase"}

            prompt = generate_subtask_prompt(spec_dir, project_dir, git_subtask, phase)

            # Check for safety rules (case-insensitive)
            if "git safety rules" in prompt.lower() or "CRITICAL" in prompt:
                result.add_pass("Prompt 注入", "安全规则已注入")
            else:
                result.add_fail("Prompt 注入", "安全规则未注入")

            if "Git Common Operations" in prompt or "git-common-operations" in prompt.lower():
                result.add_pass("Prompt 注入", "常用操作已注入")
            else:
                result.add_warning("Prompt 注入", "常用操作未注入")

    except Exception as e:
        result.add_fail("知识注入测试", f"异常: {e}")


def test_worktree_optimization(result: ReportTestResult):
    """测试 Worktree 优化功能"""
    print_section("Worktree 优化功能")

    try:
        from core.worktree import WorktreeManager

        # 检查 WorktreeManager 类是否存在关键方法
        required_methods = [
            "_is_lfs_project",
            "_setup_sparse_checkout",
            "_setup_lfs_shared_storage",
            "create_worktree",
            "remove_worktree",  # 实际方法名
        ]

        for method_name in required_methods:
            if hasattr(WorktreeManager, method_name):
                result.add_pass(f"Worktree 方法", f"{method_name} 存在")
            else:
                result.add_fail(f"Worktree 方法", f"{method_name} 不存在")

        # 检查 worktree.py 文件内容
        worktree_file = backend_dir / "core" / "worktree.py"
        if worktree_file.exists():
            content = worktree_file.read_text()

            # 检查关键功能
            features = [
                ("sparse-checkout", "稀疏检出"),
                ("filter=lfs", "LFS 检测"),
                ("mass deletion", "大规模删除检测"),
                ("0.5", "50% 删除阈值"),
            ]

            for keyword, desc in features:
                if keyword in content:
                    result.add_pass(f"Worktree 功能: {desc}", f"找到: {keyword}")
                else:
                    result.add_warning(f"Worktree 功能: {desc}", f"未找到: {keyword}")

    except ImportError as e:
        result.add_fail("Worktree 测试", f"无法导入 WorktreeManager: {e}")
    except Exception as e:
        result.add_fail("Worktree 测试", f"异常: {e}")


def test_subtask_size_validation(result: ReportTestResult):
    """测试子任务大小验证"""
    print_section("子任务大小验证")

    # 检查验证器文件
    validator_file = backend_dir / "agents" / "subtask_validator.py"

    if not validator_file.exists():
        result.add_warning("子任务验证器", "subtask_validator.py 文件不存在（可能未实施）")
        return

    result.add_pass("子任务验证器", "文件存在")

    try:
        from agents.subtask_validator import (
            is_subtask_oversized,
            validate_implementation_plan,
            detect_empty_param_error,
        )

        # 测试过大子任务检测
        test_subtasks = [
            ({"id": "test-1", "description": "创建50×50关系矩阵"}, True, "大矩阵任务"),
            ({"id": "test-2", "description": "创建100个配置文件"}, True, "大量文件任务"),
            ({"id": "test-3", "description": "修改用户认证逻辑"}, False, "正常任务"),
        ]

        for subtask, should_be_oversized, desc in test_subtasks:
            is_large, reasons = is_subtask_oversized(subtask)
            if is_large == should_be_oversized:
                result.add_pass(f"大小检测: {desc}", f"正确检测: {is_large}")
            else:
                result.add_fail(f"大小检测: {desc}", f"检测错误: 期望 {should_be_oversized}, 实际 {is_large}")

        # 测试空参数错误检测
        error_messages = [
            ("The required parameter `file_path` is missing", True),
            ("The required parameter `content` is missing", True),
            ("File not found", False),
        ]

        for error_msg, should_detect in error_messages:
            detected = detect_empty_param_error(error_msg)
            if detected == should_detect:
                result.add_pass("空参数检测", f"正确: {error_msg[:30]}...")
            else:
                result.add_fail("空参数检测", f"错误: {error_msg[:30]}...")

    except ImportError:
        result.add_warning("子任务验证器", "无法导入验证函数（可能未实施）")
    except Exception as e:
        result.add_fail("子任务验证测试", f"异常: {e}")


def test_planner_prompt_sizing_rules(result: ReportTestResult):
    """测试 Planner Prompt 中的大小规则"""
    print_section("Planner Prompt 大小规则")

    planner_prompt_file = backend_dir / "prompts" / "planner.md"

    if not planner_prompt_file.exists():
        result.add_fail("Planner Prompt", "planner.md 文件不存在")
        return

    result.add_pass("Planner Prompt", "文件存在")

    try:
        content = planner_prompt_file.read_text()

        # 检查大小规则关键内容
        sizing_keywords = [
            ("Subtask Sizing Rules", "大小规则章节"),
            ("output token limits", "Token 限制说明"),
            ("2,000 characters", "中文字符限制"),
            ("3,000 characters", "英文字符限制"),
            ("10×10 cells", "矩阵大小限制"),
            ("High-Risk Keywords", "高风险关键词"),
        ]

        for keyword, desc in sizing_keywords:
            if keyword in content:
                result.add_pass(f"大小规则: {desc}", f"找到: {keyword}")
            else:
                result.add_warning(f"大小规则: {desc}", f"未找到: {keyword}")

    except Exception as e:
        result.add_fail("Planner Prompt 测试", f"异常: {e}")


def test_file_integrity(result: ReportTestResult):
    """测试关键文件完整性"""
    print_section("关键文件完整性检查")

    # 检查报告中提到的关键文件
    critical_files = [
        (backend_dir / "security" / "git_validators.py", "Git 验证器"),
        (backend_dir / "security" / "bash_validators.py", "Bash 验证器"),
        (backend_dir / "security" / "shell_validators.py", "Shell 验证器"),
        (backend_dir / "security" / "hooks.py", "安全钩子"),
        (backend_dir / "core" / "worktree.py", "Worktree 管理器"),
        (backend_dir / "prompts_pkg" / "prompt_generator.py", "Prompt 生成器"),
        (backend_dir / "prompts_pkg" / "prompts.py", "Prompt 加载器"),
        (backend_dir / "prompts" / "planner.md", "Planner Prompt"),
        (backend_dir / "prompts" / "coder.md", "Coder Prompt"),
        (project_root / "hooks" / "pre-commit", "Pre-commit 钩子"),
    ]

    for file_path, desc in critical_files:
        if file_path.exists():
            size = file_path.stat().st_size
            result.add_pass(f"文件存在: {desc}", f"{file_path.name} ({size} 字节)")
        else:
            result.add_fail(f"文件缺失: {desc}", f"{file_path}")


def test_git_knowledge_documentation(result: ReportTestResult):
    """测试 Git 知识库文档"""
    print_section("Git 知识库文档")

    docs_dir = project_root / "docs" / "git知识库"

    if not docs_dir.exists():
        result.add_fail("文档目录", f"目录不存在: {docs_dir}")
        return

    result.add_pass("文档目录", "目录存在")

    # 检查文档文件
    doc_files = [
        ("README.md", "知识库概览"),
        ("knowledge-sources.md", "知识来源映射"),
    ]

    for filename, desc in doc_files:
        file_path = docs_dir / filename
        if file_path.exists():
            size = len(file_path.read_text())
            result.add_pass(f"文档: {desc}", f"{filename} ({size} 字符)")
        else:
            result.add_warning(f"文档: {desc}", f"{filename} 不存在")


def test_fork_management_documentation(result: ReportTestResult):
    """测试 Fork 管理文档"""
    print_section("Fork 管理文档")

    fork_dir = project_root / "docs" / "fork"

    if not fork_dir.exists():
        result.add_fail("Fork 文档目录", f"目录不存在: {fork_dir}")
        return

    result.add_pass("Fork 文档目录", "目录存在")

    # 检查上游同步工作流文档
    workflow_file = fork_dir / "upstream-sync-workflow.md"
    if workflow_file.exists():
        content = workflow_file.read_text()

        # 检查关键章节
        sections = [
            ("阶段 1", "准备阶段"),
            ("阶段 2", "获取上游更新"),
            ("阶段 3", "AI 分析差异"),
            ("备份当前状态", "3层备份保护"),
            ("关键保护文件", "受保护文件"),
        ]

        for keyword, desc in sections:
            if keyword in content:
                result.add_pass(f"工作流章节: {desc}", f"找到: {keyword}")
            else:
                result.add_warning(f"工作流章节: {desc}", f"未找到: {keyword}")
    else:
        result.add_fail("工作流文档", "upstream-sync-workflow.md 不存在")


def main():
    """运行所有测试"""
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "完整报告功能测试" + " " * 38 + "║")
    print("╚" + "=" * 78 + "╝")
    print()

    result = ReportTestResult()

    try:
        # Git 安全系统测试 (4层)
        test_git_safety_layer1_prompt_education(result)
        test_git_safety_layer2_code_validation(result)
        test_git_safety_layer3_runtime_hooks(result)
        test_git_safety_layer4_precommit_hook(result)

        # Git 知识库系统测试
        test_git_knowledge_base(result)
        test_git_knowledge_injection(result)

        # Worktree 优化测试
        test_worktree_optimization(result)

        # 子任务大小验证测试
        test_subtask_size_validation(result)
        test_planner_prompt_sizing_rules(result)

        # 文件完整性测试
        test_file_integrity(result)

        # 文档测试
        test_git_knowledge_documentation(result)
        test_fork_management_documentation(result)

        # 打印测试总结
        result.print_summary()

        # 打印详细结果
        print("\n详细测试结果:")
        print("-" * 80)
        for icon, name, msg in result.details:
            print(f"{icon} {name}")
            if msg:
                print(f"   {msg}")

        # 返回退出码
        sys.exit(0 if result.failed == 0 else 1)

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
