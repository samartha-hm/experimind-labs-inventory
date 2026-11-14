import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configurationChecks, preflight } from './pilot-preflight.mjs';
const env = { NODE_ENV:'production', JWT_SECRET:'s'.repeat(40), APP_URL:'https://erp.test', PILOT_BACKUP_RETENTION_DAYS:'14',
  ...Object.fromEntries(['DATABASE_URL','MIGRATION_DATABASE_URL','IDENTITY_DATABASE_URL','RECEIPT_LEDGER_DATABASE_URL'].map((key,i)=>[key,`postgres://role${i}:PRIVATE_PASSWORD@127.0.0.1:55432/synthetic`])) };
test('does not disclose credentials and keeps inspection distinct from configuration',()=>{
  const checks=configurationChecks(env);
  assert.ok(checks.every(check=>check.status==='PASS'));
  assert.ok(!JSON.stringify(checks).includes('PRIVATE_PASSWORD'));
});
test('rejects default secrets, shared roles, mismatched databases and missing retention',()=>{
  const checks=configurationChecks({...env,JWT_SECRET:'super-secret-jwt-key'.repeat(3),MIGRATION_DATABASE_URL:env.DATABASE_URL,IDENTITY_DATABASE_URL:'postgres://other:p@127.0.0.1:55432/other',PILOT_BACKUP_RETENTION_DAYS:''});
  for(const id of ['jwt-secret','role-separation','same-database','backup-retention']) assert.equal(checks.find(check=>check.id===id).status,'BLOCKED');
});
test('malformed or missing connections never throw or print input',()=>{
  assert.doesNotThrow(()=>configurationChecks({}));
  assert.ok(configurationChecks({...env,DATABASE_URL:'PRIVATE_BROKEN_URL'}).some(check=>check.id==='DATABASE_URL'&&check.status==='BLOCKED'));
});

test('unverified deployment evidence remains actionable and cannot authorize pilot',async()=>{
  const report=await preflight({...env,PILOT_PREFLIGHT_CONNECT:'false'});
  assert.equal(report.pilot,'NO-GO');assert.equal(report.ready,false);
  assert.equal(report.checks.find(check=>check.id==='filesystem-acl').status,'NOT_VERIFIED');
  assert.ok(report.checks.every(check=>check.severity&&check.evidence_reference&&check.reproduction&&check.action));
  assert.ok(report.migration_preview.discovered.length>0);
  assert.ok(!JSON.stringify(report).includes('PRIVATE_PASSWORD'));
});
