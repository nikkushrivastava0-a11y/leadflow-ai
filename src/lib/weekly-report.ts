export type WeeklyMetrics={total:number;hot:number;won:number;unanswered:number;average_score:number};
export function weeklyReportMessage(name:string,start:string,end:string,m:WeeklyMetrics){
 const a=new Date(start),b=new Date(end);
 if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||b.getTime()-a.getTime()!==7*86400000)throw new Error("invalid_report_period");
 for(const value of Object.values(m))if(!Number.isFinite(value)||value<0)throw new Error("invalid_report_metrics");
 const date=(d:Date)=>new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeZone:"Asia/Kolkata"}).format(d);
 return `${name.slice(0,100)} — weekly enquiry report\n${date(a)} to ${date(b)} (end exclusive, Asia/Kolkata)\n\nNew enquiries: ${m.total}\nHigh-score enquiries (70+): ${m.hot}\nWon from this cohort: ${m.won}\nStill new/unanswered: ${m.unanswered}\nAverage qualification score: ${m.average_score}\n\nCounts cover enquiries created during this week. Status and scores reflect the report-generation snapshot, not historical end-of-week state. Scores are estimates, not purchase predictions. Review unanswered enquiries in your LeadFlow AI dashboard.`;
}
