# Git Safety Rules - CRITICAL

**Last Updated:** 2025-01-15
**Source:** Auto-Claude 4-Layer Git Safety System

---

## 🚨 NEVER Execute These Commands

The following commands can cause **CATASTROPHIC DATA LOSS**:

```bash
rm .git/index          # ❌ FORBIDDEN - Marks ALL files as deleted
rm -f .git/index       # ❌ FORBIDDEN - Same catastrophic result
rm -rf .git/           # ❌ FORBIDDEN - Destroys entire repository
rm .git/index && git reset  # ❌ FORBIDDEN - 2025-01-13 incident command
```

### Why These Commands Are Catastrophic

**`rm .git/index` causes:**
- ✗ Deletes all file tracking information
- ✗ Git marks ALL files (200,000+) as deleted
- ✗ Next commit will delete everything
- ✗ Extremely difficult to recover from
- ✗ Can destroy months of work in seconds

**Real Incident:** On 2025-01-13, the command `rm .git/index && git reset --hard` caused 223,907 files to be deleted from the Auto-Claude repository.

---

## ✅ Safe Index Recovery

If Git index is corrupted or locked, use these **SAFE** steps:

```bash
# Step 1: Remove lock file (SAFE)
rm -f .git/index.lock

# Step 2: Rebuild index from HEAD (SAFE)
git read-tree HEAD

# Step 3: Verify recovery
git status
```

### Why `git read-tree HEAD` is Safe

- ✓ Rebuilds index from current commit
- ✓ Does NOT delete the index file
- ✓ Preserves all file tracking information
- ✓ Can be run multiple times safely
- ✓ No data loss risk
- ✓ Recommended by Git documentation

---

## 🛡️ Auto-Claude's 4-Layer Defense System

Auto-Claude implements a comprehensive 4-layer defense to prevent Git disasters:

### Layer 1: Prompt Education
Every subtask prompt includes Git safety rules to educate the AI agent.

### Layer 2: Code Validation
Regex patterns detect dangerous commands before execution:
- `rm .git/index` (except `.lock` or `.backup`)
- `rm -rf .git/`
- `rm .git/index && git reset`

### Layer 3: Runtime Hooks
Security hooks intercept and block dangerous commands at execution time.

### Layer 4: Pre-commit Hook
Detects mass deletions (>50% of files) and refuses to commit.

---

## 📋 Safe Git Practices

### Before ANY Git Command

1. **Verify your location:**
   ```bash
   pwd  # Always know where you are
   ```

2. **Check repository state:**
   ```bash
   git status  # See what will be committed
   ```

3. **Review changes:**
   ```bash
   git diff  # See what changed
   ```

### Safe Commit Workflow

```bash
# 1. Check status
git status

# 2. Add changes (use -A for safety)
git add -A

# 3. Review what's staged
git status

# 4. Commit with descriptive message
git commit -m "auto-claude: subtask-1-2 - Add feature X"

# 5. Verify commit
git log -1
```

### Safe Branch Operations

```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main

# Delete merged branch
git branch -d feature/old-feature

# Force delete (use with caution)
git branch -D feature/experimental
```

---

## 🚫 Blocked Git Config Operations

Auto-Claude blocks modifications to Git identity configuration to prevent fake commits:

### Blocked Config Keys

```bash
# These commands are BLOCKED:
git config user.name "Test User"      # ❌ BLOCKED
git config user.email "test@test.com" # ❌ BLOCKED
git -c user.name="Test" commit        # ❌ BLOCKED
```

### Why Identity Protection Matters

- Commits must be attributed to the real events "Test User" fake identities
- Maintains commit history integrity
- Ensures proper Git blame/log

### Correct Approach

Simply commit without setting any user configuration. The repository will automatically use the user's global Git identity:

```bash
# Correct - uses global config
git commit -m "Your commit message"
```

---

## 🔍 Secret Scanning

Auto-Claude automatically scans staged files for secrets before allowing commits.

### Detected Secret Types

- API keys (AWS, OpenAI, Stripe, etc.)
- Private keys (RSA, SSH, etc.)
- Passwords and tokens
- Database connection strings
- OAuth sec# If Secrets Are Detected

**DO:**
1. Move secrets to environment variables
2. Update code to use `os.environ.get('VAR_NAME')`
3. Add variable name (not value) to `.env.example`
4. Add `.env` to `.gitignore`

**Example Fix:**
```python
# BEFORE (blocked)
api_key = "sk-abc123xyz789..."

# AFTER (allowed)
import os
api_key = os.environ.get('OPENAI_API_KEY')
```

**False Positives:**
If the detected "secret" is test data or a mock value, add the file pattern to `.secretsignore`:
```bash
echo 'tests/fixtures/' >> .secretsignore
```

---

## ⚠️ Path Confusion Prevention

### The Problem

When you use `cd` to change directories, file paths become relative to your **new location**, not the original working directory.

### Example of Path Confusion

```bash
# Working directory: /Users/user/project
cd Design/世界观小说

# ❌ WRONG - This path is now relative to Design/世界观小说
git add Design/世界观小说/file.md  # File not found!

# ✅ CORRECT - Path relative to current directory
git add file.md

# ✅ CORRECT - Or use absolute path
git add /Users/user/project/Design/世界观小说/file.md
```

### Best Practices

1. **Always run `pwd` after `cd`:**
   ```bash
   cd some/directory
   pwd  # Verify where you are
   ```

2. **Use relative paths from current location:**
   ```bash
   cd Design
   git add 世界观小说/file.md  # Relative to Design/
   ```

3. **Or stay in project root:**
   ```bash
   # Don't cd - use full paths from root
   git add Design/世界观小说/file.md
   ```

---

## 🔄 Worktree Safety

Auto-Claude uses Git worktrees for task isolation. Special safety rules apply:

### Mass Deletion Detection

Before committing in a worktree, Auto-Claude checks if more than 50% of files are being deleted:

```python
# Automatic check before commit
if deleted_count > total_files * 0.5:
    print("ERROR: Refusing to commit - mass deletion detected!")
    return False
```

### Safe Worktree Operations

```bash
# Create worktree
git worktree add ../worktree-name branch-name

# Work in worktree
cd ../worktree-name
# ... make changes ...

# Commit in worktree (mass deletion check runs automatically)
git add -A
git commit -m "Changes in worktree"

# Return to main worktree
cd -

# Remove worktree when done
git worktree remove ../worktree-name
```

---

## 📚 Additional Resources

### Internal Documentation

- **Full Safety System:** `/backup/docs/2025-01-14-git-safety-system.md`
- **2025-01-13 Incident Analysis:** `/backup/docs/git-index-corruption-root-cause-analysis.md`
- **Worktree Optimization:** `/backup/docs/2025-01-14-worktree-optimization.md`

### Code References

- **Validators:** `apps/backend/security/git_validators.py`
- **Security Hooks:** `apps/backend/security/hooks.py`
- **Prompt Generator:** `apps/backend/prompts_pkg/prompt_generator.py`
- **Pre-commit Hook:** `hooks/pre-commit`

---

## 🎯 Quick Reference

### ✅ Always Safe

```bash
git status
git log
git diff
git branch
git read-tree HEAD
r .git/index.lock
```

### ⚠️ tion

```bash
git reset --hard  # Discards uncommitted changes
git clean -fd     # Deletes untracked files
git push --force  # Overwrites remote history
```

### ❌ Never Use

```bash
rm .git/index
rm -rf .git/
rm .git/index && git reset
```

---

**Remember:** When in doubt, run `git status` first. It's always safe and shows you exactly what Git will do.
