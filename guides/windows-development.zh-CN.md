# Windows 开发指南

本指南涵盖在 Windows 上开发 Auto Claude 时的特定注意事项。

## 文件编码

### 问题

Windows Python 默认使用 `cp1252` (Windows-1252) 代码页而非 UTF-8。这会导致读取/写入包含非 ASCII 字符的文件时出现编码错误。

**常见错误：**

```plaintext
UnicodeDecodeError: 'charmap' codec can't decode byte 0x8d in position 1234
```

### 解决方案

**始终为所有文本文件操作指定 `encoding="utf-8"`。**

详细示例和模式请参阅 [CONTRIBUTING.md - File Encoding](../CONTRIBUTING.md#file-encoding-python)。

### Windows 测试

要验证代码在 Windows 上运行：

1. **使用非 ASCII 内容测试：**

   ```python
   # 在测试数据中包含 emoji、国际字符
   test_data = {"message": "Test 🚀 with ñoño and 中文"}
   ```

2. **运行 pre-commit hooks：**

   ```bash
   pre-commit run check-file-encoding --all-files
   ```

3. **运行所有测试：**

   ```bash
   npm run test:backend
   ```

### 常见陷阱

#### 陷阱 1：JSON 文件

```python
# 错误 - 未指定编码
with open("config.json") as f:
    data = json.load(f)

# 正确
with open("config.json", encoding="utf-8") as f:
    data = json.load(f)
```

#### 陷阱 2：路径方法

```python
# 错误
content = Path("README.md").read_text()

# 正确
content = Path("README.md").read_text(encoding="utf-8")
```

#### 陷阱 3：子进程输出

```python
# 错误
result = subprocess.run(cmd, capture_output=True, text=True)

# 正确
result = subprocess.run(cmd, capture_output=True, encoding="utf-8")
```

## 换行符

### 问题

Windows 使用 CRLF (`\r\n`) 换行符，而 macOS/Linux 使用 LF (`\n`)。
这可能导致 git diff 显示每一行都已更改。

### 解决方案

1. **配置 git 处理换行符：**

   ```bash
   git config --global core.autocrlf true
   ```

2. **项目的 `.gitattributes` 自动处理此问题：**

   ```plaintext
   * text=auto
   *.py text eol=lf
   *.md text eol=lf
   ```

3. **在代码中处理时标准化：**

   ```python
   # 将换行符标准化为 LF（惯用方式）
   content = "\n".join(content.splitlines())
   ```

## 路径分隔符

### 问题

Windows 使用反斜杠 `\` 作为路径分隔符，而 Unix 使用 `/`。
这可能导致路径操作出现问题。

### 解决方案

1. **始终使用 `pathlib` 中的 `Path`：**

   ```python
   from pathlib import Path

   # 正确 - 在所有平台上工作
   config_path = Path("config") / "settings.json"

   # 错误 - 仅限 Unix
   config_path = "config/settings.json"
   ```

2. **使用 `os.path.join()` 处理字符串：**

   ```python
   import os

   # 正确
   config_path = os.path.join("config", "settings.json")
   ```

3. **永远不要硬编码分隔符：**

   ```python
   # 错误 - 仅限 Unix
   path = "apps/backend/core"

   # 正确
   path = os.path.join("apps", "backend", "core")
   # 或更好
   path = Path("apps") / "backend" / "core"
   ```

## Shell 命令

### 问题

Windows 默认没有 bash。Shell 命令需要跨平台工作。

### 解决方案

1. **使用 Python 库替代 shell 命令：**

   ```python
   # 替代 shell 命令
   import shutil
   shutil.copy("source.txt", "dest.txt")  # 替代 cp

   import os
   os.remove("file.txt")  # 替代 rm
   ```

2. **使用 `shlex` 处理跨平台命令：**

   ```python
   import shlex
   import subprocess

   cmd = shlex.split("git rev-parse HEAD")
   result = subprocess.run(cmd, capture_output=True, encoding="utf-8")
   ```

3. **需要时检查平台：**

   ```python
   import sys

   if sys.platform == "win32":
       # Windows 特定代码
       pass
   else:
       # Unix 代码
       pass
   ```

## 开发环境

### Windows 推荐设置

1. **使用 WSL2 (Windows 子系统 for Linux)** - 推荐：
   - 与生产 Linux 环境最一致
   - 完整的 bash 支持
   - 更好的文件 I/O 性能
   - 从 Microsoft Store 安装或：`wsl --install`

2. **或使用 Git Bash：**
   - 随 Git for Windows 一起提供
   - 提供类似 Unix 的 shell
   - 比 WSL 更轻量
   - 从 [gitforwindows.org](https://gitforwindows.org/) 下载

3. **或使用 PowerShell 配合 Python：**
   - 原生 Windows 环境
   - 需要额外注意路径/编码
   - Windows 内置

### 编辑器配置

**VS Code Windows 设置 (`settings.json`)：**

```json
{
  "files.encoding": "utf8",
  "files.eol": "\n",
  "python.analysis.typeCheckingMode": "basic",
  "editor.formatOnSave": true
}
```

## 常见问题和解决方案

### 问题：删除文件时的权限错误

**问题：** Windows 文件锁定比 Unix 更严格。

**解决方案：** 使用上下文管理器确保文件正确关闭：

```python
# 使用上下文管理器
with open(path, encoding="utf-8") as f:
    data = f.read()
# 文件在此处关闭 - 可以安全删除
```

### 问题：长路径名

**问题：** Windows 有 260 字符路径限制（遗留限制）。

**解决方案：**

1. 在 Windows 10+ 中启用长路径（组策略或注册表）
2. 或保持路径简短
3. 或使用 WSL2

### 问题：大小写不敏感文件系统

**问题：** Windows 文件系统不区分大小写（`File.txt` == `file.txt`）。

**解决方案：** 保持文件名和导入时的大小写一致：

```python
# 大小写一致
from apps.backend.core import Client  # 文件：client.py

# 避免混合大小写
from apps.backend.core import client  # 在 Windows 上可能工作但在 Linux 上失败
```

## Windows 兼容性测试

### 提交 PR 前

1. **运行 pre-commit hooks：**

   ```bash
   pre-commit run --all-files
   ```

2. **运行所有测试：**

   ```bash
   npm run test:backend
   npm test  # 前端测试
   ```

3. **使用特殊字符测试：**

   ```python
   # 添加包含 emoji、国际字符的测试数据
   test_content = "Test 🚀 ñoño 中文 العربية"
   ```

### Windows 特定测试用例

在相关时添加 Windows 兼容性测试：

```python
import sys
import pytest

@pytest.mark.skipif(sys.platform != "win32", reason="仅 Windows")
def test_windows_encoding():
    """测试包含特殊字符的 Windows 编码。"""
    content = "Test 🚀 ñoño 中文"
    Path("test.txt").write_text(content, encoding="utf-8")
    loaded = Path("test.txt").read_text(encoding="utf-8")
    assert loaded == content
```

## 获取帮助

如果遇到 Windows 特定问题：

1. 查看本指南和 [CONTRIBUTING.md](../CONTRIBUTING.md)
2. 搜索 [现有 issues](https://github.com/AndyMik90/Auto-Claude/issues)
3. 在 [discussions](https://github.com/AndyMik90/Auto-Claude/discussions) 中提问
4. 创建带有 `[Windows]` 标签的 issue

## 资源

- [Python on Windows](https://docs.python.org/3/using/windows.html)
- [pathlib 文档](https://docs.python.org/3/library/pathlib.html)
- [Git for Windows](https://gitforwindows.org/)
- [WSL2 文档](https://docs.microsoft.com/en-us/windows/wsl/)

## 相关

- [CONTRIBUTING.md](../CONTRIBUTING.md) - 通用贡献指南
- [PR #782](https://github.com/AndyMik90/Auto-Claude/pull/782) - 全面的 UTF-8 编码修复
- [PR #795](https://github.com/AndyMik90/Auto-Claude/pull/795) - 编码强制执行的 pre-commit hooks
