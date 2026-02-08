"""
Subtask Size Validator
======================

Validates subtask sizes and provides auto-splitting functionality to prevent
Write tool failures caused by output exceeding Claude's token limits.

The Problem:
- Claude has output token limits (~8000 tokens per response)
- Large subtasks (e.g., 50×50 matrices) cause truncated tool calls
- Truncated calls result in empty `file_path` and `content` parameters

Solution:
- Detect high-risk subtasks before execution
- Auto-split oversized subtasks when errors are detected
- Provide recovery mechanisms for stuck subtasks
"""

import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

# High-risk patterns that indicate potentially oversized subtasks
HIGH_RISK_PATTERNS = [
    # Quantity indicators (Chinese)
    r"[4-9]\d+个",  # 40+ items
    r"\d{3,}个",    # 100+ items
    r"所有",
    r"全部",
    r"完整列表",
    r"完整的",
    # Quantity indicators (English)
    r"\b(all|every|complete|comprehensive|exhaustive)\b",
    r"\b[4-9]\d+\s+(items?|entities?|entries?|records?)",
    r"\b\d{3,}\s+(items?|entities?|entries?|records?)",
    # Matrix/Table indicators
    r"[2-9]\d+\s*[×xX]\s*[2-9]\d+",  # 20×20 or larger
    r"\d{2,}\s*[×xX]\s*\d{2,}",       # Any 2+ digit × 2+ digit
    r"矩阵",
    r"关系表",
    r"对照表",
    # Combined tasks (multiple deliverables)
    r"同时.{5,}并且",
    r"以及.{10,}以及",
    r"\band\s+also\b",
]

# Compile patterns for efficiency
COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in HIGH_RISK_PATTERNS]

# Size thresholds
MAX_ENTITIES_PER_SUBTASK = 10
MAX_MATRIX_DIMENSION = 10
MAX_DETAILED_ITEMS = 5


def is_subtask_oversized(subtask: dict) -> tuple[bool, list[str]]:
    """
    Check if a subtask is likely to exceed output limits.

    Args:
        subtask: Subtask dictionary with 'description' field

    Returns:
        Tuple of (is_oversized, list of reasons)
    """
    description = subtask.get("description", "")
    reasons = []

    for pattern in COMPILED_PATTERNS:
        if pattern.search(description):
            reasons.append(f"High-risk pattern detected: {pattern.pattern}")

    # Check for explicit large numbers
    numbers = re.findall(r"\b(\d+)\b", description)
    for num_str in numbers:
        num = int(num_str)
        if num > 30:
            reasons.append(f"Large quantity detected: {num}")

    # Check for matrix notation
    matrix_match = re.search(r"(\d+)\s*[×xX]\s*(\d+)", description)
    if matrix_match:
        dim1, dim2 = int(matrix_match.group(1)), int(matrix_match.group(2))
        if dim1 > MAX_MATRIX_DIMENSION or dim2 > MAX_MATRIX_DIMENSION:
            reasons.append(f"Large matrix detected: {dim1}×{dim2}")

    return len(reasons) > 0, reasons


def suggest_split(subtask: dict) -> list[dict]:
    """
    Suggest how to split an oversized subtask.

    Args:
        subtask: The oversized subtask

    Returns:
        List of suggested smaller subtasks
    """
    description = subtask.get("description", "")
    subtask_id = subtask.get("id", "subtask-unknown")

    suggestions = []

    # Detect matrix tasks
    matrix_match = re.search(r"(\d+)\s*[×xX]\s*(\d+)", description)
    if matrix_match:
        dim1, dim2 = int(matrix_match.group(1)), int(matrix_match.group(2))
        suggestions.extend(_split_matrix_task(subtask_id, description, dim1, dim2))
        return suggestions

    # Detect quantity-based tasks
    quantity_match = re.search(r"(\d+)\s*个", description)
    if quantity_match:
        quantity = int(quantity_match.group(1))
        if quantity > MAX_ENTITIES_PER_SUBTASK:
            suggestions.extend(_split_quantity_task(subtask_id, description, quantity))
            return suggestions

    # Detect combined tasks (AND/以及)
    if re.search(r"(同时|并且|以及|and also)", description, re.IGNORECASE):
        suggestions.extend(_split_combined_task(subtask_id, description))
        return suggestions

    # Default: suggest manual review
    suggestions.append({
        "id": f"{subtask_id}-review",
        "description": f"[NEEDS MANUAL SPLIT] {description}",
        "status": "pending",
        "notes": "Auto-split could not determine optimal splitting strategy"
    })

    return suggestions


def _split_matrix_task(subtask_id: str, description: str, dim1: int, dim2: int) -> list[dict]:
    """Split a matrix-based task into smaller chunks."""
    suggestions = []
    suffix = ord('a')

    # Core matrix (top N×N where N = min(dim, 10))
    core_size = min(dim1, dim2, MAX_MATRIX_DIMENSION)
    suggestions.append({
        "id": f"{subtask_id}{chr(suffix)}",
        "description": f"Create core matrix (top {core_size}×{core_size})",
        "status": "pending"
    })
    suffix += 1

    # Relationships between core and rest
    if dim1 > core_size or dim2 > core_size:
        suggestions.append({
            "id": f"{subtask_id}{chr(suffix)}",
            "description": f"Create relationships between core ({core_size}) and secondary items",
            "status": "pending"
        })
        suffix += 1

    # Summary for remaining
    remaining = max(dim1, dim2) - core_size
    if remaining > 0:
        suggestions.append({
            "id": f"{subtask_id}{chr(suffix)}",
            "description": f"Create simplified relationship summary for remaining {remaining} items",
            "status": "pending"
        })

    return suggestions


def _split_quantity_task(subtask_id: str, description: str, quantity: int) -> list[dict]:
    """Split a quantity-based task into batches."""
    suggestions = []
    batch_size = MAX_ENTITIES_PER_SUBTASK
    suffix = ord('a')

    for start in range(1, quantity + 1, batch_size):
        end = min(start + batch_size - 1, quantity)
        # Replace the quantity in description with the batch range
        batch_desc = re.sub(
            r"\d+\s*个",
            f"items {start}-{end}",
            description
        )
        suggestions.append({
            "id": f"{subtask_id}{chr(suffix)}",
            "description": batch_desc,
            "status": "pending"
        })
        suffix += 1
        if suffix > ord('z'):
            suffix = ord('a')  # Wrap around if too many batches

    return suggestions


def _split_combined_task(subtask_id: str, description: str) -> list[dict]:
    """Split a task with multiple deliverables."""
    suggestions = []

    # Try to split on common conjunctions
    parts = re.split(r"[,，]?\s*(同时|并且|以及|and also|and)\s*", description, flags=re.IGNORECASE)
    parts = [p.strip() for p in parts if p.strip() and p.lower() not in ['同时', '并且', '以及', 'and also', 'and']]

    if len(parts) > 1:
        for i, part in enumerate(parts):
            suggestions.append({
                "id": f"{subtask_id}{chr(ord('a') + i)}",
                "description": part,
                "status": "pending"
            })
    else:
        # Couldn't split, return original with warning
        suggestions.append({
            "id": f"{subtask_id}-review",
            "description": f"[NEEDS MANUAL SPLIT] {description}",
            "status": "pending"
        })

    return suggestions


def validate_implementation_plan(plan_path: Path) -> dict:
    """
    Validate all subtasks in an implementation plan.

    Args:
        plan_path: Path to implementation_plan.json

    Returns:
        Dict with validation results and suggestions
    """
    if not plan_path.exists():
        return {"error": "Plan file not found", "valid": False}

    try:
        plan = json.loads(plan_path.read_text())
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON: {e}", "valid": False}

    results = {
        "valid": True,
        "warnings": [],
        "oversized_subtasks": [],
        "suggestions": {}
    }

    for phase in plan.get("phases", []):
        for subtask in phase.get("subtasks", []):
            is_oversized, reasons = is_subtask_oversized(subtask)
            if is_oversized:
                results["valid"] = False
                subtask_id = subtask.get("id", "unknown")
                results["oversized_subtasks"].append({
                    "id": subtask_id,
                    "phase": phase.get("id"),
                    "reasons": reasons
                })
                results["suggestions"][subtask_id] = suggest_split(subtask)
                results["warnings"].append(
                    f"Subtask {subtask_id} may exceed output limits: {', '.join(reasons)}"
                )

    return results


def auto_split_subtask(plan_path: Path, subtask_id: str) -> bool:
    """
    Automatically split an oversized subtask in the implementation plan.

    Args:
        plan_path: Path to implementation_plan.json
        subtask_id: ID of the subtask to split

    Returns:
        True if split was successful
    """
    if not plan_path.exists():
        logger.error(f"Plan file not found: {plan_path}")
        return False

    try:
        plan = json.loads(plan_path.read_text())
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in plan: {e}")
        return False

    # Find and split the subtask
    for phase in plan.get("phases", []):
        subtasks = phase.get("subtasks", [])
        for i, subtask in enumerate(subtasks):
            if subtask.get("id") == subtask_id:
                # Generate split suggestions
                new_subtasks = suggest_split(subtask)

                if not new_subtasks or (len(new_subtasks) == 1 and "-review" in new_subtasks[0].get("id", "")):
                    logger.warning(f"Could not auto-split subtask {subtask_id}")
                    return False

                # Copy relevant fields from original subtask
                for new_subtask in new_subtasks:
                    new_subtask["service"] = subtask.get("service", "all")
                    new_subtask["files_to_modify"] = subtask.get("files_to_modify", [])
                    new_subtask["files_to_create"] = []  # Will be determined per subtask
                    new_subtask["patterns_from"] = subtask.get("patterns_from", [])
                    new_subtask["verification"] = subtask.get("verification", {"type": "manual"})

                # Replace original subtask with split subtasks
                subtasks[i:i+1] = new_subtasks
                phase["subtasks"] = subtasks

                # Save updated plan
                plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False))
                logger.info(f"Split subtask {subtask_id} into {len(new_subtasks)} smaller subtasks")
                return True

    logger.error(f"Subtask {subtask_id} not found in plan")
    return False


def detect_empty_param_error(error_message: str) -> bool:
    """
    Detect if an error is caused by empty Write tool parameters.

    Args:
        error_message: The error message from tool execution

    Returns:
        True if this is an empty parameter error
    """
    patterns = [
        r"required parameter.*file_path.*missing",
        r"required parameter.*content.*missing",
        r"InputValidationError.*Write failed",
        r"missing required args.*file_path",
        r"missing required args.*content",
        r"Write missing required args",
        r"tool_call_error.*Write missing required args",
    ]

    for pattern in patterns:
        if re.search(pattern, error_message, re.IGNORECASE):
            return True

    return False
