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
