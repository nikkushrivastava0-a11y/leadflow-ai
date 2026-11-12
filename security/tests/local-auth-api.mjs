/** Local official Auth -> JWT -> PostgREST -> exact owner RLS rehearsal.
 * Requires a fresh loopback-only disposable PostgreSQL database and separately
 * obtained official Auth/PostgREST binaries. Never accepts hosted targets.
 */
import assert from 'node:assert/strict';
import { randomBytes, createHash, createHmac } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

assert.equal(process.env.LEADFLOW_SYNTHETIC_ONLY, 'YES');
assert.ok(['127.0.0.1','localhost'].includes(process.env.PGHOST), 'Loopback-only database required');
assert.match(process.env.PGDATABASE ?? '', /^leadflow_jwt_[a-z0-9_]+$/, 'Use a fresh uniquely named synthetic database');
const authBin=process.env.LEADFLOW_AUTH_BIN, restBin=process.env.LEADFLOW_POSTGREST_BIN;
assert.ok(authBin && restBin, 'Provide reviewed official binaries');
// Linux x86-64 official release binaries pinned for this regression.
assert.equal(createHash('sha256').update(readFileSync(authBin)).digest('hex'), 'c66b5efc816ccf3e13c24022bdefd5c6a9bea1fd1a1aeb9c586e1279c75a6306', 'Unexpected Auth binary');
assert.equal(createHash('sha256').update(readFileSync(restBin)).digest('hex'), 'cc218dc89e882ae2b828b3e8d08a1cffd29f4fa126a0869b038ac9e3a12c357d', 'Unexpected PostgREST binary');
const dbUser=process.env.PGUSER;
assert.match(dbUser ?? '', /^[a-z_][a-z0-9_]*$/);
const dbPort=Number(process.env.PGPORT);
assert.ok(dbPort>1024 && dbPort<65536);
const authPort=Number(process.env.LEADFLOW_AUTH_PORT ?? 55440);
const restPort=Number(process.env.LEADFLOW_REST_PORT ?? 55441);
assert.ok([authPort,restPort].every(x=>x>1024&&x<65536)&&authPort!==restPort);
const authBase=`http://127.0.0.1:${authPort}`,restBase=`http://127.0.0.1:${restPort}`;
const jwtSecret=randomBytes(48).toString('base64url');
const password=randomBytes(24).toString('base64url');
const authenticatorPassword=randomBytes(24).toString('base64url');
const adminAuthority=encodeURIComponent(dbUser)+(process.env.PGPASSWORD?':'+encodeURIComponent(process.env.PGPASSWORD):'');
const sql=query=>{
 try{return execFileSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();}
 catch{throw new Error('Local PostgreSQL fixture failed; raw SQL and temporary credentials suppressed');}
};
assert.equal(sql("SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('public','auth')"),'0','Refuse any existing source schema');
const children=[];
// Deliberately do not inherit real provider keys or Gotrue configuration.
const runtimeEnv=Object.fromEntries(['PATH','LD_LIBRARY_PATH','LANG','LC_ALL','TMPDIR'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
let diagnostic='';
function start(bin,env){
 const p=spawn(bin,[],{env:{...runtimeEnv,...env},stdio:['ignore','pipe','pipe']});
 children.push(p);
 // Logs stay in memory, never include token/identity-bearing responses in output.
 p.stderr.on('data',b=>{diagnostic=(diagnostic+b.toString()).slice(-3000)});
 p.stdout.on('data',b=>{diagnostic=(diagnostic+b.toString()).slice(-3000)});
 p.on('error',e=>{diagnostic=`binary start error: ${e.code}`});
 return p;
}
async function ready(url){
 for(let i=0;i<80;i++){
   try{const r=await fetch(url,{signal:AbortSignal.timeout(1000)});if(r.status<500)return;}catch{}
   await new Promise(r=>setTimeout(r,100));
 }
 throw new Error('Local official service did not become ready');
}
async function request(base,path,{token,body,method='GET',...headers}={}){
 const r=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)});
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}
 return {status:r.status,data};
}
function pass(label){console.log('PASS '+label)}
try{
 sql("CREATE SCHEMA auth; DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres NOLOGIN; END IF; END$$;");
 start(authBin,{
  GOTRUE_DB_DRIVER:'postgres',DATABASE_URL:`postgres://${adminAuthority}@127.0.0.1:${dbPort}/${process.env.PGDATABASE}?sslmode=disable&search_path=auth`,DB_NAMESPACE:'auth',
  GOTRUE_API_HOST:'127.0.0.1',PORT:String(authPort),API_EXTERNAL_URL:authBase,
  GOTRUE_SITE_URL:'http://127.0.0.1:3000',GOTRUE_URI_ALLOW_LIST:'http://127.0.0.1:3000',
  GOTRUE_JWT_SECRET:jwtSecret,GOTRUE_JWT_EXP:'3600',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',
  GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_EXTERNAL_PHONE_ENABLED:'false',GOTRUE_MAILER_AUTOCONFIRM:'true',
  GOTRUE_SMTP_HOST:'',GOTRUE_DISABLE_SIGNUP:'false',GOTRUE_LOG_LEVEL:'error',
  GOTRUE_MAILER_NOTIFICATIONS_PASSWORD_CHANGED_ENABLED:'false',GOTRUE_MAILER_NOTIFICATIONS_EMAIL_CHANGED_ENABLED:'false',
 });
 await ready(authBase+'/health');
 const identities=[];
 for(const suffix of ['a','b']){
  const email=`owner-${suffix}@example.test`;
  const signup=await request(authBase,'/signup',{method:'POST',body:{email,password}});
  assert.equal(signup.status,200,`Synthetic ${suffix} signup failed: ${signup.data?.error_code ?? signup.status}`);
  const login=await request(authBase,'/token?grant_type=password',{method:'POST',body:{email,password}});
  assert.equal(login.status,200,`Synthetic ${suffix} login failed`);
  assert.ok(login.data.access_token && login.data.refresh_token);
  const user=await request(authBase,'/user',{token:login.data.access_token});
  assert.equal(user.status,200);assert.equal(user.data.id,login.data.user.id);
  assert.ok(login.data.user.email_confirmed_at);
  assert.match(login.data.user.id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  identities.push({id:login.data.user.id,token:login.data.access_token,refresh:login.data.refresh_token});
 }
 pass('official Supabase Auth signup/password login/confirmed user validation for two synthetic identities; no SMTP');
 const [a,b]=identities;
 sql(`
 DO $$BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='leadflow_jwt_authenticator') THEN CREATE ROLE leadflow_jwt_authenticator LOGIN NOINHERIT; END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','leadflow_jwt_authenticator') AND (rolsuper OR rolbypassrls)) THEN
   RAISE EXCEPTION 'Synthetic API role unexpectedly privileged';
 END IF;
 END$$;
 ALTER ROLE leadflow_jwt_authenticator PASSWORD '${authenticatorPassword}';
 GRANT anon,authenticated TO leadflow_jwt_authenticator;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
 GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
 CREATE TABLE public.clients(id bigint PRIMARY KEY,slug text UNIQUE NOT NULL,business_name text NOT NULL,owner_email text NOT NULL);
 CREATE TABLE public.leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,client_slug text,name text NOT NULL,email text,phone text,source text,notes text,status text DEFAULT 'new',score integer,score_reason text,updated_at timestamptz DEFAULT now(),next_follow_up_at timestamptz);
 ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
 CREATE POLICY "Users can view their own leads" ON public.leads FOR SELECT USING(auth.uid()=user_id);
 CREATE POLICY "Users can insert their own leads" ON public.leads FOR INSERT WITH CHECK(auth.uid()=user_id);
 GRANT ALL ON public.clients,public.leads TO anon,authenticated;
 INSERT INTO public.clients VALUES(1,'synthetic-a','Synthetic A','owner-a@example.test'),(2,'synthetic-b','Synthetic B','owner-b@example.test');
 INSERT INTO public.leads(id,user_id,client_slug,name) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','${a.id}','synthetic-a','A own'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','${b.id}','synthetic-b','B own'),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',NULL,'synthetic-a','A public');
 `);
 sql(`
 INSERT INTO public.leads(id,user_id,name) SELECT md5('jwt-unresolved-'||i)::uuid,md5('unknown-owner-'||i)::uuid,'Synthetic quarantine' FROM generate_series(1,39)i;
 CREATE TEMP TABLE leadflow_reviewed_quarantine_ids(id uuid PRIMARY KEY);
 INSERT INTO leadflow_reviewed_quarantine_ids SELECT id FROM public.leads WHERE name='Synthetic quarantine';
 SET leadflow.reviewed_quarantine_release='APPROVED_IN_STAGING';
 SET leadflow.reviewed_quarantine_count='39';
 `+readFileSync('security/proposals/p0-05h-staging-quarantine.sql','utf8'));
 sql("SET leadflow.reviewed_rls_release='APPROVED_IN_STAGING';\n"+readFileSync('security/proposals/p0-05-reviewed-rls.sql','utf8'));
 start(restBin,{
  PGRST_DB_URI:`postgres://leadflow_jwt_authenticator:${authenticatorPassword}@127.0.0.1:${dbPort}/${process.env.PGDATABASE}?sslmode=disable`,
  PGRST_DB_ANON_ROLE:'anon',PGRST_DB_SCHEMAS:'public',PGRST_DB_EXTRA_SEARCH_PATH:'public',
  PGRST_JWT_SECRET:jwtSecret,PGRST_JWT_AUD:'authenticated',PGRST_SERVER_HOST:'127.0.0.1',PGRST_SERVER_PORT:String(restPort),PGRST_LOG_LEVEL:'crit',
 });
 await ready(restBase+'/');
 const aRows=await request(restBase,'/leads?select=id',{token:a.token});
 const bRows=await request(restBase,'/leads?select=id',{token:b.token});
 assert.equal(aRows.status,200,`PostgREST owner request failed ${aRows.data?.code}`);assert.equal(aRows.data.length,2);
 assert.equal(bRows.status,200);assert.equal(bRows.data.length,1);
 assert.equal((await request(restBase,'/leads?client_slug=eq.synthetic-b',{token:a.token})).data.length,0);
 assert.equal((await request(restBase,'/leads?client_slug=eq.synthetic-a',{token:b.token})).data.length,0);
 pass('real Auth JWT -> official PostgREST -> exact owner RLS isolates owner A/B reads');
 assert.ok((await request(restBase,'/leads?select=id')).status>=400);
 assert.ok((await request(restBase,'/clients?select=id')).status>=400);
 const parts=a.token.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
 assert.equal((await request(restBase,'/leads',{token:parts.join('.')})).status,401);
 pass('anonymous Data API and forged JWT rejected');
 const originalParts=a.token.split('.');
 const header=JSON.parse(Buffer.from(originalParts[0],'base64url').toString());
 assert.equal(header.alg,'HS256');
 const expiredClaims={...JSON.parse(Buffer.from(originalParts[1],'base64url').toString()),exp:Math.floor(Date.now()/1000)-3600};
 const expiredBody=originalParts[0]+'.'+Buffer.from(JSON.stringify(expiredClaims)).toString('base64url');
 const expiredToken=expiredBody+'.'+createHmac('sha256',jwtSecret).update(expiredBody).digest('base64url');
 assert.equal((await request(restBase,'/leads',{token:expiredToken})).status,401);
 pass('synthetically expired signed JWT rejected by real PostgREST verifier without waiting');
 
 for(const token of [undefined,a.token,b.token]){
  const hidden=await request(restBase,'/leads?select=id',{token,'Accept-Profile':'leadflow_quarantine'});
  assert.ok([401,403,406].includes(hidden.status));
 }
 assert.equal(sql('SELECT count(*) FROM leadflow_quarantine.leads'),'39');
 pass('39 unresolved synthetic records preserved privately and inaccessible through official Data API for anon/A/B');
 
 const common={'Prefer':'return=representation'};
 const crossInsert=await request(restBase,'/leads',{...common,method:'POST',token:a.token,body:{user_id:a.id,client_slug:'synthetic-b',name:'Cross-owner attempt'}});
 assert.ok(crossInsert.status>=400);
 const ownInsert=await request(restBase,'/leads',{...common,method:'POST',token:a.token,body:{user_id:a.id,client_slug:'synthetic-a',name:'A manual synthetic'}});
 assert.equal(ownInsert.status,201);assert.equal(ownInsert.data.length,1);
 const ownId=ownInsert.data[0].id;
 const schedule=await request(restBase,`/leads?id=eq.${ownId}`,{...common,method:'PATCH',token:a.token,body:{status:'contacted',next_follow_up_at:'2027-01-10T10:00:00Z'}});
 assert.equal(schedule.status,200);assert.equal(schedule.data.length,1);
 const persisted=await request(restBase,`/leads?id=eq.${ownId}&select=status,next_follow_up_at`,{token:a.token});
 assert.equal(persisted.data[0].status,'contacted');assert.match(persisted.data[0].next_follow_up_at,/2027-01-10T10:00:00/);
 for(const method of ['PATCH','DELETE']){
  const result=await request(restBase,`/leads?id=eq.${ownId}`,{...common,method,token:b.token,...(method==='PATCH'?{body:{status:'won',next_follow_up_at:null}}:{})});
  assert.equal(result.status,200);assert.deepEqual(result.data,[]);
 }
 const clear=await request(restBase,`/leads?id=eq.${ownId}`,{...common,method:'PATCH',token:a.token,body:{next_follow_up_at:null}});
 assert.equal(clear.data[0].next_follow_up_at,null);
 const ownDelete=await request(restBase,`/leads?id=eq.${ownId}`,{...common,method:'DELETE',token:a.token});
 assert.equal(ownDelete.data.length,1);
 pass('real JWT owner create/status/follow-up/readback/clear/delete; cross-owner insert/update/delete denied');
 const refresh=await request(authBase,'/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:a.refresh}});
 assert.equal(refresh.status,200);assert.ok(refresh.data.access_token);
 const logout=await request(authBase,'/logout',{method:'POST',token:refresh.data.access_token});
 assert.equal(logout.status,204);
 const deniedRefresh=await request(authBase,'/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:refresh.data.refresh_token}});
 assert.ok(deniedRefresh.status>=400);
 pass('real Auth refresh and logout revoke further refresh; existing access-token expiry remains separate');
 console.log('PASS local official Auth/PostgREST JWT authorization rehearsal; hosted/browser/public-form flow remains unverified');
}catch(error){
 console.error('FAIL '+error.message);
 // Only coarse startup diagnostics; never dump complete Auth logs or responses.
 console.error('Local diagnostic: '+(diagnostic.match(/SQLSTATE [0-9A-Z]+/)?.[0] ?? 'inspect private local service logs; no tokens printed'));
 process.exitCode=1;
}finally{
 for(const child of children.reverse()) child.kill('SIGTERM');
 await Promise.all(children.map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve()},1500).unref()})));
}
