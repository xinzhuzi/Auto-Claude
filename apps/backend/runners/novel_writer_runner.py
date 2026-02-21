#!/usr/bin/env python3
"""
Novel Writer Runner
===================

AI-powered novel writing helper for Auto-Claude.

Usage:
    python runners/novel_writer_runner.py --project /path/to/project --request /path/to/request.json
"""

import asyncio
import json
import sys
import uuid
from pathlib import Path

# Add auto-claude to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Validate platform-specific dependencies BEFORE any imports that might
# trigger graphiti_core -> real_ladybug -> pywintypes import chain (ACS-253)
from core.dependency_validator import validate_platform_dependencies

validate_platform_dependencies()

# Load .env file with centralized error handling
from cli.utils import import_dotenv

load_dotenv = import_dotenv()

env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

from debug import debug, debug_error
from phase_config import sanitize_thinking_level

from novel import (
    load_novel,
    save_novel,
    load_prompts,
    append_session,
    parse_outline_to_chapters,
    generate_outline,
    generate_chapter,
    generate_continue,
    generate_polish,
    generate_summary,
    generate_advice,
    generate_creative,
    generate_character,
    generate_world,
)


async def run_action(project_dir: Path, request: dict) -> dict:
    action = request.get("action")
    payload = request.get("payload", {})
    config = request.get("config", {})

    model = config.get("model", "sonnet")
    thinking_level = sanitize_thinking_level(config.get("thinkingLevel", "medium"))
    fast_mode = bool(config.get("fastMode", False))

    novel_dir = project_dir / ".auto-claude" / "novel"

    debug("novel_runner", "Starting action", action=action, model=model, thinking=thinking_level)

    # Ensure prompts file exists
    load_prompts(project_dir)

    novel = load_novel(project_dir)

    result_text: str | None = None

    if action == "outline":
        print("NOVEL_PHASE:OUTLINE")
        result_text = await generate_outline(payload, project_dir, novel_dir, model, thinking_level, fast_mode)
        novel["outline"] = result_text
        novel["chapters"] = parse_outline_to_chapters(result_text)
        novel["generatedContent"] = result_text
    elif action == "chapter":
        print("NOVEL_PHASE:CHAPTER")
        result_text = await generate_chapter(payload, project_dir, novel_dir, model, thinking_level, fast_mode)
        chapter_id = payload.get("chapterId")
        if chapter_id:
            chapter = next((c for c in novel.get("chapters", []) if c.get("id") == chapter_id), None)
        else:
            chapter = None

        if not chapter:
            chapter = {
                "id": chapter_id or "",
                "title": payload.get("chapterTitle", ""),
                "outline": payload.get("chapterOutline", ""),
                "content": "",
                "generatedText": "",
                "status": "draft",
            }
            novel.setdefault("chapters", []).append(chapter)

        chapter["generatedText"] = result_text
        novel["generatedContent"] = result_text
    elif action == "continue":
        print("NOVEL_PHASE:CONTINUE")
        result_text = await generate_continue(payload, project_dir, novel_dir, model, thinking_level, fast_mode)
        novel["generatedContent"] = result_text
    elif action == "polish":
        print("NOVEL_PHASE:POLISH")
        result_text = await generate_polish(payload, project_dir, novel_dir, model, thinking_level, fast_mode)
        novel["generatedContent"] = result_text
    elif action == "summary":
        print("NOVEL_PHASE:SUMMARY")
        result_text = await generate_summary(payload, project_dir, novel_dir, model, thinking_level, fast_mode)
        novel["generatedContent"] = result_text
    elif action == "advice":
        print("NOVEL_PHASE:ADVICE")
        result_text = await generate_advice(payload, project_dir, novel_dir, model, thinking_level, fast_mode)
        novel["generatedContent"] = result_text
    elif action == "creative":
        print("NOVEL_PHASE:CREATIVE")
        result_text = await generate_creative(payload, project_dir, novel_dir, model, thinking_level, fast_mode)
        novel["generatedContent"] = result_text
    elif action == "character":
        print("NOVEL_PHASE:CHARACTER")
        character = await generate_character(payload, project_dir, novel_dir, model, thinking_level, fast_mode)
        if character:
            character["id"] = character.get("id") or payload.get("characterId") or str(uuid.uuid4())
            novel.setdefault("characters", []).append(character)
            novel["generatedContent"] = json.dumps(character, ensure_ascii=False, indent=2)
        else:
            novel["generatedContent"] = ""
    elif action == "world":
        print("NOVEL_PHASE:WORLD")
        world = await generate_world(payload, project_dir, novel_dir, model, thinking_level, fast_mode)
        if world:
            world["id"] = world.get("id") or payload.get("worldId") or str(uuid.uuid4())
            novel.setdefault("worldSettings", []).append(world)
            novel["generatedContent"] = json.dumps(world, ensure_ascii=False, indent=2)
        else:
            novel["generatedContent"] = ""
    else:
        raise ValueError(f"Unsupported action: {action}")

    save_novel(project_dir, novel)

    append_session(
        project_dir,
        {
            "action": action,
            "model": model,
            "thinkingLevel": thinking_level,
        },
    )

    print("NOVEL_PHASE:COMPLETE")
    return novel


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="AI-powered novel writing helper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--project",
        type=Path,
        default=Path.cwd(),
        help="Project directory (default: current directory)",
    )
    parser.add_argument(
        "--request",
        type=Path,
        required=True,
        help="Path to request JSON file",
    )

    args = parser.parse_args()

    project_dir = args.project.resolve()
    if not project_dir.exists():
        print(f"Error: Project directory does not exist: {project_dir}")
        sys.exit(1)

    request_path = args.request.resolve()
    if not request_path.exists():
        print(f"Error: Request file does not exist: {request_path}")
        sys.exit(1)

    try:
        request = json.loads(request_path.read_text(encoding="utf-8"))
    except Exception as exc:
        debug_error("novel_runner", "Failed to read request JSON", error=str(exc))
        print(f"Error: Failed to read request JSON: {exc}")
        sys.exit(1)

    try:
        asyncio.run(run_action(project_dir, request))
        sys.exit(0)
    except KeyboardInterrupt:
        print("\nNovel generation interrupted.")
        sys.exit(1)
    except Exception as exc:
        debug_error("novel_runner", "Novel generation failed", error=str(exc))
        print(f"Error: Novel generation failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
