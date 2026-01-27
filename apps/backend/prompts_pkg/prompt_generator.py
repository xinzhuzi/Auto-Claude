"""
Prompt Generator
================

Generates minimal, focused prompts for each subtask.
Instead of a 900-line mega-prompt, each subtask gets a tailored ~100-line prompt
with only the context it needs.

This approach:
- Reduces token usage by ~80%
- Keeps the agent focused on ONE task
- Moves bookkeeping to Python orchestration
"""

import json
from pathlib import Path


def load_scoped_services(spec_dir: Path) -> list[str]:
    """
    Load scoped services from context.json.

    This defines which directories the task is allowed to modify.
    Used to limit git operations to only the relevant service paths.

    Args:
        spec_dir: Directory containing spec files

    Returns:
        List of service paths (e.g., ["Design/世界观小说/《道劫》/设定集"])
        Returns empty list if context.json doesn't exist or has no scoped_services
    """
    context_file = spec_dir / "context.json"
    if not context_file.exists():
        return []

    try:
        context_data = json.loads(context_file.read_text())
        return context_data.get("scoped_services", [])
    except (json.JSONDecodeError, OSError):
        return []


def get_git_add_paths(scoped_services: list[str]) -> str:
    """
    Generate git add command paths based on scoped services.

    If scoped_services is provided, returns paths for only those services.
    Otherwise, returns "-A" to add all changes from repository root.

    Args:
        scoped_services: List of service paths from context.json

    Returns:
        Git add path string suitable for command line
    """
    if not scoped_services:
        # Use -A to add all changes from repository root, regardless of current directory
        # This prevents git index corruption when agent changes directories
        return "-A"

    # Quote each path to handle spaces and special characters
    quoted_paths = [f'"{service}"' for service in scoped_services]
    return " ".join(quoted_paths)


def generate_git_safety_rules() -> str:
    """
    Generate Git safety rules for AI agents.

    These rules are injected into every subtask prompt to prevent catastrophic
    Git operations like "rm .git/index" which can cause massive data loss.

    Loads rules from prompts/knowledge/git/git-safety-rules.md if available,
    otherwise falls back to hardcoded version.

    Returns:
        Markdown string with Git safety rules
    """
    from .prompts import _load_git_knowledge

    # Try to load from knowledge base
    safety_rules = _load_git_knowledge("git-safety-rules.md")

    # If knowledge file exists and loaded successfully, use it
    if safety_rules:
        return safety_rules

    # Fallback to hardcoded version if file doesn't exist
    return """## 🚨 GIT SAFETY RULES - CRITICAL

### NEVER Execute These Commands:
```bash
rm .git/index          # ❌ FORBIDDEN - Causes all files to be marked as deleted
rm -f .git/index       # ❌ FORBIDDEN - Same catastrophic result
rm -rf .git/           # ❌ FORBIDDEN - Destroys the entire repository
```

### If Git Index is Corrupted:
**SAFE Recovery Steps:**
```bash
rm -f .git/index.lock      # Step 1: Remove lock (SAFE)
git read-tree HEAD         # Step 2: Rebuild index (SAFE)
git status                 # Step 3: Verify
```

**Why git read-tree HEAD is safe:**
- ✅ Rebuilds index from current commit
- ✅ Does NOT delete the index file
- ✅ Preserves all file tracking information
- ✅ Can be run multiple times safely
- ✅ No data loss risk

**Why rm .git/index is CATASTROPHIC:**
- ❌ Deletes all file tracking information
- ❌ Causes Git to mark ALL files as deleted
- ❌ Can result in 200,000+ files being deleted on commit
- ❌ Extremely difficult to recover from

### Safe Git Practices:
1. Always check your location: `pwd`
2. Always verify changes before committing: `git status`
3. Use `git read-tree HEAD` to fix index corruption
4. NEVER delete .git/index or .git/ directory

---

"""


def _needs_git_knowledge(subtask: dict) -> bool:
    """
    Detect if a subtask involves Git operations and needs Git knowledge injection.

    Args:
        subtask: The subtask dictionary containing description and other metadata

    Returns:
        True if Git knowledge should be injected, False otherwise
    """
    git_keywords = [
        "git", "commit", "branch", "merge", "rebase", "push", "pull",
        "checkout", "stash", "cherry-pick", "worktree", "repository",
        "repo", "clone", "fetch", "remote", "tag", "log", "diff",
        "reset", "revert", "index", ".git"
    ]

    # Check subtask description
    description = subtask.get("description", "").lower()
    if any(keyword in description for keyword in git_keywords):
        return True

    # Check subtask ID (e.g., "git-setup", "commit-changes")
    subtask_id = subtask.get("id", "").lower()
    if any(keyword in subtask_id for keyword in git_keywords):
        return True

    return False


def get_relative_spec_path(spec_dir: Path, project_dir: Path) -> str:
    """
    Get the spec directory path relative to the project/working directory.

    This ensures the AI gets a usable path regardless of absolute locations.

    Args:
        spec_dir: Absolute path to spec directory
        project_dir: Absolute path to project/working directory

    Returns:
        Relative path string (e.g., "./auto-claude/specs/003-new-spec")
    """
    try:
        # Try to make path relative to project_dir
        relative = spec_dir.relative_to(project_dir)
        return f"./{relative}"
    except ValueError:
        # If spec_dir is not under project_dir, return the name only
        # This shouldn't happen if workspace.py correctly copies spec files
        return f"./auto-claude/specs/{spec_dir.name}"


def generate_environment_context(project_dir: Path, spec_dir: Path) -> str:
    """
    Generate environment context header for prompts.

    This explicitly tells the AI where it is working, preventing path confusion.

    Args:
        project_dir: The working directory for the AI
        spec_dir: The spec directory (may be absolute or relative)

    Returns:
        Markdown string with environment context
    """
    relative_spec = get_relative_spec_path(spec_dir, project_dir)

    return f"""## YOUR ENVIRONMENT

**Working Directory:** `{project_dir}`
**Spec Location:** `{relative_spec}/`

Your filesystem is restricted to your working directory. All file paths should be
relative to this location. Do NOT use absolute paths.

**⚠️ CRITICAL:** Before ANY git command or file operation, run `pwd` to verify your current
directory. If you've used `cd` to change directories, you MUST use paths relative to your
NEW location, not the working directory. See the PATH CONFUSION PREVENTION section in the
coder prompt for detailed examples.

**Important Files:**
- Spec: `{relative_spec}/spec.md`
- Plan: `{relative_spec}/implementation_plan.json`
- Progress: `{relative_spec}/build-progress.txt`
- Context: `{relative_spec}/context.json`

---

"""


def generate_subtask_prompt(
    spec_dir: Path,
    project_dir: Path,
    subtask: dict,
    phase: dict,
    attempt_count: int = 0,
    recovery_hints: list[str] | None = None,
) -> str:
    """
    Generate a minimal, focused prompt for implementing a single subtask.

    Args:
        spec_dir: Directory containing spec files
        project_dir: Root project directory (working directory)
        subtask: The subtask to implement
        phase: The phase containing this subtask
        attempt_count: Number of previous attempts (for retry context)
        recovery_hints: Hints from previous failed attempts

    Returns:
        A focused prompt string (~100 lines instead of 900)
    """
    subtask_id = subtask.get("id", "unknown")
    description = subtask.get("description", "No description")
    service = subtask.get("service", "all")
    files_to_modify = subtask.get("files_to_modify", [])
    files_to_create = subtask.get("files_to_create", [])
    patterns_from = subtask.get("patterns_from", [])
    verification = subtask.get("verification", {})

    # Get relative spec path
    relative_spec = get_relative_spec_path(spec_dir, project_dir)

    # Load scoped services to limit git operations
    scoped_services = load_scoped_services(spec_dir)
    git_add_paths = get_git_add_paths(scoped_services)

    # Build the prompt
    sections = []

    # Environment context first
    sections.append(generate_environment_context(project_dir, spec_dir))

    # Git safety rules (CRITICAL - inject into every subtask)
    sections.append(generate_git_safety_rules())

    # Dynamic Git knowledge injection (only if subtask involves Git operations)
    if _needs_git_knowledge(subtask):
        from .prompts import _load_git_knowledge

        # Always include common operations for Git-related tasks
        common_ops = _load_git_knowledge("git-common-operations.md")
        if common_ops:
            sections.append(common_ops)

        # Include worktree guide if worktree is mentioned
        if "worktree" in description.lower() or "worktree" in subtask_id.lower():
            worktree_guide = _load_git_knowledge("git-worktree-guide.md")
            if worktree_guide:
                sections.append(worktree_guide)

        # Include error recovery if error/fix/recover/corrupt is mentioned
        error_keywords = ["error", "fix", "recover", "corrupt", "broken", "failed"]
        if any(keyword in description.lower() for keyword in error_keywords):
            error_recovery = _load_git_knowledge("git-error-recovery.md")
            if error_recovery:
                sections.append(error_recovery)

        # Include best practices for setup/init/configure tasks
        setup_keywords = ["setup", "init", "configure", "install", "create"]
        if any(keyword in description.lower() for keyword in setup_keywords):
            best_practices = _load_git_knowledge("git-best-practices.md")
            if best_practices:
                sections.append(best_practices)

    # Header
    sections.append(f"""# Subtask Implementation Task

**Subtask ID:** `{subtask_id}`
**Phase:** {phase.get("name", phase.get("id", "Unknown"))}
**Service:** {service}

## Description

{description}
""")

    # Recovery context if this is a retry
    if attempt_count > 0:
        sections.append(f"""
## ⚠️ RETRY ATTEMPT ({attempt_count + 1})

This subtask has been attempted {attempt_count} time(s) before without success.
You MUST use a DIFFERENT approach than previous attempts.
""")
        if recovery_hints:
            sections.append("**Previous attempt insights:**")
            for hint in recovery_hints:
                sections.append(f"- {hint}")
            sections.append("")

    # Files section
    sections.append("## Files\n")

    if files_to_modify:
        sections.append("**Files to Modify:**")
        for f in files_to_modify:
            sections.append(f"- `{f}`")
        sections.append("")

    if files_to_create:
        sections.append("**Files to Create:**")
        for f in files_to_create:
            sections.append(f"- `{f}`")
        sections.append("")

    if patterns_from:
        sections.append("**Pattern Files (study these first):**")
        for f in patterns_from:
            sections.append(f"- `{f}`")
        sections.append("")

    # Verification
    sections.append("## Verification\n")
    v_type = verification.get("type", "manual")

    if v_type == "command":
        sections.append(f"""Run this command to verify:
```bash
{verification.get("command", 'echo "No command specified"')}
```
Expected: {verification.get("expected", "Success")}
""")
    elif v_type == "api":
        method = verification.get("method", "GET")
        url = verification.get("url", "http://localhost")
        body = verification.get("body", {})
        expected_status = verification.get("expected_status", 200)
        sections.append(f"""Test the API endpoint:
```bash
curl -X {method} {url} -H "Content-Type: application/json" {f"-d '{json.dumps(body)}'" if body else ""}
```
Expected status: {expected_status}
""")
    elif v_type == "browser":
        url = verification.get("url", "http://localhost:3000")
        checks = verification.get("checks", [])
        sections.append(f"""Open in browser: {url}

Verify:""")
        for check in checks:
            sections.append(f"- [ ] {check}")
        sections.append("")
    elif v_type == "e2e":
        steps = verification.get("steps", [])
        sections.append("End-to-end verification steps:")
        for i, step in enumerate(steps, 1):
            sections.append(f"{i}. {step}")
        sections.append("")
    else:
        instructions = verification.get("instructions", "Manual verification required")
        sections.append(f"**Manual Verification:**\n{instructions}\n")

    # Instructions
    sections.append(f"""## Instructions

1. **Read the pattern files** to understand code style and conventions
2. **Read the files to modify** (if any) to understand current implementation
3. **Implement the subtask** following the patterns exactly
4. **Run verification** and fix any issues
5. **Commit your changes:**
   ```bash
   git add {git_add_paths}
   git commit -m "auto-claude: {subtask_id} - {description[:50]}"
   ```
6. **Update the plan** - set this subtask's status to "completed" in implementation_plan.json

## Quality Checklist

Before marking complete, verify:
- [ ] Follows patterns from reference files
- [ ] No console.log/print debugging statements
- [ ] Error handling in place
- [ ] Verification passes
- [ ] Clean commit with descriptive message

## Important

- Focus ONLY on this subtask - don't modify unrelated code
- If verification fails, FIX IT before committing
- If you encounter a blocker, document it in build-progress.txt
""")

    # Note: Linear updates are now handled by Python orchestrator via linear_updater.py
    # Agents no longer need to call Linear MCP tools directly

    return "\n".join(sections)


def generate_planner_prompt(spec_dir: Path, project_dir: Path | None = None) -> str:
    """
    Generate the planner prompt (used only once at start).
    This is a simplified version that focuses on plan creation.

    Args:
        spec_dir: Directory containing spec.md
        project_dir: Working directory (for relative paths)

    Returns:
        Planner prompt string
    """
    # Load the full planner prompt from file.
    candidate_dirs = [
        Path(__file__).parent.parent / "prompts",  # current layout
        Path(__file__).parent / "prompts",  # legacy fallback (if any)
    ]
    planner_file = next(
        (
            (candidate_dir / "planner.md")
            for candidate_dir in candidate_dirs
            if (candidate_dir / "planner.md").exists()
        ),
        None,
    )

    if planner_file:
        prompt = planner_file.read_text(encoding="utf-8")
    else:
        prompt = (
            "Read spec.md and create implementation_plan.json with phases and subtasks."
        )

    # Use project_dir for relative paths, or infer from spec_dir
    if project_dir is None:
        # Infer: spec_dir is typically project/auto-claude/specs/XXX
        project_dir = spec_dir.parent.parent.parent

    # Get relative path for spec directory
    relative_spec = get_relative_spec_path(spec_dir, project_dir)

    # Build header with environment context
    header = generate_environment_context(project_dir, spec_dir)

    # Add spec-specific instructions
    header += f"""## SPEC LOCATION

Your spec file is located at: `{relative_spec}/spec.md`

Store all build artifacts in this spec directory:
- `{relative_spec}/implementation_plan.json` - Subtask-based implementation plan
- `{relative_spec}/build-progress.txt` - Progress notes
- `{relative_spec}/init.sh` - Environment setup script

The project root is your current working directory. Implement code in the project root,
not in the spec directory.

---

"""
    # Note: Linear task creation and updates are now handled by Python orchestrator
    # via linear_updater.py - agents no longer need Linear instructions in prompts

    return header + prompt


def load_subtask_context(
    spec_dir: Path,
    project_dir: Path,
    subtask: dict,
    max_file_lines: int = 200,
) -> dict:
    """
    Load minimal context needed for a subtask.

    Args:
        spec_dir: Spec directory
        project_dir: Project root
        subtask: The subtask being implemented
        max_file_lines: Maximum lines to include per file

    Returns:
        Dict with file contents and relevant context
    """
    context = {
        "patterns": {},
        "files_to_modify": {},
        "spec_excerpt": None,
    }

    # Load pattern files (truncated)
    for pattern_path in subtask.get("patterns_from", []):
        full_path = project_dir / pattern_path
        if full_path.exists():
            try:
                lines = full_path.read_text(encoding="utf-8").split("\n")
                if len(lines) > max_file_lines:
                    content = "\n".join(lines[:max_file_lines])
                    content += (
                        f"\n\n... (truncated, {len(lines) - max_file_lines} more lines)"
                    )
                else:
                    content = "\n".join(lines)
                context["patterns"][pattern_path] = content
            except Exception:
                context["patterns"][pattern_path] = "(Could not read file)"

    # Load files to modify (truncated)
    for file_path in subtask.get("files_to_modify", []):
        full_path = project_dir / file_path
        if full_path.exists():
            try:
                lines = full_path.read_text(encoding="utf-8").split("\n")
                if len(lines) > max_file_lines:
                    content = "\n".join(lines[:max_file_lines])
                    content += (
                        f"\n\n... (truncated, {len(lines) - max_file_lines} more lines)"
                    )
                else:
                    content = "\n".join(lines)
                context["files_to_modify"][file_path] = content
            except Exception:
                context["files_to_modify"][file_path] = "(Could not read file)"

    return context


def format_context_for_prompt(context: dict) -> str:
    """
    Format loaded context into a prompt section.

    Args:
        context: Dict from load_subtask_context

    Returns:
        Formatted string to append to prompt
    """
    sections = []

    if context.get("patterns"):
        sections.append("## Reference Files (Patterns to Follow)\n")
        for path, content in context["patterns"].items():
            sections.append(f"### `{path}`\n```\n{content}\n```\n")

    if context.get("files_to_modify"):
        sections.append("## Current File Contents (To Modify)\n")
        for path, content in context["files_to_modify"].items():
            sections.append(f"### `{path}`\n```\n{content}\n```\n")

    return "\n".join(sections)
