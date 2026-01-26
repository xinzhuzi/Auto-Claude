# Git Error Recovery Guide

**Last Updated:** 2025-01-15
**Source:** Auto-Claude Incident Analysis + Git Best Practices

---

## 📋 Table of Contents

1. [Index Corruption](#index-corruption)
2. [Lock File Issues](#lock-file-issues)
3. [Merge Conflicts](#merge-conflicts)
4. [Detached HEAD](#detached-head)
5. [Lost Commits](#lost-commits)
6. [Corrupted Objects](#corrupted-objects)
7. [Auto-Claude Specific Incidents](#auto-claude-specific-incidents)

---

## Index Corruption

### Symptoms

```bash
error: index file smaller than expected
fatal: index file corrupt
error: bad index file sha1 signature
```

### ⚠️ CRITICAL: What NOT to Do

```bash
# ❌ NEVER DO THIS - Causes catastrophic data loss
rm .git/index
rm -f .git/index
rm -rf .git/
```

**Why this is catastrophic:**
- Deletes all file tracking information
- Git marks ALL files (200,000+) as deleted
- Next commit will delete everything
- Extremely difficult to recover

### ✅ Safe Recovery Steps

**Method 1: Rebuild Index from HEAD (Recommended)**

```bash
# Step 1: Remove stale lock file if it exists
rm -f .git/index.lock

# Step 2: Rebuild index from current commit
git read-tree HEAD

# Step 3: Verify recovery
git status
```

**Why this works:**
- Rebuilds index from current commit
- Preserves all file tracking
- Safe to run multiple times
- No data loss risk

**Method 2: Reset Index**

```bash
# Remove lock file
rm -f .git/index.lock

# Reset index to HEAD
git reset

# Verify
git status
```

**Method 3: Nuclear Option (Last Resort)**

```bash
# Backup first!
cp .git/index .git/index.backup

# Remove corrupted index
rm .git/index

# Rebuild from HEAD
git reset --mixed HEAD

# Re-stage your changes
git add -A
```

### Real Incident: Auto-Claude 2025-01-13

**What Happened:**
- AI agent encountered index lock error
- Attempted multiple fixes
- Eventually ran `rm .git/index && git reset`
- Result: 223,907 files marked as deleted

**Timeline:**
```
14:59:56 - Error: Unable to create '.git/index.lock'
14:59:58 - Attempt #1: rm -f .git/index.lock (correct)
15:00:04 - Attempt #2: git reset (failed - index corrupted)
15:00:06 - Attempt #3: rm .git/index && git reset (DISASTER)
15:00:07 - Attempt #4: rm -f .git/index.lock .git/index (worse)
```

**Lesson Learned:**
- Never delete `.git/index`
- Always use `git read-tree HEAD` for index recovery
- Implement safety checks to prevent dangerous commands

---

## Lock File Issues

### Symptoms

```bash
fatal: Unable to create '.git/index.lock': File exists
fatal: Unable to create '.git/refs/heads/main.lock': File exists
```

### Cause

- Another Git process is running
- Previous Git process crashed
- Stale lock file left behind

### ✅ Safe Recovery

```bash
# Check if Git process is actually running
ps aux | grep git

# If no Git process, remove stale lock file
rm -f .git/index.lock

# For branch locks
rm -f .git/refs/heads/main.lock

# For other locks
rm -f .git/HEAD.lock
rm -f .git/config.lock
```

**Safe to remove:**
- `.git/index.lock`
- `.git/HEAD.lock`
- `.git/config.lock`
- `.git/refs/heads/*.lock`

**NEVER remove:**
- `.git/index` (the actual index file)
- `.git/HEAD` (current branch pointer)
- `.git/config` (repository configuration)

---

## Merge Conflicts

### Symptoms

```bash
CONFLICT (content): Merge conflict in file.txt
Automatic merge failed; fix conflicts and then commit the result.
```

### Resolution Steps

**Step 1: Identify Conflicts**

```bash
# List conflicted files
git status

# Show conflict markers
git diff
```

**Step 2: Resolve Conflicts**

Open conflicted files and look for markers:

```
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> branch-name
```

Edit to keep desired changes, remove markers.

**Step 3: Mark as Resolved**

```bash
# After editing
git add resolved-file.txt

# Check status
git status

# Complete merge
git commit
```

### Abort Merge

```bash
# Abort and return to pre-merge state
git merge --abort

# Or reset to before merge
git reset --hard HEAD
```

### Auto-Claude Merge Strategy

```python
# From core/workspace/git_utils.py
def create_conflict_file_with_git(
    file_path: str,
    base_content: str,
    ours_content: str,
    theirs_content: str
) -> str:
    """Create a conflict file using git merge-file."""
    # Uses git merge-file for 3-way merge
    # Returns conflict markers if conflicts exist
```

---

## Detached HEAD

### Symptoms

```bash
You are in 'detached HEAD' state
HEAD detached at abc1234
```

### What It Means

- You're not on any branch
- Commits made here can be lost
- Common after checking out a specific commit

### Recovery Options

**Option 1: Create New Branch**

```bash
# Create branch from current position
git checkout -b new-branch-name

# Now you're on a branch
git branch
```

**Option 2: Return to Branch**

```bash
# Go back to main branch
git checkout main

# Your detached commits are still in reflog
git reflog
```

**Option 3: Attach to Existing Branch**

```bash
# Move branch pointer to current commit
git branch -f main HEAD
git checkout main
```

---

## Lost Commits

### Symptoms

- Accidentally reset too far
- Deleted branch with unmerged commits
- Can't find recent work

### Recovery with Reflog

```bash
# View reflog (history of HEAD movements)
git reflog

# Output example:
# abc1234 HEAD@{0}: reset: moving to HEAD~1
# def5678 HEAD@{1}: commit: My lost commit
# ghi9012 HEAD@{2}: commit: Previous commit

# Recover lost commit
git checkout def5678

# Or create branch from it
git checkout -b recovered-branch def5678

# Or reset current branch to it
git reset --hard def5678
```

### Recover Deleted Branch

```bash
# Find branch's last commit in reflog
git reflog | grep branch-name

# Recreate branch
git branch branch-name commit-hash
```

### Reflog Expiration

- Reflog keeps history for 90 days (default)
- Unreachable commits kept for 30 days
- After that, commits are garbage collected

---

## Corrupted Objects

### Symptoms

```bash
error: object file .git/objects/xx/xxxxx is empty
error: inflate: data stream error
fatal: loose object xxxxx is corrupt
```

### Recovery Steps

**Step 1: Identify Corruption**

```bash
# Check repository integrity
git fsck --full

# Output shows corrupted objects
```

**Step 2: Recover from Remote**

```bash
# Fetch from remote (if available)
git fetch origin

# Reset to remote state
git reset --hard origin/main
```

**Step 3: Recover from Backup**

```bash
# If you have a backup
cp -r /path/to/backup/.git/objects/* .git/objects/

# Verify
git fsck --full
```

**Step 4: Nuclear Option**

```bash
# Backup current work
git stash

# Re-clone repository
cd ..
mv old-repo old-repo.backup
git clone <repository-url> old-repo

# Copy your changes back
cd old-repo
git stash pop
```

---

## Auto-Claude Specific Incidents

### Incident 1: Mass Deletion (2025-01-13)

**Problem:**
- AI agent deleted `.git/index`
- 223,907 files marked as deleted
- Commit would have destroyed repository

**Root Cause:**
- Index lock error → AI tried to fix
- Escalated to dangerous `rm .git/index` command
- No safety checks to prevent this

**Prevention (Now Implemented):**

1. **Layer 1: Prompt Education**
   - Git safety rules in every subtask prompt
   - Explicit "NEVER" commands list

2. **Layer 2: Code Validation**
   - Regex patterns detect dangerous commands
   - Located in `security/git_validators.py`

3. **Layer 3: Runtime Hooks**
   - Security hooks block execution
   - Located in `security/hooks.py`

4. **Layer 4: Pre-commit Hook**
   - Detects mass deletions (>50% files)
   - Refuses to commit

**Recovery:**
```bash
# What was done:
git reFound commit before deletion
git reset --hard HEAD@{1}  # Restored to before incident
```

### Incident 2: Worktree Mass Deletion

**Problem:**
- Worktree commit attempted to delete 50%+ of files
- Caused by incorrect git add path

**Prevention:**
```python
# From core/worktree.py
def commit_changes(self, spec_name: str, message: str) -> bool:
    # Check for mass deletions
    deleted_count = count_deleted_files()
    total_files = count_total_files()

    if total_files > 100 and deleted_count > total_files * 0.5:
        print(f"ERROR: Refusing to commit - {deleted_count} of {total_files} files would be deleted!")
        return False

    # Safe to commit
    self._run_git(["add", "-A"], cwd=worktree_path)
    self._run_git(["commit", "-m", message], cwd=worktree_path)
```

---

## 🎯 Quick Reference

### Safe Commands (Always OK)

```bash
git status
git log
git diff
git reflog
git fsck
rm -f .git/index.lock  # Only .lock files
git read-tree HEAD
```

### Dangerous Commands (Use with Caution)

```bash
git reset --hard  # Discards uncommitted changes
git clean -fd     # Deletes untracked files
git push --force  # Overwrites remote history
git filter-branch # Rewrites history
```

### Never Use

```bash
rm .git/index     # Catastrophic data loss
rm -rf .git/      # Destroys repository
rm .git/HEAD      # Breaks repository
```

### Emergency Recovery Checklist

1. **Don't Panic** - Most Git operations are recoverable
2. **Check Reflog** - `git reflog` shows recent history
3. **Backup First** - Copy `.git` directory before drastic measures
4. **Use Safe Commands** - `git read-tree HEAD` for index issues
5. **Ask for Help** - If unsure, stop and ask human

---

## 📚 Additional Resources

### Official Git Documentation

- [Git Book - MainData Recovery](https://git-scm.com/book/en/v2/Git-Internals-Maintenance-and-Data-Recovery)
- [Git Reflog Documentation](https://git-scm.com/docs/git-reflog)
- [Git FSck Documentation](https://git-scm.com/docs/git-fsck)

### Auto-Claude Documentation

- **Git Safety Rules:** `git-safety-rules.md`
- **Git Common Operations:** `git-common-operations.md`
- **Incident Analysis:** `/docs/git-index-corruption-root-cause-analysis.md`
- **Safety System:** `/docs/2025-01-14-git-safety-system.md`

### Code References

- **Validators:** `apps/backend/security/git_validators.py`
- **Hooks:** `apps/backend/security/hooks.py`
- **Worktree Safety:** `apps/backend/core/worktree.py`
- **Git Utils:** `apps/backend/core/workspace/git_utils.py`

---

**Remember:** When in doubt, use `git read-tree HEAD` for index issues, and `git reflog` to find lost commits. Never delete `.git/index` or `.git/` directory.
