import "reflect-metadata";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import pg from "pg";
import jwt from "jsonwebtoken";
import { DataSource } from "typeorm";
import { env as appEnv } from "../src/config/env";
import { configureDatabaseBoundary, sqlIdentifier } from "../src/security/databaseBoundary";
import { TrustedLedgerAuthority, type LedgerRequest } from "../src/security/TrustedLedgerAuthority";

// A disposable clone; never stop/restart the shared development cluster.
const evidence=JSON.parse(await readFile(".local-dev/13md1v-evidence.json","utf8"));
const schema=evidence.schema as string, source=new URL(process.env.KIT_BUILDER_TEST_DATABASE_URL!);
assert(source.hostname==="127.0.0.1" && source.port==="55432" && source.pathname==="/experimind_kitbuilder_test");
assert(/^requirement_test_[a-f0-9]{32}$/.test(schema));
const directory=resolve(".local-dev/13md1v-restart",randomUUID()), cluster=join(directory,"data");
await mkdir(directory,{recursive:true});
const bin=resolve(".local-dev/tools/postgresql-17.5/pgsql/bin");
const serverBin=resolve(".local-dev/tools/node_modules/@embedded-postgres/windows-x64/native/bin");
const run=(name:string,args:string[],extra:NodeJS.ProcessEnv={})=>execFileSync(join(["initdb","pg_ctl"].includes(name)?serverBin:bin,`${name}.exe`),args,
  {windowsHide:true,encoding:"utf8",stdio:name==="pg_ctl"?"ignore":"pipe",maxBuffer:32*1024*1024,env:{...process.env,...extra}});
const sourceEnv={PGHOST:source.hostname,PGPORT:source.port,PGDATABASE:source.pathname.slice(1),
  PGUSER:decodeURIComponent(source.username),PGPASSWORD:decodeURIComponent(source.password)};
const dump=run("pg_dump",["--schema",schema,"--no-owner","--no-privileges"],sourceEnv);
const dumpPath=join(directory,"synthetic.sql"); await writeFile(dumpPath,dump);
run("initdb",["-D",cluster,"-U","review_owner","--auth=trust","--encoding=UTF8","--locale=C"]);
await writeFile(join(cluster,"postgresql.auto.conf"),"listen_addresses='127.0.0.1'\nport=55439\n");
const localEnv={PGHOST:"127.0.0.1",PGPORT:"55439",PGDATABASE:"postgres",PGUSER:"review_owner",PGPASSWORD:""};
let started=false, owner:pg.Client|undefined, writer:DataSource|undefined;
const roles={runtime:"review_runtime",identity:"review_identity",ledger:"review_ledger"};
try {
  run("pg_ctl",["-D",cluster,"-l",join(directory,"postgres.log"),"-w","start"]); started=true;
  run("psql",["-X","--set","ON_ERROR_STOP=1","-q","-c",'CREATE EXTENSION "uuid-ossp"; CREATE EXTENSION pgcrypto'],localEnv);
  run("psql",["-X","--single-transaction","--set","ON_ERROR_STOP=1","-q","-f",dumpPath],{...localEnv,PGOPTIONS:`-c search_path=${schema},public`});
  const connect=async()=>{const c=new pg.Client({host:"127.0.0.1",port:55439,database:"postgres",user:"review_owner"});await c.connect();return c;};
  owner=await connect(); await owner.query(`SET search_path TO pg_catalog,${sqlIdentifier(schema)},pg_temp`);
  const password=randomBytes(24).toString("hex");
  for(const role of Object.values(roles)) await owner.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT`);
  await configureDatabaseBoundary({query:async(q:string,p?:unknown[]) => (await owner!.query(q,p)).rows} as Parameters<typeof configureDatabaseBoundary>[0],schema,roles);
  const [{rows:[receipt]},{rows:sessions}]=await Promise.all([
    owner.query("SELECT * FROM commitment_authorizations WHERE result->>'kind'='open' LIMIT 1"),
    owner.query("SELECT r.*,u.organization_id FROM refresh_tokens r JOIN users u ON u.id=r.user_id WHERE u.role='admin' AND NOT r.is_revoked AND r.expires_at>clock_timestamp()")]);
  assert(receipt); const active=sessions.find(s=>s.user_id===receipt.actor_id); assert(active);
  const event=receipt.result;
  const request:LedgerRequest={action:"execute",key:receipt.operation_key,account:event.account_id,entitlement:event.entitlement_id,
    reason:event.reason,operation:{kind:event.kind,payload:event.payload}};
  const sign=(sid:string,jti=receipt.id,key=request.key)=>jwt.sign({sub:receipt.actor_id,orgId:receipt.organization_id,role:"admin",sid,
    action:"execute",operationKey:key,scope:"ledger:mutate",fingerprint:receipt.fingerprint},appEnv.jwtSecret,
    {issuer:"experimind-ledger",audience:"experimind-ledger-execution",jwtid:jti,expiresIn:60});
  const retry=sign(active.token_hash);
  // Revoked session survives restart; fixture capability is signed before revocation.
  const {rows:[revoked]}=await owner.query(`INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at,is_revoked)
    VALUES($1,$2,$3,clock_timestamp()+interval '1 hour',false) RETURNING *`,
    [randomUUID(),receipt.actor_id,randomBytes(32).toString("hex")]);
  const revokedCap=sign(revoked.token_hash);
  await owner.query("UPDATE refresh_tokens SET is_revoked=true WHERE id=$1",[revoked.id]);
  const fingerprint=async()=>{
    const result=[];
    for(const t of ["commitment_accounts","commitment_entitlements","commitment_balances","commitment_claims","commitment_sources",
      "commitment_events","commitment_reconciliation_cases","commitment_authorizations","refresh_tokens","sessions"])
      result.push((await owner!.query(`SELECT count(*)::int n,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`)).rows[0]);
    return result;
  };
  const before=await fingerprint(); await owner.end(); owner=undefined;
  run("pg_ctl",["-D",cluster,"-m","fast","-w","restart","-l",join(directory,"postgres.log")]);
  owner=await connect(); await owner.query(`SET search_path TO pg_catalog,${sqlIdentifier(schema)},pg_temp`);
  assert.deepEqual(await fingerprint(),before);
  writer=new DataSource({type:"postgres",host:"127.0.0.1",port:55439,database:"postgres",username:roles.ledger,password,
    extra:{options:`-c search_path=pg_catalog,${schema},pg_temp`},entities:[],synchronize:false});
  await writer.initialize(); const authority=await TrustedLedgerAuthority.create(writer,appEnv.jwtSecret,schema);
  assert.deepEqual(await authority.perform(retry,request),receipt.result);
  await assert.rejects(authority.perform(retry,{...request,key:randomUUID()}));
  await assert.rejects(authority.perform(sign(active.token_hash,randomUUID()),request));
  await assert.rejects(authority.perform(revokedCap,request));
  assert.deepEqual(await fingerprint(),before);
  await writeFile(".local-dev/13md1v-restart-evidence.json",JSON.stringify({verdict:"PASS",disposable_clone:true,
    restricted_ledger_login:true,receipt_recovery:true,revocation_durable:true,fresh_key_replay_denied:true,
    changed_authorization_denied:true,ledger_and_sessions_unchanged:true},null,2));
  console.log("D1V disposable PostgreSQL restart: PASS");
} finally {
  if(writer?.isInitialized) await writer.destroy();
  if(owner) await owner.end();
  if(started) run("pg_ctl",["-D",cluster,"-m","fast","-w","stop"]);
}
