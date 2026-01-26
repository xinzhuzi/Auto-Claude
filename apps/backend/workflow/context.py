"""
Workflow Execution Context
==========================

Manages data flow and state between workflow nodes during execution.

The ExecutionContext is responsible for:
- Storing node execution results
- Managing variable scope and references
- Tracking execution state (current branch, loop counters, etc.)
- Providing data access to subsequent nodes
- Managing project and spec directory paths
"""

import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class ExecutionContext:
    """
    Context for workflow execution, managing data flow between nodes.

    Attributes:
        variables: Global variables accessible to all nodes
        node_results: Results from executed nodes, keyed by node ID
        current_branch: Active branch name (for conditional nodes)
        loop_counters: Loop iteration counters, keyed by loop node ID
        parent_context: Reference to parent context (for nested workflows)
        project_dir: Project root directory path
        spec_dir: Spec directory path for settings
    """

    variables: Dict[str, Any] = field(default_factory=dict)
    node_results: Dict[str, Any] = field(default_factory=dict)
    current_branch: Optional[str] = None
    loop_counters: Dict[str, int] = field(default_factory=dict)
    parent_context: Optional["ExecutionContext"] = None
    project_dir: Optional[Path] = None
    spec_dir: Optional[Path] = None

    def set_variable(self, name: str, value: Any) -> None:
        """Set a variable in the current context."""
        self.variables[name] = value
        logger.debug(f"Set variable: {name} = {value}")

    def get_variable(self, name: str, default: Any = None) -> Any:
        """
        Get a variable from the current context.

        Searches in current context, then parent contexts (if any).
        """
        if name in self.variables:
            return self.variables[name]
        if self.parent_context:
            return self.parent_context.get_variable(name, default)
        return default

    def set_node_result(self, node_id: str, result: Any) -> None:
        """Store the result of a node execution."""
        self.node_results[node_id] = result
        logger.debug(f"Stored result for node {node_id}")

    def get_node_result(self, node_id: str) -> Optional[Any]:
        """Get the result of a previously executed node."""
        return self.node_results.get(node_id)

    def get_all_node_results(self) -> Dict[str, Any]:
        """Get all node execution results."""
        return self.node_results.copy()

    def set_branch(self, branch_name: str) -> None:
        """Set the current active branch."""
        self.current_branch = branch_name
        logger.debug(f"Set branch: {branch_name}")

    def get_branch(self) -> Optional[str]:
        """Get the current active branch."""
        return self.current_branch

    def increment_loop(self, loop_id: str) -> int:
        """Increment a loop counter and return the new value."""
        if loop_id not in self.loop_counters:
            self.loop_counters[loop_id] = 0
        self.loop_counters[loop_id] += 1
        return self.loop_counters[loop_id]

    def get_loop_count(self, loop_id: str) -> int:
        """Get the current loop iteration count."""
        return self.loop_counters.get(loop_id, 0)

    def reset_loop(self, loop_id: str) -> None:
        """Reset a loop counter to zero."""
        if loop_id in self.loop_counters:
            del self.loop_counters[loop_id]

    def create_child_context(self) -> "ExecutionContext":
        """
        Create a child context with this context as parent.

        Useful for isolated scopes (e.g., branching, subworkflows).
        """
        child = ExecutionContext(
            parent_context=self,
            project_dir=self.project_dir,
            spec_dir=self.spec_dir,
        )
        # Copy current variables to child
        child.variables = self.variables.copy()
        return child

    def merge_child_context(self, child: "ExecutionContext") -> None:
        """
        Merge a child context's variables back into this context.

        Used after a child context completes (e.g., after a branch).
        """
        self.variables.update(child.variables)
        self.node_results.update(child.node_results)

    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary for serialization."""
        return {
            "variables": self.variables,
            "node_results": self.node_results,
            "current_branch": self.current_branch,
            "loop_counters": self.loop_counters,
            "project_dir": str(self.project_dir) if self.project_dir else None,
            "spec_dir": str(self.spec_dir) if self.spec_dir else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExecutionContext":
        """Create context from dictionary (deserialization)."""
        return cls(
            variables=data.get("variables", {}),
            node_results=data.get("node_results", {}),
            current_branch=data.get("current_branch"),
            loop_counters=data.get("loop_counters", {}),
            project_dir=Path(data["project_dir"]) if data.get("project_dir") else None,
            spec_dir=Path(data["spec_dir"]) if data.get("spec_dir") else None,
        )
