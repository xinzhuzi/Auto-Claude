"""
SubAgent Results Aggregator
============================

Aggregates and formats results from multiple subagents.

This module provides utilities for collecting, formatting, and
analyzing results from parallel subagent execution.
"""

import logging
from typing import Any, Dict, List

from debug import debug, debug_error, debug_success

logger = logging.getLogger(__name__)


def aggregate_subagent_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Aggregate results from multiple subagents.

    Args:
        results: List of subagent result dictionaries

    Returns:
        Aggregated result dictionary containing:
        - success: bool - True if all subagents succeeded
        - total: int - Total number of subagents
        - succeeded: int - Number of successful subagents
        - failed: int - Number of failed subagents
        - results: list - Individual subagent results
        - summary: str - Human-readable summary
        - combined_output: str - Combined output from all subagents
    """
    debug("subagent_results", f"Aggregating {len(results)} subagent results")

    total = len(results)
    succeeded = sum(1 for r in results if r.get("success"))
    failed = total - succeeded

    # Combine outputs from successful subagents
    combined_output = []
    for result in results:
        agent_name = result.get("agent_name", "unknown")
        if result.get("success"):
            output = result.get("result", "")
            combined_output.append(f"=== {agent_name} ===\n{output}\n")
        else:
            error = result.get("error", "Unknown error")
            combined_output.append(f"=== {agent_name} (FAILED) ===\n{error}\n")

    combined_output_str = "\n".join(combined_output)

    # Create summary
    if failed == 0:
        summary = f"All {total} subagents completed successfully"
        overall_success = True
        debug_success("subagent_results", summary)
    elif succeeded == 0:
        summary = f"All {total} subagents failed"
        overall_success = False
        debug_error("subagent_results", summary)
    else:
        summary = f"{succeeded}/{total} subagents succeeded, {failed} failed"
        overall_success = False
        debug("subagent_results", summary)

    return {
        "success": overall_success,
        "total": total,
        "succeeded": succeeded,
        "failed": failed,
        "results": results,
        "summary": summary,
        "combined_output": combined_output_str,
    }


def format_subagent_result(result: Dict[str, Any]) -> str:
    """
    Format a single subagent result for display.

    Args:
        result: Subagent result dictionary

    Returns:
        Formatted string representation
    """
    agent_name = result.get("agent_name", "unknown")
    duration = result.get("duration", 0)

    if result.get("success"):
        output = result.get("result", "")
        return f"""
SubAgent: {agent_name}
Status: ✅ Success
Duration: {duration:.1f}s
Output:
{output}
"""
    else:
        error = result.get("error", "Unknown error")
        return f"""
SubAgent: {agent_name}
Status: ❌ Failed
Duration: {duration:.1f}s
Error:
{error}
"""


def get_failed_subagents(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract failed subagents from results.

    Args:
        results: List of subagent result dictionaries

    Returns:
        List of failed subagent results
    """
    failed = [r for r in results if not r.get("success")]
    if failed:
        debug("subagent_results", f"Found {len(failed)} failed subagents")
    return failed


def get_successful_subagents(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract successful subagents from results.

    Args:
        results: List of subagent result dictionaries

    Returns:
        List of successful subagent results
    """
    successful = [r for r in results if r.get("success")]
    if successful:
        debug("subagent_results", f"Found {len(successful)} successful subagents")
    return successful


def calculate_total_duration(results: List[Dict[str, Any]]) -> float:
    """
    Calculate total execution time across all subagents.

    Note: This is the sum of individual durations, not wall-clock time
    (since subagents run in parallel).

    Args:
        results: List of subagent result dictionaries

    Returns:
        Total duration in seconds
    """
    total = sum(r.get("duration", 0) for r in results)
    debug("subagent_results", f"Total execution time: {total:.1f}s")
    return total


def extract_subagent_outputs(results: List[Dict[str, Any]]) -> List[str]:
    """
    Extract output strings from successful subagents.

    Args:
        results: List of subagent result dictionaries
ns:
        List of output strings
    """
    outputs = []
    for result in results:
        if result.get("success"):
            output = result.get("result", "")
            if output:
                outputs.append(output)

    debug("subagent_results", f"Extracted {len(outputs)} outputs")
    return outputs


def create_subagent_summary_table(results: List[Dict[str, Any]]) -> str:
    """
    Create a summary table of subagent results.

    Args:
        results: List of subagent result dictionaries

    Returns:
        Formatted table string
    """
    if not results:
        return "No subagents executed"

    # Calculate column widths
    max_name_len = max(len(r.get("agent_name", "")) for r in results)
    max_name_len = max(max_name_len, len("Agent Name"))

    # Build table
    lines = []
    lines.append("=" * (max_name_len + 40))
    lines.append(f"{'Agent Name':<{max_name_len}} | {'Status':<10} | {'Duration':<10}")
    lines.append("-" * (max_name_len + 40))

    for result in results:
        name = result.get("agent_name", "unknown")
        status = "✅ Success" if result.get("success") else "❌ Failed"
        duration = f"{result.get('duration', 0):.1f}s"
        lines.append(f"{name:<{max_name_len}} | {status:<10} | {duration:<10}")

    lines.append("=" * (max_name_len + 40))

    # Add summary
    total = len(results)
    succeeded = sum(1 for r in results if r.get("success"))
    failed = total - succeeded
    total_duration = calculate_total_duration(results)

    lines.append(f"\nSummary: {succeeded}/{total} succeeded, {failed} failed")
    lines.append(f"Total execution time: {total_duration:.1f}s")

    return "\n".join(lines)
