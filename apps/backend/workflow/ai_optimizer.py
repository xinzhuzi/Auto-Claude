"""
AI Workflow Optimizer
=====================

Optimizes existing workflows through iterative AI-powered refinement.
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

from .ai_prompts import format_workflow_optimization_prompt
from .ai_generator import validate_workflow, extract_json_from_response

logger = logging.getLogger(__name__)


async def optimize_workflow(
    workflow: Dict[str, Any],
    optimization_request: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    project_dir: Path,
    spec_dir: Path,
    model: str = "claude-sonnet-4-5-20250929",
) -> Dict[str, Any]:
    """
    Optimize an existing workflow based on user request.

    Uses Claude SDK to analyze workflow and suggest improvements.

    Args:
        workflow: Current workflow JSON
        optimization_request: User's optimization request
        conversation_history: Previous conversation messages
        project_dir: Project root directory (required)
        spec_dir: Spec directory for settings (required)
        model: Model to use for optimization

    Returns:
        Dictionary containing:
        - success: bool - Whether optimization succeeded
        - workflow: dict - Optimized workflow JSON (if successful)
        - summary: str - Summary of changes
        - improvements: list - List of improvements made
        - error: str - Error message (if failed)
    """
    debug("ai_optimizer", f"Optimizing workflow: {workflow.get('name', 'Unnamed')}")
    debug("ai_optimizer", f"Request: {optimization_request[:100]}...")

    try:
        # Create Claude SDK client
        client = create_client(
            project_dir=project_dir,
            spec_dir=spec_dir,
            model=model,
            agent_type="coder",
        )

        # Format optimization prompt
        optimization_prompt = format_workflow_optimization_prompt(
            workflow=workflow,
            optimization_request=optimization_request,
            conversation_history=conversation_history or [],
        )

        # Call Claude SDK
        status, response = await run_agent_session(
            client=client,
            message=optimization_prompt,
            spec_dir=spec_dir,
            verbose=False,
        )

        if status != "success":
            raise RuntimeError(f"AI optimization failed: {response}")

        # Extract optimization result from response
        optimization_result = extract_json_from_response(response)

        if not optimization_result:
            raise ValueError("Failed to extract valid JSON from AI response")

        # Extract components
        summary = optimization_result.get("summary", "Workflow optimized")
        optimized_workflow = optimization_result.get("workflow")
        improvements = optimization_result.get("improvements", [])

        if not optimized_workflow:
            raise ValueError("No workflow in optimization result")

        debug("ai_optimizer", f"Optimization complete: {summary}")

        # Validate optimized workflow
        validation_result = await validate_workflow(
            workflow=optimized_workflow,
            client=client,
            spec_dir=spec_dir,
        )

        if not validation_result.get("valid"):
            debug_error("ai_optimizer", "Optimized workflow failed validation")
            return {
                "success": False,
                "error": "Optimized workflow failed validation",
                "validation_errors": validation_result.get("errors", []),
            }

        # Preserve metadata
        optimized_workflow["id"] = workflow.get("id") or str(uuid.uuid4())
        optimized_workflow["createdAt"] = workflow.get("createdAt")
        optimized_workflow["updatedAt"] = None

        debug_success("ai_optimizer", f"Workflow optimization complete")

        return {
            "success": True,
            "workflow": optimized_workflow,
            "summary": summary,
            "improvements": improvements,
            "suggestions": validation_result.get("suggestions", []),
        }

    except Exception as e:
        error_msg = f"Failed to optimize workflow: {str(e)}"
        debug_error("ai_optimizer", error_msg)
        logger.exception(error_msg)

        return {
            "success": False,
            "error": error_msg,
        }


async def analyze_workflow(
    workflow: Dict[str, Any],
    project_dir: Path,
    spec_dir: Path,
    model: str = "claude-sonnet-4-5-20250929",
) -> Dict[str, Any]:
    """
    Analyze workflow and provide insights without modifying it.

    Args:
        workflow: Workflow JSON to analyze
        project_dir: Project root directory (required)
        spec_dir: Spec directory for settings (required)
        model: Model to use for analysis

    Returns:
        Dictionary containing:
        - success: bool - Whether analysis succeeded
        - insights: list - List of insights about the workflow
        - suggestions: list - Suggested improvements
        - metrics: dict - Workflow metrics (complexity, etc.)
        - error: str - Error message (if failed)
    """
    debug("ai_optimizer", f"Analyzing workflow: {workflow.get('name', 'Unnamed')}")

    try:
        # Create Claude SDK client
        client = create_client(
            project_dir=project_dir,
            spec_dir=spec_dir,
            model=model,
            agent_type="coder",
        )

        # Create analysis prompt
        analysis_prompt = f"""Analyze this workflow and provide insights.

Workflow:
{json.dumps(workflow, indent=2)}

Provide:
1. Key insights about the workflow structure and logic
2. Potential issues or concerns
3. Suggested improvements
4. Complexity metrics

Format as JSON:
{{
  "insights": [
    {{"type": "positive|negative|neutral", "message": "..."}}
  ],
  "suggestions": [
    {{"priority": "high|medium|low", "message": "..."}}
  ],
  "metrics": {{
    "node_count": number,
    "edge_count": number,
    "complexity": "low|medium|high",
    "estimated_duration": "short|medium|long"
  }}
}}
"""

        # Call Claude SDK
        status, response = await run_agent_session(
            client=client,
            message=analysis_prompt,
            spec_dir=spec_dir,
            verbose=False,
        )

        if status != "success":
            raise RuntimeError(f"AI analysis failed: {response}")

        # Extract analysis result
        analysis_result = extract_json_from_response(response)

        if not analysis_result:
            # Fallback to basic metrics
            analysis_result = {
                "insights": [],
                "suggestions": [],
                "metrics": calculate_basic_metrics(workflow),
            }

        debug_success("ai_optimizer", "Workflow analysis complete")

        return {
            "success": True,
            "insights": analysis_result.get("insights", []),
            "suggestions": analysis_result.get("suggestions", []),
            "metrics": analysis_result.get("metrics", {}),
        }

    except Exception as e:
        error_msg = f"Failed to analyze workflow: {str(e)}"
        debug_error("ai_optimizer", error_msg)
        logger.exception(error_msg)

        return {
            "success": False,
            "error": error_msg,
        }


def calculate_basic_metrics(workflow: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate basic workflow metrics.

    Args:
        workflow: Workflow JSON

    Returns:
        Dictionary of metrics
    """
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])

    node_count = len(nodes)
    edge_count = len(edges)

    # Calculate complexity based on node count and branching
    branch_nodes = [n for n in nodes if n.get("type") in ["ifElse", "switch", "branch"]]
    complexity_score = node_count + (len(branch_nodes) * 2)

    if complexity_score < 5:
        complexity = "low"
    elif complexity_score < 15:
        complexity = "medium"
    else:
        complexity = "high"

    # Estimate duration based on node types
    async_nodes = [n for n in nodes if n.get("type") in ["subAgent", "mcp", "skill"]]
    if len(async_nodes) > 5:
        estimated_duration = "long"
    elif len(async_nodes) > 2:
        estimated_duration = "medium"
    else:
        estimated_duration = "short"

    return {
        "node_count": node_count,
        "edge_count": edge_count,
        "complexity": complexity,
        "estimated_duration": estimated_duration,
        "branch_count": len(branch_nodes),
        "async_node_count": len(async_nodes),
    }


async def suggest_optimizations(
    workflow: Dict[str, Any],
    focus_area: Optional[str] = None,
    project_dir: Path,
    spec_dir: Path,
    model: str = "claude-sonnet-4-5-20250929",
) -> Dict[str, Any]:
    """
    Get optimization suggestions without applying them.

    Args:
        workflow: Workflow JSON
        focus_area: Optional focus area (performance, reliability, clarity, maintainability)
        project_dir: Project root directory (required)
        spec_dir: Spec directory for settings (required)
        model: Model to use

    Returns:
        Dictionary containing:
        - success: bool
        - suggestions: list - List of optimization suggestions
        - error: str - Error message (if failed)
    """
    debug("ai_optimizer", f"Getting optimization suggestions for: {workflow.get('name', 'Unnamed')}")

    try:
        # Create Claude SDK client
        client = create_client(
            project_dir=project_dir,
            spec_dir=spec_dir,
            model=model,
            agent_type="coder",
        )

        # Create suggestion prompt
        focus_text = f" Focus on {focus_area}." if focus_area else ""
        suggestion_prompt = f"""Suggest optimizations for this workflow.{focus_text}

Workflow:
{json.dumps(workflow, indent=2)}

Provide specific, actionable suggestions.

Format as JSON:
{{
  "suggestions": [
    {{
      "type": "performance|reliability|clarity|maintainability",
      "priority": "high|medium|low",
      "title": "Brief title",
      "description": "Detailed description",
      "impact": "Expected impact"
    }}
  ]
}}
"""

        # Call Claude SDK
        status, response = await run_agent_session(
            client=client,
            message=suggestion_prompt,
            spec_dir=spec_dir,
            verbose=False,
        )

        if status != "success":
            raise RuntimeError(f"AI suggestion failed: {response}")

        # Extract suggestions
        result = extract_json_from_response(response)

        if not result:
            return {
                "success": True,
                "suggestions": [],
            }

        debug_success("ai_optimizer", f"Generated {len(result.get('suggestions', []))} suggestions")

        return {
            "success": True,
            "suggestions": result.get("suggestions", []),
        }

    except Exception as e:
        error_msg = f"Failed to get suggestions: {str(e)}"
        debug_error("ai_optimizer", error_msg)
        logger.exception(error_msg)

        return {
            "success": False,
            "error": error_msg,
        }
