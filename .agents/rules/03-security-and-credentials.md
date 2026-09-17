# Security & Credential Hygiene Standards

## 1. Zero-Trust Credential Management
- **Never Hardcode Secrets**: API keys, database passwords, OAuth secrets, and private keys must never be committed to source control or printed in cleartext terminal output.
- **Environment Isolation**: Read sensitive values from environment variables (`process.env`, `os.environ`).
- **Git Protection**: Ensure all `.env`, `*.pem`, `*.key`, `id_rsa`, and credentials files are listed in `.gitignore`.

## 2. Input Sanitization & Injection Prevention
- **SQL / NoSQL Injection**: Always use parameterized queries, prepared statements, or ORM/query builder abstractions. Never concatenate user input directly into SQL strings.
- **Command Injection**: When invoking system commands, pass arguments as discrete array tokens rather than executing raw interpolated shell strings.
- **Cross-Site Scripting (XSS)**: Escape dynamic content rendered in HTML templates and enforce strict Content Security Policies (CSP).

## 3. Dependency Security
- Pin package versions and review dependency audit reports (`npm audit`, `pip audit`) before introducing new third-party packages.
