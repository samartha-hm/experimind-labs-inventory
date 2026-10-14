import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../AuthContext";
import type { PlanningView } from "./planningTypes";
interface Attachment { id:string; name:string; related_kind:string; size:number }
export default function ProjectAttachmentsPanel({project}:{project:PlanningView}) {
  const {currentUser}=useAuth(),[rows,setRows]=useState<Attachment[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [kind,setKind]=useState("project"),[site,setSite]=useState(""),[record,setRecord]=useState(""),[file,setFile]=useState<File>();
  const uploadKey=useRef(crypto.randomUUID());
  const writable=["admin","super_admin","manager","staff","inventory_staff","production_staff","project_staff","editor"].includes(currentUser?.role??"");
  useEffect(()=>{let live=true;setRows([]);setFile(undefined);setError("");void apiFetch(`/api/v1/attachments/projects/${project.id}`).then(data=>{if(live)setRows(data);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[project.id,currentUser?.organization_id]);
  useEffect(()=>{uploadKey.current=crypto.randomUUID();},[project.id,kind,site,record,file]);
  async function upload(){if(!file)return;setBusy(true);setError("");try {
    await apiFetch(`/api/v1/attachments/projects/${project.id}`,{method:"POST",body:file,headers:{"Content-Type":file.type||"text/plain","X-Attachment-Name":encodeURIComponent(file.name),"X-Record-Kind":kind,...(site?{"X-Site-Id":site}:{}),...(record?{"X-Record-Id":record}:{}),"Idempotency-Key":uploadKey.current}});
    setRows(await apiFetch(`/api/v1/attachments/projects/${project.id}`));setFile(undefined);uploadKey.current=crypto.randomUUID();
  }catch(e){setError(e instanceof Error?e.message:"Upload failed");}finally{setBusy(false);}}
  async function download(a:Attachment){setError("");try{const blob:Blob=await apiFetch(`/api/v1/attachments/${a.id}/download`,{},"blob"),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=a.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){setError(e instanceof Error?e.message:"Download failed");}}
  return <section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Private project files</h3><p className="text-sm">PNG, JPEG, PDF or TXT; maximum 10 MiB. Downloads require organization access.</p>{writable&&<div className="flex flex-wrap gap-2"><select aria-label="Attachment record type" className="rounded border p-2" value={kind} onChange={e=>{setKind(e.target.value);setSite("");setRecord("");}}>{["project","survey","installation","delivery"].map(k=><option key={k}>{k}</option>)}</select>{kind!=="project"&&<select aria-label="Attachment school" className="rounded border p-2" value={site} onChange={e=>setSite(e.target.value)}><option value="">Select school</option>{project.sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}{["installation","delivery"].includes(kind)&&<input aria-label="Related installation or delivery ID" className="rounded border p-2" value={record} onChange={e=>setRecord(e.target.value)} placeholder="Record ID"/>}<input aria-label="Private file" type="file" accept=".png,.jpg,.jpeg,.pdf,.txt" onChange={e=>setFile(e.target.files?.[0])}/><button className="rounded-xl border p-3" disabled={busy||!file} onClick={()=>void upload()}>Upload private file</button></div>}{error&&<p role="alert" className="text-red-600">{error}</p>}{rows.map(a=><div key={a.id} className="flex gap-3"><span>{a.name} · {a.related_kind} · {a.size} bytes</span><button className="rounded border px-3" onClick={()=>void download(a)}>Authenticated download</button></div>)}</section>;
}
