"""
Planning and Validation Phase Implementations
==============================================

Phases for implementation planning and final validation.
"""

from typing import TYPE_CHECKING

from task_logger import LogEntryType, LogPhase

from .. import writer
from .models import MAX_RETRIES, PhaseResult

if TYPE_CHECKING:
    pass


class PlanningPhaseMixin:
    """Mixin for planning and validation phase methods."""

    async def phase_planning(self) -> PhaseResult:
        """Create the implementation plan."""
        from ..validate_pkg.auto_fix import auto_fix_plan

        plan_file = self.spec_dir / "implementation_plan.json"
        is_resume_mode = False  # Track if we're resuming an incomplete plan

        if plan_file.exists():
            result = self.spec_validator.validate_implementation_plan()
            if result.valid:
                self.ui.print_status(
                    "implementation_plan.json already exists and is valid", "success"
                )
                return PhaseResult("planning", True, [str(plan_file)], [], 0)
            # Plan exists but invalid (e.g., empty phases) - keep file, AI will update it
            self.ui.print_status("Plan exists but needs phases, AI will update...", "warning")
            is_resume_mode = True  # Mark as resume mode

        errors = []

        # Try Python script first (deterministic)
        self.ui.print_status("Trying planner.py (deterministic)...", "progress")
        success, output = self._run_script(
            "planner.py", ["--spec-dir", str(self.spec_dir)]
        )

        if success and plan_file.exists():
            result = self.spec_validator.validate_implementation_plan()
            if result.valid:
                self.ui.print_status(
                    "Created valid implementation_plan.json via script", "success"
                )
                stats = writer.get_plan_stats(self.spec_dir)
                if stats:
                    self.task_logger.log(
                        f"Implementation plan created with {stats.get('total_subtasks', 0)} subtasks",
                        LogEntryType.SUCCESS,
                        LogPhase.PLANNING,
                    )
                return PhaseResult("planning", True, [str(plan_file)], [], 0)
            else:
                if auto_fix_plan(self.spec_dir):
                    result = self.spec_validator.validate_implementation_plan()
                    if result.valid:
                        self.ui.print_status(
                            "Auto-fixed implementation_plan.json", "success"
                        )
                        return PhaseResult("planning", True, [str(plan_file)], [], 0)
                errors.append(f"Script output invalid: {result.errors}")

        # Fall back to agent
        self.ui.print_status("Falling back to planner agent...", "progress")

        # Build additional context for resume mode - include actual file contents
        additional_context = None
        if is_resume_mode:
            import json

            # Read existing files to provide full context to AI
            plan_content = ""
            spec_content = ""
            context_content = ""
            requirements_content = ""
            task_feature = ""
            task_description = ""

            try:
                plan_text = (self.spec_dir / "implementation_plan.json").read_text(encoding="utf-8")
                plan_content = plan_text
                # Extract task info from plan
                plan_data = json.loads(plan_text)
                task_feature = plan_data.get("feature", "")
                task_description = plan_data.get("description", "")
            except Exception:
                plan_content = "[File not found or unreadable]"

            try:
                spec_content = (self.spec_dir / "spec.md").read_text(encoding="utf-8")
            except Exception:
                spec_content = "[File not found or unreadable]"

            try:
                context_content = (self.spec_dir / "context.json").read_text(encoding="utf-8")
            except Exception:
                context_content = "[File not found or unreadable]"

            try:
                requirements_content = (self.spec_dir / "requirements.json").read_text(encoding="utf-8")
            except Exception:
                requirements_content = "[File not found or unreadable]"

            # Get validation errors to show what failed
            validation_errors = result.errors if result else ["phases array is empty"]

            additional_context = f"""
## 🎯 TASK DEFINITION (This is what you need to implement)

**Task Title**: {task_feature}

**Task Description**:
{task_description}

---

## ⚠️ CURRENT STATUS: PLANNING PHASE INCOMPLETE

The spec pipeline detected that the **planning phase** has not been completed successfully.

**Validation Errors**:
{chr(10).join(f"- {err}" for err in validation_errors)}

**Spec Directory**: `{self.spec_dir}`

---

## 📁 EXISTING FILES (Read these to understand the task)

### 1. implementation_plan.json (Current state - needs phases)
```json
{plan_content}
```

### 2. spec.md (Detailed specification for the task)
```markdown
{spec_content}
```

### 3. context.json (Files to modify/reference)
```json
{context_content}
```

### 4. requirements.json (Original requirements)
```json
{requirements_content}
```

---

## ✅ YOUR MISSION

**PHASE 0 - CODEBASE INVESTIGATION (MANDATORY)**:
Before creating phases, you MUST investigate the project codebase!

1. **Read files from context.json**:
   - Read ALL files listed in `files_to_modify` to understand what needs to change
   - Read ALL files listed in `files_to_reference` to understand existing patterns

2. **Explore project structure** (if needed):
   - Use `ls` and `find` to understand the directory structure
   - Search for similar implementations using `grep`

**DO NOT skip this step!** Plans created without codebase investigation will be inaccurate.

**PHASE 1 - CREATE PHASES**:
After completing investigation:

1. **Understand the task**: The task is "{task_feature}"
2. **Read the spec.md**: It contains the detailed implementation plan
3. **Create phases with subtasks**: Break down the task into executable phases
4. **Update implementation_plan.json**: Use **Edit tool** (not Write) to add the `phases` array
5. **Preserve existing fields**: Keep `feature`, `description`, `created_at`, `status`, `planStatus` unchanged

The goal is to make the planning phase validation pass by adding a valid `phases` array.
"""

        for attempt in range(MAX_RETRIES):
            self.ui.print_status(
                f"Running planner agent (attempt {attempt + 1})...", "progress"
            )

            success, output = await self.run_agent_fn(
                "planner.md",
                additional_context=additional_context,
                phase_name="planning",
            )

            if success and plan_file.exists():
                result = self.spec_validator.validate_implementation_plan()
                if result.valid:
                    self.ui.print_status(
                        "Created valid implementation_plan.json via agent", "success"
                    )
                    return PhaseResult("planning", True, [str(plan_file)], [], attempt)
                else:
                    if auto_fix_plan(self.spec_dir):
                        result = self.spec_validator.validate_implementation_plan()
                        if result.valid:
                            self.ui.print_status(
                                "Auto-fixed implementation_plan.json", "success"
                            )
                            return PhaseResult(
                                "planning", True, [str(plan_file)], [], attempt
                            )
                    errors.append(f"Agent attempt {attempt + 1}: {result.errors}")
                    self.ui.print_status("Plan created but invalid", "error")
            else:
                errors.append(f"Agent attempt {attempt + 1}: Did not create plan file")

        return PhaseResult("planning", False, [], errors, MAX_RETRIES)

    async def phase_validation(self) -> PhaseResult:
        """Final validation of all spec files with auto-fix retry."""
        for attempt in range(MAX_RETRIES):
            results = self.spec_validator.validate_all()
            all_valid = all(r.valid for r in results)

            for result in results:
                if result.valid:
                    self.ui.print_status(f"{result.checkpoint}: PASS", "success")
                else:
                    self.ui.print_status(f"{result.checkpoint}: FAIL", "error")
                for err in result.errors:
                    print(f"    {self.ui.muted('Error:')} {err}")

            if all_valid:
                print()
                self.ui.print_status("All validation checks passed", "success")
                return PhaseResult("validation", True, [], [], attempt)

            # If not valid, try to auto-fix with AI agent
            if attempt < MAX_RETRIES - 1:
                print()
                self.ui.print_status(
                    f"Attempting auto-fix (attempt {attempt + 1}/{MAX_RETRIES - 1})...",
                    "progress",
                )

                # Collect all errors for the fixer agent
                error_details = []
                for result in results:
                    if not result.valid:
                        error_details.append(
                            f"**{result.checkpoint}** validation failed:"
                        )
                        for err in result.errors:
                            error_details.append(f"  - {err}")
                        if result.fixes:
                            error_details.append("  Suggested fixes:")
                            for fix in result.fixes:
                                error_details.append(f"    - {fix}")

                context_str = f"""
**Spec Directory**: {self.spec_dir}

## Validation Errors to Fix

{chr(10).join(error_details)}

## Files in Spec Directory

The following files exist in the spec directory:
- context.json
- requirements.json
- spec.md
- implementation_plan.json
- project_index.json (if exists)

Read the failed files, understand the errors, and fix them.
"""
                success, output = await self.run_agent_fn(
                    "validation_fixer.md",
                    additional_context=context_str,
                    phase_name="validation",
                )

                if not success:
                    self.ui.print_status("Auto-fix agent failed", "warning")

        # All retries exhausted
        errors = [f"{r.checkpoint}: {err}" for r in results for err in r.errors]
        return PhaseResult("validation", False, [], errors, MAX_RETRIES)
