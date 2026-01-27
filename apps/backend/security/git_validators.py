"""
Git Validators
==============

Validators for git operations:
- Commit with secret scanning
- Config protection (prevent setting test users)
- Dangerous operations (prevent catastrophic data loss)
"""

import re
import shlex
from pathlib import Path

from .validation_models import ValidationResult

# =============================================================================
# DANGEROUS GIT OPERATIONS
# =============================================================================

# Regex patterns for dangerous Git operations that can cause catastrophic data loss
# These patterns detect commands like "rm .git/index" which can mark all files as deleted
DANGEROUS_GIT_PATTERNS = [
    # Match: rm .git/index (but NOT .git/index.lock or .git/index.backup)
    # This is the most dangerous command - it causes all files to be marked as deleted
    r"\brm\s+(?:-[rf]+\s+)?\.git/index(?!\.(lock|backup))\b",

    # Match: rm -rf .git/ or rm -rf .git
    # Deleting the entire .git directory destroys the repository
    r"\brm\s+-[rf]+\s+\.git/?(?:\s|$|;|&&|\|)",

    # Match: git reset after deleting index (dangerous combination)
    # This specific sequence was the cause of the 2025-01-13 incident
    r"\brm\s+.*\.git/index.*(?:&&|\|\||;).*\bgit\s+reset\b",

    # Match: direct deletion of .git directory
    r"\brm\s+(?:-[rf]+\s+)?\.git(?:\s|$|;|&&|\|)",

    # Match: git rm --cached -r . (removes all files from tracking)
    # This can cause all files to be marked as deleted in the next commit
    r"\bgit\s+rm\s+--cached\s+-r\s+\.",
]


def validate_dangerous_git_operations(command_string: str) -> ValidationResult:
    """
    Block dangerous Git operations that can cause catastrophic data loss.

    This validator prevents commands like:
    - rm .git/index (causes all files to be marked as deleted)
    - rm -rf .git/ (destroys the repository)
    - rm .git/index && git reset (the exact command from 2025-01-13 incident)

    SAFE ALTERNATIVES:
    - rm -f .git/index.lock (safe - only removes lock file)
    - git read-tree HEAD (safe - rebuilds index from HEAD)

    Args:
        command_string: The full command string to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    for pattern in DANGEROUS_GIT_PATTERNS:
        if re.search(pattern, command_string, re.IGNORECASE):
            return False, (
                f"🚨 BLOCKErous Git operation detected\n\n"
                f"Command: {command_string}\n\n"
                f"WHY: This command can cause CATASTROPHIC DATA LOSS by corrupting the Git index.\n"
                f"Deleting .git/index causes Git to lose track of all files, marking them as deleted.\n\n"
                f"SAFE ALTERNATIVES:\n"
                f"  ✅ rm -f .git/index.lock    # Safe: Only removes lock file\n"
                f"  ✅ git read-tree HEAD       # Safe: Rebuilds index from HEAD\n"
                f"  ✅ git status               # Safe: Check repository state\n\n"
                f"If you're trying to fix a corrupted index:\n"
                f"  1. rm -f .git/index.lock   # Remove lock if it exists\n"
                f"  2. git read-tree HEAD      # Safely rebuild index\n"
                f"  3. git status              # Verify recovery\n\n"
                f"NEVER use 'rm .git/index' - it will cause massive data loss!"
            )

    return True, ""


# =============================================================================
# BLOCKED GIT CONFIG PATTERNS
# =============================================================================

# Git config keys that agents must NOT modify
# These are identity settings that should inherit from the user's global config
#
# NOTE: This validation covers command-line arguments (git config, git -c).
# Environment variables (GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL, GIT_COMMITTER_NAME,
# GIT_COMMITTER_EMAIL) are NOT validated here as they require pre-execution
# environment filtering, which is handled at the sandbox/hook level.
BLOCKED_GIT_CONFIG_KEYS = {
    "user.name",
    "user.email",
    "author.name",
    "author.email",
    "committer.name",
    "committer.email",
}


def validate_git_config(command_string: str) -> ValidationResult:
    """
    Validate git config commands - block identity changes.

    Agents should not set user.name, user.email, etc. as this:
    1. Breaks commit attribution
    2. Can create fake "Test User" identities
    3. Overrides the user's legitimate git identity

    Args:
        command_string: The full git command string

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        tokens = shlex.split(command_string)
    except ValueError:
        return False, "Could not parse git command"  # Fail closed on parse errors

    if len(tokens) < 2 or tokens[0] != "git" or tokens[1] != "config":
        return True, ""  # Not a git config command

    # Check for read-only operations first - these are always allowed
    # --get, --get-all, --get-regexp, --list are all read operations
    read_only_flags = {"--get", "--get-all", "--get-regexp", "--list", "-l"}
    for token in tokens[2:]:
        if token in read_only_flags:
            return True, ""  # Read operation, allow it

    # Extract the config key from the command
    # git config [options] <key> [value] - key is typically after config and any options
    config_key = None
    for token in tokens[2:]:
        # Skip options (start with -)
        if token.startswith("-"):
            continue
        # First non-option token is the config key
        config_key = token.lower()
        break

    if not config_key:
        return True, ""  # No config key specified (e.g., git config --list)

    # Check if the exact config key is blocked
    for blocked_key in BLOCKED_GIT_CONFIG_KEYS:
        if config_key == blocked_key:
            return False, (
                f"BLOCKED: Cannot modify git identity configuration\n\n"
                f"You attempted to set '{blocked_key}' which is not allowed.\n\n"
                f"WHY: Git identity (user.name, user.email) must inherit from the user's "
                f"global git configuration. Setting fake identities like 'Test User' breaks "
                f"commit attribution and causes serious issues.\n\n"
                f"WHAT TO DO: Simply commit without setting any user configuration. "
                f"The repository will use the correct identity automatically."
            )

    return True, ""


def validate_git_inline_config(tokens: list[str]) -> ValidationResult:
    """
    Check for blocked config keys passed via git -c flag.

    Git allows inline config with: git -c key=value <command>
    This bypasses 'git config' validation, so we must check all git commands
    for -c flags containing blocked identity keys.

    Args:
        tokens: Parsed command tokens

    Returns:
        Tuple of (is_valid, error_message)
    """
    i = 1  # Start after 'git'
    while i < len(tokens):
        token = tokens[i]

        # Check for -c flag (can be "-c key=value" or "-c" "key=value")
        if token == "-c":
            # Next token should be the key=value
            if i + 1 < len(tokens):
                config_pair = tokens[i + 1]
                # Extract the key from key=value
                if "=" in config_pair:
                    config_key = config_pair.split("=", 1)[0].lower()
                    if config_key in BLOCKED_GIT_CONFIG_KEYS:
                        return False, (
                            f"BLOCKED: Cannot set git identity via -c flag\n\n"
                            f"You attempted to use '-c {config_pair}' which sets a blocked "
                            f"identity configuration.\n\n"
                            f"WHY: Git identity (user.name, user.email) must inherit from the "
                            f"user's global git configuration. Setting fake identities breaks "
                            f"commit attribution and causes serious issues.\n\n"
                            f"WHAT TO DO: Remove the -c flag and commit normally. "
                            f"The repository will use the correct identity automatically."
                        )
                i += 2  # Skip -c and its value
                continue
        elif token.startswith("-c"):
            # Handle -ckey=value format (no space)
            config_pair = token[2:]  # Remove "-c" prefix
            if "=" in config_pair:
                config_key = config_pair.split("=", 1)[0].lower()
                if config_key in BLOCKED_GIT_CONFIG_KEYS:
                    return False, (
                        f"BLOCKED: Cannot set git identity via -c flag\n\n"
                        f"You attempted to use '{token}' which sets a blocked "
                        f"identity configuration.\n\n"
                        f"WHY: Git identity (user.name, user.email) must inherit from the "
                        f"user's global git configuration. Setting fake identities breaks "
                        f"commit attribution and causes serious issues.\n\n"
                        f"WHAT TO DO: Remove the -c flag and commit normally. "
                        f"The repository will use the correct identity automatically."
                    )

        i += 1

    return True, ""


def validate_git_command(command_string: str) -> ValidationResult:
    """
    Main git validator that checks all git security rules.

    Currently validates:
    - Dangerous operations: Block catastrophic commands like rm .git/index
    - git -c: Block identity changes via inline config on ANY git command
    - git config: Block identity changes
    - git commit: Run secret scanning

    Args:
        command_string: The full git command string

    Returns:
        Tuple of (is_valid, error_message)
    """
    # CRITICAL: Check for dangerous Git operations FIRST (highest priority)
    # This prevents catastrophic data loss from commands like "rm .git/index"
    is_valid, error_msg = validate_dangerous_git_operations(command_string)
    if not is_valid:
        return is_valid, error_msg

    try:
        tokens = shlex.split(command_string)
    except ValueError:
        return False, "Could not parse git command"

    if not tokens or tokens[0] != "git":
        return True, ""

    if len(tokens) < 2:
        return True, ""  # Just "git" with no subcommand

    # Check for blocked -c flags on ANY git command (security bypass prevention)
    is_valid, error_msg = validate_git_inline_config(tokens)
    if not is_valid:
        return is_valid, error_msg

    # Find the actual subcommand (skip global options like -c, -C, --git-dir, etc.)
    subcommand = None
    for token in tokens[1:]:
        # Skip options and their values
        if token.startswith("-"):
            continue
        subcommand = token
        break

    if not subcommand:
        return True, ""  # No subcommand found

    # Check git config commands
    if subcommand == "config":
        return validate_git_config(command_string)

    # Check git commit commands (secret scanning)
    if subcommand == "commit":
        return validate_git_commit_secrets(command_string)

    return True, ""


def validate_git_commit_secrets(command_string: str) -> ValidationResult:
    """
    Validate git commit commands - run secret scan before allowing commit.

    This provides autonomous feedback to the AI agent if secrets are detected,
    with actionable instructions on how to fix the issue.

    Args:
        command_string: The full git command string

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        tokens = shlex.split(command_string)
    except ValueError:
        return False, "Could not parse git command"

    if not tokens or tokens[0] != "git":
        return True, ""

    # Only intercept 'git commit' commands (not git add, git push, etc.)
    if len(tokens) < 2 or tokens[1] != "commit":
        return True, ""

    # Import the secret scanner
    try:
        from scan_secrets import get_staged_files, mask_secret, scan_files
    except ImportError:
        # Scanner not available, allow commit (don't break the build)
        return True, ""

    # Get staged files and scan them
    staged_files = get_staged_files()
    if not staged_files:
        return True, ""  # No staged files, allow commit

    matches = scan_files(staged_files, Path.cwd())

    if not matches:
        return True, ""  # No secrets found, allow commit

    # Secrets found! Build detailed feedback for the AI agent
    # Group by file for clearer output
    files_with_secrets: dict[str, list] = {}
    for match in matches:
        if match.file_path not in files_with_secrets:
            files_with_secrets[match.file_path] = []
        files_with_secrets[match.file_path].append(match)

    # Build actionable error message
    error_lines = [
        "SECRETS DETECTED - COMMIT BLOCKED",
        "",
        "The following potential secrets were found in staged files:",
        "",
    ]

    for file_path, file_matches in files_with_secrets.items():
        error_lines.append(f"File: {file_path}")
        for match in file_matches:
            masked = mask_secret(match.matched_text, 12)
            error_lines.append(f"  Line {match.line_number}: {match.pattern_name}")
            error_lines.append(f"    Found: {masked}")
        error_lines.append("")

    error_lines.extend(
        [
            "ACTION REQUIRED:",
            "",
            "1. Move secrets to environment variables:",
            "   - Add the secret value to .env (create if needed)",
            "   - Update the code to use os.environ.get('VAR_NAME') or process.env.VAR_NAME",
            "   - Add the variable name (not value) to .env.example",
            "",
            "2. Example fix:",
            "   BEFORE: api_key = 'sk-abc123...'",
            "   AFTER:  api_key = os.environ.get('API_KEY')",
            "",
            "3. If this is a FALSE POSITIVE (test data, example, mock):",
            "   - Add the file pattern to .secretsignore",
            "   - Example: echo 'tests/fixtures/' >> .secretsignore",
            "",
            "After fixing, stage the changes with 'git add .' and retry the commit.",
        ]
    )

    return False, "\n".join(error_lines)


# Backwards compatibility alias - the registry uses this name
# Now delegates to the comprehensive validator
validate_git_commit = validate_git_command
