from __future__ import annotations

import json
from pathlib import Path

from .defaults import DEFAULT_PROMPTS, _now_iso, default_novel

NOVEL_DIR_NAME = ".auto-claude/novel"
NOVEL_FILE_NAME = "novel.json"
PROMPTS_FILE_NAME = "prompts.json"
SESSIONS_FILE_NAME = "sessions.json"


def ensure_novel_dir(project_dir: Path) -> Path:
    novel_dir = Path(project_dir) / NOVEL_DIR_NAME
    novel_dir.mkdir(parents=True, exist_ok=True)
    return novel_dir


def _load_json(path: Path, default: dict) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_novel(project_dir: Path) -> dict:
    novel_dir = ensure_novel_dir(project_dir)
    novel_path = novel_dir / NOVEL_FILE_NAME

    if not novel_path.exists():
        novel = default_novel()
        _save_json(novel_path, novel)
        return novel

    novel = _load_json(novel_path, default_novel())
    # Ensure required fields
    if "id" not in novel:
        novel["id"] = default_novel()["id"]
    if "createdAt" not in novel:
        novel["createdAt"] = _now_iso()
    if "updatedAt" not in novel:
        novel["updatedAt"] = _now_iso()

    return novel


def save_novel(project_dir: Path, novel: dict) -> None:
    novel_dir = ensure_novel_dir(project_dir)
    novel_path = novel_dir / NOVEL_FILE_NAME
    novel["updatedAt"] = _now_iso()
    _save_json(novel_path, novel)


def load_prompts(project_dir: Path) -> dict:
    novel_dir = ensure_novel_dir(project_dir)
    prompts_path = novel_dir / PROMPTS_FILE_NAME

    if not prompts_path.exists():
        _save_json(prompts_path, DEFAULT_PROMPTS)
        return DEFAULT_PROMPTS

    return _load_json(prompts_path, DEFAULT_PROMPTS)


def save_prompts(project_dir: Path, prompts: dict) -> None:
    novel_dir = ensure_novel_dir(project_dir)
    prompts_path = novel_dir / PROMPTS_FILE_NAME
    _save_json(prompts_path, prompts)


def load_sessions(project_dir: Path) -> dict:
    novel_dir = ensure_novel_dir(project_dir)
    sessions_path = novel_dir / SESSIONS_FILE_NAME
    if not sessions_path.exists():
        data = {"sessions": []}
        _save_json(sessions_path, data)
        return data
    return _load_json(sessions_path, {"sessions": []})


def append_session(project_dir: Path, session: dict) -> None:
    data = load_sessions(project_dir)
    sessions = data.get("sessions", [])
    sessions.append(session)
    data["sessions"] = sessions[-200:]
    novel_dir = ensure_novel_dir(project_dir)
    sessions_path = novel_dir / SESSIONS_FILE_NAME
    _save_json(sessions_path, data)

