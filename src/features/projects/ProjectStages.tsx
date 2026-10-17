import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../utils/api';
import type { CompletionProgress } from '../delivery/completionTypes';
import type { PackingDetail, PackingOrderSummary, PackageProgress } from '../packing/packingTypes';
import type { ProductionWorkOrder } from '../../entity/ProductionPlanning';
import type { ProjectStockReservation, PurchaseRequest } from '../../entity/SupplyPlanning';
import type { PurchaseOrder } from '../../entity/PurchaseOrder';

type Evidence<T> = { value?: T; error?: string };
async function read<T>(path: string): Promise<Evidence<T>> {
  try { return { value: await apiFetch(path) as T }; } catch (e) { return { error: e instanceof Error ? e.message : 'Unavailable' }; }
}
export function ProjectStages({ project, site, revision }: { project: string; site: string; revision: number; key?: string }) {
  const [data, setData] = useState<{
    completion: Evidence<CompletionProgress>; packing: Evidence<PackingOrderSummary[]>;
    production: Evidence<{ orders: ProductionWorkOrder[] }>;
    supply: Evidence<{ reservations: ProjectStockReservation[]; requests: PurchaseRequest[]; orders: PurchaseOrder[] }>;
  }>();
  const [pack, setPack] = useState<Evidence<PackingDetail>>();
  const packingRequest = useRef(0);
  const [packingBusy, setPackingBusy] = useState(false);
  async function inspectPacking(id: string) {
    const request = ++packingRequest.current;
    setPack(undefined); setPackingBusy(true);
    const result = await read<PackingDetail>(`/api/v1/packing/orders/${id}`);
    if (request === packingRequest.current) { setPack(result); setPackingBusy(false); }
  }
  useEffect(() => {
    let live = true; setData(undefined); setPack(undefined);
    void Promise.all([
      read<CompletionProgress>(`/api/v1/delivery/projects/${project}`),
      read<PackingOrderSummary[]>('/api/v1/packing'),
      read<{ orders: ProductionWorkOrder[] }>('/api/v1/production-planning'),
      read<{ reservations: ProjectStockReservation[]; requests: PurchaseRequest[]; orders: PurchaseOrder[] }>(`/api/v1/supply-planning?project=${project}`),
    ]).then(([completion, packing, production, supply]) => { if (live) setData({ completion, packing, production, supply }); });
    return () => { live = false; packingRequest.current++; };
  }, [project, site, revision]);
  if (!data) return <p role="status">Loading authorized stage evidence…</p>;
  const school = data.completion.value?.schools.find(s => s.site_id === site);
  const orders = data.packing.value?.filter(p => p.project_id === project && p.site_id === site);
  const production = data.production.value?.orders.filter(o => o.project_id === project && o.site_id === site);
  const error = (e?: string) => e ? <p role="status">Evidence unavailable or permission denied: {e}</p> : null;
  return <section aria-label="School stage evidence" className="pj-stages">
    <h4>Operational evidence · school context</h4><p>Independent API snapshots. Refresh to reconcile. Lists show at most 200 records; missing records do not prove completion.</p>
    <div><h5>Production</h5>{error(data.production.error)}{production?.length ? production.map(o => <p key={o.id}>{o.number}: {o.status} · planned {o.planned_quantity} {o.unit} · requirement revision {o.demand_revision ?? 'Unknown'}{o.demand_revision !== revision ? ' · stale / unlinked requirement revision' : ''}</p>) : !data.production.error && <p>No linked production evidence in returned records.</p>}</div>
    <div><h5>Packing and QC</h5>{error(data.packing.error)}{orders?.length ? orders.map(o => <div key={o.id}><p>{o.number} · {o.status} · packing revision {o.revision}</p><button onClick={() => void inspectPacking(o.id)}>Inspect {o.number} evidence</button></div>) : !data.packing.error && <p>No linked packing evidence in returned records.</p>}{packingBusy && <p role="status">Loading packing evidence…</p>}
      {pack && error(pack.error)}{pack?.value && <div><p>Requirement revision {pack.value.order.demand_revision ?? 'Unknown'}{pack.value.order.demand_revision !== revision ? ' · stale / unlinked' : ''}. Quantities below retain server units.</p>{pack.value.materials.map(m => <p key={`${m.item_id}/${m.unit}`}>{m.name}: required {m.planned}, assembled {m.assembled}, inspected {m.checked}, completed {m.completed} {m.unit}</p>)}<p>Unresolved packing exceptions: {pack.value.order.execution.exceptions.filter(e => !e.corrected_by).length}</p>{(Object.entries(pack.value.order.execution.progress) as [string, PackageProgress][]).map(([id, p]) => <p key={id}>Package {id}: {p.qc} · inspector {p.checked_by || 'Not recorded'} · {p.checked_at || 'No inspection time'}</p>)}</div>}
    </div>
    <div><h5>Delivery and installation</h5>{error(data.completion.error)}{school ? <><p>Server receipt summary: {school.delivered} / {school.packages} packages · {school.delivery_status} · {school.remaining} remaining · {school.issues} unresolved issues</p><p>Installation: {school.installation ? `${school.installation.status} · required: ${school.installation.required ? 'yes' : 'no'} · acceptance: ${school.installation.acceptance?.recipient || 'not recorded'}` : 'No installation evidence; requirement unknown'}</p></> : !data.completion.error && <p>School stage evidence unavailable.</p>}
      {data.completion.value && <><p>Completion record: {data.completion.value.completion?.status || 'Not recorded'} · project revision {data.completion.value.project_revision}{data.completion.value.project_revision !== revision ? ' · stale context, refresh' : ''}</p><details><summary>Server completion blockers and provenance</summary><p>These blockers are a server summary, not permission to release or close this project.</p><ul>{data.completion.value.blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>{data.completion.value.completion && <p>Last actor {data.completion.value.completion.updated_by} · reason {data.completion.value.completion.reason || 'Not recorded'} · acceptance {data.completion.value.completion.acceptance?.accepted_by || 'Not recorded'}</p>}<p>{data.completion.value.history.length} installation/completion snapshots available from the server.</p></details></>}
    </div>
    <div><h5>Reservations and purchasing</h5>{error(data.supply.error)}{data.supply.value && <><p>Project/site reservations in returned records:</p>{data.supply.value.reservations.filter(r => r.project_id === project && r.site_id === site).map(r => <p key={r.id}>{r.quantity} {r.unit} · {r.status} · item {r.item_id} · revision {r.revision}</p>)}<p>Purchase requests with explicit project/site lines:</p>{data.supply.value.requests.filter(r => r.lines.some(l => l.project_id === project && l.site_id === site)).map(r => <p key={r.id}>{r.pr_number}: {r.status} · revision {r.revision}</p>)}<p>Purchase orders with explicit project/site lines:</p>{data.supply.value.orders.filter(o => o.planning_lines?.some(l => l.project_id === project && l.site_id === site)).map(o => <p key={o.id}>{o.po_number}: {o.status}</p>)}<p>Empty lists mean no linked evidence returned. Incoming quantities in demand preview are authoritative; unrelated purchasing is excluded.</p></>}</div>
  </section>;
}
