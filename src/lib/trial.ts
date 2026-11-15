export function activeTrial(start:unknown,end:unknown,now=Date.now()){
 if(typeof start!=='string'||typeof end!=='string')return false;
 const a=Date.parse(start),b=Date.parse(end);
 return Number.isFinite(a)&&Number.isFinite(b)&&a<=now&&now<b&&b>a&&b-a<=14*86400000;
}
