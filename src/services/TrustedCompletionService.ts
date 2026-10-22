import type { EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { ProjectCompletionService } from './ProjectCompletionService';
import type { LedgerContext } from './CommitmentLedgerService';
import type { CompletionProgress, InstallationJob, ProjectCompletion } from '../features/delivery/completionTypes';

/** Reuses installation transitions; only the evidence reader and transaction boundary differ. */
export class TrustedCompletionService extends ProjectCompletionService {
  constructor(private readonly manager: EntityManager) { super(manager); }
  protected override async operation<T>(_org:string,_actor:string,_key:string,_input:unknown,run:(m:EntityManager)=>Promise<T>):Promise<T> {
    return run(this.manager);
  }
  protected override async hasSchoolDelivery(m:EntityManager,org:string,project:string,site:string) {
    return (await m.query(`SELECT 1 FROM trusted_delivery_receipts r JOIN trusted_dispatches d ON d.id=r.dispatch_id
      JOIN trusted_packing_plans p ON p.id=d.plan_id WHERE p.organization_id=$1 AND p.project_id=$2 AND p.site_id=$3 LIMIT 1`,[org,project,site])).length>0;
  }
  protected override async progress(m:EntityManager,org:string,project:string):Promise<CompletionProgress> {
    return trustedProjectProgress(m,org,project);
  }
}

export async function trustedProjectProgress(m:EntityManager,org:string,id:string):Promise<CompletionProgress> {
  const [project]=await m.query('SELECT revision FROM planning_projects WHERE id=$1 AND organization_id=$2 AND archived_at IS NULL',[id,org]);
  if(!project)throw Error('Active tenant project required');
  const sites:{id:string;content:{name:string}}[]=await m.query('SELECT id,content FROM planning_sites WHERE organization_id=$1 AND project_id=$2 ORDER BY position',[org,id]);
  const installations:InstallationJob[]=await m.query('SELECT * FROM site_installations WHERE organization_id=$1 AND project_id=$2',[org,id]);
  const blockers:string[]=[],schools:CompletionProgress['schools']=[];
  if(!sites.length)blockers.push('Project has no schools');
  for(const site of sites) {
    const [{expected,received}]=await m.query(`SELECT count(*)::int expected,count(*) FILTER(WHERE EXISTS(
      SELECT 1 FROM trusted_dispatches d JOIN trusted_delivery_receipts r ON r.dispatch_id=d.id WHERE d.plan_id=p.id AND r.roots ? (kit->>'id')))::int received
      FROM trusted_packing_plans p CROSS JOIN LATERAL jsonb_array_elements(p.snapshot->'packages') kit
      JOIN requirement_approvals a ON a.id=p.approval_id AND a.organization_id=p.organization_id
      WHERE p.organization_id=$1 AND p.project_id=$2 AND p.site_id=$3 AND p.demand_revision=$4 AND kit->>'kind'='kit'`,[org,id,site.id,project.revision]);
    const job=installations.find(j=>j.site_id===site.id)??null,issues=job?.issues.filter(i=>!i.corrected_by).length??0;
    if(!expected)blockers.push(`${site.content.name}: current approved school packing missing`);
    if(expected!==received)blockers.push(`${site.content.name}: ${expected-received} assemblies awaiting acknowledged receipt`);
    if(!job)blockers.push(`${site.content.name}: installation requirement decision missing`);
    if(job?.required&&job.status!=='completed')blockers.push(`${site.content.name}: installation acceptance pending`);
    if(issues)blockers.push(`${site.content.name}: unresolved installation issues`);
    schools.push({site_id:site.id,name:site.content.name,packages:expected,delivered:received,remaining:expected-received,delivery_status:expected&&expected===received?'delivered':received?'partial':'pending',issues,installation:job});
  }
  const [{blocked}]=await m.query('SELECT requirement_d4_project_blocked($1,$2) blocked',[org,id]);
  if(blocked)blockers.push('Project custody, production or installation evidence is incomplete');
  const completion:ProjectCompletion[]=await m.query('SELECT * FROM project_completions WHERE organization_id=$1 AND project_id=$2',[org,id]);
  const history=await m.query("SELECT kind,revision,snapshot FROM supply_events WHERE organization_id=$1 AND kind IN ('installation','project_completion') AND snapshot->>'project_id'=$2 ORDER BY created_at,id",[org,id]);
  return {project_id:id,project_revision:project.revision,schools,blockers,completion:completion[0]??null,history};
}

export type InstallationCreate=Parameters<ProjectCompletionService['createInstallation']>[3];
export interface InstallationAction {id:string;input:Parameters<ProjectCompletionService['installationAction']>[4]}
export interface ClosureInput {project:string;input:Parameters<ProjectCompletionService['completeProject']>[4]}
export async function mutateTrustedCompletion(m:EntityManager,c:LedgerContext,key:string,request:
  {kind:'create';input:InstallationCreate}|{kind:'installation';input:InstallationAction}|{kind:'closure';input:ClosureInput}):Promise<Record<string,unknown>> {
  const service=new TrustedCompletionService(m);
  if(request.kind==='closure'&&(request.input.input.action!=='close'||request.input.input.exception_reason))throw Error('Closure exceptions and reopening remain blocked');
  const row=request.kind==='create'?await service.createInstallation(c.organization,c.actor,key,request.input):request.kind==='installation'?
    await service.installationAction(c.organization,c.actor,key,request.input.id,request.input.input):await service.completeProject(c.organization,c.actor,key,request.input.project,request.input.input);
  const table=request.kind==='closure'?'project_completions':'site_installations';
  if(request.kind==='create')await m.query(`INSERT INTO trusted_installation_sources(organization_id,installation_id,receipt_id)
    SELECT $1,$2,r.id FROM trusted_delivery_receipts r JOIN trusted_dispatches d ON d.id=r.dispatch_id JOIN trusted_packing_plans p ON p.id=d.plan_id
    WHERE p.organization_id=$1 AND p.project_id=$3 AND p.site_id=$4`,[c.organization,row.id,request.input.project_id,request.input.site_id]);
  const [{receipt}]=await m.query(`SELECT to_jsonb(t)-'created_at'-'updated_at' receipt FROM ${table} t WHERE id=$1 AND organization_id=$2`,[row.id,c.organization]);
  await m.query(`INSERT INTO audit_logs(id,organization_id,actor_id,action,entity_type,entity_id,"after") VALUES($1,$2,$3,$4,'trusted_delivery',$5,$6::jsonb)`,[randomUUID(),c.organization,c.actor,table,receipt.id,JSON.stringify(receipt)]);
  return receipt;
}
