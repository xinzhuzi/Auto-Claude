"""
Security Hooks
==============

Pre-tool-use hooks that validate bash commands for security.
Main enforcement point for the security system.

Also includes hooks to fix tool parameter issues (e.g., TodoWrite activeForm).
"""

import os
import time
from collections import OrderedDict
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

from project_analyzer import BASE_COMMANDS, SecurityProfile, is_command_allowed

from .bash_validators import validate_bash_command
from .parser import extract_commands, get_command_for_validation, split_command_segments
from .profile import get_security_profile
from .validator import VALIDATORS

DEFAULT_LARGE_FILE_LINE_THRESHOLD = 500
DEFAULT_READ_CHUNK_SUGGESTED_LIMIT = 300
DEFAULT_READ_FILES_BEFORE_COMPRESSION = 20
DEFAULT_WRITE_LARGE_LINE_THRESHOLD = 800
DEFAULT_EDIT_LARGE_LINE_THRESHOLD = 400
MAX_CONTEXT_STATE_ENTRIES = 200
CONTEXT_STATE_TTL_SECONDS = 60 * 60 * 2

_READ_CONTEXT_STATE: "OrderedDict[str, dict[str, Any]]" = OrderedDict()


def _get_int_env(name: str, default: int, allow_zero: bool = False) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    if allow_zero:
        return value if value >= 0 else default
    return value if value > 0 else default


def _get_list_env(name: str) -> list[str]:
    raw = os.environ.get(name, "")
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def _prune_read_state() -> None:
    if not _READ_CONTEXT_STATE:
        return
    now = time.monotonic()
    expired_keys = [
        key
        for key, state in _READ_CONTEXT_STATE.items()
        if now - state.get("last_seen", now) > CONTEXT_STATE_TTL_SECONDS
    ]
    for key in expired_keys:
        _READ_CONTEXT_STATE.pop(key, None)
    while len(_READ_CONTEXT_STATE) > MAX_CONTEXT_STATE_ENTRIES:
        _READ_CONTEXT_STATE.popitem(last=False)


def _resolve_project_cwd(
    input_data: dict[str, Any],
    context: Any | None,
) -> Path:
    """Resolve the best available project cwd for tool path resolution."""
    from .constants import PROJECT_DIR_ENV_VAR

    cwd = os.environ.get(PROJECT_DIR_ENV_VAR)
    if not cwd:
        cwd = input_data.get("cwd")
    if not cwd and context and hasattr(context, "cwd"):
        cwd = context.cwd
    if not cwd:
        cwd = os.getcwd()
    return Path(cwd)


def _resolve_read_path(file_path: str, base_dir: Path) -> Path | None:
    """Resolve a Read file_path to an absolute path if possible."""
    if not file_path:
        return None
    path = Path(file_path)
    if path.is_absolute():
        return path
    return (base_dir / path).resolve()


def _get_context_key(input_data: dict[str, Any], context: Any | None) -> str:
    session_id = getattr(context, "session_id", None) if context else None
    if session_id:
        return f"session:{session_id}"
    context_id = getattr(context, "run_id", None) if context else None
    if context_id:
        return f"run:{context_id}"
    cwd = _resolve_project_cwd(input_data, context).resolve()
    return f"cwd:{cwd}|pid:{os.getpid()}"


def _get_read_state(context_key: str) -> dict[str, Any]:
    _prune_read_state()
    state = _READ_CONTEXT_STATE.get(context_key)
    if not state:
        state = {"files_read": set(), "last_seen": time.monotonic()}
        _READ_CONTEXT_STATE[context_key] = state
    _READ_CONTEXT_STATE.move_to_end(context_key)
    return state


def _reset_read_state(context_key: str) -> None:
    _READ_CONTEXT_STATE[context_key] = {"files_read": set(), "last_seen": time.monotonic()}
    _READ_CONTEXT_STATE.move_to_end(context_key)


def _touch_read_state(context_key: str) -> None:
    state = _READ_CONTEXT_STATE.get(context_key)
    if not state:
        return
    state["last_seen"] = time.monotonic()
    _READ_CONTEXT_STATE.move_to_end(context_key)


def _normalize_read_path(file_path: str, base_dir: Path) -> str:
    if not file_path:
        return ""
    try:
        path = _resolve_read_path(file_path, base_dir)
        if path:
            return str(path)
    except OSError:
        return file_path
    return file_path


def _is_analysis_note_path(file_path: str, base_dir: Path | None = None) -> bool:
    if not file_path or not isinstance(file_path, str):
        return False
    path_obj = Path(file_path)
    filename = path_obj.name
    if not (filename.startswith("_analysis_") and filename.endswith(".md")):
        return False
    if base_dir is None:
        return True
    try:
        resolved_path = _resolve_read_path(file_path, base_dir)
        if resolved_path:
            parts = [part.lower() for part in resolved_path.parts]
            if ".auto-claude" in parts:
                idx = parts.index(".auto-claude")
                return "specs" in parts[idx + 1 :]
    except OSError:
        return False
    parts = [part.lower() for part in path_obj.parts]
    if ".auto-claude" in parts:
        idx = parts.index(".auto-claude")
        return "specs" in parts[idx + 1 :]
    return False


def _allowlist_match(file_path: str, allowlist: list[str]) -> bool:
    if not allowlist:
        return False
    path_posix = str(file_path).replace("\\", "/")
    parts = [part for part in path_posix.split("/") if part]
    for token in allowlist:
        if "*" in token or "?" in token or "[" in token:
            if fnmatch(path_posix, token):
                return True
        else:
            if token in parts:
                return True
            if path_posix.endswith(token):
                return True
    return False


def _exceeds_line_threshold(path: Path, threshold: int) -> bool:
    """Return True if file exceeds the given line threshold."""
    try:
        with open(path, encoding="utf-8", errors="ignore") as handle:
            for line_count, _ in enumerate(handle, start=1):
                if line_count > threshold:
                    return True
    except OSError:
        return False
    return False


def _count_lines(text: str) -> int:
    """Return an approximate line count for a text block."""
    if not text:
        return 0
    return text.count("\n") + 1


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
        Empty dict to allow, or hookSpecificOutput with permissionDecision "deny" to block
    """
    if input_data.get("tool_name") != "Bash":
        return {}

    # Validate tool_input structure before accessing
    tool_input = input_data.get("tool_input")

    # Check if tool_input is None (malformed tool call)
    if tool_input is None:
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": "Bash tool_input is None - malformed tool call from SDK",
            }
        }

    # Check if tool_input is a dict
    if not isinstance(tool_input, dict):
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"Bash tool_input must be dict, got {type(tool_input).__name__}",
            }
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
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"Could not parse command for security validation: {command}",
            }
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
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }
            }

        # Additional validation for sensitive commands
        if cmd in VALIDATORS:
            cmd_segment = get_command_for_validation(cmd, segments)
            if not cmd_segment:
                cmd_segment = command

            validator = VALIDATORS[cmd]
            allowed, reason = validator(cmd_segment)
            if not allowed:
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": reason,
                    }
                }

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


async def read_large_file_guard_hook(
    input_data: dict[str, Any],
    tool_use_id: str | None = None,
    context: Any | None = None,
) -> dict[str, Any]:
    """
    Pre-tool-use hook that enforces chunked Read usage for large files.

    If a file exceeds LARGE_FILE_LINE_THRESHOLD and the Read tool call does not
    include offset/limit, block the call with a guidance message.
    """
    if input_data.get("tool_name") != "Read":
        return {}

    tool_input = input_data.get("tool_input")
    if not tool_input or not isinstance(tool_input, dict):
        return {}

    file_path = tool_input.get("file_path", "")
    if not file_path:
        return {}
    if not isinstance(file_path, str):
        return {}

    large_file_threshold = _get_int_env(
        "AUTO_CLAUDE_READ_LARGE_FILE_THRESHOLD",
        DEFAULT_LARGE_FILE_LINE_THRESHOLD,
        allow_zero=True,
    )
    read_chunk_limit = _get_int_env(
        "AUTO_CLAUDE_READ_CHUNK_LIMIT", DEFAULT_READ_CHUNK_SUGGESTED_LIMIT
    )
    max_files_before_compress = _get_int_env(
        "AUTO_CLAUDE_READ_FILES_BEFORE_COMPRESSION",
        DEFAULT_READ_FILES_BEFORE_COMPRESSION,
        allow_zero=True,
    )

    base_dir = _resolve_project_cwd(input_data, context)
    normalized_path = _normalize_read_path(file_path, base_dir)
    context_key = _get_context_key(input_data, context)
    state = _get_read_state(context_key)
    files_read = state["files_read"]
    _touch_read_state(context_key)

    if max_files_before_compress > 0 and normalized_path and normalized_path not in files_read:
        if len(files_read) >= max_files_before_compress:
            return {
                "decision": "block",
                "reason": (
                    f"Read limit reached ({max_files_before_compress} files). "
                    "Please compress context before continuing.\n\n"
                    "Suggested action:\n"
                    "- Write a brief summary to `.auto-claude/specs/<task>/_analysis_01.md`\n"
                    "- Include key file paths, decisions, and next steps\n"
                    "- Then continue reading additional files"
                ),
            }

    # Allow if offset/limit already provided
    if tool_input.get("offset") is not None or tool_input.get("limit") is not None:
        if normalized_path:
            resolved_path = _resolve_read_path(file_path, base_dir)
            if resolved_path and resolved_path.exists() and resolved_path.is_file():
                files_read.add(normalized_path)
        return {}

    resolved_path = _resolve_read_path(file_path, base_dir)
    if not resolved_path or not resolved_path.exists() or not resolved_path.is_file():
        return {}

    if large_file_threshold > 0 and _exceeds_line_threshold(resolved_path, large_file_threshold):
        return {
            "decision": "block",
            "reason": (
                f"Large file detected. Read calls for files over {large_file_threshold} lines must use "
                "offset/limit for chunked reading.\n\n"
                "Example:\n"
                f'  Read {{ "file_path": "{file_path}", "offset": 0, "limit": {read_chunk_limit} }}\n'
                f"Then increment offset by {read_chunk_limit} for the next chunk."
            ),
        }

    if normalized_path:
        files_read.add(normalized_path)

    return {}


async def write_large_content_guard_hook(
    input_data: dict[str, Any],
    tool_use_id: str | None = None,
    context: Any | None = None,
) -> dict[str, Any]:
    """
    Pre-tool-use hook that enforces incremental Write usage for large content.

    If a Write call attempts to write very large content at once, block and
    guide the agent to use incremental edits instead.
    """
    if input_data.get("tool_name") != "Write":
        return {}

    tool_input = input_data.get("tool_input")
    if not tool_input or not isinstance(tool_input, dict):
        return {}

    file_path = tool_input.get("file_path", "")
    base_dir = _resolve_project_cwd(input_data, context)
    if _is_analysis_note_path(file_path, base_dir):
        return {}

    content = tool_input.get("content", "")
    if not isinstance(content, str) or not content:
        return {}

    allowlist = _get_list_env("AUTO_CLAUDE_LARGE_WRITE_ALLOWLIST")
    if _allowlist_match(str(file_path), allowlist):
        return {}

    write_threshold = _get_int_env(
        "AUTO_CLAUDE_WRITE_LARGE_LINE_THRESHOLD",
        DEFAULT_WRITE_LARGE_LINE_THRESHOLD,
        allow_zero=True,
    )
    line_count = _count_lines(content)
    if write_threshold <= 0 or line_count <= write_threshold:
        return {}

    return {
        "decision": "block",
        "reason": (
            f"Large Write detected ({line_count} lines). Please write incrementally to avoid "
            "context spikes.\n\n"
            "Recommended approach:\n"
            "1. Write a small skeleton first\n"
            "2. Use smaller Edit operations to add sections in batches\n\n"
            f"Target: {file_path}"
        ),
    }


async def edit_large_content_guard_hook(
    input_data: dict[str, Any],
    tool_use_id: str | None = None,
    context: Any | None = None,
) -> dict[str, Any]:
    """
    Pre-tool-use hook that enforces incremental Edit usage for large inserts.

    If an Edit call tries to insert a large block, block and ask for smaller
    incremental edits.
    """
    if input_data.get("tool_name") != "Edit":
        return {}

    tool_input = input_data.get("tool_input")
    if not tool_input or not isinstance(tool_input, dict):
        return {}

    file_path = tool_input.get("file_path", "")
    base_dir = _resolve_project_cwd(input_data, context)
    if _is_analysis_note_path(file_path, base_dir):
        return {}

    new_string = tool_input.get("new_string", "")
    if not isinstance(new_string, str) or not new_string:
        return {}

    allowlist = _get_list_env("AUTO_CLAUDE_LARGE_EDIT_ALLOWLIST")
    if _allowlist_match(str(file_path), allowlist):
        return {}

    edit_threshold = _get_int_env(
        "AUTO_CLAUDE_EDIT_LARGE_LINE_THRESHOLD",
        DEFAULT_EDIT_LARGE_LINE_THRESHOLD,
        allow_zero=True,
    )
    line_count = _count_lines(new_string)
    if edit_threshold <= 0 or line_count <= edit_threshold:
        return {}

    return {
        "decision": "block",
        "reason": (
            f"Large Edit detected ({line_count} lines). Please split edits into smaller batches "
            "to reduce context pressure.\n\n"
            f"Target: {file_path}"
        ),
    }


async def context_compression_reset_hook(
    input_data: dict[str, Any],
    tool_use_id: str | None = None,
    context: Any | None = None,
) -> dict[str, Any]:
    """
    Reset the read counter when analysis notes are written.

    This treats `_analysis_XX.md` writes as a context compression checkpoint.
    """
    if input_data.get("tool_name") != "Write":
        return {}

    tool_input = input_data.get("tool_input")
    if not tool_input or not isinstance(tool_input, dict):
        return {}

    file_path = tool_input.get("file_path", "")
    base_dir = _resolve_project_cwd(input_data, context)
    if not _is_analysis_note_path(file_path, base_dir):
        return {}

    context_key = _get_context_key(input_data, context)
    _reset_read_state(context_key)
    return {}
