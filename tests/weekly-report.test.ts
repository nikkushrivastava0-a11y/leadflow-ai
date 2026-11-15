import test from 'node:test';import assert from 'node:assert/strict';import { weeklyReportMessage } from '../src/lib/weekly-report.ts';
test('weekly report labels cohort, timezone and snapshot semantics',()=>{
 const text=weeklyReportMessage('Synthetic','2026-11-01T18:30:00Z','2026-11-08T18:30:00Z',{total:10,hot:4,won:2,unanswered:3,average_score:58.5});
 assert.match(text,/2 Nov 2026/);assert.match(text,/9 Nov 2026/);assert.match(text,/New enquiries: 10/);assert.match(text,/not historical/);
 assert.throws(()=>weeklyReportMessage('x','bad','bad',{total:0,hot:0,won:0,unanswered:0,average_score:0}));
});
