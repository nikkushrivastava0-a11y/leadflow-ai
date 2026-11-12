/** Fixture-only TLS/API-key adapter for actual Next public enquiry actions.
 * No production URL, TLS, client or guard implementation is replaced.
 */
import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {createServer} from 'node:https';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export async function preparePublicIntake({sql,jwtSecret,gatewayPort}) {
  assert.equal(process.env.LEADFLOW_SYNTHETIC_ONLY,'YES');
  const tlsPort=Number(process.env.LEADFLOW_PUBLIC_TLS_PORT??55444);
  assert.ok(tlsPort>1024&&tlsPort<65536&&tlsPort!==gatewayPort);
  const temp=mkdtempSync(join(tmpdir(),'leadflow-public-fixture-'));
  const certPath=join(temp,'ca.pem'),keyPath=join(temp,'key.pem'),preload=join(temp,'dns.cjs'),trustedPath=join(temp,'trust.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyPath,'-out',certPath,'-subj','/CN=synthetic.supabase.co','-addext','subjectAltName=DNS:synthetic.supabase.co','-addext','basicConstraints=critical,CA:TRUE','-days','1'],{stdio:'ignore'});
  const cert=readFileSync(certPath),key=readFileSync(keyPath);
  const existingTrust=process.env.NODE_EXTRA_CA_CERTS?readFileSync(process.env.NODE_EXTRA_CA_CERTS):Buffer.alloc(0);
  writeFileSync(trustedPath,Buffer.concat([existingTrust,Buffer.from('\n'),cert]),{mode:0o600});
  // This exact fixture hostname alone maps to loopback. All other DNS remains
  // normal, and the HTTPS request still verifies the fixture CA and SAN.
  writeFileSync(preload,`const dns=require('node:dns');const lookup=dns.lookup;dns.lookup=function(host,options,callback){if(host!=='synthetic.supabase.co')return lookup.apply(this,arguments);if(typeof options==='function'){callback=options;options={};}queueMicrotask(()=>options&&options.all?callback(null,[{address:'127.0.0.1',family:4}]):callback(null,'127.0.0.1',4));};`,{mode:0o600});
  const secret='sb_secret_synthetic_'+randomBytes(32).toString('hex');
  const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const claims=Buffer.from(JSON.stringify({role:'service_role',iss:'supabase',aud:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  const unsigned=header+'.'+claims;
  const serviceToken=unsigned+'.'+createHmac('sha256',jwtSecret).update(unsigned).digest('base64url');
  sql(`DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END$$;
  GRANT service_role TO leadflow_jwt_authenticator;
  GRANT USAGE ON SCHEMA public TO service_role;
  GRANT INSERT(name,email,phone,source,status,score,score_reason,client_slug) ON public.leads TO service_role;
  SET leadflow.reviewed_postgres_guard='APPROVED_SYNTHETIC_REHEARSAL';\n`+readFileSync('security/proposals/p0-postgres-enquiry-guard.sql','utf8')+"\nNOTIFY pgrst, 'reload schema';");
  let server;let failInsert=false;
  return {
    apiBase:`https://synthetic.supabase.co:${tlsPort}`,
    env:{NODE_EXTRA_CA_CERTS:trustedPath,NODE_OPTIONS:`--require=${preload}`,NO_PROXY:`${process.env.NO_PROXY??''},synthetic.supabase.co,127.0.0.1`,SUPABASE_SECRET_KEY:secret,LEAD_GUARD_HASH_SECRET:randomBytes(48).toString('base64url'),LEAD_GUARD_PROVIDER:'postgres',PUBLIC_ENQUIRIES_ENABLED:'true'},
    secret,
    // A local gateway mirrors the sb_secret-to-service-JWT platform boundary.
    // It accepts only this generated fake key; no hosted token is involved.
    authorize(headers,anonKey){
      if(headers.apikey===anonKey)return true;
      if(headers.apikey!==secret)return false;
      headers.authorization='Bearer '+serviceToken;return true;
    },
    failNextInsert(){failInsert=true;},
    shouldFailInsert(path,method){if(failInsert&&path==='/rest/v1/leads'&&method==='POST'){failInsert=false;return true;}return false;},
    async listen(handler){server=createServer({key,cert},handler);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(tlsPort,'127.0.0.1',resolve);});},
    async close(){if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}rmSync(temp,{recursive:true,force:true});},
  };
}

function decodeAttribute(value){return value.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');}
export async function verifyPublicIntake({appBase,sql,fixture,http,ownerA,ownerB}) {
  const pass=label=>console.log('PASS Next public HTTP '+label);
  async function form(slug){
    const response=await http('/form/'+slug);assert.equal(response.status,200);
    const controls=[];
    for(const input of response.text.matchAll(/<input\b[^>]*>/g)){
      const name=input[0].match(/\bname="([^"]*)"/)?.[1];
      if(name?.startsWith('$ACTION_'))controls.push([decodeAttribute(name),decodeAttribute(input[0].match(/\bvalue="([^"]*)"/)?.[1]??'')]);
    }
    assert.ok(controls.length>0,'Actual rendered form must expose generated bound action fields');
    assert.ok(!response.text.includes(fixture.secret),'Server-only writer key must not appear in rendered form');
    return controls;
  }
  async function submit(slug,details){
    const fields=await form(slug),data=new FormData();
    for(const [name,value] of fields)data.append(name,value);
    for(const [name,value] of Object.entries(details))data.set(name,value);
    const response=await fetch(appBase+'/form/'+slug,{method:'POST',headers:{Origin:appBase},body:data,redirect:'manual',signal:AbortSignal.timeout(20000)});
    await response.arrayBuffer();
    assert.equal(response.status,303,'Native actual bound action must redirect after submission');
    return {location:new URL(response.headers.get('location'),appBase),cookies:response.headers.getSetCookie()};
  }
  const details={name:'Synthetic Public Next',email:'public-next@example.test',phone:'+91 9876543210',company_website:''};
  const before=sql('SELECT count(*) FROM public.leads');
  const forged=await http('/form/synthetic-a?success=true');assert.ok(forged.text.includes('Submission status unavailable'),'A query parameter cannot forge a saved receipt');
  const saved=await submit('synthetic-a',details);assert.equal(saved.location.searchParams.get('success'),'true');
  assert.equal(sql("SELECT count(*) FROM public.leads WHERE name='Synthetic Public Next' AND client_slug='synthetic-a' AND user_id IS NULL"),'1');
  const receipt=saved.cookies.find(value=>value.startsWith('leadflow-enquiry-receipt='));assert.ok(receipt&&/HttpOnly/i.test(receipt)&&/Secure/i.test(receipt)&&/SameSite=lax/i.test(receipt),'Receipt must use protected cookie attributes');
  const receiptCookie=receipt.split(';')[0];
  const receiptPage=await http('/form/synthetic-a?success=true',{cookie:receiptCookie});assert.ok(receiptPage.text.includes('Enquiry saved'),'Signed receipt must confirm the saved enquiry');
  const wrongBusiness=await http('/form/synthetic-b?success=true',{cookie:receiptCookie});assert.ok(wrongBusiness.text.includes('Submission status unavailable'),'Receipt cannot confirm another business');
  const aPage=await http('/dashboard',{cookie:ownerA.cookie()}),bPage=await http('/dashboard',{cookie:ownerB.cookie()});
  assert.ok(aPage.text.includes('Synthetic Public Next'),'Saved public enquiry reaches the correct actual dashboard');assert.ok(!bPage.text.includes('Synthetic Public Next'),'Other owner cannot see saved public enquiry');
  assert.equal(Number(sql('SELECT count(*) FROM public.leads')),Number(before)+1);
  pass('actual rendered multipart action -> TLS server writer -> PostgreSQL guard -> owner dashboard and signed receipt');
  const duplicate=await submit('synthetic-a',details);assert.equal(duplicate.location.searchParams.get('error'),'duplicate');
  const spam=await submit('synthetic-a',{...details,name:'Synthetic Spam Next',company_website:'https://spam.example.test'});assert.equal(spam.location.searchParams.get('error'),'invalid');
  const invalid=await submit('synthetic-a',{...details,name:'X',email:'not-an-email'});assert.equal(invalid.location.searchParams.get('error'),'invalid');
  const unknown=await submit('synthetic-unknown',{...details,name:'Synthetic Unknown Next',email:'unknown-next@example.test'});assert.equal(unknown.location.searchParams.get('error'),'guard');
  assert.equal(Number(sql('SELECT count(*) FROM public.leads')),Number(before)+1);
  assert.equal(sql("SELECT count(*) FROM leadflow_guard.reservations WHERE committed"),'1');
  pass('duplicate/honeypot/invalid input/unknown business rejected without extra rows or forged success');
  const retryDetails={...details,name:'Synthetic Public Retry',email:'retry-next@example.test',phone:'+91 9123456780'};
  fixture.failNextInsert();
  const failed=await submit('synthetic-a',retryDetails);assert.equal(failed.location.searchParams.get('error'),'save');assert.equal(sql("SELECT count(*) FROM public.leads WHERE name='Synthetic Public Retry'"),'0');
  assert.equal(sql('SELECT count(*) FROM leadflow_guard.reservations WHERE NOT committed'),'0');
  const retry=await submit('synthetic-a',retryDetails);assert.equal(retry.location.searchParams.get('success'),'true');assert.equal(sql("SELECT count(*) FROM public.leads WHERE name='Synthetic Public Retry'"),'1');
  pass('upstream write failure releases actual database reservation; same enquiry retries successfully');
}
