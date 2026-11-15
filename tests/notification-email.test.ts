import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationMessage, deliverEmail } from '../src/lib/notification-email.ts';
test('safe plain-text confirmation and owner alert reject header injection',()=>{
 assert.throws(()=>notificationMessage('owner_alert','a@example.test','b@example.test\r\nBcc:x@example.test','Example'));
 const message=notificationMessage('customer_confirmation','a@example.test','b@example.test','Shop\nName');
 assert.ok(!message.text.includes('Shop\n')); assert.match(message.text,/does not guarantee/);
});
test('provider retries reuse identical idempotency key and payload; failure is not success',async()=>{
 const msg=notificationMessage('owner_alert','a@example.test','b@example.test','Shop');
 const bodies:string[]=[]; const keys:string[]=[];
 const send:typeof fetch=async(_url,init)=>{bodies.push(String(init?.body));keys.push((init?.headers as Record<string,string>)['Idempotency-Key']);return Response.json({id:'email_synthetic'});};
 await deliverEmail(msg,'leadflow/job','fake',send);await deliverEmail(msg,'leadflow/job','fake',send);
 assert.equal(bodies[0],bodies[1]);assert.deepEqual(keys,['leadflow/job','leadflow/job']);
 await assert.rejects(deliverEmail(msg,'leadflow/job','fake',async()=>new Response('',{status:429})));
});

test('default transport uses virtual test recipient and staging cannot send live email',async()=>{
 const msg=notificationMessage('owner_alert','a@example.test','real-owner@example.test','Shop');let to;
 await deliverEmail(msg,'job','fake',async(_url,init)=>{to=JSON.parse(String(init?.body)).to;return Response.json({id:'synthetic'});},{});
 assert.equal(to,'delivered@resend.dev');
 await assert.rejects(deliverEmail(msg,'job','fake',async()=>{throw new Error('Must not call provider');},{LEADFLOW_ENV:'staging',LEADFLOW_EMAIL_MODE:'live-approved'}),/sandbox/);
});
