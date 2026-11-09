# Next bounded task: draft-save conflict recovery

Read SESSION_HANDOFF and the relevant dynamic builder acceptance sections linked by docs/erp/INDEX.md. Audit ProductLibrary and Studio draft-save conflict handling and uncertain network responses. Reproduce the first required gap, then make a minimal fix with targeted regression tests. Preserve unsaved local changes; avoid automatic replay, overwriting newer revisions or duplicate creation. Ensure approval uses a fresh authoritative revision where required. Do not assume a bug before reproduction.

Keep staff-configurable items/templates, published-version immutability and tenant/RBAC boundaries. No Prastuti workbook blocker or unapproved O1-O10 machinery. Search GitHub and compare approaches before implementing unfamiliar features.

Continued development and feature pushes authorized; no merge, deployment or company database mutation. D6 BLOCKED, pilot NO-GO; provenance, physical and intended-host recovery remain unresolved. Explicitly stage intended files; exclude private/generated artifacts and secrets. Last verified code checkpoint: 9d8a134ca03f90bd0f28fe85845fccfda13f8694. Commit/push/verify code and handoff separately.
