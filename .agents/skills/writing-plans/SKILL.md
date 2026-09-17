---
name: writing-plans
description: Decomposes complex architectural goals into bite-sized, deterministic implementation tasks with test verification. Use when transitioning from design to execution.
---

# Writing Implementation Plans Protocol

Transform architectural goals into an actionable `implementation_plan.md`:

## 1. Structure by Component
- Group files logically by subsystem or dependency layer.
- List dependencies first (database migrations, models) before downstream consumers (controllers, UI).

## 2. Granular Task Steps
- Break work into 10–20 minute implementation chunks.
- For every task, define:
  - Exact file paths to modify or create.
  - Expected unit test file and test scenario.
  - Automated verification command.

## 3. Review Gating
- Present the plan to the user and await explicit approval before running code modification tools.
