# Auto-Claude 打包指南

> **版本**: 3.0  
> **更新日期**: 2026-01-27  
> **适用版本**: Auto-Claude v2.7.5+

---

## 目录

1. [环境要求](#1-环境要求)
2. [快速打包](#2-快速打包)
3. [打包流程详解](#3-打包流程详解)
4. [测试打包结果](#4-测试打包结果)
5. [常见问题](#5-常见问题)
6. [输出文件清单](#6-输出文件清单)

---

## 1. 环境要求

### 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| **Node.js** | v24.0.0 | v24+ |
| **npm** | 10.0.0 | 最新版 |
| **Python** | 3.12.x | 自动下载 |
| **Git** | 2.30.0 | 最新版 |

### 平台工具

| 平台 | 必需工具 |
|------|---------|
| **macOS** | Xcode Command Line Tools |
| **Windows** | Visual Studio Build Tools 2019+ |
| **Linux** | build-essential, fakeroot, rpm |

### 环境验证

```bash
node --version  # >= 24.0.0
npm --version   # >= 10.0.0
git --version   # >= 2.30.0
```

### 安装依赖

```bash
# 根目录
npm install

# frontend
cd apps/frontend
npm install
```

---

## 2. 快速打包

### macOS

```bash
# 方式一：使用脚本
./scripts/build-mac.sh

# 方式二：npm 命令
cd apps/frontend
npm run package:mac
```

### Windows

```cmd
:: 方式一：双击脚本
scripts\build-win.bat

:: 方式二：npm 命令
cd apps\frontend
npm run package:win
```

### Linux

```bash
cd apps/frontend
npm run package:linux
```

---

## 3. 打包流程详解

### 核心脚本

打包由 `apps/frontend/scripts/package-with-python.cjs` 统一处理，流程如下：

```
┌─────────────────────────────────────────────────────────────┐
│                    package-with-python.cjs                   │
├─────────────────────────────────────────────────────────────┤
│  1. 解析命令行参数 (--mac/--win/--linux, --x64/--arm64)      │
│                              ↓                               │
│  2. downloadPython() - 下载对应平台的 Python 运行时           │
│                              ↓                               │
│  3. electron-vite build - 构建前端代码                       │
│                              ↓                               │
│  4. stageRuntimePackages() - 复制 node-pty 等原生模块        │
│                              ↓                               │
│  5. stageCodeServer() - 复制并优化 code-server               │
│     ├── 只复制当前平台的 code-server                         │
│     ├── 解析符号链接 (dereference: true)                     │
│     └── 删除重复的 node_modules.asar                         │
│                              ↓                               │
│  6. electron-builder - 打包成安装程序                        │
└─────────────────────────────────────────────────────────────┘
```

### stageCodeServer 优化逻辑

```javascript
// 1. 平台感知：只复制当前平台的 code-server
if (entry.includes('-win') && platform !== 'win') {
  continue;  // Mac/Linux 打包时跳过 Windows 版本
}

// 2. 符号链接处理
// 源目录: node_modules.asar -> node_modules (符号链接)
// 复制后: 两者都变成完整目录 (重复)
fs.cpSync(srcPath, destPath, { recursive: true, dereference: true });

// 3. 去重：保留 node_modules，删除 node_modules.asar
// Node.js 只能从 node_modules 目录加载模块
if (hasNodeModules && hasNodeModulesAsar) {
  fs.rmSync(nodeModulesAsar, { recursive: true, force: true });
}
```

### electron-builder 配置

`apps/frontend/package.json` 中的关键配置：

```json
{
  "extraResources": [
    {
      "from": "code-server-staged/lib",
      "to": "code-server/lib",
      "filter": [
        "!**/.git",
        "!**/.DS_Store",
        "!**/code-server-*-win/**",
        "!**/code-server-*-win"
      ]
    }
  ]
}
```

### beforePack 钩子

`apps/frontend/electron-builder.cjs` 作为最后一道防线：

```javascript
beforePack: async (context) => {
  // 验证并清理不匹配平台的文件
  if (entry.includes('-win') && platform !== 'win32') {
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
}
```

---

## 4. 测试打包结果

### macOS

```bash
# 运行打包后的应用
open apps/frontend/dist/mac-arm64/Auto-Claude.app

# 或使用 npm 脚本
cd apps/frontend
npm run start:packaged:mac
```

### Windows

```cmd
:: 运行便携版
apps\frontend\dist\win-unpacked\Auto-Claude.exe

:: 或使用 npm 脚本
cd apps\frontend
npm run start:packaged:win
```

### Linux

```bash
# AppImage
chmod +x dist/Auto-Claude-*-linux-x86_64.AppImage
./dist/Auto-Claude-*-linux-x86_64.AppImage

# 解压版
./dist/linux-unpacked/auto-claude
```

---

## 5. 常见问题

### Cannot find package '@microsoft/1ds-core-js'

**原因**: `node_modules` 目录被错误删除

**解决**: 确保 `package.json` 的 `extraResources` 中没有排除 `node_modules`：

```json
// ❌ 错误配置
"filter": [
  "!**/vscode/node_modules/**",
  "!**/vscode/node_modules"
]

// ✅ 正确配置
"filter": [
  "!**/.git",
  "!**/.DS_Store",
  "!**/code-server-*-win/**",
  "!**/code-server-*-win"
]
```

### Python 运行时缺失

**症状**: 应用启动后提示 "Python not found"

**解决**:
```bash
cd apps/frontend
npm run python:download
npm run package:mac  # 或 package:win
```

### macOS 无法打开应用

**症状**: "无法打开，因为无法验证开发者"

**解决**:
```bash
sudo xattr -cr /Applications/Auto-Claude.app
```

### Electron dist 损坏

**症状**: `⨯ corrupted Electron dist`

**解决**:
```bash
cd apps/frontend
rm -rf node_modules/.cache
rm -rf dist
npm run package:mac
```

---

## 6. 输出文件清单

### macOS

| 文件 | 说明 | 大小 |
|------|------|------|
| `*-darwin-arm64.dmg` | DMG 安装包 | ~314 MB |
| `*-darwin-arm64.zip` | ZIP 压缩包 | ~311 MB |
| `mac-arm64/Auto-Claude.app` | 应用程序 | ~1.3 GB |

### Windows

| 文件 | 说明 |
|------|------|
| `*-win32-x64.exe` | NSIS 安装程序 |
| `*-win32-x64.zip` | ZIP 压缩包 |
| `win-unpacked/Auto-Claude.exe` | 便携版 |

### Linux

| 文件 | 说明 |
|------|------|
| `*-linux-x86_64.AppImage` | AppImage 便携版 |
| `*-linux-amd64.deb` | Debian/Ubuntu 包 |
| `*-linux-x86_64.flatpak` | Flatpak 包 |

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `apps/frontend/scripts/package-with-python.cjs` | 核心打包脚本 |
| `apps/frontend/electron-builder.cjs` | electron-builder 钩子 |
| `apps/frontend/package.json` | 打包配置 |
| `scripts/build-mac.sh` | Mac 打包入口脚本 |
| `scripts/build-win.bat` | Windows 打包入口脚本 |

---

**维护**: Auto-Claude Team
