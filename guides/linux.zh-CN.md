# Linux 安装与构建指南

本指南涵盖 Linux 特定的安装选项和从源代码构建。

## Flatpak 安装

Flatpak 软件包适用于喜欢沙盒应用程序的 Linux 用户。

### 下载 Flatpak

Flatpak 下载链接请参阅 [主 README](../README.md#beta-release) 中的 Beta Release 部分。

### 从源代码构建 Flatpak

要自行构建 Flatpak 软件包，您需要额外的依赖项：

```bash
# Fedora/RHEL
sudo dnf install flatpak-builder

# Ubuntu/Debian
sudo apt install flatpak-builder

# 安装必需的 Flatpak 运行时
flatpak install flathub org.freedesktop.Platform//25.08 org.freedesktop.Sdk//25.08
flatpak install flathub org.electronjs.Electron2.BaseApp//25.08

# 构建 Flatpak
cd apps/frontend
npm run package:flatpak
```

Flatpak 将在 `apps/frontend/dist/` 中创建。

### 安装构建的 Flatpak

构建后，在本地安装 Flatpak：

```bash
flatpak install --user apps/frontend/dist/Auto-Claude-*.flatpak
```

### 从 Flatpak 运行

```bash
flatpak run com.autoclaude.AutoClaude
```

## 其他 Linux 软件包

### AppImage

AppImage 文件是便携式的，不需要安装：

```bash
# 添加可执行权限
chmod +x Auto-Claude-*-linux-x86_64.AppImage

# 运行
./Auto-Claude-*-linux-x86_64.AppImage
```

### Debian 软件包 (.deb)

适用于 Ubuntu/Debian 系统：

```bash
sudo dpkg -i Auto-Claude-*-linux-amd64.deb
```

## 故障排除

### Flatpak 运行时问题

如果 Flatpak 遇到运行时问题：

```bash
# 更新运行时
flatpak update

# 检查缺失的运行时
flatpak list --runtime
```

### AppImage 无法启动

如果 AppImage 无法启动：

```bash
# 检查缺失的库
ldd ./Auto-Claude-*-linux-x86_64.AppImage

# 尝试使用调试输出运行
./Auto-Claude-*-linux-x86_64.AppImage --verbose
```
