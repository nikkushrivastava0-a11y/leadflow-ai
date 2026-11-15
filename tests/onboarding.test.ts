import test from 'node:test';import assert from 'node:assert/strict';import {businessName,embedTag} from '../src/lib/onboarding.ts';
test('onboarding display name is bounded; only safe public origin and tenant slug enter embed tag',()=>{
 assert.equal(businessName('<Shop>\nName'),'Shop  Name');assert.equal(businessName('x'.repeat(200)).length,80);
 assert.equal(embedTag('https://shop.example','biz-example'),'<script src="https://shop.example/embed.js" data-business="biz-example" defer></script>');
 for(const origin of ['javascript:bad','https://bad.example/path','https://user:secret@bad.example'])assert.equal(embedTag(origin,'biz-example'),null);
 assert.equal(embedTag('https://good.example','"><script>bad'),null);
});
