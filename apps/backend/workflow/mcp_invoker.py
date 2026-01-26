"""
MCP Tool Invoker
================

Invokes MCP tools through the Claude SDK's tool system.

This module provides a high-level interface for calling MCP tools
from workflow nodes, handling parameter parsing, tool invocation,
and response processing.
"""

import json
import logging
from typing import Any, Dict, Optional

from claude_agent_sdk import ClaudeSDKClient
from debug import debug, debug_error, debug_success

from .mcp_config import get_mcp_config

logger = logging.getLogger(__name__)


async def invoke_mcp_tool(
    client: ClaudeSDKClient,
    server_name: str,
    tool_name: str,
    parameters: Dict[str, Any],
    project_dir: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Invoke an MCP tool through the Claude SDK.

    The SDK handles MCP server communication automatically when tools
    are configured. This function formats the tool call and processes
    the response.

    Args:
        client: Claude SDK client instance
        server_name: Name of the MCP server
        tool_name: Name of the tool to invoke
        parameters: Tool parameters as a dictionary
        project_dir: Optional project directory for config lookup

    Returns:
        Dictionary containing:
        - success: bool - Whether the tool call succeeded
        - result: Any - Tool result (if successful)
        - error: str - Error message (if failed)
        - server: str - Server name
        - tool: str - Tool name
        - parameters: dict - Parameters used

    Raises:
        ValueError: If server or tool is not configured
        Exception: If tool invocation fails
    """
    debug("mcp_invoker", f"Invoking MCP tool: {server_name}.{tool_name}")
    debug("mcp_invoker", f"Parameters: {json.dumps(parameters, indent=2)}")

    # Validate server configuration
    mcp_config = get_mcp_config(project_dir)
    if not mcp_config.validate_server(server_name):
        error_msg = f"MCP server '{server_name}' is not configured"
        debug_error("mcp_invoker", error_msg)
        return {
            "success": False,
            "error": error_msg,
            "server": server_name,
            "tool": tool_name,
            "parameters": parameters,
        }

    try:
        # Format tool name for SDK
        # MCP tools are typically called as "mcp__server_name__tool_name"
        # or "server_name.tool_name" depending on SDK version
        full_tool_name = f"mcp__{server_name}__{tool_name}"

        debug("mcp_invoker", f"Formatted tool name: {full_tool_name}")

        # The Claude SDK handles MCP tool calls through its tool system
        # We need to send a message that triggers the tool use
        # For now, we'll use a direct tool call approach

        # Note: The actual implementation depends on how the SDK exposes MCP tools
        # This is a placeholder that shows the intended flow

        # Option 1: Direct tool call (if SDK supports it)
        # result = await client.call_tool(full_tool_name, parameters)

        # Option 2: Message-based tool call (more common)
        # We send a message that requests the tool use, and the SDK handles it
        tool_use_message = {
            "role": "user",
            "content": [
                {
                    "type": "tool_use",
                    "id": f"toolu_{server_name}_{tool_name}",
                    "name": full_tool_name,
                    "input": parameters,
                }
            ],
        }

        # For now, return a structured response indicating the tool was called
        # In a full implementation, this would actually invoke the SDK's tool system
        debug_success("mcp_invoker", f"MCP tool call prepared: {full_tool_name}")

        # TODO: Implement actual SDK tool invocation
        # This requires understanding how the Claude SDK exposes MCP tools
        # Possible approaches:
        # 1. Use client.send_message() with tool_use content
        # 2. Use a dedicated tool invocation method if available
        # 3. Use the agent session with tool permissions

        # Placeholder response
        result = {
            "success": True,
            "result": {
                "message": f"MCP tool {server_name}.{tool_name} would be called here",
                "parameters": parameters,
                "note": "This is a placeholder - actual SDK integration needed",
            },
            "server": server_name,
            "tool": tool_name,
            "parameters": parameters,
        }

        return result

    except Exception as e:
        error_msg = f"Failed to invoke MCP tool {server_name}.{tool_name}: {str(e)}"
        debug_error("mcp_invoker", error_msg)
        logger.exception(error_msg)

        return {
            "success": False,
            "error": error_msg,
            "server": server_name,
            "tool": tool_name,
            "parameters": parameters,
        }


def parse_mcp_tool_result(result: Dict[str, Any]) -> Any:
    """
    Parse MCP tool result into a usable format.

    Args:
        result: Raw tool result from invoke_mcp_tool

    Returns:
        Parsed result value, or error message if failed
    """
    if result.get("success"):
        return result.get("result")
    else:
        return f"Error: {result.get('error', 'Unknown error')}"


def format_mcp_error(error: Exception, server_name: str, tool_name: str) -> Dict[str, Any]:
    """
    Format an MCP tool error into a structured response.

    Args:
        error: Exception that occurred
        server_name: Name of the MCP server
        tool_name: Name of the tool

    Returns:
        Structured error response
    """
    return {
        "success": False,
        "error": str(error),
        "error_type": type(error).__name__,
        "server": server_name,
        "tool": tool_name,
    }
