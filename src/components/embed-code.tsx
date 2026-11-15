'use client';
import {useState} from 'react';
export function EmbedCode({code}:{code:string}){
 const [message,setMessage]=useState('');
 return <div className="space-y-3"><label className="block">Enquiry form embed tag<textarea readOnly value={code} rows={4} className="mt-2 w-full rounded border p-3 font-mono text-sm"/></label><button type="button" className="rounded border px-4 py-2" onClick={async()=>{try{await navigator.clipboard.writeText(code);setMessage('Copied');}catch{setMessage('Select the tag above and copy it.');}}}>Copy embed tag</button><p role="status">{message}</p></div>;
}
