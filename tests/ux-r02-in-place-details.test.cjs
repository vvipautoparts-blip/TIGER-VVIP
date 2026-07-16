const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('user-journey-preview/user-journey.js', 'utf8');
assert.match(script, /function details\(id\)/);
assert.match(script, /role="dialog"/);
assert.match(script, /المنصة ليست طرفًا في الصفقة/);
assert.doesNotMatch(script, /location\.href|window\.location/);
console.log('ux-r02-in-place-details: PASS');