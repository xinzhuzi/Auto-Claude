"""
Spec Orchestrator
=================

Main orchestration logic for spec creation with dynamic complexity adaptation.
"""

import json
import sys
from collections.abc import Callable
from pathlib import Path

from analysis.analyzers import analyze_project
from core.task_event import TaskEventEmitter
from core.workspace.models import SpecNumberLock
from phase_config import get_thinking_budget
from prompts_pkg.project_context import should_refresh_project_index
from review import run_review_checkpoint
from task_logger import (
    LogEntryType,
    LogPhase,
    get_task_logger,
)
from ui import (
    Icons,
    box,
    highlight,
    icon,
    muted,
    print_key_value,
    print_section,
    print_status,
)

from .. import complexity, phases, requirements
from ..compaction import (
    format_phase_summaries,
    gather_phase_outputs,
    summarize_phase_output,
)
from ..validate_pkg.spec_validator import SpecValidator
from .agent_runner import AgentRunner
from .models import (
    PHASE_DISPLAY,
    cleanup_orphaned_pending_folders,
    create_spec_dir,
    get_specs_dir,
    rename_spec_dir_from_requirements,
)


class SpecOrchestrator:
    """Orchestrates the spec creation process with dynamic complexity adaptation."""

    def __init__(
        self,
        project_dir: Path,
        task_description: str | None = None,
        spec_name: str | None = None,
        spec_dir: Path
        | None = None,  # Use existing spec directory (for UI integration)
        model: str = "sonnet",  # Shorthand - resolved via API Profile if configured
        thinking_level: str = "medium",  # Thinking level for extended thinking
        complexity_override: str | None = None,  # Force a specific complexity
        use_ai_assessment: bool = True,  # Use AI for complexity assessment (vs heuristics)
        resume_planning: bool = False,  # Resume incomplete planning phase
    ):
        """Initialize the spec orchestrator.

        Args:
            project_dir: The project root directory
            task_description: Optional task description
            spec_name: Optional spec name (for existing specs)
            spec_dir: Optional existing spec directory (for UI integration)
            model: The model to use for agent execution
            thinking_level: Thinking level (low, medium, high)
            complexity_override: Force a specific complexity level
            use_ai_assessment: Whether to use AI for complexity assessment
            resume_planning: Whether to resume an incomplete planning phase
        """
        self.project_dir = Path(project_dir)
        self.task_description = task_description
        self.model = model
        self.thinking_level = thinking_level
        self.complexity_override = complexity_override
        self.use_ai_assessment = use_ai_assessment
        self.resume_planning = resume_planning

        # Get the appropriate specs directory (within the project)
        self.specs_dir = get_specs_dir(self.project_dir)

        # Clean up orphaned pending folders before creating new spec
        cleanup_orphaned_pending_folders(self.specs_dir)

        # Complexity assessment (populated during run)
        self.assessment: complexity.ComplexityAssessment | None = None

        # Create/use spec directory
        if spec_dir:
            # Use provided spec directory (from UI)
            self.spec_dir = Path(spec_dir)
            self.spec_dir.mkdir(parents=True, exist_ok=True)
        elif spec_name:
            self.spec_dir = self.specs_dir / spec_name
            self.spec_dir.mkdir(parents=True, exist_ok=True)
        else:
            # Use lock for coordinated spec numbering across worktrees
            with SpecNumberLock(self.project_dir) as lock:
                self.spec_dir = create_spec_dir(self.specs_dir, lock)
                # Create directory inside lock to ensure atomicity
                self.spec_dir.mkdir(parents=True, exist_ok=True)
        self.validator = SpecValidator(self.spec_dir)

        # Agent runner (initialized when needed)
        self._agent_runner: AgentRunner | None = None

        # Phase summaries for conversation compaction
        # Stores summaries from completed phases to provide context to subsequent phases
        self._phase_summaries: dict[str, str] = {}

    def _get_agent_runner(self) -> AgentRunner:
        """Get or create the agent runner.

        Returns:
            The agent runner instance
        """
        if self._agent_runner is None:
            task_logger = get_task_logger(self.spec_dir)
            self._agent_runner = AgentRunner(
                self.project_dir, self.spec_dir, self.model, task_logger
            )
        return self._agent_runner

    async def _run_agent(
        self,
        prompt_file: str,
        additional_context: str = "",
        interactive: bool = False,
        phase_name: str | None = None,
    ) -> tuple[bool, str]:
        """Run an agent with the given prompt.

        Args:
            prompt_file: The prompt file to use
            additional_context: Additional context to add
            interactive: Whether to run in interactive mode
            phase_name: Name of the phase (for thinking budget lookup)

        Returns:
            Tuple of (success, response_text)
        """
        runner = self._get_agent_runner()

        # Use user's configured thinking level for all spec phases
        thinking_budget = get_thinking_budget(self.thinking_level)

        # Format prior phase summaries for context
        prior_summaries = format_phase_summaries(self._phase_summaries)

        return await runner.run_agent(
            prompt_file,
            additional_context,
            interactive,
            thinking_budget=thinking_budget,
            thinking_level=self.thinking_level,
            prior_phase_summaries=prior_summaries if prior_summaries else None,
            phase_name=phase_name,
        )

    async def _store_phase_summary(self, phase_name: str) -> None:
        """Summarize and store phase output for subsequent phases.

        Args:
            phase_name: Name of the completed phase
        """
        try:
            # Gather outputs from this phase
            phase_output = gather_phase_outputs(self.spec_dir, phase_name)
            if not phase_output:
                return

            # Summarize the output
            # Use sonnet shorthand - will resolve via API Profile if configured
            summary = await summarize_phase_output(
                phase_name,
                phase_output,
                model="sonnet",
                target_words=500,
            )

            if summary:
                self._phase_summaries[phase_name] = summary

        except Exception as e:
            # Don't fail the pipeline if summarization fails
            print_status(f"Phase summarization skipped: {e}", "warning")

    async def _ensure_fresh_project_index(self) -> None:
        """Ensure project_index.json is up-to-date before spec creation.

        Uses smart caching: only regenerates if dependency files (package.json,
        pyproject.toml, etc.) have been modified since the last index generation.
        This ensures QA agents receive accurate project capability information
        for dynamic MCP tool injection.
        """
        index_file = self.project_dir / ".auto-claude" / "project_index.json"

        if should_refresh_project_index(self.project_dir):
            if index_file.exists():
                print_status(
                    "Project dependencies changed, refreshing index...", "progress"
                )
            else:
                print_status("Generating project index...", "progress")

            try:
                # Regenerate project index
                analyze_project(self.project_dir, index_file)
                print_status("Project index updated", "success")
            except Exception as e:
                print_status(f"Project index refresh failed: {e}", "warning")
                # Don't fail spec creation if indexing fails - continue with cached/missing
        else:
            if index_file.exists():
                print_status("Using cached project index", "info")
            # If no index exists and no refresh needed, that's fine - capabilities will be empty

    async def _load_resume_planning_context(self) -> None:
        """Load task files into phase summaries for resume planning mode.

        This pre-loads the content of existing spec files so that AI has full
        context from the very start of the pipeline, not just when planning phase runs.
        Reads all relevant files in spec directory, with implementation_plan.json last.
        """
        print_status("Resume planning mode: loading task context...", "progress")

        # Files to skip (logs, temp files, directories)
        skip_files = {"task_logs.json", ".DS_Store"}
        # implementation_plan.json should be read last
        plan_filename = "implementation_plan.json"

        # Scan spec directory for all files
        all_files = []
        plan_file_path = None

        for item in self.spec_dir.iterdir():
            if item.is_dir():
                continue  # Skip directories like chunks/
            if item.name in skip_files:
                continue
            if item.name.startswith("."):
                continue  # Skip hidden files
            if item.name == plan_filename:
                plan_file_path = item  # Save for last
                continue
            all_files.append(item)

        # Sort files for consistent ordering
        all_files.sort(key=lambda x: x.name)

        # Add implementation_plan.json at the end
        if plan_file_path:
            all_files.append(plan_file_path)

        loaded_content = {}
        loaded_count = 0
        task_feature = ""
        task_description = ""

        for file_path in all_files:
            filename = file_path.name
            try:
                content = file_path.read_text(encoding="utf-8")
                loaded_content[filename] = content
                loaded_count += 1

                # Extract task info from implementation_plan.json
                if filename == plan_filename:
                    try:
                        plan_data = json.loads(content)
                        task_feature = plan_data.get("feature", "")
                        task_description = plan_data.get("description", "")
                    except json.JSONDecodeError:
                        pass

                print_status(f"Loaded: {filename}", "info")
            except Exception as e:
                print_status(f"Failed to read {filename}: {e}", "warning")
                loaded_content[filename] = f"[Failed to read: {e}]"

        # Build comprehensive context summary
        # Knowledge files first, then implementation_plan.json
        context_parts = [
            "## 🎯 TASK DEFINITION (Resume Planning Mode)\n",
            f"**Task Title**: {task_feature}\n",
            f"**Task Description**:\n{task_description}\n",
            "\n---\n",
            "## 📁 SPEC FILES (Knowledge Base)\n",
        ]

        for filename, content in loaded_content.items():
            if filename == plan_filename:
                continue  # Add at the end
            ext = filename.split(".")[-1] if "." in filename else ""
            lang = "json" if ext == "json" else "markdown" if ext == "md" else ""
            context_parts.append(f"\n### {filename}\n```{lang}\n{content}\n```\n")

        # Add implementation_plan.json last
        if plan_filename in loaded_content:
            context_parts.append("\n---\n")
            context_parts.append("## 📋 IMPLEMENTATION PLAN (Needs phases)\n")
            context_parts.append(f"```json\n{loaded_content[plan_filename]}\n```\n")

        context_parts.append("\n---\n")
        context_parts.append("## ✅ MISSION\n\n")
        context_parts.append("The planning phase is incomplete. The `phases` array in implementation_plan.json is empty.\n\n")
        context_parts.append("**IMPORTANT - CODEBASE INVESTIGATION REQUIRED**:\n")
        context_parts.append("Before creating phases, you MUST read project files:\n")
        context_parts.append("1. Read `context.json` above to find `files_to_modify` and `files_to_reference`\n")
        context_parts.append("2. Use Read tool to read ALL those project files\n")
        context_parts.append("3. Understand existing code patterns before planning\n\n")
        context_parts.append("Then create a valid phases array with subtasks based on spec.md and your investigation.\n")

        resume_context = "".join(context_parts)

        # Store as a "resume_context" phase summary so all subsequent phases can access it
        self._phase_summaries["resume_context"] = resume_context

        # Log to task_logs.json
        task_logger = get_task_logger(self.spec_dir)
        if task_logger:
            task_logger.log(
                f"Resume planning mode: loaded {loaded_count} spec files into context",
                LogEntryType.INFO,
                LogPhase.PLANNING,
            )

        print_status(
            f"Loaded {loaded_count} task files into context",
            "success" if loaded_count > 0 else "warning",
        )

    async def run(self, interactive: bool = True, auto_approve: bool = False) -> bool:
        """Run the spec creation process with dynamic phase selection.

        Args:
            interactive: Whether to run in interactive mode for requirements gathering
            auto_approve: Whether to skip human review checkpoint and auto-approve

        Returns:
            True if spec creation and review completed successfully, False otherwise
        """
        # Import UI module for use in phases
        import ui

        # Initialize task logger for planning phase
        task_logger = get_task_logger(self.spec_dir)
        task_logger.start_phase(LogPhase.PLANNING, "Starting spec creation process")
        TaskEventEmitter.from_spec_dir(self.spec_dir).emit("PLANNING_STARTED")

        print(
            box(
                f"Spec Directory: {self.spec_dir}\n"
                f"Project: {self.project_dir}"
                + (f"\nTask: {self.task_description}" if self.task_description else ""),
                title="SPEC CREATION ORCHESTRATOR",
                style="heavy",
            )
        )

        # Smart cache: refresh project index if dependency files have changed
        await self._ensure_fresh_project_index()

        # Resume planning mode: pre-load task files into phase summaries
        # This ensures AI has full context from the start
        if self.resume_planning:
            await self._load_resume_planning_context()

        # Create phase executor
        phase_executor = phases.PhaseExecutor(
            project_dir=self.project_dir,
            spec_dir=self.spec_dir,
            task_description=self.task_description,
            spec_validator=self.validator,
            run_agent_fn=self._run_agent,
            task_logger=task_logger,
            ui_module=ui,
            auto_approve=auto_approve,
        )

        results = []
        phase_num = 0

        def run_phase(name: str, phase_fn: Callable) -> phases.PhaseResult:
            """Run a phase with proper numbering and display.

            Args:
                name: The phase name
                phase_fn: The phase function to execute

            Returns:
                The phase result
            """
            nonlocal phase_num
            phase_num += 1
            display_name, display_icon = PHASE_DISPLAY.get(
                name, (name.upper(), Icons.GEAR)
            )
            print_section(f"PHASE {phase_num}: {display_name}", display_icon)
            task_logger.log(
                f"Starting phase {phase_num}: {display_name}", LogEntryType.INFO
            )
            return phase_fn()

        # === PHASE 1: DISCOVERY ===
        result = await run_phase("discovery", phase_executor.phase_discovery)
        results.append(result)
        if not result.success:
            print_status("Discovery failed", "error")
            task_logger.end_phase(
                LogPhase.PLANNING, success=False, message="Discovery failed"
            )
            return False
        # Store summary for subsequent phases (compaction)
        await self._store_phase_summary("discovery")

        # === PHASE 2: REQUIREMENTS GATHERING ===
        result = await run_phase(
            "requirements", lambda: phase_executor.phase_requirements(interactive)
        )
        results.append(result)
        if not result.success:
            print_status("Requirements gathering failed", "error")
            task_logger.end_phase(
                LogPhase.PLANNING,
                success=False,
                message="Requirements gathering failed",
            )
            return False
        # Store summary for subsequent phases (compaction)
        await self._store_phase_summary("requirements")

        # Rename spec folder with better name from requirements
        rename_spec_dir_from_requirements(self.spec_dir)

        # Update task description from requirements
        req = requirements.load_requirements(self.spec_dir)
        if req:
            self.task_description = req.get("task_description", self.task_description)
            # Update phase executor's task description
            phase_executor.task_description = self.task_description

        # === CREATE LINEAR TASK (if enabled) ===
        await self._create_linear_task_if_enabled()

        # === PHASE 3: AI COMPLEXITY ASSESSMENT ===
        result = await run_phase(
            "complexity_assessment",
            lambda: self._phase_complexity_assessment_with_requirements(),
        )
        results.append(result)
        if not result.success:
            print_status("Complexity assessment failed", "error")
            task_logger.end_phase(
                LogPhase.PLANNING, success=False, message="Complexity assessment failed"
            )
            return False

        # Map of all available phases
        all_phases = {
            "historical_context": phase_executor.phase_historical_context,
            "research": phase_executor.phase_research,
            "context": phase_executor.phase_context,
            "spec_writing": phase_executor.phase_spec_writing,
            "self_critique": phase_executor.phase_self_critique,
            "planning": phase_executor.phase_planning,
            "validation": phase_executor.phase_validation,
            "quick_spec": phase_executor.phase_quick_spec,
        }

        # Get remaining phases to run based on complexity
        all_phases_to_run = self.assessment.phases_to_run()
        phases_to_run = [
            p for p in all_phases_to_run if p not in ["discovery", "requirements"]
        ]

        print()
        print(
            f"  Running {highlight(self.assessment.complexity.value.upper())} workflow"
        )
        print(f"  {muted('Remaining phases:')} {', '.join(phases_to_run)}")
        print()

        phases_executed = ["discovery", "requirements", "complexity_assessment"]
        for phase_name in phases_to_run:
            if phase_name not in all_phases:
                print_status(f"Unknown phase: {phase_name}, skipping", "warning")
                continue

            result = await run_phase(phase_name, all_phases[phase_name])
            results.append(result)
            phases_executed.append(phase_name)

            # Store summary for subsequent phases (compaction)
            if result.success:
                await self._store_phase_summary(phase_name)

            if not result.success:
                print()
                print_status(
                    f"Phase '{phase_name}' failed after {result.retries} retries",
                    "error",
                )
                print(f"  {muted('Errors:')}")
                for err in result.errors:
                    print(f"    {icon(Icons.ARROW_RIGHT)} {err}")
                print()
                print_status(
                    "Spec creation incomplete. Fix errors and retry.", "warning"
                )
                task_logger.log(
                    f"Phase '{phase_name}' failed: {'; '.join(result.errors)}",
                    LogEntryType.ERROR,
                )
                task_logger.end_phase(
                    LogPhase.PLANNING,
                    success=False,
                    message=f"Phase {phase_name} failed",
                )
                return False

        # Summary
        self._print_completion_summary(results, phases_executed)

        # End planning phase successfully
        task_logger.end_phase(
            LogPhase.PLANNING, success=True, message="Spec creation complete"
        )

        # Load task metadata to check requireReviewBeforeCoding setting
        task_metadata_file = self.spec_dir / "task_metadata.json"
        require_review_before_coding = False
        if task_metadata_file.exists():
            with open(task_metadata_file, encoding="utf-8") as f:
                task_metadata = json.load(f)
                require_review_before_coding = task_metadata.get(
                    "requireReviewBeforeCoding", False
                )

        # Emit PLANNING_COMPLETE event for XState machine transition
        # This signals the frontend that spec creation is done
        task_emitter = TaskEventEmitter.from_spec_dir(self.spec_dir)
        task_emitter.emit(
            "PLANNING_COMPLETE",
            {
                "hasSubtasks": False,  # Spec creation doesn't have subtasks yet
                "subtaskCount": 0,
                "requireReviewBeforeCoding": require_review_before_coding,
            },
        )

        # === HUMAN REVIEW CHECKPOINT ===
        return self._run_review_checkpoint(auto_approve)

    async def _create_linear_task_if_enabled(self) -> None:
        """Create a Linear task if Linear integration is enabled."""
        from linear_updater import create_linear_task, is_linear_enabled

        if not is_linear_enabled():
            return

        print_status("Creating Linear task...", "progress")
        linear_state = await create_linear_task(
            spec_dir=self.spec_dir,
            title=self.task_description or self.spec_dir.name,
            description=f"Auto-build spec: {self.spec_dir.name}",
        )
        if linear_state:
            print_status(f"Linear task created: {linear_state.task_id}", "success")
        else:
            print_status("Linear task creation failed (continuing without)", "warning")

    async def _phase_complexity_assessment_with_requirements(
        self,
    ) -> phases.PhaseResult:
        """Assess complexity after requirements are gathered (with full context).

        Returns:
            The phase result
        """
        task_logger = get_task_logger(self.spec_dir)
        assessment_file = self.spec_dir / "complexity_assessment.json"
        requirements_file = self.spec_dir / "requirements.json"

        # Check if assessment already exists (skip if resuming)
        if assessment_file.exists():
            try:
                self.assessment = complexity.load_assessment(self.spec_dir)
                if self.assessment:
                    print_status("complexity_assessment.json already exists", "success")
                    self._print_phases_to_run()
                    return phases.PhaseResult(
                        "complexity_assessment", True, [str(assessment_file)], [], 0
                    )
            except Exception as e:
                print_status(f"Failed to load existing assessment: {e}", "warning")

        # Load requirements for full context
        requirements_context = self._load_requirements_context(requirements_file)

        if self.complexity_override:
            # Manual override
            self.assessment = self._create_override_assessment()
        elif self.use_ai_assessment:
            # Run AI assessment
            self.assessment = await self._run_ai_assessment(task_logger)
        else:
            # Use heuristic assessment
            self.assessment = self._heuristic_assessment()
            self._print_assessment_info()

        # Show what phases will run
        self._print_phases_to_run()

        # Save assessment
        if not assessment_file.exists():
            complexity.save_assessment(self.spec_dir, self.assessment)

        return phases.PhaseResult(
            "complexity_assessment", True, [str(assessment_file)], [], 0
        )

    def _load_requirements_context(self, requirements_file: Path) -> str:
        """Load requirements context from file.

        Args:
            requirements_file: Path to the requirements file

        Returns:
            Formatted requirements context string
        """
        if not requirements_file.exists():
            return ""

        with open(requirements_file, encoding="utf-8") as f:
            req = json.load(f)
            self.task_description = req.get("task_description", self.task_description)
            return f"""
**Task Description**: {req.get("task_description", "Not provided")}
**Workflow Type**: {req.get("workflow_type", "Not specified")}
**Services Involved**: {", ".join(req.get("services_involved", []))}
**User Requirements**:
{chr(10).join(f"- {r}" for r in req.get("user_requirements", []))}
**Acceptance Criteria**:
{chr(10).join(f"- {c}" for c in req.get("acceptance_criteria", []))}
**Constraints**:
{chr(10).join(f"- {c}" for c in req.get("constraints", []))}
"""

    def _create_override_assessment(self) -> complexity.ComplexityAssessment:
        """Create a complexity assessment from manual override.

        Returns:
            The complexity assessment
        """
        comp = complexity.Complexity(self.complexity_override)
        assessment = complexity.ComplexityAssessment(
            complexity=comp,
            confidence=1.0,
            reasoning=f"Manual override: {self.complexity_override}",
        )
        print_status(f"Complexity override: {comp.value.upper()}", "success")
        return assessment

    async def _run_ai_assessment(self, task_logger) -> complexity.ComplexityAssessment:
        """Run AI-based complexity assessment.

        Args:
            task_logger: The task logger instance

        Returns:
            The complexity assessment
        """
        print_status("Running AI complexity assessment...", "progress")
        task_logger.log(
            "Analyzing task complexity with AI...",
            LogEntryType.INFO,
            LogPhase.PLANNING,
        )
        assessment = await complexity.run_ai_complexity_assessment(
            self.spec_dir,
            self.task_description,
            self._run_agent,
        )

        if assessment:
            self._print_assessment_info(assessment)
            return assessment
        else:
            # Fall back to heuristic assessment
            print_status(
                "AI assessment failed, falling back to heuristics...", "warning"
            )
            return self._heuristic_assessment()

    def _print_assessment_info(
        self, assessment: complexity.ComplexityAssessment | None = None
    ) -> None:
        """Print complexity assessment information.

        Args:
            assessment: The assessment to print (defaults to self.assessment)
        """
        if assessment is None:
            assessment = self.assessment

        print_status(
            f"AI assessed complexity: {highlight(assessment.complexity.value.upper())}",
            "success",
        )
        print_key_value("Confidence", f"{assessment.confidence:.0%}")
        print_key_value("Reasoning", assessment.reasoning)

        if assessment.needs_research:
            print(f"  {muted(icon(Icons.ARROW_RIGHT) + ' Research phase enabled')}")
        if assessment.needs_self_critique:
            print(
                f"  {muted(icon(Icons.ARROW_RIGHT) + ' Self-critique phase enabled')}"
            )

    def _print_phases_to_run(self) -> None:
        """Print the list of phases that will be executed."""
        phase_list = self.assessment.phases_to_run()
        print()
        print(f"  Phases to run ({highlight(str(len(phase_list)))}):")
        for i, phase in enumerate(phase_list, 1):
            print(f"    {i}. {phase}")

    def _heuristic_assessment(self) -> complexity.ComplexityAssessment:
        """Fall back to heuristic-based complexity assessment.

        Returns:
            The complexity assessment
        """
        project_index = {}
        auto_build_index = self.project_dir / ".auto-claude" / "project_index.json"
        if auto_build_index.exists():
            with open(auto_build_index, encoding="utf-8") as f:
                project_index = json.load(f)

        analyzer = complexity.ComplexityAnalyzer(project_index)
        return analyzer.analyze(self.task_description or "")

    def _print_completion_summary(
        self, results: list[phases.PhaseResult], phases_executed: list[str]
    ) -> None:
        """Print the completion summary.

        Args:
            results: List of phase results
            phases_executed: List of executed phase names
        """
        files_created = []
        for r in results:
            for f in r.output_files:
                files_created.append(Path(f).name)

        print(
            box(
                f"Complexity: {self.assessment.complexity.value.upper()}\n"
                f"Phases run: {len(phases_executed) + 1}\n"
                f"Spec saved to: {self.spec_dir}\n\n"
                f"Files created:\n"
                + "\n".join(f"  {icon(Icons.SUCCESS)} {f}" for f in files_created),
                title=f"{icon(Icons.SUCCESS)} SPEC CREATION COMPLETE",
                style="heavy",
            )
        )

    def _run_review_checkpoint(self, auto_approve: bool) -> bool:
        """Run the human review checkpoint.

        Args:
            auto_approve: Whether to auto-approve without human review

        Returns:
            True if approved, False otherwise
        """
        print(f"[ORCHESTRATOR] _run_review_checkpoint called with auto_approve={auto_approve}", flush=True)
        print()
        print_section("HUMAN REVIEW CHECKPOINT", Icons.SEARCH)

        try:
            print(f"[ORCHESTRATOR] Calling run_review_checkpoint...", flush=True)
            review_state = run_review_checkpoint(
                spec_dir=self.spec_dir,
                auto_approve=auto_approve,
            )
            print(f"[ORCHESTRATOR] run_review_checkpoint returned, is_approved={review_state.is_approved()}", flush=True)

            if not review_state.is_approved():
                print(f"[ORCHESTRATOR] Review state not approved, returning False", flush=True)
                print()
                print_status("Build will not proceed without approval.", "warning")
                return False

        except SystemExit as e:
            # SystemExit with code 0 means user paused review (not rejected)
            # SystemExit with code != 0 means user rejected or error
            print(f"[ORCHESTRATOR] Caught SystemExit with code={e.code}", flush=True)
            if e.code != 0:
                return False
            # User paused review - treat as not approved for now
            return False
        except KeyboardInterrupt:
            print(f"[ORCHESTRATOR] Caught KeyboardInterrupt", flush=True)
            print()
            print_status("Review interrupted. Run again to continue.", "info")
            return False

        print(f"[ORCHESTRATOR] Review checkpoint passed, returning True", flush=True)
        return True

    # Backward compatibility methods for tests
    def _generate_spec_name(self, task_description: str) -> str:
        """Generate a spec name from task description (backward compatibility).

        This method is kept for backward compatibility with existing tests.
        The functionality has been moved to models.generate_spec_name.

        Args:
            task_description: The task description

        Returns:
            Generated spec name
        """
        from .models import generate_spec_name

        return generate_spec_name(task_description)

    def _rename_spec_dir_from_requirements(self) -> bool:
        """Rename spec directory from requirements (backward compatibility).

        This method is kept for backward compatibility with existing tests.
        The functionality has been moved to models.rename_spec_dir_from_requirements.

        Returns:
            True if successful or not needed, False on error
        """
        result = rename_spec_dir_from_requirements(self.spec_dir)
        # Update self.spec_dir if it was renamed
        if result and self.spec_dir.name.endswith("-pending"):
            # Find the renamed directory
            parent = self.spec_dir.parent
            prefix = self.spec_dir.name[:4]  # e.g., "001-"
            for candidate in parent.iterdir():
                if (
                    candidate.name.startswith(prefix)
                    and "pending" not in candidate.name
                ):
                    self.spec_dir = candidate
                    break
        return result
