/** Actual signed-in Next HTTP checks against the local official Auth/DB fixture. Not browser testing. */
import assert from 'node:assert/strict';
export async function verifyFeatureHttp({appBase,ownerA,ownerB,sql,http}){
 assert.equal(process.env.LEADFLOW_SYNTHETIC_ONLY,'YES');assert.equal(new URL(appBase).hostname,'127.0.0.1');
 const leadA=sql("SELECT id FROM leads WHERE client_slug='synthetic-a' ORDER BY id LIMIT 1"),leadB=sql("SELECT id FROM leads WHERE client_slug='synthetic-b' ORDER BY id LIMIT 1");
 for(const [id,slug,text]of [[leadA,'synthetic-a','Owner A qualification fixture'],[leadB,'synthetic-b','Owner B private qualification fixture']]){
  sql(`INSERT INTO lead_qualifications(lead_id,client_slug,score,fit,summary,next_action,engine) VALUES('${id}','${slug}',75,'high','${text}','Ask about requirements.','rules')`);
 }
 sql(`INSERT INTO automation_jobs(dedupe_key,kind,client_slug,lead_id) VALUES('browser-draft','followup','synthetic-a','${leadA}');
 INSERT INTO followup_drafts(job_id,lead_id,client_slug,text,engine) SELECT id,'${leadA}','synthetic-a','Synthetic friendly reply draft, review before sending.','rules' FROM automation_jobs WHERE dedupe_key='browser-draft'`);

 for(const [identity,expected,forbidden]of [[ownerA,'Owner A qualification fixture','Owner B private qualification fixture'],[ownerB,'Owner B private qualification fixture','Owner A qualification fixture']]){
  const activity=await http('/dashboard/activity',{cookie:identity.cookie()});assert.equal(activity.status,200);
  assert.ok(activity.text.includes('Workspace activity'));assert.ok(activity.text.includes(expected));assert.ok(!activity.text.includes(forbidden));
  if(identity===ownerA)assert.ok(activity.text.includes('Synthetic friendly reply draft, review before sending.'));
  const settings=await http('/dashboard/settings',{cookie:identity.cookie()});assert.equal(settings.status,200);assert.ok(settings.text.includes('Business voice'));assert.ok(!settings.text.includes('unavailable until setup'));
  const billing=await http('/dashboard/billing',{cookie:identity.cookie()});assert.equal(billing.status,200);assert.ok(billing.text.includes('Test checkout is not configured yet.'));
  const pro=await http('/dashboard/pro',{cookie:identity.cookie()});assert.equal(pro.status,307);assert.equal(new URL(pro.headers.get('location'),appBase).pathname,'/dashboard/billing');
 }
 console.log('PASS Next HTTP: two-owner activity/qualification isolation, private draft rendering, preferences, disabled billing and denied test Pro access (not browser testing)');
}
