"""
Workflow FastAPI Routes
========================

HTTP API endpoints for workflow execution.

Exposes workflow execution functionality through REST API.
Integrates with Auto-Claude's FastAPI application.
"""

import logging
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from .executor import WorkflowExecutor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflow", tags=["workflow"])

# In-memory execution storage (for production, use a database)
executions: Dict[str, WorkflowExecutor] = {}


# Request/Response Models
class WorkflowExecuteRequest(BaseModel):
    workflow: Dict[str, Any]
    config: Dict[str, Any] = {}


class WorkflowExecuteResponse(BaseModel):
    execution_id: str
    status: str


class WorkflowStatusResponse(BaseModel):
    execution_id: str
    status: str
    is_paused: bool
    is_cancelled: bool


# API Endpoints
@router.post("/execute", response_model=WorkflowExecuteResponse)
async def execute_workflow(
    request: WorkflowExecuteRequest,
    background_tasks: BackgroundTasks,
    project_dir: str = ".",
    spec_dir: str = ".auto-claude/spec",
):
    """
    Execute a workflow.

    Args:
        request: Workflow definition and execution config
        background_tasks: FastAPI background tasks
        project_dir: Project root directory
        spec_dir: Spec directory

    Returns:
        Execution ID and status
    """
    try:
        # Create executor
        executor = WorkflowExecutor(
            project_dir=Path(project_dir),
            spec_dir=Path(spec_dir),
        )

        # Define progress callback (sends events to frontend)
        async def progress_callback(progress_data: Dict[str, Any]):
            # TODO: Send progress event via WebSocket or IPC
            logger.info(f"Progress: {progress_data}")

        # Execute workflow in background
        async def run_workflow():
            try:
                execution_id = await executor.execute_workflow(
                    workflow=request.workflow,
                    config=request.config,
                    progress_callback=progress_callback,
                )
                logger.info(f"Workflow completed: {execution_id}")
            except Exception as e:
                logger.error(f"Workflow execution failed: {e}")
                raise

        background_tasks.add_task(run_workflow)

        # Get execution ID (executor generates it during execute_workflow)
        # For now, generate a temporary one
        import uuid
        execution_id = str(uuid.uuid4())
        executions[execution_id] = executor

        return WorkflowExecuteResponse(
            execution_id=execution_id,
            status="running",
        )

    except Exception as e:
        logger.error(f"Failed to execute workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pause/{execution_id}")
async def pause_execution(execution_id: str):
    """
    Pause a running workflow execution.

    Args:
        execution_id: Execution identifier

    Returns:
        Success message
    """
    if execution_id not in executions:
        raise HTTPException(status_code=404, detail="Execution not found")

    executor = executions[execution_id]
    executor.pause()

    return {"message": "Execution paused", "execution_id": execution_id}


@router.post("/resume/{execution_id}")
async def resume_execution(execution_id: str):
    """
    Resume a paused workflow execution.

    Args:
        execution_id: Execution identifier

    Returns:
        Success message
    """
    if execution_id not in executions:
        raise HTTPException(status_code=404, detail="Execution not found")

    executor = executions[execution_id]
    executor.resume()

    return {"message": "Execution resumed", "execution_id": execution_id}


@router.post("/cancel/{execution_id}")
async def cancel_execution(execution_id: str):
    """
    Cancel a workflow execution.

    Args:
        execution_id: Execution identifier

    Returns:
        Success message
    """
    if execution_id not in executions:
        raise HTTPException(status_code=404, detail="Execution not found")

    executor = executions[execution_id]
    executor.cancel()

    # Remove from storage
    del executions[execution_id]

    return {"message": "Execution cancelled", "execution_id": execution_id}


@router.get("/status/{execution_id}", response_model=WorkflowStatusResponse)
async def get_execution_status(execution_id: str):
    """
    Get execution status.

    Args:
        execution_id: Execution identifier

    Returns:
        Execution status information
    """
    if execution_id not in executions:
        raise HTTPException(status_code=404, detail="Execution not found")

    executor = executions[execution_id]
    status = executor.get_status()

    return WorkflowStatusResponse(
        execution_id=execution_id,
        status="paused" if status["is_paused"] else "running",
        is_paused=status["is_paused"],
        is_cancelled=status["is_cancelled"],
    )
