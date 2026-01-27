# Auto-Claude 打包指南

## 📦 macOS 打包方法

### 推荐方法：使用官方打包脚本

```bash
cd /Users/zhengbingjin/Project/Github/Auto-Claude
bash scripts/build-mac.sh
```

### 脚本功能

`scripts/build-mac.sh` 是 Auto-Claude 的官方打包脚本，包含以下步骤：

1. **检查环境** - 验证 Node.js 和 npm 版本
2. **下载 Python 运行时** - 自动下载 Python 3.12.8 运行时
3. **构建 Electron 应用** - 编译前端和后端代码
4. **检查签名证书** - 自动检测是否有代码签名证书
5. **打包应用** - 生成 DMG 和 ZIP 安装包

### 输出文件

打包完成后会在 `apps/frontend/dist/` 目录生成：

- **DMG 安装包**: `Auto-Claude-{version}-darwin-arm64.dmg` (~314 MB)
- **ZIP 压缩包**: `Auto-Claude-{version}-darwin-arm64.zip` (~311 MB)
- **应用程序**: `mac-arm64/Auto-Claude.app`
- **Block Map 文件**: 用于增量更新

### 环境要求

- **Node.js**: v23.11.0 或更高
- **npm**: 10.9.2 或更高
- **操作系统**: macOS (Darwin)
- **架构**: arm64 (Apple Silicon)

---

## ⚠️ 常见问题

### 问题 1: Electron dist 损坏

**错误信息**:
```
⨯ corrupted Electron dist
```

**解决方法**:
```bash
# 清理缓存和构建输出
cd /Users/zhengbingjin/Project/Github/Auto-Claude/apps/frontend
rm -rf node_modules/.cache
rm -rf dist

# 重新运行打包脚本
cd /Users/zhengbingjin/Project/Github/Auto-Claude
bash scripts/build-mac.sh
```

### 问题 2: 应用未签名

**现象**: 打包时显示 "⚠ 未找到签名证书，跳过签名"

**影响**:
- ✅ 在本机可以正常运行
- ⚠️ 在其他 Mac 上首次打开需要右键 > 打开
- ⚠️ 或运行命令: `xattr -cr /Applications/Auto-Claude.app`

**解决方法** (可选):
如需签名，需要申请 Apple Developer ID 证书并安装到钥匙串中。

### 问题 3: ASAR 未启用

**警告信息**:
```
• asar usage is disabled — this is strongly not recommended
```

**影响**:
- 安装包体积稍大
- 文件结构可见（不影响功能）

**解决方法** (可选):
在 `apps/frontend/package.json` 的 `build` 配置中启用 ASAR：
```json
{
  "build": {
    "asar": true
  }
}
```

---

## ❌ 不推荐的方法

### 不要直接使用 npm 脚本

```bash
# ❌ 不推荐 - 不会下载 Python 运行时
npm run package:mac

# ❌ 不推荐 - 不会下载 Python 运行时
cd apps/frontend && npm run package:mac
```

**原因**: 这些命令不会执行 `npm run python:download`，导致打包的应用缺少 Python 运行时，无法正常运行后端功能。

---

## 📋 打包清单

### 打包前检查

- [ ] 确认所有代码已提交到 Git
- [ ] 确认版本号正确 (package.json)
- [ ] 确认所有测试通过
- [ ] 确认构建无错误

### 打包后验证

- [ ] 检查 DMG 文件大小 (~314 MB)
- [ ] 检查 ZIP 文件大小 (~311 MB)
- [ ] 测试 DMG 安装
- [ ] 测试应用启动
- [ ] 测试核心功能
- [ ] 测试 Python 后端功能

---

## 🚀 分发指南

### 本地测试

1. 双击 `Auto-Claude-2.7.4-darwin-arm64.dmg`
2. 将 Auto-Claude 拖到 Applications 文件夹
3. 首次打开时，右键点击 → 选择"打开"

### 分发给其他用户

1. 上传 DMG 文件到发布平台
2. 提供安装说明（包括首次打开的步骤）
3. 如果应用未签名，提醒用户使用右键打开

### 移除签名限制 (可选)

如果用户遇到"无法打开"的问题，可以运行：
```bash
xattr -cr /Applications/Auto-Claude.app
```

---

## 📊 打包统计

### 最近一次打包 (2026-01-24)

- **版本**: 2.7.4
- **DMG 大小**: 314 MB
- **ZIP 大小**: 311 MB
- **构建时间**: ~2 分钟
- **Node 版本**: v23.11.0
- **Python 版本**: 3.12.8
- **Electron 版本**: 39.2.7

### 包含的功能

- ✅ PropertyPanel 完整实现 (511 行)
- ✅ 多语言支持 (en, zh-CN, fr)
- ✅ 状态管理优化
- ✅ 生产环境 console 清理
- ✅ Python 3.12.8 运行时
- ✅ 所有依赖包

---

## 🔧 高级选项

### 自定义打包配置

编辑 `apps/frontend/package.json` 的 `build` 部分：

```json
{
  "build": {
    "appId": "com.auto-claude.app",
    "productName": "Auto-Claude",
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": ["dmg", "zip"],
      "icon": "resources/icon.icns"
    }
  }
}
```

### 启用代码签名

1. 申请 Apple Developer ID 证书
2. 安装证书到钥匙串
3. 证书名称包含 "Auto-Claude"
4. 重新运行打包脚本（会自动检测并使用证书）

### 生成其他平台安装包

```bash
# Windows
npm run package:win

# Linux
npm run package:linux
```

---

## 📝 更新日志

### 2026-01-24
- ✅ 成功打包 v2.7.4
- ✅ 包含所有最新功能
- ✅ 修复 Electron dist 损坏问题
- ✅ 验证 Python 运行时正常

---

## 🆘 获取帮助

如果遇到打包问题：

1. 查看本文档的"常见问题"部分
2. 检查 GitHub Issues
3. 查看打包日志输出
4. 清理缓存后重试

---

**最后更新**: 2026-01-24
**维护者**: Auto-Claude Team
