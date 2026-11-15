import 'server-only';import {resolveOwnerScope} from './owner-scope';import {testAccess} from './billing/access';import {activeTrial} from '../trial';
export async function pilotAccess(){
 if(process.env.LEADFLOW_TRIALS_ENABLED==='true'){
  const owner=await resolveOwnerScope();if(!owner.ok)return {active:false as const};
  const {data,error}=await owner.supabase.from('clients').select('trial_started_at,trial_expires_at').eq('owner_user_id',owner.userId).maybeSingle();
  if(!error&&data&&activeTrial(data.trial_started_at,data.trial_expires_at))return {active:true as const,mode:'trial',plan:'pilot',expiresAt:data.trial_expires_at as string};
 }
 return testAccess();
}
