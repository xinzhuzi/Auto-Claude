# Git Hooks for Auto-Claude

This directory contains Git hook templates to prevent common issues in Auto-Claude workflows.

## Available Hooks

### pre-commit.template - Mass Deletion Protection

Prevents accidental mass file deletions caused by git index corruption or incorrect `git add` commands.

**What it does:**
- Detects when more than 50% of tracked files are being deleted
- Blocks the commit and provides helpful error messages
- Suggests fixes for common issues

**Installation:**

```bash
# From the Auto-Claude repository root
cp hooks/pre-commit.template .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Usage:**

The hook runs automatically before every commit. If it detects a mass deletion:

```
❌ ERROR: Mass file deletion detected!

   Staged deletions: 223,907 files
   Total tracked files: 223,910 files
   Deletion percentage: 99%

This looks like git index corruption or an incorrect 'git add' command.

Common causes:
  - Running 'git add .' from a subdirectory
  - Git index corruption
  - Incorrect worktree operations

To fix:
  1. Check your changes: git status
  2. Reset the index: git reset HEAD
  3. Re-add your changes correctly: git add -A

If this deletion is intentional, bypass this check with:
  git commit --no-verify
```

**Bypassing the hook:**

If you genuinely need to delete many files:

```bash
git commit --no-verify -m "your message"
```

## Background

This hook was created in response to issue #006 where 223,907 files were accidentally deleted due to:
1. `git add .` being run from a subdirectory
2. Git index being cleared, leaving only files in the current directory
3. Commit proceeding without safety checks

See: `.auto-claude/docs/troubleshooting-006-git-mass-deletion.md`

## For Project Maintainers

To automatically install hooks for all developers, add this to your project setup:

```bash
# In your project's setup script
if [ -f "hooks/pre-commit.template" ]; then
    cp hooks/pre-commit.template .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✓ Installed git pre-commit hook"
fi
```
