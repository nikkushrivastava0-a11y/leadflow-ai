const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generateSite } = require("../scripts/coaching-site-generator.cjs");
const valid = {name:"Example Academy",city:"Greater Noida",description:"Classes for maths and science.",courses:["Maths","Science"],contactUrl:"https://example.org/enquire"};
test("generates an explicitly unpublished draft", () => {
  const html = generateSite(valid);
  assert.match(html, /noindex,nofollow/);
  assert.match(html, /owner approval before publication/);
  assert.match(html, /https:\/\/example.org\/enquire/);
});
test("escapes untrusted HTML and attributes", () => {
  const html = generateSite({...valid,name:'<img src=x onerror="alert(1)">',courses:["<script>evil</script>"]});
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;script&gt;/);
});
test("rejects unsafe links and unexpected fields", () => {
  for (const contactUrl of ["javascript:alert(1)","http://example.org","https://user:pass@example.org"]) {
    assert.throws(() => generateSite({...valid,contactUrl}));
  }
  assert.throws(() => generateSite({...valid,testimonial:"100% guaranteed"}));
});
test("rejects missing or malformed course details", () => {
  assert.throws(() => generateSite({...valid,courses:[]}));
  assert.throws(() => generateSite({...valid,description:""}));
});
