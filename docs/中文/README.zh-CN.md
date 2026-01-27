# Auto Claude

**自主多代理编码框架，为您规划、构建和验证软件。**

![Auto Claude 看板](.github/assets/Auto-Claude-Kanban.png)

[![许可证](https://img.shields.io/badge/license-AGPL--3.0-green?style=flat-square)](./agpl-3.0.txt)
[![Discord](https://img.shields.io/badge/Discord-加入社区-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/KCXaPBr4Dj)
[![YouTube](https://img.shields.io/badge/YouTube-订阅-FF0000?style=flat-square&logo=youtube&logoColor=white)](https://www.youtube.com/@AndreMikalsen)
[![CI](https://img.shields.io/github/actions/workflow/status/AndyMik90/Auto-Claude/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/AndyMik90/Auto-Claude/actions)

---

## 下载

### 稳定版本

<!-- STABLE_VERSION_BADGE -->
[![稳定版](https://img.shields.io/badge/stable-2.7.5-blue?style=flat-square)](https://github.com/AndyMik90/Auto-Claude/releases/tag/v2.7.5)
<!-- STABLE_VERSION_BADGE_END -->

<!-- STABLE_DOWNLOADS -->
| 平台 | 下载 |
|----------|----------|
| **Windows** | [Auto-Claude-2.7.5-win32-x64.exe](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.5/Auto-Claude-2.7.5-win32-x64.exe) |
| **macOS (Apple Silicon)** | [Auto-Claude-2.7.5-darwin-arm64.dmg](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.5/Auto-Claude-2.7.5-darwin-arm64.dmg) |
| **macOS (Intel)** | [Auto-Claude-2.7.5-darwin-x64.dmg](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.5/Auto-Claude-2.7.5-darwin-x64.dmg) |
| **Linux** | [Auto-Claude-2.7.5-linux-x86_64.AppImage](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.5/Auto-Claude-2.7.5-linux-x86_64.AppImage) |
| **Linux (Debian)** | [Auto-Claude-2.7.5-linux-amd64.deb](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.5/Auto-Claude-2.7.5-linux-amd64.deb) |
| **Linux (Flatpak)** | [Auto-Claude-2.7.5-linux-x86_64.flatpak](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.5/Auto-Claude-2.7.5-linux-x86_64.flatpak) |
<!-- STABLE_DOWNLOADS_END -->

### 测试版本

> ⚠️ 测试版本可能包含错误和破坏性更改。[查看所有版本](https://github.com/AndyMik90/Auto-Claude/releases)

<!-- BETA_VERSION_BADGE -->
[![测试版](https://img.shields.io/badge/beta-2.7.2--beta.10-orange?style=flat-square)](https://github.com/AndyMik90/Auto-Claude/releases/tag/v2.7.2-beta.10)
<!-- BETA_VERSION_BADGE_END -->

<!-- BETA_DOWNLOADS -->
| 平台 | 下载 |
|----------|----------|
| **Windows** | [Auto-Claude-2.7.2-beta.10-win32-x64.exe](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.2-beta.10/Auto-Claude-2.7.2-beta.10-win32-x64.exe) |
| **macOS (Apple Silicon)** | [Auto-Claude-2.7.2-beta.10-darwin-arm64.dmg](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.2-beta.10/Auto-Claude-2.7.2-beta.10-darwin-arm64.dmg) |
| **macOS (Intel)** | [Auto-Claude-2.7.2-beta.10-darwin-x64.dmg](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.2-beta.10/Auto-Claude-2.7.2-beta.10-darwin-x64.dmg) |
| **Linux** | [Auto-Claude-2.7.2-beta.10-linux-x86_64.AppImage](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.2-beta.10/Auto-Claude-2.7.2-beta.10-linux-x86_64.AppImage) |
| **Linux (Debian)** | [Auto-Claude-2.7.2-beta.10-linux-amd64.deb](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.2-beta.10/Auto-Claude-2.7.2-beta.10-linux-amd64.deb) |
| **Linux (Flatpak)** | [Auto-Claude-2.7.2-beta.10-linux-x86_64.flatpak](https://github.com/AndyMik90/Auto-Claude/releases/download/v2.7.2-beta.10/Auto-Claude-2.7.2-beta.10-linux-x86_64.flatpak) |
<!-- BETA_DOWNLOADS_END -->

> 所有版本都包含 SHA256 校验和以及 VirusTotal 扫描结果，用于安全验证。

---

## 系统要求

- **Claude Pro/Max 订阅** - [在此获取](https://claude.ai/upgrade)
- **Claude Code CLI** - `npm install -g @anthropic-ai/claude-code`
- **Git 仓库** - 您的项目必须初始化为 git 仓库

---

## 快速开始

1. **下载并安装** 适合您平台的应用程序
2. **打开您的项目** - 选择一个 git 仓库文件夹
3. **连接 Claude** - 应用程序将引导您完成 OAuth 设置
4. **创建任务** - 描述您想要构建的内容
5. **观看它工作** - Agent 自主规划、编码和验证

---

## 功能特性

| 功能 | 描述 |
|---------|-------------|
| **自主任务** | 描述您的目标；Agent 处理规划、实施和验证 |
| **并行执行** | 同时运行多个构建，最多支持 12 个 Agent 终端 |
| **隔离工作空间** | 所有更改都在 git worktrees 中进行 - 您的主分支保持安全 |
| **自我验证 QA** | 内置质量保证循环在您审查之前捕获问题 |
| **AI 驱动的合并** | 集成回主分支时自动解决冲突 |
| **记忆层** | Agent 在会话之间保留见解，实现更智能的构建 |
| **GitHub/GitLab 集成** | 导入问题，使用 AI 调查，创建合并请求 |
| **Linear 集成** | 与 Linear 同步任务以进行团队进度跟踪 |
| **跨平台** | 适用于 Windows、macOS 和 Linux 的原生桌面应用 |
| **自动更新** | 发布新版本时应用程序自动更新 |

---

## 界面

### 看板
从规划到完成的可视化任务管理。创建任务并实时监控 Agent 进度。

### Agent 终端
具有一键任务上下文注入的 AI 驱动终端。生成多个 Agent 进行并行工作。

![Agent 终端](.github/assets/Auto-Claude-Agents-terminals.png)

### 路线图
具有竞争对手分析和受众定位的 AI 辅助功能规划。

![路线图](.github/assets/Auto-Claude-roadmap.png)

### 其他功能
- **洞察** - 用于探索代码库的聊天界面
- **构思** - 发现改进、性能问题和漏洞
- **更新日志** - 从已完成的任务生成发布说明

---

## 项目结构

```
Auto-Claude/
├── apps/
│   ├── backend/     # Python Agent、规范、QA 流水线
│   └── frontend/    # Electron 桌面应用程序
├── guides/          # 附加文档
├── tests/           # 测试套件
└── scripts/         # 构建工具
```

---

## CLI 使用

对于无头操作、CI/CD 集成或仅终端工作流：

```bash
cd apps/backend

# 交互式创建规范
python spec_runner.py --interactive

# 运行自主构建
python run.py --spec 001

# 审查和合并
python run.py --spec 001 --review
python run.py --spec 001 --merge
```

查看 [guides/CLI-USAGE.md](guides/CLI-USAGE.md) 获取完整的 CLI 文档。

---

## 开发

想要从源代码构建或贡献？请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 获取完整的开发设置说明。

对于 Linux 特定的构建（Flatpak、AppImage），请参阅 [guides/linux.md](guides/linux.md)。

---

## 安全性

Auto Claude 使用三层安全模型：

1. **操作系统沙箱** - Bash 命令在隔离环境中运行
2. **文件系统限制** - 操作限制在项目目录内
3. **动态命令白名单** - 仅基于检测到的项目技术栈批准的命令

所有版本都：
- 在发布前使用 VirusTotal 扫描
- 包含用于验证的 SHA256 校验和
- 在适用的情况下进行代码签名（macOS）

---

## 可用脚本

| 命令 | 描述 |
|---------|-------------|
| `npm run install:all` | 安装后端和前端依赖项 |
| `npm start` | 构建并运行桌面应用 |
| `npm run dev` | 以开发模式运行，支持热重载 |
| `npm run package` | 为当前平台打包 |
| `npm run package:mac` | 为 macOS 打包 |
| `npm run package:win` | 为 Windows 打包 |
| `npm run package:linux` | 为 Linux 打包 |
| `npm run package:flatpak` | 打包为 Flatpak（参见 [guides/linux.md](guides/linux.md)） |
| `npm run lint` | 运行代码检查 |
| `npm test` | 运行前端测试 |
| `npm run test:backend` | 运行后端测试 |

---

## 贡献

我们欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解：
- 开发设置说明
- 代码风格指南
- 测试要求
- Pull Request 流程

---

## 社区

- **Discord** - [加入我们的社区](https://discord.gg/KCXaPBr4Dj)
- **Issues** - [报告错误或请求功能](https://github.com/AndyMik90/Auto-Claude/issues)
- **Discussions** - [提问](https://github.com/AndyMik90/Auto-Claude/discussions)

---

## 许可证

**AGPL-3.0** - GNU Affero 通用公共许可证 v3.0

Auto Claude 可免费使用。如果您修改并分发它，或将其作为服务运行，您的代码也必须在 AGPL-3.0 下开源。

商业许可证可用于闭源用例。

---

## Star 历史

[![GitHub Repo stars](https://img.shields.io/github/stars/AndyMik90/Auto-Claude?style=social)](https://github.com/AndyMik90/Auto-Claude/stargazers)

[![Star History Chart](https://api.star-history.com/svg?repos=AndyMik90/Auto-Claude&type=Date)](https://star-history.com/#AndyMik90/Auto-Claude&Date)
