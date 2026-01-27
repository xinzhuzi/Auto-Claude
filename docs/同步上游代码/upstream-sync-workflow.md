# 上游同步工作流 - AI 辅助安全合并

**目标**: 将上游 AndyMik90/Auto-Claude 的更新同步到 xinzhuzi/Auto-Claude，同时保护所有自定义修改

**核心原则**: AI 审核 → 智能融合 → 人工确认 → 安全推送

---

## 📋 工作流概览

```
上游更新 → AI 分析差异 → AI 智能融合 → 人工审核 → 推送到 Fork
   ↓           ↓              ↓            ↓           ↓
获取最新    对比修改      保护自定义    最终确认    完成同步
```

---

## 🔄 完整同步流程

### 阶段 1: 准备工作

#### 1.1 备份当前状态

```bash
cd /Users/zhengbingjin/Project/Github/Auto-Claude

# 创建备份分支
DATE=$(date +%Y%m%d-%H%M%S)
git checkout -b backup/before-sync-$DATE

# 推送备份到 fork
git push origin backup/before-sync-$DATE

# 返回 main 分支
git checkout main

echo "✅ 备份完成: backup/before-sync-$DATE"
```

#### 1.2 确认仓库配置

```bash
# 检查远程仓库配置
git remote -v

# 应该看到:
# origin    https://github.com/xinzhuzi/Auto-Claude.git (fetch)
# origin    https://github.com/xinzhuzi/Auto-Claude.git (push)
# upstream  https://github.com/AndyMik90/Auto-Claude.git (fetch)
# upstream  https://github.com/AndyMik90/Auto-Claude.git (push)

# 如果没有 upstream，添加它:
git remote add upstream https://github.com/AndyMik90/Auto-Claude.git
```

---

### 阶段 2: 获取上游更新

#### 2.1 拉取上游最新代码

```bash
# 获取上游所有分支和标签
git fetch upstream

# 查看上游更新内容
git log main..upstream/main --oneline --graph

# 查看具体修改的文件
git diff main..upstream/main --stat
```

#### 2.2 创建同步工作分支

```bash
# 创建专门的同步分支
DATE=$(date +%Y%m%d)
git checkout -b sync/upstream-$DATE

echo "✅ 创建同步分支: sync/upstream-$DATE"
```

---

### 阶段 3: AI 分析差异（关键步骤）

#### 3.1 生成差异报告

```bash
# 导出差异文件列表
git diff main..upstream/main --name-only > /tmp/upstream-changes.txt

# 查看差异文件
cat /tmp/upstream-changes.txt
```

#### 3.2 使用 Claude Code 分析差异

**在 Claude Code 中执行以下提示词**:

```
我需要同步上游 Auto-Claude 的更新到我的 fork 仓库。

当前状态:
- 本地分支: sync/upstream-$(date +%Y%m%d)
- 上游分支: upstream/main

请帮我完成以下任务:

1. 分析差异文件列表 (/tmp/upstream-changes.txt)
2. 对每个文件进行对比分析:
   - 读取当前版本 (main 分支)
   - 读取上游版本 (upstream/main 分支)
   - 识别冲突点
   - 判断是否包含我的自定义修改

3. 生成融合策略报告，包含:
   - 可以直接使用上游版本的文件（无自定义修改）
   - 需要智能融合的文件（有自定义修改）
   - 必须保留当前版本的文件（关键自定义功能）

4. 将报告保存到: /Users/zhengbingjin/Project/Github/Auto-Claude/backup/merge/upstream-sync-analysis-$(date +%Y%m%d).md

关键保护文件（必须保留自定义修改）:
- apps/backend/security/hooks.py
- apps/backend/security/bash_validators.py
- apps/backend/security/git_validators.py
- apps/backend/prompts_pkg/prompt_generator.py
- apps/backend/core/client.py
- apps/backend/core/worktree.py
```

---

### 阶段 4: AI 智能融合（核心步骤）

#### 4.1 AI 执行融合

**在 Claude Code 中执行以下提示词**:

```
根据刚才生成的差异分析报告，请执行智能融合:

融合规则:
1. 对于"可以直接使用上游版本"的文件:
   - 直接使用 `git checkout upstream/main -- <file>`

2. 对于"需要智能融合"的文件:
   - 读取双方版本
   - 识别上游的新功能/修复
   - 识别我的自定义修改
   - 将上游改进合并到我的版本中
   - 确保不丢失任何自定义功能

3. 对于"必须保留当前版本"的文件:
   - 保持不变
   - 但记录上游的修改内容，供后续手动评估

4. 生成融合报告:
   - 每个文件的处理方式
   - 融合的具体内容
   - 需要人工审核的点
   - 保存到: /Users/zhengbingjin/Project/Github/Auto-Claude/backup/merge/upstream-sync-merge-$(date +%Y%m%d).md

执行融合后，提交到同步分支:
git add .
git commit -m "merge: AI 智能融合上游更新 $(date +%Y%m%d)

- 分析了 X 个差异文件
- 直接采用上游: Y 个文件
- 智能融合: Z 个文件
- 保留当前版本: W 个文件

详细报告: backup/merge/upstream-sync-merge-$(date +%Y%m%d).md"
```

---

### 阶段 5: 人工审核（必须步骤）

#### 5.1 审核融合结果

```bash
# 1. 查看融合报告
cat /Users/zhengbingjin/Project/Github/Auto-Claude/backup/merge/upstream-sync-merge-$(date +%Y%m%d).md

# 2. 查看所有修改
git diff main

# 3. 重点审核关键文件
git diff main -- apps/backend/security/hooks.py
git diff main -- apps/backend/core/client.py
git diff main -- apps/backend/core/worktree.py
```

#### 5.2 测试融合后的代码

```bash
# 1. 安装依赖
npm install

# 2. 运行开发服务器
npm run dev

# 3. 测试关键功能:
#    - Git 安全系统是否正常工作
#    - Worktree 优化是否生效
#    - 工具参数修复钩子是否正常
#    - MetaMCP 连接是否正常

# 4. 检查控制台是否有错误
```

#### 5.3 人工调整（如果需要）

```bash
# 如果发现问题，手动调整文件
# 例如:
code apps/backend/security/hooks.py

# 调整后提交
git add apps/backend/security/hooks.py
git commit -m "fix: 手动调整融合结果"
```

---

### 阶段 6: 合并到主分支

#### 6.1 合并同步分支

```bash
# 1. 切换到 main 分支
git checkout main

# 2. 合并同步分支
git merge sync/upstream-$(date +%Y%m%d)

# 3. 如果有冲突（理论上不应该有，因为已经在同步分支解决了）
# 解决冲突后:
git add .
git commit -m "merge: 完成上游同步"
```

#### 6.2 最终验证

```bash
# 1. 再次运行测试
npm run dev

# 2. 检查关键功能
# 3. 查看提交历史
git log --oneline -10
```

---

### 阶段 7: 推送到 Fork 仓库

#### 7.1 推送主分支

```bash
# 推送 main 分支到你的 fork
git push origin main
```

#### 7.2 推送同步分支（保留记录）

```bash
# 推送同步分支，保留完整的合并历史
git push origin sync/upstream-$(date +%Y%m%d)
```

#### 7.3 推送备份分支

```bash
# 确保备份分支也在远程
git push origin backup/before-sync-$(date +%Y%m%d-%H%M%S)
```

---

## 🛡️ 关键保护机制

### 1. 三层备份保护

```
备份层 1: backup/before-sync-$DATE     # 同步前的完整备份
备份层 2: sync/upstream-$DATE          # 同步过程分支
备份层 3: main 分支的 reflog           # Git 自动记录
```

### 2. AI 融合保护规则

```python
# AI 必须遵守的融合规则

PROTECTED_FILES = [
    "apps/backend/security/hooks.py",              # 自定义安全钩子
    "apps/backend/security/bash_validators.py",    # Git 安全验证
    "apps/backend/security/git_validators.py",     # Git 危险操作检测
    "apps/backend/prompts_pkg/prompt_generator.py",# Git 安全规则
    "apps/backend/core/client.py",                 # 钩子配置
    "apps/backend/core/worktree.py",               # Worktree 优化
]

PROTECTED_FUNCTIONS = [
    "generate_git_safety_rules",           # Git 安全规则生成
    "validate_dangerous_git_operations",   # 危险操作验证
    "bash_security_hook",                  # Bash 安全钩子
    "todowrite_fix_hook",                  # TodoWrite 修复钩子
    "write_empty_param_hook",              # Write 参数检查钩子
]

PROTECTED_FEATURES = [
    "Git 4-layer safety system",           # Git 4层安全系统
    "Worktree LFS optimization",           # Worktree LFS 优化
    "Mass deletion detection",             # 大规模删除检测
    "Tool parameter auto-fixing",          # 工具参数自动修复
    "MetaMCP connection handling",         # MetaMCP 连接处理
]

# 融合规则:
# 1. 如果上游修改了 PROTECTED_FILES，必须手动审核
# 2. 如果上游删除了 PROTECTED_FUNCTIONS，必须保留
# 3. 如果上游修改影响 PROTECTED_FEATURES，必须智能融合
```

### 3. 人工审核检查清单

```
□ 是否已查看 AI 生成的融合报告？
□ 是否已对比关键文件的修改？
□ Git 安全系统是否完整？
  □ generate_git_safety_rules() 函数存在
  □ DANGEROUS_GIT_PATTERNS 正则存在
  □ bash_security_hook 调用 validate_bash_command
  □ Pre-commit hook 存在
□ Worktree 优化是否完整？
  □ LFS 检测逻辑存在
  □ 稀疏检出配置存在
  □ Mass deletion 检测存在
□ 工具参数修复是否完整？
  □ todowrite_fix_hook 存在
  □ write_empty_param_hook 存在
  □ client.py 中已配置钩子
□ 是否已运行测试？
□ 是否已检查控制台错误？
```

---

## 🔧 故障恢复

### 场景 1: 融合出错，需要回滚

```bash
# 方法 1: 回滚到备份分支
git checkout main
git reset --hard backup/before-sync-$DATE
git push origin main --force

# 方法 2: 删除同步分支，重新开始
git checkout main
git branch -D sync/upstream-$DATE
# 重新执行阶段 2
```

### 场景 2: 推送后发现问题

```bash
# 方法 1: Revert 合并提交
git revert -m 1 HEAD
git push origin main

# 方法 2: 强制回滚（如果还没有其他人拉取）
git reset --hard backup/before-sync-$DATE
git push origin main --force
```

### 场景 3: 部分文件融合错误

```bash
# 从备份分支恢复特定文件
git checkout backup/before-sync-$DATE -- apps/backend/security/hooks.py

# 重新提交
git add apps/backend/security/hooks.py
git commit -m "fix: 恢复 hooks.py 到融合前状态"
git push origin main
```

---

## 📊 同步频率建议

| 场景 | 频率 | 说明 |
|-----|------|------|
| **常规同步** | 每月一次 | 获取上游的功能更新和 Bug 修复 |
| **重要更新** | 立即同步 | 上游发布重大安全修复或关键功能 |
| **稳定期** | 每季度一次 | 项目稳定运行时，降低同步频率 |

---

## 📝 同步记录模板

每次同步后，在 `/Users/zhengbingjin/Project/Github/Auto-Claude/backup/merge/` 目录下创建记录:

```markdown
# 上游同步记录 - YYYY-MM-DD

## 基本信息
- **同步日期**: YYYY-MM-DD
- **上游版本**: upstream/main @ commit-hash
- **同步分支**: sync/upstream-YYYYMMDD
- **备份分支**: backup/before-sync-YYYYMMDD-HHMMSS

## 差异分析
- **差异文件数**: X 个
- **直接采用上游**: Y 个
- **智能融合**: Z 个
- **保留当前版本**: W 个

## 关键修改
1. 文件 A: 上游添加了新功能 X，已融合
2. 文件 B: 上游修复了 Bug Y，已融合
3. 文件 C: 保留自定义修改，未采用上游版本

## 测试结果
- [ ] 开发服务器启动正常
- [ ] Git 安全系统正常
- [ ] Worktree 优化正常
- [ ] 工具参数修复正常
- [ ] MetaMCP 连接正常

## 问题记录
- 无问题 / 记录具体问题

## 推送状态
- [x] 已推送到 origin/main
- [x] 已推送同步分支
- [x] 已推送备份分支
```

---

## 🎯 快速参考命令

```bash
# === 阶段 1: 准备 ===
DATE=$(date +%Y%m%d-%H%M%S)
git checkout -b backup/before-sync-$DATE
git push origin backup/before-sync-$DATE
git checkout main

# === 阶段 2: 获取上游 ===
git fetch upstream
git log main..upstream/main --oneline
git checkout -b sync/upstream-$(date +%Y%m%d)

# === 阶段 3-4: AI 分析和融合 ===
# 使用 Claude Code 执行分析和融合

# === 阶段 5: 测试 ===
npm install
npm run dev

# === 阶段 6: 合并 ===
git checkout main
git merge sync/upstream-$(date +%Y%m%d)

# === 阶段 7: 推送 ===
git push origin main
git push origin sync/upstream-$(date +%Y%m%d)
git push origin backup/before-sync-$DATE
```

---

**文档版本**: 1.0  
**最后更新**: 2025-01-15  
**维护者**: zhengbingjin  
**适用仓库**: https://github.com/xinzhuzi/Auto-Claude.git
