import {isValidBusinessSlug} from './public-leads.ts';
export function businessName(value:unknown){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f<>]/g,' ').trim().slice(0,80)||'My business':'My business';}
export function embedTag(origin:string|undefined,slug:string){
 if(!origin||!isValidBusinessSlug(slug))return null;
 try{const u=new URL(origin);if(u.protocol!=='https:'||u.pathname!=='/'||u.username||u.password||u.search||u.hash||u.port)return null;
 return `<script src="${u.origin}/embed.js" data-business="${slug}" defer></script>`;
 }catch{return null;}
}
