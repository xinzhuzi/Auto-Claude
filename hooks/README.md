# Git Hooks for Auto-Claude

> **Version**: 1.0
> **Updated**: 2025-01-27
> **Purpose**: Document all hook systems, their functions, and security protections

---

## Table of Contents

1. [Overview](#overview)
2. [Git Hooks](#git-hooks)
3. [Backend Security Hooks](#backend-security-hooks)
4. [Frontend React Hooks](#frontend-react-hooks)
5. [Security Protection System](#security-protection-system)

---

## Overview

Auto-Claude uses three types of hook systems:

| Type | Location | Purpose |
|------|----------|---------|
| **Git Hooks** | `hooks/` | Git operation safety |
| **Security Hooks** | `apps/backend/security/hooks.py` | Pre-execution command validation |
| **React Hooks** | `apps/frontend/src/renderer/hooks/` | Frontend state management & IPC |

---

## Git Hooks

### File Structure

```
hooks/
├── README.md              # This file (English documentation)
├── pre-commit.template    # Pre-commit hook template
└── pre-commit             # Currently installed hook
```

### Pre-commit Hook: Mass Deletion Protection

**File**: `hooks/pre-commit`

This hook serves as the **last line of defense** against catastrophic file deletions caused by:
- Git index corruption
- Incorrect `git add` commands (e.g., running from a subdirectory)
- Malicious or erroneous worktree operations

#### Detection Logic

| Check | Condition | Threshold |
|-------|-----------|-----------|
| Total files | `git ls-files \| wc -l` | > 100 |
| Deletion ratio | `deleted / total * 100` | > 50% |

#### Blocked Scenarios

```bash
# Scenario 1: git add . from a subdirectory
cd apps/frontend
git add .          # ❌ BLOCKED by hook

# Scenario 2: Git index corruption
rm .git/index      # ❌ Subsequent commit BLOCKED by hook

# Scenario 3: Incorrect worktree operations
git worktree prune  # If it causes mass deletions
```

#### Output Example

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

#### Additional Check: Git Index Lock

The hook also checks for the existence of `.git/index.lock` to prevent stale lock files from causing operation failures.

#### Installation

```bash
# Install from template
cp hooks/pre-commit.template .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

#### Bypassing the Hook

If you genuinely need to delete many files:

```bash
git commit --no-verify -m "your message"
```

### Historical Background

This hook was created after the **2025-01-13 incident**, where the command `rm .git/index && git reset --hard` accidentally caused **223,907 files** to be deleted.

---

## Backend Security Hooks

### File Location

**File**: `apps/backend/security/hooks.py`

### Core Functionality

Backend Security Hooks serve as a **pre-execution validation layer**, checking all commands before the AI agent executes them.

### Available Hooks

#### `bash_security_hook` - Bash Command Security Validation

**Purpose**: Validates all bash commands before execution

**Validation Flow**:
1. Validate `tool_input` structure (must be dict with 'command' key)
2. Extract all command names from the command string
3. Check each command against the project's security profile allowlist
4. Run additional validators for sensitive commands

**Returns**:
- `{}` - Allow execution
- `{"decision": "block", "reason": "..."}` - Block execution

**Protected Command Types**:
- Dangerous Git operations (`rm .git/index`, `rm -rf .git/`)
- File deletion operations
- System configuration modifications

#### `todowrite_fix_hook` - TodoWrite Parameter Fix

**Purpose**: Automatically fixes missing TodoWrite tool parameters

**Issue**: Claude Code CLI requires an `activeForm` parameter for each todo item, but AI often omits it.

**Fix**: Automatically copies the `content` field value to `activeForm`.

```python
# Before fix
{"content": "Run tests"}

# After fix
{"content": "Run tests", "activeForm": "Run tests"}
```

#### `write_empty_param_hook` - Write Tool Empty Parameter Detection

**Purpose**: Detects empty Write tool parameters (usually caused by token truncation)

**Detection Conditions**:
- `file_path` is empty
- `content` is empty
- Both are empty

**Error Message**:
```
🚨 EMPTY WRITE PARAMETERS DETECTED

The Write tool was called with empty file_path and content.
This usually happens when Claude's output is truncated due to token limits.

WHAT TO DO:
1. The subtask may be too large - consider splitting it
2. Retry with a smaller scope
3. Use auto_split_subtask() to break down the task
```

### Validator System

**File**: `apps/backend/security/git_validators.py`

#### Dangerous Git Operation Detection

```python
DANGEROUS_GIT_PATTERNS = [
    # rm .git/index (but exclude .lock and .backup)
    r"\brm\s+(?:-[rf]+\s+)?\.git/index(?!\.(lock|backup))\b",

    # rm -rf .git/
    r"\brm\s+-[rf]+\s+\.git/?(?:\s|$|;|&&|\|)",

    # rm .git/index && git reset (2025-01-13 incident command)
    r"\brm\s+.*\.git/index.*(?:&&|\|\||;).*\bgit\s+reset\b",

    # git rm --cached -r . (removes all files from tracking)
    r"\bgit\s+rm\s+--cached\s+-r\s+\.",
]
```

#### Git Identity Configuration Protection

**Blocked Config Keys**:
- `user.name`
- `user.email`
- `author.name`
- `author.email`
- `committer.name`
- `committer.email`

**Reason**: Prevents AI from creating fake "Test User" identities that break commit attribution.

**Blocked Commands**:
```bash
git config user.name "Test User"      # ❌ BLOCKED
git config user.email "test@test.com" # ❌ BLOCKED
git -c user.name="Test" commit        # ❌ BLOCKED
```

#### Secret Scanning

Automatically scans staged files for sensitive information before `git commit`:

**Detected Types**:
- API Keys (AWS, OpenAI, Stripe, etc.)
- Private keys (RSA, SSH, etc.)
- Passwords and tokens
- Database connection strings
- OAuth secrets

**Action When Secrets Found**:
1. Block the commit
2. Show locations of detected secrets
3. Provide fix suggestions (use environment variables)
4. Explain how to handle false positives

---

## Frontend React Hooks

### File Structure

```
apps/frontend/src/renderer/hooks/
├── index.ts                           # Export entry point
├── useIpc.ts                          # IPC event listeners
├── useVirtualizedTree.ts              # Virtualized tree component
├── useResolvedAgentSettings.ts        # Agent settings resolution
├── useTerminalProfileChange.ts        # Terminal profile changes
├── useGlobalTerminalListeners.ts      # Global terminal listeners
├── use-profile-swap-notifications.ts  # Profile swap notifications
├── useClaudeLoginTerminal.ts          # Claude login terminal
└── __tests__/                         # Test files
```

### `useIpcListeners` - IPC Event Batching

**File**: `apps/frontend/src/renderer/hooks/useIpc.ts`

**Purpose**: Manage IPC event listeners with batched updates for performance optimization

#### Core Features

1. **Batch Update Queue**
   - Collects updates within a 16ms window
   - Applies all updates together using `unstable_batched_updates`
   - Prevents excessive re-renders from frequent state updates

2. **Phase Change Bypass (ACS-55)**
   - Phase changes are applied immediately
   - Ensures UI accurately reflects each phase state
   - Prevents skipping intermediate phase displays

3. **Multi-Project Isolation (Issue #723)**
   - Filters events from non-current projects
   - Prevents cross-project interference

4. **Monitored Event Types**
   - `onTaskProgress` - Task progress updates
   - `onTaskError` - Task errors
   - `onTaskLog` - Task logs
   - `onTaskStatusChange` - Task status changes
   - `onTaskExecutionProgress` - Execution progress
   - `onRoadmapProgress` - Roadmap progress
   - `onRoadmapComplete` - Roadmap completion
   - `onRoadmapError` - Roadmap errors
   - `onTerminalRateLimit` - Terminal rate limits
   - `onSDKRateLimit` - SDK rate limits
   - `onAuthFailure` - Authentication failures

### Other React Hooks

| Hook | Purpose |
|------|---------|
| `useVirtualizedTree` | Virtualized rendering for large file trees |
| `useResolvedAgentSettings` | Parse and merge agent settings from different sources |
| `useTerminalProfileChange` | Monitor terminal profile file changes |
| `useGlobalTerminalListeners` | Global-scope terminal event listeners |

---

## Security Protection System

Auto-Claude implements a **four-layer defense system** to prevent Git disasters:

```
┌─────────────────────────────────────────────────────────────────┐
│                   Four-Layer Defense System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Prompt Education                                      │
│  ├── Git safety rules in every subtask prompt                   │
│  └── Educate AI agents about dangerous commands                 │
│                                                                 │
│  Layer 2: Code Validation                                       │
│  ├── Regex patterns detect dangerous commands                    │
│  ├── bash_validators.py                                         │
│  └── Pre-execution interception                                 │
│                                                                 │
│  Layer 3: Runtime Hooks                                         │
│  ├── bash_security_hook                                         │
│  ├── write_empty_param_hook                                     │
│  └── todowrite_fix_hook                                         │
│                                                                 │
│  Layer 4: Pre-commit Hook                                       │
│  ├── hooks/pre-commit                                           │
│  └── Detects mass deletions (>50%)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Protection by Layer

| Dangerous Command | Layer 1 | Layer 2 | Layer 3 | Layer 4 |
|-------------------|---------|---------|---------|---------|
| `rm .git/index` | ✅ | ✅ | ✅ | ✅ |
| `rm -rf .git/` | ✅ | ✅ | ✅ | ✅ |
| `git config user.name` | ✅ | ✅ | ✅ | - |
| `git commit` (with secrets) | ✅ | ✅ | ✅ | - |
| Mass deletion | - | - | - | ✅ |

---

## Implemented Safety Features

### 1. Git Index Protection

**Forbidden Commands**:
```bash
rm .git/index           # ❌ FORBIDDEN
rm -f .git/index        # ❌ FORBIDDEN
rm .git/index && git reset  # ❌ FORBIDDEN
```

**Safe Alternatives**:
```bash
rm -f .git/index.lock   # ✅ SAFE (removes lock file only)
git read-tree HEAD      # ✅ SAFE (rebuilds index from HEAD)
git status              # ✅ SAFE (checks status)
```

### 2. Git Identity Protection

Prevents setting identity configuration to ensure proper commit attribution.

### 3. Secret Scanning

Scans staged files before `git commit` to prevent secret leaks.

### 4. Empty Parameter Detection

Detects empty Write tool parameters caused by token truncation.

### 5. Batch Update Optimization

Prevents UI lag from frequent state updates.

---

## Key File Index

### Git Hooks
| File | Description |
|------|-------------|
| `hooks/pre-commit.template` | Pre-commit hook template |
| `hooks/pre-commit` | Currently installed hook |

### Backend Security System
| File | Description |
|------|-------------|
| `apps/backend/security/hooks.py` | Main hook implementations |
| `apps/backend/security/bash_validators.py` | Bash validation entry point |
| `apps/backend/security/git_validators.py` | Git command validators |
| `apps/backend/prompts/knowledge/git/git-safety-rules.md` | Git safety rules (Chinese) |

### Frontend Hooks
| File | Description |
|------|-------------|
| `apps/frontend/src/renderer/hooks/useIpc.ts` | IPC event batching |
| `apps/frontend/src/renderer/hooks/useVirtualizedTree.ts` | Virtualized tree |
| `apps/frontend/src/renderer/hooks/useResolvedAgentSettings.ts` | Agent settings resolution |
| `apps/frontend/src/renderer/hooks/useTerminalProfileChange.ts` | Terminal profile changes |

---

## Development Guide

### Adding a New Security Hook

1. Define the function in `apps/backend/security/hooks.py`:

```python
async def my_custom_hook(
    input_data: dict[str, Any],
    tool_use_id: str | None = None,
    context: Any | None = None,
) -> dict[str, Any]:
    # Check logic
    if should_block:
        return {"decision": "block", "reason": "Reason"}
    return {}  # Allow
```

2. Register the hook in the system

### Adding New Git Validation Rules

1. Add regex pattern in `apps/backend/security/git_validators.py`
2. Update `DANGEROUS_GIT_PATTERNS` list
3. Document in safety rules

---

## Maintenance Recommendations

1. **Regular Review**: Review hook rules quarterly for continued relevance
2. **Test Bypass**: Ensure `--no-verify` functionality works correctly
3. **Documentation**: Update docs when adding new hooks
4. **Logging**: Consider adding hook trigger logs for debugging

---

**Document Maintenance**: Please update this document when the hook system changes.
