/** Synthetic-only rehearsal of the exact proposed production transaction.
 * Builds a real pg_dump archive, restores it to a new disposable DB, compares
 * source/schema fingerprints, then tests atomic failure, cutover and recovery.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, mkdtempSync, chmodSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
assert.equal(process.env.LEADFLOW_SYNTHETIC_ONLY,'YES');
assert.ok(['127.0.0.1','localhost'].includes(process.env.PGHOST));
assert.match(process.env.PGDATABASE??'',/^leadflow_atomic_[a-z0-9_]+$/);
const env={...process.env};
function run(command,args,input,db=env.PGDATABASE){return execFileSync(command,args,{input,encoding:'utf8',env:{...env,PGDATABASE:db},stdio:['pipe','pipe','pipe']}).trim()}
function sql(text,db){return run('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],text,db)}
function reject(text,label,expected){
 try{sql(text)}catch(error){assert.ok(String(error.stderr).split('\n').filter(line=>line.includes('ERROR:')).some(line=>line.includes(expected)),label+' failed for unexpected reason');console.log('PASS '+label);return}
 throw new Error(label+' unexpectedly succeeded');
}
function pass(label){console.log('PASS '+label)}
const cutover=readFileSync('security/proposals/production-atomic-cutover.sql','utf8');
const recovery=readFileSync('security/proposals/production-atomic-recovery.sql','utf8');
const snapshot=readFileSync('security/proposals/release-readonly-snapshot.sql','utf8').trim().replace(/;$/,'');
const fingerprint=db=>JSON.parse(sql('SELECT row_to_json(s) FROM ('+snapshot+') s;',db));
assert.equal(sql("SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('public','auth','leadflow_release_backup')"),'0','Refuse existing source objects');
const backupDir=mkdtempSync(join(tmpdir(),'leadflow-atomic-backup-'));chmodSync(backupDir,0o700);
const backupPath=join(backupDir,'synthetic-only.dump');
const restoreDb='leadflow_atomic_restore_'+randomBytes(6).toString('hex');
try{
 sql(`
 DO $$BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN RAISE EXCEPTION 'Privileged synthetic API role'; END IF;
 END$$;
 CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
 CREATE TABLE public.clients(id bigint PRIMARY KEY,slug text UNIQUE NOT NULL,business_name text NOT NULL,owner_email text NOT NULL);
 CREATE TABLE public.leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,client_slug text,name text NOT NULL,email text,phone text,source text,notes text,status text DEFAULT 'new',score integer,score_reason text,updated_at timestamptz DEFAULT now());
 ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
 CREATE POLICY "Users can view their own leads" ON public.leads FOR SELECT USING(auth.uid()=user_id);
 CREATE POLICY "Users can insert their own leads" ON public.leads FOR INSERT WITH CHECK(auth.uid()=user_id);
 GRANT ALL ON public.clients,public.leads TO anon,authenticated;
 GRANT UPDATE(notes),SELECT(email) ON public.leads TO anon,authenticated;
 INSERT INTO auth.users VALUES('11111111-1111-1111-1111-111111111111','confirmed-a@example.test',now()),('22222222-2222-2222-2222-222222222222','confirmed-b@example.test',now());
 -- Deliberately different old emails: only the explicit reviewed UUID manifest
 -- may select an owner; equality to Auth email must not be inferred.
 INSERT INTO public.clients VALUES(1,'a','Synthetic A','old-a@example.test'),(2,'b','Synthetic B','old-b@example.test');
 INSERT INTO public.leads(id,client_slug,name,notes,score)
 SELECT md5('good-'||i)::uuid,CASE WHEN i=38 THEN 'b' ELSE 'a' END,'Synthetic valid','Preserve every column',i FROM generate_series(1,38)i;
 INSERT INTO public.leads(id,user_id,name,notes)
 SELECT md5('legacy-good-'||i)::uuid,'11111111-1111-1111-1111-111111111111','Synthetic legacy','Preserve legacy row' FROM generate_series(1,17)i;
 INSERT INTO public.leads(id,user_id,name,notes)
 SELECT md5('legacy-bad-'||i)::uuid,md5('missing-user-'||i)::uuid,'Synthetic unresolved','Preserve unresolved legacy' FROM generate_series(1,34)i;
 INSERT INTO public.leads(id,client_slug,name,notes)
 SELECT md5('orphan-slug-'||i)::uuid,'unknown-'||(i%3),'Synthetic unresolved','Preserve unknown slug' FROM generate_series(1,5)i;
 `);
 const before=fingerprint();
 const container=env.LEADFLOW_SYNTHETIC_PG_CONTAINER;
 if(container){
  assert.match(container,/^[a-f0-9]{12,64}$/,'Only the CI PostgreSQL service container is accepted');
  const archive=execFileSync('docker',['exec','--env','PGHOST','--env','PGPORT','--env','PGUSER','--env','PGPASSWORD','--env','PGDATABASE',container,'pg_dump','--format=custom','--no-password'],{env,stdio:['pipe','pipe','pipe'],maxBuffer:20*1024*1024});
  writeFileSync(backupPath,archive,{mode:0o600});
 }else run('pg_dump',['--format=custom','--file',backupPath,'--no-password']);
 const backupDigest=createHash('sha256').update(readFileSync(backupPath)).digest('hex');
 run('createdb',[restoreDb]);
 if(container)execFileSync('docker',['exec','-i','--env','PGHOST','--env','PGPORT','--env','PGUSER','--env','PGPASSWORD',container,'pg_restore','--exit-on-error','--dbname',restoreDb],{env,input:readFileSync(backupPath),stdio:['pipe','pipe','pipe']});
 else run('pg_restore',['--exit-on-error','--dbname',restoreDb,backupPath]);
 assert.deepEqual(fingerprint(restoreDb),before);
 pass('real pg_dump archive restored; all94 rows, full-row hashes, schema/policies/ACL fingerprints match');
 const setup=`
 CREATE TEMP TABLE leadflow_owner_manifest(client_id bigint PRIMARY KEY,owner_user_id uuid UNIQUE NOT NULL,evidence_ref text NOT NULL);
 INSERT INTO leadflow_owner_manifest VALUES(1,'11111111-1111-1111-1111-111111111111','synthetic-explicit-consent-A'),(2,'22222222-2222-2222-2222-222222222222','synthetic-explicit-consent-B');
 CREATE TEMP TABLE leadflow_quarantine_manifest(id uuid PRIMARY KEY,evidence_ref text NOT NULL);
 INSERT INTO leadflow_quarantine_manifest SELECT id,'synthetic-reviewed-unresolved' FROM public.leads WHERE name='Synthetic unresolved';
 CREATE TEMP TABLE leadflow_release_receipt(clients_count bigint,leads_count bigint,quarantine_count bigint,clients_sha256 text,leads_sha256 text,schema_sha256 text,backup_sha256 text,backup_reference text,restore_receipt text,approved_commit text,owner_manifest_sha256 text,quarantine_manifest_sha256 text);
 INSERT INTO leadflow_release_receipt VALUES(${before.clients_count},${before.leads_count},39,'${before.clients_sha256}','${before.leads_sha256}','${before.schema_sha256}','${backupDigest}','synthetic-only-local-archive','synthetic-restore-fingerprint-verified','${'a'.repeat(40)}',
 (SELECT encode(sha256(convert_to(string_agg(to_jsonb(m)::text,',' ORDER BY client_id),'UTF8')),'hex') FROM leadflow_owner_manifest m),
 (SELECT encode(sha256(convert_to(string_agg(to_jsonb(q)::text,',' ORDER BY id),'UTF8')),'hex') FROM leadflow_quarantine_manifest q));
 `;
 const approve="SET leadflow.atomic_cutover_approval='APPROVED_FOR_THIS_EXACT_PRODUCTION_COMMIT';SET leadflow.maintenance_verified='YES';SET leadflow.approved_commit='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n";
 reject(setup+cutover,'missing production approval blocks entire transaction','Exact production approval');
 reject(setup+approve+"UPDATE leadflow_release_receipt SET restore_receipt=NULL;\n"+cutover,'missing restore evidence blocks entire transaction','Backup digest');
 reject(setup+approve+"UPDATE leadflow_owner_manifest SET evidence_ref='';\n"+cutover,'owner manifest digest frozen by approval receipt','Private manifests changed');
 reject(setup+approve+"UPDATE leadflow_owner_manifest SET evidence_ref=''; UPDATE leadflow_release_receipt SET owner_manifest_sha256=(SELECT encode(sha256(convert_to(string_agg(to_jsonb(m)::text,',' ORDER BY client_id),'UTF8')),'hex') FROM leadflow_owner_manifest m);\n"+cutover,'owner provenance required independently of email match','Explicit unique');
 reject(setup+approve+"UPDATE leadflow_release_receipt SET approved_commit=repeat('b',40);\n"+cutover,'different source commit rejected','Receipt commit differs');
 reject(setup+approve+"DELETE FROM leadflow_quarantine_manifest WHERE id=md5('legacy-bad-1')::uuid; INSERT INTO leadflow_quarantine_manifest VALUES(md5('good-1')::uuid,'wrong-review');\n"+cutover,'same-count substituted quarantine manifest rejected','Private manifests changed');
 reject(setup+approve+"UPDATE leadflow_release_receipt SET leads_count=93;\n"+cutover,'stale source snapshot aborts before mutation','Source changed');
 reject(setup+approve+cutover.replace(/COMMIT;\s*$/,()=>"DO $$BEGIN RAISE EXCEPTION 'synthetic-late-failure';END$$;\nCOMMIT;"),'late failure rolls back quarantine owner schema grants and policies','synthetic-late-failure');
 assert.deepEqual(fingerprint(),before);
 assert.equal(sql("SELECT count(*) FROM pg_namespace WHERE nspname='leadflow_release_backup'"),'0');
 pass('every failed cutover leaves exact original94 snapshot and schema/ACLs unchanged');
 sql(setup+approve+cutover);
 assert.equal(sql('SELECT count(*) FROM public.leads'),'55');
 assert.equal(sql('SELECT count(*) FROM leadflow_release_backup.leads_quarantine'),'39');
 assert.equal(sql("SELECT count(*) FROM public.clients WHERE owner_user_id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')"),'2');
 const ownerSql=(owner,text)=>sql(`SET ROLE authenticated;SET request.jwt.claim.sub='${owner}';${text}`);
 const a='11111111-1111-1111-1111-111111111111',b='22222222-2222-2222-2222-222222222222';
 assert.equal(ownerSql(a,'SELECT count(*) FROM public.leads'),'54');
 assert.equal(ownerSql(b,'SELECT count(*) FROM public.leads'),'1');
 for(const role of ['anon','authenticated','service_role']){
  reject(`SET ROLE ${role};SELECT count(*) FROM leadflow_release_backup.leads_quarantine;`,role+' denied quarantine','permission denied');
 }
 assert.equal(sql("SELECT has_any_column_privilege('anon','public.leads','SELECT') OR has_any_column_privilege('anon','public.leads','UPDATE')"),'f');
 assert.equal(sql("SELECT has_column_privilege('authenticated','public.leads','notes','UPDATE')"),'f');
 assert.equal(ownerSql(a,"WITH changed AS(UPDATE public.leads SET next_follow_up_at='2027-01-10T10:00:00Z' WHERE id=md5('good-1')::uuid RETURNING id)SELECT count(*) FROM changed"),'1');
 assert.equal(ownerSql(b,"WITH changed AS(UPDATE public.leads SET next_follow_up_at=NULL WHERE id=md5('good-1')::uuid RETURNING id)SELECT count(*) FROM changed"),'0');
 assert.equal(ownerSql(a,"WITH changed AS(UPDATE public.leads SET next_follow_up_at=NULL WHERE id=md5('good-1')::uuid RETURNING id)SELECT count(*) FROM changed"),'1');
 pass('single atomic cutover preserves94 originals, uses explicit owners, enforces private39+tenant55 and narrow follow-up grants');
 const recoverApproval="SET leadflow.atomic_recovery_approval='APPROVED_FOR_THIS_EXACT_RECOVERY';SET leadflow.maintenance_verified='YES';\n";
 reject(recovery,'recovery requires separate approval','Exact recovery approval');
 sql("UPDATE public.leads SET notes='Newer synthetic edit' WHERE id=md5('good-1')::uuid");
 reject(recoverApproval+recovery,'recovery refuses to overwrite newer edits','Newer edits');
 assert.equal(sql('SELECT count(*) FROM public.leads'),'55');
 assert.equal(sql("SELECT count(*) FROM pg_policies WHERE policyname='atomic_recovery_hold'"),'0');
 sql("UPDATE public.leads SET notes='Preserve every column' WHERE id=md5('good-1')::uuid");
 sql(recoverApproval+recovery);
 assert.equal(sql('SELECT count(*) FROM public.leads'),'94');
 assert.equal(sql('SELECT count(*) FROM leadflow_release_backup.leads_quarantine'),'39');
 assert.equal(ownerSql(a,'SELECT count(*) FROM public.leads'),'0');
 assert.equal(ownerSql(a,'SELECT count(*) FROM public.clients'),'0');
 assert.equal(sql("SELECT recovery_state FROM leadflow_release_backup.receipt"),'RESTORED_UNDER_HOLD');
 pass('exact recovery restores original full-row content without data loss and holds all normal client/lead access closed');
 console.log('PASS synthetic production cutover/backup/restore rehearsal; no real production backup, provenance or release approval established');
}catch(error){
 console.error('FAIL '+(error instanceof assert.AssertionError?error.message:'Atomic rehearsal failed; raw SQL/fixture credentials suppressed'));
 process.exitCode=1;
}finally{
 // Only the fixture archive is disposable; never drop a caller's database.
 rmSync(backupDir,{recursive:true,force:true});
}
