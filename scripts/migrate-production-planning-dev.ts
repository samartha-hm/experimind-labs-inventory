import {HardenProductionReconciliation1791763200006} from "../src/migration/1791763200006-HardenProductionReconciliation.ts";
import "reflect-metadata";
import {DataSource} from "typeorm";
import {AppDataSource} from "../src/db.ts";
import {AddProductionPlanning1791763200005} from "../src/migration/1791763200005-AddProductionPlanning.ts";
const url=new URL(process.env.DATABASE_URL??"");
if(url.hostname!=="127.0.0.1"||url.port!=="55432"||url.pathname!=="/experimind_kitbuilder_development")throw new Error("Only isolated development database allowed");
const db=new DataSource({...AppDataSource.options,migrations:[AddProductionPlanning1791763200005,HardenProductionReconciliation1791763200006]});
await db.initialize();try{console.log(`Production migrations applied: ${(await db.runMigrations({transaction:"all"})).length}`);}finally{await db.destroy();}
