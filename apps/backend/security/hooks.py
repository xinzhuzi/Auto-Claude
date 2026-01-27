"""
Security Hooks
==============

Pre-tool-use hooks that validate bash commands for security.
Main enforcement point for the security system.

Also includes hooks to fix tool parameter issues (e.g., TodoWrite activeForm).
"""

import os
from pathlib import Path
from typing import Any

from project_analyzer import BASE_COMMANDS, SecurityProfile, is_command_allowed

from .bash_validators import validate_bash_command
from .parser import extract_commands, get_command_for_validation, split_command_segments
from .profile import get_security_profile
from .validator import VALIDATORS


async def bash_security_hook(
    input_data: dict[str, Any],
    tool_use_id: str | None = None,
    context: Any | None = None,
) -> dict[str, Any]:
    """
    Pre-tool-use hook that validates bash commands using dynamic allowlist.

    This is the main security enforcement point. It:
    1. Validates tool_input structure (must be dict with 'command' key)
    2. Extracts command names from the command string
    3. Checks each command against the project's security profile
    4. Runs additional validation for sensitive commands
    5. Blocks disallowed commands with clear error messages

    Args:
        input_data: Dict containing tool_name and tool_input
        tool_use_id: Optional tool use ID
        context: Optional context

    Returns:
        Empty dict to allow, or {"decision": "block", "reason": "..."} to block
    """
    if input_data.get("tool_name") != "Bash":
        return {}

    # Validate tool_input structure before accessing
    tool_input = input_data.get("tool_input")

    # Check if tool_input is None (malformed tool call)
    if tool_input is None:
        return {
            "decision": "block",
            "reason": "Bash tool_input is None - malformed tool call from SDK",
        }

    # Check if tool_input is a dict
    if not isinstance(tool_input, dict):
        return {
            "decision": "block",
            "reason": f"Bash tool_input must be dict, got {type(tool_input).__name__}",
        }

    # Now safe to access command
    command = tool_input.get("command", "")
    if not command:
        return {}

    # CRITICAL: Check for dangerous Git operations FIRST (highest priority)
    # This prevents catastrophic data loss from commands like "rm .git/index"
    is_valid, error_msg = validate_bash_command(command)
    if not is_valid:
        return {
            "decision": "block",
            "reason": error_msg,
        }

    # Get the working directory from context or use current directory
    # Priority:
    # 1. Environment variable PROJECT_DIR_ENV_VAR (set by agent on startup)
    # 2. input_data cwd (passed by SDK in the tool call)
    # 3. Context cwd (should be set by ClaudeSDKClient but sometimes isn't)
    # 4. Current working directory (fallback, may be incorrect in worktree mode)
    from .constants import PROJECT_DIR_ENV_VAR

    cwd = os.environ.get(PROJECT_DIR_ENV_VAR)
    if not cwd:
        cwd = input_data.get("cwd")
    if not cwd and context and hasattr(context, "cwd"):
        cwd = context.cwd
    if not cwd:
        cwd = os.getcwd()

    # Get or create security profile
    # Note: In actual use, spec_dir would be passed through context
    try:
        profile = get_security_profile(Path(cwd))
    except Exception as e:
        # If profile creation fails, fall back to base commands only
        print(f"Warning: Could not load security profile: {e}")
        profile = SecurityProfile()
        profile.base_commands = BASE_COMMANDS.copy()

    # Extract all commands from the command string
    commands = extract_commands(command)

    if not commands:
        # Could not parse - fail safe by blocking
        return {
            "decision": "block",
            "reason": f"Could not parse command for security validation: {command}",
        }

    # Split into segments for per-command validation
    segments = split_command_segments(command)

    # Get all allowed commands
    allowed = profile.get_all_allowed_commands()

    # Check each command against the allowlist
    for cmd in commands:
        # Check if command is allowed
        is_allowed, reason = is_command_allowed(cmd, profile)

        if not is_allowed:
            return {
                "decision": "block",
                "reason": reason,
            }

        # Additional validation for sensitive commands
        if cmd in VALIDATORS:
            cmd_segment = get_command_for_validation(cmd, segments)
            if not cmd_segment:
                cmd_segment = command

            validator = VALIDATORS[cmd]
            allowed, reason = validator(cmd_segment)
            if not allowed:
                return {"decision": "block", "reason": reason}

    return {}


def validate_command(
    command: str,
    project_dir: Path | None = None,
) -> tuple[bool, str]:
    """
    Validate a command string (for testing/debugging).

    Args:
        command: Full command string to validate
        project_dir: Optional project directory (uses cwd if not provided)

    Returns:
        (is_allowed, reason) tuple
    """
    if project_dir is None:
        project_dir = Path.cwd()

    profile = get_security_profile(project_dir)
    commands = extract_commands(command)

    if not commands:
        return False, "Could not parse command"

    segments = split_command_segments(command)

    for cmd in commands:
        is_allowed_result, reason = is_command_allowed(cmd, profile)
        if not is_allowed_result:
            return False, reason

        if cmd in VALIDATORS:
            cmd_segment = get_command_for_validation(cmd, segments)
            if not cmd_segment:
                cmd_segment = command

            validator = VALIDATORS[cmd]
            allowed, reason = validator(cmd_segment)
            if not allowed:
                return False, reason

    return True, ""


async def todowrite_fix_hook(
    input_data: dict[str, Any],
    tool_use_id: str | None = None,
    context: Any | None = None,
) -> dict[str, Any]:
    """
    Pre-tool-use hook that fixes TodoWrite tool parameters.

    Claude Code CLI requires 'activeForm' parameter for each todo item,
    but Claude often omits it. This hook automatically adds activeForm
    by copying the 'content' field value.

    Args:
        input_data: Dict containing tool_name and tool_input
        tool_use_id: Optional tool use ID
        context: Optional context

    Returns:
        Empty dict (always allows, just fixes parameters)
    """
    if input_data.get("tool_name") != "TodoWrite":
        return {}

    tool_input = input_data.get("tool_input")
    if not tool_input or not isinstance(tool_input, dict):
        return {}

    todos = tool_input.get("todos")
    if not todos or not isinstance(todos, list):
        return {}

    # Fix each todo item by adding activeForm if missing
    modified = False
    for todo in todos:
        if isinstance(todo, dict) and "activeForm" not in todo:
            # Use content as activeForm (this is what Claude Code expects)
            content = todo.get("content", "")
            todo["activeForm"] = content
            modified = True

    if modified:
        # Update the tool_input in place
        input_data["tool_input"]["todos"] = todos

    return {}


async def write_empty_param_hook(
    input_data: dict[str, Any],
    tool_use_id: str | None = None,
    context: Any | None = None,
) -> dict[str, Any]:
    """
    Pre-tool-use hook that detects empty Write tool parameters.

    When Claude's output is truncated due to token limits, the Write tool
    parameters (file_path, content) become empty. This hook detects this
    condition and blocks the tool call with a helpful error message.

    Args:
        input_data: Dict containing tool_name and tool_input
        tool_use_id: Optional tool use ID
        context: Optional context

    Returns:
        Empty dict to allow, or {"decision": "block", "reason": "..."} to block
    """
    if input_data.get("tool_name") != "Write":
        return {}

    tool_input = input_data.get("tool_input")
    if not tool_input or not isinstance(tool_input, dict):
        return {}

    file_path = tool_input.get("file_path", "")
    content = tool_input.get("content", "")

    # Detect empty parameters (sign of token truncation)
    if not file_path and not content:
        return {
            "decision": "block",
            "reason": (
                "🚨 EMPTY WRITE PARAMETERS DETECTED\n\n"
                "The Write tool was called with empty file_path and content.\n"
                "This usually happens when Claude's output is truncated due to token limits.\n\n"
                "WHAT TO DO:\n"
                "1. The subtask may be too large - consider splitting it\n"
                "2. Retry with a smaller scope\n"
                "3. Use auto_split_subtask() to break down the task\n\n"
                "This is NOT a bug - it's a sign the task needs to be smaller."
            ),
        }

    if not file_path:
        return {
            "decision": "block",
            "reason": (
                "🚨 EMPTY FILE PATH DETECTED\n\n"
                "The Write tool was called with an empty file_path.\n"
                "This may indicate output truncation due to token limits.\n\n"
                "Please specify the file path explicitly."
            ),
        }

    return {}

