import 'server-only';
import {randomUUID} from 'node:crypto';
import {createPublicSubmissionClient} from './public-submission-client';
import {businessName} from '../onboarding';
/** Caller must derive UUID from a freshly verified, confirmed Auth session. */
export async function provisionWorkspace(userId:string,name:unknown){
 if(process.env.LEADFLOW_ONBOARDING_ENABLED!=='true')return null;
 const db=createPublicSubmissionClient();if(!db)return null;
 const {data,error}=await db.rpc('pilot_provision_workspace',{p_user:userId,p_slug:'biz-'+randomUUID().replaceAll('-','').slice(0,20),p_name:businessName(name)});
 return !error&&typeof data==='string'?data:null;
}
