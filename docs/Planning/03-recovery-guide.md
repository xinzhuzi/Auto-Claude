# 恢复指南

## 概述

当上游代码合并覆盖了本地修改时，本指南帮助快速恢复关键功能。

### 适用场景

| 场景 | 说明 | 恢复难度 |
|------|------|----------|
| 上游合并覆盖 | `git merge upstream/main` 后丢失修改 | ⭐⭐ 中等 |
| 误操作 reset | `git reset --hard` 丢失未提交修改 | ⭐⭐⭐ 较难 |
| 分支切换丢失 | 切换分支时未 stash 导致丢失 | ⭐⭐ 中等 |
| 文件被删除 | 手动删除或清理时误删 | ⭐ 简单 |

### 恢复优先级

```
🔴 高优先级（核心功能）
   ↓
🟡 中优先级（辅助功能）
   ↓
🟢 低优先级（可选功能）
```

---

## 1. 关键修改文件清单

### 1.1 必须恢复的文件（🔴 高优先级）

| 文件 | 代码行数 | 关键修改 | 丢失影响 |
|------|----------|----------|----------|
| `apps/backend/spec/complexity.py` | ~1200 | 多维度复杂度评估 | 复杂度评估退化为简单关键词匹配 |
| `apps/backend/spec/phases/spec_phases.py` | ~350 | 分块写入逻辑 | 大型任务 spec 生成失败 |

### 1.2 重要恢复文件（🟡 中优先级）

| 文件 | 代码行数 | 关键修改 | 丢失影响 |
|------|----------|----------|----------|
| `apps/backend/spec/pipeline/orchestrator.py` | ~450 | 阶段摘要压缩、智能缓存 | 上下文过长、重复生成索引 |
| `apps/backend/spec/directory_scanner.py` | ~150 | 目录扫描估算 | spec 大小估算不准确 |
| `apps/backend/spec/compaction.py` | ~200 | 阶段摘要压缩 | 上下文传递过长 |

### 1.3 相关提示词文件（🟢 低优先级）

| 文件 | 用途 | 丢失影响 |
|------|------|----------|
| `apps/backend/prompts/spec_phases_writer.md` | 分块写入提示词 | 分块写入格式不正确 |
| `apps/backend/prompts/complexity_assessor.md` | AI 复杂度评估 | AI 评估结果不准确 |
| `apps/backend/prompts/spec_quick.md` | 快速 spec 生成 | SIMPLE 任务处理异常 |

### 1.4 文件依赖关系

```
complexity.py (核心)
    ↓ 被依赖
orchestrator.py (编排)
    ↓ 调用
spec_phases.py (分块写入)
    ↓ 使用
directory_scanner.py (估算)
    ↓ 辅助
compaction.py (压缩)
```

**恢复顺序**: 按依赖关系从上到下恢复

---

## 2. 快速恢复步骤

### 2.1 诊断丢失情况

首先确认哪些修改丢失了：

```bash
# 检查 complexity.py 是否包含多维度分析
grep -n "MultiDimensionalAnalysis" apps/backend/spec/complexity.py
# 如果无输出，说明多维度分析丢失

# 检查 spec_phases.py 是否包含分块写入
grep -n "_write_spec_chunked" apps/backend/spec/phases/spec_phases.py
# 如果无输出，说明分块写入丢失

# 检查分块阈值常量
grep -n "SPEC_SIZE_THRESHOLDS" apps/backend/spec/complexity.py
# 如果无输出，说明分块阈值丢失

# 检查目录扫描模块
ls apps/backend/spec/directory_scanner.py
# 如果文件不存在，说明目录扫描模块丢失
```

### 2.2 从 Git 历史恢复（推荐）

**方法 A: 查找并恢复特定提交**

```bash
# Step 1: 查看文件修改历史，找到包含自定义修改的提交
git log --oneline -- apps/backend/spec/complexity.py

# 输出示例:
# a1b2c3d 添加多维度复杂度评估
# e4f5g6h 上游合并
# ...

# Step 2: 查看特定提交的内容确认
git show a1b2c3d:apps/backend/spec/complexity.py | head -50

# Step 3: 恢复到指定提交的版本
git checkout a1b2c3d -- apps/backend/spec/complexity.py

# Step 4: 对其他文件重复上述步骤
git checkout a1b2c3d -- apps/backend/spec/phases/spec_phases.py
git checkout a1b2c3d -- apps/backend/spec/pipeline/orchestrator.py
git checkout a1b2c3d -- apps/backend/spec/directory_scanner.py
```

**方法 B: 恢复整个目录**

```bash
# 如果确定某个提交包含所有自定义修改
git checkout a1b2c3d -- apps/backend/spec/
```

**方法 C: 使用 git reflog 恢复（误操作 reset 后）**

```bash
# Step 1: 查看 reflog 找到丢失前的状态
git reflog

# 输出示例:
# a1b2c3d HEAD@{0}: reset: moving to upstream/main
# x7y8z9w HEAD@{1}: commit: 添加分块写入支持  <-- 这是丢失前的状态

# Step 2: 恢复到丢失前的状态
git checkout x7y8z9w -- apps/backend/spec/
```

### 2.3 从备份分支恢复

```bash
# 假设有备份分支 backup/custom-modifications
# Step 1: 确认备份分支存在
git branch -a | grep backup

# Step 2: 从备份分支恢复文件
git checkout backup/custom-modifications -- apps/backend/spec/complexity.py
git checkout backup/custom-modifications -- apps/backend/spec/phases/spec_phases.py
git checkout backup/custom-modifications -- apps/backend/spec/pipeline/orchestrator.py
git checkout backup/custom-modifications -- apps/backend/spec/directory_scanner.py
git checkout backup/custom-modifications -- apps/backend/spec/compaction.py

# Step 3: 恢复提示词文件
git checkout backup/custom-modifications -- apps/backend/prompts/spec_phases_writer.md
git checkout backup/custom-modifications -- apps/backend/prompts/complexity_assessor.md
```

### 2.4 从标签恢复

```bash
# 如果之前创建了标签
# Step 1: 列出所有标签
git tag -l "custom-*"

# Step 2: 查看标签对应的提交
git show custom-complexity-v1

# Step 3: 从标签恢复
git checkout custom-complexity-v1 -- apps/backend/spec/complexity.py
git checkout custom-chunking-v1 -- apps/backend/spec/phases/spec_phases.py
```

### 2.5 从 stash 恢复

```bash
# 如果之前 stash 了修改
# Step 1: 列出所有 stash
git stash list

# Step 2: 查看 stash 内容
git stash show -p stash@{0}

# Step 3: 应用 stash
git stash apply stash@{0}
```

---

## 3. 手动恢复核心代码

如果无法从 Git 恢复，按以下顺序手动添加代码。

### 3.1 恢复顺序

```
1. SPEC_SIZE_THRESHOLDS 常量
2. needs_chunking() 函数
3. MultiDimensionalAnalysis 类
4. ComplexityAssessment 类修改
5. ComplexityAnalyzer 类修改
6. spec_phases.py 分块写入方法
```

### 3.2 SPEC_SIZE_THRESHOLDS 常量

添加到 `complexity.py` 文件顶部（import 语句之后）:

```python
# Spec size thresholds for chunking decisions
SPEC_SIZE_THRESHOLDS = {
    "tiny": 5000,      # < 5K chars: no chunking needed
    "small": 15000,    # 5K-15K: might need chunking
    "medium": 50000,   # 15K-50K: needs chunking (2-3 chunks)
    "large": 150000,   # 50K-150K: needs chunking (4-6 chunks)
    "huge": 500000,    # > 150K: needs chunking (7+ chunks)
}
```

### 3.3 needs_chunking() 函数

添加到 `complexity.py`（常量之后）:

```python
def needs_chunking(estimated_size: int) -> tuple[bool, str, int]:
    """
    Determine if chunked creation is needed (standalone function).

    Args:
        estimated_size: Estimated character count

    Returns:
        (needs_chunking, size_level, suggested_chunks)
    """
    if estimated_size <= SPEC_SIZE_THRESHOLDS["small"]:
        return False, "small", 1
    elif estimated_size <= SPEC_SIZE_THRESHOLDS["medium"]:
        return True, "medium", max(2, estimated_size // 20000)
    elif estimated_size <= SPEC_SIZE_THRESHOLDS["large"]:
        return True, "large", max(3, estimated_size // 15000)
    else:
        return True, "huge", max(5, estimated_size // 30000)
```

### 3.4 MultiDimensionalAnalysis 类

添加到 `complexity.py`（Complexity 枚举之后）:

```python
@dataclass
class MultiDimensionalAnalysis:
    """Multi-dimensional complexity analysis result."""

    code_coupling: float = 2.0      # 0-10: Dependencies, cross-module impact
    cognitive: float = 2.0          # 0-10: Business logic, algorithms
    change_impact: float = 2.0      # 0-10: Breaking changes, regression risk
    domain_knowledge: float = 2.0   # 0-10: Tech stack, business domain
    test_complexity: float = 2.0    # 0-10: Coverage difficulty, mock needs
    resource_estimation: float = 2.0 # 0-10: File changes, code volume

    # Reasoning for each dimension
    code_coupling_reason: str = ""
    cognitive_reason: str = ""
    change_impact_reason: str = ""
    domain_knowledge_reason: str = ""
    test_complexity_reason: str = ""
    resource_estimation_reason: str = ""

    # Dimension weights
    WEIGHTS = {
        "code_coupling": 0.25,
        "cognitive": 0.20,
        "change_impact": 0.20,
        "domain_knowledge": 0.15,
        "test_complexity": 0.10,
        "resource_estimation": 0.10,
    }

    def composite_score(self) -> float:
        """Calculate weighted composite score (0-10)."""
        return (
            self.code_coupling * self.WEIGHTS["code_coupling"]
            + self.cognitive * self.WEIGHTS["cognitive"]
            + self.change_impact * self.WEIGHTS["change_impact"]
            + self.domain_knowledge * self.WEIGHTS["domain_knowledge"]
            + self.test_complexity * self.WEIGHTS["test_complexity"]
            + self.resource_estimation * self.WEIGHTS["resource_estimation"]
        )

    def get_complexity_tier(self) -> Complexity:
        """Map composite score to complexity tier."""
        score = self.composite_score()

        # Special rules: any dimension >= 8 triggers COMPLEX
        if any(
            dim >= 8
            for dim in [
                self.code_coupling,
                self.cognitive,
                self.change_impact,
                self.domain_knowledge,
                self.test_complexity,
                self.resource_estimation,
            ]
        ):
            return Complexity.COMPLEX

        # Special rule: code_coupling + change_impact >= 12 triggers COMPLEX
        if self.code_coupling + self.change_impact >= 12:
            return Complexity.COMPLEX

        # Special rule: cognitive >= 7 triggers COMPLEX
        if self.cognitive >= 7:
            return Complexity.COMPLEX

        # Special rule: domain_knowledge >= 7 triggers COMPLEX
        if self.domain_knowledge >= 7:
            return Complexity.COMPLEX

        # Special rule: multiple high dimensions (>= 6) triggers COMPLEX
        high_dims = sum(
            1
            for dim in [
                self.code_coupling,
                self.cognitive,
                self.change_impact,
                self.domain_knowledge,
                self.test_complexity,
                self.resource_estimation,
            ]
            if dim >= 6
        )
        if high_dims >= 3:
            return Complexity.COMPLEX

        if score <= 3.0:
            return Complexity.SIMPLE
        elif score <= 6.0:
            return Complexity.STANDARD
        else:
            return Complexity.COMPLEX

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "code_coupling": {
                "score": self.code_coupling,
                "reasoning": self.code_coupling_reason,
            },
            "cognitive": {"score": self.cognitive, "reasoning": self.cognitive_reason},
            "change_impact": {
                "score": self.change_impact,
                "reasoning": self.change_impact_reason,
            },
            "domain_knowledge": {
                "score": self.domain_knowledge,
                "reasoning": self.domain_knowledge_reason,
            },
            "test_complexity": {
                "score": self.test_complexity,
                "reasoning": self.test_complexity_reason,
            },
            "resource_estimation": {
                "score": self.resource_estimation,
                "reasoning": self.resource_estimation_reason,
            },
            "composite_score": self.composite_score(),
            "complexity_tier": self.get_complexity_tier().value,
        }
```

### 3.5 ComplexityAssessment 类修改

确保 `ComplexityAssessment` 类包含以下字段（添加到现有字段之后）:

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

    # ========== 新增字段 ==========
    # Chunking-related fields for spec generation
    estimated_spec_size: int = 0
    requires_chunking: bool = False
    chunking_strategy: str = "single"  # single, small, medium, large
    suggested_chunks: int = 1

    # Multi-dimensional analysis
    multi_dimensional: MultiDimensionalAnalysis = field(
        default_factory=MultiDimensionalAnalysis
    )
    # ========== 新增字段结束 ==========
```

### 3.6 分块写入方法

添加到 `spec_phases.py` 的 `SpecPhaseMixin` 类:

```python
async def _write_spec_chunked(self, spec_file: Path, assessment: dict) -> PhaseResult:
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
    MAX_RETRIES = 3

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
                spec_file.unlink()

            if success and chunk_file.exists():
                if self._sanity_check_chunk(chunk_file, chunk_idx, num_chunks):
                    chunk_success = True
                    successful_chunks.append(chunk_file)
                    self.ui.print_status(
                        f"Chunk {chunk_idx}/{num_chunks} completed", "success"
                    )
                    break

        if not chunk_success:
            self.ui.print_status(
                f"Failed to create chunk {chunk_idx} after {MAX_RETRIES} attempts",
                "error",
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
        return PhaseResult(
            "spec_writing",
            False,
            [str(spec_file)],
            [f"Merged spec invalid: {result.errors}"],
            0,
        )

def _determine_section_range(self, part_num: int, total_parts: int) -> str:
    """Determine which sections each chunk should write."""
    sections = [
        "Overview", "Workflow Type", "Task Scope", "Service Context",
        "Files to Modify", "Files to Reference", "Patterns to Follow",
        "Requirements", "Implementation Notes", "Development Environment",
        "Success Criteria", "QA Acceptance Criteria",
    ]

    total_sections = len(sections)
    sections_per_part = total_sections // total_parts
    remainder = total_sections % total_parts

    start_idx = (part_num - 1) * sections_per_part + min(part_num - 1, remainder)
    end_idx = start_idx + sections_per_part + (1 if part_num <= remainder else 0)

    start_section = sections[start_idx]
    end_section = sections[min(end_idx - 1, total_sections - 1)]

    return f"{start_section} to {end_section}"

def _sanity_check_chunk(self, chunk_file: Path, chunk_idx: int, num_chunks: int) -> bool:
    """Perform basic validation on a chunk file."""
    try:
        content = chunk_file.read_text(encoding="utf-8")

        if len(content) < 100:
            return False

        if f"<!-- PART {chunk_idx} START -->" not in content:
            return False

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
```

### 3.7 修改 phase_spec_writing 方法

修改 `spec_phases.py` 中的 `phase_spec_writing` 方法，添加分块判断：

```python
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

    # ========== 新增：检查是否需要分块 ==========
    assessment = self._load_complexity_assessment()
    if assessment and assessment.get("requires_chunking", False):
        return await self._write_spec_chunked(spec_file, assessment)
    else:
        return await self._write_spec_single_shot(spec_file)
    # ========== 新增结束 ==========

def _load_complexity_assessment(self) -> dict | None:
    """Load complexity assessment from file."""
    assessment_file = self.spec_dir / "complexity_assessment.json"
    if assessment_file.exists():
        with open(assessment_file, encoding="utf-8") as f:
            return json.load(f)
    return None
```

---

## 4. 验证恢复结果

### 4.1 快速检查脚本

创建一个检查脚本 `check_recovery.py`:

```python
#!/usr/bin/env python3
"""检查自定义修改是否已恢复"""

import sys
from pathlib import Path

def check_file_exists(filepath: str) -> bool:
    """检查文件是否存在"""
    return Path(filepath).exists()

def check_content_contains(filepath: str, content: str) -> bool:
    """检查文件是否包含指定内容"""
    try:
        return content in Path(filepath).read_text()
    except:
        return False

def main():
    checks = [
        # (描述, 文件路径, 检查内容)
        ("分块阈值常量", "apps/backend/spec/complexity.py", "SPEC_SIZE_THRESHOLDS"),
        ("needs_chunking 函数", "apps/backend/spec/complexity.py", "def needs_chunking"),
        ("MultiDimensionalAnalysis 类", "apps/backend/spec/complexity.py", "class MultiDimensionalAnalysis"),
        ("分块写入方法", "apps/backend/spec/phases/spec_phases.py", "_write_spec_chunked"),
        ("章节分配方法", "apps/backend/spec/phases/spec_phases.py", "_determine_section_range"),
        ("Chunk 验证方法", "apps/backend/spec/phases/spec_phases.py", "_sanity_check_chunk"),
        ("目录扫描模块", "apps/backend/spec/directory_scanner.py", None),
    ]
    
    all_passed = True
    print("=" * 60)
    print("自定义修改恢复检查")
    print("=" * 60)
    
    for desc, filepath, content in checks:
        if content is None:
            # 只检查文件存在
            passed = check_file_exists(filepath)
        else:
            passed = check_content_contains(filepath, content)
        
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"{status} | {desc}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    if all_passed:
        print("✅ 所有检查通过，恢复成功！")
        return 0
    else:
        print("❌ 部分检查失败，请继续恢复")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

运行检查:

```bash
python check_recovery.py
```

### 4.2 运行单元测试

```bash
cd apps/backend

# 测试复杂度评估
python -m pytest tests/test_spec_complexity.py -v

# 测试 spec 阶段
python -m pytest tests/test_spec_phases.py -v

# 运行所有 spec 相关测试
python -m pytest tests/test_spec*.py -v
```

### 4.3 功能验证

**验证复杂度评估**:

```bash
cd apps/backend
python -c "
from spec.complexity import ComplexityAnalyzer, SPEC_SIZE_THRESHOLDS, needs_chunking

# 测试 1: 检查常量
print('分块阈值:', SPEC_SIZE_THRESHOLDS)

# 测试 2: 检查 needs_chunking 函数
result = needs_chunking(100000)
print(f'100K 字符: 需要分块={result[0]}, 策略={result[1]}, 块数={result[2]}')

# 测试 3: 测试复杂度评估
analyzer = ComplexityAnalyzer()
result = analyzer.analyze('实现一个复杂的分布式缓存系统，需要集成 Redis 和 Kafka')
print(f'复杂度: {result.complexity.value}')
print(f'需要分块: {result.requires_chunking}')
print(f'建议块数: {result.suggested_chunks}')
print(f'多维度分析: {result.multi_dimensional.to_dict()}')
"
```

**验证分块写入**:

```bash
cd apps/backend
python -c "
from spec.phases.spec_phases import SpecPhaseMixin

# 检查方法是否存在
methods = ['_write_spec_chunked', '_determine_section_range', '_sanity_check_chunk', '_merge_spec_chunks']
for method in methods:
    if hasattr(SpecPhaseMixin, method):
        print(f'✅ {method} 存在')
    else:
        print(f'❌ {method} 缺失')
"
```

### 4.4 集成测试

创建一个简单的 spec 来验证完整流程:

```bash
cd apps/backend
python -c "
import asyncio
from pathlib import Path
from spec.pipeline.orchestrator import SpecOrchestrator

async def test_spec_creation():
    # 创建测试 spec
    orchestrator = SpecOrchestrator(
        project_dir=Path('.'),
        task_description='添加一个简单的日志功能',
        complexity_override='simple',  # 强制使用 SIMPLE 复杂度
    )
    
    # 只运行复杂度评估
    assessment = orchestrator._heuristic_assessment()
    print(f'复杂度: {assessment.complexity.value}')
    print(f'需要分块: {assessment.requires_chunking}')
    print('✅ 集成测试通过')

asyncio.run(test_spec_creation())
"
```

---

## 5. 预防措施

### 5.1 合并前备份

**方法 A: 创建备份分支**

```bash
# 在合并上游前创建备份分支
git checkout -b backup/custom-modifications-$(date +%Y%m%d)
git push origin backup/custom-modifications-$(date +%Y%m%d)

# 切回主分支进行合并
git checkout main
```

**方法 B: 创建标签**

```bash
# 标记当前状态
git tag -a custom-mods-$(date +%Y%m%d) -m "自定义修改备份 $(date +%Y-%m-%d)"
git push origin custom-mods-$(date +%Y%m%d)
```

**方法 C: 导出补丁**

```bash
# 导出自定义修改为补丁文件
git diff upstream/main -- apps/backend/spec/ > custom-spec-modifications.patch

# 保存补丁文件到安全位置
cp custom-spec-modifications.patch ~/backups/
```

### 5.2 合并策略

**推荐流程**:

```bash
# Step 1: 更新上游
git fetch upstream

# Step 2: 创建备份
git checkout -b backup/pre-merge-$(date +%Y%m%d)
git checkout main

# Step 3: 使用 --no-commit 合并，先检查
git merge upstream/main --no-commit

# Step 4: 检查哪些文件被修改
git diff --name-only --cached | grep "spec/"

# Step 5: 如果自定义文件被修改，恢复它们
git checkout HEAD -- apps/backend/spec/complexity.py
git checkout HEAD -- apps/backend/spec/phases/spec_phases.py
# ... 其他文件

# Step 6: 完成合并
git commit -m "Merge upstream/main, preserved custom modifications"
```

### 5.3 自动化保护

创建 Git hook 在合并前自动备份:

```bash
# 创建 pre-merge-commit hook
cat > .git/hooks/pre-merge-commit << 'EOF'
#!/bin/bash
# 自动备份自定义修改

BACKUP_DIR=".git/custom-backups"
mkdir -p "$BACKUP_DIR"

# 备份关键文件
cp apps/backend/spec/complexity.py "$BACKUP_DIR/complexity.py.bak"
cp apps/backend/spec/phases/spec_phases.py "$BACKUP_DIR/spec_phases.py.bak"

echo "✅ 自定义修改已备份到 $BACKUP_DIR"
EOF

chmod +x .git/hooks/pre-merge-commit
```

### 5.4 定期备份脚本

```bash
#!/bin/bash
# backup-custom-mods.sh - 定期备份自定义修改

BACKUP_DIR="$HOME/auto-claude-backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# 备份文件列表
FILES=(
    "apps/backend/spec/complexity.py"
    "apps/backend/spec/phases/spec_phases.py"
    "apps/backend/spec/pipeline/orchestrator.py"
    "apps/backend/spec/directory_scanner.py"
    "apps/backend/spec/compaction.py"
    "apps/backend/prompts/spec_phases_writer.md"
    "apps/backend/prompts/complexity_assessor.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "✅ 备份: $file"
    else
        echo "⚠️ 文件不存在: $file"
    fi
done

echo "备份完成: $BACKUP_DIR"
```

---

## 6. 常见问题

### 6.1 恢复后测试失败

**问题**: 恢复文件后，测试报错 `ImportError`

**解决**:
```bash
# 检查是否有循环导入
python -c "from spec.complexity import ComplexityAnalyzer"

# 如果报错，检查 import 语句顺序
```

### 6.2 分块写入不生效

**问题**: 大型任务仍然使用单次写入

**检查**:
```bash
# 检查 complexity_assessment.json 中的 requires_chunking 字段
cat .auto-claude/specs/xxx/complexity_assessment.json | grep requires_chunking
```

**解决**: 确保 `ComplexityAssessment` 类包含 `requires_chunking` 字段

### 6.3 合并后代码冲突

**问题**: 上游修改了同一文件，产生冲突

**解决**:
```bash
# 查看冲突
git diff --name-only --diff-filter=U

# 手动解决冲突，保留自定义修改
# 然后标记为已解决
git add <conflicted-file>
git commit
```

---

## 7. 参考文档

| 文档 | 说明 |
|------|------|
| `docs/Planning/01-plan-phases.md` | Plan 阶段流程详解 |
| `docs/Planning/02-upstream-modifications.md` | 上游修改详细记录 |
| `docs/git/README.md` | Git 操作指南 |
