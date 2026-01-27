# 上游代码合并指南

**最后更新**: 2026-01-27
**上游仓库**: https://github.com/AndyMik90/Auto-Claude.git

---

## ⚠️ 重要警告

**不要重新 Fork！** 重新 Fork 会覆盖你的所有本地修改。

正确的做法是使用 `git remote` 添加上游仓库，然后使用 `git merge` 或 `git rebase` 合并上游更新。

---

## 📚 文档清单

| 文档 | 用途 |
|------|------|
| [MERGE_GUIDE.md](./MERGE_GUIDE.md) | 完整的合并操作指南 |
| [CONFLICT_RESOLUTION.md](./CONFLICT_RESOLUTION.md) | 冲突解决策略 |
| [CHECKLIST.md](./CHECKLIST.md) | 合并前后检查清单 |

---

## 🚀 快速开始

### 首次设置 (只需执行一次)

```bash
# 添加上游仓库
git remote add upstream https://github.com/AndyMik90/Auto-Claude.git

# 验证
git remote -v
# 应该看到:
# origin    https://github.com/zhengbingjin/Auto-Claude.git (fetch)
# origin    https://github.com/zhengbingjin/Auto-Claude.git (push)
# upstream  https://github.com/AndyMik90/Auto-Claude.git (fetch)
# upstream  https://github.com/AndyMik90/Auto-Claude.git (push)
```

### 每次合并上游更新

```bash
# 1. 确保本地干净
git status
git stash  # 如果有未提交的修改

# 2. 获取上游更新
git fetch upstream

# 3. 切换到主分支
git checkout main

# 4. 合并上游 (推荐使用 merge)
git merge upstream/main

# 5. 解决冲突 (如果有)
# 详见 CONFLICT_RESOLUTION.md

# 6. 推送到你的仓库
git push origin main
```

---

## 📊 当前状态

### 本地独有的修改 (需要保护)

- `docs/` - 中文文档
- `apps/cc-wf-studio/src/i18n/locales/zh-CN/` - 中文翻译
- `apps/frontend/src/shared/i18n/` - i18n 配置修改
- 其他本地定制功能

### 上游更新频率

建议每周检查一次上游更新，避免积累太多差异。

---

**详细操作请阅读 [MERGE_GUIDE.md](./MERGE_GUIDE.md)**
