# Git Common Operations

**Last Updated:** 2025-01-15
**Source:** Auto-Claude Git Utilities and Best Practices

---

## 📋 Table of Contents

1. [Basic Operations](#basic-operations)
2. [Branch Management](#branch-management)
3. [Commit Operations](#commit-operations)
4. [File Operations](#file-operations)
5. [History and Inspection](#history-and-inspection)
6. [Remote Operations](#remote-operations)
7. [Auto-Claude Specific Operations](#auto-claude-specific-operations)

---

## Basic Operations

### Check Repository Status

```bash
# Show working tree status
git status

# Show status in short format
git status -s

# Show branch and tracking info
git status -sb
```

**When to use:** Before any Git operation to understand current state.

### View Changes

```bash
# Show unstaged changes
git diff

# Show staged changes
git diff --cached

# Show changes in a specific file
git diff path/to/file

# Show changes between commits
git diff commit1 commit2
```

### Stage Changes

```bash
# Stage all changes (RECOMMENDED in Auto-Claude)
git add -A

# Stage specific file
git add path/to/file

# Stage all files in directory
git add path/to/directory/

# Stage interactively
git add -p
```

**Auto-Claude Recommendation:** Always use `git add -A` to stage all changes from repository root, regardless of current directory. This prevents path confusion.

---

## Branch Management

### Create and Switch Branches

```bash
# Create new branch
git branch feature/new-feature

# Switch to branch
git checkout feature/new-feature

# Create and switch in one command
git checkout -b feature/new-feature

# Create branch from specific commit
git checkout -b feature/fix origin/main
```

### List Branches

```bash
# List local branches
git branch

# List all branches (local + remote)
git branch -a

# List branches with last commit
git branch -v

# List merged branches
git branch --merged

# List unmerged branches
git branch --no-merged
```

### Delete Branches

```bash
# Delete merged branch (safe)
git branch -d feature/old-feature

# Force delete branch (use with caution)
git branch -D feature/experimental

# Delete remote branch
git push origin --delete feature/old-feature
```

### Get Current Branch

```bash
# Get current branch name
git branch --show-current

# Alternative (works in older Git versions)
git rev-parse --abbrev-ref HEAD
```

**Auto-Claude Usage:** Used in `core/workspace/git_utils.py::get_current_branch()`

---

## Commit Operations

### Create Commits

```bash
# Commit with message
git commit -m "feat: Add new feature"

# Commit with detailed message
git commit -m "feat: Add user authentication" -m "- Add login endpoint
- Add JWT token generation
- Add password hashing"

# Commit all tracked changes (skip staging)
git commit -am "fix: Quick bug fix"

# Amend last commit
git commit --amend

# Amend without changing message
git commit --amend --no-edit
```

### Auto-Claude Commit Convention

```bash
# Format: auto-claude: <subtask-id> - <description>
git commit -m "auto-claude: subtask-1-2 - Implement user authentication"

# For fixes
git commit -m "auto-claude: fix-subtask-1-2 - Fix login validation"

# For worktree commits
git commit -m "auto-claude: worktree-task-123 - Add new component"
```

### Commit Message Best Practices

**Good commit messages:**
```bash
git commit -m "feat: Add password reset functionality"
git commit -m "fix: Resolve race condition in auth middleware"
git commit -m "refactor: Extract validation logic to separate module"
git commit -m "docs: Update API documentation for v2 endpoints"
```

**Bad commit messages:**
```bash
git commit -m "fix"  # Too vague
git commit -m "WIP"  # Not descriptive
git commit -m "asdf"  # Meaningless
```

---

## File Operations

### Track and Untrack Files

```bash
# Start tracking new file
git add new-file.txt

# Stop tracking file (keep in working directory)
git rm --cached file.txt

# Remove file from Git and filesystem
git rm file.txt

# Remove directory recursively
git rm -r directory/
```

### Move and Rename Files

```bash
# Rename file (Git tracks the rename)
git mv old-name.txt new-name.txt

# Move file to directory
git mv file.txt directory/

# Equivalent manual operation
mv old-name.txt new-name.txt
git add new-name.txt
git rm old-name.txt
```

**Auto-Claude Usage:** `core/workspace/git_utils.py::detect_file_renames()` detects renames automatically.

### Restore Files

```bash
# Discard changes in working directory
git restore file.txt

# Unstage file (keep changes)
git restore --staged file.txt

# Restore file from specific commit
git restore --source=HEAD~2 file.txt

# Restore all files
git restore .
```

**Legacy commands (still work):**
```bash
git checkout -- file.txt  # Discard changes
git reset HEAD file.txt   # Unstage
```

---

## History and Inspection

### View Commit History

```bash
# Show commit history
git log

# Show last N commits
git log -5

# Show commits in one line
git log --oneline

# Show commits with graph
git log --graph --oneline --all

# Show commits by author
git log --author="John Doe"

# Show commits in date range
git log --since="2025-01-01" --until="2025-01-15"

# Show commits affecting specific file
git log -- path/to/file
```

### View Commit Details

```bash
# Show specific commit
git show commit-hash

# Show commit with diff
git show commit-hash --stat

# Show only files changed
git show --name-only commit-hash

# Show commit message only
git log -1 --pretty=%B commit-hash
```

**Auto-Claude Usage:** `merge/timeline_git.py::get_commit_info()` retrieves commit metadata.

### Find Commits

```bash
# Search commit messages
git log --grep="bug fix"

# Search code changes
git log -S "function_name"

# Find when line was added
git blame file.txt

# Find when line was added (with commit details)
git blame -L 10,20 file.txt
```

---

## Remote Operations

### Fetch and Pull

```bash
# Fetch from remote (doesn't merge)
git fetch origin

# Fetch all remotes
git fetch --all

# Pull (fetch + merge)
git pull origin main

# Pull with rebase
git pull --rebase origin main
```

### Push Changes

```bash
# Push to remote
git push origin main

# Push new branch
git push -u origin feature/new-feature

# Push all branches
git push --all origin

# Push tags
git push --tags

# Force push (DANGEROUS - use with caution)
git push --force origin main

# Safer force push (fails if remote has new commits)
git push --force-with-lease origin main
```

**Auto-Claude Warning:** Force push is blocked in most scenarios to prevent data loss.

### Remote Management

```bash
# List remotes
git remote -v

# Add remote
git remote add upstream https://github.com/original/repo.git

# Remove remote
git remote remove upstream

# Rename remote
git remote rename origin new-origin

# Change remote URL
git remote set-url origin https://new-url.git
```

---

## Auto-Claude Specific Operations

### Scoped Git Add

Auto-Claude can limit `git add` to specific service directories:

```python
# From prompt_generator.py
def get_git_add_paths(scoped_services: list[str]) -> str:
    if not scoped_services:
        return "-A"  # Add all changes

    # Add only scoped services
    quoted_paths = [f'"{service}"' for service in scoped_services]
    return " ".join(quoted_paths)
```

**Usage:**
```bash
# If scoped_services = ["Design/世界观小说"]
git add "Design/世界观小说"

# If no scoped_services
git add -A
```

### Get File Content from Ref

Retrieve file content from a specific Git ref without checking it out:

```python
# From core/workspace/git_utils.py
def get_file_content_from_ref(file_path: str, ref: str = "HEAD") -> str:
    """Get file content from a Git ref."""
    result = subprocess.run(
        ["git", "show", f"{ref}:{file_path}"],
        capture_output=True,
        text=True,
    )
    return result.stdout
```

**Usage:**
```bash
# Get file from HEAD
git show HEAD:path/to/file.txt

# Get file from specific commit
git show abc123:path/to/file.txt

# Get file from branch
git show feature/branch:path/to/file.txt
```

### Detect File Renames

Auto-Claude can detect if files were renamed:

```python
# From core/workspace/git_utils.py
def detect_file_renames(file_path: str, ref: str = "HEAD") -> list[str]:
    """Detect if a file was renamed."""
    result = subprocess.run(
        ["git", "log", "--follow", "--name-only", "--pretty=format:", ref, "--", file_path],
        capture_output=True,
        text=True,
    )
    return [line for line in result.stdout.split("\n") if line.strip()]
```

**Usage:**
```bash
# Track file history across renames
git log --follow --name-only -- current-name.txt
```

### Get Merge Base

Find the common ancestor of two branches:

```python
# From core/workspace/git_utils.py
def get_merge_base(branch1: str, branch2: str) -> str:
    """Get the merge base (common ancestor) of two branches."""
    result = subprocess.run(
        ["git", "merge-base", branch1, branch2],
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()
```

**Usage:**
```bash
# Find common ancestor
git merge-base main feature/branch
```

### Check for Uncommitted Changes

```python
# From core/workspace/git_utils.py
def has_uncommitted_changes() -> bool:
    """Check if there are uncommitted changes."""
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True,
    )
    return bool(result.stdout.strip())
```

**Usage:**
```bash
# Check for changes (empty output = no changes)
git status --porcelain
```

---

## 🎯 Quick Reference

### Daily Workflow

```bash
# 1. Check status
git status

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Make changes...

# 4. Stage all changes
git add -A

# 5. Commit
git commit -m "feat: Add new feature"

# 6. Push to remote
git push -u origin feature/new-feature
```

### Undo Operations

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Undo specific file
git restore file.txt

# Unstage file
git restore --staged file.txt
```

### Inspection

```bash
# What changed?
git diff

# What's staged?
git diff --cached

# Recent commits
git log --oneline -10

# Who changed this line?
git blame file.txt
```

---

## 📚 Related Documentation

- **Git Safety Rules:** `git-safety-rules.md`
- **Git Error Recovery:** `git-error-recovery.md`
- **Git Worktree Guide:** `git-worktree-guide.md`
- **Git Best Practices:** `git-best-practices.md`

---

**Remember:** Always run `git status` before and after Git operations to verify the state of your repository.
