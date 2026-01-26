"""
Bash Validators
===============

Unified bash command validation interface.
Integrates all bash-related security checks including dangerous Git operations.
"""

from .git_validators import validate_dangerous_git_operations
from .validation_models import ValidationResult


def validate_bash_command(command_string: str) -> ValidationResult:
    """
    Validate a bash command before execution.

    This is the main entry point for bash command validation.
    It checks for dangerous operations that could cause data loss or security issues.

    Currently validates:
    - Dangerous Git operations (rm .git/index, rm -rf .git/, etc.)

    Args:
        command_string: The full bash command string to validate

    Returns:
        Tuple of (is_valid, error_message)
        - (True, "") if the command is safe to execute
        - (False, error_message) if the command should be blocked
    """
    # Check for dangerous Git operations (highest priority)
    # This prevents catastrophic data loss from commands like "rm .git/index"
    is_valid, error_msg = validate_dangerous_git_operations(command_string)
    if not is_valid:
        return is_valid, error_msg

    # All checks passed
    return True, ""
