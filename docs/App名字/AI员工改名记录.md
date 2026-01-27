# AI员工 改名记录

## 概述

将应用名称从 **Auto Claude** 更改为 **AI员工**。

---

## 修改的文件清单

### 1. 构建配置

| 文件 | 修改内容 |
|------|----------|
| `apps/frontend/package.json` | `productName: "AI员工"` |
| `apps/frontend/package.json` | `description: "Desktop UI for AI员工 autonomous coding framework"` |
| `apps/frontend/package.json` | `author.name: "AI员工 Team"` |

### 2. HTML 标题

| 文件 | 修改内容 |
|------|----------|
| `apps/frontend/src/renderer/index.html` | `<title>AI员工</title>` |

### 3. 国际化翻译

#### 简体中文 (zh-CN)

| 文件 | 修改内容 |
|------|----------|
| `src/shared/i18n/locales/zh-CN/navigation.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/zh-CN/onboarding.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/zh-CN/settings.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/zh-CN/welcome.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/zh-CN/common.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/zh-CN/dialogs.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/zh-CN/settings.json` | **新增** accounts 模块翻译 |

#### 英文 (en)

| 文件 | 修改内容 |
|------|----------|
| `src/shared/i18n/locales/en/navigation.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/en/onboarding.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/en/settings.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/en/welcome.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/en/common.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/en/dialogs.json` | 各处 "Auto Claude" → "AI员工" |

#### 法文 (fr)

| 文件 | 修改内容 |
|------|----------|
| `src/shared/i18n/locales/fr/navigation.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/fr/onboarding.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/fr/settings.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/fr/welcome.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/fr/common.json` | 各处 "Auto Claude" → "AI员工" |
| `src/shared/i18n/locales/fr/dialogs.json` | 各处 "Auto Claude" → "AI员工" |

### 4. 源代码文件

#### React 组件

| 文件 | 修改内容 |
|------|----------|
| `src/renderer/App.tsx` | 注释和错误消息中的 "Auto Claude" → "AI员工" |
| `src/renderer/components/settings/DebugSettings.tsx` | 文本替换 |
| `src/renderer/components/settings/DevToolsSettings.tsx` | 文本替换 |
| `src/renderer/components/AppUpdateNotification.tsx` | 文本替换 |
| `src/renderer/components/Worktrees.tsx` | 文本替换 |
| `src/renderer/components/AuthFailureModal.tsx` | 文本替换 |
| `src/renderer/components/GitHubSetupModal.tsx` | 文本替换 |
| `src/renderer/components/Sidebar.tsx` | 文本替换 |
| `src/renderer/components/github-prs/components/PRDetail.tsx` | 文本替换 |
| `src/renderer/components/onboarding/*.tsx` | 多个文件文本替换 |

#### TypeScript 类型

| 文件 | 修改内容 |
|------|----------|
| `src/shared/types.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/shared/types/project.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/shared/types/ipc.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/shared/types/terminal.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/shared/constants.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/shared/constants/ipc.ts` | 注释中的 "Auto Claude" → "AI员工" |

#### 主进程

| 文件 | 修改内容 |
|------|----------|
| `src/main/index.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/main/app-logger.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/main/insights-service.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/main/insights/insights-executor.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/main/project-initializer.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/main/updater/path-resolver.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/main/terminal/claude-integration-handler.ts` | 注释中的 "Auto Claude" → "AI员工" |
| `src/main/ipc-handlers/*.ts` | 多个文件注释替换 |

### 5. 其他文档

| 文件 | 修改内容 |
|------|----------|
| `README.md` | 标题和内容中的 "Auto Claude" → "AI员工" |
| `CONTRIBUTING.md` | 标题和内容中的 "Auto Claude" → "AI员工" |
| `.env.example` | 注释中的 "Auto Claude" → "AI员工" |
| `scripts/postinstall.cjs` | 注释中的 "Auto Claude" → "AI员工" |

---

## 打包输出

打包后，应用程序将显示为：

- **macOS**: `AI员工.app`
- **Windows**: `AI员工.exe`
- **Linux**: `AI员工` (AppImage/deb)

---

## 日期

2025-01-27

---

## 备注

- 所有替换均使用全局搜索替换，确保无遗漏
- 中英文翻译文件均已更新
- 打包后的应用名称、窗口标题均已更改
