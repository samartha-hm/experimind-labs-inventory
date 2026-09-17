#!/usr/bin/env python3
"""
Credential & Secret Leak Scanner for Antigravity Agents
Scans modified files or git status to prevent accidental secret leakage.
"""
import sys
import os
import re
import subprocess

SECRET_PATTERNS = [
    (r"(?i)aws_access_key_id\s*=\s*['\"]?(AKIA[0-9A-Z]{16})['\"]?", "AWS Access Key ID"),
    (r"(?i)aws_secret_access_key\s*=\s*['\"]?([0-9a-zA-Z/+]{40})['\"]?", "AWS Secret Access Key"),
    (r"\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})\b", "GitHub Personal Access Token"),
    (r"\bAIza[0-9A-Za-z-_]{35}\b", "Google API Key"),
    (r"\bsk-[a-zA-Z0-9]{32,}\b", "OpenAI/Anthropic API Key"),
    (r"-----BEGIN (RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----", "Private Cryptographic Key"),
]

def redact(val: str) -> str:
    if len(val) <= 8:
        return "****"
    return val[:4] + "*" * (len(val) - 8) + val[-4:]

def scan_text(text: str, filename: str = "input"):
    findings = []
    lines = text.splitlines()
    for idx, line in enumerate(lines, 1):
        for pattern, desc in SECRET_PATTERNS:
            matches = re.finditer(pattern, line)
            for m in matches:
                secret_val = m.group(0)
                findings.append((filename, idx, desc, redact(secret_val)))
    return findings

def scan_git_status():
    findings = []
    try:
        # Check for untracked or staged .env or secret files
        res = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, check=False)
        for line in res.stdout.splitlines():
            status = line[:2]
            filepath = line[3:].strip()
            if any(filepath.endswith(ext) for ext in [".env", ".pem", ".key", "id_rsa"]):
                findings.append((filepath, 0, "Sensitive credential/environment file detected in git status", filepath))
    except Exception:
        pass
    return findings

def main():
    findings = []
    if len(sys.argv) > 1:
        target = sys.argv[1]
        if os.path.isfile(target):
            with open(target, "r", encoding="utf-8", errors="ignore") as f:
                findings.extend(scan_text(f.read(), target))
    else:
        # Default: scan git status and staged diff if git repository exists
        findings.extend(scan_git_status())
        try:
            diff_res = subprocess.run(["git", "diff", "--cached"], capture_output=True, text=True, check=False)
            if diff_res.stdout:
                findings.extend(scan_text(diff_res.stdout, "staged diff"))
        except Exception:
            pass

    if findings:
        print("\n🚨 [SECURITY ALERT] Credential Leak Detected (Values Redacted):", file=sys.stderr)
        for fn, line, desc, red in findings:
            loc = f":{line}" if line > 0 else ""
            print(f"   -> {fn}{loc} | {desc} (value: {red})", file=sys.stderr)
        print("Please remove the secret from your workspace before proceeding.\n", file=sys.stderr)
        sys.exit(1)

    sys.exit(0)

if __name__ == "__main__":
    main()
