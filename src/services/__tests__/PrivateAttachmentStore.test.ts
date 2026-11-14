import { describe,it,expect } from "vitest";
import { mkdtemp, rm, writeFile, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrivateAttachmentStore, validateAttachment, attachmentDigest, attachmentLimit } from "../PrivateAttachmentStore";
describe("Private attachment storage",()=>{
  it("rejects executable types, traversal, mismatches and size limits",()=>{
    const bytes=Buffer.from("synthetic survey");validateAttachment(bytes,"survey.txt","text/plain");
    for(const name of ["../survey.txt","survey.html","survey.svg",".survey.txt","survey.txt."])expect(()=>validateAttachment(bytes,name,"text/plain")).toThrow();
    expect(()=>validateAttachment(bytes,"photo.png","image/png")).toThrow();
    expect(()=>validateAttachment(Buffer.alloc(attachmentLimit+1),"big.txt","text/plain")).toThrow();
    expect(()=>validateAttachment(Buffer.from([0xff]),"survey.txt","text/plain")).toThrow();
  });
  it("round trips private bytes, denies replacement and detects corruption",async()=>{
    const root=await mkdtemp(join(tmpdir(),"erp-attachment-test-")),org=randomUUID(),id=randomUUID(),bytes=Buffer.from("synthetic survey");
    try{const store=new PrivateAttachmentStore(root);await store.put(org,id,bytes);expect(await store.get(org,id,attachmentDigest(bytes),bytes.length)).toEqual(bytes);
      await expect(store.put(org,id,bytes)).rejects.toThrow();await expect(store.get(org,"../escape",attachmentDigest(bytes),bytes.length)).rejects.toThrow();
      await writeFile(join(root,org,id),Buffer.alloc(bytes.length,97));await expect(store.get(org,id,attachmentDigest(bytes),bytes.length)).rejects.toThrow("integrity");
    }finally{await rm(root,{recursive:true,force:true});}
  });
  it("rejects source/web-root storage configuration",async()=>{
    await expect(new PrivateAttachmentStore(join(process.cwd(),"public","uploads")).put(randomUUID(),randomUUID(),Buffer.from("x"))).rejects.toThrow("outside");
  });
  it("restores a portable object tree and verifies bytes against metadata",async()=>{
    const root=await mkdtemp(join(tmpdir(),"erp-recovery-test-"));
    const org=randomUUID(),id=randomUUID(),bytes=Buffer.from("synthetic recovery evidence");
    try {
      const source=join(root,"source"),restored=join(root,"restored");
      await new PrivateAttachmentStore(source).put(org,id,bytes);
      await cp(source,restored,{recursive:true,errorOnExist:true,force:false});
      expect(await new PrivateAttachmentStore(restored).get(org,id,attachmentDigest(bytes),bytes.length)).toEqual(bytes);
      await writeFile(join(restored,org,id),Buffer.from("corrupt"));
      await expect(new PrivateAttachmentStore(restored).get(org,id,attachmentDigest(bytes),bytes.length)).rejects.toThrow();
      expect(await new PrivateAttachmentStore(source).get(org,id,attachmentDigest(bytes),bytes.length)).toEqual(bytes);
    } finally { await rm(root,{recursive:true,force:true}); }
  });
});
