# Chunked Writing 修复测试指南

## 📋 测试目的

验证修复后 AI 能正确：
1. 第一步读取 spec_writer.md
2. 使用正确的格式（复选框列表而非 `- **Key**:` 格式）
3. 生成的 chunk 通过最终验证

---

## 🔍 当前状态分析

### chunk_1.md 存在的问题

```bash
# 028 任务当前状态
- 位置: .auto-claude/specs/028-/chunk_1.md
- 大小: 15KB
- 行数: 552 行
- 创建时间: 2026-01-22 07:34
```

**格式问题**：
- ❌ **30 个错误列表**：`- **Key**:` 格式
- ✅ **8 个正确列表**：`- [ ]` 复选框格式
- ⚠️ **34 个代码块标记**：可能是奇数（不闭合）

这是典型的 AI 没有读取 spec_writer.md 模板的结果。

---

## 🧪 测试步骤

### Step 1: 清理旧的 chunk 文件

```bash
# 备份当前位置的文件
cd /Users/zhengbingjin/Project/Unity/MA
cp .auto-claude/specs/028-/chunk_1.md .auto-claude/specs/028-/chunk_1.md.old
rm -f .auto-claude/specs/028-/chunk_*.md
rm -f .auto-claude/specs/028-/spec.md
```

### Step 2: 重新运行 Auto-Claude

```bash
# 方法1：如果使用 Auto-Claude CLI
auto-claude task resume 028

# 方法2：如果使用交互式命令
# 触发 028 任务的 spec_writing 阶段
```

### Step 3: 观察 AI 的行为

**检查点1：AI 是否读取了 spec_writer.md**

```bash
# 查看 task_logs.json
grep -A 5 "Read.*spec_writer.md" .auto-claude/specs/028-/task_logs.json
```

**期望输出**：
```
"tool": "Read",
"file_path": "apps/backend/prompts/spec_writer.md"
```

**检查点2：生成的格式是否正确**

```bash
# 检查新生成的 chunk_1.md
echo "检查列表格式："
grep -c "^- \[ \]" .auto-claude/specs/028-/chunk_1.md  # 应该很多
grep -c "^- \*\*" .auto-claude/specs/028-/chunk_1.md  # 应该很少或没有

echo "检查代码块："
grep -c '```' .auto-claude/specs/028-/chunk_1.md  # 应该是偶数
```

**期望结果**：
- ✅ 复选框列表（`- [ ]`）数量 > `- **Key**:` 格式数量
- ✅ 代码块标记数是偶数（所有都闭合）

### Step 4: 验证最终 spec.md

```bash
# 检查合并后的 spec.md
ls -lh .auto-claude/specs/028-/spec.md

# 如果存在，检查格式
grep -c "^- \[ \]" .auto-claude/specs/028-/spec.md
grep -c "^- \*\*" .auto-claude/specs/028-/spec.md
```

---

## ✅ 成功标准

1. ✅ **AI 第一步读取 spec_writer.md**
   - task_logs.json 中有 Read spec_writer.md 的记录
   - 在生成内容之前执行

2. ✅ **列表格式正确**
   - 复选框列表（`- [ ]`）占主导
   - `- **Key**:` 格式很少或没有

3. ✅ **代码块闭合**
   - 代码块标记数是偶数
   - 所有 ``` 都有对应的闭合

4. ✅ **最终验证通过**
   - 合并后的 spec.md 不报错
   - 没有 truncation 相关错误

5. ✅ **sanity check 通过**
   - 没有 RuntimeError 关于标记缺失
   - 没有关于文件太小或编码错误的消息

---

## ⚠️ 可能的问题和解决

### 问题1：AI 还是没有读取 spec_writer.md

**症状**：
- task_logs.json 中没有 Read spec_writer.md 的记录
- 格式仍然是 `- **Key**:` 格式

**解决**：
1. 检查 spec_phases_writer.md 是否正确更新
   ```bash
   grep "CRITICAL.*必" apps/backend/prompts/spec_phases_writer.md
   ```
2. 确认文件已重写（不是旧的 .bak 文件）
3. 重启 Auto-Claude 进程

### 问题2：格式仍然错误

**症状**：
- AI 读取了 spec_writer.md，但格式还是不对
- `- **Key**:` 格式仍然很多

**解决**：
1. 检查 spec_writer.md 本身的格式
2. 确认 spec_writer.md 使用的是复选框格式
3. 可能需要增强 spec_phases_writer.md 中的示例

### 问题3：sanity check 失败

**症状**：
- RuntimeError: Chunk X missing marker
- RuntimeError: Chunk X too small

**解决**：
1. 检查 additional_context 是否正确传递
2. 检查 part number 是否正确
3. 查看 AI 的输出，确认它添加了 PART 标记

---

## 📊 对比：修复前 vs 修复后

| 指标 | 修复前 | 修复后（预期） |
|------|--------|---------------|
| AI 读取 spec_writer.md | ❌ 否 | ✅ 是 |
| 列表格式 `- **Key**:` | 30 个 | 0-5 个 |
| 列表格式 `- [ ]` | 8 个 | 50+ 个 |
| 代码块闭合 | ❌ 可能不闭合 | ✅ 全部闭合 |
| chunk 验证 | ❌ 误报失败 | ✅ sanity check 通过 |
| 最终验证 | ❌ 失败 | ✅ 通过 |

---

## 🔄 回滚方案

如果测试发现问题，可以快速回滚：

```bash
cd /Users/zhengbingjin/Project/Github/Auto-Claude

# 恢复 spec_phases.py
cp apps/backend/spec/phases/spec_phases.py.bak apps/backend/spec/phases/spec_phases.py

# 恢复 spec_phases_writer.md
cp apps/backend/prompts/spec_phases_writer.md.bak apps/backend/prompts/spec_phases_writer.md

# 恢复 028 任务的 chunk
cp .auto-claude/specs/028-/chunk_1.md.old .auto-claude/specs/028-/chunk_1.md
```

---

## 📝 测试记录模板

测试后，请记录：

```markdown
## 测试结果 - [日期]

### 环境信息
- Auto-Claude 版本:
- 测试时间:
- 测试任务: 028

### 观察结果

1. AI 是否读取 spec_writer.md？
   - [ ] 是
   - [ ] 否
   - 详情：

2. 列表格式是否正确？
   - `- [ ]` 格式数量：____
   - `- **Key**:` 格式数量：____
   - 详情：

3. 代码块是否闭合？
   - 代码块标记数：____
   - 是否偶数：____
   - 详情：

4. 最终验证是否通过？
   - [ ] 是
   - [ ] 否
   - 错误信息：

### 结论
- [ ] 测试通过，修复成功
- [ ] 测试失败，需要进一步调整
- 失败原因：
```

---

## 🎯 下一步

测试成功后：
1. 应用到其他任务
2. 监控后续任务的 chunk 生成
3. 收集数据验证稳定性

测试失败后：
1. 查看 task_logs.json 了解 AI 行为
2. 检查 spec_phases_writer.md 是否生效
3. 可能需要调整指令强度或示例

---

**创建日期**: 2026-01-22
**版本**: 1.0
**状态**: 待测试
