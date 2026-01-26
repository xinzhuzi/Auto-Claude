"""
AI Workflow Generator
=====================

Generates workflows from natural language descriptions using Claude SDK.
"""

import asyncio
import json
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from claude_agent_sdk import ClaudeSDKClient
from debug import debug, debug_error, debug_success

from core.client import create_client
from agents.session import run_agent_session

from .ai_prompts import (
    format_workflow_generation_prompt,
    format_workflow_validation_prompt,
)

logger = logging.getLogger(__name__)


async def generate_workflow_from_description(
    description: str,
    project_dir: Path,
    spec_dir: Path,
    context: str = "",
    model: str = "claude-sonnet-4-5-20250929",
    max_iterations: int = 3,
) -> Dict[str, Any]:
    """
    Generate a workflow from natural language description.

    Uses Claude SDK to iteratively generate and validate workflow JSON.

    Args:
        description: Natural language description of desired workflow
        context: Additional context (optional)
        project_dir: Project root directory (required)
        spec_dir: Spec directory for settings (required)
        model: Model to use for generation
        max_iterations: Maximum validation/refinement iterations

    Returns:
        Dictionary containing:
        - success: bool - Whether generation succeeded
        - workflow: dict - Generated workflow JSON (if successful)
        - error: str - Error message (if failed)
        - iterations: int - Number of iterations used
    """
    debug("ai_generator", f"Generating workflow from description: {description[:100]}...")

    try:
        # Create Claude SDK client
        client = create_client(
            project_dir=project_dir,
            spec_dir=spec_dir,
            model=model,
            agent_type="coder",
        )

        # Format generation prompt
        generation_prompt = format_workflow_generation_prompt(
            description=description,
            context=context,
        )

        workflow = None
        validation_result = {}
        iterations = 0

        for iteration in range(max_iterations):
            iterations += 1
            debug("ai_generator", f"Generation iteration {iteration + 1}/{max_iterations}")

            # Generate workflow
            if iteration == 0:
                # First iteration: generate from scratch
                prompt = generation_prompt
            else:
                # Subsequent iterations: refine based on validation errors
                prompt = f"""The previous workflow had validation errors. Please fix them and regenerate.

Previous workflow:
{json.dumps(workflow, indent=2)}

Validation errors:
{json.dumps(validation_result.get('errors', []), indent=2)}

Generate a corrected workflow JSON."""

            # Call Claude SDK
            status, response = await run_agent_session(
                client=client,
                message=prompt,
                spec_dir=spec_dir,
                verbose=False,
            )

            if status != "success":
                raise RuntimeError(f"AI generation failed: {response}")

            # Extract JSON from response
            workflow = extract_json_from_response(response)

            if not workflow:
                raise ValueError("Failed to extract valid JSON from AI response")

            debug("ai_generator", f"Generated workflow: {workflow.get('name', 'Unnamed')}")

            # Validate workflow
            validation_result = await validate_workflow(
                workflow=workflow,
                client=client,
                spec_dir=spec_dir,
            )

            if validation_result.get("valid"):
                debug_success("ai_generator", f"Workflow validated successfully after {iterations} iterations")
                break

            debug("ai_generator", f"Validation failed, refining... ({len(validation_result.get('errors', []))} errors)")

        # Final validation check
        if not validation_result.get("valid"):
            debug_error("ai_generator", f"Failed to generate valid workflow after {max_iterations} iterations")
            return {
                "success": False,
                "error": f"Could not generate valid workflow after {max_iterations} attempts",
                "validation_errors": validation_result.get("errors", []),
                "iterations": iterations,
            }

        # Add metadata
        workflow["id"] = workflow.get("id") or str(uuid.uuid4())
        workflow["createdAt"] = workflow.get("createdAt") or None
        workflow["updatedAt"] = None

        debug_success("ai_generator", f"Workflow generation complete: {workflow['name']}")

        return {
            "success": True,
            "workflow": workflow,
            "iterations": iterations,
            "suggestions": validation_result.get("suggestions", []),
        }

    except Exception as e:
        error_msg = f"Failed to generate workflow: {str(e)}"
        debug_error("ai_generator", error_msg)
        logger.exception(error_msg)

        return {
            "success": False,
            "error": error_msg,
            "iterations": iterations,
        }


async def validate_workflow(
    workflow: Dict[str, Any],
    client: ClaudeSDKClient,
    spec_dir: Path,
) -> Dict[str, Any]:
    """
    Validate workflow structure and logic using AI.

    Args:
        workflow: Workflow JSON to validate
        client: Claude SDK client
        spec_dir: Spec directory for settings (required)

    Returns:
        Validation result with errors and suggestions
    """
    debug("ai_generator", "Validating workflow...")

    try:
        # Basic structural validation first
        structural_errors = validate_workflow_structure(workflow)

        if structural_errors:
            return {
                "valid": False,
                "errors": structural_errors,
                "suggestions": [],
            }

        # AI-powered validation for logic and best practices
        validation_prompt = format_workflow_validation_prompt(workflow)

        status, response = await run_agent_session(
            client=client,
            message=validation_prompt,
            spec_dir=spec_dir,
            verbose=False,
        )

        if status != "success":
            # If AI validation fails, fall back to structural validation only
            debug("ai_generator", "AI validation failed, using structural validation only")
            return {
                "valid": True,
                "errors": [],
                "suggestions": [],
            }

        # Extract validation result from response
        validation_result = extract_json_from_response(response)

        if not validation_result:
            # If can't parse AI response, assume valid
            return {
                "valid": True,
                "errors": [],
                "suggestions": [],
            }

        return validation_result

    except Exception as e:
        debug_error("ai_generator", f"Validation error: {str(e)}")
        logger.exception("Workflow validation failed")

        # On error, assume valid (fail open)
        return {
            "valid": True,
            "errors": [],
            "suggestions": [],
        }


def validate_workflow_structure(workflow: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Perform basic structural validation of workflow.

    Args:
        workflow: Workflow JSON to validate

    Returns:
        List of validation errors
    """
    errors = []

    # Check required fields
    if not workflow.get("name"):
        errors.append({
            "severity": "error",
            "message": "Workflow must have a name",
            "location": "workflow.name",
        })

    if not workflow.get("nodes"):
        errors.append({
            "severity": "error",
            "message": "Workflow must have at least one node",
            "location": "workflow.nodes",
        })
        return errors  # Can't continue without nodes

    # Check for start node
    start_nodes = [n for n in workflow["nodes"] if n.get("type") == "start"]
    if not start_nodes:
        errors.append({
            "severity": "error",
            "message": "Workflow must have a start node",
            "location": "workflow.nodes",
        })

    if len(start_nodes) > 1:
        errors.append({
            "severity": "error",
            "message": "Workflow can only have one start node",
            "location": "workflow.nodes",
        })

    # Check node IDs are unique
    node_ids = [n.get("id") for n in workflow["nodes"]]
    if len(node_ids) != len(set(node_ids)):
        errors.append({
            "severity": "error",
            "message": "Node IDs must be unique",
            "location": "workflow.nodes",
        })

    # Check edges reference valid nodes
    edges = workflow.get("edges", [])
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")

        if source not in node_ids:
            errors.append({
                "severity": "error",
                "message": f"Edge references non-existent source node: {source}",
                "location": f"edge.{edge.get('id')}",
            })

        if target not in node_ids:
            errors.append({
                "severity": "error",
                "message": f"Edge references non-existent target node: {target}",
                "location": f"edge.{edge.get('id')}",
            })

    return errors


def extract_json_from_response(response: str) -> Optional[Dict[str, Any]]:
    """
    Extract JSON from AI response.

    Handles various formats:
    - Plain JSON
    - JSON in code blocks
    - JSON with surrounding text

    Args:
        response: AI response text

    Returns:
        Parsed JSON dict or None if extraction fails
    """
    import re

    # Try to find JSON in code blocks first
    code_block_pattern = r"```(?:json)?\s*(\{.*?\})\s*```"
    matches = re.findall(code_block_pattern, response, re.DOTALL)

    if matches:
        try:
            return json.loads(matches[0])
        except json.JSONDecodeError:
            pass

    # Try to find JSON object directly
    json_pattern = r"\{.*\}"
    matches = re.findall(json_pattern, response, re.DOTALL)

    for match in matches:
        try:
            parsed = json.loads(match)
            # Verify it looks like a workflow
            if "nodes" in parsed or "workflow" in parsed:
                return parsed.get("workflow", parsed)
        except json.JSONDecodeError:
            continue

    # Try parsing entire response as JSON
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass

    return None
