import "reflect-metadata";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { DataSource } from "typeorm";
import express from "express";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { AppDataSource } from "../../db.ts";
import { Organization } from "../../entity/Organization.ts";
import { ProductTemplate } from "../../entity/ProductTemplate.ts";
import { InventoryItem } from "../../entity/InventoryItem.ts";
import { ProductTemplateVersion } from "../../entity/ProductTemplateVersion.ts";
import { ProductTemplateRevision } from "../../entity/ProductTemplateRevision.ts";
import { planningEntities } from "../../entity/PlanningProject.ts";
import { OrderService } from "../../services/OrderService";
import { SalesOrderService } from "../../services/SalesOrderService";
import { StockLot } from "../../entity/StockLot";
import { SalesOrder } from "../../entity/SalesOrder";
import { CustomerOrder } from "../../entity/CustomerOrder";
import { StockLedger } from "../../entity/StockLedger";
import { availableToPromise } from "../../services/storefrontStock";
import { FabLabLoans1793232000033 } from "../../migration/1793232000033-FabLabLoans";
import { labLoans } from "../../server/routes/labLoans";

import salesRouter from "../v1/sales-order";

const databaseUrl = process.env.KIT_BUILDER_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("catalog-backed fulfillment and FabLab custody", () => {
  const schema = "portfolio_test_" + randomUUID().replaceAll("-", "");
  let db: DataSource;
  let org: Organization;
  let item: InventoryItem;
  let server: Server;
  let base: string;
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (url.hostname !== "127.0.0.1" || !["55432","55433"].includes(url.port) || url.pathname !== "/experimind_kitbuilder_test") throw Error("Isolated test database required");
    const admin = await new DataSource({type:"postgres", url:databaseUrl}).initialize();
    try { await admin.query('CREATE SCHEMA "' + schema + '"'); } finally { await admin.destroy(); }
    db = await new DataSource({type:"postgres", url:databaseUrl, schema, uuidExtension:"pgcrypto",
      extra:{options:"-c search_path=" + schema + ",public"},
      entities:(AppDataSource.options.entities as Function[]).filter(e => ![ProductTemplate, ProductTemplateVersion, ProductTemplateRevision, ...planningEntities].some(excluded => excluded === e)),
    }).initialize();
    await db.synchronize();
    const runner = db.createQueryRunner();
    try { await new FabLabLoans1793232000033().up(runner); } finally { await runner.release(); }
    vi.spyOn(AppDataSource,"getRepository").mockImplementation(db.getRepository.bind(db));
    vi.spyOn(AppDataSource,"createQueryRunner").mockImplementation(db.createQueryRunner.bind(db));
    vi.spyOn(AppDataSource,"transaction").mockImplementation(db.transaction.bind(db));
    vi.spyOn(AppDataSource,"query").mockImplementation(db.query.bind(db));
    org = await db.getRepository(Organization).save({name:schema});
    item = await db.getRepository(InventoryItem).save({organization_id:org.id, sku:"SCOPE", name:"Scope", quantity:7, threshold:0, base_price:50});
    const app = express();
    app.use(express.json(), (req,_res,next) => { req.user = {id:randomUUID(),role:"admin",orgId:org.id} as typeof req.user; next(); });
    app.use("/sales", salesRouter);
    app.use("/", labLoans);
    server = await new Promise<Server>(resolve => {const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
    const addr = server.address(); if (!addr || typeof addr === "string") throw Error("Missing port");
    base = "http://127.0.0.1:" + addr.port;
  },30000);
  afterAll(async () => {
    vi.restoreAllMocks();
    if(server) await new Promise<void>(resolve=>server.close(()=>resolve()));
    if(db?.isInitialized) {try {await db.query('DROP SCHEMA "'+schema+'" CASCADE');} finally {await db.destroy();}}
  });
  it("reserves ATP once under competing checkouts and dispatches the released FIFO layers", async () => {
    const lots = db.getRepository(StockLot);
    for (const [index, qty] of [2,3,2].entries()) await lots.save({organization_id:org.id,item_id:item.id, lot_number:"lot-"+index,
      initial_quantity:qty,current_quantity:qty,received_date:new Date(2020,index,1),unit_cost:index+1,status:index===2?"QUARANTINE":"RELEASED"});
    const atp = async () => Number((await db.query("SELECT "+availableToPromise+" AS atp FROM inventory_items WHERE id=$1",[item.id]))[0].atp);
    expect(await atp()).toBe(5);
    const checkout = () => new OrderService().createStorefrontOrder({organizationId:org.id,items:[{itemId:item.id,quantity:4}]});
    const results = await Promise.allSettled([checkout(),checkout()]);
    expect(results.map(r=>r.status).sort()).toEqual(["fulfilled","rejected"]);
    expect(await atp()).toBe(1);
    const repo = db.getRepository(SalesOrder);
    const order = await repo.findOneOrFail({where:{organization_id:org.id},relations:["lines"]});
    const ship = () => new SalesOrderService().shipItems(order.id,[{lineId:order.lines[0].id,quantityShipped:4}],org.id);
    await expect(ship()).rejects.toThrow(/Pack/);
    const advance = (status: string) => fetch(base + "/sales/" + order.id + "/advance", {
      method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({status}),
    });
    expect((await advance("packed")).status).toBe(409);
    expect((await advance("picking")).status).toBe(200);
    expect((await advance("packed")).status).toBe(200);
    expect((await db.getRepository(CustomerOrder).findOneByOrFail({order_number:order.so_number})).status).toBe("packed");
    expect((await ship()).status).toBe("shipped");
    expect(await atp()).toBe(1);
    expect((await lots.find({order:{received_date:"ASC"}})).map(l=>Number(l.current_quantity))).toEqual([0,1,2]);
    expect(Number((await db.getRepository(StockLedger).findOneByOrFail({item_id:item.id})).unit_cost)).toBe(1.5);
    expect((await db.getRepository(CustomerOrder).findOneByOrFail({order_number:order.so_number})).status).toBe("shipped");
  });
  it.each(["GOOD","DAMAGED","CALIBRATION_REQUIRED"])("records overdue custody and handles %s returns", async condition => {
    const post=(path:string,body:unknown)=>fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const loan={itemId:item.id,assetTag:"asset-"+condition,borrower:"Lab intern",department:"Engineering",dueDate:"2099-06-01"};
    const issued=await post("/",loan); expect(issued.status).toBe(201); const {id}=await issued.json();
    expect((await post("/",loan)).status).toBe(409);
    await db.query("UPDATE lab_loans SET due_date=CURRENT_DATE-1 WHERE id=$1",[id]);
    expect((await (await fetch(base)).json()).find((l:{id:string})=>l.id===id).overdue).toBe(true);
    expect((await post("/"+id+"/return",{condition})).status).toBe(200);
    expect((await post("/"+id+"/return",{condition})).status).toBe(409);
    if(condition!=="GOOD") {expect((await post("/",loan)).status).toBe(409); expect((await post("/"+id+"/clear",{})).status).toBe(200);}
    expect((await post("/",loan)).status).toBe(201);
  });
});
