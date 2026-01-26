"""
Workflow Execution Engine
=========================

Provides workflow orchestration and node execution capabilities for Auto-Claude.

This module integrates with Auto-Claude's existing execution infrastructure:
- Claude SDK client (core.client.create_client)
- Agent sessions (agents.session.run_agent_session)
- MCP tools (via SDK tool system)

Key components:
- WorkflowExecutor: Orchestrates workflow graph execution
- NodeExecutor: Executes individual nodes (MCP/Skill/SubAgent)
- ExecutionContext: Manages data flow between nodes
"""

from .executor import WorkflowExecutor
from .node_executor import NodeExecutor
from .context import ExecutionContext

__all__ = [
    "WorkflowExecutor",
    "NodeExecutor",
    "ExecutionContext",
]
