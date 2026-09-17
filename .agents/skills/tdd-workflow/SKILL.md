---
name: tdd-workflow
description: Enforces a strict Test-Driven Development (TDD) cycle (Red-Green-Refactor) when implementing new features or fixing defects. Use this skill whenever authoring code changes, adding endpoints, or fixing regressions.
---

# Test-Driven Development (TDD) Execution Runbook

Follow this deterministic 3-phase cycle for any coding implementation task:

## Phase 1: Red (Failing Test)
1. Identify the specific requirement or bug to address.
2. Locate the appropriate test suite (e.g. `tests/` or `__tests__/`).
3. Write a small, targeted test asserting the expected behavior or reproducing the bug.
4. Execute the test suite using the project's test command (e.g. `npm test`, `pytest`, `cargo test`).
5. **VERIFY**: The test MUST fail, and it must fail with the exact expected error or assertion failure.

## Phase 2: Green (Minimal Implementation)
1. Write the minimal amount of code required to make the failing test pass.
2. Do not prematurely optimize or implement unrequested features.
3. Re-run the test command.
4. **VERIFY**: All tests, including previously existing tests, MUST pass cleanly.

## Phase 3: Refactor (Clean Code)
1. Review the newly implemented code for readability, maintainability, and architectural standards.
2. Eliminate duplication, improve naming, and simplify complex expressions.
3. Re-run the full test suite to guarantee no regression occurred.
