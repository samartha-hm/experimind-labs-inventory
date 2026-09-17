---
name: verification-before-completion
description: Mandatory 5-gate evidence check before declaring any task complete. Enforces running real test suites, linters, and inspecting git diffs. Use whenever about to conclude a task.
---

# Verification Before Completion (5-Gate Checklist)

Never conclude a session or say "Done" without validating all 5 gates:

## Gate 1: Scope Check
- Were all items in the user request or implementation plan fulfilled?
- Did we avoid scope creep or unrequested refactorings?

## Gate 2: Compilation & Test Evidence
- Run the project build or test suite from terminal (`npm test`, `pytest`, `cargo test`, `build_apk.ps1`).
- Verify exit code is 0 with zero unexpected failures or warnings.

## Gate 3: Git Status & Diff Hygiene
- Run `git status` to verify no untracked junk or debug files remain.
- Run `git diff` to review every modified line for cleanliness and readability.

## Gate 4: Security & Secret Scan
- Verify that no API keys, private keys, or `.env` files are exposed or staged.

## Gate 5: Clear Communication
- Summarize changes concisely with clickable markdown file links (`file:///...`).
