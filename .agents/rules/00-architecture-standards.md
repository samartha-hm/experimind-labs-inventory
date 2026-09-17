# Architecture & Coding Standards

## 1. Clean Architecture & Separation of Concerns
- **Single Responsibility**: Every function, class, or module must have exactly one reason to change.
- **Dependency Inversion**: Depend on interfaces or abstractions, never on concrete implementations.
- **Explicit Interfaces**: Declare input parameters and return types explicitly (TypeScript strict mode, Python type annotations).

## 2. Immutability & Defensive Programming
- Avoid in-place mutations of data structures. Prefer immutable copies (`Object.freeze`, spread operators, `dataclasses(frozen=True)`).
- Validate all external boundaries (API payloads, query params, configuration files) using validation libraries (e.g. Zod, Pydantic).
- Fail fast: Throw clear, descriptive exceptions as early as possible when encountering invalid states.

## 3. Code Preservation
- Do not remove comments, docstrings, or license headers unrelated to the current task.
- Preserve existing formatting conventions and naming styles within established files.
