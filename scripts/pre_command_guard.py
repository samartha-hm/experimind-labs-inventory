#!/usr/bin/env python3
"""
Pre-Command Safety Guard for Antigravity Agents
Intercepts dangerous, destructive, or irreversible shell commands before execution.
"""
import sys
import os
import re

DANGEROUS_PATTERNS = [
    (r"\brm\s+-[rfRF]{1,4}\s+(/|~|\*|[Cc]:\\?)(?:\s|$)", "Destructive recursive file deletion on root or system drive"),
    (r"\bformat\s+[A-Za-z]:", "Attempted disk format command"),
    (r"\bdd\s+if=.*\bof=", "Direct disk overwriting via dd"),
    (r"\bmkfs\b", "Filesystem destruction command"),
    (r"\bgit\s+push\s+.*(--force|-f)\b", "Force pushing to remote repository (potential commit loss)"),
    (r"\bgit\s+reset\s+--hard\b", "Hard git reset (uncommitted changes will be destroyed)"),
    (r"\bDROP\s+(DATABASE|SCHEMA|TABLE)\b", "Destructive SQL drop statement"),
    (r"\bTRUNCATE\s+TABLE\b", "Destructive SQL truncate statement"),
]

def check_command(cmd: str):
    if not cmd:
        return True, ""
    for pattern, description in DANGEROUS_PATTERNS:
        if re.search(pattern, cmd, re.IGNORECASE):
            return False, f"[SAFETY GUARD BLOCKED] {description}: '{cmd}'"
    return True, ""

def main():
    cmd = ""
    if len(sys.argv) > 1:
        cmd = " ".join(sys.argv[1:])
    else:
        cmd = os.environ.get("TOOL_INPUT") or os.environ.get("COMMAND") or ""
        if not cmd and not sys.stdin.isatty():
            cmd = sys.stdin.read()

    allowed, reason = check_command(cmd.strip())
    if not allowed:
        print(f"\n❌ {reason}\n", file=sys.stderr)
        sys.exit(1)
    
    sys.exit(0)

if __name__ == "__main__":
    main()
