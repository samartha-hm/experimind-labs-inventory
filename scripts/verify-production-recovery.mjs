import pg from 'pg';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, openSync, closeSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';

const url=new URL(process.env.KIT_BUILDER_TEST_DATABASE_URL);
const {schema}=JSON.parse(readFileSync('.test-tmp/d3-evidence.json','utf8'));
if(url.hostname!=='127.0.0.1'||url.port!=='55432'||url.pathname!=='/experimind_kitbuilder_test'
  ||!/^requirement_test_[a-f0-9]{32}$/.test(schema))throw Error('Isolated synthetic target required');
const bin=resolve('.local-dev/tools/postgresql-17.5/pgsql/bin');
const environment={...process.env,PGHOST:url.hostname,PGPORT:url.port,PGUSER:decodeURIComponent(url.username),
  PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:url.pathname.slice(1)};
const run=(name,args,overrides={})=>execFileSync(join(bin,`${name}.exe`),args,{env:{...environment,...overrides},windowsHide:true,encoding:'utf8',maxBuffer:32*1024*1024});
function phase(name,database='experimind_kitbuilder_test'){
 const log=openSync(`.local-dev/d3-recovery-${name}.log`,'w');
 try{execFileSync(process.execPath,['--env-file=.env.kit-builder-development','node_modules/vitest/vitest.mjs','run',
  'src/routes/__tests__/productionRecovery.integration.test.ts','--reporter=dot'],{env:{...process.env,
   PRODUCTION_RECOVERY_PHASE:name,PRODUCTION_RECOVERY_DATABASE:database},windowsHide:true,stdio:['ignore',log,log]});}
 finally{closeSync(log);}
 console.log(`Restricted authenticated HTTP ${name}: PASS`);
}
phase('before');
const client=new pg.Client({connectionString:url.toString()});await client.connect();
const {rows:[cluster]}=await client.query('SELECT current_setting(\'data_directory\') directory,pg_postmaster_start_time() started');
await client.end();
const expected=realpathSync(resolve(process.env.PRODUCTION_RECOVERY_DATA_DIRECTORY??'.local-dev/postgres-data'));
if(realpathSync(cluster.directory).toLowerCase()!==expected.toLowerCase())throw Error('Unexpected cluster directory; restart refused');
const restartLog=openSync('.local-dev/d3-pg-restart.log','w');
try{execFileSync(resolve('.local-dev/tools/node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe'),
 ['restart','-D',expected,'-l',resolve('.local-dev/postgres.log'),'-m','fast','-w','-t','45'],
 {env:environment,windowsHide:true,stdio:['ignore',restartLog,restartLog],timeout:60000});}
finally{closeSync(restartLog);}
phase('restart');
const restarted=JSON.parse(readFileSync('.local-dev/d3-recovery-restart.json','utf8'));
if(new Date(restarted.server[0].pg_postmaster_start_time).getTime()===new Date(cluster.started).getTime())throw Error('Postmaster did not restart');
const database=`experimind_production_restore_${randomBytes(8).toString('hex')}`;
const backup=resolve('.local-dev/d3-nonempty-receipts.sql');
writeFileSync(backup,run('pg_dump',['--schema',schema,'--no-owner','--no-privileges']));
run('psql',['-X','-v','ON_ERROR_STOP=1','-q','-c',`CREATE DATABASE ${database}`]);
run('psql',['-X','--single-transaction','-v','ON_ERROR_STOP=1','-q','-f',backup],{PGDATABASE:database});
phase('restore',database);
writeFileSync('.local-dev/d3-recovery-summary.json',JSON.stringify({schema,source_database:'experimind_kitbuilder_test',
 restored_database:database,cluster_directory:expected,clean_restart:true,postmaster_changed:true,
 fresh_database_restore:true,backup,phases:['before','restart','restore'].map(p=>JSON.parse(readFileSync(`.local-dev/d3-recovery-${p}.json`,'utf8')))},null,2));
console.log('Nonempty fresh-database restore, replay, and restricted HTTP: PASS');
