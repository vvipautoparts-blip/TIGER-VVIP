const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('user-journey-preview/user-journey.js', 'utf8');
assert.match(script, /اختيار القطاع إلزامي عند إنشاء الإعلان/);
assert.match(script, /السعر يجب أن يكون أكبر من صفر/);
assert.match(script, /المدينة والمنطقة إلزاميتان/);
assert.match(script, /الحد الأسبوعي: 4/);
assert.match(script, /120 يومًا/);
console.log('ux-r02-listing-flow: PASS');