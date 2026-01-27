# Auto-Claude Hook 系统 - 完整文档

> **版本**: 1.0
> **更新日期**: 2025-01-27
> **目的**: 记录所有 Hook 系统的功能、实现和安全防护

---

## 目录

1. [概述](#概述)
2. [Git Hooks](#1-git-hooks)
3. [后端 Security Hooks](#2-后端-security-hooks)
4. [前端 React Hooks](#3-前端-react-hooks)
5. [安全防护体系](#安全防护体系)

---

## 概述

Auto-Claude 项目中存在三类 Hook 系统：

| 类型 | 位置 | 用途 |
|------|------|------|
| **Git Hooks** | `hooks/` | Git 操作安全防护 |
| **Security Hooks** | `apps/backend/security/hooks.py` | 后端命令执行前验证 |
| **React Hooks** | `apps/frontend/src/renderer/hooks/` | 前端状态管理和 IPC 通信 |

---

## 1. Git Hooks

### 1.1 文件结构

```
hooks/
├── README.md              # 英文说明文档
├── pre-commit.template    # Pre-commit hook 模板
└── pre-commit             # 当前安装的 hook
```

### 1.2 Pre-commit Hook 功能

**文件**: `hooks/pre-commit`

这是 **防止大规模文件删除** 的最后一道防线，用于拦截因 Git 索引损坏或错误的 `git add` 命令导致的灾难性数据丢失。

#### 检测逻辑

| 检查项 | 条件 | 阈值 |
|--------|------|------|
| 文件总数 | `git ls-files \| wc -l` | > 100 |
| 删除比例 | `deleted / total * 100` | > 50% |

#### 阻止的场景

```bash
# 场景1: 从子目录执行 git add .
cd apps/frontend
git add .          # ❌ 被 hook 阻止

# 场景2: Git 索引损坏
rm .git/index      # ❌ 后续 commit 被 hook 阻止

# 场景3: 错误的 worktree 操作
git worktree prune  # 如果导致大量删除
```

#### 输出示例

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️  COMMIT BLOCKED: Mass Deletion Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deletion Statistics:
  Files to be deleted: 223907
  Total tracked files: 223910
  Deletion percentage: 99%

This may indicate git index corruption!

Recommended Actions:

  1. Check git status:
     git status

  2. Check index health:
     git fsck

  3. If index is corrupted, rebuild it safely:
     git read-tree HEAD

  4. DO NOT use: rm -f .git/index (This causes data loss!)

If this deletion is intentional:
  Commit manually with --no-verify flag:
  git commit -m 'your message' --no-verify
```

#### 额外检查：Git Index Lock

Hook 还会检测 `.git/index.lock` 文件的存在，防止过期的锁文件导致操作失败。

#### 安装方式

```bash
# 从模板安装
cp hooks/pre-commit.template .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

#### 绕过方式

如果确实需要删除大量文件：

```bash
git commit --no-verify -m "your message"
```

### 1.3 历史背景

这个 Hook 是在 **2025-01-13 事故** 后创建的，当时命令 `rm .git/index && git reset --hard` 导致 **223,907 个文件**被意外删除。

---

## 2. 后端 Security Hooks

### 2.1 文件位置

**文件**: `apps/backend/security/hooks.py`

### 2.2 核心功能

后端 Security Hooks 是 **命令执行前的验证层**，在 AI 代理执行任何 Bash 命令之前进行安全检查。

### 2.3 可用的 Hooks

#### 2.3.1 `bash_security_hook` - Bash 命令安全验证

**功能**: 验证所有 Bash 命令是否允许执行

**检查流程**:
1. 验证 `tool_input` 结构（必须是 dict 且有 'command' 键）
2. 提取命令中的所有命令名
3. 检查每个命令是否在项目的安全配置文件允许列表中
4. 对敏感命令运行额外验证器

**返回**:
- `{}` - 允许执行
- `{"decision": "block", "reason": "..."}` - 阻止执行

**保护的命令类型**:
- Git 危险操作（`rm .git/index`, `rm -rf .git/`）
- 文件删除操作
- 系统配置修改

#### 2.3.2 `todowrite_fix_hook` - TodoWrite 参数修复

**功能**: 自动修复 TodoWrite 工具的缺失参数

**问题**: Claude Code CLI 要求每个 todo 必须有 `activeForm` 参数，但 AI 经常遗漏。

**修复**: 自动将 `content` 字段的值复制到 `activeForm`。

```python
# 修复前
{"content": "Run tests"}

# 修复后
{"content": "Run tests", "activeForm": "Run tests"}
```

#### 2.3.3 `write_empty_param_hook` - Write 工具空参数检测

**功能**: 检测 Write 工具的空参数（通常是 token 截断导致）

**检测条件**:
- `file_path` 为空
- `content` 为空
- 两者都为空

**错误提示**:
```
🚨 EMPTY WRITE PARAMETERS DETECTED

The Write tool was called with empty file_path and content.
This usually happens when Claude's output is truncated due to token limits.

WHAT TO DO:
1. The subtask may be too large - consider splitting it
2. Retry with a smaller scope
3. Use auto_split_subtask() to break down the task
```

### 2.4 验证器系统

**文件**: `apps/backend/security/git_validators.py`

#### 危险 Git 操作检测

```python
DANGEROUS_GIT_PATTERNS = [
    # rm .git/index (但排除 .lock 和 .backup)
    r"\brm\s+(?:-[rf]+\s+)?\.git/index(?!\.(lock|backup))\b",

    # rm -rf .git/
    r"\brm\s+-[rf]+\s+\.git/?(?:\s|$|;|&&|\|)",

    # rm .git/index && git reset (2025-01-13 事故命令)
    r"\brm\s+.*\.git/index.*(?:&&|\|\||;).*\bgit\s+reset\b",

    # git rm --cached -r . (移除所有文件的跟踪)
    r"\bgit\s+rm\s+--cached\s+-r\s+\.",
]
```

#### Git 身份配置保护

**阻止的配置键**:
- `user.name`
- `user.email`
- `author.name`
- `author.email`
- `committer.name`
- `committer.email`

**原因**: 防止 AI 创建虚假的 "Test User" 身份，破坏提交历史完整性。

**阻止的命令**:
```bash
git config user.name "Test User"      # ❌ 被阻止
git config user.email "test@test.com" # ❌ 被阻止
git -c user.name="Test" commit        # ❌ 被阻止
```

#### 密钥扫描

在 `git commit` 前自动扫描暂存文件中的敏感信息：

**检测类型**:
- API Keys (AWS, OpenAI, Stripe, etc.)
- 私钥 (RSA, SSH, etc.)
- 密码和令牌
- 数据库连接字符串
- OAuth secrets

**发现密钥时的处理**:
1. 阻止 commit
2. 显示检测到的密钥位置
3. 提供修复建议（使用环境变量）
4. 说明如何处理误报

---

## 3. 前端 React Hooks

### 3.1 文件结构

```
apps/frontend/src/renderer/hooks/
├── index.ts                           # 导出入口
├── useIpc.ts                          # IPC 事件监听
├── useVirtualizedTree.ts              # 虚拟化树
├── useResolvedAgentSettings.ts        # 代理设置解析
├── useTerminalProfileChange.ts        # 终端配置变更
├── useGlobalTerminalListeners.ts      # 全局终端监听
├── use-profile-swap-notifications.ts  # 配置文件交换通知
├── useClaudeLoginTerminal.ts          # Claude 登录终端
└── __tests__/                         # 测试文件
```

### 3.2 `useIpcListeners` - IPC 事件批量处理

**文件**: `apps/frontend/src/renderer/hooks/useIpc.ts`

**功能**: 管理 IPC 事件监听器，批量更新以优化性能

#### 核心特性

1. **批量更新队列**
   - 16ms 窗口内收集更新
   - 使用 `unstable_batchedUpdates` 一次性应用
   - 防止频繁的状态更新导致重渲染

2. **阶段变更绕过批处理** (ACS-55)
   - 阶段变更立即应用，确保 UI 准确反映每个阶段状态
   - 防止跳过中间阶段显示

3. **多项目隔离** (Issue #723)
   - 过滤非当前项目的事件
   - 防止项目间干扰

4. **监听的事件类型**
   - `onTaskProgress` - 任务进度更新
   - `onTaskError` - 任务错误
   - `onTaskLog` - 任务日志
   - `onTaskStatusChange` - 任务状态变更
   - `onTaskExecutionProgress` - 执行进度
   - `onRoadmapProgress` - 路线图进度
   - `onRoadmapComplete` - 路线图完成
   - `onRoadmapError` - 路线图错误
   - `onTerminalRateLimit` - 终端速率限制
   - `onSDKRateLimit` - SDK 速率限制
   - `onAuthFailure` - 认证失败

### 3.3 `useVirtualizedTree` - 虚拟化树

**功能**: 处理大型文件树的虚拟化渲染，提高性能

### 3.4 `useResolvedAgentSettings` - 代理设置解析

**功能**: 解析和合并来自不同来源的代理设置

### 3.5 `useTerminalProfileChange` - 终端配置变更

**功能**: 监听终端配置文件的变更

### 3.6 `useGlobalTerminalListeners` - 全局终端监听

**功能**: 全局范围的终端事件监听

---

## 安全防护体系

Auto-Claude 实现了 **四层防御系统** 来防止 Git 灾难：

```
┌─────────────────────────────────────────────────────────────────┐
│                        四层防御系统                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Prompt Education                                      │
│  ├── 每个 subtask prompt 包含 Git 安全规则                       │
│  └── 教育 AI 代理什么是危险的命令                                │
│                                                                 │
│  Layer 2: Code Validation                                       │
│  ├── 正则表达式检测危险命令                                      │
│  ├── bash_validators.py                                         │
│  └── 执行前拦截                                                  │
│                                                                 │
│  Layer 3: Runtime Hooks                                         │
│  ├── bash_security_hook                                         │
│  ├── write_empty_param_hook                                     │
│  └── todowrite_fix_hook                                         │
│                                                                 │
│  Layer 4: Pre-commit Hook                                       │
│  ├── hooks/pre-commit                                           │
│  └── 检测大规模删除 (>50%)                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 各层保护的命令

| 危险命令 | Layer 1 | Layer 2 | Layer 3 | Layer 4 |
|---------|---------|---------|---------|---------|
| `rm .git/index` | ✅ | ✅ | ✅ | ✅ |
| `rm -rf .git/` | ✅ | ✅ | ✅ | ✅ |
| `git config user.name` | ✅ | ✅ | ✅ | - |
| `git commit` (有密钥) | ✅ | ✅ | ✅ | - |
| 大规模删除 | - | - | - | ✅ |

---

## 已实现的安全功能

### 1. Git 索引保护

**禁止的命令**:
```bash
rm .git/index           # ❌ 禁止
rm -f .git/index        # ❌ 禁止
rm .git/index && git reset  # ❌ 禁止
```

**安全的替代**:
```bash
rm -f .git/index.lock   # ✅ 安全（仅删除锁文件）
git read-tree HEAD      # ✅ 安全（从 HEAD 重建索引）
git status              # ✅ 安全（检查状态）
```

### 2. Git 身份保护

**阻止设置身份配置**，确保提交归属正确。

### 3. 密钥扫描

在 `git commit` 前扫描暂存文件，防止密钥泄露。

### 4. 空参数检测

检测 Write 工具的空参数，防止 token 截断导致的问题。

### 5. 批量更新优化

防止频繁状态更新导致 UI 卡顿。

---

## 关键文件清单

### Git Hooks
| 文件 | 说明 |
|------|------|
| `hooks/pre-commit.template` | Pre-commit hook 模板 |
| `hooks/pre-commit` | 当前安装的 hook |
| `hooks/README.md` | 英文文档 |

### 后端安全系统
| 文件 | 说明 |
|------|------|
| `apps/backend/security/hooks.py` | 主要 Hook 实现 |
| `apps/backend/security/bash_validators.py` | Bash 验证入口 |
| `apps/backend/security/git_validators.py` | Git 命令验证器 |
| `apps/backend/prompts/knowledge/git/git-safety-rules.md` | Git 安全规则文档 |

### 前端 Hooks
| 文件 | 说明 |
|------|------|
| `apps/frontend/src/renderer/hooks/useIpc.ts` | IPC 事件批量处理 |
| `apps/frontend/src/renderer/hooks/useVirtualizedTree.ts` | 虚拟化树 |
| `apps/frontend/src/renderer/hooks/useResolvedAgentSettings.ts` | 代理设置解析 |
| `apps/frontend/src/renderer/hooks/useTerminalProfileChange.ts` | 终端配置变更 |

---

## 开发指南

### 添加新的 Security Hook

1. 在 `apps/backend/security/hooks.py` 中定义函数：

```python
async def my_custom_hook(
    input_data: dict[str, Any],
    tool_use_id: str | None = None,
    context: Any | None = None,
) -> dict[str, Any]:
    # 检查逻辑
    if should_block:
        return {"decision": "block", "reason": "原因"}
    return {}  # 允许
```

2. 在系统中注册 Hook

### 添加新的 Git 验证规则

1. 在 `apps/backend/security/git_validators.py` 中添加正则模式
2. 更新 `DANGEROUS_GIT_PATTERNS` 列表
3. 在 `git-safety-rules.md` 中记录

---

## 维护建议

1. **定期审查**: 每季度审查 Hook 规则是否仍然适用
2. **测试绕过**: 确保 `--no-verify` 功能正常工作
3. **文档更新**: 新增 Hook 时同步更新文档
4. **日志记录**: 考虑添加 Hook 触发日志，便于调试

---

**文档维护**: 如 Hook 系统有变更，请及时更新本文档。
