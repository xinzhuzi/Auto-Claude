import asyncio
import pytest

from security.hooks import (
    DEFAULT_EDIT_LARGE_LINE_THRESHOLD,
    DEFAULT_LARGE_FILE_LINE_THRESHOLD,
    DEFAULT_READ_FILES_BEFORE_COMPRESSION,
    DEFAULT_READ_CHUNK_SUGGESTED_LIMIT,
    DEFAULT_WRITE_LARGE_LINE_THRESHOLD,
    context_compression_reset_hook,
    edit_large_content_guard_hook,
    read_large_file_guard_hook,
    write_large_content_guard_hook,
)


def _write_lines(path, line_count):
    path.write_text("\n".join(["x"] * line_count), encoding="utf-8")


def _run(coro):
    return asyncio.run(coro)


def test_read_guard_blocks_large_file_without_offsets(tmp_path):
    file_path = tmp_path / "large.txt"
    _write_lines(file_path, DEFAULT_LARGE_FILE_LINE_THRESHOLD + 1)

    result = _run(
        read_large_file_guard_hook(
            {
                "tool_name": "Read",
                "tool_input": {"file_path": str(file_path)},
                "cwd": str(tmp_path),
            },
            None,
            None,
        )
    )

    assert result.get("decision") == "block"
    assert "offset" in result.get("reason", "")


def test_read_guard_allows_large_file_with_offsets(tmp_path):
    file_path = tmp_path / "large.txt"
    _write_lines(file_path, DEFAULT_LARGE_FILE_LINE_THRESHOLD + 1)

    result = _run(
        read_large_file_guard_hook(
            {
                "tool_name": "Read",
                "tool_input": {
                    "file_path": str(file_path),
                    "offset": 0,
                    "limit": DEFAULT_READ_CHUNK_SUGGESTED_LIMIT,
                },
                "cwd": str(tmp_path),
            },
            None,
            None,
        )
    )

    assert result == {}


def test_read_guard_allows_small_file_without_offsets(tmp_path):
    file_path = tmp_path / "small.txt"
    _write_lines(file_path, 10)

    result = _run(
        read_large_file_guard_hook(
            {
                "tool_name": "Read",
                "tool_input": {"file_path": str(file_path)},
                "cwd": str(tmp_path),
            },
            None,
            None,
        )
    )

    assert result == {}


def test_write_guard_blocks_large_content():
    content = "\n".join(["x"] * (DEFAULT_WRITE_LARGE_LINE_THRESHOLD + 1))

    result = _run(
        write_large_content_guard_hook(
            {"tool_name": "Write", "tool_input": {"file_path": "out.txt", "content": content}},
            None,
            None,
        )
    )

    assert result.get("decision") == "block"
    assert "Large Write" in result.get("reason", "")


def test_edit_guard_blocks_large_insert():
    new_string = "\n".join(["x"] * (DEFAULT_EDIT_LARGE_LINE_THRESHOLD + 1))

    result = _run(
        edit_large_content_guard_hook(
            {
                "tool_name": "Edit",
                "tool_input": {
                    "file_path": "out.txt",
                    "old_string": "a",
                    "new_string": new_string,
                },
            },
            None,
            None,
        )
    )

    assert result.get("decision") == "block"
    assert "Large Edit" in result.get("reason", "")


def test_read_guard_blocks_after_threshold(tmp_path):
    for i in range(DEFAULT_READ_FILES_BEFORE_COMPRESSION):
        file_path = tmp_path / f"file_{i}.txt"
        _write_lines(file_path, 1)
        result = _run(
            read_large_file_guard_hook(
                {
                    "tool_name": "Read",
                    "tool_input": {"file_path": str(file_path)},
                    "cwd": str(tmp_path),
                },
                None,
                None,
            )
        )
        assert result == {}

    extra_path = tmp_path / "file_extra.txt"
    _write_lines(extra_path, 1)
    result = _run(
        read_large_file_guard_hook(
            {
                "tool_name": "Read",
                "tool_input": {"file_path": str(extra_path)},
                "cwd": str(tmp_path),
            },
            None,
            None,
        )
    )

    assert result.get("decision") == "block"
    assert "compress context" in result.get("reason", "").lower()


def test_read_guard_resets_after_analysis_write(tmp_path):
    for i in range(DEFAULT_READ_FILES_BEFORE_COMPRESSION):
        file_path = tmp_path / f"file_{i}.txt"
        _write_lines(file_path, 1)
        result = _run(
            read_large_file_guard_hook(
                {
                    "tool_name": "Read",
                    "tool_input": {"file_path": str(file_path)},
                    "cwd": str(tmp_path),
                },
                None,
                None,
            )
        )
        assert result == {}

    extra_path = tmp_path / "file_extra.txt"
    _write_lines(extra_path, 1)
    blocked = _run(
        read_large_file_guard_hook(
            {
                "tool_name": "Read",
                "tool_input": {"file_path": str(extra_path)},
                "cwd": str(tmp_path),
            },
            None,
            None,
        )
    )
    assert blocked.get("decision") == "block"

    analysis_dir = tmp_path / ".auto-claude" / "specs" / "test-task"
    analysis_dir.mkdir(parents=True, exist_ok=True)
    analysis_path = analysis_dir / "_analysis_01.md"

    reset_result = _run(
        context_compression_reset_hook(
            {
                "tool_name": "Write",
                "tool_input": {
                    "file_path": str(analysis_path),
                    "content": "summary",
                },
                "cwd": str(tmp_path),
            },
            None,
            None,
        )
    )
    assert reset_result == {}

    post_reset_path = tmp_path / "file_after.txt"
    _write_lines(post_reset_path, 1)
    result = _run(
        read_large_file_guard_hook(
            {
                "tool_name": "Read",
                "tool_input": {"file_path": str(post_reset_path)},
                "cwd": str(tmp_path),
            },
            None,
            None,
        )
    )
    assert result == {}
