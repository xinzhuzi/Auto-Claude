# 上游分支修改和优化记录

## 概述

本文档记录了 Auto-Claude 项目对上游代码的主要修改和优化，特别是复杂度评估和分块写入逻辑。这些修改是为了适应大型项目和复杂任务的需求。

## 修改动机

| 问题 | 上游行为 | 优化后行为 |
|------|----------|------------|
| 大型任务 spec 生成失败 | 一次性生成，容易超出 token 限制 | 分块生成，自动合并 |
| 复杂度评估不准确 | 简单关键词匹配 | 六维度加权评估 |
| 不必要的阶段执行 | 固定阶段流程 | 根据复杂度动态选择 |
| 上下文过长 | 完整传递所有阶段输出 | 阶段摘要压缩 |
| 项目索引重复生成 | 每次都重新生成 | 智能缓存，按需刷新 |

## 核心修改文件

| 文件 | 修改类型 | 代码行数 | 说明 |
|------|----------|----------|------|
| `apps/backend/spec/complexity.py` | 重大增强 | ~1200 行 | 多维度复杂度评估 |
| `apps/backend/spec/phases/spec_phases.py` | 新增功能 | ~350 行 | 分块写入支持 |
| `apps/backend/spec/pipeline/orchestrator.py` | 流程优化 | ~450 行 | 动态阶段选择、摘要压缩 |
| `apps/backend/spec/directory_scanner.py` | 新增文件 | ~150 行 | 目录扫描估算 |
| `apps/backend/spec/compaction.py` | 新增文件 | ~200 行 | 阶段摘要压缩 |

---

## 1. 复杂度评估系统 (complexity.py)

### 1.1 上游 vs 优化后对比

| 方面 | 上游实现 | 优化后实现 |
|------|----------|------------|
| 评估方式 | 单一关键词计数 | 六维度加权评估 |
| 复杂度级别 | 3 级 (SIMPLE/STANDARD/COMPLEX) | 3 级 + 特殊触发规则 |
| 分块支持 | 无 | 自动检测并分块 |
| 文档任务 | 不支持 | 支持章节数检测 |

### 1.2 多维度分析模型

**原始逻辑**: 简单的关键词匹配，只有 SIMPLE/STANDARD/COMPLEX 三级

**优化后**: 六维度加权评估系统

```python
class MultiDimensionalAnalysis:
    """多维度复杂度分析结果"""
    
    # 六个评估维度及权重
    WEIGHTS = {
        "code_coupling": 0.25,      # 代码耦合度 (25%)
        "cognitive": 0.20,          # 认知复杂度 (20%)
        "change_impact": 0.20,      # 变更影响 (20%)
        "domain_knowledge": 0.15,   # 领域知识 (15%)
        "test_complexity": 0.10,    # 测试复杂度 (10%)
        "resource_estimation": 0.10 # 资源估算 (10%)
    }
```

### 1.3 各维度评估逻辑详解

#### 1.3.1 代码耦合度 (Code Coupling) - 权重 25%

**基础分**: 2.0

**核心模块关键词** (每个 +2.0，上限 +5):
```python
CORE_MODULE_KEYWORDS = [
    "base", "core", "common", "shared", "utils", "helpers",
    "middleware", "interceptor", "decorator", "mixin",
    "abstract", "interface", "protocol", "contract"
]
```

**跨服务通信关键词** (每个 +1.5，上限 +4):
```python
CROSS_SERVICE_KEYWORDS = [
    "api", "rpc", "grpc", "graphql", "websocket",
    "event", "message", "queue", "pubsub", "broadcast"
]
```

**服务数量加分**:
- 2 个服务: +1.5
- 3+ 个服务: +3.0

**外部集成加分** (每个 +1.0，上限 +3)

#### 1.3.2 认知复杂度 (Cognitive) - 权重 20%

**基础分**: 2.0

**算法复杂度分级**:
```python
ALGORITHM_COMPLEXITY = {
    "exponential": [  # +5.0
        "np-hard", "combinatorial", "permutation", "backtracking",
        "branch and bound", "genetic", "simulated annealing"
    ],
    "polynomial": [  # +4.0
        "graph", "shortest path", "spanning tree", 
        "dynamic programming", "matrix", "optimization"
    ],
    "logarithmic": [  # +2.5
        "binary search", "tree traversal", "divide and conquer",
        "heap", "balanced tree", "index"
    ],
    "linear": [  # +0.5
        "iterate", "loop", "map", "filter", "reduce", "sequential", "scan"
    ]
}
```

**并发复杂度分级**:
```python
CONCURRENCY_KEYWORDS = {
    "distributed": [  # +5.0
        "distributed", "consensus", "raft", "paxos", "2pc", "saga",
        "eventual consistency", "cqrs", "event sourcing"
    ],
    "parallel": [  # +3.5
        "parallel", "multithread", "worker pool", 
        "fork join", "map reduce", "scatter gather"
    ],
    "async": [  # +2.0
        "async", "await", "promise", "future", 
        "callback", "event loop", "non-blocking"
    ]
}
```

**状态管理关键词** (每个 +0.8，上限 +2.5):
```python
["state", "session", "cache", "store", "persist", "transaction"]
```

**业务逻辑关键词** (每个 +0.8，上限 +2.5):
```python
["workflow", "rule", "policy", "validation", "approval"]
```

#### 1.3.3 变更影响 (Change Impact) - 权重 20%

**基础分**: 2.0

**破坏性变更关键词** (每个 +1.5，上限 +4):
```python
BREAKING_CHANGE_KEYWORDS = [
    "remove", "delete", "deprecate", "rename", "replace",
    "migrate", "breaking", "incompatible", "major"
]
```

**高风险区域** (每个 +2.0，上限 +5):
```python
REGRESSION_RISK_AREAS = [
    "authentication", "authorization", "payment", "billing",
    "data integrity", "security", "performance", "caching",
    "session", "state", "transaction", "concurrency"
]
```

**基础设施变更**: +3.0

**API/Schema 关键词** (每个 +0.8，上限 +2.5):
```python
["api", "schema", "endpoint", "contract", "interface"]
```

#### 1.3.4 领域知识 (Domain Knowledge) - 权重 15%

**基础分**: 2.0

**领域复杂度分级**:
```python
DOMAIN_COMPLEXITY = {
    "expert": [  # +5.0
        "finance", "healthcare", "legal", "insurance", "trading",
        "compliance", "security", "cryptography", "machine learning",
        "ml pipeline", "deep learning", "neural network", "tensorflow",
        "pytorch", "computer vision", "nlp", "natural language",
        "fraud detection", "recommendation", "ai model"
    ],
    "specialized": [  # +3.0
        "e-commerce", "logistics", "inventory", "crm", "erp",
        "analytics", "reporting", "workflow", "notification",
        "messaging", "search"
    ],
    "generic": [  # +0.0
        "crud", "admin", "dashboard", "settings", 
        "profile", "preferences", "ui", "styling"
    ]
}
```

**外部 API 学习成本** (每个 +1.5，上限 +4)

**新技术指标** (每个 +0.8，上限 +2):
```python
["new", "unfamiliar", "first time", "learn", "research"]
```

#### 1.3.5 测试复杂度 (Test Complexity) - 权重 10%

**基础分**: 2.0

**外部依赖 Mock** (每个 +1.5，上限 +4)

**基础设施测试**: +2.5

**E2E 测试关键词** (每个 +1.5，上限 +3):
```python
["user flow", "end to end", "e2e", "integration", "full stack"]
```

**安全测试关键词** (每个 +1.0，上限 +3):
```python
["security", "auth", "permission", "encryption", "credential"]
```

#### 1.3.6 资源估算 (Resource Estimation) - 权重 10%

**文件数量评分**:
| 文件数 | 分数 |
|--------|------|
| 1-2 | 2.0 |
| 3-5 | 3.5 |
| 6-10 | 5.5 |
| 11-20 | 7.5 |
| 21+ | 9.0 |

**服务数量调整**: (服务数 - 1) × 1.5，上限 +4

**复杂关键词调整**: 关键词数 × 0.5，上限 +3

### 1.4 复杂度阈值规则

```python
def get_complexity_tier(self) -> Complexity:
    """根据综合分数确定复杂度级别"""
    score = self.composite_score()
    
    # 特殊规则 1：任何维度 >= 8 触发 COMPLEX
    if any(dim >= 8 for dim in [
        self.code_coupling, self.cognitive, self.change_impact,
        self.domain_knowledge, self.test_complexity, self.resource_estimation
    ]):
        return Complexity.COMPLEX
    
    # 特殊规则 2：code_coupling + change_impact >= 12 触发 COMPLEX
    if self.code_coupling + self.change_impact >= 12:
        return Complexity.COMPLEX
    
    # 特殊规则 3：cognitive >= 7 触发 COMPLEX（复杂算法/并发）
    if self.cognitive >= 7:
        return Complexity.COMPLEX
    
    # 特殊规则 4：domain_knowledge >= 7 触发 COMPLEX（专家领域）
    if self.domain_knowledge >= 7:
        return Complexity.COMPLEX
    
    # 特殊规则 5：3个以上维度 >= 6 触发 COMPLEX
    high_dims = sum(1 for dim in [...] if dim >= 6)
    if high_dims >= 3:
        return Complexity.COMPLEX
    
    # 标准阈值
    if score <= 3.0:
        return Complexity.SIMPLE
    elif score <= 6.0:
        return Complexity.STANDARD
    else:
        return Complexity.COMPLEX
```

### 1.5 Spec 大小估算

```python
def estimate_spec_size(self, task_description: str, requirements: dict | None = None) -> int:
    """估算 spec.md 的预期大小（字符数）"""
    
    # 方法 1：目录扫描（更准确）
    scan_result = estimate_from_paths(task_description, project_dir)
    if scan_result:
        file_count, total_chars = scan_result
        return total_chars + 3000  # 加上模板基础大小
    
    # 方法 2：启发式估算（回退）
    base_size = 3000  # 基础模板大小
    base_size += len(task_description) * 2  # 任务描述长度
    
    if requirements:
        base_size += len(requirements.get("user_requirements", [])) * 500
        base_size += len(requirements.get("acceptance_criteria", [])) * 300
        base_size += len(requirements.get("services_involved", [])) * 800
    
    # 文档类任务特殊处理
    if self._is_documentation_task(task_lower):
        chapter_count = self._extract_chapter_count(task_lower)
        stage = self._infer_documentation_stage(task_lower)
        stage_multipliers = {
            "outline": 2000,   # 大纲
            "chapter": 5000,   # 章节细纲
            "content": 10000,  # 正文内容
            "general": 3000    # 通用
        }
        base_size += chapter_count * stage_multipliers.get(stage, 3000)
    
    return base_size
```

### 1.6 分块决策逻辑

```python
SPEC_SIZE_THRESHOLDS = {
    "tiny": 5000,      # < 5K: 不需要分块
    "small": 15000,    # 5K-15K: 可能需要分块
    "medium": 50000,   # 15K-50K: 需要分块 (2-3 块)
    "large": 150000,   # 50K-150K: 需要分块 (4-6 块)
    "huge": 500000,    # > 150K: 需要分块 (7+ 块)
}

def needs_chunking(estimated_size: int) -> tuple[bool, str, int]:
    """判断是否需要分块写入
    
    Returns:
        (是否分块, 大小级别, 建议块数)
    """
    if estimated_size <= SPEC_SIZE_THRESHOLDS["small"]:
        return False, "small", 1
    elif estimated_size <= SPEC_SIZE_THRESHOLDS["medium"]:
        # 每 20K 一个 chunk，至少 2 个
        return True, "medium", max(2, estimated_size // 20000)
    elif estimated_size <= SPEC_SIZE_THRESHOLDS["large"]:
        # 每 15K 一个 chunk，至少 3 个
        return True, "large", max(3, estimated_size // 15000)
    else:
        # 每 30K 一个 chunk，至少 5 个
        return True, "huge", max(5, estimated_size // 30000)
```

### 1.7 外部集成检测

```python
def _detect_integrations(self, task_lower: str) -> list[str]:
    """检测任务中提到的外部集成"""
    integration_patterns = [
        r"\b(graphiti|graphql|apollo)\b",
        r"\b(stripe|paypal|payment)\b",
        r"\b(auth0|okta|oauth|jwt)\b",
        r"\b(aws|gcp|azure|s3|lambda)\b",
        r"\b(redis|memcached|cache)\b",
        r"\b(postgres|mysql|mongodb|database)\b",
        r"\b(elasticsearch|algolia|search)\b",
        r"\b(kafka|rabbitmq|sqs|queue)\b",
        r"\b(docker|kubernetes|k8s)\b",
        r"\b(openai|anthropic|llm|ai)\b",
        r"\b(sendgrid|twilio|email|sms)\b",
    ]
    # 返回匹配到的集成列表
```

### 1.8 基础设施变更检测

```python
def _detect_infrastructure_changes(self, task_lower: str) -> bool:
    """检测是否涉及基础设施变更"""
    infra_patterns = [
        r"\bdocker\b",
        r"\bkubernetes\b", r"\bk8s\b",
        r"\bdeploy\b",
        r"\binfrastructure\b",
        r"\bci/cd\b",
        r"\benvironment\b",
        r"\bconfig\b",
        r"\b\.env\b",
        r"\bdatabase migration\b",
        r"\bschema\b",
    ]
    return any(re.search(p, task_lower) for p in infra_patterns)
```

---

## 2. 分块写入系统 (spec_phases.py)

### 2.1 上游 vs 优化后对比

| 方面 | 上游实现 | 优化后实现 |
|------|----------|------------|
| 写入方式 | 单次写入 | 单次/分块自动选择 |
| 大型任务 | 容易失败 | 分块处理，稳定性高 |
| 章节管理 | 无 | 自动分配章节到 chunk |
| 错误恢复 | 无 | 每个 chunk 独立重试 |

### 2.2 写入模式选择

```python
async def phase_spec_writing(self) -> PhaseResult:
    """规范文档写入 - 支持分块模式"""
    spec_file = self.spec_dir / "spec.md"
    
    # 如果已存在且有效，跳过
    if spec_file.exists():
        result = self.spec_validator.validate_spec_document()
        if result.valid:
            return PhaseResult("spec_writing", True, [str(spec_file)], [], 0)
    
    # 检查是否需要分块
    assessment = self._load_complexity_assessment()
    if assessment and assessment.get("requires_chunking", False):
        return await self._write_spec_chunked(spec_file, assessment)
    else:
        return await self._write_spec_single_shot(spec_file)
```

### 2.3 单次写入模式

```python
async def _write_spec_single_shot(self, spec_file: Path) -> PhaseResult:
    """单次写入模式 - 适用于小型任务"""
    errors = []
    MAX_RETRIES = 3
    
    for attempt in range(MAX_RETRIES):
        # 调用 AI 生成完整 spec
        success, output = await self.run_agent_fn(
            "spec_writer.md",  # 使用单次写入提示词
            phase_name="spec_writing",
        )
        
        if success and spec_file.exists():
            # 验证生成的 spec
            result = self.spec_validator.validate_spec_document()
            if result.valid:
                return PhaseResult("spec_writing", True, [str(spec_file)], [], attempt)
            else:
                errors.append(f"Attempt {attempt + 1}: Spec invalid - {result.errors}")
        else:
            errors.append(f"Attempt {attempt + 1}: Agent did not create spec.md")
    
    return PhaseResult("spec_writing", False, [], errors, MAX_RETRIES)
```

### 2.4 分块写入模式详解

```python
async def _write_spec_chunked(self, spec_file: Path, assessment: dict) -> PhaseResult:
    """分块写入模式 - 适用于大型任务"""
    num_chunks = assessment.get("suggested_chunks", 2)
    strategy = assessment.get("chunking_strategy", "medium")
    
    # Step 1: 准备工作
    chunks_dir = self.spec_dir / "chunks"
    chunks_dir.mkdir(exist_ok=True)
    
    # Step 2: 清理旧文件
    for old_chunk in chunks_dir.glob("chunk_*.md"):
        old_chunk.unlink()
    
    # Step 3: 删除现有 spec.md（防止 AI 读取旧内容）
    if spec_file.exists():
        spec_file.unlink()
    
    # Step 4: 循环写入每个 chunk
    successful_chunks = []
    errors = []
    
    for chunk_idx in range(1, num_chunks + 1):
        section_range = self._determine_section_range(chunk_idx, num_chunks)
        
        # 构建 chunk 上下文
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
            success, output = await self.run_agent_fn(
                "spec_phases_writer.md",  # 使用分块写入提示词
                additional_context=context_str,
                phase_name=f"spec_chunk_{chunk_idx}",
            )
            
            chunk_file = chunks_dir / f"chunk_{chunk_idx}.md"
            
            # 检查 AI 是否误创建了 spec.md
            if spec_file.exists():
                spec_file.unlink()  # 删除误创建的文件
            
            if success and chunk_file.exists():
                if self._sanity_check_chunk(chunk_file, chunk_idx, num_chunks):
                    chunk_success = True
                    successful_chunks.append(chunk_file)
                    break
        
        if not chunk_success:
            errors.append(f"Failed to create chunk {chunk_idx}")
    
    # Step 5: 合并所有 chunks
    if len(successful_chunks) == 0:
        return PhaseResult("spec_writing", False, [], ["No chunks were created"], MAX_RETRIES)
    
    merged_content = self._merge_spec_chunks(chunks_dir, num_chunks)
    
    # Step 6: 写入最终 spec.md
    with open(spec_file, "w", encoding="utf-8") as f:
        f.write(merged_content)
    
    # Step 7: 验证最终结果
    result = self.spec_validator.validate_spec_document()
    if result.valid:
        return PhaseResult("spec_writing", True, [str(spec_file)], [], 0)
    else:
        return PhaseResult("spec_writing", False, [str(spec_file)], 
                          [f"Merged spec invalid: {result.errors}"], 0)
```

### 2.5 章节分配逻辑

```python
def _determine_section_range(self, part_num: int, total_parts: int) -> str:
    """确定每个 chunk 负责的章节"""
    
    # Spec 标准章节列表（共 12 个）
    sections = [
        "Overview",              # 1. 概述
        "Workflow Type",         # 2. 工作流类型
        "Task Scope",            # 3. 任务范围
        "Service Context",       # 4. 服务上下文
        "Files to Modify",       # 5. 需要修改的文件
        "Files to Reference",    # 6. 需要参考的文件
        "Patterns to Follow",    # 7. 需要遵循的模式
        "Requirements",          # 8. 需求详情
        "Implementation Notes",  # 9. 实现注意事项
        "Development Environment", # 10. 开发环境
        "Success Criteria",      # 11. 成功标准
        "QA Acceptance Criteria", # 12. QA 验收标准
    ]
    
    total_sections = len(sections)  # 12
    sections_per_part = total_sections // total_parts
    remainder = total_sections % total_parts
    
    # 计算当前 chunk 的起止索引
    start_idx = (part_num - 1) * sections_per_part + min(part_num - 1, remainder)
    end_idx = start_idx + sections_per_part + (1 if part_num <= remainder else 0)
    
    start_section = sections[start_idx]
    end_section = sections[min(end_idx - 1, total_sections - 1)]
    
    return f"{start_section} to {end_section}"
```

**分配示例**:

| Chunk 数 | Chunk 1 | Chunk 2 | Chunk 3 | Chunk 4 |
|----------|---------|---------|---------|---------|
| 2 | 1-6 节 | 7-12 节 | - | - |
| 3 | 1-4 节 | 5-8 节 | 9-12 节 | - |
| 4 | 1-3 节 | 4-6 节 | 7-9 节 | 10-12 节 |

### 2.6 Chunk 验证规则

```python
def _sanity_check_chunk(self, chunk_file: Path, chunk_idx: int, num_chunks: int) -> bool:
    """验证 chunk 文件格式"""
    try:
        content = chunk_file.read_text(encoding="utf-8")
        
        # 规则 1: 最小大小检查
        if len(content) < 100:
            return False
        
        # 规则 2: 必须包含 PART 开始标记
        if f"<!-- PART {chunk_idx} START -->" not in content:
            return False
        
        # 规则 3: 检查结束标记
        if chunk_idx == num_chunks:
            # 最后一个 chunk 使用 FINAL PART 标记
            if "<!-- FINAL PART -->" not in content:
                return False
        else:
            # 中间 chunk 使用 PART N END 标记
            if f"<!-- PART {chunk_idx} END -->" not in content:
                return False
        
        return True
    except Exception:
        return False
```

### 2.7 Chunk 合并逻辑

```python
def _merge_spec_chunks(self, chunks_dir: Path, num_chunks: int) -> str:
    """合并所有 chunk 文件为最终 spec 内容"""
    merged_parts = []
    
    for chunk_idx in range(1, num_chunks + 1):
        chunk_file = chunks_dir / f"chunk_{chunk_idx}.md"
        if not chunk_file.exists():
            continue
        
        content = chunk_file.read_text(encoding="utf-8")
        
        # 移除 PART 标记
        content = re.sub(r"<!-- PART \d+ START -->\n?", "", content)
        content = re.sub(r"<!-- PART \d+ END -->\n?", "", content)
        content = re.sub(r"<!-- FINAL PART -->\n?", "", content)
        
        merged_parts.append(content.strip())
    
    # 合并并去重标题
    merged = "\n\n".join(merged_parts)
    merged = self._deduplicate_headers(merged)
    
    return merged

def _deduplicate_headers(self, content: str) -> str:
    """移除重复的 Markdown 标题"""
    lines = content.split("\n")
    seen_headers = set()
    result = []
    
    for line in lines:
        if line.startswith("#"):
            if line in seen_headers:
                continue  # 跳过重复标题
            seen_headers.add(line)
        result.append(line)
    
    return "\n".join(result)
```

---

## 3. 编排器优化 (orchestrator.py)

### 3.1 上游 vs 优化后对比

| 方面 | 上游实现 | 优化后实现 |
|------|----------|------------|
| 阶段选择 | 固定流程 | 根据复杂度动态选择 |
| 上下文传递 | 完整传递 | 阶段摘要压缩 |
| 项目索引 | 每次重新生成 | 智能缓存 |
| 错误处理 | 简单失败 | 详细错误信息 + 重试 |

### 3.2 动态阶段选择

根据复杂度评估结果，动态决定执行哪些阶段：

```python
def phases_to_run(self) -> list[str]:
    """根据复杂度返回要执行的阶段列表"""
    
    # 如果 AI 提供了推荐阶段，使用 AI 推荐
    if self.recommended_phases:
        return self.recommended_phases
    
    # 否则使用默认阶段集
    if self.complexity == Complexity.SIMPLE:
        return [
            "discovery",
            "historical_context",  # 可选，Graphiti 未启用时跳过
            "quick_spec",          # 简化的 spec 生成
            "validation"
        ]
    
    elif self.complexity == Complexity.STANDARD:
        phases = [
            "discovery",
            "historical_context",
            "requirements"
        ]
        if self.needs_research:
            phases.append("research")  # 可选
        phases.extend([
            "context",
            "spec_writing",
            "planning",
            "validation"
        ])
        return phases
    
    else:  # COMPLEX
        return [
            "discovery",
            "historical_context",
            "requirements",
            "research",        # 必须
            "context",
            "spec_writing",
            "self_critique",   # 必须
            "planning",
            "validation"
        ]
```

**阶段执行流程**:

```python
async def run(self, interactive: bool = True, auto_approve: bool = False) -> bool:
    """运行 spec 创建流程"""
    
    # 1. Discovery（必须）
    result = await run_phase("discovery", phase_executor.phase_discovery)
    await self._store_phase_summary("discovery")  # 存储摘要
    
    # 2. Requirements（必须）
    result = await run_phase("requirements", phase_executor.phase_requirements)
    await self._store_phase_summary("requirements")
    
    # 3. Complexity Assessment（必须）
    result = await run_phase("complexity_assessment", self._phase_complexity_assessment)
    
    # 4. 获取剩余阶段列表
    all_phases_to_run = self.assessment.phases_to_run()
    phases_to_run = [p for p in all_phases_to_run if p not in ["discovery", "requirements"]]
    
    # 5. 动态执行剩余阶段
    for phase_name in phases_to_run:
        result = await run_phase(phase_name, all_phases[phase_name])
        if result.success:
            await self._store_phase_summary(phase_name)
        else:
            return False  # 阶段失败，停止流程
    
    # 6. Human Review（可跳过）
    return self._run_review_checkpoint(auto_approve)
```

### 3.3 阶段摘要压缩

**问题**: 随着阶段执行，上下文越来越长，可能超出 token 限制

**解决方案**: 每个阶段完成后，使用 AI 压缩摘要

```python
async def _store_phase_summary(self, phase_name: str) -> None:
    """存储阶段输出摘要，供后续阶段使用"""
    try:
        # 收集阶段输出文件
        phase_output = gather_phase_outputs(self.spec_dir, phase_name)
        if not phase_output:
            return
        
        # 使用 AI 压缩摘要（目标 500 词）
        summary = await summarize_phase_output(
            phase_name,
            phase_output,
            model="sonnet",
            target_words=500,
        )
        
        if summary:
            self._phase_summaries[phase_name] = summary
    
    except Exception as e:
        # 摘要失败不影响主流程
        print_status(f"Phase summarization skipped: {e}", "warning")
```

**摘要格式化**:

```python
def format_phase_summaries(summaries: dict[str, str]) -> str:
    """格式化阶段摘要供后续阶段使用"""
    if not summaries:
        return ""
    
    parts = ["## Prior Phase Summaries\n"]
    for phase_name, summary in summaries.items():
        parts.append(f"### {phase_name.title()}\n{summary}\n")
    
    return "\n".join(parts)
```

### 3.4 项目索引智能缓存

**问题**: 每次 spec 创建都重新生成项目索引，浪费时间

**解决方案**: 检测依赖文件变化，按需刷新

```python
async def _ensure_fresh_project_index(self) -> None:
    """确保 project_index.json 是最新的"""
    index_file = self.project_dir / ".auto-claude" / "project_index.json"
    
    # 检查是否需要刷新
    if should_refresh_project_index(self.project_dir):
        if index_file.exists():
            print_status("Project dependencies changed, refreshing index...", "progress")
        else:
            print_status("Generating project index...", "progress")
        
        try:
            analyze_project(self.project_dir, index_file)
            print_status("Project index updated", "success")
        except Exception as e:
            print_status(f"Project index refresh failed: {e}", "warning")
            # 失败不阻塞 spec 创建
    else:
        if index_file.exists():
            print_status("Using cached project index", "info")
```

**刷新检测逻辑**:

```python
def should_refresh_project_index(project_dir: Path) -> bool:
    """检查是否需要刷新项目索引"""
    index_file = project_dir / ".auto-claude" / "project_index.json"
    
    if not index_file.exists():
        return True
    
    index_mtime = index_file.stat().st_mtime
    
    # 检查依赖文件是否有变化
    dependency_files = [
        "package.json",
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "pyproject.toml",
        "requirements.txt",
        "Pipfile",
        "go.mod",
        "Cargo.toml",
    ]
    
    for dep_file in dependency_files:
        dep_path = project_dir / dep_file
        if dep_path.exists():
            if dep_path.stat().st_mtime > index_mtime:
                return True  # 依赖文件比索引新，需要刷新
    
    return False
```

### 3.5 Linear 集成（可选）

```python
async def _create_linear_task_if_enabled(self) -> None:
    """如果启用了 Linear 集成，创建任务"""
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
```

---

## 4. 目录扫描估算 (directory_scanner.py)

### 4.1 功能说明

新增的目录扫描模块，用于更准确地估算任务涉及的文件数量和内容大小。

### 4.2 核心功能

```python
def estimate_from_paths(task_description: str, project_dir: Path) -> tuple[int, int] | None:
    """从任务描述中提取路径并估算
    
    Args:
        task_description: 任务描述文本
        project_dir: 项目根目录
    
    Returns:
        (文件数量, 总字符数) 或 None（如果无法提取路径）
    """
    # Step 1: 从任务描述中提取路径
    paths = extract_paths_from_description(task_description)
    if not paths:
        return None
    
    # Step 2: 扫描目录获取文件列表
    total_files = 0
    total_chars = 0
    
    for path in paths:
        full_path = project_dir / path
        if full_path.is_dir():
            files = scan_directory(full_path)
            total_files += len(files)
            total_chars += sum(get_file_size(f) for f in files)
        elif full_path.is_file():
            total_files += 1
            total_chars += get_file_size(full_path)
    
    return (total_files, total_chars)
```

### 4.3 路径提取逻辑

```python
def extract_paths_from_description(task_description: str) -> list[str]:
    """从任务描述中提取文件/目录路径"""
    patterns = [
        r"(?:在|修改|更新|创建)\s*[`'\"]?([a-zA-Z0-9_\-./]+)[`'\"]?",
        r"(?:目录|文件夹|路径)\s*[`'\"]?([a-zA-Z0-9_\-./]+)[`'\"]?",
        r"[`'\"]([a-zA-Z0-9_\-./]+(?:\.(?:py|ts|tsx|js|jsx|json|md|yaml|yml)))[`'\"]",
    ]
    
    paths = []
    for pattern in patterns:
        matches = re.findall(pattern, task_description)
        paths.extend(matches)
    
    return list(set(paths))  # 去重
```

### 4.4 使用场景

1. **复杂度评估时**: 更准确估算文件数量
2. **分块决策时**: 更准确估算 spec 大小
3. **上下文发现时**: 预先识别相关文件

---

## 5. 阶段摘要压缩 (compaction.py)

### 5.1 功能说明

新增的摘要压缩模块，用于减少阶段间传递的上下文大小。

### 5.2 核心功能

```python
def gather_phase_outputs(spec_dir: Path, phase_name: str) -> dict[str, str]:
    """收集指定阶段的输出文件内容"""
    phase_outputs = {
        "discovery": ["project_index.json"],
        "requirements": ["requirements.json"],
        "complexity_assessment": ["complexity_assessment.json"],
        "research": ["research.json"],
        "context": ["context.json"],
        "spec_writing": ["spec.md"],
        "self_critique": ["critique_report.json"],
        "planning": ["implementation_plan.json"],
    }
    
    outputs = {}
    for filename in phase_outputs.get(phase_name, []):
        filepath = spec_dir / filename
        if filepath.exists():
            outputs[filename] = filepath.read_text(encoding="utf-8")
    
    return outputs

async def summarize_phase_output(
    phase_name: str,
    phase_output: dict[str, str],
    model: str = "sonnet",
    target_words: int = 500,
) -> str | None:
    """使用 AI 压缩阶段输出为摘要"""
    
    prompt = f"""
Summarize the following {phase_name} phase output in approximately {target_words} words.
Focus on key decisions, important findings, and information needed by subsequent phases.

Phase Output:
{json.dumps(phase_output, indent=2)}

Provide a concise summary:
"""
    
    # 调用 AI 生成摘要
    response = await run_ai_completion(prompt, model=model)
    return response.strip() if response else None
```

---

## 6. 修改要点总结

### 6.1 复杂度评估
| 修改项 | 说明 | 影响 |
|--------|------|------|
| 六维度评估 | 从单一关键词升级为加权评估 | 更准确的复杂度判断 |
| 特殊触发规则 | 5 条规则处理极端情况 | 避免漏判复杂任务 |
| 文档任务支持 | 章节数检测 | 支持小说/文档类任务 |
| 分块决策 | 基于 spec 大小估算 | 大型任务稳定生成 |

### 6.2 分块写入
| 修改项 | 说明 | 影响 |
|--------|------|------|
| 自动检测 | 根据估算大小决定 | 无需手动配置 |
| 章节分配 | 均匀分配 12 个章节 | 每个 chunk 内容均衡 |
| 格式验证 | PART 标记检查 | 确保合并正确 |
| 错误恢复 | 每个 chunk 独立重试 | 提高成功率 |

### 6.3 编排优化
| 修改项 | 说明 | 影响 |
|--------|------|------|
| 动态阶段 | 根据复杂度选择 | 减少不必要处理 |
| 摘要压缩 | 500 词摘要 | 减少上下文占用 |
| 智能缓存 | 依赖文件检测 | 加快重复执行 |

---

## 7. 相关提示词文件

| 文件 | 用途 | 使用场景 |
|------|------|----------|
| `prompts/spec_writer.md` | 单次写入提示词 | 小型任务 |
| `prompts/spec_phases_writer.md` | 分块写入提示词 | 大型任务 |
| `prompts/complexity_assessor.md` | AI 复杂度评估 | 复杂度评估阶段 |
| `prompts/spec_critic.md` | 自我审查提示词 | COMPLEX 任务 |
| `prompts/spec_quick.md` | 快速 spec 生成 | SIMPLE 任务 |

---

## 8. 配置参数

### 8.1 复杂度相关

```python
# 分块阈值（字符数）
SPEC_SIZE_THRESHOLDS = {
    "tiny": 5000,
    "small": 15000,
    "medium": 50000,
    "large": 150000,
    "huge": 500000,
}

# 维度权重
DIMENSION_WEIGHTS = {
    "code_coupling": 0.25,
    "cognitive": 0.20,
    "change_impact": 0.20,
    "domain_knowledge": 0.15,
    "test_complexity": 0.10,
    "resource_estimation": 0.10,
}

# 复杂度阈值
COMPLEXITY_THRESHOLDS = {
    "simple_max": 3.0,
    "standard_max": 6.0,
}
```

### 8.2 重试相关

```python
MAX_RETRIES = 3  # 每个阶段/chunk 最大重试次数
```

### 8.3 摘要相关

```python
SUMMARY_TARGET_WORDS = 500  # 摘要目标词数
SUMMARY_MODEL = "sonnet"    # 摘要使用的模型
```

---

## 更新日志

| 日期 | 修改内容 | 影响文件 |
|------|----------|----------|
| 2024-XX | 初始版本：多维度复杂度评估 | complexity.py |
| 2024-XX | 新增分块写入支持 | spec_phases.py |
| 2024-XX | 新增目录扫描估算 | directory_scanner.py |
| 2024-XX | 新增阶段摘要压缩 | compaction.py, orchestrator.py |
| 2024-XX | 项目索引智能缓存 | orchestrator.py |
