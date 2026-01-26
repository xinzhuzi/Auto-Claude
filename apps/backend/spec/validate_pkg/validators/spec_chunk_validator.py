"""
Spec Chunk Validator
===================

Validates chunked spec documents for truncation and completeness.
"""

import re
from pathlib import Path


class SpecChunkValidator:
    """Validator for chunked spec documents."""

    # ✅ Fixed: Configurable minimum spec size constant
    MIN_SPEC_SIZE = 500  # Minimum 500 chars for a valid spec document

    # ✅ NEW: Section name corrections mapping (common errors → correct names)
    SECTION_NAME_CORRECTIONS = {
        "Success Metrics": "Success Criteria",
        "Success Criterion": "Success Criteria",
        "Acceptance Criteria": "Success Criteria",
        "Success Requirements": "Success Criteria",
    }

    # ✅ Improved: Extended truncation detection patterns
    # Note: Code block detection is now handled separately in _detect_truncation
    # ✅ FIXED: Removed patterns that cause false positives:
    #   - Table pattern (r"\|[^\|]*$") - matches normal Markdown table rows
    #   - Brace pattern (r"\{[^\}]*$") - matches code blocks (now handled separately)
    #   - Parenthesis pattern (r"\([^)]*$") - matches code blocks (now handled separately)
    TRUNCATION_PATTERNS = [
        (r"^\-\s*$", "Incomplete list item (empty or whitespace only)"),  # Incomplete list item
        (r"<[^>]*$", "Unclosed HTML tag"),  # Unclosed HTML tag
        (r"\[[^\]]*$", "Unclosed bracket"),  # Unclosed bracket
        (r"^>\s*$", "Incomplete blockquote"),  # Incomplete blockquote
        (r"^\s*\d+\.\s*$", "Incomplete numbered list"),  # Incomplete numbered list (must have only whitespace after)
    ]

    def __init__(self):
        self.required_sections = [
            "Overview",
            "Workflow Type",
            "Task Scope",
            "Success Criteria"
        ]

    def validate(
        self,
        spec_path: str | Path,
        expected_sections: list[str] | None = None,
        check_truncation: bool = True,
        check_chunks: bool = False,
        check_section_names: bool = True
    ) -> tuple[bool, str]:
        """
        Validate spec document

        Args:
            spec_path: Path to spec file
            expected_sections: Expected section list
            check_truncation: Whether to check for truncation
            check_chunks: Whether to check chunk integrity

        Returns:
            (is_valid, error_message)
        """
        spec_path = Path(spec_path)

        # Level 1: File existence
        if not spec_path.exists():
            return False, f"Spec file not found: {spec_path}"

        # Level 2: File size
        content = spec_path.read_text(encoding="utf-8")
        if len(content) < self.MIN_SPEC_SIZE:
            return False, f"Spec file too small ({len(content)} chars), likely truncated"

        # Level 3: Structural integrity
        if expected_sections:
            missing = self._check_sections(content, expected_sections)
            if missing:
                return False, f"Missing required sections: {missing}"

        # Level 4: Truncation detection
        if check_truncation:
            if self._detect_truncation(content):
                return False, "Content appears to be truncated (unclosed blocks, incomplete lists)"

        # Level 5: Chunk integrity
        if check_chunks:
            if self._has_boundary_markers(content):
                if not self._all_chunks_present(content):
                    return False, "Some chunks are missing or out of order"

        # Level 6: Section name validation
        if check_section_names:
            is_valid, error_msg = self._validate_section_names(content)
            if not is_valid:
                return False, f"Invalid section names: {error_msg}"

        return True, "Validation passed"

    def _check_sections(self, content: str, expected: list[str]) -> list[str]:
        """
        Check if required sections exist

        ✅ Fixed: Use list[str] instead of List[str]
        """
        missing = []
        for section in expected:
            # Support different heading levels
            pattern = rf"^##?\s+{re.escape(section)}"
            if not re.search(pattern, content, flags=re.MULTILINE | re.IGNORECASE):
                missing.append(section)
        return missing

    def _detect_truncation(self, content: str) -> bool:
        """
        Detect if content is truncated

        ✅ Improved: Check for paired structures instead of simple pattern matching
        ✅ Fixed: Code blocks are now checked by counting pairs, not regex matching
        ✅ NEW: Exclude code blocks from truncation pattern checks to avoid false positives
        """
        # Check code blocks (must be paired)
        # Count the number of ``` markers at the start of lines
        code_block_markers = len(re.findall(r'^```', content, flags=re.MULTILINE))
        if code_block_markers % 2 != 0:
            return True  # Odd number of ``` means unclosed block

        # ✅ NEW: Remove code blocks before checking other patterns
        # This prevents false positives from code/CSS/JS inside code blocks
        content_without_code = self._remove_code_blocks(content)

        # Check other truncation patterns (only on non-code content)
        for pattern, desc in self.TRUNCATION_PATTERNS:
            if re.search(pattern, content_without_code, flags=re.MULTILINE):
                return True

        return False

    def _remove_code_blocks(self, content: str) -> str:
        """
        Remove code blocks from content to avoid false positives in truncation detection.
        
        Args:
            content: Markdown content
            
        Returns:
            Content with code blocks replaced by placeholders
        """
        # Replace code blocks with placeholder to avoid checking their content
        # Pattern: ```...``` (including language specifier)
        return re.sub(
            r'^```.*?^```',
            '[CODE_BLOCK_REMOVED]',
            content,
            flags=re.MULTILINE | re.DOTALL
        )

    def _has_boundary_markers(self, content: str) -> bool:
        """Check if chunking boundary markers exist"""
        return bool(re.search(r'<!-- PART \d+ (START|END) -->', content))

    def _all_chunks_present(self, content: str) -> bool:
        """Check if all chunks exist and are in order"""
        # Extract all PART markers
        start_markers = re.findall(r'<!-- PART (\d+) START -->', content)
        end_markers = re.findall(r'<!-- PART (\d+) END -->', content)

        if not start_markers:
            return False  # Should have at least one START

        # Check for FINAL PART marker
        if not re.search(r'<!-- FINAL PART -->', content):
            return False  # Missing end marker

        # ✅ Fixed: Verify that start and end markers match
        if set(start_markers) != set(end_markers):
            return False  # Mismatched START/END markers

        # Check numbering continuity
        start_nums = [int(m) for m in start_markers]
        expected = set(range(1, max(start_nums) + 1))
        actual = set(start_nums)

        return expected == actual

    def _validate_section_names(self, content: str) -> tuple[bool, str]:
        """
        Validate section names match template requirements

        Returns:
            (is_valid, error_message)
        """
        # Extract all second-level headers
        headers = re.findall(r'^##\s+(.+)$', content, re.MULTILINE)

        errors = []
        for header in headers:
            clean_header = header.strip()

            # Check if it's a common error
            if clean_header in self.SECTION_NAME_CORRECTIONS:
                correct_name = self.SECTION_NAME_CORRECTIONS[clean_header]
                errors.append(
                    f"Found '{clean_header}' but template requires '{correct_name}'"
                )

        if errors:
            return False, "; ".join(errors)

        return True, ""
