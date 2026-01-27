"""
Spec Writing and Critique Phase Implementations
================================================

Phases for spec document creation and quality assurance.
"""

import json
import re
from pathlib import Path
from typing import TYPE_CHECKING

from .. import validator, writer
from .models import MAX_RETRIES, PhaseResult

if TYPE_CHECKING:
    pass


class SpecPhaseMixin:
    """Mixin for spec writing and critique phase methods."""

    async def phase_quick_spec(self) -> PhaseResult:
        """Quick spec for simple tasks - combines context and spec in one step."""
        spec_file = self.spec_dir / "spec.md"
        plan_file = self.spec_dir / "implementation_plan.json"

        if spec_file.exists() and plan_file.exists():
            self.ui.print_status("Quick spec already exists", "success")
            return PhaseResult(
                "quick_spec", True, [str(spec_file), str(plan_file)], [], 0
            )

        errors = []
        for attempt in range(MAX_RETRIES):
            self.ui.print_status(
                f"Running quick spec agent (attempt {attempt + 1})...", "progress"
            )

            context_str = f"""
**Task**: {self.task_description}
**Spec Directory**: {self.spec_dir}
**Complexity**: SIMPLE (1-2 files expected)

This is a SIMPLE task. Create a minimal spec and implementation plan directly.
No research or extensive analysis needed.

Create:
1. A concise spec.md with just the essential sections
2. A simple implementation_plan.json with 1-2 subtasks
"""
            success, output = await self.run_agent_fn(
                "spec_quick.md",
                additional_context=context_str,
                phase_name="quick_spec",
            )

            if success and spec_file.exists():
                # Create minimal plan if agent didn't
                if not plan_file.exists():
                    writer.create_minimal_plan(self.spec_dir, self.task_description)

                self.ui.print_status("Quick spec created", "success")
                return PhaseResult(
                    "quick_spec", True, [str(spec_file), str(plan_file)], [], attempt
                )

            errors.append(f"Attempt {attempt + 1}: Quick spec agent failed")

        return PhaseResult("quick_spec", False, [], errors, MAX_RETRIES)

    async def phase_spec_writing(self) -> PhaseResult:
        """Write the spec.md document - supports chunked mode for large specs."""
        spec_file = self.spec_dir / "spec.md"

        if spec_file.exists():
            result = self.spec_validator.validate_spec_document()
            if result.valid:
                self.ui.print_status("spec.md already exists and is valid", "success")
                return PhaseResult("spec_writing", True, [str(spec_file)], [], 0)
            self.ui.print_status(
                "spec.md exists but has issues, regenerating...", "warning"
            )

        # Check if chunking is needed
        assessment = self._load_complexity_assessment()
        if assessment and assessment.get("requires_chunking", False):
            return await self._write_spec_chunked(spec_file, assessment)
        else:
            return await self._write_spec_single_shot(spec_file)

    async def _write_spec_single_shot(self, spec_file: Path) -> PhaseResult:
        """Single-shot spec writing mode (original logic)."""
        errors = []
        for attempt in range(MAX_RETRIES):
            self.ui.print_status(
                f"Running spec writer (attempt {attempt + 1})...", "progress"
            )

            success, output = await self.run_agent_fn(
                "spec_writer.md",
                phase_name="spec_writing",
            )

            if success and spec_file.exists():
                result = self.spec_validator.validate_spec_document()
                if result.valid:
                    self.ui.print_status("Created valid spec.md", "success")
                    return PhaseResult(
                        "spec_writing", True, [str(spec_file)], [], attempt
                    )
                else:
                    errors.append(
                        f"Attempt {attempt + 1}: Spec invalid - {result.errors}"
                    )
                    self.ui.print_status(
                        f"Spec created but invalid: {result.errors}", "error"
                    )
            else:
                errors.append(f"Attempt {attempt + 1}: Agent did not create spec.md")

        return PhaseResult("spec_writing", False, [], errors, MAX_RETRIES)

    async def _write_spec_chunked(
        self, spec_file: Path, assessment: dict
    ) -> PhaseResult:
        """Chunked spec writing mode for large specs."""
        num_chunks = assessment.get("suggested_chunks", 2)
        strategy = assessment.get("chunking_strategy", "medium")

        self.ui.print_status(
            f"Using chunked mode: {num_chunks} chunks ({strategy} strategy)", "info"
        )

        # Create chunks directory
        chunks_dir = self.spec_dir / "chunks"
        chunks_dir.mkdir(exist_ok=True)

        # Clean up old chunk files
        for old_chunk in chunks_dir.glob("chunk_*.md"):
            old_chunk.unlink()

        # Remove existing spec.md to prevent AI from reading it
        if spec_file.exists():
            spec_file.unlink()

        errors = []
        successful_chunks = []

        for chunk_idx in range(1, num_chunks + 1):
            section_range = self._determine_section_range(chunk_idx, num_chunks)

            context_str = f"""
## Chunked Spec Writing

**Part**: {chunk_idx} of {num_chunks}
**Sections to Write**: {section_range}
**Output File**: chunks/chunk_{chunk_idx}.md
**Strategy**: {strategy}

Write ONLY the sections assigned to you. Do NOT write the entire spec.
Do NOT create or write to spec.md - only write to chunks/chunk_{chunk_idx}.md
"""

            chunk_success = False
            for attempt in range(MAX_RETRIES):
                self.ui.print_status(
                    f"Writing chunk {chunk_idx}/{num_chunks} (attempt {attempt + 1})...",
                    "progress",
                )

                success, output = await self.run_agent_fn(
                    "spec_phases_writer.md",
                    additional_context=context_str,
                    phase_name=f"spec_chunk_{chunk_idx}",
                )

                chunk_file = chunks_dir / f"chunk_{chunk_idx}.md"

                # Check if AI mistakenly created spec.md
                if spec_file.exists():
                    self.ui.print_status(
                        f"Warning: AI created spec.md during chunk {chunk_idx}, removing...",
                        "warning",
                    )
                    spec_file.unlink()

                if success and chunk_file.exists():
                    if self._sanity_check_chunk(chunk_file, chunk_idx, num_chunks):
                        chunk_success = True
                        successful_chunks.append(chunk_file)
                        self.ui.print_status(
                            f"Chunk {chunk_idx}/{num_chunks} completed", "success"
                        )
                        break
                    else:
                        errors.append(
                            f"Chunk {chunk_idx} attempt {attempt + 1}: Invalid format"
                        )
                else:
                    errors.append(
                        f"Chunk {chunk_idx} attempt {attempt + 1}: Failed to create"
                    )

            if not chunk_success:
                self.ui.print_status(
                    f"Failed to create chunk {chunk_idx} after {MAX_RETRIES} attempts",
                    "error",
                )

        # Check if we have enough chunks to merge
        if len(successful_chunks) < num_chunks:
            self.ui.print_status(
                f"Only {len(successful_chunks)}/{num_chunks} chunks created", "warning"
            )

        if len(successful_chunks) == 0:
            return PhaseResult(
                "spec_writing", False, [], ["No chunks were created"], MAX_RETRIES
            )

        # Merge all chunks
        self.ui.print_status("Merging chunks...", "progress")
        merged_content = self._merge_spec_chunks(chunks_dir, num_chunks)

        # Write final spec.md
        with open(spec_file, "w", encoding="utf-8") as f:
            f.write(merged_content)

        # Validate final result
        result = self.spec_validator.validate_spec_document()
        if result.valid:
            self.ui.print_status("Created valid spec.md from chunks", "success")
            return PhaseResult("spec_writing", True, [str(spec_file)], [], 0)
        else:
            self.ui.print_status(
                f"Merged spec invalid: {result.errors}", "warning"
            )
            return PhaseResult(
                "spec_writing",
                False,
                [str(spec_file)],
                [f"Merged spec invalid: {result.errors}"],
                0,
            )

    def _load_complexity_assessment(self) -> dict | None:
        """Load complexity assessment from file."""
        assessment_file = self.spec_dir / "complexity_assessment.json"
        if assessment_file.exists():
            with open(assessment_file, encoding="utf-8") as f:
                return json.load(f)
        return None

    def _determine_section_range(self, part_num: int, total_parts: int) -> str:
        """Determine which sections each chunk should write."""
        # Sections from spec_writer.md template
        sections = [
            "Overview",
            "Workflow Type",
            "Task Scope",
            "Service Context",
            "Files to Modify",
            "Files to Reference",
            "Patterns to Follow",
            "Requirements",
            "Implementation Notes",
            "Development Environment",
            "Success Criteria",
            "QA Acceptance Criteria",
        ]

        total_sections = len(sections)
        sections_per_part = total_sections // total_parts
        remainder = total_sections % total_parts

        start_idx = (part_num - 1) * sections_per_part + min(part_num - 1, remainder)
        end_idx = start_idx + sections_per_part + (1 if part_num <= remainder else 0)

        start_section = sections[start_idx]
        end_section = sections[min(end_idx - 1, total_sections - 1)]

        return f"{start_section} to {end_section}"

    def _sanity_check_chunk(
        self, chunk_file: Path, chunk_idx: int, num_chunks: int
    ) -> bool:
        """Perform basic validation on a chunk file."""
        try:
            content = chunk_file.read_text(encoding="utf-8")

            # Check minimum size
            if len(content) < 100:
                return False

            # Check for PART start marker
            if f"<!-- PART {chunk_idx} START -->" not in content:
                return False

            # Check for end marker
            if chunk_idx == num_chunks:
                if "<!-- FINAL PART -->" not in content:
                    return False
            else:
                if f"<!-- PART {chunk_idx} END -->" not in content:
                    return False

            return True
        except Exception:
            return False

    def _merge_spec_chunks(self, chunks_dir: Path, num_chunks: int) -> str:
        """Merge all chunk files into final spec content."""
        merged_parts = []

        for chunk_idx in range(1, num_chunks + 1):
            chunk_file = chunks_dir / f"chunk_{chunk_idx}.md"
            if not chunk_file.exists():
                continue

            content = chunk_file.read_text(encoding="utf-8")

            # Remove PART markers
            content = re.sub(r"<!-- PART \d+ START -->\n?", "", content)
            content = re.sub(r"<!-- PART \d+ END -->\n?", "", content)
            content = re.sub(r"<!-- FINAL PART -->\n?", "", content)

            merged_parts.append(content.strip())

        # Join parts and deduplicate headers
        merged = "\n\n".join(merged_parts)
        merged = self._deduplicate_headers(merged)

        return merged

    def _deduplicate_headers(self, content: str) -> str:
        """Remove duplicate markdown headers."""
        lines = content.split("\n")
        seen_headers = set()
        result = []

        for line in lines:
            if line.startswith("#"):
                if line in seen_headers:
                    continue
                seen_headers.add(line)
            result.append(line)

        return "\n".join(result)

    async def phase_self_critique(self) -> PhaseResult:
        """Self-critique the spec using extended thinking."""
        spec_file = self.spec_dir / "spec.md"
        research_file = self.spec_dir / "research.json"
        critique_file = self.spec_dir / "critique_report.json"

        if not spec_file.exists():
            self.ui.print_status("No spec.md to critique", "error")
            return PhaseResult(
                "self_critique", False, [], ["spec.md does not exist"], 0
            )

        if critique_file.exists():
            with open(critique_file, encoding="utf-8") as f:
                critique = json.load(f)
                if critique.get("issues_fixed", False) or critique.get(
                    "no_issues_found", False
                ):
                    self.ui.print_status("Self-critique already completed", "success")
                    return PhaseResult(
                        "self_critique", True, [str(critique_file)], [], 0
                    )

        errors = []
        for attempt in range(MAX_RETRIES):
            self.ui.print_status(
                f"Running self-critique agent (attempt {attempt + 1})...", "progress"
            )

            context_str = f"""
**Spec File**: {spec_file}
**Research File**: {research_file}
**Critique Output**: {critique_file}

Use EXTENDED THINKING (ultrathink) to deeply analyze the spec.md:

1. **Technical Accuracy**: Do code examples match the research findings?
2. **Completeness**: Are all requirements covered? Edge cases handled?
3. **Consistency**: Do package names, APIs, and patterns match throughout?
4. **Feasibility**: Is the implementation approach realistic?

For each issue found:
- Fix it directly in spec.md
- Document what was fixed in critique_report.json

Output critique_report.json with:
{{
  "issues_found": [...],
  "issues_fixed": true/false,
  "no_issues_found": true/false,
  "critique_summary": "..."
}}
"""
            success, output = await self.run_agent_fn(
                "spec_critic.md",
                additional_context=context_str,
                phase_name="self_critique",
            )

            if success:
                if not critique_file.exists():
                    validator.create_minimal_critique(
                        self.spec_dir,
                        reason="Agent completed without explicit issues",
                    )

                result = self.spec_validator.validate_spec_document()
                if result.valid:
                    self.ui.print_status(
                        "Self-critique completed, spec is valid", "success"
                    )
                    return PhaseResult(
                        "self_critique", True, [str(critique_file)], [], attempt
                    )
                else:
                    self.ui.print_status(
                        f"Spec invalid after critique: {result.errors}", "warning"
                    )
                    errors.append(
                        f"Attempt {attempt + 1}: Spec still invalid after critique"
                    )
            else:
                errors.append(f"Attempt {attempt + 1}: Critique agent failed")

        validator.create_minimal_critique(
            self.spec_dir,
            reason="Critique failed after retries",
        )
        return PhaseResult(
            "self_critique", True, [str(critique_file)], errors, MAX_RETRIES
        )
