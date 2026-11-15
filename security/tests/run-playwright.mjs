import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
export async function runPlaywright({appBase,localApiBase,password,runtimeEnv}){
 assert.equal(process.env.LEADFLOW_SYNTHETIC_ONLY,'YES');assert.equal(new URL(appBase).hostname,'127.0.0.1');
 const env={...runtimeEnv,LEADFLOW_SYNTHETIC_ONLY:'YES',E2E_BASE_URL:appBase,E2E_AUTH_GATEWAY:localApiBase,E2E_PASSWORD:password,...(process.env.LEADFLOW_CHROMIUM_EXECUTABLE?{LEADFLOW_CHROMIUM_EXECUTABLE:process.env.LEADFLOW_CHROMIUM_EXECUTABLE}:{})};
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test'],{env,stdio:['ignore','pipe','pipe']});let output='';
  child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});
  child.once('error',()=>reject(new Error('Playwright runner could not start')));
  child.once('exit',code=>{const safe=output.replaceAll(password,'[redacted]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[redacted-token]');console.log(safe);if(code===0)resolve();else reject(new Error('Playwright failed; no hosted testing is certified'));});
 });
}
