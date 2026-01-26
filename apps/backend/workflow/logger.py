"""
Enhanced Workflow Logger
========================

Provides structured logging with performance metrics and context tracking.

Features:
- Structured log messages
- Performance timing
- Context propagation
- Log levels with filtering
- JSON output support
"""

import logging
import time
import json
from typing import Any, Dict, Optional
from contextlib import contextmanager
from pathlib import Path

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)


class WorkflowLogger:
    """
    Enhanced logger for workflow execution.

    Provides structured logging with context and performance tracking.
    """

    def __init__(
        self,
        name: str,
        execution_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
    ):
        """
        Initialize workflow logger.

        Args:
            name: Logger name (usually module name)
            execution_id: Current execution ID
            workflow_id: Current workflow ID
        """
        self.logger = logging.getLogger(name)
        self.execution_id = execution_id
        self.workflow_id = workflow_id
        self.context: Dict[str, Any] = {}

    def set_execution_context(
        self,
        execution_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
    ):
        """Set execution context."""
        if execution_id:
            self.execution_id = execution_id
        if workflow_id:
            self.workflow_id = workflow_id

    def add_context(self, **kwargs):
        """Add context fields to all log messages."""
        self.context.update(kwargs)

    def clear_context(self):
        """Clear context fields."""
        self.context.clear()

    def _format_message(
        self,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Format log message with context."""
        parts = []

        # Add execution context
        if self.execution_id:
            parts.append(f"[exec:{self.execution_id[:8]}]")
        if self.workflow_id:
            parts.append(f"[wf:{self.workflow_id[:8]}]")

        # Add custom context
        for key, value in self.context.items():
            parts.append(f"[{key}:{value}]")

        # Add extra fields
        if extra:
            for key, value in extra.items():
                parts.append(f"[{key}:{value}]")

        # Combine with message
        if parts:
            return f"{' '.join(parts)} {message}"
        return message

    def debug(self, message: str, **extra):
        """Log debug message."""
        self.logger.debug(self._format_message(message, extra))

    def info(self, message: str, **extra):
        """Log info message."""
        self.logger.info(self._format_message(message, extra))

    def warning(self, message: str, **extra):
        """Log warning message."""
        self.logger.warning(self._format_message(message, extra))

    def error(self, message: str, error: Optional[Exception] = None, **extra):
        """Log error message."""
        if error:
            extra["error_type"] = type(error).__name__
            extra["error_msg"] = str(error)
        self.logger.error(self._format_message(message, extra))

    def critical(self, message: str, **extra):
        """Log critical message."""
        self.logger.critical(self._format_message(message, extra))

    @contextmanager
    def operation(self, operation_name: str, **context):
        """
        Context manager for timing operations.

        Usage:
            with logger.operation("node_execution", node_id="abc123"):
                # ... do work ...
                pass
        """
        start_time = time.time()
        self.info(f"Starting {operation_name}", **context)

        try:
            yield
            duration = time.time() - start_time
            self.info(
                f"Completed {operation_name}",
                duration_ms=int(duration * 1000),
                **context,
            )
    except Exception as error:
            duration = time.time() - start_time
            self.error(
                f"Failed {operation_name}",
                error=error,
                duration_ms=int(duration * 1000),
                **context,
            )
            raise

    def log_performance(
        self,
        operation: str,
        duration_ms: int,
        **metrics,
    ):
        """
        Log performance metrics.

        Args:
            operation: Operation name
            duration_ms: Duration in milliseconds
            **metrics: Additional metrics
        """
        self.info(
            f"Performance: {operation}",
            duration_ms=duration_ms,
            **metrics,
        )

    def log_node_execution(
        self,
        node_id: str,
        node_type: str,
        status: str,
        duration_ms: Optional[int] = None,
        error: Optional[Exception] = None,
    ):
        """
        Log node execution event.

        Args:
            node_id: Node ID
            node_type: Node type
            status: Execution status (started, completed, failed)
            duration_ms: Duration in milliseconds
            error: Error if failed
        """
        extra = {
            "node_id": node_id,
            "node_type": node_type,
            "status": status,
        }

        if duration_ms is not None:
            extra["duration_ms"] = duration_ms

        if status == "started":
            self.info(f"Node execution started", **extra)
        elif status == "completed":
            self.info(f"Node execution completed", **extra)
        elif status == "failed":
            self.error(f"Node execution failed", error=error, **extra)

    def log_workflow_event(
        self,
        event_type: str,
        **details,
    ):
        """
        Log workflow-level event.

        Args:
            event_type: Event type (started, paused, resumed, completed, failed, cancelled)
            **details: Event details
        """
        self.info(f"Workflow {event_type}", event_type=event_type, **details)

    def to_json(self, message: str, level: str = "info", **extra) -> str:
        """
        Format log message as JSON.

        Args:
            message: Log message
            level: Log level
            **extra: Extra fields

        Returns:
            JSON string
        """
        log_entry = {
            "timestamp": time.time(),
            "level": level,
            "message": message,
            "execution_id": self.execution_id,
            "workflow_id": self.workflow_id,
            **self.context,
            **extra,
        }
        return json.dumps(log_entry)


class PerformanceTracker:
    """
    Tracks performance metrics for workflow execution.
    """

    def __init__(self):
        self.metrics: Dict[str, list] = {}
        self.start_times: Dict[str, float] = {}

    def start(self, operation: str):
        """Start timing an operation."""
        self.start_times[operation] = time.time()

    def end(self, operation: str) -> float:
        """
        End timing an operation.

        Returns:
            Duration in milliseconds
        """
        if operation not in self.start_times:
            return 0.0

        duration = (time.time() - self.start_times[operation]) * 1000
        del self.start_times[operation]

        # Record metric
        if operation not in self.metrics:
            self.metrics[operation] = []
        self.metrics[operation].append(duration)

        return duration

    def get_stats(self, operation: str) -> Dict[str, float]:
        """
        Get statistics for an operation.

        Returns:
            Dictionary with min, max, avg, total, count
        """
        if operation not in self.metrics or not self.metrics[operation]:
            return {
                "min": 0.0,
                "max": 0.0,
                "avg": 0.0,
                "total": 0.0,
                "count": 0,
            }

        values = self.metrics[operation]
        return {
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "total": sum(values),
            "count": len(values),
        }

    def get_all_stats(self) -> Dict[str, Dict[str, float]]:
        """Get statistics for all operations."""
        return {
            operation: self.get_stats(operation)
            for operation in self.metrics.keys()
        }

    def reset(self):
        """Reset all metrics."""
        self.metrics.clear()
        self.start_times.clear()


def create_logger(
    name: str,
    execution_id: Optional[str] = None,
    workflow_id: Optional[str] = None,
) -> WorkflowLogger:
    """
    Create a workflow logger.

    Args:
        name: Logger name
        execution_id: Execution ID
        workflow_id: Workflow ID

    Returns:
        WorkflowLogger instance
    """
    return WorkflowLogger(
        name=name,
        execution_id=execution_id,
        workflow_id=workflow_id,
    )


def configure_logging(
    level: str = "INFO",
    log_file: Optional[Path] = None,
    json_format: bool = False,
):
    """
    Configure global logging settings.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        json_format: Use JSON format for logs
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    # Configure format
    if json_format:
        formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "name": "%(name)s", '
            '"level": "%(levelname)s", "message": "%(message)s"}'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
        )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers
    root_logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # File handler
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
