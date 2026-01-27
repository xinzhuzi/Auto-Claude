# 冲突解决策略

**版本**: 1.0
**最后更新**: 2026-01-27

---

## 📋 目录

1. [冲突类型](#冲突类型)
2. [解决流程](#解决流程)
3. [按文件类型处理](#按文件类型处理)
4. [工具推荐](#工具推荐)

---

## 🔍 冲突类型

### 类型 1: 内容冲突

同一文件的同一位置被双方修改。

```
<<<<<<< HEAD
你的本地修改
=======
上游的修改
>>>>>>> upstream/main
```

### 类型 2: 删除/修改冲突

一方删除了文件，另一方修改了文件。

### 类型 3: 重命名冲突

双方都重命名了同一个文件。

---

## 🔄 解决流程

### 步骤 1: 查看冲突文件

```bash
# 合并后查看冲突
git status

# 输出示例:
# Unmerged paths:
#   both modified:   apps/frontend/src/shared/i18n/index.ts
#   both modified:   package.json
```

### 步骤 2: 理解冲突内容

```bash
# 查看具体冲突
git diff

# 或打开文件查看冲突标记
# <<<<<<< HEAD
# =======
# >>>>>>> upstream/main
```

### 步骤 3: 决定保留策略

| 策略 | 命令 | 说明 |
|------|------|------|
| 保留本地 | `git checkout --ours <file>` | 完全使用本地版本 |
| 保留上游 | `git checkout --theirs <file>` | 完全使用上游版本 |
| 手动合并 | 编辑文件 | 合并双方修改 |

### 步骤 4: 标记冲突已解决

```bash
# 解决后添加文件
git add <file>

# 所有冲突解决后
git commit
```

---

## 📁 按文件类型处理

### 1. 翻译文件 (JSON)

**文件**: `apps/cc-wf-studio/src/i18n/locales/*/workflowStudio.json`

**策略**: 手动合并，保留双方的翻译 key

```json
// 冲突示例
<<<<<<< HEAD
{
  "newLocalKey": "本地新增的翻译",
  "existingKey": "本地修改的翻译"
}
=======
{
  "newUpstreamKey": "上游新增的翻译",
  "existingKey": "上游修改的翻译"
}
>>>>>>> upstream/main

// 解决后 (合并双方)
{
  "newLocalKey": "本地新增的翻译",
  "newUpstreamKey": "上游新增的翻译",
  "existingKey": "本地修改的翻译"  // 或根据情况选择
}
```

**注意**: 
- 新增的 key 都要保留
- 修改的 key 需要判断哪个更合适
- 中文翻译优先保留本地版本

### 2. i18n 配置文件

**文件**: `apps/frontend/src/shared/i18n/index.ts`

**策略**: 通常保留本地版本 (因为我们修改了导入路径)

```bash
# 保留本地版本
git checkout --ours apps/frontend/src/shared/i18n/index.ts
git add apps/frontend/src/shared/i18n/index.ts
```

### 3. package.json

**文件**: `package.json`, `apps/frontend/package.json`

**策略**: 手动合并依赖

```json
// 冲突示例
<<<<<<< HEAD
"dependencies": {
  "react": "^19.0.0",
  "local-package": "^1.0.0"
}
=======
"dependencies": {
  "react": "^19.0.0",
  "upstream-package": "^2.0.0"
}
>>>>>>> upstream/main

// 解决后 (合并双方依赖)
"dependencies": {
  "react": "^19.0.0",
  "local-package": "^1.0.0",
  "upstream-package": "^2.0.0"
}
```

**注意**:
- 版本号冲突时，通常选择较新的版本
- 合并后运行 `npm install` 验证

### 4. 组件文件 (TSX/TS)

**文件**: `apps/frontend/src/renderer/components/**/*.tsx`

**策略**: 根据情况判断

```bash
# 如果是上游新增的组件，保留上游
git checkout --theirs <file>

# 如果是本地定制的组件，保留本地
git checkout --ours <file>

# 如果双方都有修改，手动合并
```

### 5. 文档文件 (MD)

**文件**: `docs/**/*.md`

**策略**: 通常保留本地版本 (中文文档)

```bash
# 本地文档优先
git checkout --ours docs/中文/*.md
git checkout --ours docs/编辑器/*.md
git checkout --ours docs/cc-wf-studio/*.md
```

### 6. 配置文件

**文件**: `tsconfig.json`, `vite.config.ts`, `.eslintrc.js`

**策略**: 仔细比较，手动合并

---

## 🛠️ 工具推荐

### 1. VS Code 内置合并工具

```bash
# 设置 VS Code 为默认合并工具
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# 使用
git mergetool
```

### 2. 命令行工具

```bash
# 查看三方对比 (本地、上游、共同祖先)
git diff --cc <file>

# 查看本地版本
git show :2:<file>

# 查看上游版本
git show :3:<file>
```

### 3. 批量处理

```bash
# 批量保留本地版本 (特定目录)
git checkout --ours docs/中文/*
git add docs/中文/*

# 批量保留上游版本 (特定目录)
git checkout --theirs apps/frontend/src/renderer/components/workflow/nodes/*
git add apps/frontend/src/renderer/components/workflow/nodes/*
```

---

## 📊 常见冲突场景

### 场景 1: 上游新增功能，本地有定制

**处理**:
1. 保留上游的新功能代码
2. 在新功能基础上重新应用本地定制
3. 或者创建新的本地定制文件

### 场景 2: 上游重构了代码结构

**处理**:
1. 先完全接受上游的重构
2. 然后重新应用本地修改
3. 可能需要调整本地修改以适应新结构

### 场景 3: 上游删除了你修改过的文件

**处理**:
```bash
# 查看文件是否真的需要
git log --all -- <deleted-file>

# 如果需要保留，从本地恢复
git checkout HEAD -- <deleted-file>
```

---

## ✅ 冲突解决检查清单

解决冲突后，确保:

- [ ] 所有 `<<<<<<<` 标记已删除
- [ ] 所有 `=======` 标记已删除
- [ ] 所有 `>>>>>>>` 标记已删除
- [ ] 代码可以正常编译 (`npm run build`)
- [ ] 翻译文件是有效的 JSON
- [ ] 本地定制功能仍然正常工作

---

## 🔗 相关文档

- [MERGE_GUIDE.md](./MERGE_GUIDE.md) - 合并指南
- [CHECKLIST.md](./CHECKLIST.md) - 合并检查清单

---

**文档维护者**: Auto-Claude Team
**最后更新**: 2026-01-27
