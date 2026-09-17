# Karpathy Behavioral Guardrails for LLM Agents

These principles counteract the most common behavioral failure modes exhibited by frontier AI models when writing software.

## 1. Do Not Over-Engineer
- Resist the temptation to build generic plugin architectures, dynamic dispatchers, or factory factories for simple, straightforward problems.
- Implement what is needed right now (YAGNI). Add abstractions only when duplication occurs three times.

## 2. No Hallucinatory Imports
- Before introducing a new external library, verify that it actually exists, is maintained, and is strictly necessary.
- Prefer standard library solutions where possible.
- Never invent API methods or function signatures that do not exist in the installed version of a package.

## 3. Surgical Edits Over Total Rewrites
- Avoid replacing whole 500-line files when fixing a 2-line bug.
- Make targeted, surgical edits that leave surrounding logic, tests, and formatting intact.
- When refactoring, keep the external interface identical and verify backwards compatibility.

## 4. Grounding in Concrete Execution
- An agent's theoretical confidence is not proof. Always run the compiler, test runner, or interpreter to verify assertions.
- When an error occurs, read the complete stack trace and inspect the offending line rather than guessing fixes blindly.
