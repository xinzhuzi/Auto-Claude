"""
Workflow Error Types
====================

Defines structured error types for workflow execution.

Error Hierarchy:
- WorkflowError (base)
  - ValidationError (workflow structure issues)
  - ExecutionError (runtime execution issues)
    - NodeExecutionError (node-specific failures)
    - TimeoutError (execution timeout)
    - CancellationError (user cancellation)
  - ConfigurationError (setup/config issues)
  - ResourceError (resource availability issues)
"""

from typing import Any, Dict, Optional


class WorkflowError(Exception):
    """
    Base exception for all workflow-related errors.

    Attributes:
        message: Human-readable error message
        error_code: Machine-readable error code
        details: Additional error context
        recoverable: Whether error can be recovered from
    """

    def __init__(
        self,
        message: str,
        error_code: str = "WORKFLOW_ERROR",
        details: Optional[Dict[str, Any]] = None,
        recoverable: bool = False,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.recoverable = recoverable

    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for serialization."""
        return {
            "type": self.__class__.__name__,
            "message": self.message,
            "error_code": self.error_code,
            "details": self.details,
            "recoverable": self.recoverable,
        }


class ValidationError(WorkflowError):
    """
    Workflow validation errors (structure, schema, etc.).

    Raised when workflow definition is invalid.
    """

    def __init__(
        self,
        message: str,
        validation_errors: Optional[list] = None,
        **kwargs,
    ):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details={"validation_errors": validation_errors or []},
            recoverable=False,  # Validation errors require workflow changes
            **kwargs,
        )


class ExecutionError(WorkflowError):
    """
    Base class for runtime execution errors.

    Raised during workflow execution.
    """

    def __init__(
        self,
        message: str,
        error_code: str = "EXECUTION_ERROR",
        node_id: Optional[str] = None,
        **kwargs,
    ):
        details = kwargs.pop("details", {})
        if node_id:
            details["node_id"] = node_id

        super().__init__(
            message=message,
            error_code=error_code,
            details=details,
            **kwargs,
        )


class NodeExecutionError(ExecutionError):
    """
    Node-specific execution errors.

    Raised when a specific node fails to execute.
    """

    def __init__(
        self,
        message: str,
        node_id: str,
        node_type: str,
        original_error: Optional[Exception] = None,
        recoverable: bool = True,  # Node errors may be retryable
        **kwargs,
    ):
        details = kwargs.pop("details", {})
        details.update({
            "node_type": node_type,
            "original_error": str(original_error) if original_error else None,
            "original_error_type": type(original_error).__name__ if original_error else None,
        })

        super().__init__(
            message=message,
            error_code="NODE_EXECUTION_ERROR",
            node_id=node_id,
            details=details,
            recoverable=recoverable,
            **kwargs,
        )
        self.original_error = original_error


class TimeoutError(ExecutionError):
    """
    Execution timeout errors.

    Raised when execution exceeds time limit.
    """

    def __init__(
        self,
        message: str,
        timeout_seconds: float,
        node_id: Optional[str] = None,
        **kwargs,
    ):
        details = kwargs.pop("details", {})
        details["timeout_seconds"] = timeout_seconds

        super().__init__(
            message=message,
            error_code="TIMEOUT_ERROR",
            node_id=node_id,
            details=details,
            recoverable=True,  # Timeouts may be retryable with longer timeout
            **kwargs,
        )


class CancellationError(ExecutionError):
    """
    User cancellation errors.

    Raised when user cancels execution.
    """

    def __init__(
        self,
        message: str = "Workflow execution cancelled by user",
        node_id: Optional[str] = None,
        **kwargs,
    ):
        super().__init__(
            message=message,
            error_code="CANCELLATION_ERROR",
            node_id=node_id,
            recoverable=False,  # Cancellation is intentional
            **kwargs,
        )


class ConfigurationError(WorkflowError):
    """
    Configuration and setup errors.

    Raised when workflow configuration is invalid or missing.
    """

    def __init__(
        self,
        message: str,
        config_key: Optional[str] = None,
        **kwargs,
    ):
        details = kwargs.pop("details", {})
        if config_key:
            details["config_key"] = config_key

        super().__init__(
            message=message,
            error_code="CONFIGURATION_ERROR",
            details=details,
            recoverable=False,  # Config errors require setup changes
            **kwargs,
        )


class ResourceError(WorkflowError):
    """
    Resource availability errors.

    Raised when required resources are unavailable.
    """

    def __init__(
        self,
        message: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        **kwargs,
    ):
        details = kwargs.pop("details", {})
        details.update({
            "resource_type": resource_type,
            "resource_id": resource_id,
        })

        super().__init__(
            message=message,
            error_code="RESOURCE_ERROR",
            details=details,
            recoverable=True,  # Resource errors may be transient
            **kwargs,
        )


class MCPError(NodeExecutionError):
    """
    MCP tool invocation errors.

    Raised when MCP tool call fails.
    """

    def __init__(
        self,
        message: str,
        node_id: str,
        server_name: str,
        tool_name: str,
        original_error: Optional[Exception] = None,
        **kwargs,
    ):
        details = kwargs.pop("details", {})
        details.update({
            "server_name": server_name,
            "tool_name": tool_name,
        })

        super().__init__(
            message=message,
            node_id=node_id,
            node_type="mcp",
            original_error=original_error,
            details=details,
            **kwargs,
        )


class SubAgentError(NodeExecutionError):
    """
    SubAgent execution errors.

    Raised when subagent fails.
    """

    def __init__(
        self,
        message: str,
        node_id: str,
        agent_name: str,
        original_error: Optional[Exception] = None,
        **kwargs,
    ):
        details = kwargs.pop("details", {})
        details["agent_name"] = agent_name

        super().__init__(
            message=message,
            node_id=node_id,
            node_type="subAgent",
            original_error=original_error,
            details=details,
            **kwargs,
        )


class SkillError(NodeExecutionError):
    """
    Skill execution errors.

    Raised when skill invocation fails.
    """

    def __init__(
        self,
        message: str,
        node_id: str,
        skill_name: str,
        original_error: Optional[Exception] = None,
        **kwargs,
    ):
        details = kwargs.pop("details", {})
        details["skill_name"] = skill_name

        super().__init__(
            message=message,
            node_id=node_id,
            node_type="skill",
            original_error=original_error,
            details=details,
            **kwargs,
        )


class UserInputError(NodeExecutionError):
    """
    User input errors.

    Raised when user input fails or times out.
    """

    def __init__(
        self,
        message: str,
        node_id: str,
        original_error: Optional[Exception] = None,
        **kwargs,
    ):
        super().__init__(
            message=message,
            node_id=node_id,
            node_type="askUserQuestion",
            original_error=original_error,
            **kwargs,
        )


def classify_error(error: Exception) -> WorkflowError:
    """
    Classify a generic exception into a WorkflowError.

    Args:
        error: Exception to classify

    Returns:
        Appropriate WorkflowError subclass
    """
    # Already a WorkflowError
    if isinstance(error, WorkflowError):
        return error

    # Timeout errors
    if isinstance(error, asyncio.TimeoutError):
        return TimeoutError(
            message=str(error),
            timeout_seconds=0,  # Unknown timeout
        )

    # Cancellation errors
    if isinstance(error, asyncio.CancelledError):
        return CancellationError()

    # Generic execution error
    return ExecutionError(
        message=str(error),
        details={"original_error_type": type(error).__name__},
    )


def is_transient_error(error: Exception) -> bool:
    """
    Determine if an error is transient (retryable).

    Args:
        error: Exception to check

    Returns:
        True if error is likely transient
    """
    # WorkflowError with recoverable flag
    if isinstance(error, WorkflowError):
        return error.recoverable

    # Known transient error types
    transient_types = (
        TimeoutError,
        ResourceError,
        MCPError,  # MCP tools may have transient failures
    )

    return isinstance(error, transient_types)


# Import asyncio for error classification
import asyncio
