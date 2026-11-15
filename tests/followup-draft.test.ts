import test from 'node:test';import assert from 'node:assert/strict';
import { dueStage, replyDraft } from '../src/lib/followup-draft.ts';
test('24h/3d/7d boundaries, catch-up and stale window',()=>{
 const now=Date.parse('2026-11-15T12:00:00Z');
 for(const [hours,expected]of [[23.99,null],[24,24],[71.99,24],[72,72],[168,168],[239,168],[240,null]]as const)assert.equal(dueStage(new Date(now-hours*3600000).toISOString(),now),expected);
 assert.equal(dueStage('bad',now),null);
});
test('brand voice/language fallback and privacy-safe model draft',async()=>{
 const professional=await replyDraft({},'professional','english',{});assert.match(professional.text,/Thank you/);
 assert.match((await replyDraft({},'friendly','hinglish',{})).text,/Aapki/);
 const result=await replyDraft({notes:'PRIVATE SECRET call me',email:'secret@example.test'},'friendly','english',{GEMINI_API_KEY:'fake',GEMINI_MODEL:'test-model'},async(_url,init)=>{
  assert.ok(!String(init?.body).includes('PRIVATE SECRET'));assert.ok(!String(init?.body).includes('secret@example.test'));
  return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({text:'Hi! When can we discuss your requirements?'})}]}}]});
 });assert.equal(result.engine,'gemini');
});
