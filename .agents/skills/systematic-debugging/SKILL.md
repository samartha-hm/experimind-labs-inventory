---
name: systematic-debugging
description: 4-phase root-cause analysis framework for diagnosing and fixing bugs, test failures, or unexpected runtime behaviors. Use whenever an error, exception, or unexpected behavior occurs.
---

# Systematic Debugging Protocol

When encountering a defect or test failure, do NOT guess solutions blindly. Execute this 4-phase protocol:

## Phase 1: Reproduce & Isolate
1. Re-run the exact failing command to capture the raw error message and complete stack trace.
2. Identify the exact line number, function, and component where the exception originated.
3. Isolate variables: determine what inputs trigger the fault and what inputs work properly.

## Phase 2: Hypothesis Generation
1. Formulate a specific hypothesis explaining why the defect is occurring based on the stack trace and code logic.
2. Check recent git diffs (`git diff HEAD~1`) to see if recent edits introduced the issue.
3. Check for common pitfalls: off-by-one errors, null/undefined pointers, asynchronous race conditions, type mismatches.

## Phase 3: Targeted Verification
1. Add targeted debug logging or write a minimal reproduction test case.
2. Confirm or refute the hypothesis with concrete runtime data.
3. If the hypothesis is refuted, return to Phase 2 with the new information.

## Phase 4: Resolution & Regression Protection
1. Apply the minimal surgical fix addressing the root cause.
2. Execute the reproduction test to verify it now passes.
3. Execute the entire project test suite to verify no regressions were created.
4. Clean up any temporary debug logs before finishing.
