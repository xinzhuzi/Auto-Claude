# 修复计划：渐进式 spec 写入的格式一致性问题

## 📋 问题诊断

### 现象
- 028 任务的 chunk_1.md 验证失败：`Content appears to be truncated`
- AI 生成了不符合 spec_writer.md 模板格式的内容
- 误报：107行列表项 + 16行CSS样式块

### 根本原因

**关键发现**：
1. **spec_phases_writer.md 是新建文件** (Commit 9776935, 2026-01-22)
2. **当前设计问题**：自己定义了格式和示例，没有引导 AI 读取 spec_writer.md
3. **验证器误报**：TRUNCATION_PATTERNS 设计用于检测"真正的截断"，但误报了合法的 Markdown 格式

**当前问题细节**：
| 问题 | 位置 | 说明 |
|------|------|------|
| 自己定义格式 | 第 47-58 行 | 定义了输出格式，但没有说来自 spec_writer.md |
| 自己提供示例 | 第 68-129 行 | 提供了完整的章节示例，应该让 AI 去读 spec_writer.md |
| 缺少核心指令 | 整个文件 | **没有告诉 AI 必须先读取 spec_writer.md** |
| 格式不强调 | CRITICAL RULES | 没有强调必须与 spec_writer.md 格式一致 |

**设计原则错误**：
- 当前：spec_phases_writer.md = 自己的格式 + 自己的示例 + 分块逻辑
- 正确：**spec_phases_writer.md = 分块逻辑 + 指向 spec_writer.md 的引用**

---

## 🎯 修复方案：薄壳子设计 + 安全验证

### 方案概览

基于调研发现，当前系统架构是：
```
spec_writer.md (核心模板，321行)
  ↓ 被引用（应该）但没有被引用
spec_phases_writer.md (分块壳子，191行，但内容重复)
  ↓ 使用
AI 生成 chunk (格式不一致，触发验证误报)
```

**修复策略**：
1. **主要修复**：将 spec_phases_writer.md 改造为"薄壳子"
2. **安全验证**：移除单个 chunk 完整验证，添加轻量级 sanity check
3. **保留测试**：保留 028 任务作为验证用例

---

## 📂 修改文件清单

| 优先级 | 文件 | 修改内容 | 当前状态 |
|--------|------|---------|---------|
| 🔴 高 | `apps/backend/prompts/spec_phases_writer.md` | **重写为薄壳子**（191行→约150行） | 新建文件（Commit 9776935） |
| 🔴 高 | `apps/backend/prompts/spec_phases_writer.md` | 添加"必须先读取 spec_writer.md"指令 | 缺失核心指令 |
| 🔴 高 | `apps/backend/prompts/spec_phases_writer.md` | 删除自己定义的格式（第47-58行） | 重复内容 |
| 🔴 高 | `apps/backend/prompts/spec_phases_writer.md` | 删除自己的示例（第68-129行） | 重复内容 |
| 🔴 高 | `apps/backend/spec/phases/spec_phases.py` | **移除单个 chunk 验证**（第282-295行） | 只验证最终文档 |
| 🔴 高 | `apps/backend/spec/phases/spec_phases.py` | **添加轻量级 sanity check** | 早期发现问题 |
| 🟢 低 | `apps/backend/spec/validate_pkg/validators/spec_chunk_validator.py` | 无需修改 | - |

---

## 📝 实施步骤

### Step 1: 备份现有文件

```bash
cp apps/backend/prompts/spec_phases_writer.md apps/backend/prompts/spec_phases_writer.md.bak
```

### Step 2: 修改 spec_phases.py - 移除单个 chunk 验证并添加安全检查

**文件**: `/Users/zhengbingjin/Project/Github/Auto-Claude/apps/backend/spec/phases/spec_phases.py`

**修改 1：移除第 282-295 行的单个 chunk 验证**

**删除的代码**：
```python
# ✅ New: Validate chunk immediately after creation
is_valid, error_msg = validator.validate(
    chunk_file,
    check_truncation=True,
    check_chunks=False  # Only check after all chunks written
)
if not is_valid:
    raise RuntimeError(
        f"Chunk {chunk_idx} validation failed: {error_msg}"
    )

self.ui.print_status(
    f"Chunk {chunk_idx} validated successfully", "success"
)
```

**替换为**（在第 282 行位置添加）：
```python
# ✅ Lightweight sanity check for chunk file (replaces full validation)
# 原因：chunk 可能包含跨块的未闭合结构，只检查基本完整性
self._sanity_check_chunk(chunk_file, chunk_idx)
```

**修改 2：在文件末尾添加新方法**

```python
def _sanity_check_chunk(self, chunk_file: Path, chunk_idx: int) -> None:
    """
    轻量级 chunk 完整性检查（替代完整的 validator.validate）

    只检查：
    1. 文件存在性
    2. 文件大小（不是空的）
    3. 必需的 PART 标记
    4. 基本内容量

    不检查：
    - 截断（跨块结构可能未闭合）
    - 具体的格式规范（最终验证时会检查）
    """
    # 1. 文件存在性
    if not chunk_file.exists():
        raise RuntimeError(
            f"Chunk {chunk_idx} not found: {chunk_file}"
        )

    # 2. 文件大小
    size = chunk_file.stat().st_size
    if size < 100:  # 小于 100 字节很可能有问题
        raise RuntimeError(
            f"Chunk {chunk_idx} too small ({size} bytes), likely empty or corrupted"
        )

    # 3. 必需标记
    try:
        content = chunk_file.read_text(encoding="utf-8")
    except UnicodeDecodeError as e:
        raise RuntimeError(
            f"Chunk {chunk_idx} has encoding issues: {e}"
        )

    # 检查 START 标记
    if f"<!-- PART {chunk_idx} START -->" not in content:
        raise RuntimeError(
            f"Chunk {chunk_idx} missing <!-- PART {chunk_idx} START --> marker"
        )

    # 检查 END 或 FINAL 标记
    is_final_chunk = (chunk_idx == self.suggested_chunks)

    if is_final_chunk:
        if "<!-- FINAL PART -->" not in content:
            raise RuntimeError(
                f"Final chunk {chunk_idx} missing <!-- FINAL PART --> marker"
            )
    else:
        if f"<!-- PART {chunk_idx} END -->" not in content:
            raise RuntimeError(
                f"Chunk {chunk_idx} missing <!-- PART {chunk_idx} END --> marker"
            )

    # 4. 基本内容量
    lines = content.strip().split("\n")
    non_empty_lines = [l for l in lines if l.strip()]
    if len(non_empty_lines) < 3:
        raise RuntimeError(
            f"Chunk {chunk_idx} appears to have insufficient content ({len(non_empty_lines)} non-empty lines)"
        )
```

### Step 3: 重写 spec_phases_writer.md 为"薄壳子"

**文件**: `/Users/zhengbingjin/Project/Github/Auto-Claude/apps/backend/prompts/spec_phases_writer.md`

**核心原则**：
- 你是一个"适配器"，不是新的模板来源
- 所有格式和规范来自 spec_writer.md
- 不要自己创新格式，严格遵循模板

**新增关键章节**：
```markdown
## CRITICAL: 必须先读取模板 (MANDATORY)

在开始之前，你必须使用 Read 工具读取完整模板：

```bash
Read(file_path="apps/backend/prompts/spec_writer.md")
```

从 spec_writer.md 中提取：
1. **章节模板结构** (PHASE 2: WRITE SPEC.MD 部分)
2. **格式规范** (COMMON ISSUES TO AVOID 部分)
3. **QA 要求** (QA Acceptance Criteria 部分)

**重要**：
- 你的内容格式必须与 spec_writer.md 模板**完全一致**
- 不要使用"常规 Markdown 格式"
- 列表、表格、代码块都必须遵循模板中的格式
```

**删除的内容**：
- ❌ 第 47-58 行：自己定义的输出格式
- ❌ 第 68-129 行：自己的示例内容
- ❌ 所有重复的章节模板

**保留的内容**：
- ✅ 分块逻辑说明
- ✅ PART 标记使用方法
- ✅ Write 工具使用说明

### Step 4: 测试验证

```bash
# 1. 使用 028 任务验证
# 备份
cp -r .auto-claude/specs/028- .auto-claude/specs/028-.before_fix

# 2. 应用修复后测试
# 检查 sanity check 是否正常工作
# 观察错误消息是否清晰

# 3. 检查日志确认 AI 读取了 spec_writer.md
grep -A 5 "Read.*spec_writer.md" .auto-claude/specs/028-/task_logs.json
```

### Step 5: 文档更新（可选）

- 更新 `docs/spec/spec-chunked-writing-improvement.md`
- 记录"薄壳子"设计原则和 sanity check 逻辑
- 说明 spec_writer.md 和 spec_phases_writer.md 的关系

---

## ⚠️ 风险评估和缓解措施

### 风险矩阵

| 风险类型 | 概率 | 影响 | 缓解措施 | 状态 |
|----------|------|------|----------|------|
| AI 创建空 chunk | 中 | 高 | ✅ 添加 sanity check 检测 | 已包含 |
| AI 创建格式错误的 chunk | 中 | 中 | ⚠️ 最终验证会检测，但浪费时间 | 可选重试 |
| 编码问题 | 低 | 中 | ✅ 捕获 UnicodeDecodeError | 已包含 |
| 最终验证失败 | 低 | 中 | 🟡 可添加重试机制 | 可选优化 |
| 性能影响 | 低 | 低 | ✅ 轻量级检查性能开销极小 | 已优化 |

### 安全措施总结

**已添加的安全措施**：
1. ✅ 文件存在性检查
2. ✅ 文件大小检查（< 100 字节）
3. ✅ 必需标记检查（START/END/FINAL）
4. ✅ 基本内容量检查（≥3 非空行）
5. ✅ 编码错误处理

**可选的后续优化**：
1. 🟡 最终验证失败时的重试机制
2. 🟡 更详细的错误消息（指明具体哪个 chunk）
3. 🟡 合并时的额外警告检测

---

## 🎯 成功标准

1. ✅ spec_phases_writer.md 被改造为"薄壳子"（约 150 行）
2. ✅ spec_phases.py 移除了单个 chunk 的完整验证（第 282-295 行）
3. ✅ spec_phases.py 添加了轻量级 sanity check（第 282 行位置）
4. ✅ AI 第一步就读取 spec_writer.md（从日志确认）
5. ✅ 生成的 chunk 格式与 spec_writer.md 模板完全一致
6. ✅ 合并后的 spec.md 验证通过（只验证一次）
7. ✅ 早期发现问题 chunk（空文件、缺少标记、编码问题）
8. ✅ 分块写入流程更快（不验证中间文件的截断）
9. ✅ 当 spec_writer.md 更新时，chunked writing 自动获得最新格式

---

## 🔗 设计原则总结

### 核心原则
- **spec_writer.md = 唯一的模板来源**（所有格式、示例、规范）
- **spec_phases_writer.md = 薄壳子/适配器**（只负责分块逻辑）
- **DRY**：避免内容重复，确保一致性

### 两者关系
```
spec_writer.md (核心，321行)
     ↑
     | 被引用
     |
spec_phases_writer.md (壳子，150行)
     ↑
     | 使用
     |
AI 生成 chunk (遵循 spec_writer.md 格式)
```

### 维护优势
1. ✅ 只需维护一个模板文件（spec_writer.md）
2. ✅ spec_phases_writer.md 自动获得最新格式
3. ✅ 减少维护成本
4. ✅ 避免内容不一致

---

## 📊 验证流程对比

### 修复前（当前）

```
生成 chunk_1.md
    ↓
validator.validate(chunk_1.md, check_truncation=True)
    ↓
❌ 检测到107行列表项 + 16行CSS样式块
    ↓
"Chunk 1 validation failed: Content appears to be truncated"
```

### 修复后

```
生成 chunk_1.md
    ↓
_sanity_check_chunk(chunk_1.md)
    ↓
✅ 检查：文件存在、大小>100字节、有标记、≥3行内容
    ↓
生成 chunk_2.md
    ↓
_sanity_check_chunk(chunk_2.md)
    ↓
...
    ↓
合并所有 chunks → spec.md
    ↓
validator.validate(spec.md, check_truncation=True, check_chunks=True)
    ↓
✅ 验证通过
```

---

## 📖 附录：代码审查发现

### 关键问题

| 问题 | 位置 | 影响 | 修复 |
|------|------|------|------|
| 自己定义格式 | spec_phases_writer.md:47-58 | AI 不遵循模板 | 删除 |
| 自己提供示例 | spec_phases_writer.md:68-129 | AI 不读取模板 | 删除 |
| 缺少读取指令 | spec_phases_writer.md:全文 | AI 不知道读模板 | 添加 |
| 误报合法格式 | validator:模式2,7 | chunk 验证失败 | 移除 |

### 代码调用链

```
spec_phases.py:265
  → run_agent_fn("spec_phases_writer.md", additional_context=chunk_context)
  → AI 读取 spec_writer.md?（当前：否） →（修复后：是）
  → AI 生成 chunk
  → spec_phases.py:272 检查文件存在性
  → spec_phases.py:282 validator.validate()（当前：是）→（修复后：sanity_check）
  → spec_phases.py:299 合并 chunks
  → spec_phases.py:303 validator.validate(spec.md)（最终验证）
```

### 相关 Commit

- **9776935** (2026-01-22): fix: 修复 spec.md 生成失败
- **eb8effc** (2026--01-21): fix: 修复 AI 评估缺少分块字段
- **9c0e355** (2026-01-21): fix: 修复代码任务分块字段缺失

---

**创建日期**: 2026-01-22
**版本**: 1.0
**状态**: 待批准
