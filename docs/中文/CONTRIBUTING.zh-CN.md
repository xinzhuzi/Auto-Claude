# 为 Auto Claude 做贡献

感谢您对为 Auto Claude 做贡献的兴趣！本文档提供了为项目做贡献的指南和说明。

## 目录

- [贡献者许可协议（CLA）](#贡献者许可协议cla)
- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [开发设置](#开发设置)
  - [Python 后端](#python-后端)
  - [Electron 前端](#electron-前端)
- [从源代码运行](#从源代码运行)
- [预提交钩子](#预提交钩子)
- [代码风格](#代码风格)
- [测试](#测试)
- [持续集成](#持续集成)
- [Git 工作流](#git-工作流)
  - [使用 Fork](#使用-fork)
  - [分支概览](#分支概览)
  - [主要分支](#主要分支)
  - [支持分支](#支持分支)
  - [分支命名](#分支命名)
  - [从哪里创建分支](#从哪里创建分支)
  - [Pull Request 目标](#pull-request-目标)
  - [发布流程](#发布流程维护者)
  - [提交消息](#提交消息)
  - [PR 规范](#pr-规范)
- [Pull Request 流程](#pull-request-流程)
- [问题报告](#问题报告)
- [架构概览](#架构概览)

## 贡献者许可协议（CLA）

所有贡献者必须在接受贡献之前签署我们的贡献者许可协议（CLA）。

### 为什么需要 CLA

Auto Claude 目前采用 AGPL-3.0 许可证。CLA 确保项目在未来引入其他许可选项（如商业/企业许可证）时具有适当的许可灵活性。

您保留对贡献的完全版权所有权。

### 如何签署

1. 打开一个 Pull Request
2. CLA 机器人将自动评论并提供说明
3. 在 PR 上评论：`I have read the CLA Document and I hereby sign the CLA`
4. 完成 - 您只需签署一次，适用于所有未来的贡献

阅读完整的 CLA：[CLA.md](CLA.md)

## 前置要求

在贡献之前，请确保已安装以下内容：

- **Python 3.12+** - 用于后端框架
- **Node.js 24+** - 用于 Electron 前端
- **npm 10+** - 前端包管理器（随 Node.js 一起提供）
- **uv**（推荐）或 **pip** - Python 包管理器
- **CMake** - 构建原生依赖项所需（例如 LadybugDB）
- **Git** - 版本控制

### 安装 Python 3.12

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

### 安装 Node.js 24+

**Windows:**
```bash
winget install OpenJS.NodeJS.LTS
```

**macOS:**
```bash
brew install node@24
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
```

**Linux (Fedora):**
```bash
sudo dnf install nodejs npm
```

### 安装 CMake

**Windows:**
```bash
winget install Kitware.CMake
```

**macOS:**
```bash
brew install cmake
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install cmake
```

**Linux (Fedora):**
```bash
sudo dnf install cmake
```

## 快速开始

最快的入门方式：

```bash
# 克隆仓库
git clone https://github.com/AndyMik90/Auto-Claude.git
cd Auto-Claude

# 安装所有依赖项（跨平台）
npm run install:all

# 以开发模式运行
npm run dev

# 或构建并运行生产版本
npm start
```

## 开发设置

项目由两个主要组件组成：

1. **Python 后端**（`apps/backend/`）- 核心自主编码框架
2. **Electron 前端**（`apps/frontend/`）- 可选的桌面 UI

### Python 后端

推荐的方式是使用 `npm run install:backend`（或从根目录使用 `npm run install:all`），它会自动安装运行时和测试依赖项。您也可以手动设置：

```bash
# 导航到后端目录
cd apps/backend

# 创建虚拟环境
# Windows:
py -3.12 -m venv .venv
.venv\Scripts\activate

# macOS/Linux:
python3.12 -m venv .venv
source .venv/bin/activate

# 安装依赖项
pip install -r requirements.txt

# 安装测试依赖项
pip install -r ../../tests/requirements-test.txt

# 设置环境
cp .env.example .env
# 编辑 .env 并添加您的 CLAUDE_CODE_OAUTH_TOKEN（通过以下命令获取：claude setup-token）
```

### Electron 前端

```bash
# 导航到前端目录
cd apps/frontend

# 安装依赖项
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 打包分发
npm run package
```

## 从源代码运行

如果您想从源代码运行 Auto Claude（用于开发或测试未发布的功能），请按照以下步骤操作：

### 步骤 1：克隆并设置

```bash
git clone https://github.com/AndyMik90/Auto-Claude.git
cd Auto-Claude/apps/backend

# 使用 uv（推荐）
uv venv && uv pip install -r requirements.txt

# 或使用标准 Python
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 设置环境
cd apps/backend
cp .env.example .env
# 编辑 .env 并添加您的 CLAUDE_CODE_OAUTH_TOKEN（通过以下命令获取：claude setup-token）
```

### 步骤 2：运行桌面 UI

```bash
cd ../frontend

# 安装依赖项
npm install

# 开发模式（热重载）
npm run dev

# 或生产构建
npm run build && npm run start
```

<details>
<summary><b>Windows 用户：</b>如果安装失败并出现 node-gyp 错误，请点击此处</summary>

Auto Claude 会自动为 Windows 下载预构建的二进制文件。如果您的 Electron 版本尚未提供预构建文件，您需要 Visual Studio Build Tools：

1. 下载 [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. 选择"使用 C++ 的桌面开发"工作负载
3. 在"单个组件"中，添加"MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs"
4. 重启终端并再次运行 `npm install`

</details>

> **注意：** 对于常规使用，我们建议从 [GitHub Releases](https://github.com/AndyMik90/Auto-Claude/releases) 下载预构建版本。从源代码运行主要用于贡献者和测试未发布功能的人员。

## 预提交钩子

我们使用 [pre-commit](https://pre-commit.com/) 在每次提交之前运行代码检查和格式化检查。这确保了整个项目的代码质量和一致性。

### 设置

```bash
# 安装 pre-commit
pip install pre-commit

# 安装 git 钩子（克隆后运行一次）
pre-commit install
```

### 提交时运行的检查

当您提交时，以下检查会自动运行：

| 检查 | 范围 | 描述 |
|-------|-------|-------------|
| **ruff** | `apps/backend/` | Python 代码检查器，带自动修复 |
| **ruff-format** | `apps/backend/` | Python 代码格式化器 |
| **eslint** | `apps/frontend/` | TypeScript/React 代码检查器 |
| **typecheck** | `apps/frontend/` | TypeScript 类型检查 |
| **trailing-whitespace** | 所有文件 | 删除尾随空格 |
| **end-of-file-fixer** | 所有文件 | 确保文件以换行符结尾 |
| **check-yaml** | 所有文件 | 验证 YAML 语法 |
| **check-added-large-files** | 所有文件 | 防止提交大文件 |

### 手动运行

```bash
# 在所有文件上运行所有检查
pre-commit run --all-files

# 运行特定钩子
pre-commit run ruff --all-files

# 临时跳过钩子（不推荐）
git commit --no-verify -m "message"
```

### 如果检查失败

1. **Ruff 自动修复**：某些问题会自动修复。暂存更改并再次提交。
2. **ESLint 错误**：修复代码中报告的问题。
3. **类型错误**：在提交之前解决 TypeScript 类型问题。

## 代码风格

### Python

- 遵循 PEP 8 风格指南
- 为函数签名使用类型提示
- 为公共函数和类使用文档字符串
- 尽可能保持函数专注且少于 50 行
- 使用有意义的变量和函数名称

```python
# 好的示例
def get_next_chunk(spec_dir: Path) -> dict | None:
    """
    在实施计划中查找下一个待处理的块。

    Args:
        spec_dir: 规范目录的路径

    Returns:
        下一个块字典，如果所有块都已完成则返回 None
    """
    ...

# 避免
def gnc(sd):
    ...
```

### TypeScript/React

- 使用 TypeScript 严格模式
- 遵循 `apps/frontend/src/` 中现有的组件模式
- 使用带钩子的函数组件
- 优先使用命名导出而不是默认导出
- 使用 `src/renderer/components/ui/` 中的 UI 组件

```typescript
// 好的示例
export function TaskCard({ task, onEdit }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  ...
}

// 避免
export default function(props) {
  ...
}
```

### 通用规则

- 无尾随空格
- TypeScript/JSON 使用 2 个空格缩进，Python 使用 4 个空格
- 文件以换行符结尾
- 实际情况下保持行长度在 100 个字符以内

### 文件编码（Python）

**始终为文本文件操作指定 `encoding="utf-8"`** 以确保 Windows 兼容性。

Windows Python 默认使用 `cp1252` 编码而不是 UTF-8，这会导致以下内容出错：
- 表情符号（🚀、✅、❌）
- 国际字符（ñ、é、中文、العربية）
- 特殊符号（™、©、®）

**正确做法：**

```python
# 读取文件
with open(path, encoding="utf-8") as f:
    content = f.read()

# 写入文件
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

# Path 方法
from pathlib import Path
content = Path(file).read_text(encoding="utf-8")
Path(file).write_text(content, encoding="utf-8")

# JSON 文件 - 读取
import json
with open(path, encoding="utf-8") as f:
    data = json.load(f)

# JSON 文件 - 写入
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```

**错误做法：**

```python
# 错误 - 平台相关的编码
with open(path) as f:
    content = f.read()

# 错误 - Path 方法没有编码
content = Path(file).read_text()

# 错误 - 在 json.dump 上使用编码（不是 open！）
json.dump(data, f, encoding="utf-8")  # 错误
```

**二进制文件 - 无编码：**

```python
with open(path, "rb") as f:  # 正确
    data = f.read()
```

我们的预提交钩子会自动检查缺失的编码参数。查看 [PR #782](https://github.com/AndyMik90/Auto-Claude/pull/782) 了解全面的编码修复，以及 [guides/windows-development.md](guides/windows-development.md) 了解 Windows 特定的开发指南。
