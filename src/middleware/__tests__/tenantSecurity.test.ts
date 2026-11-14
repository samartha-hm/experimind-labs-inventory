import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
const { findOneBy } = vi.hoisted(() => ({ findOneBy: vi.fn() }));
vi.mock("../../db.ts", () => ({ AppDataSource: { getRepository: () => ({ findOneBy }) } }));
import { requireTenant } from "../tenant";
import { requireRole, requirePermission } from "../requireRole";
const org="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222";
function context(user: unknown) {
  const req={user} as Request, res={status:vi.fn(),json:vi.fn()} as unknown as Response;
  vi.mocked(res.status).mockReturnValue(res);const next=vi.fn();return {req,res,next};
}
describe("tenant authentication hardening",()=>{
  beforeEach(()=>{findOneBy.mockReset();});
  it.each([undefined,"invalid","00000000-0000-0000-0000-000000000000"])("rejects absent or invalid tenant %s",async orgId=>{
    const {req,res,next}=context({id,orgId,role:"admin"});await requireTenant(req,res,next);
    expect(res.status).toHaveBeenCalledWith(403);expect(next).not.toHaveBeenCalled();expect(findOneBy).not.toHaveBeenCalled();
  });
  it("uses the current database role, so stale administrator tokens lose access",async()=>{
    findOneBy.mockResolvedValue({id,organization_id:org,is_active:true,role:"viewer"});
    const {req,res,next}=context({id,orgId:org,role:"admin"});await requireTenant(req,res,next);
    expect(findOneBy).toHaveBeenCalledWith({id,organization_id:org,is_active:true});expect(req.user?.role).toBe("viewer");
    next.mockClear();requireRole("admin")(req,res,next);expect(res.status).toHaveBeenCalledWith(403);expect(next).not.toHaveBeenCalled();
  });
  it("denies disabled, deleted or other-tenant users",async()=>{
    findOneBy.mockResolvedValue(null);const {req,res,next}=context({id,orgId:org,role:"admin"});
    await requireTenant(req,res,next);expect(res.status).toHaveBeenCalledWith(403);expect(next).not.toHaveBeenCalled();
  });
  it("fails closed without disclosing database errors",async()=>{
    findOneBy.mockRejectedValue(new Error("private connection details"));const {req,res,next}=context({id,orgId:org,role:"admin"});
    await requireTenant(req,res,next);expect(res.status).toHaveBeenCalledWith(503);expect(res.json).toHaveBeenCalledWith({error:"Organization access verification unavailable."});expect(next).not.toHaveBeenCalled();
  });
  it("does not give unknown roles or permission names a default hierarchy rank",()=>{
    for(const [userRole,required] of [["unknown","viewer"],["viewer","inventory_staff"],["","viewer"]]){
      const {req,res,next}=context({id,orgId:org,role:userRole});requireRole(required)(req,res,next);
      expect(res.status).toHaveBeenCalledWith(403);expect(next).not.toHaveBeenCalled();
    }
    const {req,res,next}=context({id,orgId:org,role:"inventory_staff"});requireRole("inventory_staff")(req,res,next);expect(next).toHaveBeenCalled();
  });
  it("never falls back to another tenant's permission record",async()=>{
    const findOne=vi.fn().mockResolvedValue(null);
    const {AppDataSource}=await import("../../db.ts");vi.spyOn(AppDataSource,"getRepository").mockReturnValue({findOne} as never);
    const {req,res,next}=context({id,orgId:org,role:"viewer"});await requirePermission("read")(req,res,next);
    expect(findOne).toHaveBeenCalledWith({where:[{organization_id:org,code:"viewer"}]});expect(res.status).toHaveBeenCalledWith(403);expect(next).not.toHaveBeenCalled();vi.restoreAllMocks();
  });
});
