import test from 'node:test';import assert from 'node:assert/strict';import {attribution,csvCell,leadsCsv} from '../src/lib/lead-analytics.ts';
test('campaign input is bounded and source is allowlisted',()=>{assert.deepEqual(attribution('INSTAGRAM','summer<script>'),{source_detail:'instagram',source_campaign:'summerscript'});assert.equal(attribution('attacker@example.test','a'.repeat(100)).source_detail,'website');assert.equal(attribution('', 'a'.repeat(100)).source_campaign.length,80);});
test('CSV preserves quoting and neutralizes spreadsheet formulas including Indian phone prefix',()=>{
 for(const value of ['=1+1','+919999999999','-1','@SUM(1)','  =CMD()','\tvalue'])assert.ok(csvCell(value).startsWith('"\''));assert.equal(csvCell('a,"b"'),'"a,""b"""');assert.match(leadsCsv([{name:'=BAD()',notes:'hello\nworld'}]),/"'=BAD\(\)"/);
});
