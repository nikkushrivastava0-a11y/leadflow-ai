// Exact SQL rehearsal in a new local disposable DB; no hosted credentials.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
assert.equal(process.env.LEADFLOW_SYNTHETIC_ONLY,'YES');
assert.ok(['localhost','127.0.0.1'].includes(process.env.PGHOST));
assert.match(process.env.PGDATABASE??'',/^leadflow_guard_[a-z0-9_]+$/);
function sql(query){try{return execFileSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',timeout:10000,stdio:['pipe','pipe','pipe']}).trim();}catch{throw new Error('Synthetic guard SQL failed');}}
assert.equal(sql("SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('public','leadflow_guard')"),'0');
sql(`DO $$BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END$$;
CREATE TABLE public.clients(slug text PRIMARY KEY,owner_user_id uuid);
INSERT INTO public.clients VALUES ('a',gen_random_uuid()),('b',gen_random_uuid()),('c',gen_random_uuid()),('d',gen_random_uuid()),('unprovisioned',NULL);`);
const proposal=readFileSync('security/proposals/p0-postgres-enquiry-guard.sql','utf8');
assert.throws(()=>sql(proposal));
assert.equal(sql("SELECT count(*) FROM pg_namespace WHERE nspname='leadflow_guard'"),'0');
sql("SET leadflow.reviewed_postgres_guard='APPROVED_SYNTHETIC_REHEARSAL';\n"+proposal);
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,40);
const context=(slug,contact='one',duplicate=contact)=>({slug,tenant:`lf:leads:tenant:${hash(slug)}`,contact:`lf:leads:contact:${hash(slug+contact)}`,duplicate:`lf:leads:duplicate:${hash(slug+duplicate)}`});
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const statement=(operation,c,token)=>`SET statement_timeout='5s'; SET ROLE service_role; SELECT public.leadflow_enquiry_guard(${[operation,c.slug,c.tenant,c.contact,c.duplicate,token].map(quote).join(',')});`;
const call=(operation,c,token=randomUUID())=>Number(sql(statement(operation,c,token)));
const a=context('a'),t1=randomUUID(),t2=randomUUID();
assert.equal(call('reserve',a,t1),1);assert.equal(call('reserve',a,t2),3);
assert.equal(call('release',a,t2),0);assert.equal(call('complete',a,t2),0);
assert.equal(call('complete',a,t1),1);assert.equal(call('release',a,t1),0);
assert.equal(call('reserve',a),3);
assert.equal(call('reserve',context('a','one','new')),1);
assert.equal(call('reserve',context('a','one','another')),2);
assert.equal(call('reserve',context('b')),1);
console.log('PASS duplicate reservation token ownership, committed protection, contact limits and tenant isolation');
const before=sql('SELECT count(*) FROM leadflow_guard.buckets');
assert.equal(call('reserve',context('unknown')),0);assert.equal(call('reserve',context('unprovisioned')),0);
assert.equal(sql('SELECT count(*) FROM leadflow_guard.buckets'),before);
for(const role of ['anon','authenticated']){
 assert.throws(()=>sql(`SET ROLE ${role}; SELECT * FROM leadflow_guard.buckets`));
 assert.throws(()=>sql(`SET ROLE ${role}; SELECT public.leadflow_enquiry_guard('reserve','a','x','x','x',gen_random_uuid())`));
}
console.log('PASS unknown/unprovisioned business allocates no storage; anon/auth callers cannot use guard');
const expired=context('a','expired'),oldToken=randomUUID(),newToken=randomUUID();
assert.equal(call('reserve',expired,oldToken),1);
sql(`UPDATE leadflow_guard.reservations SET expires_at=now()-interval '1 second' WHERE key=${quote(expired.duplicate)}`);
assert.equal(call('reserve',expired,newToken),1);assert.equal(call('release',expired,oldToken),0);assert.equal(call('complete',expired,newToken),1);
console.log('PASS expiry allows safe retry and stale writers cannot release newer reservation');
function asyncSql(query){return new Promise((resolve,reject)=>{
 const p=spawn('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});let out='';
 p.stdout.on('data',d=>out+=d);p.stderr.resume();p.once('error',()=>reject(new Error('Synthetic psql start failed')));
 p.once('close',code=>code===0?resolve(Number(out.trim())):reject(new Error('Synthetic concurrent SQL failed')));p.stdin.end(query);
});}
const concurrent=[];
for(let offset=0;offset<80;offset+=8){concurrent.push(...await Promise.all(Array.from({length:8},(_,j)=>{
 const i=offset+j;return asyncSql(statement('reserve',context('c',String(i)),randomUUID()));
})));}
assert.equal(concurrent.filter(code=>code===1).length,60);assert.equal(concurrent.filter(code=>code===2).length,20);
assert.equal(sql(`SELECT count(*) FROM leadflow_guard.buckets WHERE tenant_key=${quote(context('c').tenant)}`),'61');
const same=context('d');const duplicateResults=await Promise.all(Array.from({length:12},()=>asyncSql(statement('reserve',same,randomUUID()))));
assert.equal(duplicateResults.filter(code=>code===1).length,1);assert.equal(duplicateResults.filter(code=>code===3).length,3);
assert.equal(duplicateResults.filter(code=>code===2).length,8);
console.log('PASS concurrent tenant cap60, bounded contact storage and one duplicate reservation winner');
console.log('PASS exact existing-Postgres guard; no Redis/external service or customer data used');
