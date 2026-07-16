const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('user-journey-preview/user-journey.js', 'utf8');
assert.match(script, /images\.length>=7/);
assert.match(script, /4:3/);
assert.match(script, /فيديو مرفوض/);
assert.match(script, /اختر الغلاف قبل المتابعة/);
assert.match(script, /لا يوجد رفع Remote/);
console.log('ux-r02-image-rules: PASS');