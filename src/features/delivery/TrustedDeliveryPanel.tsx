import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { apiFetch } from '../../utils/api';
import { inspectionFor, type TrustedPackingView } from '../packing/trustedPackingTypes';
import type { CompletionProgress, InstallationJob } from './completionTypes';
import type { TrustedDeliveryView } from './trustedDeliveryTypes';
import { TrustedManifestPreview } from '../packing/TrustedLabelPreview';
import { trustedDeliveryManifest } from './trustedDeliveryManifest';
import { trustedDeliveryLookup } from './trustedDeliveryLookup';
import { parseDeliveryRequest, type PendingDeliveryRequest } from './deliveryRecovery';
import '../packing/packingWorkspace.css';
const endpoint='/api/v1/production-planning',control='min-h-11 w-full rounded-xl border border-slate-300 bg-transparent p-3',button='min-h-11 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-40';
type Pending = PendingDeliveryRequest;
export default function TrustedDeliveryPanel({projectId}:{projectId?:string}) {
  const {currentUser}=useAuth(),storageKey=`delivery.pending.${currentUser?.organization_id}.${currentUser?.id}`;
  const context=`${storageKey}.${projectId}`,activeContext=useRef(context);activeContext.current=context;
  const inFlight=useRef(false),generation=useRef(0);
  const [recoveryBlocked,setRecoveryBlocked]=useState(false),[recoveryConfirmed,setRecoveryConfirmed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [packing,setPacking]=useState<TrustedPackingView>({enabled:false,plans:[],outputs:[]}),[view,setView]=useState<TrustedDeliveryView>({enabled:false,dispatches:[]});
  const [planId,setPlan]=useState(''),[dispatchId,setDispatch]=useState(''),[roots,setRoots]=useState<string[]>([]),[received,setReceived]=useState<string[]>([]);
  const [carrier,setCarrier]=useState(''),[vehicle,setVehicle]=useState(''),[planned,setPlanned]=useState(''),[recipient,setRecipient]=useState(''),[notes,setNotes]=useState(''),[when,setWhen]=useState(''),[scan,setScan]=useState('');
  const [confirmed,setConfirmed]=useState(false),[reconciled,setReconciled]=useState(false),[busy,setBusy]=useState(false),[pending,setPending]=useState<Pending|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [progress,setProgress]=useState<CompletionProgress|null>(null),[siteId,setSite]=useState(''),[required,setRequired]=useState(true),[task,setTask]=useState(''),[preview,setPreview]=useState('');
  const plans=packing.plans.filter(p=>!projectId||p.project_id===projectId),plan=plans.find(p=>p.id===planId),dispatches=view.dispatches.filter(d=>!projectId||d.project_id===projectId),dispatch=dispatches.find(d=>d.id===dispatchId);
  const project=projectId??plan?.project_id??dispatch?.project_id,school=progress?.schools.find(s=>s.site_id===siteId),job=school?.installation;
  const writer=['admin','super_admin'].includes(currentUser?.role??''),locked=busy||recoveryBlocked||!!pending||!writer||!view.enabled,closed=progress?.completion?.status==='closed';
  async function refresh() {
    const scope=context,version=generation.current;setReconciled(false);setRecoveryConfirmed(false);setConfirmed(false);
    const [p,d]=await Promise.all([apiFetch(`${endpoint}/trusted-packing`),apiFetch(`${endpoint}/trusted-delivery`)]);
    const nextProgress=project?await apiFetch(`${endpoint}/trusted-delivery/projects/${project}/progress`):null;
    if(scope!==activeContext.current||version!==generation.current)return;
    setPacking(p);setView(d);setProgress(nextProgress);setReconciled(true);
  }
  useEffect(()=>{let live=true;setLoading(true);generation.current++;setRecoveryBlocked(false);setRecoveryConfirmed(false);setReconciled(false);setPending(null);setPacking({enabled:false,plans:[],outputs:[]});setView({enabled:false,dispatches:[]});setError('');setMessage('');setNotes('');setRecipient('');setProgress(null);setPlan('');setDispatch('');setRoots([]);setReceived([]);setConfirmed(false);
    try{const saved=sessionStorage.getItem(storageKey);if(saved)setPending(parseDeliveryRequest(saved));}catch{setRecoveryBlocked(true);setError('Saved custody request cannot be read. Reconcile with an administrator.');}
    void Promise.all([apiFetch(`${endpoint}/trusted-packing`),apiFetch(`${endpoint}/trusted-delivery`)]).then(([p,d])=>{if(live){setPacking(p);setView(d);}}).catch(e=>{if(live)setError(String(e));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};
  },[storageKey,projectId]);
  useEffect(()=>{let live=true;setProgress(null);setSite('');if(project&&view.enabled)void apiFetch(`${endpoint}/trusted-delivery/projects/${project}/progress`).then(p=>{if(live)setProgress(p);}).catch(e=>{if(live)setError(String(e));});return()=>{live=false;};},[project,view.enabled]);
  useEffect(()=>{const id=new URLSearchParams(location.search).get('trusted_packing_package');if(id)setScan(id);},[]);
  const toggle=(ids:string[],id:string)=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
  const outstanding=dispatch?.roots.filter(id=>!dispatch.receipts.some(r=>r.roots.includes(id)))??[];
  const eligible=plan?.snapshot.packages.filter(p=>p.kind==='kit'&&inspectionFor(plan,p.id)?.decision==='accept'&&!view.dispatches.some(d=>d.plan_id===plan.id&&d.roots.includes(p.id)))??[];
  async function submit(request:Pending){
    if(inFlight.current||recoveryBlocked||!writer||!view.enabled)return;
    const scope=context,version=generation.current,current=()=>scope===activeContext.current&&version===generation.current;
    let acknowledged=false;
    inFlight.current=true;setBusy(true);setError('');setReconciled(false);setRecoveryConfirmed(false);
    try{
      sessionStorage.setItem(storageKey,JSON.stringify(request));setPending(request);
      const result=await apiFetch(endpoint+request.path,{method:'POST',headers:{'Idempotency-Key':request.key},body:JSON.stringify(request.input)});
      if(!current())return;
      acknowledged=true;
      sessionStorage.removeItem(storageKey);setPending(null);setConfirmed(false);setRoots([]);setReceived([]);
      setMessage(`Recorded evidence ${result.id}`);setView(v=>({...v,enabled:false}));await refresh();
    }catch(e){if(current())setError(`${String(e)}. ${acknowledged?'The request was recorded. Refresh delivery evidence before continuing.':'Retry the saved request unchanged, or refresh and reconcile before clearing.'}`);}
    finally{inFlight.current=false;setBusy(false);}
  }
  const write=(path:string,input:Record<string,unknown>)=>void submit({path:`/operator/delivery/${path}`,key:crypto.randomUUID(),input});
  function installation(action:string,extra:object={}){if(job)write('installation-actions',{id:job.id,input:{revision:job.revision,action,notes,...extra}});}
  function selectEvidence(plan:string,dispatch=''){generation.current++;setReconciled(false);setRecoveryConfirmed(false);setPlan(plan);setDispatch(dispatch);setRoots([]);setReceived([]);setConfirmed(false);setPreview('');setError('');setMessage('');setRecipient('');setNotes('');setWhen('');}
  function findScan(){selectEvidence('');try{const match=trustedDeliveryLookup(scan,location.origin,packing,view,projectId);selectEvidence(match.planId,match.dispatchId);setMessage(`School ${match.siteName}; verify the complete assembly before selecting it.`);}catch(e){setError(e instanceof Error?e.message:String(e));}}
  async function manifest(download:boolean){if(!dispatch)return;try{if(!download){setPreview(dispatch.id);return;}const pdf=await trustedDeliveryManifest(dispatch,location.origin);pdf.save(`dispatch-${dispatch.id}.pdf`);}catch(e){setError(String(e));}}
  return <section aria-label="Trusted dispatch, delivery and closure" className="precision packing-workspace space-y-4 rounded-2xl border border-slate-300 p-4">
    <h3 className="text-lg font-semibold">Dispatch, school receipt and closure</h3><p>Dispatch holds custody. Record school receipt separately, then submit installation and obtain recipient acceptance.</p>
    {loading?<p role="status">Loading authorized delivery evidence…</p>:!view.enabled&&!error&&<p role="status">Trusted delivery is unavailable in this environment.</p>}{error&&<p role="alert">{error}</p>}{message&&<p role="status" className="break-all">{message}</p>}
    <button className={button} disabled={busy} onClick={()=>void refresh().catch(e=>setError(String(e)))}>Refresh delivery evidence</button>
    {pending&&<div className="break-all"><p>Saved request: {pending.key}</p><button className={button} disabled={busy||!writer||!view.enabled} onClick={()=>void submit(pending)}>Retry saved delivery request</button><label className="block"><input type="checkbox" checked={recoveryConfirmed} onChange={e=>setRecoveryConfirmed(e.target.checked)}/> I refreshed and reconciled this request.</label><button className={button} disabled={busy||!writer||!recoveryConfirmed||!reconciled} onClick={()=>{try{sessionStorage.removeItem(storageKey);setPending(null);setRecoveryConfirmed(false);}catch(e){setError(String(e));}}}>Clear reconciled delivery request</button></div>}
    <label className="block">Package label<input className={control} value={scan} onChange={e=>setScan(e.target.value)} placeholder="PK-… or package UUID"/></label><button className={button} disabled={busy} onClick={findScan}>Find dispatch package</button>
    <label className="block">Dispatch school plan<select className={control} value={planId} disabled={busy} onChange={e=>{selectEvidence(e.target.value);}}><option value="">Select frozen school plan</option>{plans.map(p=><option key={p.id} value={p.id}>{p.snapshot.project_name} / {p.snapshot.site_name} · r{p.demand_revision}</option>)}</select></label>
    {plan&&<fieldset disabled={locked||closed}><legend>Eligible complete assemblies ({eligible.length} remaining)</legend>{eligible.map(p=><label key={p.id} className="flex min-h-11 items-center gap-3 break-all"><input type="checkbox" checked={roots.includes(p.id)} onChange={()=>{setRoots(toggle(roots,p.id));setConfirmed(false);}}/>{p.name} #{p.pack_number} · {p.code}</label>)}
      <label className="block">Carrier<input className={control} maxLength={200} value={carrier} onChange={e=>{setCarrier(e.target.value);setConfirmed(false);}}/></label><label className="block">Vehicle<input className={control} maxLength={200} value={vehicle} onChange={e=>{setVehicle(e.target.value);setConfirmed(false);}}/></label><label className="block">Planned dispatch time<input className={control} type="datetime-local" value={planned} onChange={e=>{setPlanned(e.target.value);setConfirmed(false);}}/></label>
      <button className={button} disabled={!confirmed||!roots.length||!carrier.trim()||!vehicle.trim()||!planned} onClick={()=>write('dispatches',{plan:plan.id,roots,transport:{carrier,vehicle,planned_date:new Date(planned).toISOString(),notes}})}>Confirm dispatch custody</button>
    </fieldset>}
    <label className="block">Dispatched school assemblies<select className={control} value={dispatchId} disabled={busy} onChange={e=>{selectEvidence(dispatches.find(d=>d.id===e.target.value)?.plan_id??'',e.target.value);}}><option value="">Select dispatch</option>{dispatches.map(d=><option key={d.id} value={d.id}>{d.snapshot.site_name} · {d.id} · {d.roots.length} assemblies</option>)}</select></label>
    {dispatch&&<><p>{dispatch.roots.length-outstanding.length} acknowledged / {dispatch.roots.length} dispatched</p><ul>{dispatch.receipts.map(r=><li key={r.id} className="break-all">{r.roots.length} received by {r.recipient} at {r.acknowledged_at} · {r.acknowledgement}</li>)}</ul>
      <button className={button} onClick={()=>void manifest(false)}>Preview dispatch manifest</button><button className={button} onClick={()=>void manifest(true)}>Download dispatch manifest</button>
      <fieldset disabled={locked||closed}><legend>Actually received assemblies</legend>{outstanding.map(id=><label key={id} className="flex min-h-11 items-center gap-3 break-all"><input type="checkbox" checked={received.includes(id)} onChange={()=>{setReceived(toggle(received,id));setConfirmed(false);}}/>{dispatch.snapshot.packages.find(p=>p.id===id)?.code}</label>)}<label className="block">Actual receiving time<input className={control} type="datetime-local" value={when} onChange={e=>{setWhen(e.target.value);setConfirmed(false);}}/></label><button className={button} disabled={!confirmed||!received.length||!recipient.trim()||!notes.trim()||!when} onClick={()=>write('acknowledgments',{dispatch:dispatch.id,roots:received,recipient,acknowledged_at:new Date(when).toISOString(),acknowledgement:notes,source:crypto.randomUUID()})}>Record evidenced school receipt</button></fieldset></>}
    <label className="block">Recipient (for receipt or acceptance)<input className={control} maxLength={200} value={recipient} onChange={e=>{setRecipient(e.target.value);setConfirmed(false);}}/></label><label className="block">Evidence / notes<textarea className={control} maxLength={2000} value={notes} onChange={e=>{setNotes(e.target.value);setConfirmed(false);}}/></label>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I verified the selected physical units, school and evidence for this action.</label>
    {progress&&<><h4>School installation and project closure</h4><ul>{progress.schools.map(s=><li key={s.site_id}>{s.name}: {s.delivered}/{s.packages} received · {s.installation?.status??'requirement undecided'} · {s.issues} unresolved issues</li>)}</ul><label className="block">Installation school<select className={control} value={siteId} disabled={busy} onChange={e=>{setSite(e.target.value);setConfirmed(false);setNotes('');setRecipient('');setTask('');setRequired(true);}}><option value="">Select school</option>{progress.schools.map(s=><option key={s.site_id} value={s.site_id}>{s.name}</option>)}</select></label>
      {school&&!job&&<fieldset disabled={locked||closed}><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={required} onChange={e=>{setRequired(e.target.checked);setConfirmed(false);}}/> Installation required</label><label className="block">Required installation task<input className={control} value={task} onChange={e=>{setTask(e.target.value);setConfirmed(false);}}/></label><button className={button} disabled={!confirmed||!notes.trim()||school.delivered===0||(required&&!task.trim())} onClick={()=>write('installations',{project_id:progress.project_id,site_id:siteId,required,checklist:required?[{id:crypto.randomUUID(),label:task,required:true}]:[],survey:notes})}>Record installation requirement</button></fieldset>}
      {job&&<InstallationControls job={job} delivered={school?.remaining===0} disabled={locked||closed||!confirmed} notes={notes} recipient={recipient} act={installation}/>}
      {!!progress.reconciliation?.length&&<div className="overflow-x-auto"><table><caption>Demand reconciliation: U = A - F - H. Material and slot custody remain separate.</caption><thead><tr>{['School','Dimension','Item / unit','Approved A','Fulfilled F','Held H','Remaining U','Claim holds'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{progress.reconciliation.map(r=><tr key={r.account_id}><td>{progress.schools.find(s=>s.site_id===r.site_id)?.name??r.site_id}</td><td>{r.dimension}</td><td>{r.item_key} / {r.unit}</td><td>{r.approved}</td><td>{r.fulfilled}</td><td>{r.held}</td><td>{r.uncommitted}</td><td>{r.claim_held}</td></tr>)}</tbody></table></div>}
      <details><summary>Installation and closure audit history ({progress.history.length})</summary>{progress.history.map((event,index)=><details key={`${event.kind}.${event.revision}.${index}`}><summary>{event.kind} - revision {event.revision}</summary><pre className="whitespace-pre-wrap break-all">{JSON.stringify(event.snapshot,null,2)}</pre></details>)}</details>
      <ul>{progress.blockers.map(b=><li key={b}>{b}</li>)}</ul><p>Project: {closed?'closed':'active'}</p><button className={button} disabled={locked||closed||!confirmed||!!progress.blockers.length||!notes.trim()||!recipient.trim()} onClick={()=>write('closure',{project:progress.project_id,input:{revision:progress.completion?.revision??0,project_revision:progress.project_revision,action:'close',recipient,notes}})}>Record recipient acceptance and close project</button>
    </>}{preview===dispatch?.id&&dispatch&&<TrustedManifestPreview dispatch={dispatch}/>}
  </section>;
}
function InstallationControls({job,delivered,disabled,notes,recipient,act}:{job:InstallationJob;delivered:boolean;disabled:boolean;notes:string;recipient:string;act:(action:string,extra?:object)=>void}) {
  return <fieldset disabled={disabled}><legend>Installation: {job.status} · revision {job.revision}</legend>{job.checklist.map(t=><label key={t.id} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={t.checked} disabled={['installed','completed'].includes(job.status)} onChange={e=>act('check',{task_id:t.id,checked:e.target.checked})}/>{t.label}{t.required?' (required)':''}</label>)}
    {job.issues.map(i=><div key={i.id}><p>{i.notes} · {i.corrected_by?'corrected':'unresolved'}</p>{!i.corrected_by&&<button className={button} disabled={!notes.trim()} onClick={()=>act('correct',{issue_id:i.id})}>Record issue correction</button>}</div>)}
    {['installed','completed','blocked'].includes(job.status)&&<button className={button} disabled={!notes.trim()} onClick={()=>act('reopen')}>Reopen installation with evidence</button>}
    {!delivered&&<p role="status">Complete school delivery before submitting installation.</p>}
    <button className={button} disabled={!notes.trim()||job.status==='completed'} onClick={()=>act('issue')}>Report installation issue</button><button className={button} disabled={!notes.trim()||['installed','completed'].includes(job.status)} onClick={()=>act('note')}>Save installation evidence</button><button className={button} disabled={!delivered||job.checklist.some(t=>t.required&&!t.checked)||job.issues.some(i=>!i.corrected_by)||['installed','completed'].includes(job.status)} onClick={()=>act('finish')}>Submit installer completion</button><button className={button} disabled={job.status!=='installed'||!notes.trim()||!recipient.trim()} onClick={()=>act('accept',{recipient})}>Record installation recipient acceptance</button>
  </fieldset>;
}
