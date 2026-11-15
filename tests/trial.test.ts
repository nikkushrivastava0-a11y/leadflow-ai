import test from 'node:test';import assert from 'node:assert/strict';import {activeTrial} from '../src/lib/trial.ts';
test('finite trial grants only between start and expiry and cannot exceed fourteen days',()=>{
 const start='2026-11-01T00:00:00Z',end='2026-11-15T00:00:00Z';assert.equal(activeTrial(start,end,Date.parse(start)),true);assert.equal(activeTrial(start,end,Date.parse(end)),false);assert.equal(activeTrial(start,end,Date.parse(start)-1),false);assert.equal(activeTrial(start,'2027-11-15T00:00:00Z',Date.parse(end)),false);assert.equal(activeTrial(null,end),false);
});
