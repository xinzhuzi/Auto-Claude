"""
AI Skill Generator
==================

Generates Claude skill definitions from natural language descriptions.
"""

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, Optional

from claude_agent_sdk import ClaudeSDKClient
from debug import debug, debug_error, debug_success

from core.client import create_client
from agents.session import run_agent_session

from .ai_prompts import SKILL_GENERATION_PROMPT

logger = logging.getLogger(__name__)


async def generate_skill_from_description(
    description: str,
    skill_name: str,
    project_dir: Path,
    spec_dir: Path,
    context: str = "",
    model: str = "claude-sonnet-4-5-20250929",
) -> Dict[str, Any]:
    """
    Generate a Claude skill definition from natural language description.

    Args:
        description: Natural language description of the skill
        skill_name: Name for the skill (lowercase, alphanumeric, hyphens, underscores)
        context: Additional context about the skill's purpose
        project_dir: Project root directory (required)
        spec_dir: Spec directory for settings (required)
        model: Model to use for generation

    Returns:
        Dictionary containing:
        - success: bool - Whether generation succeeded
        - skill_markdown: str - Generated skill markdown content
        - skill_path: str - Path where skill should be saved
        - metadata: dict - Skill metadata (name, description, triggers)
        - error: str - Error message (if failed)
    """
    debug("ai_skill_generator", f"Generating skill: {skill_name}")
    debug("ai_skill_generator", f"Description: {description[:100]}...")

    try:
        # Validate skill name
        if not re.match(r"^[a-z0-9_-]+$", skill_name):
            raise ValueError(
                "Skill name must be lowercase alphanumeric with hyphens/underscores only"
            )

        # Create Claude SDK client
        client = create_client(
            project_dir=project_dir,
            spec_dir=spec_dir,
            model=model,
            agent_type="coder",
        )

        # Format skill generation prompt
        skill_prompt = SKILL_GENERATION_PROMPT(
            skill_name=skill_name,
            description=description,
            context=context,
        )

        async with client:
            # Call Claude SDK
            status, response, _ = await run_agent_session(
                client=client,
                message=skill_prompt,
                spec_dir=spec_dir,
                verbose=False,
            )

        if status == "error":
            raise RuntimeError(f"AI skill generation failed: {response}")

        # Extract skill markdown from response
        skill_markdown = extract_skill_markdown(response)

        if not skill_markdown:
            raise ValueError("Failed to extract valid skill markdown from AI response")

        # Validate skill format
        validation_result = validate_skill_format(skill_markdown)

        if not validation_result.get("valid"):
            debug_error("ai_skill_generator", "Generated skill failed validation")
            return {
                "success": False,
                "error": "Generated skill failed validation",
                "validation_errors": validation_result.get("errors", []),
            }

        # Extract metadata
        metadata = extract_skill_metadata(skill_markdown)

        # Determine skill path
        skill_path = determine_skill_path(skill_name, project_dir)

        debug_success("ai_skill_generator", f"Skill generation complete: {skill_name}")

        return {
            "success": True,
            "skill_markdown": skill_markdown,
            "skill_path": str(skill_path),
            "metadata": metadata,
        }

    except Exception as e:
        error_msg = f"Failed to generate skill: {str(e)}"
        debug_error("ai_skill_generator", error_msg)
        logger.exception(error_msg)

        return {
            "success": False,
            "error": error_msg,
        }


def extract_skill_markdown(response: str) -> Optional[str]:
    """
    Extract skill markdown from AI response.

    Handles various formats:
    - Markdown code blocks (```markdown ... ```)
    - Plain markdown
    - Markdown with surrounding text

    Args:
        response: AI response text

    Returns:
        Extracted skill markdown or None
    """
    # Try markdown code blocks first
    markdown_block_pattern = r"```(?:markdown|md)?\s*(.*?)\s*```"
    matches = re.findall(markdown_block_pattern, response, re.DOTALL | re.IGNORECASE)

    if matches:
        # Return the first markdown block
        return matches[0].strip()

    # Try to find skill markdown by looking for characteristic headers
    # Skills typically start with "# Skill Name" or "## Description"
    skill_pattern = r"(#\s+.+?\n.*?)(?:\n\n---|\Z)"
    matches = re.findall(skill_pattern, response, re.DOTALL)

    if matches:
        return matches[0].strip()

    # If no patterns match, check if the entire response looks like markdown
    if response.strip().startswith("#"):
        return response.strip()

    return None


def validate_skill_format(skill_markdown: str) -> Dict[str, Any]:
    """
    Validate skill markdown format.

    Checks for:
    - Required sections (Description, Instructions)
    - Proper markdown structure
    - Valid frontmatter (if present)

    Args:
        skill_markdown: Skill markdown content

    Returns:
        Dictionary with validation result:
        - valid: bool
        - errors: list of error messages
    """
    errors = []

    # Check for required sections
    required_sections = ["description", "instructions"]
    markdown_lower = skill_markdown.lower()

    for section in required_sections:
        # Look for section headers (## Description, ## Instructions, etc.)
        if f"## {section}" not in markdown_lower and f"# {section}" not in markdown_lower:
            errors.append(f"Missing required section: {section}")

    # Check for at least one heading
    if not re.search(r"^#+\s+.+$", skill_markdown, re.MULTILINE):
        errors.append("Skill must have at least one heading")

    # Check for minimum content length
    if len(skill_markdown.strip()) < 100:
        errors.append("Skill content is too short (minimum 100 characters)")

    # Validate frontmatter if present
    if skill_markdown.strip().startswith("---"):
        frontmatter_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", skill_markdown, re.DOTALL)
        if not frontmatter_match:
            errors.append("Invalid frontmatter format")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
    }


def extract_skill_metadata(skill_markdown: str) -> Dict[str, Any]:
    """
    Extract metadata from skill markdown.

    Extracts:
    - Skill name (from first heading)
    - Description (from Description section)
    - Trigger keywords (from content analysis)

    Args:
        skill_markdown: Skill markdown content

    Returns:
        Dictionary with metadata
    """
    metadata = {
        "name": "",
        "description": "",
        "triggers": [],
    }

    # Extract skill name from first heading
    name_match = re.search(r"^#+\s+(.+)$", skill_markdown, re.MULTILINE)
    if name_match:
        metadata["name"] = name_match.group(1).strip()

    # Extract description from Description section
    desc_match = re.search(
        r"##?\s+Description\s*\n+(.*?)(?=\n##|\Z)",
        skill_markdown,
        re.DOTALL | re.IGNORECASE,
    )
    if desc_match:
        description = desc_match.group(1).strip()
        # Take first paragraph or first 200 characters
        first_para = description.split("\n\n")[0]
        metadata["description"] = first_para[:200]

    # Extract trigger keywords from content
    # Look for common trigger patterns
    trigger_patterns = [
        r"(?:use|invoke|call|trigger)\s+(?:this\s+)?(?:skill\s+)?(?:when|for|to)\s+(.+?)(?:\.|$)",
        r"(?:when|if)\s+(?:you\s+)?(?:need|want)\s+to\s+(.+?)(?:\.|$)",
    ]

    for pattern in trigger_patterns:
        matches = re.findall(pattern, skill_markdown, re.IGNORECASE)
        metadata["triggers"].extend([m.strip() for m in matches])

    # Deduplicate and limit triggers
    metadata["triggers"] = list(set(metadata["triggers"]))[:5]

    return metadata


def determine_skill_path(skill_name: str, project_dir: Path) -> Path:
    """
    Determine the file path where the skill should be saved.

    Args:
        skill_name: Name of the skill
        project_dir: Project root directory (required)

    Returns:
        Path object for the skill file
    """
    # Skills are saved in .claude/skills/ directory
    skills_dir = project_dir / ".claude" / "skills"
    skills_dir.mkdir(parents=True, exist_ok=True)

    # Skill file name is skill_name.md
    skill_file = skills_dir / f"{skill_name}.md"

    return skill_file


async def save_skill_to_file(
    skill_markdown: str,
    skill_path: Path,
    overwrite: bool = False,
) -> Dict[str, Any]:
    """
    Save skill markdown to file.

    Args:
        skill_markdown: Skill markdown content
        skill_path: Path where skill should be saved
        overwrite: Whether to overwrite existing file

    Returns:
        Dictionary containing:
        - success: bool
        - path: str - Path where skill was saved
        - error: str - Error message (if failed)
    """
    try:
        # Check if file exists
        if skill_path.exists() and not overwrite:
            return {
                "success": False,
                "error": f"Skill file already exists: {skill_path}",
            }

        # Ensure parent directory exists
        skill_path.parent.mkdir(parents=True, exist_ok=True)

        # Write skill to file
        skill_path.write_text(skill_markdown, encoding="utf-8")

        debug_success("ai_skill_generator", f"Skill saved to: {skill_path}")

        return {
            "success": True,
            "path": str(skill_path),
        }

    except Exception as e:
        error_msg = f"Failed to save skill: {str(e)}"
        debug_error("ai_skill_generator", error_msg)
        logger.exception(error_msg)

        return {
            "success": False,
            "error": error_msg,
        }


async def generate_and_save_skill(
    description: str,
    skill_name: str,
    context: str = "",
    project_dir: Path,
    spec_dir: Path,
    model: str = "claude-sonnet-4-5-20250929",
    overwrite: bool = False,
) -> Dict[str, Any]:
    """
    Generate skill and save to file in one operation.

    Args:
        description: Natural language description of the skill
        skill_name: Name for the skill
        context: Additional context
        project_dir: Project root directory (required)
        spec_dir: Spec directory for settings (required)
        model: Model to use
        overwrite: Whether to overwrite existing file

    Returns:
        Dictionary containing generation and save results
    """
    # Generate skill
    generation_result = await generate_skill_from_description(
        description=description,
        skill_name=skill_name,
        context=context,
        project_dir=project_dir,
        spec_dir=spec_dir,
        model=model,
    )

    if not generation_result.get("success"):
        return generation_result

    # Save skill to file
    skill_path = Path(generation_result["skill_path"])
    save_result = await save_skill_to_file(
        skill_markdown=generation_result["skill_markdown"],
        skill_path=skill_path,
        overwrite=overwrite,
    )

    if not save_result.get("success"):
        return {
            "success": False,
            "error": save_result.get("error"),
            "skill_markdown": generation_result["skill_markdown"],
            "metadata": generation_result["metadata"],
        }

    # Combine results
    return {
        "success": True,
        "skill_markdown": generation_result["skill_markdown"],
        "skill_path": save_result["path"],
        "metadata": generation_result["metadata"],
    }
