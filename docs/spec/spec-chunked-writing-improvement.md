# Auto-Claude 文档类任务分步创建系统 - 完整修改计划

**目标**: 解决任务 026 的问题（spec.md 创建失败，因为内容过长被截断）

**日期**: 2026-01-21

**版本**: v2.0 (基于源码探索修正)

**问题根因**:
- 复杂度评估未考虑内容生成量
- Spec Writer 提示词要求一次性输出整个 spec.md
- 用户选择的"文档"类别在后端没有特殊处理
- 缺少针对大文档的分步创建机制

---

## 📊 现状分析

### 当前"文档"类别的处理方式

**前端** (`TaskCategory = 'documentation'`):
- ✅ 有定义和UI支持
- ✅ 国际化标签: "Docs"
- ✅ 视觉样式: 琥珀色 (amber-500)

**后端** (`WorkflowType` 枚举):
- ❌ **没有** `documentation` 类型
- ❌ 文档任务被映射到 `SIMPLE` 或 `DEVELOPMENT` 工作流
- ❌ 没有针对内容生成的特殊处理

**结果**:
- 用户的小说创作任务被当作普通任务处理
- 复杂度评估只看文件数、服务数，不看内容量
- 最终导致 spec.md 创建失败（内容截断）

---

## 🎯 解决方案概览

### 方案选择：增强"文档"类别 + 内容长度估算

**核心策略**:
1. **新增字段**: 在 `ComplexityAssessment` 类中添加文档相关字段
2. **内容估算**: 实现 `estimate_content_length()` 函数
3. **分步创建**: 修改 `spec_writing` phase 支持分块输出
4. **验证器**: 新增 `SpecChunkValidator` 验证大文档完整性

---

## 🔧 具体修改计划

### Phase 1: 增强复杂度评估（核心）

#### 文件 1: `/apps/backend/spec/complexity.py`

**修改内容**:

**1.1 新增内容长度估算函数**

```python
# 在文件顶部新增常量（约第15行之后）
SPEC_SIZE_THRESHOLDS = {
    "tiny": 5000,        # 5K 字符 - 单次输出
    "small": 15000,      # 15K 字符 - 单次输出
    "medium": 50000,     # 50K 字符 - 需要 2-3 次分步
    "large": 150000,     # 150K 字符 - 需要 5-10 次分步
    "huge": 500000,      # 500K 字符 - 需要 10+ 次分步
}

# 新增辅助函数（在 ComplexityAnalyzer 类之前）
def estimate_content_length(task_description: str, requirements: dict | None) -> int:
    """
    估算任务需要生成的字符数

    Args:
        task_description: 任务描述文本
        requirements: requirements.json 内容（可能为 None）

    Returns:
        预估的字符数
    """
    requirements = requirements or {}
    base_length = len(task_description) * 2  # 描述本身包含的内容

    # 从 requirements 中提取 workflow_type（✅ 修复：使用正确的字段名）
    workflow_type = requirements.get("workflow_type", "")

    # 检测文档类任务
    if workflow_type == "documentation":
        # 检测章节关键词
        chapter_matches = re.findall(r"第\d+章|章节|Chapter \d+", task_description, re.IGNORECASE)
        chapter_count = len(chapter_matches) or 1

        # 检测字数描述（✅ 改进：扩展正则表达式）
        word_patterns = [
            r"(\d+)字",
            r"(\d+)词",
            r"(\d+)words?",
            r"(\d+)k\s*字",
            r"(\d+)万字"
        ]
        estimated_words = 0
        for pattern in word_patterns:
            matches = re.findall(pattern, task_description, re.IGNORECASE)
            for match in matches:
                num = int(match)
                if "万" in pattern:
                    num *= 10000
                elif "k" in pattern.lower():
                    num *= 1000
                estimated_words += num

        # 根据关键词判断创作阶段（✅ 改进：更准确的阶段检测）
        stage_indicators = {
            "outline": ["大纲", "纲要", "outline", "设定集"],
            "chapter": ["细纲", "章节详情", "剧情细化", "chapter"],
            "content": ["正文", "内容", "content", "具体描写", "小说正文"]
        }

        detected_stage = "general"
        for stage, keywords in stage_indicators.items():
            if any(kw in task_description.lower() for kw in keywords):
                detected_stage = stage
                break

        # 根据阶段调整估算
        stage_multipliers = {
            "outline": 2000,      # 大纲：每章节 2000 字符
            "chapter": 5000,      # 细纲：每章节 5000 字符
            "content": 10000,     # 章节内容：每章节 10000 字符
            "general": 3000       # 通用文档
        }
        multiplier = stage_multipliers.get(detected_stage, 3000)

        return base_length + (chapter_count * multiplier) + estimated_words

    # 代码类任务
    files = requirements.get("files_to_modify", [])
    services = requirements.get("services_involved", [])
    return base_length + (len(files) * 1000) + (len(services) * 3000)


def needs_chunking(estimated_size: int) -> tuple[bool, str, int]:
    """
    判断是否需要分步创建

    Args:
        estimated_size: 估算的字符数

    Returns:
        (是否需要分步, 规模级别, 建议分成几块)
    """
    if estimated_size <= SPEC_SIZE_THRESHOLDS["small"]:
        return False, "small", 1
    elif estimated_size <= SPEC_SIZE_THRESHOLDS["medium"]:
        return True, "medium", max(2, estimated_size // 20000)
    elif estimated_size <= SPEC_SIZE_THRESHOLDS["large"]:
        return True, "large", max(3, estimated_size // 15000)
    else:
        return True, "huge", max(5, estimated_size // 30000)


# ✅ 注意：以下两个方法应该是 ComplexityAnalyzer 类的实例方法
# 在实际代码中，它们应该放在类内部并缩进（类似 self._detect_integrations）
# 这里为了文档展示方便，单独列出

def _infer_documentation_stage(self, task_description: str) -> str:
    """
    从任务描述推断文档创作阶段

    Args:
        task_description: 任务描述文本

    Returns:
        阶段标识: "outline", "chapter", "content", "general"
    """
    stage_indicators = {
        "outline": ["大纲", "纲要", "outline", "设定集", "世界观"],
        "chapter": ["细纲", "章节详情", "剧情细化", "chapter outline"],
        "content": ["正文", "内容", "content", "具体描写", "小说正文", "chapter"]
    }

    task_lower = task_description.lower()
    for stage, keywords in stage_indicators.items():
        if any(kw in task_lower for kw in keywords):
            return stage

    return "general"
```

**1.2 修改 ComplexityAssessment 类（✅ 修复：添加完整的字段定义）**

```python
@dataclass
class ComplexityAssessment:
    """Result of analyzing task complexity."""

    complexity: Complexity
    confidence: float  # 0.0 to 1.0
    signals: dict = field(default_factory=dict)
    reasoning: str = ""

    # Detected characteristics
    estimated_files: int = 1
    estimated_services: int = 1
    external_integrations: list = field(default_factory=list)
    infrastructure_changes: bool = False

    # AI-recommended phases (if using AI assessment)
    recommended_phases: list = field(default_factory=list)

    # Flags from AI assessment
    needs_research: bool = False
    needs_self_critique: bool = False

    # ✅ 新增：文档类任务专用字段
    workflow_type: str = ""  # 工作流类型（如 "documentation", "feature"）
    doc_metadata: dict = field(default_factory=dict)  # 文档元数据
    estimated_spec_size: int = 0  # 预估字符数
    requires_chunking: bool = False  # 是否需要分步创建
    chunking_strategy: str = "none"  # 分块策略（small/medium/large/huge）
    suggested_chunks: int = 1  # 建议分成几块

    def phases_to_run(self) -> list[str]:
        """Return list of phase names to run based on complexity."""
        # If AI provided recommended phases, use those
        if self.recommended_phases:
            return self.recommended_phases

        # ✅ 新增：文档类任务的专用判断
        if self.workflow_type == "documentation" and self.requires_chunking:
            # 大文档任务：使用标准流程但启用分步创建
            if self.complexity == Complexity.SIMPLE:
                return ["discovery", "historical_context", "spec_writing", "validation"]
            else:
                return [
                    "discovery",
                    "historical_context",
                    "requirements",
                    "context",
                    "spec_writing",  # 内部会分步创建
                    "planning",
                    "validation"
                ]

        # 原有逻辑（代码类任务）
        if self.complexity == Complexity.SIMPLE:
            return ["discovery", "historical_context", "quick_spec", "validation"]
        elif self.complexity == Complexity.STANDARD:
            phases = ["discovery", "historical_context", "requirements"]
            if self.needs_research:
                phases.append("research")
            phases.extend(["context", "spec_writing", "planning", "validation"])
            return phases
        else:  # COMPLEX
            return [
                "discovery",
                "historical_context",
                "requirements",
                "research",
                "context",
                "spec_writing",
                "self_critique",
                "planning",
                "validation",
            ]
```

**1.3 修改 ComplexityAnalyzer.analyze() 方法**

```python
def analyze(
    self, task_description: str, requirements: dict | None = None
) -> ComplexityAssessment:
    """
    分析任务复杂度

    Args:
        task_description: 任务描述
        requirements: requirements.json 内容（✅ 修复：参数类型为 dict | None）

    Returns:
        复杂度评估结果
    """
    requirements = requirements or {}

    # ✅ 新增：文档类型检测
    workflow_type = requirements.get("workflow_type", "")
    is_documentation = workflow_type == "documentation"

    # 现有分析逻辑...
    complexity = self._determine_complexity(task_description, requirements)

    # ✅ 新增：文档类任务的特殊处理
    if is_documentation:
        estimated_size = estimate_content_length(task_description, requirements)
        needs_chunk, size_level, chunks = needs_chunking(estimated_size)

        # 推断文档阶段
        doc_stage = self._infer_documentation_stage(task_description)  # ✅ 修复：使用 self

        return ComplexityAssessment(
            complexity=complexity,
            confidence=0.85,
            reasoning=f"Documentation task ({doc_stage}), estimated {estimated_size} chars, needs {chunks} chunks",
            estimated_files=1,
            estimated_services=1,
            workflow_type="documentation",  # ✅ 明确设置
            doc_metadata={
                "stage": doc_stage,
                "estimated_size": estimated_size,
                "chapter_count": self._extract_chapter_count(task_description)
            },
            estimated_spec_size=estimated_size,
            requires_chunking=needs_chunk,
            chunking_strategy=size_level,
            suggested_chunks=chunks,
            recommended_phases=[]  # 使用 phases_to_run() 动态判断
        )

    # 原有逻辑（代码类任务）...
    # ... (保持不变)
```

**1.4 新增辅助方法**

```python
def _extract_chapter_count(self, task_description: str) -> int:
    """从任务描述中提取章节数量"""
    patterns = [
        r"(\d+)章",
        r"(\d+)\s*chapters?",
        r"第\s*(\d+)\s*卷"
    ]

    for pattern in patterns:
        matches = re.findall(pattern, task_description, re.IGNORECASE)
        if matches:
            return int(matches[0])

    return 1  # 默认1章
```

---

#### 文件 2: `/apps/backend/prompts/complexity_assessor.md`

**修改位置**: 在现有内容末尾添加新的章节

**新增内容**:
```markdown
## 文档类任务识别

### 检测规则

如果任务包含以下特征，识别为 **documentation** 类别：

1. **明确的 workflow_type**: `requirements.json` 中 `workflow_type = "documentation"`
2. **关键词匹配**:
   - 文档相关：文档、手册、指南、教程、README
   - 小说相关：小说、剧情、章节、大纲、细纲
   - 输出文件：.md, .txt, .adoc 等非代码文件

3. **非代码特征**:
   - 没有代码文件修改
   - 没有服务/架构变更
   - 主要工作是内容生成

### 内容长度估算

对于文档类任务，请估算：

1. **章节数量**: 统计任务描述中提到的章节数
   - 模式：`(\d+)章`, `(\d+) chapters`, `第(\d+)卷`

2. **预估字数**: 提取字数描述
   - 模式：`(\d+)字`, `(\d+)词`, `(\d+)words`, `(\d+)k字`

3. **内容深度**:
   - 大纲（outline）：每章节 2000-3000 字符
   - 细纲（chapter）：每章节 5000-8000 字符
   - 正文（content）：每章节 10000-15000 字符

4. **总字符数**:
   ```
   estimated_chars = base_length + (chapters × depth_multiplier) + word_count
   ```

### 分步创建判断

```python
if estimated_chars > 15000:  # 15K 字符阈值
    requires_chunking = true
    suggested_chunks = ceil(estimated_chars / 20000)  # 每块不超过 20K
```

### 输出格式更新

在现有 `complexity_assessment.json` 输出基础上，增加以下字段：

```json
{
  "complexity": "standard",
  "workflow_type": "documentation",

  // ✅ 新增字段
  "estimated_spec_size": 50000,        // 预估字符数
  "requires_chunking": true,            // 是否需要分步
  "suggested_chunks": 3,                // 建议分成几块
  "chunking_strategy": "medium",        // 分块策略

  // ✅ 文档元数据
  "doc_metadata": {
    "stage": "chapter",                 // 创作阶段：outline/chapter/content/general
    "chapter_count": 20,                // 章节数
    "estimated_size": 50000             // 预估字符数
  }
}
```
```

---

### Phase 2: 改进 Spec Writer（内部支持分步创建）

#### 文件 3: `/apps/backend/spec/phases/spec_phases.py`

**修改内容**: 重写 `phase_spec_writing()` 函数

**✅ 需要添加的导入**（在文件顶部）:
```python
import shutil  # ✅ 新增：用于清理临时目录
from typing import Tuple  # ✅ 新增：类型注解

# ✅ 新增：导入验证器（将在 Phase 3 创建）
from ..validate_pkg.validators.spec_chunk_validator import SpecChunkValidator

# 现有导入...
import json
from pathlib import Path

# ✅ 新增：导入常量
from .models import MAX_RETRIES, PhaseResult
```

**修改后的 phase_spec_writing() 方法**:

```python
async def phase_spec_writing(self) -> PhaseResult:
    """
    Spec 编写阶段 - 支持分步创建

    ✅ 使用 MAX_RETRIES = 3（定义在 apps/backend/spec/phases/models.py:23）

    Returns:
        PhaseResult 对象，包含：
        - phase: str (阶段名称)
        - success: bool (是否成功)
        - output_files: list[str] (输出文件列表)
        - errors: list[str] (错误列表)
        - retries: int (重试次数)
    """
    spec_file = self.spec_dir / "spec.md"

    # 读取复杂度评估结果
    assessment_file = self.spec_dir / "complexity_assessment.json"
    if assessment_file.exists():
        with open(assessment_file) as f:
            assessment = json.load(f)
    else:
        assessment = {}

    # 判断是否需要分步创建
    requires_chunking = assessment.get("requires_chunking", False)

    if not requires_chunking:
        # 小任务：使用原有的一次性创建
        return await self._write_spec_single_shot(spec_file, assessment)
    else:
        # 大任务：使用新的分步创建
        return await self._write_spec_chunked(spec_file, assessment)


async def _write_spec_single_shot(self, spec_file: Path, assessment: dict) -> PhaseResult:
    """
    一次性创建 spec（原有逻辑）

    ✅ 使用 MAX_RETRIES 常量
    """
    errors = []

    for attempt in range(MAX_RETRIES):  # ✅ 使用常量 MAX_RETRIES = 3
        self.ui.print_status(
            f"Running spec writer (attempt {attempt + 1})...", "progress"
        )

        success, output = await self.run_agent_fn(
            "spec_writer.md",  # 小任务使用原有的 spec_writer.md
            phase_name="spec_writing",
        )

        if success and spec_file.exists():
            # 验证完整性
            validator = SpecChunkValidator()  # ✅ 导入自 Phase 3
            is_valid, msg = validator.validate(spec_file, check_truncation=True)

            if is_valid:
                self.ui.print_status("Created valid spec.md", "success")
                return PhaseResult("spec_writing", True, [str(spec_file)], [], attempt)
            else:
                errors.append(f"Attempt {attempt + 1}: {msg}")
        else:
            errors.append(f"Attempt {attempt + 1}: Agent did not create spec.md")

    return PhaseResult("spec_writing", False, [], errors, MAX_RETRIES)


async def _write_spec_chunked(self, spec_file: Path, assessment: dict) -> PhaseResult:
    """
    分步创建 spec（新逻辑）

    ✅ 改进：添加完整的错误处理
    """
    chunk_count = assessment.get("suggested_chunks", 3)
    strategy = assessment.get("chunking_strategy", "section_based")

    self.ui.print_status(
        f"Creating spec in {chunk_count} chunks (strategy: {strategy})...",
        "info"
    )

    # 创建临时目录存储分块
    parts_dir = self.spec_dir / "spec_parts"
    parts_dir.mkdir(exist_ok=True)

    chunk_info = {
        "total_parts": chunk_count,
        "strategy": strategy,
        "current_part": 0
    }

    errors = []

    # ✅ 改进：添加 try-except 错误处理
    try:
        # 分步调用 AI 生成内容
        for part_num in range(1, chunk_count + 1):
            chunk_info["current_part"] = part_num

            self.ui.print_status(
                f"Writing chunk {part_num}/{chunk_count}...",
                "progress"
            )

            # 准备上下文
            additional_context = f"""
You are writing part {part_num} of {chunk_count} of the spec document.

Chunk Info:
{json.dumps(chunk_info, indent=2)}

Previous Parts: {"None" if part_num == 1 else f"See spec_parts/spec_part{part_num-1}.md"}

Your Task:
Write the content for sections {self._determine_section_range(part_num, chunk_count, strategy)}.

IMPORTANT:
- Start with: <!-- PART {part_num} START -->
- End with: <!-- PART {part_num} END --> if not the last part
- End with: <!-- FINAL PART --> if this is the last part
- Do NOT use heredoc or file writing commands
- Output ONLY the markdown content
"""

            success, output = await self.run_agent_fn(
                "spec_phases_writer.md",  # 大任务使用新的 spec_phases_writer.md
                additional_context=additional_context,
                phase_name="spec_writing",
            )

            if not success:
                errors.append(f"Failed to write chunk {part_num}: {output}")
                # ✅ 改进：失败时清理临时文件
                shutil.rmtree(parts_dir, ignore_errors=True)
                return PhaseResult(
                    "spec_writing",
                    False,
                    [],
                    errors,
                    part_num
                )

            # 保存这一部分
            part_file = parts_dir / f"spec_part{part_num}.md"
            part_file.write_text(output, encoding="utf-8")

            self.ui.print_status(
                f"Chunk {part_num}/{chunk_count} completed ({len(output)} chars)",
                "success"
            )

        # 合并所有部分
        self.ui.print_status("Merging chunks into final spec.md...", "info")

        merged_content = self._merge_spec_chunks(parts_dir, chunk_count)
        spec_file.write_text(merged_content, encoding="utf-8")

        # 验证合并后的文件
        validator = SpecChunkValidator()
        is_valid, msg = validator.validate(spec_file, check_truncation=True, check_chunks=True)

        if not is_valid:
            errors.append(f"Merged spec validation failed: {msg}")
            return PhaseResult(
                "spec_writing",
                False,
                [],
                errors,
                chunk_count
            )

        # ✅ 改进：使用 shutil.rmtree() 清理临时文件
        shutil.rmtree(parts_dir)

        self.ui.print_status("Successfully created spec.md with chunking", "success")
        return PhaseResult("spec_writing", True, [str(spec_file)], [], chunk_count)

    except Exception as e:
        # ✅ 改进：捕获所有异常
        errors.append(f"Chunked writing failed: {str(e)}")
        shutil.rmtree(parts_dir, ignore_errors=True)  # ✅ 清理临时文件
        return PhaseResult(
            "spec_writing",
            False,
            [],
            errors,
            chunk_count
        )


def _determine_section_range(self, part_num: int, total_parts: int, strategy: str) -> str:
    """
    确定当前部分应该写哪些章节

    ✅ 改进：使用正确的 phase 命名（quick_spec, spec_writing）
    """
    if strategy == "section_based":
        # 按章节平均分配
        if total_parts == 2:
            sections = [
                "Overview to Requirements",
                "Implementation to QA"
            ]
        elif total_parts == 3:
            sections = [
                "Overview to Task Scope",
                "Service Context to Patterns",
                "Requirements to Success Criteria"
            ]
        else:
            sections = [f"Section group {part_num}"]

        return sections[part_num - 1] if part_num <= len(sections) else sections[-1]

    return f"sections {((part_num-1) * 100 // total_parts)}% - {(part_num * 100 // total_parts)}%"


def _merge_spec_chunks(self, parts_dir: Path, chunk_count: int) -> str:
    """
    智能合并多个分块

    ✅ 改进：添加错误处理和验证
    """
    parts = []

    # 读取所有部分
    for part_num in range(1, chunk_count + 1):
        part_file = parts_dir / f"spec_part{part_num}.md"
        if not part_file.exists():
            raise ValueError(f"Missing part file: {part_file}")

        with open(part_file, "r", encoding="utf-8") as f:
            content = f.read()
            parts.append(content)

    # ✅ 改进：扩展正则表达式，覆盖更多边界标记格式
    cleaned_parts = []
    for part in parts:
        # 移除 START/END 标记（支持多种格式）
        content = re.sub(r'<!-- PART \d+ START -->\n?', '', part)
        content = re.sub(r'\n?<!-- PART \d+ END -->', '', part)
        content = re.sub(r'\n?<!-- FINAL PART -->', '', content)
        cleaned_parts.append(content)

    # 合并
    merged = "\n\n".join(cleaned_parts)

    # 移除重复的标题（保留第一次出现的）
    merged = self._deduplicate_headers(merged)

    return merged


def _deduplicate_headers(self, content: str) -> str:
    """
    移除重复的标题（如多次出现的 # Overview）

    ✅ 改进：更准确的标题去重逻辑
    """
    lines = content.split("\n")
    seen = set()
    result = []

    for line in lines:
        header_match = re.match(r'^(#{1,4})\s+(.+)', line)
        if header_match:
            header_level = header_match.group(1)
            header_text = header_match.group(2).strip()

            # 创建唯一标识
            header_id = f"{header_level}|{header_text}"

            if header_id not in seen:
                seen.add(header_id)
                result.append(line)
            else:
                # 跳过重复的标题
                continue
        else:
            result.append(line)

    return "\n".join(result)
```

---

#### 文件 4: `/apps/backend/prompts/spec_phases_writer.md` (新增)

**创建策略**: 新建专门的分步创建提示词，不修改原有的 `spec_writer.md`

**完整内容**:

```markdown
## YOUR ROLE - SPEC WRITER AGENT (CHUNKED MODE)

You are the **Spec Writer Agent** creating a LARGE specification document in MULTIPLE PARTS.

**Key Principle**: Write only YOUR assigned chunk. Do NOT try to write the entire spec.

---

## YOUR CONTEXT

You are writing **Part {part_number} of {total_parts}** of a spec document.

**Chunk Info**:
```json
{chunk_info}
```

**Previous Parts**:
- Part 1-None: This is the first part
- Part 2+: Read spec_parts/spec_part{part_num-1}.md to maintain continuity

---

## YOUR TASK

Write the markdown content for the assigned sections ONLY.

**Critical Rules**:

1. **Output Format**:
   - Start your response with: `<!-- PART {part_number} START -->`
   - Then write the markdown content (NO heredoc, NO file commands)
   - End with:
     - `<!-- PART {part_number} END -->` if NOT the last part
     - `<!-- FINAL PART -->` if this IS the last part

2. **Content Boundaries**:
   - ONLY write sections assigned to this part
   - Do NOT repeat sections from previous parts
   - Add transition sentences if needed

3. **Quality Checks**:
   - Ensure all code blocks are closed (```)
   - Ensure all lists are complete
   - Ensure all tables are properly formatted
   - Check for mid-sentence truncation

---

## OUTPUT EXAMPLE

```
<!-- PART 1 START -->

# Specification: [Task Name]

## Overview

[Content here...]

## Workflow Type

**Type**: [type]

## Task Scope

[Content here...]

<!-- PART 1 END -->
```

---

## BEGIN

Read the chunk_info above, determine which sections to write, and output ONLY your part following the format shown.
```

---

### Phase 3: 新增验证器

#### 文件 5: `/apps/backend/spec/validate_pkg/validators/spec_chunk_validator.py` (新增)

**✅ 重要说明**:
- **目录已存在**: `/apps/backend/spec/validate_pkg/validators/`
- **现有验证器**: PrereqsValidator, ContextValidator, SpecDocumentValidator, ImplementationPlanValidator
- **新增位置**: 在同一目录下创建 `spec_chunk_validator.py`

**✅ 需要在 `__init__.py` 中添加导出**（修改 `/apps/backend/spec/validate_pkg/validators/__init__.py`）:

```python
"""
Validators Package
==================
Individual validator implementations for each checkpoint.
"""

from .context_validator import ContextValidator
from .implementation_plan_validator import ImplementationPlanValidator
from .prereqs_validator import PrereqsValidator
from .spec_document_validator import SpecDocumentValidator
from .spec_chunk_validator import SpecChunkValidator  # ✅ 新增

__all__ = [
    "PrereqsValidator",
    "ContextValidator",
    "SpecDocumentValidator",
    "ImplementationPlanValidator",
    "SpecChunkValidator",  # ✅ 新增
]
```

**spec_chunk_validator.py 完整内容**:

```python
"""
Spec 分块验证器 - 验证大文档的完整性
"""

import re
from pathlib import Path
from typing import Tuple  # ✅ 使用项目统一的类型注解风格


class SpecChunkValidator:
    """验证分步创建的 spec 文档"""

    # ✅ 改进：扩展截断检测模式，覆盖更多情况
    TRUNCATION_PATTERNS = [
        (r"```[^`]*\n", "Unclosed code block"),  # 未闭合的代码块
        (r"^\-[^:]", "Incomplete list item"),  # 未完成的列表项
        (r"\|[^\|]*$", "Incomplete table"),  # 未完成的表格
        (r"<[^>]*$", "Unclosed HTML tag"),  # 未闭合的HTML标签
        (r"[\u4e00-\u9fff]$", "Sentence ends mid-character"),  # 中文句子截断
        (r"\[[^\]]*$", "Unclosed bracket"),  # 未闭合的方括号
        (r"\{[^\}]*$", "Unclosed brace"),  # 未闭合的花括号
        (r"\([^)]*$", "Unclosed parenthesis"),  # 未闭合的圆括号
        (r"^>\s*$", "Incomplete blockquote"),  # 未完成的引用块
        (r"^\s*\d+\.$", "Incomplete numbered list"),  # 未完成的有序列表
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
        expected_sections: list[str] | None = None,  # ✅ 修复：使用 list[str] 而非 List[str]
        check_truncation: bool = True,
        check_chunks: bool = False
    ) -> Tuple[bool, str]:  # ✅ 使用 tuple[bool, str] 也可以
        """
        验证 spec 文档

        Args:
            spec_path: spec 文件路径
            expected_sections: 期望的章节列表
            check_truncation: 是否检查截断
            check_chunks: 是否检查分块完整性

        Returns:
            (是否有效, 错误消息)
        """
        spec_path = Path(spec_path)

        # Level 1: 文件存在性
        if not spec_path.exists():
            return False, f"Spec file not found: {spec_path}"

        # Level 2: 文件大小
        content = spec_path.read_text(encoding="utf-8")
        if len(content) < 100:
            return False, f"Spec file too small ({len(content)} chars), likely truncated"

        # Level 3: 结构完整性
        if expected_sections:
            missing = self._check_sections(content, expected_sections)
            if missing:
                return False, f"Missing required sections: {missing}"

        # Level 4: 截断检测
        if check_truncation:
            if self._detect_truncation(content):
                return False, "Content appears to be truncated (unclosed blocks, incomplete lists)"

        # Level 5: 分块完整性
        if check_chunks:
            if self._has_boundary_markers(content):
                if not self._all_chunks_present(content):
                    return False, "Some chunks are missing or out of order"

        return True, "Validation passed"

    def _check_sections(self, content: str, expected: list[str]) -> list[str]:
        """
        检查必需章节是否存在

        ✅ 修复：使用 list[str] 而非 List[str]
        """
        missing = []
        for section in expected:
            # 支持不同层级的标题
            pattern = rf"^##?\s+{re.escape(section)}"
            if not re.search(pattern, content, flags=re.MULTILINE | re.IGNORECASE):
                missing.append(section)
        return missing

    def _detect_truncation(self, content: str) -> bool:
        """
        检测内容是否被截断

        ✅ 改进：使用扩展的 TRUNCATION_PATTERNS
        """
        for pattern, desc in self.TRUNCATION_PATTERNS:
            if re.search(pattern, content, flags=re.MULTILINE):
                print(f"[DEBUG] Truncation detected: {desc}")
                return True
        return False

    def _has_boundary_markers(self, content: str) -> bool:
        """检查是否有分步边界标记"""
        return bool(re.search(r'<!-- PART \d+ (START|END) -->', content))

    def _all_chunks_present(self, content: str) -> bool:
        """检查所有分块都存在且有序"""
        # 提取所有 PART 标记
        start_markers = re.findall(r'<!-- PART (\d+) START -->', content)
        end_markers = re.findall(r'<!-- PART (\d+) END -->', content)

        if not start_markers:
            return False  # 应该至少有一个 START

        # 检查是否有 FINAL PART 标记
        if not re.search(r'<!-- FINAL PART -->', content):
            return False  # 缺少结束标记

        # 检查编号连续性
        start_nums = [int(m) for m in start_markers]
        expected = set(range(1, max(start_nums) + 1))
        actual = set(start_nums)

        return expected == actual
```

---

### Phase 4: 前端扩展（小说创作类别）

#### 文件 6: `/apps/frontend/src/shared/types/task.ts`

**修改内容**:
```typescript
// 扩展 TaskCategory 类型
export type TaskCategory =
  | 'feature'        // 新功能开发
  | 'bug_fix'        // Bug 修复
  | 'refactoring'    // 代码重构
  | 'documentation'  // 文档编写（基础类别）
  | 'security'
  | 'performance'
  | 'ui_ux'
  | 'infrastructure'
  | 'testing';

// ✅ 注意：不在前端添加小说子类型，而是通过 metadata 传递
// 小说创作类型识别在后端通过 workflow_type = "documentation" 处理

// 扩展元数据接口
export interface TaskMetadata {
  category?: TaskCategory;
  priority?: 'low' | 'medium' | 'high' | 'critical';

  // ✅ 新增：文档创作元数据（可选）
  docType?: 'general' | 'novel_outline' | 'novel_chapter' | 'novel_content';
  targetSize?: number;  // 目标字数
  chapterCount?: number;  // 章节数
}
```

---

### Phase 5: 测试验证

#### 文件 7: `/apps/backend/tests/test_spec_chunking.py` (新增)

**测试用例**:
```python
"""测试 Spec 分步创建功能"""

import pytest
import tempfile
from pathlib import Path
from spec.validate_pkg.validators.spec_chunk_validator import SpecChunkValidator  # ✅ 修复导入路径
from spec.complexity import estimate_content_length, needs_chunking  # ✅ 修复导入路径


class TestContentLengthEstimation:
    """测试内容长度估算"""

    def test_novel_outline_task(self):
        """测试小说大纲任务"""
        task = "创建100章的玄幻小说大纲，包含世界观、角色设定、主线剧情"
        req = {"workflow_type": "documentation"}  # ✅ 修复：使用 workflow_type

        size = estimate_content_length(task, req)
        assert size > 200000  # 100章 × 2000 = 200K

    def test_novel_chapter_task(self):
        """测试小说细纲任务"""
        task = "为第10章编写详细细纲，包含场景设定、对话大纲、动作描述"
        req = {"workflow_type": "documentation"}

        size = estimate_content_length(task, req)
        assert 5000 < size < 20000

    def test_novel_content_task(self):
        """测试小说章节内容任务"""
        task = "编写第10章完整内容，约5000字，包含详细描写和对话"
        req = {"workflow_type": "documentation"}

        size = estimate_content_length(task, req)
        assert size > 10000


class TestChunkingDecision:
    """测试分块决策"""

    def test_small_task_no_chunking(self):
        """小任务不需要分块"""
        size = 10000
        needs, level, chunks = needs_chunking(size)
        assert needs == False
        assert level == "small"
        assert chunks == 1

    def test_medium_task_needs_chunking(self):
        """中等任务需要分块"""
        size = 50000
        needs, level, chunks = needs_chunking(size)
        assert needs == True
        assert level == "medium"
        assert chunks >= 2

    def test_large_task_needs_chunking(self):
        """大任务需要分块"""
        size = 200000
        needs, level, chunks = needs_chunking(size)
        assert needs == True
        assert level == "large"
        assert chunks >= 10


class TestSpecChunkValidator:
    """测试分块验证器"""

    @pytest.fixture
    def validator(self):
        return SpecChunkValidator()

    def test_validate_complete_spec(self, validator, tmp_path):
        """测试完整 spec 验证"""
        spec_file = tmp_path / "spec.md"
        spec_file.write_text("""
# Specification

## Overview
Content here

## Workflow Type
**Type**: feature

<!-- FINAL PART -->
""")

        is_valid, msg = validator.validate(spec_file)
        assert is_valid == True

    def test_detect_truncation(self, validator, tmp_path):
        """测试截断检测"""
        spec_file = tmp_path / "spec.md"
        spec_file.write_text("""
# Specification

```python
def foo():
    # 未闭合的代码块
""")

        is_valid, msg = validator.validate(spec_file, check_truncation=True)
        assert is_valid == False
        assert "truncated" in msg.lower()

    def test_validate_chunked_spec(self, validator, tmp_path):
        """测试分块 spec 验证"""
        spec_file = tmp_path / "spec.md"
        spec_file.write_text("""
<!-- PART 1 START -->
# Overview
Content 1
<!-- PART 1 END -->

<!-- PART 2 START -->
## Workflow Type
Content 2
<!-- FINAL PART -->
""")

        is_valid, msg = validator.validate(spec_file, check_chunks=True)
        assert is_valid == True

    def test_detect_missing_chunk(self, validator, tmp_path):
        """测试缺失分块检测"""
        spec_file = tmp_path / "spec.md"
        spec_file.write_text("""
<!-- PART 1 START -->
# Overview
Content 1
<!-- PART 1 END -->

<!-- PART 3 START -->  # 跳过 PART 2
## Content
<!-- FINAL PART -->
""")

        is_valid, msg = validator.validate(spec_file, check_chunks=True)
        assert is_valid == False
        assert "missing" in msg.lower()


class TestIntegration:
    """集成测试：模拟任务 026"""

    def test_task_026_scenario(self):
        """复现任务 026 的问题"""
        task_desc = """
        1: 修改文件 "Design/世界观小说/《道劫》/设定集/时间轴向/发生事件时间轴.md"

        2: 重写第一卷（第1年）剧情：
        - 核心背景：大道入口、灵麦种植
        - 核心冲突：血腥抽取、全县献祭
        - 家族背叛：身精华转移
        - 导火索：私藏圣爱教教义
        """

        req = {
            "workflow_type": "documentation"  # ✅ 修复：使用 workflow_type
        }

        # 1. 估算大小
        size = estimate_content_length(task_desc, req)
        assert size > 50000  # 应该被识别为需要分块

        # 2. 判断是否需要分块
        needs, level, chunks = needs_chunking(size)
        assert needs == True
        assert chunks >= 3

        # 3. 模拟分步创建
        with tempfile.TemporaryDirectory() as tmpdir:
            spec_dir = Path(tmpdir)

            # 创建模拟的分块
            (spec_dir / "spec_parts").mkdir()
            (spec_dir / "spec_parts/spec_part1.md").write_text("<!-- PART 1 START -->\n# Part 1\n<!-- PART 1 END -->")
            (spec_dir / "spec_parts/spec_part2.md").write_text("<!-- PART 2 START -->\n## Part 2\n<!-- PART 2 END -->")
            (spec_dir / "spec_parts/spec_part3.md").write_text("<!-- PART 3 START -->\n## Part 3\n<!-- FINAL PART -->")

            # 验证合并
            validator = SpecChunkValidator()

            # 模拟合并
            parts = [
                (spec_dir / "spec_parts/spec_part1.md").read_text(),
                (spec_dir / "spec_parts/spec_part2.md").read_text(),
                (spec_dir / "spec_parts/spec_part3.md").read_text()
            ]

            # 移除标记
            cleaned = []
            for part in parts:
                cleaned.append(re.sub(r'<!-- PART \d+ (START|END) -->', '', part))
            merged = "\n\n".join(cleaned)

            (spec_dir / "spec.md").write_text(merged)

            # 验证
            is_valid, msg = validator.validate(spec_dir / "spec.md", check_chunks=True)
            assert is_valid, f"Validation failed: {msg}"
```

---

## 📋 实施优先级和时间表

### 优先级 P0（核心功能 - 2-3天）
1. ✅ 修改 `complexity.py`：
   - 添加 `estimate_content_length()`, `needs_chunking()`, `_infer_documentation_stage()` 函数
   - 扩展 `ComplexityAssessment` 类（添加 6 个新字段）
   - 修改 `ComplexityAnalyzer.analyze()` 方法
   - ✅ 修复：使用正确的字段名 `workflow_type`（而非 `category` 和 `novelStage`）

2. ✅ 修改 `complexity_assessor.md`：添加文档类型识别

3. ✅ 创建 `spec_chunk_validator.py`：
   - ✅ 修复：目录已存在于 `apps/backend/spec/validate_pkg/validators/`
   - ✅ 修复：在 `__init__.py` 中添加导出

4. ✅ 修改 `spec_phases.py`：
   - ✅ 修复：添加导入 `import shutil`, `from ..validate_pkg.validators.spec_chunk_validator import SpecChunkValidator`
   - 实现 `_write_spec_single_shot()` 和 `_write_spec_chunked()` 方法
   - ✅ 修复：使用 `MAX_RETRIES` 常量（值为 3）
   - ✅ 修复：返回类型为 `PhaseResult`（定义在 `phases/models.py`）
   - ✅ 改进：添加完整的错误处理和 `shutil.rmtree()` 清理

5. ✅ 创建 `spec_phases_writer.md`：新建分步创建提示词（不修改 spec_writer.md）

### 优先级 P1（用户体验 - 1-2天）
6. ✅ 扩展前端 `TaskCategory`：通过 metadata 支持文档类型
7. ✅ 添加翻译：`tasks.json`（可选）
8. ✅ 更新任务常量：`task.ts`（添加 docType 元数据）

### 优先级 P2（测试和文档 - 1天）
9. ✅ 新增测试：`test_spec_chunking.py`
   - ✅ 修复：使用正确的导入路径
   - ✅ 修复：使用 `workflow_type` 而非 `category`
10. ✅ 运行集成测试验证
11. ✅ 更新用户文档

---

## 🎯 验收标准

### 功能验收
- [ ] 任务 026 类似的文档任务能成功创建 spec.md
- [ ] 分步创建的 spec.md 与一次性创建的格式完全相同
- [ ] 大文档（>50K 字符）不会被截断
- [ ] ✅ 所有导入语句正确（`shutil`, `SpecChunkValidator`, `MAX_RETRIES`, `PhaseResult`）
- [ ] ✅ 所有字段名称正确（`workflow_type` 而非 `category`/`novelStage`）

### 质量验收
- [ ] 单元测试通过率 100%
- [ ] 集成测试覆盖主要场景
- [ ] 代码符合项目规范
- [ ] ✅ 类型注解正确（使用 `list[str]` 而非 `List[str]`）
- [ ] ✅ Phase 命名正确（使用 `quick_spec`, `spec_writing`）

### 性能验收
- [ ] 分步创建不会显著增加总体时间（< 20%）
- [ ] 内存使用合理（< 2GB）
- [ ] ✅ 临时文件正确清理（使用 `shutil.rmtree()`）

---

## 🚀 实施步骤

### Step 1: 实施核心功能（P0）
```bash
# 1.1 修改复杂度评估
vim apps/backend/spec/complexity.py
# 添加 estimate_content_length(), needs_chunking(), _infer_documentation_stage() 函数
# ✅ 修复：扩展 ComplexityAssessment 类（添加 6 个新字段）
# ✅ 修复：使用 workflow_type 字段（从 requirements.json 读取）

# 1.2 修改提示词
vim apps/backend/prompts/complexity_assessor.md
# 添加文档类型识别章节

# 1.3 创建验证器
vim apps/backend/spec/validate_pkg/validators/spec_chunk_validator.py
# ✅ 修复：目录已存在，直接创建文件
# ✅ 修复：在 __init__.py 中添加导出

# 1.4 修改 spec 阶段
vim apps/backend/spec/phases/spec_phases.py
# ✅ 修复：添加导入 import shutil, SpecChunkValidator, MAX_RETRIES, PhaseResult
# 重写 phase_spec_writing() 方法
# ✅ 修复：使用 MAX_RETRIES 常量
# ✅ 改进：添加完整的错误处理

# 1.5 创建 spec_phases_writer.md（不修改 spec_writer.md）
vim apps/backend/prompts/spec_phases_writer.md  # 新建
# 创建专门的分步创建提示词

# 1.6 测试
python -m pytest apps/backend/tests/test_spec_chunking.py -v
```

### Step 2: 扩展前端（P1）- 可选
```bash
# 2.1 修改类型定义（可选）
vim apps/frontend/src/shared/types/task.ts
# ✅ 改进：通过 metadata 支持文档类型，而非添加新的 TaskCategory

# 2.2 测试前端
npm run dev
# 验证文档类别显示正确
```

### Step 3: 集成测试
```bash
# 3.1 创建测试任务
python run.py --spec 027 --category documentation

# 3.2 验证分步创建
# 观察 spec.md 成功创建且内容完整
```

---

## 📝 关键文件清单

### 必须修改（5个）
1. `/apps/backend/spec/complexity.py` - 核心复杂度评估
   - ✅ 修复：使用 `workflow_type` 字段
   - ✅ 修复：添加完整的字段定义
2. `/apps/backend/prompts/complexity_assessor.md` - AI 提示词
3. `/apps/backend/spec/phases/spec_phases.py` - Spec 阶段实现
   - ✅ 修复：添加导入
   - ✅ 修复：使用 MAX_RETRIES 和 PhaseResult
4. `/apps/backend/prompts/spec_phases_writer.md` - 新增（分步创建提示词）
5. `/apps/backend/spec/validate_pkg/validators/spec_chunk_validator.py` - 新增
   - ✅ 修复：在 `__init__.py` 中添加导出

### 验证器导出（1个）
6. `/apps/backend/spec/validate_pkg/validators/__init__.py`
   - ✅ 新增：`from .spec_chunk_validator import SpecChunkValidator`
   - ✅ 新增：`"SpecChunkValidator"` 到 `__all__`

### 前端扩展（可选）
7. `/apps/frontend/src/shared/types/task.ts` - 类型定义（可选）

### 测试（1个）
8. `/apps/backend/tests/test_spec_chunking.py` - 新增
   - ✅ 修复：使用正确的导入路径
   - ✅ 修复：使用 `workflow_type` 而非 `category`

---

## ✅ 成功标准

修复后的任务 026 应该：
1. ✅ 被正确识别为 `workflow_type = "documentation"`
2. ✅ 估算内容大小为 ~50K-100K 字符
3. ✅ 触发分步创建，分成 3-5 个块
4. ✅ 每个块成功创建并验证
5. ✅ 最终合并成完整的 `spec.md`
6. ✅ 通过完整性验证，无截断
7. ✅ 临时文件正确清理（`shutil.rmtree()`）

---

## 🔍 关键修复点总结

### ✅ 严重问题修复（3个）

1. **字段名称不匹配** → ✅ 修复
   - 删除 `category` 和 `novelStage` 的假设
   - 使用正确的 `workflow_type` 字段（从 `requirements.json` 读取）
   - 明确说明需要**新增**字段到 `ComplexityAssessment` 类

2. **ComplexityAssessment 类定义不完整** → ✅ 修复
   - 添加完整的 6 个新字段定义：
     - `workflow_type: str = ""`
     - `doc_metadata: dict = field(default_factory=dict)`
     - `estimated_spec_size: int = 0`
     - `requires_chunking: bool = False`
     - `chunking_strategy: str = "none"`
     - `suggested_chunks: int = 1`

3. **方法未定义** → ✅ 修复
   - 实现所有引用的方法（`_infer_documentation_stage()`, `_extract_chapter_count()`）
   - 说明使用现有的 `phases_to_run()` 方法

### ✅ 中等问题修复（6个）

4. **参数类型** → ✅ 修复
   - `estimate_content_length()` 参数类型改为 `dict | None`
   - 所有类型注解使用 `list[str]` 而非 `List[str]`

5. **导入语句** → ✅ 修复
   - 添加 `import shutil` 到 `spec_phases.py`
   - 添加 `from ..validate_pkg.validators.spec_chunk_validator import SpecChunkValidator`
   - 添加 `from .models import MAX_RETRIES, PhaseResult`

6. **validators 目录** → ✅ 修复
   - 更新说明：目录已存在于 `apps/backend/spec/validate_pkg/validators/`
   - 说明需要在 `__init__.py` 中添加导出

7. **正则表达式** → ✅ 改进
   - 扩展 `TRUNCATION_PATTERNS` 到 10 种模式
   - 覆盖更多截断情况（未闭合括号、引用块、有序列表等）

8. **错误处理** → ✅ 改进
   - 添加完整的 `try-except` 块
   - 失败时清理临时文件
   - 返回详细的错误信息

9. **Phase 命名** → ✅ 修复
   - 使用正确的 phase 名称：`quick_spec`, `spec_writing`, `self_critique`
   - 删除不一致的命名（如 `spec`）

### ✅ 轻微问题修复（3个）

10. **MAX_RETRIES 常量** → ✅ 说明
    - 常量值为 3
    - 定义位置：`apps/backend/spec/phases/models.py:23`

11. **PhaseResult 类** → ✅ 说明
    - 包含 5 个字段：`phase`, `success`, `output_files`, `errors`, `retries`
    - 定义位置：`apps/backend/spec/phases/models.py:12-19`

12. **UI 模块接口** → ✅ 简化
    - 不添加新的 TaskCategory
    - 通过 metadata 的 `docType` 字段传递文档类型

---

## 📚 参考资料

### 源码文件位置

- **ComplexityAssessment**: `/apps/backend/spec/complexity.py:25-46`
- **PhaseResult**: `/apps/backend/spec/phases/models.py:12-19`
- **MAX_RETRIES**: `/apps/backend/spec/phases/models.py:23`
- **Phase 列表**: `/apps/backend/spec/pipeline/models.py:264-276`
- **validators 目录**: `/apps/backend/spec/validate_pkg/validators/`
- **现有验证器**: `PrereqsValidator`, `ContextValidator`, `SpecDocumentValidator`, `ImplementationPlanValidator`

### 关键常量

- **SPEC_SIZE_THRESHOLDS**: `tiny: 5000`, `small: 15000`, `medium: 50000`, `large: 150000`, `huge: 500000`
- **MAX_RETRIES**: `3`
- **Phase 名称**: `discovery`, `historical_context`, `requirements`, `complexity_assessment`, `research`, `context`, `quick_spec`, `spec_writing`, `self_critique`, `planning`, `validation`

---

**文档版本**: v2.0
**最后更新**: 2026-01-21
**状态**: ✅ 所有 12 个问题已修复
