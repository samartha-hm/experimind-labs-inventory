import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { DataSource } from "typeorm";
import { expect } from "vitest";
import { env } from "../../config/env";
import { User } from "../../entity/User";
import type { AuthService } from "../../services/AuthService";
import type { TrustedLedgerAuthority } from "../../security/TrustedLedgerAuthority";

/** D1V: every rejected attempt checks retained writes as well as the rejection. */
export async function independentIdentityReview(input: {
  runtime: DataSource; identity: DataSource; writer: DataSource; auth: AuthService;
  authority: TrustedLedgerAuthority; admin: User; token: string; account: string;
  entitlement: string; password: string; evidence: Record<string, unknown>;
  resourceRequests: import("../../security/TrustedLedgerAuthority").LedgerRequest[];
}) {
  const { runtime, writer, auth, authority, admin, token, account, entitlement, evidence } = input;
  const identities = [];
  for (const pool of [runtime, input.identity, writer])
    identities.push((await pool.query("SELECT current_user AS login, session_user AS session"))[0]);
  expect(new Set(identities.map(r => r.login)).size).toBe(3);
  for (const r of identities) expect(r.login).toBe(r.session);
  const request = (): import("../../security/TrustedLedgerAuthority").LedgerRequest => ({action:"execute",account,entitlement,
    key:randomUUID(),reason:"D1V adversarial verification",operation:{kind:"open",payload:{claim:randomUUID(),quantity:"0.001",
      source:{kind:"synthetic:test",id:randomUUID(),slice:"whole"}}}});
  const snapshot = () => writer.query(["accounts","entitlements","balances","claims","sources","events","reconciliation_cases","authorizations"]
    .map(t=>`SELECT '${t}' object,count(*)::int rows,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM commitment_${t} t`).join(" UNION ALL "));
  const rejected = async (attempt: () => Promise<unknown>) => {
    const before = await snapshot();
    await expect(attempt()).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  };
  const r=request(), capability=await authority.issue(token,r);
  await rejected(()=>authority.perform(token,r)); // general access bearer is never executable
  const claims=jwt.decode(capability) as jwt.JwtPayload;
  const sign=(patch:Record<string,unknown>)=>jwt.sign({...claims,...patch},env.jwtSecret,{algorithm:"HS256"});
  for (const patch of [{aud:"unrelated-service"},{aud:["experimind-ledger-execution","other"]},
    {iat:Math.floor(Date.now()/1000)+3600},{iss:"unrelated-issuer"},{scope:"read:profile"},
    {orgId:randomUUID()},{sub:randomUUID()},{action:"read"},{operationKey:randomUUID()},
    {fingerprint:"0".repeat(64)},{purpose:"password_reset"},{nbf:Math.floor(Date.now()/1000)+3600},
    {exp:Math.floor(Date.now()/1000)},{sid:"0".repeat(64)}])
    await rejected(()=>authority.perform(sign(patch),r));
  for (const changed of [{...r,key:randomUUID()},{...r,account:randomUUID()},
    {...r,entitlement:randomUUID()},{...r,reason:"changed"},request()])
    await rejected(()=>authority.perform(capability,changed));
  for (const resource of input.resourceRequests) {
    const cap=await authority.issue(token,resource);
    if(resource.action==="createAccount") for(const inputPatch of [{project:randomUUID()},{site:randomUUID()},
      {item:randomUUID()},{selector:{other:"resource"}}])
      await rejected(()=>authority.perform(cap,{...resource,input:{...resource.input,...inputPatch}}));
    if(resource.action==="entitlement") for(const patch of [{approval:randomUUID()},{revision:2},{cap:"999"},{provenance:[]}])
      await rejected(()=>authority.perform(cap,{...resource,...patch}));
  }
  const [first,second]=await Promise.all([authority.perform(capability,r),authority.perform(capability,r)]);
  expect(first).toEqual(second);
  expect((await writer.query("SELECT count(*)::int n FROM commitment_events WHERE key=$1",[r.key]))[0].n).toBe(1);
  await rejected(()=>writer.query("UPDATE commitment_authorizations SET fingerprint=$1 WHERE id=$2",["0".repeat(64),claims.jti]));
  const committed=await snapshot();
  expect(await authority.perform(capability,r)).toEqual(first);
  expect(await snapshot()).toEqual(committed);
  await rejected(()=>authority.perform(capability,{...r,key:randomUUID()}));
  await rejected(async()=>authority.perform(await authority.issue(token,r),r)); // another bearer cannot reuse key
  await expect(runtime.query("SELECT pg_read_file('postgresql.conf')")).rejects.toMatchObject({code:"42501"});
  await expect(runtime.query("SELECT * FROM pg_authid")).rejects.toMatchObject({code:"42501"});
  const login=await auth.refreshAccessToken((await auth.login(admin.email,input.password)).refreshToken!);
  const pending=request(), beforeLogout=await authority.issue(login.token,pending);
  const oldCommitted=request(), oldCapability=await authority.issue(login.token,oldCommitted);
  await authority.perform(oldCapability,oldCommitted);
  await auth.revokeRefreshToken(login.refreshToken);
  await expect(auth.refreshAccessToken(login.refreshToken)).rejects.toThrow();
  await rejected(()=>authority.issue(login.token,request()));
  await rejected(()=>authority.perform(beforeLogout,pending));
  await rejected(()=>authority.perform(oldCapability,oldCommitted)); // fail closed even for read-only retry
  // Real row/advisory barriers: execution already holding the user SHARE lock wins;
  // logout waits and then closes every subsequent mutation. No timing assumption.
  const raceLogin=await auth.login(admin.email,input.password), race=request();
  const raceCap=await authority.issue(raceLogin.token!,race);
  const barrier=writer.createQueryRunner(); await barrier.connect(); await barrier.startTransaction();
  let execution: Promise<unknown> | undefined, logout: Promise<void> | undefined;
  const waitFor = async (query: string, values: unknown[]) => {
    const deadline=Date.now()+5000;
    while (Date.now()<deadline) {
      if ((await writer.query(query,values))[0].waiting) return;
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    throw new Error("Expected database lock waiter not observed");
  };
  try {
    await barrier.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`capability:${admin.organization_id}:${admin.id}:${race.key}`]);
    execution=authority.perform(raceCap,race);
    await waitFor(`SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted) waiting`,[]);
    logout=auth.revokeRefreshToken(raceLogin.refreshToken!);
    await waitFor("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE NOT granted AND locktype='transactionid') waiting",[]);
    await barrier.commitTransaction();
    await execution; await logout;
    await rejected(()=>authority.perform(raceCap,race));
  } finally {
    if(barrier.isTransactionActive) await barrier.rollbackTransaction();
    await barrier.release();
    await Promise.allSettled([execution,logout].filter((p): p is Promise<unknown>=>!!p));
  }
  // Expiration while queued must roll back the whole mutation, including its receipt.
  const expRequest=request(), expBase=jwt.decode(await authority.issue(token,expRequest)) as jwt.JwtPayload;
  const expires=Math.floor(Date.now()/1000)+2;
  const expCap=jwt.sign({...expBase,iat:expires-2,exp:expires},env.jwtSecret);
  const expiryBarrier=writer.createQueryRunner(); await expiryBarrier.connect(); await expiryBarrier.startTransaction();
  const beforeExpiry=await snapshot(); let expiry: Promise<unknown> | undefined;
  try {
    await expiryBarrier.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`capability:${admin.organization_id}:${admin.id}:${expRequest.key}`]);
    expiry=authority.perform(expCap,expRequest);
    const outcome=expiry.then(()=>false,()=>true);
    await waitFor("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted) waiting",[]);
    await writer.query("SELECT pg_sleep(GREATEST(0,$1-extract(epoch FROM clock_timestamp()))+0.05)",[expires]);
    await expiryBarrier.commitTransaction();
    expect(await outcome).toBe(true);
    expect(await snapshot()).toEqual(beforeExpiry);
  } finally {
    if(expiryBarrier.isTransactionActive) await expiryBarrier.rollbackTransaction();
    await expiryBarrier.release(); await Promise.allSettled(expiry?[expiry]:[]);
  }
  for (const change of [{is_active:false},{role:"viewer"}]) {
    const next=request(), cap=await authority.issue(token,next);
    await input.identity.getRepository(User).update(admin.id,change);
    await rejected(()=>authority.perform(cap,next));
    await rejected(()=>authority.issue(token,request()));
    await input.identity.getRepository(User).update(admin.id,{is_active:true,role:"admin"});
  }
  evidence.independent_d1v={verdict:"PASS",actual_logins:identities,logout_new_authorization:"DENIED",
    pre_logout_capability:"DENIED",post_logout_committed_retry:"DENIED without writes",scope_matrix:"DENIED without writes",
    distinct_operation_replay:"DENIED",same_operation_retry:"one event and receipt",role_revocation:"DENIED",account_disable:"DENIED",
    in_flight_logout:"execution SHARE lock precedes logout; later retry denied",queued_expiration:"full rollback"};
}
