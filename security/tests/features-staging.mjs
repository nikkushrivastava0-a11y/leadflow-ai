/** Isolated synthetic staging-copy rehearsal. Never connects to a hosted DB. */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
assert.equal(process.env.LEADFLOW_SYNTHETIC_ONLY,'YES');
assert.equal(process.env.PGHOST,'127.0.0.1');
assert.match(process.env.PGDATABASE||'',/^leadflow_feature_[a-z0-9_]+$/);
const run=(bin,args,input)=>execFileSync(bin,args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const q=(sql)=>run('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],sql);
const denied=sql=>assert.throws(()=>q(sql));
assert.equal(q("select count(*) from information_schema.tables where table_schema in ('public','auth')"),'0','Refuse nonempty database');
q(`DO $$BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END$$;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
INSERT INTO auth.users VALUES ('11111111-1111-1111-1111-111111111111','a@example.test',now()),('22222222-2222-2222-2222-222222222222','b@example.test',now());
CREATE TABLE clients(slug text PRIMARY KEY,business_name text,owner_email text);
INSERT INTO clients VALUES('synthetic-a','Synthetic A','a@example.test'),('synthetic-b','Synthetic B','b@example.test');
CREATE TABLE leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,client_slug text,name text,email text,phone text,source text,notes text,status text DEFAULT 'new',score integer,score_reason text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());`);
q("SET leadflow.reviewed_rls_release='APPROVED_IN_STAGING';\n"+readFileSync('security/proposals/p0-05-reviewed-rls.sql','utf8'));
q('GRANT SELECT,INSERT,UPDATE,DELETE ON clients,leads TO service_role');
// Copy the synthetic baseline using actual pg_dump/pg_restore before testing migrations.
const dump=execFileSync('pg_dump',['--format=custom','--no-owner','--no-acl']);
q('DROP SCHEMA public CASCADE; DROP SCHEMA auth CASCADE; CREATE SCHEMA public');
execFileSync('pg_restore',['--dbname',process.env.PGDATABASE,'--no-owner','--exit-on-error'],{input:dump,stdio:['pipe','pipe','pipe']});
// pg_dump includes ACLs unless disabled above: re-grant baseline exactly for this fixture.
q('GRANT USAGE ON SCHEMA auth,public TO authenticated,service_role,anon; GRANT SELECT ON clients,leads TO authenticated; GRANT INSERT(user_id,client_slug,name,email,phone,source,notes,status,score,score_reason) ON leads TO authenticated; GRANT UPDATE(status,updated_at,next_follow_up_at) ON leads TO authenticated; GRANT DELETE ON leads TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON clients,leads TO service_role');
const migrations=readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')&&readFileSync('supabase/migrations/'+x,'utf8').trim());
for(const f of migrations)q("SET leadflow.feature_migrations='REVIEWED';\n"+readFileSync('supabase/migrations/'+f,'utf8'));
const owner="SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-1111-1111-111111111111';";
const other="SET ROLE authenticated; SET request.jwt.claim.sub='22222222-2222-2222-2222-222222222222';";
q(owner+"INSERT INTO leads(user_id,client_slug,name,email,phone,source) VALUES('11111111-1111-1111-1111-111111111111','synthetic-a','Synthetic','customer@example.test','9999999999','website')");
assert.equal(q("select count(*) from automation_jobs where kind='qualification'"),'1');
denied('SET ROLE anon; SELECT * FROM automation_jobs');
denied(owner+'SELECT public.automation_claim(ARRAY[\'qualification\'],1)');
const job=JSON.parse(q("SET ROLE service_role; SELECT row_to_json(j) FROM public.automation_claim(ARRAY['qualification'],1) j"));
assert.equal(q("SET ROLE service_role; SELECT count(*) FROM public.automation_claim(ARRAY['qualification'],1)"),'0','Active lease cannot be claimed twice');
denied(`SET ROLE service_role; SELECT automation_finish('${job.id}','00000000-0000-0000-0000-000000000000','{}')`);
const result={value:{score:35,fit:'low',summary:'Rule-based estimate.',nextAction:'Ask about requirements.'},engine:'rules',failure:'provider_error'};
q(`SET ROLE service_role; SELECT automation_finish('${job.id}','${job.token}','${JSON.stringify(result)}')`);
assert.equal(q(owner+'SELECT count(*) FROM lead_qualifications'),'1');
assert.equal(q(other+'SELECT count(*) FROM lead_qualifications'),'0');
assert.equal(q(other+'SELECT count(*) FROM lead_activity'),'0');
assert.equal(q("SELECT count(*) FROM lead_activity WHERE event='qualification.fallback'"),'1');
denied(owner+"INSERT INTO lead_activity(client_slug,event) VALUES('synthetic-a','forged')");
console.log('PASS synthetic backup/restore, migration, queue lease/token, fallback activity, two-owner RLS');
// Feature-specific checks are appended before rollback below.
// FEATURE_CHECKS
const rollbacks=readdirSync('supabase/rollbacks').filter(x=>x.endsWith('.sql')&&readFileSync('supabase/rollbacks/'+x,'utf8').trim()).sort().reverse();
for(const f of rollbacks)q(readFileSync('supabase/rollbacks/'+f,'utf8'));
assert.equal(q('SELECT count(*) FROM leads'),'1');
for(const f of migrations)q("SET leadflow.feature_migrations='REVIEWED';\n"+readFileSync('supabase/migrations/'+f,'utf8'));
console.log('PASS reverse-order rollback preserves lead and reapply succeeds');
