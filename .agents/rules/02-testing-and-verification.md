# Testing & Verification Standards

## 1. Test-Driven Development (TDD) Mandate
- When developing new features or fixing defects, first author a focused unit or integration test reproducing the requirement or bug.
- Verify that the test fails as expected for the right reason (Red).
- Implement the simplest possible solution to make the test pass (Green).
- Refactor for cleanliness, performance, and readability while ensuring all tests continue to pass (Refactor).

## 2. Test Quality & Coverage
- Tests must be deterministic and isolated. Avoid shared mutable state or inter-test ordering dependencies.
- Mock external network calls, third-party APIs, and external cloud infrastructure.
- Test both happy paths and edge cases (boundary conditions, null/undefined handling, network timeouts, invalid inputs).

## 3. Evidence Required for Task Completion
- Never state "Tests pass" without running the test command via the terminal.
- Run the full test suite before concluding a task to verify that no regressions were introduced.
