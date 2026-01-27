# Auto-Claude VSCode 编辑器 - 使用指南

## 📋 目录
- [功能概述](#功能概述)
- [快速开始](#快速开始)
- [功能特性](#功能特性)
- [常见问题](#常见问题)

---

## 🎯 功能概述

Auto-Claude 内置了完整的 VSCode 编辑器（基于 code-server），可以在应用内直接编辑项目文件。

### 核心特性
- ✅ **完整 VSCode 功能** - 文件编辑、搜索、Git 集成、终端等
- ✅ **本地文件访问** - 直接读写项目文件
- ✅ **离线可用** - 无需网络连接
- ✅ **全屏显示** - 编辑器占满整个区域，无工具栏干扰
- ✅ **服务永久运行** - 切换页面时编辑器保持运行状态
- ✅ **无缝切换** - 在编辑器和其他页面之间瞬间切换，无闪烁
- ✅ **自动恢复** - 服务意外关闭时自动重启

---

## 🚀 快速开始

### 1️⃣ 打开编辑器

```
1. 启动 Auto-Claude 应用
2. 选择或打开一个项目
3. 点击侧边栏的"编辑器"按钮
4. 首次打开会显示加载动画（3-5秒）
5. 编辑器加载完成，开始使用！
```

### 2️⃣ 使用编辑器

编辑器提供完整的 VSCode 功能：

- **文件浏览器** - 左侧显示项目文件树
- **代码编辑** - 支持语法高亮、智能提示、代码补全
- **搜索替换** - 全局搜索和替换
- **Git 集成** - 查看修改、提交、推送
- **终端** - 内置终端，可以运行命令
- **扩展支持** - 可以安装 VSCode 扩展

### 3️⃣ 切换页面

- 切换到其他页面（聊天、看板等）时，编辑器会隐藏但**保持运行**
- 切换回编辑器时，**立即显示**，无需重新加载
- 之前打开的文件和编辑状态都会保留

---

## ✨ 功能特性

### 全屏编辑体验

编辑器占满整个区域，无顶部工具栏，提供最大的编辑空间。

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│         VSCode 编辑器全屏显示            │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

### 服务状态提示

当 code-server 服务状态变化时，会显示 Toast 通知：

- **服务关闭时**：
  ```
  📢 Code Server 已关闭
  正在自动重启...
  ```

- **服务恢复时**：
  ```
  ✅ Code Server 已启动
  编辑器已恢复
  ```

### 智能服务管理

- **首次打开** - 启动 code-server 服务，显示加载动画
- **切换页面** - 服务保持运行，编辑器隐藏
- **返回编辑器** - 立即显示，无需重新加载
- **服务崩溃** - 10秒内自动检测并重启
- **应用退出** - 自动清理所有服务

### 性能优化

- **组件保持挂载** - 使用 CSS 隐藏而非卸载组件，避免闪烁
- **状态保持** - 切换页面时保持编辑器状态和打开的文件
- **健康检查** - 每10秒检查服务状态，确保稳定运行

---

## 🔧 常见问题

### Q1: 首次打开编辑器很慢？

**A**: 首次启动 code-server 需要 3-5 秒，这是正常的。后续切换回编辑器时会立即显示。

### Q2: 切换页面后编辑器会关闭吗？

**A**: 不会。编辑器服务会一直保持运行，切换回来时立即显示，无需重新加载。

### Q3: 如何安装 VSCode 扩展？

**A**:
1. 在编辑器中按 `Cmd+Shift+X` 打开扩展面板
2. 搜索并安装需要的扩展
3. 扩展会保存在 code-server 的配置目录中

**注意**: 某些扩展可能需要重启 code-server 才能生效。

### Q4: 中文语言包不生效？

**A**:
1. 安装 Chinese (Simplified) Language Pack 扩展
2. 按 `Cmd+Shift+P` 打开命令面板
3. 输入 "Configure Display Language"
4. 选择 "zh-cn"
5. 重启 Auto-Claude 应用（完全退出后重新打开）

### Q5: 编辑器显示空白或加载失败？

**A**:
1. 检查 code-server 服务是否运行：
   ```bash
   ps aux | grep code-server
   ```
2. 查看控制台日志（`Cmd+Option+I`）
3. 尝试手动重启服务：
   - 完全退出 Auto-Claude 应用
   - 重新打开应用
   - 重新打开编辑器

### Q6: 如何查看服务状态？

**A**:
打开 Chrome DevTools（`Cmd+Option+I`），查看 Console 标签页：
- `[VSCodeEmbed] Server already running` - 服务已运行
- `[VSCodeEmbed] Server not running, starting...` - 正在启动服务
- `[VSCodeEmbed] Server stopped unexpectedly` - 服务意外关闭

---

## 📊 技术架构

```
Auto-Claude Electron App
    ├── 主进程
    │   └── code-server-service.ts
    │       ├── 启动/停止服务
    │       ├── 端口管理（18080-19000）
    │       └── 进程监控
    │
    └── 渲染进程
        └── EditorLayout
            └── VSCodeEmbed
                ├── 服务状态检查
                ├── 健康检查（10秒间隔）
                ├── 自动重启机制
                └── Webview 嵌入
```

---

## 🎯 最佳实践

### 1. 首次使用

- 首次打开编辑器时，等待加载完成（3-5秒）
- 安装常用的 VSCode 扩展
- 配置编辑器设置（主题、字体等）

### 2. 日常使用

- 编辑器会一直保持运行，无需担心切换页面
- 可以在编辑器和其他功能之间自由切换
- 编辑器状态会自动保存

### 3. 故障排除

- 如果编辑器无响应，查看 Toast 通知
- 服务会自动重启，通常无需手动干预
- 如果问题持续，完全退出应用后重新打开

---

## 📝 更新日志

### 2026-01-16 - 重大优化

#### 移除顶部工具栏
- ✅ 移除了 "MA VSCode" 工具栏
- ✅ 编辑器现在全屏显示，提供更大的编辑空间

#### 服务永久运行
- ✅ 切换页面时服务不再关闭
- ✅ 返回编辑器时立即显示，无需重新加载
- ✅ 服务意外关闭时自动重启（10秒内）

#### 无闪烁切换
- ✅ 使用 CSS 隐藏而非卸载组件
- ✅ 组件始终保持挂载，避免重新创建 DOM
- ✅ 切换页面时瞬间完成，无闪烁

#### 服务状态提示
- ✅ 服务关闭时显示 Toast 通知
- ✅ 服务启动时显示恢复通知
- ✅ 用户可以清楚了解服务状态

#### 智能初始化
- ✅ 组件挂载时先检查服务是否已运行
- ✅ 服务已运行时直接使用，无加载动画
- ✅ 只有首次启动或服务崩溃时才显示加载动画

---

---

## 🪟 Windows 平台部署指南

### 概述

本指南适用于在 Windows 平台上部署和使用 code-server（VSCode 的 Web 版本）。

### 关键发现

- **Node.js 22+ 推荐** - 使用 Node.js 22 LTS 或更高版本
- **原生模块必须编译** - 否则会出现 `ENOPRO` 错误
- **Windows 路径格式** - 必须使用正斜杠 `/`，不能使用反斜杠 `\`
- **不支持 `--folder-uri` 参数** - 需要直接传递路径作为位置参数

### 环境要求

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| **Node.js** | 22+ (推荐 22 LTS) | 运行 code-server |
| **Python** | 3.x | node-gyp 需要 |
| **Visual Studio 2022** | 任意版本 | C++ 编译工具 |
| **Git** | 最新版 | 版本控制（可选）|

### Visual Studio 2022 组件

安装时需要勾选：
- ✅ **使用 C++ 的桌面开发** (Desktop development with C++)
- ✅ **Windows 11 SDK** 或 **Windows 10 SDK**
- ✅ **C++ Clang Compiler for Windows** (可选，用于 Node.js 24)

### 编译原生模块

code-server 在 Windows 上需要以下原生模块：
- `@vscode/watcher` - 文件系统监视（关键！）
- `@vscode/windows-ca-certs` - 证书管理
- `kerberos` - 认证模块
- `@vscode/deviceid` - 设备识别
- `@vscode/spdlog` - 日志系统
- `@vscode/windows-process-tree` - 进程树
- `@vscode/windows-registry` - 注册表访问
- `native-watchdog` - 看门狗

如果这些模块未编译，会出现：
```
Error: No prebuild or local build of @vscode/watcher found
ENOPRO: No file system provider found
```

#### 编译步骤

```bash
# 进入 code-server 目录
cd "path\to\code-server\lib\vscode"

# 编译关键模块
cd node_modules/@vscode/watcher
node-gyp rebuild

cd ../@vscode/windows-ca-certs
node-gyp rebuild

cd ../kerberos
node-gyp rebuild
```

#### 验证编译结果

```bash
# 检查 .node 文件是否存在
dir "path\to\code-server\lib\vscode\node_modules\@vscode\watcher\build\Release\watcher.node"

# 应该看到：
# watcher.node (522KB 或类似大小)
```

### 常见问题

#### Q1: 出现 `ENOPRO: No file system provider found` 错误

**原因：** 原生模块未编译

**解决：**
```bash
cd "path\to\code-server\lib\vscode\node_modules\@vscode\watcher"
node-gyp rebuild
```

#### Q2: 文件监视器崩溃（exit code 3221226505）

**原因：** 编译器不兼容（Node.js 24 使用 ClangCL）

**解决方案 A（推荐）：** 降级到 Node.js 22
```bash
nvm install 22
nvm use 22
# 重新编译所有模块
```

#### Q3: 路径格式错误

**问题：** 使用反斜杠 `\` 导致无法打开项目

**解决：** 使用正斜杠 `/`
```bash
# ❌ 错误
code-server "E:\path\to\project"

# ✅ 正确
code-server "E:/path/to/project"
```

#### Q4: node-gyp 找不到 Visual Studio

**错误信息：** `Could not find any Visual Studio installation`

**解决：**
1. 确保 Visual Studio 2022 已安装
2. 确保"使用 C++ 的桌面开发"工作负载已安装
3. 重启命令行窗口

#### Q5: vsda WASM 文件缺失警告

**警告信息：**
```
File not found: ...vscode\node_modules\vsda\rust\web\vsda_bg.wasm
File not found: ...vscode\node_modules\vsda\rust\web\vsda.js
```

**说明：** 这些警告可以忽略，不影响核心功能。vsda 是 Electron 桌面应用相关模块，code-server（浏览器版本）不需要。

### 支持的 Node.js 版本

| Node.js | 支持状态 | 编译器 | 说明 |
|---------|---------|--------|------|
| 22.x | ✅ 推荐 | MSVC | 稳定版本 |
| 23.x | ✅ 支持 | MSVC | 当前版本 |
| 24.x | ⚠️ 谨慎 | ClangCL | 需要重新编译模块 |

---

## 🔗 相关文档

- [技术实现文档](./VSCode编辑器技术文档.md) - 开发者参考
- [Auto-Claude 主文档](../../README.md) - 项目总览
- [code-server 官方文档](https://coder.com/docs/code-server)
