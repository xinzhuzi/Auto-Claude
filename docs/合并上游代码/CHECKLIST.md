# 合并检查清单

**版本**: 1.0
**最后更新**: 2026-01-27

---

## 📋 合并前检查

### 环境准备

- [ ] 当前在项目根目录: `/Users/zhengbingjin/Project/Github/Auto-Claude`
- [ ] Git 状态干净 (`git status` 无未提交修改)
- [ ] 已暂存未完成的工作 (`git stash`)
- [ ] 当前在 main 分支 (`git branch`)

### Remote 配置

- [ ] origin 指向你的仓库
  ```bash
  git remote get-url origin
  # 应该是: https://github.com/zhengbingjin/Auto-Claude.git
  ```

- [ ] upstream 指向上游仓库
  ```bash
  git remote get-url upstream
  # 应该是: https://github.com/AndyMik90/Auto-Claude.git
  ```

### 备份

- [ ] 已创建备份分支
  ```bash
  git branch backup-before-merge-$(date +%Y%m%d)
  ```

- [ ] 重要文件已备份 (可选)
  ```bash
  cp -r docs/ ~/backup/docs-$(date +%Y%m%d)/
  ```

---

## 📋 合并中检查

### 获取更新

- [ ] 已获取上游更新
  ```bash
  git fetch upstream
  ```

- [ ] 已查看上游变更
  ```bash
  git log main..upstream/main --oneline
  ```

### 执行合并

- [ ] 已执行合并命令
  ```bash
  git merge upstream/main
  ```

### 冲突处理 (如果有)

- [ ] 已查看所有冲突文件
  ```bash
  git status | grep "both modified"
  ```

- [ ] 翻译文件冲突已解决
  - [ ] `apps/cc-wf-studio/src/i18n/locales/en/workflowStudio.json`
  - [ ] `apps/cc-wf-studio/src/i18n/locales/zh-CN/workflowStudio.json`

- [ ] i18n 配置冲突已解决
  - [ ] `apps/frontend/src/shared/i18n/index.ts`

- [ ] package.json 冲突已解决
  - [ ] 根目录 `package.json`
  - [ ] `apps/frontend/package.json`

- [ ] 所有冲突标记已清除
  ```bash
  grep -r "<<<<<<" . --include="*.ts" --include="*.tsx" --include="*.json"
  # 应该无输出
  ```

---

## 📋 合并后检查

### 代码验证

- [ ] TypeScript 编译通过
  ```bash
  cd apps/frontend
  npm run build
  ```

- [ ] 无 ESLint 错误
  ```bash
  npm run lint
  ```

### 功能验证

- [ ] 开发服务器可以启动
  ```bash
  npm run dev
  # 访问 http://localhost:5173/
  ```

- [ ] 中文翻译正常显示
  - [ ] 切换语言到中文
  - [ ] 检查 Workflow Studio 界面

- [ ] 本地定制功能正常
  - [ ] 编辑器功能
  - [ ] 工作流功能

### 推送

- [ ] 已推送到你的仓库
  ```bash
  git push origin main
  ```

---

## 📋 本地定制文件清单

以下文件是本地定制的，合并时需要特别注意:

### 翻译相关

| 文件 | 说明 | 冲突策略 |
|------|------|---------|
| `apps/frontend/src/shared/i18n/index.ts` | i18n 配置 | 保留本地 |
| `apps/cc-wf-studio/src/i18n/locales/zh-CN/*` | 中文翻译 | 合并双方 |

### 文档

| 文件 | 说明 | 冲突策略 |
|------|------|---------|
| `docs/中文/*` | 中文文档 | 保留本地 |
| `docs/编辑器/*` | 编辑器文档 | 保留本地 |
| `docs/cc-wf-studio/*` | 迁移文档 | 保留本地 |
| `docs/合并上游代码/*` | 本文档 | 保留本地 |

### 配置文件

| 文件 | 说明 | 冲突策略 |
|------|------|---------|
| `.gitignore` | Git 忽略配置 | 合并双方 |
| `package.json` | 依赖配置 | 合并双方 |

---

## 📋 紧急回滚

如果合并后出现严重问题:

### 还没推送

```bash
# 回滚到备份分支
git reset --hard backup-before-merge-$(date +%Y%m%d)
```

### 已经推送

```bash
# 方法 1: 创建撤销提交 (推荐)
git revert -m 1 HEAD
git push origin main

# 方法 2: 强制回滚 (危险)
git reset --hard backup-before-merge-$(date +%Y%m%d)
git push origin main --force
```

---

## 📅 合并记录

| 日期 | 上游提交 | 冲突数 | 备注 |
|------|---------|--------|------|
| 2026-01-27 | - | - | 首次设置 |
| | | | |
| | | | |

---

## 🔗 相关文档

- [MERGE_GUIDE.md](./MERGE_GUIDE.md) - 合并指南
- [CONFLICT_RESOLUTION.md](./CONFLICT_RESOLUTION.md) - 冲突解决策略

---

**文档维护者**: Auto-Claude Team
**最后更新**: 2026-01-27
