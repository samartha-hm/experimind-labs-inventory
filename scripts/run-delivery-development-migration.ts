import "reflect-metadata";
import { AppDataSource } from "../src/db.ts";
const url = new URL(String((AppDataSource.options as {url?:string}).url));
if(url.hostname!=="127.0.0.1"||url.port!=="55432"||url.pathname!=="/experimind_kitbuilder_development")throw new Error("Refusing non-isolated development database");
await AppDataSource.initialize();
try {
 const pending = (await AppDataSource.query("SELECT name FROM migrations")).map((r:{name:string})=>r.name);
 const expected = ["AddDeliveryCustody1792022400009"];
 if(!pending.includes("HardenPackingReadiness1791936000008"))throw new Error("Verified packing readiness migration required");
 // This isolated database has a synchronized legacy baseline. Never run legacy seed/alignment migrations here.
 AppDataSource.migrations=AppDataSource.migrations.filter(m=>expected.includes(m.name));
 if(AppDataSource.migrations.length!==expected.length)throw new Error("Delivery migration registration invalid");
 const fingerprint=async()=>AppDataSource.query(`SELECT 'inventory' kind,count(*)::text count,md5(COALESCE(string_agg(row_to_json(i)::text,'' ORDER BY id),'')) digest FROM inventory_items i UNION ALL SELECT 'ledger',count(*)::text,md5(COALESCE(string_agg((to_jsonb(l)-'packing_pick_id')::text,'' ORDER BY id),'')) FROM stock_ledger l`);
 const before=await fingerprint();const ran=await AppDataSource.runMigrations({transaction:"all"});const after=await fingerprint();
 if(JSON.stringify(before)!==JSON.stringify(after))throw new Error("Inventory or ledger fingerprint changed");
 console.log(JSON.stringify({database:url.pathname.slice(1),executed:ran.map(m=>m.name),unchanged:after}));
}finally{await AppDataSource.destroy();}
