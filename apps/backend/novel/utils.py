from __future__ import annotations

import re
from uuid import uuid4


def parse_outline_to_chapters(outline: str) -> list[dict]:
    """
    Parse outline text into chapter objects.

    Expected format:
    ### Chapter Title
    Chapter summary...
    """
    if not outline:
        return []

    chapters: list[dict] = []
    pattern = re.compile(r"###\s*(.+?)\n([\s\S]*?)(?=###|$)", re.MULTILINE)

    for match in pattern.finditer(outline):
        title = match.group(1).strip()
        summary = match.group(2).strip()
        chapters.append(
            {
                "id": str(uuid4()),
                "title": title,
                "outline": summary,
                "content": "",
                "generatedText": "",
                "status": "draft",
            }
        )

    return chapters


def extract_json_block(text: str) -> dict | None:
    """Extract the first JSON object from a text response."""
    if not text:
        return None
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    json_str = text[start : end + 1]
    try:
        import json

        return json.loads(json_str)
    except Exception:
        return None

