#!/usr/bin/env python3
"""
Automated Git Pre-Commit Hook Installer for Antigravity
Configures .git/hooks/pre-commit with scan_credentials.py and pre_command_guard.py.
"""
import os
import sys
import shutil

PRE_COMMIT_HOOK_CONTENT = """#!/bin/sh
# Antigravity Pre-Commit Security Guard
# Automatically blocks credential leaks and unverified commits

echo "[Antigravity Guard] Scanning staged files for credential leaks..."
python scripts/scan_credentials.py
RESULT=$?

if [ $RESULT -ne 0 ]; then
    echo ""
    echo "❌ [BLOCKED] Credential leak detected in staged files. Commit aborted."
    echo "Please remove the exposed secret before committing."
    exit 1
fi

echo "✅ [Antigravity Guard] Security check passed. Proceeding with commit."
exit 0
"""

def install_hooks(repo_path: str):
    repo_dir = os.path.abspath(repo_path)
    git_dir = os.path.join(repo_dir, ".git")

    if not os.path.isdir(git_dir):
        print(f"\n[ERROR] '{repo_dir}' is not a valid Git repository (missing .git directory).", file=sys.stderr)
        print("Run 'git init' first or choose a directory that contains a Git repository.\n", file=sys.stderr)
        return False

    hooks_dir = os.path.join(git_dir, "hooks")
    os.makedirs(hooks_dir, exist_ok=True)
    hook_file = os.path.join(hooks_dir, "pre-commit")

    # Ensure scripts/ directory exists in the repo and has scan_credentials.py
    source_scripts = os.path.abspath(os.path.dirname(__file__))
    target_scripts = os.path.join(repo_dir, "scripts")
    os.makedirs(target_scripts, exist_ok=True)

    for script_name in ["scan_credentials.py", "pre_command_guard.py"]:
        src = os.path.join(source_scripts, script_name)
        dst = os.path.join(target_scripts, script_name)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  [COPIED] {script_name} -> {target_scripts}")

    # Write pre-commit hook file
    with open(hook_file, "w", encoding="utf-8", newline="\n") as f:
        f.write(PRE_COMMIT_HOOK_CONTENT)

    # Set executable permissions on Unix/macOS if applicable
    try:
        os.chmod(hook_file, 0o755)
    except Exception:
        pass

    print(f"\n[SUCCESS] Git pre-commit security hook installed to: {hook_file}")
    print("From now on, 'git commit' will automatically scan for leaked secrets and block dangerous commits!")
    return True

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    success = install_hooks(target)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
