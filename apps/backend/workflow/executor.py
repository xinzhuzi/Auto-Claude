"""
Workflow Executor
==================

Orchestrates workflow graph execution, handling node dependencies and control flow.

The WorkflowExecutor is responsible for:
- Parsing workflow JSON from frontend
- Topologically sorting nodes by dependencies
- Executing nodes in correct order
- Handling branching and looping
- Emitting progress events
"""

import asyncio
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Set, Optional
from datetime import datetime

from debug import debug, debug_error, debug_section, debug_success
from .context import ExecutionContext
from .node_executor import NodeExecutor

# Import error handling and logging
from .errors import (
    WorkflowError,
    ValidationError,
    ExecutionError,
    CancellationError,
    classify_error,
)
from .logger import create_logger

logger = create_logger(__name__)


class WorkflowExecutor:
    """
    Orchestrates workflow execution.

    Takes a workflow definition from the frontend, validates it,
    and executes nodes in dependency order.
    """

    def __init__(self, project_dir: Path, spec_dir: Path):
        """
        Initialize workflow executor.

        Args:
            project_dir: Root project directory
            spec_dir: Spec directory for settings
        """
        self.project_dir = project_dir
        self.spec_dir = spec_dir
        self.execution_id: Optional[str] = None
        self.workflow_id: Optional[str] = None
        self.is_paused = False
        self.is_cancelled = False
        
        # Initialize logger (will be updated with execution context)
        self.logger = create_logger(__name__)
        
        # Node executor will be created with execution context
        self.node_executor: Optional[NodeExecutor] = None

    async def execute_workflow(
        self,
        workflow: Dict[str, Any],
        config: Dict[str, Any],
        progress_callback: Optional[callable] = None,
    ) -> str:
        """
        Execute a workflow with comprehensive error handling and logging.

        Args:
            workflow: Workflow definition (JSON from frontend)
            config: Execution configuration (model, parameters, etc.)
            progress_callback: Optional callback for progress updates

        Returns:
            execution_id: Unique identifier for this execution

        Raises:
            ValidationError: If workflow is invalid
            ExecutionError: If execution fails
            CancellationError: If execution is cancelled
        """
        # Generate execution ID
        self.execution_id = str(uuid.uuid4())
        self.workflow_id = workflow.get("id")

        # Update logger with execution context
        self.logger.set_execution_context(
            execution_id=self.execution_id,
            workflow_id=self.workflow_id,
        )

        # Create node executor with execution context
        self.node_executor = NodeExecutor(
            project_dir=self.project_dir,
            spec_dir=self.spec_dir,
            execution_id=self.execution_id,
            workflow_id=self.workflow_id,
        )

        debug_section(
            "workflow_executor",
            f"Starting Workflow Execution: {self.execution_id}",
        )
        debug("workflow_executor", f"Workflow: {workflow.get('name', 'unnamed')}")

        # Log workflow start
        self.logger.log_workflow_event(
            event_type="started",
            workflow_name=workflow.get("name", "unnamed"),
            node_count=len(workflow.get("nodes", [])),
        )

        try:
            # Validate workflow
            with self.logger.operation("workflow_validation"):
                self._validate_workflow(workflow)

            # Create execution context with project paths
            context = ExecutionContext(
                project_dir=self.project_dir,
                spec_dir=self.spec_dir,
            )

            # Get nodes and edges from workflow
            nodes = workflow.get("nodes", [])
            edges = workflow.get("edges", [])

            debug("workflow_executor", f"Nodes: {len(nodes)}, Edges: {len(edges)}")

            # Topological sort to determine execution order
            with self.logger.operation("topological_sort"):
                execution_order = self._topological_sort(nodes, edges)

            debug("workflow_executor", f"Execution order: {[n['id'] for n in execution_order]}")

            # Execute nodes in order
            total_nodes = len(execution_order)
            for index, node in enumerate(execution_order):
                # Check for cancellation
                if self.is_cancelled:
                    debug_error("workflow_executor", "Execution cancelled")
                    self.logger.log_workflow_event(event_type="cancelled")
                    raise CancellationError(
                        message="Workflow execution cancelled by user"
                    )

                # Check for pause
                if self.is_paused:
                    self.logger.log_workflow_event(event_type="paused")
                    
                while self.is_paused:
                    await asyncio.sleep(0.1)
                    
                if self.is_paused:  # Just resumed
                    self.logger.log_workflow_event(event_type="resumed")

                node_id = node.get("id", "unknown")
                progress = int((index / total_nodes) * 100)

                debug_section("workflow_executor", f"Executing node {index + 1}/{total_nodes}")
                debug("workflow_executor", f"Node ID: {node_id}, Progress: {progress}%")

                # Execute node with error handling
                try:
                    result = await self.node_executor.execute_node(node, context)
                    debug_success("workflow_executor", f"Node {node_id} completed successfully")
                except Exception as e:
                    debug_error("workflow_executor", f"Node {node_id} failed: {e}")
                    
                    # Classify error
                    workflow_error = classify_error(e)
                    
                    # Log workflow failure
                    self.logger.log_workflow_event(
                        event_type="failed",
                        failed_node_id=node_id,
                        error_type=type(e).__name__,
                        error_message=str(e),
                    )
                    
                    # Re-raise as ExecutionError if not already a WorkflowError
                    if not isinstance(e, WorkflowError):
                        raise ExecutionError(
                            message=f"Workflow execution failed at node {node_id}",
                            node_id=node_id,
                        ) from e
                    
                    raise
                # Send progress update
                if progress_callback:
                    await progress_callback({
                        "execution_id": self.execution_id,
                        "workflow_id": workflow.get("id"),
                        "status": "running",
                        "progress": progress,
                        "current_node": node_id,
                    })

            debug_success("workflow_executor", f"Workflow execution completed: {self.execution_id}")

            # Log workflow completion
            self.logger.log_workflow_event(
                event_type="completed",
                total_nodes=total_nodes,
            )

            return self.execution_id

        except ValidationError as e:
            # Validation errors are not retryable
            self.logger.error("Workflow validation failed", error=e)
            raise
            
        except CancellationError as e:
            # Cancellation is intentional
            self.logger.warning("Workflow execution cancelled")
            raise
            
        except Exception as e:
            # Log unexpected errors
            self.logger.error("Workflow execution failed", error=e)
            raise

    def _validate_workflow(self, workflow: Dict[str, Any]) -> None:
        """
        Validate workflow structure.

        Args:
            workflow: Workflow definition

        Raises:
            ValidationError: If workflow is invalid
        """
        validation_errors = []

        if not workflow.get("id"):
            validation_errors.append("Workflow missing ID")

        if not workflow.get("name"):
            validation_errors.append("Workflow missing name")

        nodes = workflow.get("nodes", [])
        if not nodes:
            validation_errors.append("Workflow has no nodes")

        # Check for start and end nodes
        has_start = any(n.get("type") == "start" for n in nodes)
        has_end = any(n.get("type") == "end" for n in nodes)

        if not has_start:
            validation_errors.append("Workflow missing start node")

        if not has_end:
            validation_errors.append("Workflow missing end node")

        # Raise ValidationError if any errors found
        if validation_errors:
            raise ValidationError(
                message="Workflow validation failed",
                validation_errors=validation_errors,
            )

        debug("workflow_executor", "Workflow validation passed")

    def _topological_sort(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Sort nodes topologically by dependencies (edges).

        Uses Kahn's algorithm for topological sorting.

        Args:
            nodes: List of node definitions
            edges: List of edge definitions (connections)

        Returns:
            List of nodes in execution order

        Raises:
            ValueError: If workflow contains cycles
        """
        # Build adjacency list and in-degree count
        node_ids = {n["id"] for n in nodes}
        in_degree = {nid: 0 for nid in node_ids}
        adjacency = {nid: [] for nid in node_ids}

        # Process edges (source -> target)
        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")

            if source in node_ids and target in node_ids:
                adjacency[source].append(target)
                in_degree[target] += 1

        # Kahn's algorithm
        queue = [nid for nid in node_ids if in_degree[nid] == 0]
        result = []

        while queue:
            node_id = queue.pop(0)
            result.append(node_id)

            # Reduce in-degree for neighbors
            for neighbor in adjacency[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Check for cycles
        if len(result) != len(node_ids):
            raise ValueError("Workflow contains cycles")

        # Convert node IDs back to node objects
        node_map = {n["id"]: n for n in nodes}
        sorted_nodes = [node_map[nid] for nid in result]

        return sorted_nodes

    def pause(self) -> None:
        """Pause workflow execution."""
        debug("workflow_executor", "Pausing execution")
        self.is_paused = True

    def resume(self) -> None:
        """Resume workflow execution."""
        debug("workflow_executor", "Resuming execution")
        self.is_paused = False

    def cancel(self) -> None:
        """Cancel workflow execution."""
        debug("workflow_executor", "Cancelling execution")
        self.is_cancelled = True

    def get_status(self) -> Dict[str, Any]:
        """
        Get current execution status.

        Returns:
            Dictionary with status information
        """
        return {
            "execution_id": self.execution_id,
            "is_paused": self.is_paused,
            "is_cancelled": self.is_cancelled,
        }
