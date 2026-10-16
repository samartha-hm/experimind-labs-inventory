import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PackingInspection, inspectionSnapshot } from '../PackingInspection';
import { packingInspectionBlocker } from '../workspaceContract';
import type { PackingDetail } from '../packingTypes';

describe('Packing inspection evidence', () => {
  it('distinguishes absent results, rejected results and snapshot event attribution', () => {
    const progress = { assembled: true, qc: 'rejected', checked_by: 'inspector', checked_at: 'inspection-time', checks: { material: true, quantity: false }, notes: 'Damaged seal' };
    const detail = { order: { execution: { progress: { pkg: progress } } }, history: [{ revision: 7, actor_id: 'event-actor', created_at: 'event-time', snapshot: { execution: { progress: { pkg: progress } } } }] } as unknown as PackingDetail;
    const html = renderToStaticMarkup(React.createElement(PackingInspection, { detail, selected: 'pkg' }));
    expect(html).toContain('Fail · rejected by server');
    expect(html).toContain('Recorded pass'); expect(html).toContain('Recorded fail');
    expect(html).toContain('Needs attention · no recorded result');
    expect(html).toContain('event-actor'); expect(html).toContain('inspector');
    expect(html).toContain('not a complete list of inspection attempts');
    expect(html).toContain('Final QC acceptance unavailable');
    expect(renderToStaticMarkup(React.createElement(PackingInspection, { detail, selected: 'uninspected' }))).toContain('Needs attention · inspection pending');
  });
  it('ignores unavailable or malformed snapshot envelopes', () => {
    for (const value of [null, {}, { execution: null }, { execution: { progress: null } }, { execution: { progress: { pkg: { qc: 'unknown' } } } }]) expect(inspectionSnapshot(value, 'pkg')).toBeUndefined();
  });
  it('requires an inspector, assembly, active packing and unaccepted ancestry', () => {
    const order = { status: 'packing', snapshot: { packages: [{ id: 'root', parent_id: null }, { id: 'pkg', parent_id: 'root' }] }, execution: { progress: { pkg: { assembled: true, qc: 'pending' } } } } as unknown as PackingDetail['order'];
    expect(packingInspectionBlocker(order, 'pkg', 'staff')).toMatch(/authorized/);
    for (const role of ['admin', 'super_admin', 'manager', 'inventory_staff']) expect(packingInspectionBlocker(order, 'pkg', role)).toBeNull();
    order.execution.progress.pkg.assembled = false;
    expect(packingInspectionBlocker(order, 'pkg', 'admin')).toMatch(/Assemble/);
    order.execution.progress.root = { assembled: true, qc: 'accepted' };
    expect(packingInspectionBlocker(order, 'pkg', 'admin')).toMatch(/Accepted/);
    order.status = 'ready'; expect(packingInspectionBlocker(order, 'pkg', 'admin')).toMatch(/Active packing/);
  });
});
