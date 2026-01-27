# Git Add 安全规则 - CRITICAL

**Last Updated:** 2025-01-26
**Purpose:** 防止 AI 代理使用危险的 git add 命令和大规模修改

---

## 🚨 禁止的 Git Add 命令

以下命令可能导致意外添加不相关文件，**绝对禁止使用**：

```bash
git add .      # ❌ 禁止 - 添加当前目录所有文件
git add -A     # ❌ 禁止 - 添加所有更改（包括删除）
git add --all  # ❌ 禁止 - 同上
git add *      # ❌ 禁止 - 通配符添加，不可控
git add -u     # ❌ 禁止 - 添加所有已跟踪文件的更改
```

### 为什么这些命令危险？

1. **意外添加敏感文件**：可能添加 `.env`、密钥文件、配置文件
2. **添加不相关更改**：可能添加其他任务的修改
3. **添加临时文件**：可能添加 `.DS_Store`、`__pycache__`、日志文件
4. **难以追溯**：提交历史混乱，难以定位问题
5. **合并冲突**：增加与其他分支合并时的冲突风险

---

## ✅ 正确的 Git Add 方式

**必须明确指定要添加的文件**：

```bash
# 1. 先查看所有更改
git status

# 2. 查看具体更改内容
git diff path/to/file.txt

# 3. 只添加特定文件
git add path/to/specific-file.txt

# 4. 添加多个特定文件
git add file1.txt file2.txt file3.txt

# 5. 添加特定目录下的特定文件
git add src/components/Button.tsx src/components/Input.tsx
```

### 正确的工作流程

```bash
# Step 1: 查看状态
git status

# Step 2: 查看更改详情
git diff

# Step 3: 逐个添加需要的文件
git add src/feature/new-file.ts
git add src/feature/updated-file.ts

# Step 4: 再次确认
git status

# Step 5: 提交
git commit -m "auto-claude: task-id - Description"
```

---

## 🛡️ 大规模修改限制

### 单次提交限制

| 限制项 | 最大值 | 说明 |
|-------|-------|------|
| 文件数量 | **10 个** | 超过需要分批提交 |
| 代码行数 | **500 行** | 超过需要拆分任务 |
| 删除文件 | **5 个** | 超过需要人工确认 |

### 禁止的大规模操作

```bash
# ❌ 禁止一次性重构整个模块
git add src/entire-module/

# ❌ 禁止批量重命名
git add -A  # 包含大量重命名

# ❌ 禁止大规模删除
git add -A  # 包含大量删除
```

### 为什么限制大规模修改？

1. **难以 Code Review**：审查者无法有效检查大量更改
2. **难以回滚**：出问题时难以定位和恢复
3. **意外副作用**：大规模修改容易引入 bug
4. **合并冲突**：与其他分支合并时冲突概率大增
5. **历史混乱**：提交历史难以追溯

### 正确的大规模修改方式

```bash
# 1. 拆分为多个小任务
# Task 1: 重构 ComponentA
git add src/ComponentA.tsx
git commit -m "auto-claude: task-1 - Refactor ComponentA"

# Task 2: 重构 ComponentB
git add src/ComponentB.tsx
git commit -m "auto-claude: task-2 - Refactor ComponentB"

# Task 3: 更新测试
git add tests/ComponentA.test.tsx tests/ComponentB.test.tsx
git commit -m "auto-claude: task-3 - Update tests"
```

---

## 🔍 提交前检查清单

在执行 `git commit` 之前，必须确认：

- [ ] 只添加了与当前任务相关的文件
- [ ] 没有添加敏感文件（.env, 密钥, 配置）
- [ ] 没有添加临时文件（.DS_Store, __pycache__, logs）
- [ ] 修改的文件数量 ≤ 10
- [ ] 修改的代码行数 ≤ 500
- [ ] 已使用 `git diff --cached` 检查暂存内容

---

## 📋 快速参考

### ✅ 安全命令

```bash
git status                    # 查看状态
git diff                      # 查看更改
git diff --cached             # 查看暂存内容
git add specific-file.txt    # 添加特定文件
git reset HEAD file.txt       # 取消暂存
```

### ❌ 危险命令

```bash
git add .                     # 禁止
git add -A                    # 禁止
git add --all                 # 禁止
git add *                     # 禁止
git add -u                    # 禁止
```

---

## 🚨 违规处理

如果 AI 代理尝试使用禁止的命令：

1. **立即停止**：不要执行该命令
2. **重新评估**：确定需要添加的具体文件
3. **逐个添加**：使用 `git add <specific-file>` 添加
4. **验证**：使用 `git status` 确认暂存内容

---

**Remember:** 宁可多执行几次 `git add`，也不要使用 `-A` 或 `.` 一次性添加所有文件。
