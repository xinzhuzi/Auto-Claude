# Auto-Claude 打包与开发指南

> **版本**: 2.0
> **更新日期**: 2025-01-27
> **适用版本**: Auto-Claude v2.7.5+

---

## 目录

1. [环境要求](#1-环境要求)
2. [依赖安装](#2-依赖安装)
3. [打包脚本使用](#3-打包脚本使用)
4. [开发测试模式](#4-开发测试模式)
5. [平台打包指南](#5-平台打包指南)
6. [常见问题](#6-常见问题)

---

## 1. 环境要求

### 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| **Node.js** | v24.0.0 | v24+ |
| **npm** | 10.0.0 | 最新版 |
| **Python** | 3.12.x (自动下载) | - |
| **Git** | 2.30.0 | 最新版 |

### 开发工具

| 平台 | 必需工具 |
|------|---------|
| **macOS** | Xcode Command Line Tools |
| **Windows** | Visual Studio Build Tools 2019+ |
| **Linux** | build-essential, fakeroot, rpm |

### 环境验证

```bash
# 检查 Node.js 版本
node --version  # 应该 >= 24.0.0

# 检查 npm 版本
npm --version   # 应该 >= 10.0.0

# 检查 Git 版本
git --version   # 应该 >= 2.30.0
```

### 安装依赖

```bash
cd /Users/zhengbingjin/Project/Github/Auto-Claude

# 安装根目录依赖
npm install

# 安装 frontend 依赖
cd apps/frontend
npm install

# 安装 backend 依赖 (可选，用于本地开发)
cd ../backend
pip install -r requirements.txt
```

### 环境配置（可选）

创建 `apps/frontend/.env.local`:

```bash
# Anthropic API (可选，用于测试)
ANTHROPIC_API_KEY=your_api_key_here

# Sentry (可选，用于错误追踪)
VITE_SENTRY_DSN=your_sentry_dsn_here

# 开发模式
DEBUG=false
```

---

## 3. 打包脚本使用

### macOS 打包

**脚本**: `scripts/build-mac.sh`

```bash
cd /Users/zhengbingjin/Project/Github/Auto-Claude
bash scripts/build-mac.sh
```

**执行步骤**:
1. 检查环境（Node.js、npm版本）
2. 下载 Python 运行时
3. 构建 Electron 应用
4. 检查签名证书
5. 生成 DMG 和 ZIP 安装包

**输出文件** (`apps/frontend/dist/`):
- `Auto-Claude-{version}-darwin-arm64.dmg` (~314 MB)
- `Auto-Claude-{version}-darwin-arm64.zip` (~311 MB)
- `mac-arm64/Auto-Claude.app`

### Windows 打包

**脚本**: `scripts/build-win.bat`

双击运行或：

```cmd
cd scripts
build-win.bat
```

**执行步骤**:
1. 检查 Node.js 安装
2. 切换到 frontend 目录
3. 运行 `npm run package:win`

**输出文件**:
- `Auto-Claude-{version}-win32-x64.exe` (NSIS 安装程序)
- `Auto-Claude-{version}-win32-x64.zip`
- `win-unpacked/Auto-Claude.exe` (便携版)

---

## 2. 开发测试模式

### 测试打包后的应用

#### macOS

```bash
cd apps/frontend

# 运行打包后的应用
npm run start:packaged:mac
```

或直接打开：
```bash
open dist/mac-arm64/Auto-Claude.app
```

#### Windows

```cmd
cd apps\frontend
npm run start:packaged:win
```

或直接运行：
```cmd
dist\win-unpacked\Auto-Claude.exe
```

#### Linux

```bash
cd apps/frontend

# AppImage
chmod +x dist/Auto-Claude-*-linux-x86_64.AppImage
./dist/Auto-Claude-*-linux-x86_64.AppImage

# 解压版
./dist/linux-unpacked/auto-claude
```

---

## 3. 平台打包指南

### 手动打包步骤

#### macOS

```bash
cd apps/frontend

# 1. 下载 Python 运行时
npm run python:download

# 2. 构建应用
npm run build

# 3. 打包
npx electron-builder --mac --publish never
```

#### Windows

```bash
cd apps/frontend

# 1. 下载 Python 运行时
npm run python:download

# 2. 构建应用
npm run build

# 3. 打包
npx electron-builder --win --publish never
```

#### Linux

```bash
cd apps/frontend

# AppImage (推荐)
npm run package:linux

# Debian/Ubuntu
npx electron-builder --linux deb --publish never

# Flatpak
npm run package:flatpak
```

---

## 4. 常见问题

### Python 运行时缺失

**症状**: 应用启动后提示 "Python not found"

**解决**:
```bash
cd apps/frontend
npm run python:download
npm run build
npx electron-builder --mac --publish never
```

### macOS 无法打开应用

**症状**: "无法打开，因为无法验证开发者"

**解决**:
```bash
# 移除隔离属性
sudo xattr -cr /Applications/Auto-Claude.app

# 或在系统设置中允许
# 系统设置 > 隐私与安全性 > 点击 "仍要打开"
```

### Electron dist 损坏

**症状**: `⨯ corrupted Electron dist`

**解决**:
```bash
cd apps/frontend
rm -rf node_modules/.cache
rm -rf dist
npm run build
npx electron-builder --mac --publish never
```

### 未签名警告

**影响**:
- ✅ 本机可以正常运行
- ⚠️ 其他 Mac 首次打开需要右键 > 打开

**解决** (可选):
申请 Apple Developer ID 证书，证书名称包含 "Auto-Claude"

---

## 输出文件清单

### macOS

| 文件 | 说明 |
|------|------|
| `*-darwin-arm64.dmg` | DMG 安装包 |
| `*-darwin-arm64.zip` | ZIP 压缩包 |
| `mac-arm64/Auto-Claude.app` | 应用程序 |

### Windows

| 文件 | 说明 |
|------|------|
| `*-win32-x64.exe` | NSIS 安装程序 |
| `*-win32-x64.zip` | ZIP 压缩包 |
| `win-unpacked/Auto-Claude.exe` | 便携版可执行文件 |

### Linux

| 文件 | 说明 |
|------|------|
| `*-linux-x86_64.AppImage` | AppImage 便携版 |
| `*-linux-amd64.deb` | Debian/Ubuntu 包 |
| `*-linux-x86_64.flatpak` | Flatpak 包 |

---

**维护**: Auto-Claude Team
