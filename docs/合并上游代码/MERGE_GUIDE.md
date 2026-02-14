# 上游代码合并指南

**上游仓库**: `https://github.com/AndyMik90/Auto-Claude.git`
**本地仓库**: `https://github.com/zhengbingjin/Auto-Claude.git`
**项目路径**: `/Users/zhengbingjin/Project/Github/Auto-Claude`

> **不要重新 Fork！** 重新 Fork 会覆盖所有本地修改。使用 `git merge` 合并上游更新。

---

## 1. 首次设置（只需一次）

```bash
cd /Users/zhengbingjin/Project/Github/Auto-Claude

# 添加上游仓库
git remote add upstream https://github.com/AndyMik90/Auto-Claude.git

# 验证（应看到 origin + upstream 两个 remote）
git remote -v
```

---

## 2. 合并流程

### 阶段 A：准备

```bash
# A1. 确保工作目录干净
git status

# A2. 暂存未完成的工作（如果有）
git stash save "合并前暂存"

# A3. 切换到主分支并拉取最新
git checkout main
git pull origin main

# A4. 创建备份分支（重要！）
git branch backup-before-merge-$(date +%Y%m%d)
```

### 阶段 B：预览变更

```bash
# B1. 获取上游更新
git fetch upstream

# B2. 查看上游新提交
git log main..upstream/main --oneline

# B3. 查看文件变化统计
git diff main upstream/main --stat
```

### 阶段 C：执行合并

```bash
# C1. 合并
git merge upstream/main

# 如果出现冲突 → 跳到第 3 节处理
# 如果无冲突 → 继续
```

### 阶段 D：验证 & 推送

```bash
# D1. 检查合并结果
git status
git log --oneline -10

# D2. 确认无残留冲突标记
grep -r "<<<<<<" . --include="*.ts" --include="*.tsx" --include="*.json" --include="*.py"

# D3. 构建验证
cd apps/frontend && npm run build && cd ../..

# D4. 推送
git push origin main

# D5. 恢复暂存（如果有）
git stash pop
```

---

## 3. 冲突解决

### 3.1 冲突处理优先级

1. **安全/稳定性修复** → 优先引入上游，再恢复本地定制
2. **核心流程可用性** → 以可用性为第一目标，再逐步回填本地扩展
3. **功能并存** → 合并两边实现，必要时加 feature flag
4. **依赖/配置** → 对齐上游版本，保留本地新增项

### 3.2 处理顺序

1. 后端核心：`apps/backend/agents/*`, `core/*`, `spec/*`
2. 前端主流程：`apps/frontend/src/main/*`
3. 渲染层 UI：`apps/frontend/src/renderer/*`
4. 共享类型：`apps/frontend/src/shared/*`, `preload/*`
5. 工具链：`scripts/`, `.github/`, `package.json`

### 3.3 按文件类型处理

**翻译文件 (JSON)** — 手动合并，保留双方的翻译 key
```bash
# 中文翻译优先保留本地版本
```

**i18n 配置** — 保留本地版本
```bash
git checkout --ours apps/frontend/src/shared/i18n/index.ts
git add apps/frontend/src/shared/i18n/index.ts
```

**package.json** — 手动合并依赖，合并后运行 `npm install`

**组件文件 (TSX/TS)**
```bash
# 上游新增组件 → 保留上游
git checkout --theirs <file>
# 本地定制组件 → 保留本地
git checkout --ours <file>
# 双方都改 → 手动合并
```

**文档 (MD)** — 保留本地中文文档
```bash
git checkout --ours docs/中文/*.md
git add docs/中文/*.md
```

### 3.4 解决后标记

```bash
git add <已解决的文件>
# 所有冲突解决后
git commit
```

### 3.5 冲突解决检查

- [ ] 所有 `<<<<<<<` / `=======` / `>>>>>>>` 标记已清除
- [ ] 代码可编译 (`npm run build`)
- [ ] 翻译文件是有效 JSON
- [ ] 本地定制功能正常

---

## 4. 本地定制文件清单（合并时特别注意）

| 文件 | 冲突策略 |
|------|---------|
| `apps/frontend/src/shared/i18n/index.ts` | 保留本地 |
| `apps/cc-wf-studio/src/i18n/locales/zh-CN/*` | 合并双方 |
| `docs/中文/*`, `docs/编辑器/*`, `docs/cc-wf-studio/*` | 保留本地 |
| `docs/合并上游代码/*` | 保留本地 |
| `.gitignore`, `package.json` | 合并双方 |

---

## 5. 回滚操作

### 还没推送

```bash
# 查看备份分支
git branch | grep backup

# 回滚（替换为实际分支名）
git reset --hard backup-before-merge-YYYYMMDD
```

### 已经推送

```bash
# 方法 1：撤销提交（推荐）
git revert -m 1 <merge-commit-hash>
git push origin main

# 方法 2：强制回滚（危险，确保无他人使用）
git reset --hard backup-before-merge-YYYYMMDD
git push origin main --force
```

---

## 6. 冲突记录模板

每个冲突文件需记录以下信息，写入 `CONFLICT_RESOLUTION_LOG_<日期>.md`：

```markdown
## `<文件路径>`
- **选择**：上游 / 本地 / 融合
- **原因**：
- **关键改动**：
- **风险**：
- **验证项**：
```

---

## 7. 工具

```bash
# VS Code 合并工具
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'
git mergetool

# 三方对比
git diff --cc <file>

# 查看本地/上游版本
git show :2:<file>   # 本地
git show :3:<file>   # 上游

# 批量处理
git checkout --ours <dir>/* && git add <dir>/*
git checkout --theirs <dir>/* && git add <dir>/*
```

---

## 8. 历次合并记录

| 日期 | 计划 | 决策记录 | 函数分析 |
|------|------|---------|---------|
| 2026-02-13 | [MERGE_PLAN](./MERGE_PLAN_2026-02-13.md) | [RESOLUTION_LOG](./CONFLICT_RESOLUTION_LOG_FULL_2026-02-13.md) | [后端](./FUNCTION_FUSION_BACKEND_2026-02-13.md) / [前端](./FUNCTION_FUSION_FRONTEND_MAIN_2026-02-13.md) |

---

**最后更新**: 2026-02-14
