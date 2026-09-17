---
name: context-mode
description: Enforces the 'Think in Code' paradigm to reduce context window token consumption by 98%. Replaces heavy multi-file reading with targeted Python/Node.js script execution. Use whenever analyzing large codebases, counting functions, or scanning dependencies.
---

# Context Mode Protocol (Think in Code)

## The Core Rule: Stop Dumping Files into Context
- **Inefficient (Legacy)**: Calling `view_file` on 40 files burns ~600 KB of context tokens and pushes task instructions out of working memory.
- **Context-Mode (Optimal)**: Write and execute a 10-line Python or Node script to process the files on disk and output only the required answer. (Costs ~3 KB of context).

## Example: Codebase Statistics & Auditing
Instead of reading all source files:
```python
# Run via python in terminal
import os, glob

files = glob.glob("src/**/*.java", recursive=True)
print(f"Total Java files: {len(files)}")
total_lines = sum(len(open(f, encoding="utf-8", errors="ignore").readlines()) for f in files)
print(f"Total Lines of Code: {total_lines}")
```
Output: `Total Java files: 48 | Total Lines of Code: 14,200`
Result: Instant answer, 0 token bloat!
