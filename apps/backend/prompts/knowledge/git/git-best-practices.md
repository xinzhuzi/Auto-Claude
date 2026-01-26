# Git Best Practices

**Last Updated:** 2025-01-15
**Source:** Auto-Claude Workflow + Industry Best Practices

---

## 📋 Table of Contents

1. [Commit Best Practices](#commit-best-practices)
2. [Branch Management](#branch-management)
3. [Collaboration Workflow](#collaboration-workflow)
4. [Code Review](#code-review)
5. [Repository Maintenance](#repository-maintenance)
6. [Security Best Practices](#security-best-practices)
7. [Auto-Claude Specific Practices](#auto-claude-specific-practices)

---

## Commit Best Practices

### Write Clear Commit Messages

**Good commit message structure:**
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

**Good:**
```bash
feat: Add user authentication with JWT

- Implement login endpoint
- Add JWT token generation
- Add password hashing with bcrypt
- Add authentication middleware

Closes #123
```

**Bad:**
```bash
fix stuff
```

### Commit Frequently, Push Carefully

**DO:**
- Commit small, logical changes
- Each commit should represent one logical change
- Commit working code (tests pass)

**DON'T:**
- Commit broken code
- Mix multiple unrelated changes in one commit
- Commit generated files or build artifacts

### Keep Commits Atomic

**Atomic commit = One logical change**

**Good:**
```bash
git commit -m "feat: Add user model"
git commit -m "feat: Add user controller"
git commit -m "feat: Add user routes"
```

**Bad:**
```bash
git commit -m "Add user feature, fix login bug, update docs"
```

### Use Conventional Commits

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Feature
git commit -m "feat(auth): add OAuth2 support"

# Bug fix
git commit -m "fix(api): handle null response from server"

# Breaking change
git commit -m "feat(api)!: change response format

BREAKING CHANGE: API now returns data in { data, meta } format"
```

---

## Branch Management

### Branch Naming Convention

**Format:** `<type>/<description>`

**Types:**
- `feature/` - New features
- `fix/` - Bug fixes
- `hotfix/` - Urgent production fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates

**Examples:**
```bash
feature/user-authentication
fix/login-validation-error
hotfix/critical-security-patch
refactor/extract-user-service
docs/update-api-documentation
test/add-integration-tests
```

### Branch Lifecycle

**1. Create branch from main:**
```bash
git checkout main
git pull origin main
git checkout -b feature/new-feature
```

**2. Work on branch:**
```bash
# Make changes
git add -A
git commit -m "feat: implement feature"
```

**3. Keep branch updated:**
```bash
# Regularly sync with main
git checkout main
git pull origin main
git checkout feature/new-feature
git rebase main
```

**4. Merge to main:**
```bash
git checkout main
git merge --no-ff feature/new-feature
git push origin main
```

**5. Delete branch:**
```bash
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

### Main Branch Protection

**Protect main branch:**
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Restrict who can push

**Never:**
```bash
# ❌ Don't commit directly to main
git checkout main
git commit -m "quick fix"

# ✅ Use feature branch instead
git checkout -b fix/quick-fix
git commit -m "fix: resolve issue"
# Create PR for review
```

---

## Collaboration Workflow

### Pull Request Best Practices

**Before creating PR:**
1. Ensure all tests pass
2. Update documentation
3. Rebase on latest main
4. Review your own changes first

**PR description should include:**
- What changed and why
- How to test the changes
- Screenshots (if UI changes)
- Related issues/tickets

**Example PR description:**
```markdown
## What
Add user authentication with JWT tokens

## Why
Users need to securely log in to access protected resources

## How to Test
1. Start the server: `npm start`
2. POST to `/api/login` with credentials
3. Verify JWT token is returned
4. Use token to access `/api/protected`

## Screenshots
[Login form screenshot]

Closes #123
```

### Code Review Guidelines

**As a reviewer:**
- Review promptly (within 24 hours)
- Be constructive and respectful
- Focus onic, not style (use linters for style)
- Ask questions, don't demand changes
- Approve when satisfied

**As an author:**
- Respond to all comments
- Don't take feedback personally
- Explain your reasoning
- Make requested changes or discuss alternatives
- Thank reviewers

### Merge Strategies

**1. Merge Commit (--no-ff)**
```bash
git merge --no-ff feature/branch
```
- Preserves branch history
- Clear feature boundaries
- Good for feature branches

**2. Squash and Merge**
```bash
git merge --squash feature/branch
git commit -m "feat: complete feature"
```
- Clean linear history
- One commit per feature
- Good l features

**3. Rebase and Merge**
```bash
git rebase main
git checkout main
git merge feature/branch
```
- Linear history
- Preserves individual commits
- Good for clean commit history

**Auto-Claude uses:** Merge commit (--no-ff) to preserve task history.

---

## Code Review

### What to Review

**Code Quality:**
- Logic correctness
- Error handling
- Edge cases
- Performance implications

**Code Style:**
- Follows project conventions
- Readable and maintainable
- Properly documented

**Security:**
- No hardcoded secrets
- Input validation
- SQL injection prevention
- XSS prevention

**Tests:**
- Adequate test coverage
- Tests are meaningful
- Tests pass

### Review Comments

**Good comments:**
```
❓ Question: Why did you choose this approach over X?
💡 Suggestion: Consider using Array.map() here for better readability
⚠️ Issue: This could cause a race condition if called concurrently
✅ Nice: Great use of the factory pattern here!
```

**Bad comments:**
```
❌ This is wrong
❌ Why didn't you do X?
❌ I don't like this
```

---

## Repository Maintenance

### Keep Repository Clean

**Use .gitignore:**
```bash
# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/
*.pyc

# IDE files
.vscode/
.idea/
*.swp

# Environment files
.env
.env.local

# OS files
.DS_Store
Thumbs.db
```

**Remove large files:**
```bash
# Find large files
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | \
  sort --numeric-sort --key=2 | \
  tail -20

# Remove from history (use with caution)
git filter-branch --tree-filter 'rm -f large-file.zip' HEAD
```

### Regular Maintenance Tasks

**Weekly:**
- Review and close stale branches
- Update dependencies
- Run security audits

**Monthly:**
- Review and update documentation
- Clean up old issues
- Archive completed projects

**Commands:**
```bash
# List stale branches (no commits in 30 days)
git for-each-ref --sort=-committerdate refs/heads/ \
  --format='%(committerdate:short) %(refname:short)'

# Delete merged branches
git branch --merged main | grep -v "main" | xargs git branch -d

# Prune remote branches
git remote prune origin
```

---

## Security Best Practices

### Never Commit Secrets

**Bad:**
```python
# ❌ Don't do this
API_KEY = "sk-abc123xyz789..."
DATABASE_URL = "posesql://user:password@localhost/db"
```

**Good:**
```python
# ✅ Use environment variables
import os
API_KEY = os.environ.get('API_KEY')
DATABASE_URL = os.environ.get('DATABASE_URL')
```

### Use .env Files

**Create .env.example:**
```bash
# .env.example (commit this)
API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
```

**Create .env:**
```bash
# .env (DON'T commit this)
API_KEY=sk-abc123xyz789...
DATABASE_URL=postgresql://user:password@localhost/db
```

**Add to .gitignore:**
```bash
.env
.env.local
.env.*.local
```

### Screts

**Use git-secrets:**
```bash
# Install
brew install git-secrets

# Setup
git secrets --install
git secrets --register-aws

# Scan
git secrets --scan
```

**Use truffleHog:**
```bash
# Install
pip install truffleHog

# Scan
trufflehog --regex --entropy=False .
```

### If You Committed a Secret

**1. Rotate the secret immediately**
```bash
# Change API key, password, etc.
```

**2. Remove from history**
```bash
# Use BFG Repo-Cleaner
bfg --replace-text passwords.txt

# Or git filter-branch
git filter-branch --tree-filter 'rm -f secret.txt' HEAD
```

**3. Force push (if allowed)**
```bash
git push --force origin main
```

---

## Auto-Claude Specific Practices

### Subtask Commit Convention

Auto-Claude uses a specific commit message format:

```bash
auto-claude: <subtask-id> - <description>
```

**Examples:**
```bash
git commit -m "auto-claude: subtask-1-2 - Implement user authentication"
git commit -m "auto-claude: fix-subtask-1-2 - Fix login validation"
git commit -m "auto-claude: worktree-task-123 - Add new component"
```

### Scoped Git Add

Auto-Claude can limit `git add` to specific directories:

```python
# If scoped_services = ["Design/世界观小说"]
git add "Design/世界观小说"

# If no scoped_services
git add -A
```

**Why:** Prevents accidentally staging unrelated changes.

### Worktree Workflow

Auto-Claude uses worktrees for task isolation:

```bash
# 1. Create worktree for subtask
git worktree add ../task-123 auto-claude/task-123

# 2. Work in worktree
cd ../task-123
# ... make changes ...
git add -A
git commit -m "auto-claude: task-123 - Complete task"

# 3. Merge to main
cd ../main-repo
git checkout main
git merge --no-ff auto-claude/task-123

# 4. Cleanup
git worktree remove ../task-123
git branch -d auto-claude/task-123
```

### Safety Checks

Auto-Claude implements multiple safety checks:

**1. Mass deletion detection:**
```python
# Refuses to commit if >50% of files are deleted
if deleted_count > total_files * 0.5:
    print("ERROR: Refusing to commit - mass deletion detected!")
    return False
```

**2. Dangerous command blocking:**
```python
# Blocks dangerous Git operations
BLOCKED_COMMANDS = [
    "rm .git/index",
    "rm -rf .git/",
    "git config user.name",
    "git config user.email",
]
```

**3. Secret scanning:**
```python
# Scans staged files for secrets before commit
if detect_secrets(staged_files):
    print("ERROR: Secrets detected in staged files!")
    return False
```

### Git Knowledge Injection

Auto-Claude dynamically injects Git knowledge into prompts:

```python
# Only inject when Git keywords detected
git_keywords = [
    "git", "commit", "branch", "merge", "rebase",
    "push", "pull", "checkout", "stash", "worktree"
]

if any(keyword in subtask.lower() for keyword in git_keywords):
    # Inject git-safety-rules.md
    # Inject git-common-operations.md
    # Inject git-worktree-guide.md (if worktree mentioned)
    # Inject git-error-recovery.md (if error mentioned)
```

---

## 🎯 Quick Reference

### Daily Workflow

```bash
# Start of day
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/new-feature

# Work and commit
git add -A
git commit -m "feat: implement feature"

# Keep updated
git fetch origin
git rebase origin/main

# Push to remote
git push origin feature/new-feature

# Create PR and get review

# After merge, cleanup
git checkout main
git pull origin main
git branch -d feature/new-feature
```

### Commit Message Template

```bash
# Set commit template
git config --global commit.template ~/.gitmessage

# Create template file
cat > ~/.gitmessage << 'EOF'
# <type>: <subject>
#
# <body>
#
# <footer>
#
# Types: feat, fix, docs, style, refactor, test, chore
# Subject: 50 chars or less, imperative mood
# Body: Explain what and why, not how
# Footer: Reference issues, breaking changes
EOF
```

### Useful Aliases

```bash
# Add to ~/.gitconfig
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = log --graph --oneline --all
    amend = commit --amend --no-edit
    undo = reset --soft HEAD~1
```

---

## 📚 Related Documentation

- **Git Safety Rules:** `git-safety-rules.md`
- **Git Common Operations:** `git-common-operations.md`
- **Git Error Recovery:** `git-error-recovery.md`
- **Git Worktree Guide:** `git-worktree-guide.md`

---

## 📖 Additional Resources

### Official Documentation

- [Git Book](https://git-scm.com/book/en/v2)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introd/flow/)
- [GitLab Flow](https://db.com/ee/topics/gitlab_flow.html)

### Auto-Claude Documentation

- **Prompt Generator:** `apps/backend/prompts_pkg/prompt_generator.py`
- **Git Validators:** `apps/backend/security/git_validators.py`
- **Worktree Manager:** `apps/backend/core/worktree.py`
- **Git Safety System:** `/docs/2025-01-14-git-safety-system.md`

---

**Remember:** Good Git practices make collaboration easier, code reviews faster, and debugging simpler. Invest time in writing clear commits and maintaining a clean repository.
