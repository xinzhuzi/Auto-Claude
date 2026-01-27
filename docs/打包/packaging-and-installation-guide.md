# Auto-Claude 打包和安装指南

**文档版本**: 1.0
**创建日期**: 2025-01-15
**适用版本**: Auto-Claude 2.7.4+

---

## 📋 目录

1. [打包前准备](#打包前准备)
2. [打包流程](#打包流程)
3. [安装指南](#安装指南)
4. [验证和测试](#验证和测试)
5. [故障排查](#故障排查)
6. [发布流程](#发布流程)

---

## 打包前准备

### 系统要求

#### 开发环境

| 平台 | 要求 |
|-----|------|
| **Node.js** | >= 24.0.0 |
| **npm** | >= 10.0.0 |
| **Python** | 3.12.x (自动下载) |
| **Git** | >= 2.30.0 |

#### 打包工具

- **macOS**: Xcode Command Line Tools
- **Windows**: Visual Studio Build Tools 2019+
- **Linux**: build-essential, fakeroot, rpm

### 环境配置

#### 1. 安装依赖

```bash
cd /Users/zhengbingjin/Project/Github/Auto-Claude

# 安装根目录依赖
npm install

# 安装 frontend 依赖
cd apps/frontend
npm install

# 安装 backend 依赖
cd ../backend
pip install -r requirements.txt
```

#### 2. 配置环境变量

创建 `apps/frontend/.env.local`:

```bash
# Anthropic API (可选，用于测试)
ANTHROPIC_API_KEY=your_api_key_here

# Sentry (可选，用于错误追踪)
VITE_SENTRY_DSN=your_sentry_dsn_here

# 开发模式
DEBUG=false
```

#### 3. 验证环境

```bash
# 检查 Node.js 版本
node --version  # 应该 >= 24.0.0

# 检查 npm 版本
npm --version   # 应该 >= 10.0.0

# 检查 Python 版本
python3 --version  # 应该是 3.12.x

# 检查 Git 版本
git --version   # 应该 >= 2.30.0
```

---

## 打包流程

### 完整打包命令

#### macOS (Apple Silicon)

```bash
cd apps/frontend

# 方法 1: 使用 npm script (推荐)
npm run package:mac

# 方法 2: 手动步骤
npm run python:download        # 下载并配置 Python 运行时
npm run build                  # 构建前端代码
electron-builder --mac --publish never  # 打包 macOS 应用
```

**输出文件**:
- `dist/Auto-Claude-2.7.4-darwin-arm64.dmg` - DMG 安装包
- `dist/Auto-Claude-2.7.4-darwin-arm64.zip` - ZIP 压缩包
- `dist/mac-arm64/Auto-Claude.app` - 应用程序包

#### macOS (Intel)

```bash
cd apps/frontend

# 使用 npm script
npm run package:mac

# 或手动指定架构
electron-builder --mac --x64 --publish never
```

**输出文件**:
- `dist/Auto-Claude-2.7.4-darwin-x64.dmg`
- `dist/Auto-Claude-2.7.4-darwin-x64.zip`
- `dist/mac/Auto-Claude.app`

#### Windows

```bash
cd apps/frontend

# 方法 1: 使用 npm script (推荐)
npm run package:win

# 方法 2: 手动步骤
npm run python:download        # 下载并配置 Python 运行时
npm run build                  # 构建前端代码
electron-builder --win --publish never  # 打包 Windows 应用
```

**输出文件**:
- `dist/Auto-Claude-2.7.4-win32-x64.exe` - NSIS 安装程序
- `dist/Auto-Claude-2.7.4-win32-x64.zip` - ZIP 压缩包
- `dist/win-unpacked/Auto-Claude.exe` - 便携版

#### Linux

```bash
cd apps/frontend

# AppImage (推荐)
npm run package:linux

# Debian/Ubuntu (.deb)
electron-builder --linux deb --publish never

# Flatpak
npm run package:flatpak
```

**输出文件**:
- `dist/Auto-Claude-2.7.4-linux-x86_64.AppImage` - AppImage
- `dist/Auto-Claude-2.7.4-linux-amd64.deb` - Debian 包
- `dist/Auto-Claude-2.7.4-linux-x86_64.flatpak` - Flatpak 包

### 打包选项

#### 跳过 Python 下载

如果已经下载过 Python 运行时：

```bash
# 只构建和打包，不重新下载 Python
npm run build
electron-builder --mac --publish never
```

#### 下载所有平台的 Python

```bash
# 下载 macOS、Windows、Linux 的 Python 运行时
npm run python:download:all
```

#### 调试模式打包

```bash
# 启用详细日志
DEBUG=electron-builder npm run package:mac
```

### 打包后文件结构

```
apps/frontend/dist/
├── Auto-Claude-2.7.4-darwin-arm64.dmg          # macOS 安装包
├── Auto-Claude-2.7.4-darwin-arm64.dmg.blockmap # 增量更新映射
├── Auto-Claude-2.7.4-darwin-arm64.zip          # macOS ZIP
├── Auto-Claude-2.7.4-darwin-arm64.zip.blockmap # 增量更新映射
├── latest-mac.yml                               # 自动更新配置
├── builder-debug.yml                            # 构建调试信息
└── mac-arm64/
    └── Auto-Claude.app/                         # 应用程序包
        ├── Contents/
        │   ├── MacOS/
        │   │   └── Auto-Claude                  # 可执行文件
        │   ├── Resources/
        │   │   ├── app.asar                     # 应用代码
        │   │   ├── python/                      # Python 运行时
        │   │   └── site-packages/               # Python 包
        │   └── Info.plist                       # 应用信息
        └── ...
```

---

## 安装指南

### macOS 安装

#### 方法 1: DMG 安装包 (推荐)

1. **下载 DMG 文件**
   ```bash
   # 从 dist 目录
   open apps/frontend/dist/Auto-Claude-2.7.4-darwin-arm64.dmg

   # 或从 GitHub Releases
   # https://github.com/AndyMik90/Auto-Claude/releases
   ```

2. **安装应用**
   - 双击打开 DMG 文件
   - 将 `Auto-Claude.app` 拖到 `Applications` 文件夹
   - 等待复制完成

3. **首次启动**
   ```bash
   # 方法 1: 从 Finder 启动
   # 打开 Applications 文件夹，双击 Auto-Claude

   # 方法 2: 从命令行启动
   open /Applications/Auto-Claude.app
   ```

4. **处理安全提示**

   如果看到 "无法打开，因为无法验证开发者" 的提示：

   ```bash
   # 方法 1: 系统设置
   # 系统设置 > 隐私与安全性 > 点击 "仍要打开"

   # 方法 2: 命令行移除隔离属性
   sudo xattr -rd com.apple.quarantine /Applications/Auto-Claude.app
   ```

#### 方法 2: ZIP 压缩包

1. **解压 ZIP 文件**
   ```bash
   cd ~/Downloads
   unzip Auto-Claude-2.7.4-darwin-arm64.zip
   ```

2. **移动到 Applications**
   ```bash
   mv Auto-Claude.app /Applications/
   ```

3. **启动应用**
   ```bash
   open /Applications/Auto-Claude.app
   ```

#### 方法 3: 开发模式运行

```bash
cd apps/frontend

# 运行打包后的应用
npm run start:packaged:mac

# 或直接运行
open dist/mac-arm64/Auto-Claude.app
```

### Windows 安装

#### 方法 1: NSIS 安装程序 (推荐)

1. **下载 EXE 文件**
   ```powershell
   # 从 dist 目录
   start apps\frontend\dist\Auto-Claude-2.7.4-win32-x64.exe
   ```

2. **运行安装程序**
   - 双击 `Auto-Claude-2.7.4-win32-x64.exe`
   - 选择安装位置（默认: `C:\Users\<用户名>\AppData\Local\Programs\Auto-Claude`）
   - 点击 "安装"
   - 等待安装完成

3. **启动应用**
   - 从开始菜单搜索 "Auto-Claude"
   - 或从桌面快捷方式启动

#### 方法 2: 便携版 (ZIP)

1. **解压 ZIP 文件**
   ```powershell
   # 解压到任意目录
   Expand-Archive -Path Auto-Claude-2.7.4-win32-x64.zip -DestinationPath C:\AutoClaude
   ```

2. **运行应用**
   ```powershell
   cd C:\AutoClaude\win-unpacked
   .\Auto-Claude.exe
   ```

#### 方法 3: 开发模式运行

```powershell
cd apps\frontend

# 运行打包后的应用
npm run start:packaged:win

# 或直接运行
start dist\win-unpacked\Auto-Claude.exe
```

### Linux 安装

#### 方法 1: AppImage (推荐)

1. **下载 AppImage 文件**
   ```bash
   cd ~/Downloads
   # 从 dist 目录或 GitHub Releases 下载
   ```

2. **添加执行权限**
   ```bash
   chmod +x Auto-Claude-2.7.4-linux-x86_64.AppImage
   ```

3. **运行应用**
   ```bash
   ./Auto-Claude-2.7.4-linux-x86_64.AppImage
   ```

4. **集成到系统 (可选)**
   ```bash
   # 移动到 /opt
   sudo mv Auto-Claude-2.7.4-linux-x86_64.AppImage /opt/auto-claude.appimage

   # 创建桌面快捷方式
   cat > ~/.local/share/applications/auto-claude.desktop <<EOF
   [Desktop Entry]
   Name=Auto Claude
   Exec=/opt/auto-claude.appimage
   Icon=auto-claude
   Type=Application
   Categories=Development;
   EOF
   ```

#### 方法 2: Debian/Ubuntu (.deb)

1. **安装 DEB 包**
   ```bash
   sudo dpkg -i Auto-Claude-2.7.4-linux-amd64.deb

   # 如果有依赖问题
   sudo apt-get install -f
   ```

2. **启动应用**
   ```bash
   auto-claude

   # 或从应用菜单启动
   ```

3. **卸载**
   ```bash
   sudo apt-get remove auto-claude
   ```

#### 方法 3: Flatpak

1. **安装 Flatpak 包**
   ```bash
   flatpak install Auto-Claude-2.7.4-linux-x86_64.flatpak
   ```

2. **运行应用**
   ```bash
   flatpak run com.autoclaude.AutoClaude
   ```

3. **卸载**
   ```bash
   flatpak uninstall com.autoclaude.AutoClaude
   ```

---

## 验证和测试

### 安装后验证

#### 1. 检查应用版本

```bash
# macOS
/Applications/Aude.app/Contents/MacOS/Auto-Claude --version

# Windows
"C:\Users\<用户名>\AppData\Local\Programs\Auto-Claude\Auto-Claude.exe" --version

# Linux
auto-claude --version
```

**预期输出**: `Auto-Claude 2.7.4`

#### 2. 检查 Python 运行时

启动应用后，在终端中运行：

```bash
# 应该能看到 Python 3.12.x
python --version
```

#### 3. 检查 MCP 服务器

在应用的设置中：
- 打开 "Settings" > "MCP Servers"
- 检查所有 MCP 服务器状态是否为 "Healthy"

#### 4. 创建测试任务

1. 打开一个 Git 仓库
2. 创建一个简单的测试任务：
   ```
   Task: Create a test file
   Description: Create a file named test.txt with content "Hello, Auto-Claude!"
   ```
3. 运行任务并验证结果

### 功能测试清单

- [ ] **应用启动**: 应用能正常启动，无崩溃
- [ ] **OAuth 认证**: 能成功连接 Claude Code CLI
- [ ] **项目加载**: 能打开 Git 仓库
- [ ] **任务创建**: 能创建新任务
- [ ] **任务执行**: 任务能正常执行
- [ ] **终端功能**: Agent 终端能正常工作
- [ ] **Worktree 隔离**: Worktree 创建和清理正常
- [ ] **Git 操作**: Git 命令能正常执行
- [ ] **MCP 服务器**: 所有 MCP 服务器连接正常
- [ ] **自动更新**: 更新检查功能正常

### 性能测试

#### 1. 启动时间

```bash
# macOS
time open /Applications/Auto-Claude.app

# 预期: < 5 秒
```

#### 2. 内存使用

```bash
# macOS
ps aux | grep "Auto-Claude"

# 预期: 空闲时 < 500MB，工作时 < 2GB
```

#### 3. Python 运行时大小

```bash
# macOS
du -sh /Applications/Auto-Claude.app/Contents/Resources/python

# 预期: ~100-200MB
```

---

## 故障排查

### 常见问题

#### 问题 1: macOS 无法打开应用

**症状**: "无法打开，因为无法验证开发者"

**解决方案**:
```bash
# 移除隔离属性
sudo xattr -rd com.apple.quarantine /Applications/Auto-Claude.app

# 或在系统设置中允许
# 系统设置 > 隐私与安全性 > 点击 "仍要打开"
```

#### 问题 2: Windows 安装被阻止

**症状**: "Windows 已保护你的电脑"

**解决方案**:
1. 点击 "更多信息"
2. 点击 "仍要运行"
3. 或右键点击安装程序 > 属性 > 解除锁定

#### 问题 3: Python 运行时缺失

**症状**: 应用启动后提示 "Python not found"

**解决方案**:
```bash
# 重新下载 Python 运行时
cd apps/frontend
npm run python:download

# 重新打包
npm run package:mac  # 或 package:win / package:linux
```

#### 问题 4: pywin32 错误 (Windows)

**症状**: `ModuleNotFoundError: No module named 'pywintypes'`

**解决方案**:
这个问题已在 2.7.4 版本中修复。如果仍然遇到：

1. 确认使用的是最新版本
2. 重新下载 Python 运行时：
   ```bash
   cd apps/frontend
   rm -rf python-runtime/win-x64
   npm run python:download
   npm run package:win
   ```

#### 问题 5: MCP 服务器连接失败

**症状**: MCP 服务器状态显示 "Unhealthy"

**解决方案**:
1. 检查网络连接
2. 检查 MCP 服务器配置：
   ```bash
   # macOS/Linux
   cat ~/.config/auto-claude/mcp-servers.json

   # Windows
   type %APPDATA%\auto-claude\mcp-servers.json
   ```
3. 重启应用

#### 问题 6: Git 操作失败

**症状**: Git 命令执行失败或被阻止

**解决方案**:
1. 检查 Git 是否安装：
   ```bash
   git --version
   ```
2. 检查 Git 安全系统日志：
   - 打开应用日志
   - 查找 "BLOCKED" 或 "Git safety" 相关消息
3. 如果是误报，可以在设置中调整安全规则

### 日志位置

#### macOS
```bash
# 应用日志
~/Library/Logs/Auto-Claude/main.log

# Python 日志
~/Library/Logs/Auto-Claude/python.log

# 查看实时日志
tail -f ~/Library/Logs/Auto-Claude/main.log
```

#### Windows
```powershell
# 应用日志
%APPDATA%\Auto-Claude\logs\main.log

# Python 日志
%APPDATA%\Auto-Claude\logs\python.log

# 查看日志
Get-Content $env:APPDATA\Auto-Claude\logs\main.log -Tail 50 -Wait
```

#### Linux
```bash
# 应用日志
~/.config/Auto-Claude/logs/main.log

# Python 日志
~/.config/Auto-Claude/logs/python.log

# 查看实时日志
tail -f ~/.config/Auto-Claude/logs/main.log
```

### 完全卸载

#### macOS

```bash
# 1. 删除应用
rm -rf /Applications/Auto-Claude.app

# 2. 删除用户数据
rm -rf ~/Library/Application\ Support/Auto-Claude
rm -rf ~/Library/Logs/Auto-Claude
rm -rf ~/Library/Caches/Auto-Claude
rm -rf ~/.config/auto-claude

# 3. 删除 Claude Code CLI 配置
rm -rf ~/.claude
```

#### Windows

```powershell
# 1. 使用控制面板卸载
# 控制面板 > 程序 > 卸载程序 > Auto-Claude

# 2. 删除用户数据
Remove-Item -Recurse -Force $env:APPDATA\Auto-Claude
Remove-Item -Recurse -Force $env:LOCALAPPDATA\Auto-Claude
Remove-Item -Recurse -Force $env:USERPROFILE\.config\auto-claude

# 3. 删除 Claude Code CLI 配置
Remove-Item -Recurse -Force $env:USERPROFILE\.claude
```

#### Linux

```bash
# 1. 卸载应用
sudo apt-get remove auto-claude  # Debian/Ubuntu
# 或删除 AppImage
rm /opt/auto-claude.appimage

# 2. 删除用户数据
rm -rf ~/.config/Auto-Claude
rm -rf ~/.local/share/Auto-Claude
rm -rf ~/.cache/Auto-Claude

# 3. 删除 Claude Code CLI 配置
rm -rf ~/.claude
```

---

## 发布流程

### 准备发布

#### 1. 更新版本号

```bash
# 更新 package.json
cd apps/frontend
npm version 2.7.4

# 更新 backend 版本
cd ../backend
# 编辑 __init__.py 中的 __version__
```

#### 2. 更新 CHANGELOG

```bash
# 编辑 CHANGELOG.md
# 添加新版本的更新内容
```

#### 3. 运行测试

```bash
# 运行所有测试
npm run test

# 运行 E2E 测试
npm run test:e2e
```

### 构建所有平台

```bash
cd apps/frontend

# macOS (需要在 macOS 上构建)
npm run package:mac

# Windows (可以在任何平台上构建，但需要 wine)
npm run package:win

# Linux (可以在任何平台上构建)
npm run package:linux
```

### 生成校验和

```bash
cd apps/frontend/dist

# 生成 SHA256 校验和
shasum -a 256 Auto-Claude-2.7.4-darwin-arm64.dmg > Auto-Claude-2.7.4-darwin-arm64.dmg.sha256
shasum -a 256 Auto-Claude-2.7.4-win32-x64.exe > Auto-Claude-2.7.4-win32-x64.exe.sha256
shasum -a 256 Auto-Claude-2.7.4-linux-x86_64.AppImage > Auto-Claude-2.7.4-linux-x86_64.AppImage.sha256
```

### 创建 GitHub Release

```bash
# 1. 创建 Git tag
git tag -a v2.7.4 -m "Release v2.7.4"
git push origin v2.7.4

# 2. 在 GitHub 上创建 Release
# https://github.com/AndyMik90/Auto-Claude/releases/new

# 3. 上传构建产物
# - DMG 文件 (macOS)
# - EXE 文件 (Windows)
# - AppImage 文件 (Linux)
# - DEB 文件 (Linux)
# - Flatpak 文件 (Linux)
# - SHA256 校验和文件
# - latest-mac.yml (自动更新配置)
```

### 自动更新配置

`latest-mac.yml` 示例:

```yaml
version: 2.7.4
files:
  - url: Auto-Claude-2.7.4-darwin-arm64.dmg
    sha512: <sha512-hash>
    size: 185903909
  - url: Auto-Claude-2.7.4-darwin-arm64.zip
    sha512: <sha512-hash>
    size: 179704140
path: Auto-Claude-2.7.4-darwin-arm64.dmg
sha512: <sha512-hash>
releaseDate: '2025-01-15T00:00:00.000Z'
```

---

## 附录

### A. 打包配置文件

#### electron-builder.yml

位置: `apps/frontend/electron-builder.yml`

关键配置:
- `appId`: 应用 ID
- `productName`: 应用名称
- `directories`: 构建目录
- `files`: 包含的文件
- `extraResources`: 额外资源（Python 运行时）
- `mac`: macOS 特定配置
- `win`: Windows 特定配置
- `linux`: Linux 特定配置

### B. Python 运行时配置

#### download-python.cjs

位置: `apps/frontend/scripts/download-python.cjs`

功能:
- 下载 Python 3.12.x 运行时
- 安装 requirements.txt 中的包
- 修补 pywin32 (Windows)
- 优化包大小

### C. 相关文档

- **完整合并报告**: `docs/完整合并与问题解决报告-2025-01-15.md`
- **pywin32 修复**: `docs/PYWIN32_FIX_DOCUMENTATION.md`
- **Git 知识库**: `docs/git知识库/README.md`
- **Fork 管理**: `docs/fork/upstream-sync-workflow.md`

### D. 支持和反馈

- **GitHub Issues**: https://github.com/AndyMik90/Auto-Claude/issues
- **Discord 社区**: https://discord.gg/KCXaPBr4Dj
- **YouTube 频道**: https://www.youtube.com/@AndreMikalsen

---

**文档维护者**: zhengbingjin
**最后更新**: 2025-01-15
**状态**: ✅ 活跃维护
