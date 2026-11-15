import {safeHttpsOrigin} from '@/lib/auth-callback-origin';
export async function GET(){
 const origin=safeHttpsOrigin(process.env.LEADFLOW_PUBLIC_ORIGIN);
 const body=origin?`(()=>{const s=document.currentScript;const slug=s?.dataset.business||'';if(!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug))return;const f=document.createElement('iframe');f.src=${JSON.stringify(origin)}+'/form/'+encodeURIComponent(slug);f.title='Business enquiry form';f.loading='lazy';f.referrerPolicy='strict-origin-when-cross-origin';f.style.width='100%';f.style.minHeight='720px';f.style.border='0';s.after(f);})();`:'/* Enquiry form origin is not configured. */';
 return new Response(body,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
}
