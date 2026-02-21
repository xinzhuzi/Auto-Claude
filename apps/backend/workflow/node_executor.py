"""
Node Executor
=============

Executes individual workflow nodes, integrating with Auto-Claude's infrastructure.

Supported node types:
- MCP: Call MCP tools via SDK
- Skill: Execute skill via run_agent_session
- SubAgent: Launch subagent via SDK Task tool
- Prompt: Send prompt to Claude
- IfElse/Switch: Conditional branching
- Start/End: Workflow boundaries
- AskUserQuestion: Request user input
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from claude_agent_sdk import ClaudeSDKClient
from debug import debug, debug_error, debug_section, debug_success
from .context import ExecutionContext

# Import Auto-Claude's execution infrastructure
from core.client import create_client
from agents.session import run_agent_session

# Import MCP integration
from .mcp_invoker import invoke_mcp_tool, parse_mcp_tool_result

# Import SubAgent integration
from .subagent_launcher import launch_subagent, parse_subagent_config
from .subagent_results import aggregate_subagent_results

# Import IPC bridge for user input
from .ipc_bridge import request_user_input

# Import error handling, retry logic, and logging
from .errors import (
    NodeExecutionError,
    MCPError,
    SubAgentError,
    SkillError,
    UserInputError,
    classify_error,
)
from .retry import retry_async, create_retry_policy
from .logger import create_logger

logger = create_logger(__name__)


class NodeExecutor:
    """
    Executes individual workflow nodes.

    Each node type has specific execution logic that integrates with
    Auto-Claude's existing infrastructure (SDK, MCP, agents, etc.).
    """

    def __init__(self, project_dir: Path, spec_dir: Path, execution_id: Optional[str] = None, workflow_id: Optional[str] = None):
        """
        Initialize node executor.

        Args:
            project_dir: Root project directory
            spec_dir: Spec directory for settings
            execution_id: Optional execution ID for logging
            workflow_id: Optional workflow ID for logging
        """
        self.project_dir = project_dir
        self.spec_dir = spec_dir
        self.client: Optional[ClaudeSDKClient] = None
        
        # Initialize logger with execution context
        self.logger = create_logger(__name__, execution_id=execution_id, workflow_id=workflow_id)

    def _get_last_result(self, context: ExecutionContext) -> Any:
        """Return the most recently stored node result, if any."""
        if not context.node_results:
            return None
        return next(reversed(context.node_results.values()))

    def _normalize_for_match(self, value: Any) -> str:
        """Normalize values to a comparable string for simple condition matching."""
        if value is None:
            return ""
        if isinstance(value, (dict, list)):
            try:
                return json.dumps(value, ensure_ascii=False)
            except Exception:
                return str(value)
        return str(value)

    async def execute_node(
        self,
        node: Dict[str, Any],
        context: ExecutionContext,
    ) -> Any:
        """
        Execute a single node based on its type.

        Args:
            node: Node configuration from workflow JSON
            context: Current execution context

        Returns:
            Node execution result (type-dependent)

        Raises:
            ValueError: If node type is unsupported
            NodeExecutionError: If node execution fails
        """
        node_type = node.get("type")
        node_id = node.get("id", "unknown")

        debug_section("node_executor", f"Executing Node: {node_id} ({node_type})")
        
        # Log node execution start
        self.logger.log_node_execution(
            node_id=node_id,
            node_type=node_type,
            status="started",
        )

        try:
            # Execute node with performance tracking
            with self.logger.operation(f"node_{node_type}", node_id=node_id):
                # Route to specific executor based on node type
                if node_type == "mcp":
                    result = await self._execute_mcp_node(node, context)
                elif node_type == "skill":
                    result = await self._execute_skill_node(node, context)
                elif node_type == "subAgent":
                    result = await self._execute_subagent_node(node, context)
                elif node_type == "prompt":
                    result = await self._execute_prompt_node(node, context)
                elif node_type == "ifElse":
                    result = await self._execute_ifelse_node(node, context)
                elif node_type == "switch":
                    result = await self._execute_switch_node(node, context)
                elif node_type == "askUserQuestion":
                    result = await self._execute_ask_user_node(node, context)
                elif node_type == "start":
                    result = await self._execute_start_node(node, context)
                elif node_type == "end":
                    result = await self._execute_end_node(node, context)
                elif node_type == "branch":
                    result = await self._execute_branch_node(node, context)
                else:
                    raise ValueError(f"Unsupported node type: {node_type}")

            # Store result in context
            context.set_node_result(node_id, result)
            
            # Log node execution completion
            self.logger.log_node_execution(
                node_id=node_id,
                node_type=node_type,
                status="completed",
            )
            
            debug_success("node_executor", f"Node {node_id} completed")
            return result

        except Exception as error:
            # Classify and wrap error
            workflow_error = classify_error(error)
            
            # Log node execution failure
            self.logger.log_node_execution(
                node_id=node_id,
                node_type=node_type,
                status="failed",
                error=error,
            )
            
            # Wrap in NodeExecutionError if not already a workflow error
            if not isinstance(error, NodeExecutionError):
                raise NodeExecutionError(
                    message=f"Node {node_id} ({node_type}) execution failed",
                    node_id=node_id,
                    node_type=node_type,
                    original_error=error,
                ) from error
            
            raise

    async def _execute_mcp_node(self, node: Dict[str, Any], context: ExecutionContext) -> Any:
        """
        Execute MCP tool node with retry logic.

        MCP tools are called through the Claude SDK's tool system.
        The SDK handles MCP server communication automatically.
        """
        server_name = node.get("data", {}).get("server")
        tool_name = node.get("data", {}).get("tool")
        parameters = node.get("data", {}).get("parameters", {})
        node_id = node.get("id", "unknown")

        debug("node_executor", f"Calling MCP tool: {server_name}.{tool_name}")

        # Create client if not already created
        if not self.client:
            self.client = create_client(
                project_dir=self.project_dir,
                spec_dir=self.spec_dir,
                model="claude-sonnet-4-5-20250929",
                agent_type="coder",
            )

        # Get retry policy for MCP nodes
        retry_policy = create_retry_policy("mcp")

        try:
            # Invoke MCP tool with retry logic
            async with self.client:
                result = await retry_async(
                    invoke_mcp_tool,
                    client=self.client,
                    server_name=server_name,
                    tool_name=tool_name,
                    parameters=parameters,
                    project_dir=self.project_dir,
                    policy=retry_policy,
                    operation_name=f"mcp_{server_name}_{tool_name}",
                )

            # Parse and return result
            parsed_result = parse_mcp_tool_result(result)
            debug("node_executor", f"MCP tool result: {parsed_result}")

            return parsed_result

        except Exception as error:
            # Wrap in MCPError
            raise MCPError(
                message=f"MCP tool {server_name}.{tool_name} failed",
                node_id=node_id,
                server_name=server_name,
                tool_name=tool_name,
                original_error=error,
            ) from error

    async def _execute_skill_node(self, node: Dict[str, Any], context: ExecutionContext) -> str:
        """
        Execute skill node with retry logic.

        Skills are executed through Auto-Claude's agent session system.
        """
        skill_name = node.get("data", {}).get("skillName")
        prompt = node.get("data", {}).get("prompt", "")
        model = node.get("data", {}).get("model", "claude-sonnet-4-5-20250929")
        node_id = node.get("id", "unknown")

        debug("node_executor", f"Executing skill: {skill_name}")

        # Create client if not already created
        if not self.client:
            self.client = create_client(
                project_dir=self.project_dir,
                spec_dir=self.spec_dir,
                model=model,
                agent_type="coder",
            )

        # Get retry policy for Skill nodes
        retry_policy = create_retry_policy("skill")

        try:
            # Execute skill with retry logic
            async def _run_skill():
                async with self.client:
                    status, response, _ = await run_agent_session(
                        client=self.client,
                        message=prompt or f"Execute skill: {skill_name}",
                        spec_dir=self.spec_dir,
                        verbose=False,
                    )
                if status == "error":
                    raise RuntimeError(f"Skill execution failed: {response}")
                return response

            response = await retry_async(
                _run_skill,
                policy=retry_policy,
                operation_name=f"skill_{skill_name}",
            )

            return response

        except Exception as error:
            # Wrap in SkillError
            raise SkillError(
                message=f"Skill {skill_name} execution failed",
                node_id=node_id,
                skill_name=skill_name,
                original_error=error,
            ) from error

    async def _execute_subagent_node(self, node: Dict[str, Any], context: ExecutionContext) -> str:
        """
        Execute subagent node with retry logic.

        Subagents are launched through the SDK's parallel agent system.
        """
        node_data = node.get("data", {})
        agent_name = node_data.get("agentName", "unnamed")
        prompt = node_data.get("prompt", "")
        description = node_data.get("description", "")
        node_id = node.get("id", "unknown")

        debug("node_executor", f"Launching subagent: {agent_name}")

        # Create client if not already created
        if not self.client:
            model = node_data.get("model", "claude-sonnet-4-5-20250929")
            self.client = create_client(
                project_dir=self.project_dir,
                spec_dir=self.spec_dir,
                model=model,
                agent_type="coder",
            )

        # Parse subagent configuration
        subagent_config = parse_subagent_config(node_data)

        # Get retry policy for SubAgent nodes
        retry_policy = create_retry_policy("subAgent")

        try:
            async def _run_subagent():
                async with self.client:
                    return await launch_subagent(
                        client=self.client,
                        agent_name=agent_name,
                        prompt=prompt,
                        description=description,
                        project_dir=self.project_dir,
                        spec_dir=self.spec_dir,
                        model=subagent_config.get("model", "claude-sonnet-4-5-20250929"),
                        timeout=subagent_config.get("timeout"),
                    )

            # Launch subagent with retry logic
            result = await retry_async(
                _run_subagent,
                policy=retry_policy,
                operation_name=f"subagent_{agent_name}",
            )

            # Check if subagent succeeded
            if result.get("success"):
                debug("node_executor", f"Subagent {agent_name} completed successfully")
                return result.get("result", "")
            else:
                error_msg = result.get("error", "Unknown error")
                raise SubAgentError(
                    message=f"Subagent {agent_name} failed: {error_msg}",
                    node_id=node_id,
                    agent_name=agent_name,
                )

        except Exception as error:
            # Wrap in SubAgentError if not already
            if not isinstance(error, SubAgentError):
                raise SubAgentError(
                    message=f"Subagent {agent_name} execution failed",
                    node_id=node_id,
                    agent_name=agent_name,
                    original_error=error,
                ) from error
            raise

    async def _execute_prompt_node(self, node: Dict[str, Any], context: ExecutionContext) -> str:
        """
        Execute prompt node.

        Sends a prompt directly to Claude and returns the response.
        """
        prompt = node.get("data", {}).get("prompt", "")
        model = node.get("data", {}).get("model", "claude-sonnet-4-5-20250929")

        debug("node_executor", f"Sending prompt: {prompt[:100]}...")

        # Create client if not already created
        if not self.client:
            self.client = create_client(
                project_dir=self.project_dir,
                spec_dir=self.spec_dir,
                model=model,
                agent_type="coder",
            )

        # Send prompt and get response
        async with self.client:
            status, response, _ = await run_agent_session(
                client=self.client,
                message=prompt,
                spec_dir=self.spec_dir,
                verbose=False,
            )

        if status == "error":
            raise RuntimeError(f"Prompt execution failed: {response}")

        return response

    async def _execute_ifelse_node(self, node: Dict[str, Any], context: ExecutionContext) -> str:
        """
        Execute if/else conditional node.

        Evaluates a condition and returns the branch to take.
        """
        data = node.get("data", {})
        evaluation_target = data.get("evaluationTarget") or data.get("condition") or ""
        branches = data.get("branches") or [
            {"label": data.get("trueBranch", "true")},
            {"label": data.get("falseBranch", "false")},
        ]

        debug("node_executor", f"Evaluating condition: {evaluation_target}")

        last_result = self._get_last_result(context)
        last_text = self._normalize_for_match(last_result).lower()
        target_text = self._normalize_for_match(evaluation_target).lower()

        if not branches:
            branches = [{"label": "true"}, {"label": "false"}]

        # Simple heuristic: match evaluation target against last result if provided,
        # otherwise fall back to truthiness of last result.
        if target_text:
            matched = target_text in last_text
        else:
            matched = bool(last_result)

        selected_index = 0 if matched else 1
        if selected_index >= len(branches):
            selected_index = 0

        branch_handle = f"branch-{selected_index}"
        context.set_branch(branch_handle)
        if node.get("id"):
            context.set_variable(f"branch:{node.get('id')}", branch_handle)
        return branch_handle

    async def _execute_switch_node(self, node: Dict[str, Any], context: ExecutionContext) -> str:
        """
        Execute switch conditional node.

        Evaluates an expression and returns matching case.
        """
        data = node.get("data", {})
        evaluation_target = data.get("evaluationTarget") or data.get("expression") or ""
        branches = data.get("branches")
        cases = data.get("cases") or []

        if not branches and cases:
            branches = [
                {"label": case.get("branch", f"case-{i}"), "condition": case.get("value")}
                for i, case in enumerate(cases)
            ]

        branches = branches or []

        debug("node_executor", f"Evaluating switch: {evaluation_target}")

        last_result = self._get_last_result(context)
        last_text = self._normalize_for_match(last_result).lower()
        target_text = self._normalize_for_match(evaluation_target).lower() or last_text

        default_index = None
        selected_index = None

        for i, branch in enumerate(branches):
            if branch.get("isDefault"):
                default_index = i
                continue
            condition_text = self._normalize_for_match(branch.get("condition", "")).lower()
            label_text = self._normalize_for_match(branch.get("label", "")).lower()
            if condition_text and condition_text in target_text:
                selected_index = i
                break
            if label_text and label_text in target_text:
                selected_index = i
                break

        if selected_index is None:
            selected_index = default_index if default_index is not None else 0

        if selected_index >= len(branches):
            selected_index = 0

        branch_handle = f"branch-{selected_index}"
        context.set_branch(branch_handle)
        if node.get("id"):
            context.set_variable(f"branch:{node.get('id')}", branch_handle)
        return branch_handle

    async def _execute_ask_user_node(self, node: Dict[str, Any], context: ExecutionContext) -> Any:
        """
        Execute ask user question node.

        Pauses execution and requests user input via IPC.
        User input nodes should not be retried.
        """
        question = node.get("data", {}).get("question", "")
        options = node.get("data", {}).get("options", [])
        multi_select = node.get("data", {}).get("multiSelect", False)
        timeout = node.get("data", {}).get("timeout", 300)  # Default 5 minutes
        node_id = node.get("id", "unknown")

        debug("node_executor", f"Asking user: {question}")

        try:
            # Request user input via IPC bridge (no retry for user input)
            result = await request_user_input(
                question=question,
                options=options,
                multi_select=multi_select,
                timeout=timeout,
            )

            debug("node_executor", f"User responded: {result}")
            return result

        except TimeoutError as e:
            error_msg = f"User input timed out after {timeout}s"
            debug_error("node_executor", error_msg)
            raise UserInputError(
                message=error_msg,
                node_id=node_id,
                original_error=e,
            ) from e

        except Exception as e:
            error_msg = f"Failed to get user input: {str(e)}"
            debug_error("node_executor", error_msg)
            raise UserInputError(
                message=error_msg,
                node_id=node_id,
                original_error=e,
            ) from e

    async def _execute_start_node(self, node: Dict[str, Any], context: ExecutionContext) -> None:
        """Execute start node (workflow entry point)."""
        debug("node_executor", "Workflow started")
        return None

    async def _execute_end_node(self, node: Dict[str, Any], context: ExecutionContext) -> None:
        """Execute end node (workflow exit point)."""
        debug("node_executor", "Workflow ended")
        return None

    async def _execute_branch_node(self, node: Dict[str, Any], context: ExecutionContext) -> str:
        """
        Execute branch node (fan-out to multiple paths).

        Returns the list of branches to execute.
        """
        branches = node.get("data", {}).get("branches", [])

        debug("node_executor", f"Branching to: {branches}")

        # Return current branch if set, otherwise first branch
        if context.current_branch:
            return context.current_branch
        return branches[0] if branches else "default"

    def cleanup(self):
        """Clean up resources (e.g., close SDK client)."""
        if self.client:
            # TODO: Close SDK client if needed
            self.client = None
