export const readinessStatuses = ["NOT STARTED", "IN PROGRESS", "VERIFIED", "FAILED", "BLOCKED", "NOT APPLICABLE"] as const;
export type ReadinessStatus = typeof readinessStatuses[number];
export const staffAcceptance = [
  ["Warehouse", "inventory_staff", "Identify SKU, canonical unit and shelf; count blind, recount a variance and review unknown stock"],
  ["Purchasing", "manager", "Approve demand, create PR/PO and demonstrate partial receipt with rejected QC"],
  ["Production", "staff", "Claim work, issue material once and record finished-output custody"],
  ["Packing", "staff", "Allocate school-specific output; verify common/universal crates and independent Math orders"],
  ["QC", "manager", "Perform all six packing checks; reject and correct a deliberate defect"],
  ["Dispatch", "manager", "Match school, package identity and manifest; reject duplicate scans"],
  ["School delivery", "project_staff", "Record partial then final acknowledgment; verify closure remains blocked while incomplete"],
  ["Installation", "project_staff", "Record installation and recipient acceptance against the correct school"],
  ["ERP administration", "admin", "Demonstrate role denial, backup recovery, health checks and controlled rollback"],
] as const;
export const hardwareAcceptance = [
  "Verify QR identity against human-readable school, project and package identity",
  "Measure printed label dimensions and quiet zones; record printer model, driver, media and scale",
  "Scan common and universal crate labels; confirm Math has no Science crates",
  "Scan duplicate, invalid, damaged and wrong-school labels; verify rejection without a second effect",
  "Record scanner model, input mode, terminator, focus behavior and repeated scans",
  "Disconnect network; confirm no operational acceptance offline, reconnect and reconcile before retry",
] as const;
export interface OperationalGate { id: string; label: string; status: ReadinessStatus; next_action: string }
export function operationalGates(sessionCount: number): OperationalGate[] {
  const blocked = (id: string, label: string, next_action: string): OperationalGate => ({id, label, status: "BLOCKED", next_action});
  return [
    {id: "d5", label: "D5 software acceptance", status: "VERIFIED", next_action: "Recorded D5 synthetic acceptance only; see D5 report. This is not a fresh D6 test result."},
    {id: "stocktake", label: "Warehouse stocktake completeness", status: sessionCount ? "IN PROGRESS" : "NOT STARTED", next_action: "Count every declared physical location; independently review discrepancies. Database counts do not prove physical acceptance."},
    blocked("opening", "Opening-balance authorization", "Obtain separate explicit operational authorization; this screen cannot post balances."),
    blocked("historical", "Historical source reconciliation", "Review authoritative source documents and mapping; historical activation remains disabled."),
    blocked("printer", "QR printer validation", "Run physical print tests and retain device, dimensions, label samples and authorized reviewer evidence."),
    blocked("scanner", "Scanner validation", "Run actual device scenarios; synthetic QR decoding cannot establish device acceptance."),
    blocked("staff", "Staff training and sign-offs", "Assign named authenticated operators and independent supervisors; complete practical role scenarios."),
    blocked("credentials", "Runtime credentials and access", "Provision restricted runtime, identity, writer and migration roles under separate operational authorization."),
    blocked("recovery", "Backup/restore evidence", "Retain paired database/private-file backup and authenticated fresh-restore reconciliation evidence."),
    blocked("security", "Security configuration", "Review LAN ACLs, HTTPS, session revocation, host and private-file permissions."),
    blocked("deployment", "Deployment prerequisites", "Run read-only preflight and review warnings; rehearse startup, shutdown and rollback in isolation."),
    blocked("pilot", "Operational pilot approval", "NO-GO: explicit business approval and all real-world evidence are required. No GO transition exists here."),
  ];
}
