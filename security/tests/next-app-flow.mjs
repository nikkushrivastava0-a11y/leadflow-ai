/** Optional actual Next HTTP boundary extension to local-auth-api.mjs.
 * Only official fixture identities and loopback services are accepted.
 * Does not automate a browser, emulate RLS, or modify production code.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createServerClient } from '@supabase/ssr';

export async function runNextApplicationFlow({a,b,password,authBase,restBase,jwtSecret,sql,runtimeEnv}) {
  assert.equal(process.env.LEADFLOW_SYNTHETIC_ONLY,'YES');
  for(const name of ['.env','.env.local','.env.production','.env.production.local'])assert.ok(!existsSync(name),'Run Next fixture in a clean checkout without provider env files');
  for(const value of [authBase,restBase]) assert.equal(new URL(value).hostname,'127.0.0.1');
  const gatewayPort=Number(process.env.LEADFLOW_GATEWAY_PORT??55442);
  const appPort=Number(process.env.LEADFLOW_NEXT_PORT??55443);
  assert.ok([gatewayPort,appPort].every(p=>p>1024&&p<65536)&&gatewayPort!==appPort);
  const localApiBase=`http://127.0.0.1:${gatewayPort}`,appBase=`http://127.0.0.1:${appPort}`;
  const claims=Buffer.from(JSON.stringify({role:'anon',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  const unsigned=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+claims;
  const anonKey=unsigned+'.'+createHmac('sha256',jwtSecret).update(unsigned).digest('base64url');
  const publicFixture=process.env.LEADFLOW_PUBLIC_NEXT_FLOW==='YES'?await (await import('./next-public-flow.mjs')).preparePublicIntake({sql,jwtSecret,gatewayPort}):null;
  const apiBase=publicFixture?.apiBase??localApiBase;
  let gatewayRequests=0;
  const handler=async(req,res)=>{
    try {
      const incoming=new URL(req.url,'http://127.0.0.1');
      const target=incoming.pathname.startsWith('/auth/v1/')?authBase+incoming.pathname.slice(8)+incoming.search:
        incoming.pathname.startsWith('/rest/v1/')?restBase+incoming.pathname.slice(8)+incoming.search:null;
      if(!target){res.writeHead(404);res.end();return;}
      if(publicFixture?!publicFixture.authorize(req.headers,anonKey):req.headers.apikey!==anonKey){res.writeHead(401);res.end('Invalid synthetic API key');return;}
      if(publicFixture?.shouldFailInsert(incoming.pathname,req.method)){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'SYNTHETIC_WRITE_FAILURE',message:'Synthetic upstream unavailable'}));return;}
      gatewayRequests++;
      const buffers=[];for await(const part of req)buffers.push(part);
      const headers={...req.headers};delete headers.host;delete headers['content-length'];delete headers.connection;
      const response=await fetch(target,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(buffers),redirect:'manual',signal:AbortSignal.timeout(10000)});
      res.writeHead(response.status,Object.fromEntries([...response.headers].filter(([name])=>!['content-encoding','content-length','transfer-encoding','connection'].includes(name))));
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch{res.writeHead(502);res.end('Local fixture upstream unavailable');}
  };
  const gateway=createServer(handler);
  const children=[];
  const safeEnv={...runtimeEnv,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:apiBase,NEXT_PUBLIC_SUPABASE_ANON_KEY:anonKey};
  // Proxy/certificate configuration is infrastructure, not provider credentials.
  for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','NODE_USE_ENV_PROXY','NODE_EXTRA_CA_CERTS','CODEX_PROXY_CERT']) if(process.env[key])safeEnv[key]=process.env[key];
  if(publicFixture)Object.assign(safeEnv,publicFixture.env);
  const start=(args)=>{
    const child=spawn(process.execPath,['node_modules/next/dist/bin/next',...args],{env:safeEnv,stdio:['ignore','pipe','pipe']});children.push(child);
    // Drain logs privately; never print rendered responses, cookies or tokens.
    child.stdout.on('data',()=>{});child.stderr.on('data',()=>{});
    return child;
  };
  const exit=child=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('Next production build exceeded five-minute fixture limit'));},300000);child.once('error',()=>{clearTimeout(timeout);reject(new Error('Next process could not start'));});child.once('exit',code=>{clearTimeout(timeout);if(code===0)resolve();else reject(new Error('Next production build failed; raw logs suppressed'));});});
  const jars=[];
  async function ownerCookie(identity,email,signup=false){
    const jar=new Map();
    const client=createServerClient(apiBase,anonKey,{...(publicFixture?{global:{fetch:(url,options)=>fetch(String(url).replace(apiBase,localApiBase),options)}}:{}),cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>value?jar.set(name,value):jar.delete(name))}});
    const {data,error}=signup?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
    assert.ok(!error&&data.user?.id&&(!identity||data.user.id===identity.id)&&data.session,'SDK authentication must create real Auth session');
    jars.push({jar,client});
    return {jar,client,session:data.session,cookie:()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ')};
  }
  const http=async(path,{cookie='',action,args,origin=appBase}={})=>{
    const headers={...(cookie?{Cookie:cookie}:{})};
    if(action){headers['Next-Action']=action;headers['Content-Type']='text/plain;charset=UTF-8';headers.Origin=origin;headers.Accept='text/x-component';}
    const r=await fetch(appBase+path,{method:action?'POST':'GET',headers,body:action?JSON.stringify(args):undefined,redirect:'manual',signal:AbortSignal.timeout(20000)});
    return {status:r.status,headers:r.headers,text:await r.text()};
  };
  function pass(label){console.log('PASS Next HTTP '+label);}
  try{
    await new Promise((resolve,reject)=>{gateway.once('error',reject);gateway.listen(gatewayPort,'127.0.0.1',resolve)});
    if(publicFixture)await publicFixture.listen(handler);
    // Add only synthetic presentation fields required by the real dashboard.
    sql("ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(); ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false;");
    const build=start(['build','--webpack']);await exit(build);
    pass('production build against loopback-only synthetic configuration');
    const app=start(['start','--hostname','127.0.0.1','--port',String(appPort)]);
    for(let i=0;i<100;i++){try{const r=await http('/login');if(r.status===200)break;}catch{}if(i===99)throw new Error('Next server startup unavailable');await new Promise(r=>setTimeout(r,100));}
    const manifest=JSON.parse(readFileSync('.next/server/server-reference-manifest.json','utf8'));
    const actionIds={};
    for(const [id,entry] of Object.entries(manifest.node)){
      if(entry.exportedName)actionIds[entry.exportedName]=id;
    }
    if(!actionIds.updateLeadStatus){
      // Next's manifest shape can omit export names: server chunk declarations
      // retain registerServerReference(id, exportName), both generated by build.
      const scan=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?scan(dir+'/'+entry.name):entry.name.endsWith('.js')?[dir+'/'+entry.name]:[]);
      for(const file of scan('.next/server')){
        const text=readFileSync(file,'utf8');
        for(const match of text.matchAll(/\(["']([0-9a-f]{40,})["'],[^;\n]{0,300}?["'](getLeads|addLead|deleteLead|updateLeadStatus|updateLeadFollowUp)["']\)/g)) if(manifest.node[match[1]])actionIds[match[2]]=match[1];
      }
    }
    for(const name of ['addLead','deleteLead','updateLeadStatus','updateLeadFollowUp'])assert.ok(actionIds[name],`Build manifest cannot resolve ${name}`);
    const anonymous=await http('/dashboard');assert.equal(anonymous.status,307);assert.equal(new URL(anonymous.headers.get('location'),appBase).pathname,'/login');
    pass('unauthenticated dashboard redirects to login');
    const ownerA=await ownerCookie(a,'owner-a@example.test'),ownerB=await ownerCookie(b,'owner-b@example.test');
    const dashboardA=await http('/dashboard',{cookie:ownerA.cookie()});
    assert.equal(dashboardA.status,200);assert.ok(dashboardA.text.includes('A own')&&dashboardA.text.includes('A public'));assert.ok(!dashboardA.text.includes('B own'));assert.ok(!dashboardA.text.includes('Leads unavailable'));
    const dashboardB=await http('/dashboard',{cookie:ownerB.cookie()});assert.equal(dashboardB.status,200);assert.ok(dashboardB.text.includes('B own'));assert.ok(!dashboardB.text.includes('A own'));
    pass('real SDK session cookies -> Proxy -> owner scope -> server-rendered dashboard isolate two owners');
    const unprovisioned=await ownerCookie(null,'pending-workspace@example.test',true);
    const pendingPage=await http('/dashboard',{cookie:unprovisioned.cookie()});
    assert.equal(pendingPage.status,200);assert.ok(pendingPage.text.includes('Workspace access pending'),'verified signup without business must show pending workspace');assert.ok(!pendingPage.text.includes('A own')&&!pendingPage.text.includes('B own'),'unprovisioned signup cannot read another workspace');
    pass('real local SDK signup cannot self-claim a business; actual dashboard shows pending workspace');

    // Exercise real refresh in Proxy from a standard expired SSR session cookie.
    const authNames=[...ownerA.jar.keys()].filter(name=>/^sb-.+-auth-token(?:\.\d+)?$/.test(name));
    assert.ok(authNames.length>0,'SDK must set standard Auth cookies');
    const cookieName=authNames[0].replace(/\.\d+$/,'');
    const tokenParts=ownerA.session.access_token.split('.');
    const expiredClaims={...JSON.parse(Buffer.from(tokenParts[1],'base64url')),exp:Math.floor(Date.now()/1000)-3600};
    const expiredBody=tokenParts[0]+'.'+Buffer.from(JSON.stringify(expiredClaims)).toString('base64url');
    const expiredToken=expiredBody+'.'+createHmac('sha256',jwtSecret).update(expiredBody).digest('base64url');
    const expiredSession={...ownerA.session,access_token:expiredToken,expires_at:expiredClaims.exp,expires_in:0};
    const expiredCookie=cookieName+'=base64-'+Buffer.from(JSON.stringify(expiredSession)).toString('base64url');
    const refreshedPage=await http('/dashboard',{cookie:expiredCookie});
    assert.equal(refreshedPage.status,200);assert.ok(refreshedPage.text.includes('A own'),'expired access session refreshes before owner read');
    assert.ok(refreshedPage.headers.getSetCookie().some(value=>value.startsWith(cookieName)),'Proxy must forward refreshed Auth cookies');
    for(const setCookie of refreshedPage.headers.getSetCookie()){const pair=setCookie.split(';')[0],index=pair.indexOf('=');const name=pair.slice(0,index),value=pair.slice(index+1);if(value)ownerA.jar.set(name,value);else ownerA.jar.delete(name);}
    const invalidCookie=cookieName+'=base64-'+Buffer.from(JSON.stringify({...expiredSession,refresh_token:'synthetic-invalid-refresh-token'})).toString('base64url');
    const expiredDenied=await http('/dashboard',{cookie:invalidCookie});assert.equal(expiredDenied.status,307);assert.equal(new URL(expiredDenied.headers.get('location'),appBase).pathname,'/login');
    pass('expired SSR access cookie refreshes through real Auth and Proxy; invalid refresh redirects to login');
    const invoke=(name,args,owner=ownerA)=>http('/dashboard',{cookie:owner.cookie(),action:actionIds[name],args});
    const status=await invoke('updateLeadStatus',['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','contacted']);assert.equal(status.status,200);assert.ok(/"success":true/.test(status.text),'status action must confirm success');
    assert.equal(sql("SELECT status FROM public.leads WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'"),'contacted');
    const follow=await invoke('updateLeadFollowUp',['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2027-01-15T10:30:00.000Z']);assert.ok(/"success":true/.test(follow.text),'follow-up action must confirm success');
    assert.equal(sql("SELECT next_follow_up_at=TIMESTAMPTZ '2027-01-15T10:30:00Z' FROM public.leads WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'"),'t');
    const after=await http('/dashboard',{cookie:ownerA.cookie()});assert.ok(/2027-01-15 10:30/.test(after.text),'rendered follow-up must persist');
    for(const [name,args] of [['updateLeadStatus',['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','won']],['updateLeadFollowUp',['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',null]],['deleteLead',['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1']]]){
      const denied=await invoke(name,args,ownerB);assert.equal(denied.status,200);assert.ok(/"error":/.test(denied.text)&&!(/"success":true/.test(denied.text)),'cross-owner action must not report success');
    }
    const clear=await invoke('updateLeadFollowUp',['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',null]);assert.ok(/"success":true/.test(clear.text),"owner action must confirm success");assert.equal(sql("SELECT next_follow_up_at IS NULL FROM public.leads WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'"),'t');
    pass('actual server action HTTP status/follow-up/persistence/clear and cross-owner update/delete denial');
    const added=await invoke('addLead',[{name:'Synthetic Next manual',email:'next-manual@example.test',phone:'',source:'manual',notes:'Synthetic local fixture'}]);assert.equal(added.status,200);assert.ok(/"success":true/.test(added.text),"owner action must confirm success");
    const manualId=sql("SELECT id FROM public.leads WHERE name='Synthetic Next manual'");assert.match(manualId,/^[0-9a-f-]{36}$/);assert.equal(sql("SELECT client_slug FROM public.leads WHERE id='"+manualId+"'"),'synthetic-a');
    const search=await http('/dashboard?q=Synthetic%20Next%20manual&status=new',{cookie:ownerA.cookie()});assert.equal(search.status,200);assert.ok(search.text.includes('Synthetic Next manual'));assert.ok(!search.text.includes('A own'));assert.ok(/Rule-based estimate/.test(search.text),'AI fallback must be labelled');
    sql("INSERT INTO public.leads(user_id,client_slug,name,source,status,score) SELECT '"+a.id+"','synthetic-a','Pagination fixture '||i,'manual','new',10 FROM generate_series(1,23)i;");
    const page1=await http('/dashboard?q=Pagination%20fixture&page=1',{cookie:ownerA.cookie()}),page2=await http('/dashboard?q=Pagination%20fixture&page=2',{cookie:ownerA.cookie()});assert.equal(page1.status,200);assert.equal(page2.status,200);assert.ok(/23<!-- --> matching leads/.test(page1.text),'pagination count must be exact');assert.ok(/Page <!-- -->2<!-- --> of <!-- -->2/.test(page2.text),'second page must render');
    const deleted=await invoke('deleteLead',[manualId]);assert.ok(/"success":true/.test(deleted.text),"owner action must confirm success");assert.equal(sql("SELECT count(*) FROM public.leads WHERE id='"+manualId+"'"),'0');
    pass('actual manual create -> owner assignment -> search/status filter -> pagination -> delete; offline AI fallback labelled');
    const csrf=await http('/dashboard',{cookie:ownerA.cookie(),action:actionIds.updateLeadStatus,args:['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','won'],origin:'https://untrusted.example.test'});assert.ok(csrf.status>=400);assert.equal(sql("SELECT status FROM public.leads WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'"),'contacted');
    pass('Next server action rejects cross-origin mutation');
    if(publicFixture)await (await import('./next-public-flow.mjs')).verifyPublicIntake({appBase,sql,fixture:publicFixture,http,ownerA,ownerB});
    const loginRedirect=await http('/login',{cookie:ownerA.cookie()});assert.equal(loginRedirect.status,307);assert.equal(new URL(loginRedirect.headers.get('location'),appBase).pathname,'/dashboard');
    const {error}=await ownerA.client.auth.signOut();assert.equal(error,null);
    const signedOut=await http('/dashboard',{cookie:ownerA.cookie()});assert.equal(signedOut.status,307);assert.equal(new URL(signedOut.headers.get('location'),appBase).pathname,'/login');
    pass('authenticated login redirect and SDK sign-out clear SSR cookies; subsequent dashboard denied');
    assert.ok(gatewayRequests>20);
    pass('customer-flow boundary rehearsal completed without hosted providers or browser automation');
    app.kill('SIGTERM');
  }finally{
    for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');
    await Promise.all(children.map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve()},1500).unref()})));
    gateway.closeAllConnections();await new Promise(resolve=>gateway.close(resolve));
    if(publicFixture)await publicFixture.close();
    for(const {jar} of jars)jar.clear();
  }
}
