export function attribution(source:unknown,campaign:unknown){
 const value=typeof source==='string'?source.trim().toLowerCase():'';
 return {source_detail:['website','google','instagram','facebook','whatsapp','referral','other'].includes(value)?value:'website',source_campaign:typeof campaign==='string'?campaign.replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,80):''};
}
export function csvCell(value:unknown){
 let s=value==null?'':String(value);if(/^[\s]*[=+\-@]|^[\t\r\n]/.test(s))s="'"+s;
 return '"'+s.replaceAll('"','""')+'"';
}
export const exportColumns=['name','email','phone','source','source_detail','source_campaign','status','score','notes','created_at','next_follow_up_at','first_contacted_at'] as const;
export function leadsCsv(rows:Record<string,unknown>[]){return '\ufeff'+[exportColumns.map(csvCell).join(','),...rows.map(row=>exportColumns.map(k=>csvCell(row[k])).join(','))].join('\r\n');}
