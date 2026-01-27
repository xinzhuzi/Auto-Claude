# 上游代码合并完整指南

**版本**: 1.0
**最后更新**: 2026-01-27

---

## 📋 目录

1. [概念理解](#概念理解)
2. [首次设置](#首次设置)
3. [合并流程](#合并流程)
4. [合并策略选择](#合并策略选择)
5. [回滚操作](#回滚操作)

---

## 🎯 概念理解

### Fork vs Clone vs Remote

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub 云端                              │
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │  上游仓库 (upstream) │      │  你的仓库 (origin)   │          │
│  │  AndyMik90/Auto-Claude│◄────│  zhengbingjin/Auto-Claude│     │
│  └─────────────────────┘  Fork └─────────────────────┘          │
│                                         │                        │
└─────────────────────────────────────────┼────────────────────────┘
                                          │ clone/push/pull
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         本地电脑                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  本地仓库                                                    ││
│  │  /Users/zhengbingjin/Project/Github/Auto-Claude             ││
│  │                                                              ││
│  │  remotes:                                                    ││
│  │    origin   → zhengbingjin/Auto-Claude (你的仓库)           ││
│  │    upstream → AndyMik90/Auto-Claude (上游仓库)              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 为什么不能重新 Fork?

- **Fork** 是在 GitHub 上创建仓库的完整副本
- 重新 Fork 会**覆盖**你仓库中的所有内容
- 你的本地修改、提交历史都会丢失

### 正确的做法

- 使用 `git remote add upstream` 添加上游仓库
- 使用 `git fetch upstream` 获取上游更新
- 使用 `git merge upstream/main` 合并更新
- 这样可以**保留**你的所有本地修改

---

## 🔧 首次设置

### 步骤 1: 检查当前 remote 配置

```bash
cd /Users/zhengbingjin/Project/Github/Auto-Claude
git remote -v
```

**预期输出**:
```
origin  https://github.com/zhengbingjin/Auto-Claude.git (fetch)
origin  https://github.com/zhengbingjin/Auto-Claude.git (push)
```

### 步骤 2: 添加上游仓库

```bash
git remote add upstream https://github.com/AndyMik90/Auto-Claude.git
```

### 步骤 3: 验证配置

```bash
git remote -v
```

**预期输出**:
```
origin    https://github.com/zhengbingjin/Auto-Claude.git (fetch)
origin    https://github.com/zhengbingjin/Auto-Claude.git (push)
upstream  https://github.com/AndyMik90/Auto-Claude.git (fetch)
upstream  https://github.com/AndyMik90/Auto-Claude.git (push)
```

### 步骤 4: 获取上游分支信息

```bash
git fetch upstream
```

### 步骤 5: 查看所有分支

```bash
git branch -a
```

**预期输出**:
```
* main
  remotes/origin/main
  remotes/upstream/main
```

---

## 🔄 合并流程

### 完整合并流程 (推荐)

```bash
# ============================================
# 阶段 1: 准备工作
# ============================================

# 1.1 确保工作目录干净
git status

# 如果有未提交的修改，先暂存
git stash save "合并前暂存"

# 1.2 切换到主分支
git checkout main

# 1.3 确保本地主分支是最新的
git pull origin main

# ============================================
# 阶段 2: 获取上游更新
# ============================================

# 2.1 获取上游所有更新
git fetch upstream

# 2.2 查看上游有哪些新提交
git log main..upstream/main --oneline

# 2.3 查看会有哪些文件变化 (预览)
git diff main upstream/main --stat

# ============================================
# 阶段 3: 创建备份分支 (重要!)
# ============================================

# 3.1 创建备份分支
git branch backup-before-merge-$(date +%Y%m%d)

# 3.2 验证备份分支已创建
git branch | grep backup

# ============================================
# 阶段 4: 执行合并
# ============================================

# 4.1 合并上游更新
git merge upstream/main

# 如果出现冲突，参考 CONFLICT_RESOLUTION.md

# ============================================
# 阶段 5: 验证和推送
# ============================================

# 5.1 检查合并结果
git status
git log --oneline -10

# 5.2 运行测试确保没有破坏
cd apps/frontend
npm run build

# 5.3 推送到你的仓库
git push origin main

# ============================================
# 阶段 6: 清理
# ============================================

# 6.1 恢复之前暂存的修改 (如果有)
git stash pop

# 6.2 删除旧的备份分支 (可选，建议保留最近 3 个)
# git branch -d backup-before-merge-20260101
```

### 简化版流程 (熟练后使用)

```bash
# 一键合并脚本
git fetch upstream && \
git checkout main && \
git branch backup-$(date +%Y%m%d) && \
git merge upstream/main && \
git push origin main
```

---

## 📊 合并策略选择

### 策略 1: Merge (推荐)

```bash
git merge upstream/main
```

**优点**:
- 保留完整的提交历史
- 合并冲突容易理解
- 可以清楚看到哪些是上游的，哪些是本地的

**缺点**:
- 会产生合并提交
- 历史记录可能看起来复杂

**适用场景**: 日常合并，推荐使用

### 策略 2: Rebase

```bash
git rebase upstream/main
```

**优点**:
- 历史记录线性，更干净
- 没有合并提交

**缺点**:
- 会改写提交历史
- 冲突解决更复杂
- 如果已经推送过，需要 force push

**适用场景**: 个人分支，未推送的提交

### 策略 3: Cherry-pick (选择性合并)

```bash
# 只合并特定的提交
git cherry-pick <commit-hash>
```

**适用场景**: 只需要上游的某几个特定功能

---

## ⏪ 回滚操作

### 情况 1: 合并后发现问题，还没推送

```bash
# 回滚到合并前
git reset --hard backup-before-merge-20260127

# 或者使用 ORIG_HEAD
git reset --hard ORIG_HEAD
```

### 情况 2: 合并后已经推送

```bash
# 创建一个撤销合并的提交
git revert -m 1 <merge-commit-hash>
git push origin main
```

### 情况 3: 恢复到备份分支

```bash
# 查看所有备份分支
git branch | grep backup

# 切换到备份分支
git checkout backup-before-merge-20260127

# 如果确定要用备份替换 main
git checkout main
git reset --hard backup-before-merge-20260127
git push origin main --force  # 危险操作，确保没有其他人在用
```

---

## 📅 合并频率建议

| 频率 | 适用情况 | 风险 |
|------|---------|------|
| 每天 | 上游非常活跃 | 低，冲突少 |
| 每周 | 推荐 | 低 |
| 每月 | 上游不太活跃 | 中，可能有较多冲突 |
| 超过一个月 | 不推荐 | 高，冲突可能很多 |

---

## 🔗 相关文档

- [CONFLICT_RESOLUTION.md](./CONFLICT_RESOLUTION.md) - 冲突解决策略
- [CHECKLIST.md](./CHECKLIST.md) - 合并检查清单

---

**文档维护者**: Auto-Claude Team
**最后更新**: 2026-01-27
