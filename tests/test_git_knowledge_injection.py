#!/usr/bin/env python3
"""
Test script for Git knowledge injection functionality.

This script tests:
1. _load_git_knowledge() function
2. _needs_git_knowledge() detection
3. generate_git_safety_rules() loading from file
4. generate_subtask_prompt() dynamic injection
"""

import sys
from pathlib import Path

# Add backend to path
script_dir = Path(__file__).parent
project_root = script_dir.parent
backend_dir = project_root / "apps" / "backend"
sys.path.insert(0, str(backend_dir))

from prompts_pkg.prompts import _load_git_knowledge
from prompts_pkg.prompt_generator import (
    _needs_git_knowledge,
    generate_git_safety_rules,
    generate_subtask_prompt,
)


def test_load_git_knowledge():
    """Test loading Git knowledge files."""
    print("=" * 80)
    print("TEST 1: Loading Git Knowledge Files")
    print("=" * 80)

    files = [
        "git-safety-rules.md",
        "git-common-operations.md",
        "git-error-recovery.md",
        "git-worktree-guide.md",
        "git-best-practices.md",
    ]

    for filename in files:
        content = _load_git_knowledge(filename)
        if content:
            print(f"✅ {filename}: {len(content)} chars")
        else:
            print(f"❌ {filename}: Failed to load")

    # Test non-existent file
    content = _load_git_knowledge("non-existent.md")
    if content == "":
        print("✅ Non-existent file returns empty string (graceful degradation)")
    else:
        print("❌ Non-existent file should return empty string")

    print()


def test_needs_git_knowledge():
    """Test Git knowledge detection."""
    print("=" * 80)
    print("TEST 2: Git Knowledge Detection")
    print("=" * 80)

    test_cases = [
        # (subtask, expected_result, description)
        (
            {"id": "task-1", "description": "Fix git merge conflict"},
            True,
            "Should detect 'git' and 'merge' keywords"
        ),
        (
            {"id": "git-setup", "description": "Setup project"},
            True,
            "Should detect 'git' in subtask ID"
        ),
        (
            {"id": "task-2", "description": "Commit changes to repository"},
            True,
            "Should detect 'commit' and 'repository' keywords"
        ),
        (
            {"id": "task-3", "description": "Create worktree for feature"},
            True,
            "Should detect 'worktree' keyword"
        ),
        (
            {"id": "task-4", "description": "Implement user authentication"},
            False,
            "Should NOT detect Git keywords"
        ),
        (
            {"id": "task-5", "description": "Update database schema"},
            False,
            "Should NOT detect Git keywords"
        ),
    ]

    for subtask, expected, desc in test_cases:
        result = _needs_git_knowledge(subtask)
        status = "✅" if result == expected else "❌"
        print(f"{status} {desc}")
        print(f"   Subtask: {subtask}")
        print(f"   Expected: {expected}, Got: {result}")
        print()


def test_generate_git_safety_rules():
    """Test Git safety rules generation."""
    print("=" * 80)
    print("TEST 3: Git Safety Rules Generation")
    print("=" * 80)

    rules = generate_git_safety_rules()

    if rules:
        print(f"✅ Generated safety rules: {len(rules)} chars")

        # Check for key content
        checks = [
            ("rm .git/index", "Contains forbidden command warning"),
            ("git read-tree HEAD", "Contains safe recovery method"),
            ("CRITICAL", "Contains critical warning"),
        ]

        for keyword, desc in checks:
            if keyword in rules:
                print(f"✅ {desc}")
            else:
                print(f"❌ Missing: {desc}")
    else:
        print("❌ Failed to generate safety rules")

    print()


def test_subtask_prompt_injection():
    """Test dynamic Git knowledge injection in subtask prompts."""
    print("=" * 80)
    print("TEST 4: Dynamic Git Knowledge Injection")
    print("=" * 80)

    # Create test directories
    project_dir = Path("/tmp/test-project")
    spec_dir = Path("/tmp/test-project/auto-claude/specs/test-spec")

    test_cases = [
        {
            "name": "Simple Git commit task",
            "subtask": {
                "id": "task-1",
                "description": "Commit changes to git repository",
                "service": "all",
                "files_to_modify": [],
                "files_to_create": [],
                "patterns_from": [],
                "verification": {"type": "manual"},
            },
            "phase": {"id": "phase-1", "name": "Setup"},
            "expected_sections": [
                "git-safety-rules.md",
                "git-common-operations.md",
            ],
        },
        {
            "name": "Worktree task",
            "subtask": {
                "id": "task-2",
                "description": "Create worktree for feature development",
                "service": "all",
                "files_to_modify": [],
                "files_to_create": [],
                "patterns_from": [],
                "verification": {"type": "manual"},
            },
            "phase": {"id": "phase-1", "name": "Setup"},
            "expected_sections": [
                "git-safety-rules.md",
                "git-common-operations.md",
                "git-worktree-guide.md",
            ],
        },
        {
            "name": "Git error recovery task",
            "subtask": {
                "id": "task-3",
                "description": "Fix git index corruption error",
                "service": "all",
                "files_to_modify": [],
                "files_to_create": [],
                "patterns_from": [],
                "verification": {"type": "manual"},
            },
            "phase": {"id": "phase-1", "name": "Setup"},
            "expected_sections": [
                "git-safety-rules.md",
                "git-common-operations.md",
                "git-error-recovery.md",
            ],
        },
        {
            "name": "Git setup task",
            "subtask": {
                "id": "task-4",
                "description": "Setup git repository and configure hooks",
                "service": "all",
                "files_to_modify": [],
                "files_to_create": [],
                "patterns_from": [],
                "verification": {"type": "manual"},
            },
            "phase": {"id": "phase-1", "name": "Setup"},
            "expected_sections": [
                "git-safety-rules.md",
                "git-common-operations.md",
                "git-best-practices.md",
            ],
        },
        {
            "name": "Non-Git task",
            "subtask": {
                "id": "task-5",
                "description": "Implement user authentication",
                "service": "all",
                "files_to_modify": [],
                "files_to_create": [],
                "patterns_from": [],
                "verification": {"type": "manual"},
            },
            "phase": {"id": "phase-1", "name": "Setup"},
            "expected_sections": [
                "git-safety-rules.md",  # Always injected
            ],
        },
    ]

    for test_case in test_cases:
        print(f"\nTest: {test_case['name']}")
        print("-" * 80)

        try:
            prompt = generate_subtask_prompt(
                spec_dir=spec_dir,
                project_dir=project_dir,
                subtask=test_case["subtask"],
                phase=test_case["phase"],
            )

            print(f"✅ Generated prompt: {len(prompt)} chars")

            # Check for expected sections
            for section in test_case["expected_sections"]:
                section_name = section.replace(".md", "").replace("-", " ").title()

                # Check for section markers
                if section == "git-safety-rules.md":
                    marker = "GIT SAFETY RULES"
                elif section == "git-common-operations.md":
                    marker = "Git Common Operations"
                elif section == "git-worktree-guide.md":
                    marker = "Git Worktree Guide"
                elif section == "git-error-recovery.md":
                    marker = "Git Error Recovery"
                elif section == "git-best-practices.md":
                    marker = "Git Best Practices"
                else:
                    marker = section_name

                if marker in prompt:
                    print(f"   ✅ Contains: {section_name}")
                else:
                    print(f"   ❌ Missing: {section_name}")

            # Token estimation
            token_estimate = len(prompt) // 4  # Rough estimate: 1 token ≈ 4 chars
            print(f"   📊 Estimated tokens: ~{token_estimate}")

        except Exception as e:
            print(f"❌ Error generating prompt: {e}")

    print()


def main():
    """Run all tests."""
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "Git Knowledge Injection Tests" + " " * 29 + "║")
    print("╚" + "=" * 78 + "╝")
    print()

    try:
        test_load_git_knowledge()
        test_needs_git_knowledge()
        test_generate_git_safety_rules()
        test_subtask_prompt_injection()

        print("=" * 80)
        print("✅ All tests completed!")
        print("=" * 80)
        print()

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
