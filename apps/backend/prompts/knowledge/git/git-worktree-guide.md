# Git Worktree Guide

**Last Updated:** 2025-01-15
**Source:** Auto-Claude Worktree Implementation + Git Best Practices

---

## 📋 Table of Contents

1. [What are Git Worktrees?](#what-are-git-worktrees)
2. [Why Auto-Claude Uses Worktrees](#why-auto-claude-uses-worktrees)
3. [Basic Worktree Operations](#basic-worktree-operations)
4. [Auto-Claude's LFS Optimization](#auto-claudes-lfs-optimization)
5. [Worktree Safety Features](#worktree-safety-features)
6. [Worktree Lifecycle Management](#worktree-lifecycle-management)
7. [Best Practices](#best-practices)
8. [Common Issues and Solutions](#common-issues-and-solutions)

---

## What are Git Worktrees?

### Concept

Git worktrees allow you to have **multiple working directories** attached to the same repository. Each worktree can have a different branch checked out.

**Traditional Git:**
```
project/
├── .git/           # Repository data
├── src/            # Working directory
└── README.md
```

**With Worktrees:**
```
project/              # Main worktree
├── .git/
├── src/
└── README.md

project-feature/      # Additional worktree
├── .git (link)       # Links to main .git
├── src/
└── README.md
```

### Benefits

- **Parallel Development**: Work on multiple branches simultaneously
- **No Stashing**: Switch contexts without stashing changes
- **Isolated Testing**: Test different branches without affecting main work
- **Task Isolation**: Each task gets its own clean workspace

### When to Use Worktrees

**Good Use Cases:**
- Working on multiple features simultaneously
- Testing bug fixes while developing new features
- Code review without disrupting current work
- CI/CD builds in isolated environments

**Not Recommended:**
- Simple branch switching (use `git checkout` instead)
- Short-lived experiments (use `git stash` instead)
- Single-task workflows

---

## Why Auto-Claude Uses Worktrees

Auto-Claude uses worktrees for **task isolation** to ensure:

1. **Clean Workspace**: Each subtask starts with a clean working directory
2. **Parallel Execution**: Multiple subtasks can run simultaneously
3. **Safe Rollback**: Failed tasks don't affect the main workspace
4. **Conflict Prevention**: No interference between concurrent tasks

### Auto-Claude's Worktree Strategy

```python
# From core/worktree.py
class WorktreeManager:
    """Manages Git worktrees for task isolation."""

    def create_worktree(self, spec_name: str, branch_name: str) -> Path:
        """Create a new worktree for a subtask."""
        # 1. Create worktree directory
        # 2. Optimize for LFS projects (if applicable)
        # 3. Setup sparse checkout (if applicable)
        # 4. Return worktree path
```

**Typical Workflow:**
```
1. User starts task → Create worktree
2. AI executes subtask → Work in worktree
3. Subtask completes → Merge worktree to main
4. Cleanup → Remove worktree
```

---

## Basic Worktree Operations

### Create Worktree

```bash
# Create worktree from current branch
git worktree add ../project-feature feature/new-feature

# Create worktree with new branch
git worktree add -b feature/new-feature ../project-feature

# Create worktree from specific commit
git worktree add ../project-hotfix abc1234
```

**Auto-Claude Usage:**
```python
# From core/worktree.py
worktree_path = self.create_worktree(
    spec_name="task-123",
    branch_name="auto-claude/task-123"
)
```

### List Worktrees

```bash
# List all worktrees
git worktree list

# Output example:
# /Users/user/project        abc1234 [main]
# /Users/user/project-feature def5678 [feature/new-feature]
```

**Auto-Claude Usage:**
```python
# From core/worktree.py
def list_worktrees(self) -> list[dict]:
    """List all worktrees with their status."""
    result = subprocess.run(
        ["git", "worktree", "list", "--porcelain"],
        capture_output=True,
        text=True
    )
    # Parse and return worktree information
```

### Remove Worktree

```bash
# Remove worktree (safe - checks for uncommitted changes)
git worktree remove ../project-feature

# Force remove (use with caution)
git worktree remove --force ../project-feature

# Remove and delete branch
git worktree remove ../project-feature
git branch -D feature/new-feature
```

**Auto-Claude Usage:**
```python
# From core/worktree.py
def remove_worktree(self, spec_name: str, delete_branch: bool = False):
    """Remove worktree and optionally delete its branch."""
    # 1. Remove worktree directory
    # 2. Optionally delete branch
    # 3. Cleanup stale references
```

### Prune Stale Worktrees

```bash
# Remove stale worktree references
git worktree prune

# List stale worktrees before pruning
git worktree prune --dry-run
```

---

## Auto-Claude's LFS Optimization

Auto-Claude implements special optimizations for repositories using **Git LFS** (Large File Storage).

### LFS Detection

```python
# From core/worktree.py
def _is_lfs_project(self) -> bool:
    """Check if project uses Git LFS."""
    # Check 1: .gitattributes contains filter=lfs
    gitattributes = self.project_dir / ".gitattributes"
    if gitattributes.exists():
        content = gitattributes.read_text()
        if "filter=lfs" in content:
            return True

    # Check 2: .git/lfs directory exists
    lfs_dir = self.project_dir / ".git" / "lfs"
    if lfs_dir.exists():
        return True

    return False
```

### Sparse Checkout

For LFS projects, Auto-Claude uses **sparse checkout** to only include necessary files:

```python
# From core/worktree.py
def _setup_sparse_checkout(self, worktree_path: Path):
    """Configure sparse checkout to exclude large binaries."""
    # Enable sparse checkout in cone mode
    subprocess.run(
        ["git", "sparse-checkout", "init", "--cone"],
        cwd=worktree_path
    )

    # Include only necessary directories
    patterns = [
        "/*",           # Root files
        "!/Assets/",    # Exclude Assets (large binaries)
        "/Assets/*.cs", # But include C# scripts
        "/Design/",     # Include design docs
        "/docs/",       # Include documentation
    ]

    subprocess.run(
        ["git", "sparse-checkout", "set"] + patterns,
        cwd=worktree_path
    )
```

**Benefits:**
- Reduces disk usage by 70-90%
- Faster worktree creation
- Only downloads necessary files

### Shared LFS Storage

Auto-Claude configures all worktrees to share the same LFS storage:

```python
# From core/worktree.py
def _setup_lfs_shared_storage(self, worktree_path: Path):
    """Point worktree to main repo's LFS storage."""
    main_lfs_dir = self.project_dir / ".git" / "lfs"
    worktree_git_dir = worktree_path / ".git"

    # Create symlink to shared LFS storage
    worktree_lfs_dir = worktree_git_dir / "lfs"
    if not worktree_lfs_dir.exists():
        worktree_lfs_dir.symlink_to(main_lfs_dir)
```

**Benefits:**
- No duplicate LFS objects
- Saves disk space (deduplication)
- Faster LFS operations

---

## Worktree Safety Features

### Mass Deletion Detection

Auto-Claude refuses to commit if more than 50% of files are being deleted:

```python
# From core/worktree.py
def commit_in_worktree(self, spec_name: str, message: str) -> bool:
    """Commit changes in worktree with safety checks."""
    worktree_path = self._get_worktree_path(spec_name)

    # Count files to be deleted
    status_output = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=worktree_path,
        capture_output=True,
        text=True
    ).stdout

    deleted_count = sum(1 for line in status_output.split("\n") if line.startswith(" D"))
    total_files = self._count_tracked_files(worktree_path)

    # Safety check: refuse if >50% deletion
    if total_files > 100 and deleted_count > total_files * 0.5:
        print(f"ERROR: Refusing to commit - {deleted_count} of {total_files} files would be deleted!")
        print("This looks like a mass deletion. Please review your changes.")
        return False

    # Safe to commit
    subprocess.run(["git", "add", "-A"], cwd=worktree_path)
    subprocess.run(["git", "commit", "-m", message], cwd=worktree_path)
    return True
```

**Why This Matters:**
- Prevents accidental mass deletions (like the 2025-01-13 incident)
- Catches path confusion errors
- Protects against incorrect `git add` commands

### Gitignored File Handling

When merging worktrees, Auto-Claude unstages gitignored files:

```python
# From core/worktree.py
def merge_worktree(self, spec_name: str) -> bool:
    """Merge worktree changes back to main branch."""
    # 1. Switch to main branch
    # 2. Merge worktree branch
    # 3. Unstage gitignored files
    self._unstage_gitignored_files()
    # 4. Commit merge
```

**Why This Matters:**
- Prevents committing build artifacts
- Keeps repository clean
- Follows .gitignore rules

---

## Worktree Lifecycle Management

### Creation Phase

```python
# From core/worktree.py
def create_worktree(self, spec_name: str, branch_name: str) -> Path:
    """Create and configure a new worktree."""
    # 1. Determine worktree path
    worktree_path = self.worktrees_dir / spec_name

    # 2. Create worktree
    subprocess.run([
        "git", "worktree", "add",
        "-b", branch_name,
        str(worktree_path),
        "HEAD"
    ])

    # 3. Optimize for LFS (if applicable)
    if self._is_lfs_project():
        self._setup_sparse_checkout(worktree_path)
        self._setup_lfs_shared_storage(worktree_path)

    # 4. Return worktree path
    return worktree_path
```

### Work Phase

```python
# AI agent works in worktree
# - Makes code changes
# - Runs tests
# - Commits changes (with safety checks)
```

### Merge Phase

```python
# From core/worktree.py
def merge_worktree(self, spec_name: str) -> bool:
    """Merge worktree changes to main branch."""
    # 1. Get worktree branch name
    branch_name = self._get_worktree_branch(spec_name)

    # 2. Switch to main branch
    subprocess.run(["git", "checkout", "main"])

    # 3. Merge worktree branch
    result = subprocess.run([
        "git", "merge", "--no-ff",
        "-m", f"Merge {spec_name}",
        branch_name
    ])

    # 4. Handle merge conflicts (if any)
    if result.returncode != 0:
        return False

    # 5. Unstage gitignored files
    self._unstage_gitignored_files()

    return True
```

### Cleanup Phase

```python
# From core/worktree.py
def remove_worktree(self, spec_name: str, delete_branch: bool = False):
    """Remove worktree and cleanup."""
    worktree_path = self._get_worktree_path(spec_name)

    # 1. Remove worktree
    subprocess.run(["git", "worktree", "remove", str(worktree_path)])

    # 2. Delete branch (if requested)
    if delete_branch:
        branch_name = self._get_worktree_branch(spec_name)
        subprocess.run(["git", "branch", "-D", branch_name])

    # 3. Prune stale references
    subprocess.run(["git", "worktree", "prune"])
```

### Stale Worktree Cleanup

```python
# From core/worktree.py
def cleanup_old_worktrees(self, max_age_days: int = 7):
    """Remove worktrees older than specified days."""
    for worktree in self.list_worktrees():
        if worktree["age_days"] > max_age_days:
            print(f"Removing stale worktree: {worktree['path']}")
            self.remove_worktree(worktree["spec_name"])
```

---

## Best Practices

### DO: Use Worktrees for Task Isolation

```bash
# Good: Each task gets its own worktree
git worktree add ../task-1 auto-claude/task-1
git worktree add ../task-2 auto-claude/task-2
```

### DO: Clean Up After Completion

```bash
# Remove worktree after merging
git worktree remove ../task-1
git branch -d auto-claude/task-1
```

### DO: Use Descriptive Names

```bash
# Good: Clear purpose
git worktree add ../fix-login-bug fix/login-validation

# Bad: Unclear purpose
git worktree add ../temp temp-branch
```

### DON'T: Share Worktrees Between Tasks

```bash
# Bad: Reusing worktree for different tasks
cd ../task-1
git checkout -b different-task  # Don't do this
```

### DON'T: Commit Directly in Main Worktree

```bash
# Bad: Working directly in main worktree
cd project/
git checkout -b feature/new  # Use worktree instead
```

### DON'T: Forget to Remove Stale Worktrees

```bash
# Check for stale worktrees regularly
git worktree list
git worktree prune
```

---

## Common Issues and Solutions

### Issue 1: "Worktree already exists"

**Symptom:**
```bash
fatal: 'path/to/worktree' already exists
```

**Cause:** Worktree directory wasn't properly removed.

**Solution:**
```bash
# Remove stale worktree reference
git worktree prune

# Or force remove
rm -rf path/to/worktree
git worktree prune
```

### Issue 2: "Branch already checked out"

**Symptom:**
```bash
fatal: 'branch-name' is already checked out at 'path/to/worktree'
```

**Cause:** Branch is checked out in another worktree.

**Solution:**
```bash
# Option 1: Use different branch
git worktree add ../new-worktree -b new-branch-name

# Option 2: Remove other worktree first
git worktree remove path/to/other-worktree
```

### Issue 3: Uncommitted Changes Block Removal

**Symptom:**
```bash
fatal: 'path/to/worktree' contains modified or untracked files
```

**Cause:** Worktree has uncommitted changes.

**Solution:**
```bash
# Option 1: Commit changes
cd path/to/worktree
git add -A
git commit -m "Save work"

# Option 2: Stash changes
git stash

# Option 3: Force remove (loses changes)
git worktree remove --force path/to/worktree
```

### Issue 4: LFS Files Not Available

**Symptom:**
```bash
Error: LFS object not found
```

**Cause:** LFS storage not properly configured.

**Solution:**
```bash
# Fetch LFS objects
git lfs fetch --all

# Or pull LFS objects
git lfs pull
```

### Issue 5: Sparse Checkout Not Working

**Symptom:**
All files are checked out despite sparse checkout configuration.

**Cause:** Sparse checkout not properly initialized.

**Solution:**
```bash
# Re-initialize sparse checkout
git sparse-checkout init --cone

# Set patterns
git sparse-checkout set pattern1 pattern2

# Verify
git sparse-checkout list
```

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Create worktree
git worktree add <path> <branch>

# List worktrees
git worktree list

# Remove worktree
git worktree remove <path>

# Prune stale worktrees
git worktree prune
```

### Auto-Claude Worktree Workflow

```bash
# 1. Create worktree for task
git worktree add ../task-123 auto-claude/task-123

# 2. Work in worktree
cd ../task-123
# ... make changes ...
git add -A
git commit -m "Complete task"

# 3. Merge to main
cd ../main-repo
git checkout main
git merge --no-ff auto-claude/task-123

# 4. Cleanup
git worktree remove ../task-123
git branch -d auto-claude/task-123
```

### LFS Optimization Commands

```bash
# Check if project uses LFS
git lfs ls-files

# Setup sparse checkout
git sparse-checkout init --cone
git sparse-checkout set <patterns>

# Verify sparse checkout
git sparse-checkout list
```

---

## 📚 Related Documentation

- **Git Safety Rules:** `git-safety-rules.md`
- **Git Common Operations:** `git-common-operations.md`
- **Git Error Recovery:** `git-error-recovery.md`
- **Git Best Practices:** `git-best-practices.md`

---

## 📖 Additional Resources

### Official Git Documentation

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Git LFS Documentation](https://git-lfs.github.com/)
- [Git Sparse Checkout](https://git-scm.com/docs/git-sparse-checkout)

### Auto-Claude Documentation

- **Worktree Implementation:** `apps/backend/core/worktree.py`
- **Worktree Optimization:** `/docs/2025-01-14-worktree-optimization.md`
- **Task Isolation Design:** `/docs/task-isolation-architecture.md`

---

**Remember:** Worktrees are powerful for parallel development, but require proper cleanup. Always remove worktrees after completing tasks to avoid confusion and disk space issues.
