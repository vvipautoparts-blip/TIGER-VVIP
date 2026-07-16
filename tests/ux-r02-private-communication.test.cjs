const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('user-journey-preview/user-journey.js', 'utf8');
assert.match(script, /محادثة واحد إلى واحد فقط/);
assert.match(script, /لا مجموعات ولا بث/);
assert.match(script, /0 \/ 20 دعوة/);
assert.match(script, /خلال 24 ساعة/);
assert.doesNotMatch(script, /رقم هاتف الإدارة/);
console.log('ux-r02-private-communication: PASS');