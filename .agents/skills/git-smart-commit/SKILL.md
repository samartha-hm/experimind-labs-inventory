---
name: git-smart-commit
description: Conventional commits generator and staging reviewer. Generates structured commit messages, checks for accidental credential staging, and structures atomic git commits. Use whenever staging or committing git changes.
---

# Git Smart Commit Guide

Follow this standardized workflow for creating clean, atomic commits:

## 1. Pre-Commit Review
1. Inspect status: `git status -s`
2. Inspect exact diff: `git diff --cached` (or `git diff`)
3. **Verify Secrets**: Check that no `.env`, credential files, or debug print statements are staged.

## 2. Conventional Commit Types
- `feat:` A new user-facing feature or capability
- `fix:` A bug fix or defect correction
- `refactor:` Code restructuring that neither fixes a bug nor adds a feature
- `test:` Adding missing tests or correcting existing tests
- `docs:` Documentation changes only
- `chore:` Maintenance tasks, dependency updates, or build configuration changes
- `perf:` Performance optimization

## 3. Format Structure
```
<type>(<optional-scope>): <concise description in imperative mood>

[optional body explaining motivation and architectural impact]

[optional footer, e.g. Closes #123]
```
