"""
SubAgent Launcher
=================

Launches and manages subagents through the Claude SDK's Task tool system.

This module provides a high-level interface for spawning subagents
from workflow nodes, handling their lifecycle, and collecting results.
"""

import asyncio
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from claude_agent_sdk import ClaudeSDKClient
from debug import debug, debug_error, debug_success

from agents.session import run_agent_session
from core.client import create_client

logger = logging.getLogger(__name__)


async def launch_subagent(
    client: ClaudeSDKClient,
    agent_name: str,
    prompt: str,
    description: str,
    project_dir: Path,
    spec_dir: Path,
    model: str = "claude-sonnet-4-5-20250929",
    timeout: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Launch a single subagent and wait for completion.

    Args:
        client: Claude SDK client instance
        agent_name: Name/identifier for the subagent
        prompt: Task prompt for the subagent
        description: Human-readable description of the task
        project_dir: Project root directory
        spec_dir: Spec directory for settings
        model: Model to use for the subagent
        timeout: Optional timeout in seconds

    Returns:
        Dictionary containing:
        - success: bool - Whether the subagent completed successfully
        - agent_name: str - Name of the subagent
        - result: str - Subagent output (if successful)
        - error: str - Error message (if failed)
        - duration: float - Execution time in seconds
    """
    debug("subagent_launcher", f"Launching subagent: {agent_name}")
    debug("subagent_launcher", f"Description: {description}")
    debug("subagent_launcher", f"Prompt: {prompt[:100]}...")

    start_time = time.time()

    try:
        # Create a dedicated client for the subagent if needed
        # For now, we'll reuse the existing client
        # In a full implementation, we might want to create separate clients
        # for better isolation

        # Execute the subagent task using run_agent_session
        # This is the same mechanism Auto-Claude uses for agent execution
        debug("subagent_launcher", f"Starting agent session for {agent_name}")

        # Run the agent session with timeout
        if timeout:
            status, response, _ = await asyncio.wait_for(
                run_agent_session(
                    client=client,
                    message=prompt,
                    spec_dir=spec_dir,
                    verbose=False,
                ),
                timeout=timeout,
            )
        else:
            status, response, _ = await run_agent_session(
                client=client,
                message=prompt,
                spec_dir=spec_dir,
                verbose=False,
            )

        duration = time.time() - start_time

        if status == "error":
            debug_error(
                "subagent_launcher",
                f"Subagent {agent_name} failed after {duration:.1f}s",
            )
            return {
                "success": False,
                "agent_name": agent_name,
                "error": response or "Agent session failed",
                "duration": duration,
            }

        debug_success(
            "subagent_launcher",
            f"Subagent {agent_name} completed in {duration:.1f}s",
        )
        return {
            "success": True,
            "agent_name": agent_name,
            "result": response,
            "duration": duration,
        }

    except asyncio.TimeoutError:
        duration = time.time() - start_time
        error_msg = f"Subagent {agent_name} timed out after {timeout}s"
        debug_error("subagent_launcher", error_msg)
        return {
            "success": False,
            "agent_name": agent_name,
            "error": error_msg,
            "duration": duration,
        }

    except Exception as e:
        duration = time.time() - start_time
        error_msg = f"Failed to launch subagent {agent_name}: {str(e)}"
        debug_error("subagent_launcher", error_msg)
        logger.exception(error_msg)

        return {
            "success": False,
            "agent_name": agent_name,
            "error": error_msg,
            "duration": duration,
        }


async def launch_subagents_parallel(
    client: ClaudeSDKClient,
    subagents: List[Dict[str, Any]],
    project_dir: Path,
    spec_dir: Path,
    model: str = "claude-sonnet-4-5-20250929",
    max_parallel: int = 3,
    timeout: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Launch multiple subagents in parallel.

    Args:
        client: Claude SDK client instance
        subagents: List of subagent configurations, each containing:
            - agent_name: str
            - prompt: str
            - description: str
        project_dir: Project root directory
        spec_dir: Spec directory for settings
        model: Model to use for subagents
        max_parallel: Maximum number of parallel subagents (default: 3)
        timeout: Optional timeout per subagent in seconds

    Returns:
        List of subagent result dictionaries
    """
    debug(
        "subagent_launcher",
        f"Launching {len(subagents)} subagents (max {max_parallel} parallel)",
    )

    max_parallel = max(1, max_parallel)
    semaphore = asyncio.Semaphore(max_parallel)

    async def _run_subagent(subagent_config: Dict[str, Any]) -> Dict[str, Any]:
        async with semaphore:
            subagent_model = subagent_config.get("model", model)
            subagent_timeout = subagent_config.get("timeout", timeout)
            # Use a dedicated client per subagent to avoid concurrent use
            subagent_client = create_client(
                project_dir=project_dir,
                spec_dir=spec_dir,
                model=subagent_model,
                agent_type="coder",
            )
            async with subagent_client:
                return await launch_subagent(
                    client=subagent_client,
                    agent_name=subagent_config.get("agent_name", "unnamed"),
                    prompt=subagent_config.get("prompt", ""),
                    description=subagent_config.get("description", ""),
                    project_dir=project_dir,
                    spec_dir=spec_dir,
                    model=subagent_model,
                    timeout=subagent_timeout,
                )

    # Create tasks for all subagents
    tasks = [_run_subagent(subagent_config) for subagent_config in subagents]

    # Execute tasks with concurrency limit
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process results and handle exceptions
    processed_results = []
    for i, result in enumerate(results):
        if isinstance(result, asyncio.CancelledError):
            agent_name = subagents[i].get("agent_name", f"subagent-{i}")
            processed_results.append(
                {
                    "success": False,
                    "agent_name": agent_name,
                    "error": "Task cancelled",
                    "duration": 0,
                }
            )
        elif isinstance(result, Exception):
            # Task raised an exception
            agent_name = subagents[i].get("agent_name", f"subagent-{i}")
            processed_results.append(
                {
                    "success": False,
                    "agent_name": agent_name,
                    "error": str(result),
                    "duration": 0,
                }
            )
        else:
            processed_results.append(result)

    # Log summary
    succeeded = sum(1 for r in processed_results if r.get("success"))
    failed = len(processed_results) - succeeded
    debug(
        "subagent_launcher",
        f"Parallel execution complete: {succeeded} succeeded, {failed} failed",
    )

    return processed_results


async def launch_subagents_sequential(
    client: ClaudeSDKClient,
    subagents: List[Dict[str, Any]],
    project_dir: Path,
    spec_dir: Path,
    model: str = "claude-sonnet-4-5-20250929",
    timeout: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Launch multiple subagents sequentially (one after another).

    Useful when subagents have dependencies or when resource constraints
    require serial execution.

    Args:
        client: Claude SDK client instance
        subagents: List of subagent configurations
        project_dir: Project root directory
        spec_dir: Spec directory for settings
        model: Model to use for subagents
        timeout: Optional timeout per subagent in seconds

    Returns:
        List of subagent result dictionaries
    """
    debug("subagent_launcher", f"Launching {len(subagents)} subagents sequentially")

    results = []
    for i, subagent_config in enumerate(subagents):
        debug("subagent_launcher", f"Launching subagent {i + 1}/{len(subagents)}")

        result = await launch_subagent(
            client=client,
            agent_name=subagent_config.get("agent_name", f"subagent-{i}"),
            prompt=subagent_config.get("prompt", ""),
            description=subagent_config.get("description", ""),
            project_dir=project_dir,
            spec_dir=spec_dir,
            model=model,
            timeout=timeout,
        )

        results.append(result)

        # Stop on failure if configured
        if not result.get("success") and subagent_config.get("stop_on_failure", False):
            debug_error(
                "subagent_launcher",
                f"Stopping sequential execution due to failure in {result['agent_name']}",
            )
            break

    return results


def parse_subagent_config(node_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse subagent configuration from workflow node data.

    Args:
        node_data: Node data dictionary from workflow JSON

    Returns:
        Parsed subagent configuration
    """
    return {
        "agent_name": node_data.get("agentName", "unnamed"),
        "prompt": node_data.get("prompt", ""),
        "description": node_data.get("description", ""),
        "model": node_data.get("model", "claude-sonnet-4-5-20250929"),
        "timeout": node_data.get("timeout"),
        "stop_on_failure": node_data.get("stopOnFailure", False),
    }
