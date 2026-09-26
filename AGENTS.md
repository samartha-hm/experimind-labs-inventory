# AGENTS.md — Universal Agent Standards

This document establishes the universal governance and operational guidelines for all AI coding agents (Google Antigravity, Claude Code, Cursor, Codex, OpenCode) collaborating in this repository.

## Operational Discipline
1. **Understand Before Modifying**: Read existing tests and implementations before making edits.
2. **Deterministic Evidence**: Every change must be validated by running local tests and build scripts. Claims without terminal output are invalid.
3. **Atomic Changes**: Keep edits minimal, focused, and well-scoped to the user's explicit request.
4. **Preserve Context**: Favor running scripts to query codebase structure over reading massive raw files into memory.

## Development Workflow
- **Plan**: For non-trivial features or refactors, outline the approach before touching code.
- **Implement**: Follow TDD where applicable. Keep functions pure and modular.
- **Verify**: Run automated tests, check lint rules, and review git diffs.
- **Document**: Update relevant documentation when APIs or behavior change.

## Copilot configuration
- `.github/copilot-instructions.md` — repo-wide Copilot guidance: overview, commands, standards, hard boundaries.
- `.github/github-app.yml` — Copilot app repository configuration (project instructions, one-click scripts, server detection); review and accept it in the app.
- `.github/instructions/` — path-scoped instruction files (backend, frontend, tests) applied via `applyTo` globs.
- `.github/agents/` — custom Copilot agents (`code-reviewer`, `test-engineer`); select with `/agents`.
- `.github/skills/` — skills auto-discovered by Copilot (`verify-changes`, `create-migration`).
- `.github/prompts/` — reusable prompts (`investigate`, `add-feature`, `write-tests`); pick via the prompt picker.
- `.github/workflows/copilot-setup-steps.yml` — environment setup for the Copilot coding agent (effective once merged to the default branch).
