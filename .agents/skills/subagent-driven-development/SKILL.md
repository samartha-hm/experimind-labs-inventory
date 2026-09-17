---
name: subagent-driven-development
description: Dispatches isolated, specialized subagents for distinct implementation tasks to maximize reasoning throughput and preserve clean context windows. Use on complex multi-file tasks.
---

# Subagent-Driven Development Protocol

When coordinating large multi-module tasks across subagents:

## 1. Context Scoping
- Provide each subagent with a laser-focused, self-contained prompt.
- Explicitly pass target file paths, expected test commands, and exact acceptance criteria.
- Limit subagent context: do not dump the entire workspace history into child agents.

## 2. Validation Handoff
- Upon subagent completion, verify that the child agent ran tests and generated real terminal output.
- Re-run verification at the root orchestrator level before marking the sub-task complete.
