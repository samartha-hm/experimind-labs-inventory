# Resource Library — Official References and Engineering Patterns

**Do not copy code from third-party projects unless licensing/compliance is checked.** These are learning/reference documents, not required paid dependencies.

## IDE agent continuity

- AGENTS.md conventions and Codex project instruction support: https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide
- Codex ExecPlans: https://developers.openai.com/cookbook/articles/codex_exec_plans
- Cursor project rules (.cursor/rules/*.mdc): https://docs.cursor.com/context/rules
- GitHub Copilot repository instructions: https://docs.github.com/en/copilot/how-tos/copilot-in-your-ide/customize-copilot/configure-custom-instructions/add-repository-instructions-in-your-ide
- Copilot CLI repo instructions: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions

The handover uses short tool-neutral root `AGENTS.md`, adapters for other coding IDEs, and durable `.agent/PROJECT_STATE.md`/`SESSION_HANDOFF.md`/`NEXT_TASK.md`. Long specification lives in `docs/erp` to avoid flooding every model context.

## Engineering

- PostgreSQL transactions/locking: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL SELECT locking: https://www.postgresql.org/docs/current/sql-select.html
- TypeORM: https://typeorm.io/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OpenTelemetry (optional): https://opentelemetry.io/docs/
- Node built-in test runner: https://nodejs.org/api/test.html
- npm audit: https://docs.npmjs.com/cli/npm-audit/

## ERP domain references (concept only, not mandatory software)

- ERPNext documentation: https://docs.frappe.io/erpnext/
- Tryton modular ERP documentation: https://docs.tryton.org/
- Odoo documentation: https://www.odoo.com/documentation/

## Project-specific source

- Original GitHub repository: https://github.com/samartha-hm/experimind-labs-inventory
- User-confirmed Experimind business/ERP requirements are consolidated in this handover; real product BOM, customer data and live database are NOT supplied.

## License principle

Use license-compatible open-source software for app/runtime; hosting/ISP/payment/email costs may remain. Verify current license of every dependency rather than assuming “GitHub = open source” or “free to use = free to redistribute.” Do not redistribute the original repository without checking its license/access rights.
