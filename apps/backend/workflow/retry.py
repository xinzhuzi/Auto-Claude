"""
Retry Logic
===========

Provides retry mechanisms for transient failures in workflow execution.

Features:
- Exponential backoff
- Configurable retry policies
- Retry condition evaluation
- Retry state tracking
"""

import asyncio
import logging
import time
from typing import Any, Callable, Optional, TypeVar, Union
from dataclasses import dataclass

from .errors import WorkflowError, is_transient_error

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class RetryPolicy:
    """
    Retry policy configuration.

    Attributes:
        max_attempts: Maximum number of retry attempts (including initial attempt)
        initial_delay: Initial delay in seconds before first retry
        max_delay: Maximum delay in seconds between retries
        exponential_base: Base for exponential backoff (2.0 = double each time)
        jitter: Add random jitter to delays (0.0-1.0, 0.1 = 10% jitter)
        retry_on: Function to determine if error should be retried
    """

    max_attempts: int = 3
    initial_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: float = 0.1
    retry_on: Optional[Callable[[Exception], bool]] = None

    def should_retry(self, error: Exception, attempt: int) -> bool:
        """
        Determine if error should be retried.

        Args:
            error: Exception that occurred
            attempt: Current attempt number (1-indexed)

        Returns:
            True if should retry
        """
        # Exceeded max attempts
        if attempt >= self.max_attempts:
            return False

        # Custom retry condition
        if self.retry_on is not None:
            return self.retry_on(error)

        # Default: retry transient errors
        return is_transient_error(error)

    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay before next retry.

        Args:
            attempt: Current attempt number (1-indexed)

        Returns:
            Delay in seconds
        """
        # Exponential backoff: initial_delay * (base ^ (attempt - 1))
        delay = self.initial_delay * (self.exponential_base ** (attempt - 1))

        # Cap at max_delay
        delay = min(delay, self.max_delay)

        # Add jitter to avoid thundering herd
        if self.jitter > 0:
            import random
            jitter_amount = delay * self.jitter
            delay += random.uniform(-jitter_amount, jitter_amount)

        return max(0, delay)


# Default retry policies for different scenarios
DEFAULT_RETRY_POLICY = RetryPolicy(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=30.0,
    exponential_base=2.0,
    jitter=0.1,
)

AGGRESSIVE_RETRY_POLICY = RetryPolicy(
    max_attempts=5,
    initial_delay=0.5,
    max_delay=60.0,
    exponential_base=2.0,
    jitter=0.2,
)

CONSERVATIVE_RETRY_POLICY = RetryPolicy(
    max_attempts=2,
    initial_delay=2.0,
    max_delay=10.0,
    exponential_base=1.5,
    jitter=0.0,
)

NO_RETRY_POLICY = RetryPolicy(
    max_attempts=1,
    initial_delay=0.0,
    max_delay=0.0,
    exponential_base=1.0,
    jitter=0.0,
)


@dataclass
class RetryState:
    """
    Tracks retry state for an operation.

    Attributes:
        attempt: Curt attempt number (1-indexed)
        total_delay: Total time spent in delays
        errors: List of errors encountered
        start_time: When retry sequence started
    """

    attempt: int = 0
    total_delay: float = 0.0
    errors: list = None
    start_time: float = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.start_time is None:
            self.start_time = time.time()

    def record_attempt(self, error: Optional[Exception] = None, delay: float = 0.0):
        """Record an attempt."""
        self.attempt += 1
        if error:
            self.errors.append(error)
        self.total_delay += delay

    def elapsed_time(self) -> float:
        """Get total elapsed time."""
        return time.time() - self.start_time


async def retry_async(
    func: Callable[..., Any],
    *args,
    policy: RetryPolicy = DEFAULT_RETRY_POLICY,
    operation_name: str = "operation",
    **kwargs,
) -> Any:
    """
    Retry an async function with exponential backoff.

    Args:
        func: Async function to retry
        *args: Positional arguments for func
        policy: Retry policy to use
        operation_name: Name for logging
        **kwargs: Keyword arguments for func

    Returns:
        Result from successful function call

    Raises:
        Last exception if all retries exhausted
    """
    state = RetryState()

    while True:
        state.attempt += 1

        try:
            logger.debug(
                f"[Retry] {operation_name}: Attempt {state.attempt}/{policy.max_attempts}"
            )

            # Execute function
            result = await func(*args, **kwargs)

            # Success
            if state.attempt > 1:
                logger.info(
                    f"[Retry] {operation_name}: Succeeded on attempt {state.attempt} "
                    f"after {state.elapsed_time():.2f}s"
                )

            return result

        except Exception as error:
            state.errors.append(error)

            # Check if should retry
            if not policy.should_retry(error, state.attempt):
                logger.error(
                    f"[Retry] {operation_name}: Failed after {state.attempt} attempts. "
                    f"Error: {error}"
                )
                raise

            # Calculate delay
            delay = policy.calculate_delay(state.attempt)
            state.total_delay += delay

            logger.warning(
                f"[Retry] {operation_name}: Attempt {state.attempt} failed. "
                f"Retrying in {delay:.2f}s. Error: {error}"
            )

            # Wait before retry
            await asyncio.sleep(delay)


def retry_sync(
    func: Callable[..., Any],
    *args,
    policy: RetryPolicy = DEFAULT_RETRY_POLICY,
    operation_name: str = "operation",
    **kwargs,
) -> Any:
    """
    Retry a sync function with exponential backoff.

    Args:
        func: Sync function to retry
        *args: Positional arguments for func
        policy: Retry policy to use
        operation_name: Name for logging
        **kwargs: Keyword arguments for func

    Returns:
        Result from successful function call

    Raises:
        Last exception if all retries exhausted
    """
    state = RetryState()

    while True:
        state.attempt += 1

        try:
            logger.debug(
                f"[Retry] {operation_name}: Attempt {state.attempt}/{policy.max_attempts}"
            )

            # Execute function
            result = func(*args, **kwargs)

            # Success
            if state.attempt > 1:
                logger.info(            f"[Retry] {operation_name}: Succeeded on attempt {state.attempt} "
                    f"after {state.elapsed_time():.2f}s"
                )

            return result

        except Exception as error:
            state.errors.append(error)

            # Check if should retry
            if not policy.should_retry(error, state.attempt):
                logger.error(
                    f"[Retry] {operation_name}: Failed after {state.attempt} attempts. "
                    f"Error: {error}"
                )
                raise

            # Calculate delay
            delay = policy.calculate_delay(state.attempt)
            state.total_delay += delay

            logger.warning(
                f"[Retry] {operation_name}: Attempt {state.attempt} failed. "
                f"Retrying in {delay:.2f}s. Error: {error}"
            )

            # Wait before retry
            time.sleep(delay)


class RetryContext:
    """
    Context manager for retry operations.

    Usage:
        async with RetryContext("my_operation") as retry:
            result = await retry(my_async_func, arg1, arg2)
    """

    def __init__(
        self,
        operation_name: str,
        policy: RetryPolicy = DEFAULT_RETRY_POLICY,
    ):
        self.operation_name = operation_name
        self.policy = policy

    async def __aenter__(self):
        """Enter async context."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit async context."""
        return False  # Don't suppress exceptions

    async def __call__(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with retry."""
        return await retry_async(
            func,
            *args,
            policy=self.policy,
            operation_name=self.operation_name,
            **kwargs,
        )


def create_retry_policy(
    node_type: str,
    max_attempts: Optional[int] = None,
) -> RetryPolicy:
    """
    Create a retry policy for a specific node type.

    Args:
        node_type: Type of workflow node
        max_attempts: Override max attempts

    Returns:
        Appropriate retry policy
    """
    # Node-specific policies
    policies = {
        "mcp": AGGRESSIVE_RETRY_POLICY,  # MCP tools may have transient failures
        "subAgent": DEFAULT_RETRY_POLICY,  # SubAgents can be retried
        "skill": DEFAULT_RETRY_POLICY,  # Skills can be retried
        "prompt": CONSERVATIVE_RETRY_POLICY,  # Prompts less likely to benefit from retry
        "askUserQuestion": NO_RETRY_POLICY,  # User input shouldn't be retried
        "ifElse": NO_RETRY_POLICY,  # Control flow shouldn't be retried
        "switch": NO_RETRY_POLICY,  # Control flow shouldn't be retried
        "branch": NO_RETRY_POLICY,  # Control flow shouldn't be retried
    }

    policy = policies.get(node_type, DEFAULT_RETRY_POLICY)

    # Override max attempts if specified
    if max_attempts is not None:
        policy = RetryPolicy(
            max_attempts=max_attempts,
            initial_delay=policy.initial_delay,
            max_delay=policy.max_delay,
            exponential_base=policy.exponential_base,
            jitter=policy.jitter,
            retry_on=policy.retry_on,
        )

    return policy
