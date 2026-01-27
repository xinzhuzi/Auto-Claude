# Auto Claude CLI 使用指南

本文档介绍 Auto Claude 的纯终端使用方式。**对于大多数用户，我们建议使用[桌面 UI](#)** - 它提供更好的体验，包括可视化任务管理、进度跟踪和自动 Python 环境设置。

## 何时使用 CLI

- 您偏好终端工作流
- 您在无头服务器上运行
- 您正在将 Auto Claude 集成到脚本或 CI/CD 中

## 前置要求

- Python 3.9+
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)

### 安装 Python

**Windows:**
```bash
winget install Python.Python.3.12
```

**macOS:**
```bash
brew install python@3.12
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install python3.12 python3.12-venv
```

**Linux (Fedora):**
```bash
sudo dnf install python3.12
```

## 设置

**步骤 1：** 导航到后端目录

```bash
cd apps/backend
```

**步骤 2：** 设置 Python 环境

```bash
# 使用 uv（推荐）
uv venv && uv pip install -r requirements.txt

# 或使用标准 Python
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

**步骤 3：** 配置环境

```bash
cp .env.example .env

# 获取您的 OAuth 令牌
claude setup-token

# 将令牌添加到 apps/backend/.env
# CLAUDE_CODE_OAUTH_TOKEN=your-token-here
```

## 创建规范

以下所有命令都应从 `apps/backend/` 目录运行：

```bash
# 激活虚拟环境（如果尚未激活）
source .venv/bin/activate

# 交互式创建规范
python runners/spec_runner.py --interactive

# 或使用任务描述
python runners/spec_runner.py --task "使用 OAuth 添加用户身份验证"

# 强制指定复杂度级别
python runners/spec_runner.py --task "修复按钮颜色" --complexity simple

# 继续中断的规范
python runners/spec_runner.py --continue 001-feature
```

### 复杂度层级

规范运行器会自动评估任务复杂度：

| 层级 | 阶段 | 使用场景 |
|------|--------|-----------|
| **SIMPLE（简单）** | 3 | 1-2 个文件，单个服务，无集成（UI 修复、文本更改） |
| **STANDARD（标准）** | 6 | 3-10 个文件，1-2 个服务，最小集成（功能、错误修复） |
| **COMPLEX（复杂）** | 8 | 10+ 个文件，多个服务，外部集成 |

## 运行构建

```bash
# 列出所有规范及其状态
python run.py --list

# 运行特定规范
python run.py --spec 001
python run.py --spec 001-feature-name

# 限制迭代次数以进行测试
python run.py --spec 001 --max-iterations 5
```

## QA 验证

所有块完成后，QA 验证会自动运行：

```bash
# 跳过自动 QA
python run.py --spec 001 --skip-qa

# 手动运行 QA 验证
python run.py --spec 001 --qa

# 检查 QA 状态
python run.py --spec 001 --qa-status
```

QA 验证循环：
1. **QA 审查员** 检查所有验收标准
2. 如果发现问题 → 创建 `QA_FIX_REQUEST.md`
3. **QA 修复员** 应用修复
4. 循环重复直到批准（最多 50 次迭代）

## 工作空间管理

Auto Claude 使用 Git worktrees 进行隔离构建：

```bash
# 在隔离工作空间中测试功能
cd .worktrees/auto-claude/
npm run dev  # 或您项目的运行命令

# 返回后端目录以运行管理命令
cd apps/backend

# 查看更改内容
python run.py --spec 001 --review

# 将更改合并到您的项目中
python run.py --spec 001 --merge

# 如果不喜欢则丢弃
python run.py --spec 001 --discard
```

## 交互式控制

当 Agent 运行时：

```bash
# 暂停并添加指令
Ctrl+C（一次）

# 立即退出
Ctrl+C（两次）
```

**基于文件的替代方案：**
```bash
# 创建 PAUSE 文件以在当前会话后暂停
touch specs/001-name/PAUSE

# 添加指令
echo "首先专注于修复登录错误" > specs/001-name/HUMAN_INPUT.md
```

## 规范验证

```bash
python validate_spec.py --spec-dir specs/001-feature --checkpoint all
```

## 环境变量

将 `.env.example` 复制到 `.env` 并根据需要配置：

```bash
cp .env.example .env
```

### 核心设置

| 变量 | 必需 | 描述 |
|----------|----------|-------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | 是 | 来自 `claude setup-token` 的 OAuth 令牌 |
| `AUTO_BUILD_MODEL` | 否 | 模型覆盖（默认：claude-opus-4-5-20251101） |
| `DEFAULT_BRANCH` | 否 | worktrees 的基础分支（自动检测 main/master） |
| `DEBUG` | 否 | 启用调试日志（默认：false） |

### 集成

| 变量 | 必需 | 描述 |
|----------|----------|-------------|
| `LINEAR_API_KEY` | 否 | 用于任务同步的 Linear API 密钥 |
| `GITLAB_TOKEN` | 否 | GitLab 个人访问令牌 |
| `GITLAB_INSTANCE_URL` | 否 | GitLab 实例 URL（默认为 gitlab.com） |

### 记忆层（Graphiti）

| 变量 | 必需 | 描述 |
|----------|----------|-------------|
| `GRAPHITI_ENABLED` | 否 | 启用记忆层（默认：true） |
| `GRAPHITI_LLM_PROVIDER` | 否 | LLM 提供商：openai、anthropic、ollama、google、openrouter |
| `GRAPHITI_EMBEDDER_PROVIDER` | 否 | 嵌入器：openai、voyage、ollama、google、openrouter |

查看 `.env.example` 获取完整的配置选项，包括特定提供商的设置。
