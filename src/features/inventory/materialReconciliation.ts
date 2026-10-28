/** Diagnostics never propose balancing entries or infer an ownership transfer. */
export type EvidenceRow = Record<string, unknown>;
export interface EvidenceLane { source: string; available: boolean; truncated: boolean; rows: EvidenceRow[] }
export type IssueKind = 'missing provenance' | 'unapproved transfer authority' | 'conflicting claims' | 'stale source' | 'incomplete delivery' | 'unresolved disposition';
export interface MaterialIssue { kind: IssueKind; source: string; identity: string; detail: string }
export interface MaterialReconciliation {
  mode: 'read_only'; contract: 'DRAFT / NOT AUTHORIZED'; software: 'BLOCKED'; pilot: 'NO-GO';
  project: EvidenceRow; lanes: EvidenceLane[]; issues: MaterialIssue[]; closureBlockers: string[]; witnessHash: string;
}
// Commitment quantities permit six decimal places and exceed physical stock ranges.
export function exactQuantity(value: unknown): bigint {
  if (typeof value !== 'string' || !/^-?\d+(\.\d{1,6})?$/.test(value)) throw Error('Exact decimal quantity required');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const result = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  return negative ? -result : result;
}
export function diagnoseMaterial(lanes: EvidenceLane[], revision: number): MaterialIssue[] {
  const issues: MaterialIssue[] = [];
  const add = (kind: IssueKind, source: string, row: EvidenceRow, detail: string) => issues.push({kind, source, identity: String(row.id ?? row.account_id ?? row.issue_id ?? row.receipt_id ?? 'unavailable'), detail});
  const rows = (name: string) => lanes.find(l => l.source === name)?.rows ?? [];
  for (const lane of lanes) {
    if (!lane.available || lane.truncated) add('missing provenance', lane.source, {}, lane.available ? 'Evidence exceeds page limit; reconciliation is incomplete' : 'Source unavailable; absence is not a zero balance');
  }
  for (const a of rows('accounts')) {
    if (a.approved === null) add('missing provenance', 'accounts', a, 'Balance cache absent; claims still block closure');
    else if (exactQuantity(a.approved) < exactQuantity(a.fulfilled) + exactQuantity(a.held)) add('conflicting claims', 'accounts', a, 'Approved demand is below fulfilled plus held');
    if (exactQuantity(a.claim_held) !== 0n || (a.held !== null && exactQuantity(a.held) !== 0n)) add('unresolved disposition', 'accounts', a, `Residual account/claim hold; ${a.unit}; school ${a.site_id}`);
    if (a.held !== null && exactQuantity(a.held) !== exactQuantity(a.claim_held)) add('conflicting claims', 'accounts', a, 'Claim holds disagree with balance cache');
    if (a.dimension === 'slot' && (a.approved === null || exactQuantity(a.approved) !== exactQuantity(a.fulfilled))) add('incomplete delivery', 'accounts', a, 'School entitlement is not fully fulfilled');
  }
  for (const e of rows('entitlements')) if (Number(e.revision) !== revision) add('stale source', 'entitlements', e, 'Approval revision differs from current project; retain historical witness');
  for (const c of rows('reconciliation_cases')) add('missing provenance','reconciliation_cases',c,'Unsupported historical evidence remains inactive; no inferred ownership or discharge');
  for (const i of rows('issues')) add('unapproved transfer authority', 'issues', i, 'Physical issue is evidence of consumption only. No approved procurement-to-production ownership link or payables discharge is established');
  for (const c of rows('claims')) {
    if (!c.retired && exactQuantity(c.quantity) !== exactQuantity(c.held) + exactQuantity(c.fulfilled) + exactQuantity(c.released)) add('conflicting claims', 'claims', c, 'Claim conservation failed');
    if (String(c.source_kind).startsWith('synthetic:')) add('missing provenance', 'claims', c, 'Synthetic source is not an approved historical ownership link');
  }
  const coverage = rows('coverage');
  for (let i = 0; i < coverage.length; i++) {
    const a = coverage[i];
    if (exactQuantity(a.start_quantity) < 0n || exactQuantity(a.end_quantity) <= exactQuantity(a.start_quantity)) add('conflicting claims', 'coverage', a, 'Invalid half-open source interval');
    for (const b of coverage.slice(i + 1)) if (a.claim_id === b.claim_id && a.source_slice === b.source_slice && exactQuantity(a.start_quantity) < exactQuantity(b.end_quantity) && exactQuantity(b.start_quantity) < exactQuantity(a.end_quantity)) add('conflicting claims', 'coverage', a, `Overlapping source interval with ${b.id}; PO coverage is a subset of PR H`);
  }
  return issues;
}
