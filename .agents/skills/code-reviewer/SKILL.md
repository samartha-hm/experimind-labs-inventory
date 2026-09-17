---
name: code-reviewer
description: Multi-dimensional architectural, security, and quality code review skill. Use whenever reviewing diffs, evaluating pull requests, or assessing codebase health before shipping.
---

# Comprehensive Code Review Rubric

When reviewing code or git diffs, evaluate against these 5 critical dimensions:

## 1. Correctness & Functionality
- Does the code fulfill the stated requirements without unintended side effects?
- Are edge cases (null values, empty lists, boundary numbers, connection failures) safely handled?
- Are errors properly logged and surfaced with actionable diagnostic messages?

## 2. Security & Vulnerability Defense
- Are all inputs validated and sanitized before processing?
- Are SQL/Command/XSS injection vulnerabilities avoided?
- Are sensitive secrets, credentials, or personal identifiable information (PII) excluded from logs and code?

## 3. Architecture & Modularity
- Does the code adhere to the Single Responsibility Principle?
- Is code duplication minimized without creating premature, fragile abstractions?
- Are interfaces clean, typed, and backwards-compatible?

## 4. Performance & Resource Management
- Are database queries indexed and N+1 query patterns eliminated?
- Are file handles, database connections, and network sockets properly closed in `finally` blocks or async context managers?
- Are asynchronous operations non-blocking?

## 5. Test Coverage
- Are new code paths backed by deterministic automated unit or integration tests?
- Did the test suite pass with real execution evidence?
