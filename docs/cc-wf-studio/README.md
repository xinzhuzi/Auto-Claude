# cc-wf-studio 迁移文档

**最后更新**: 2026-01-27
**文档数量**: 3 个核心文档

---

## 📚 文档清单

本目录包含从 cc-wf-studio 迁移功能到 Auto-Claude 的完整指南。

| 文档 | 用途 | 适用对象 |
|------|------|---------|
| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) | 迁移流程和组件清单 | 所有开发者 |
| [AUTO_CLAUDE_MODIFICATIONS.md](./AUTO_CLAUDE_MODIFICATIONS.md) | Auto-Claude 需要的修改 | 执行迁移的开发者 |
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | 完整示例和最佳实践 | 新手开发者 |

---

## 🚀 快速开始

### 迁移新组件

1. 阅读 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) 了解整体流程
2. 按照 [AUTO_CLAUDE_MODIFICATIONS.md](./AUTO_CLAUDE_MODIFICATIONS.md) 修改文件
3. 参考 [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) 中的完整示例

### 添加翻译

翻译文件的权威来源在 cc-wf-studio:
```
apps/cc-wf-studio/src/i18n/locales/
├── en/workflowStudio.json
├── fr/workflowStudio.json
└── zh-CN/workflowStudio.json
```

⚠️ **重要**: 不要在 `apps/frontend/src/shared/i18n/locales/` 下创建 workflowStudio.json

---

## 🏗️ 架构概览

```
cc-wf-studio (源)              Auto-Claude (目标)
─────────────────              ──────────────────
src/components/    ──复制──►   workflow/
src/i18n/locales/  ──导入──►   shared/i18n/index.ts
```

### 关键差异

| 维度 | cc-wf-studio | Auto-Claude |
|------|-------------|-------------|
| 运行环境 | VSCode Extension | Electron App |
| IPC 通信 | VSCode API | Electron IPC |
| 翻译文件 | 权威来源 | 从源导入 |

---

## 📊 当前状态

- **组件迁移**: 79/79 (100%)
- **翻译支持**: 3/6 语言已配置 (en, fr, zh-CN)
- **待配置语言**: ja, ko, zh-TW

---

## 🔗 相关文档

- [中文翻译指南](../中文/中文翻译完整指南.md)
- [VSCode 编辑器文档](../编辑器/)

---

**文档维护者**: Auto-Claude Team
