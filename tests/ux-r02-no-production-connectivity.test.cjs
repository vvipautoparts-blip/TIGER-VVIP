const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = ['user-journey-preview/index.html', 'user-journey-preview/user-journey.js', 'user-journey-preview/user-types.js', 'user-journey-preview/mock-user-data.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
assert.doesNotMatch(source, /fetch\(|new XMLHttpRequest|new WebSocket|createClient\(|clerk\.client|service_role|db push/i);
assert.doesNotMatch(source, /sk_(live|test)_[A-Za-z0-9]|eyJ[A-Za-z0-9_-]{20,}/);
console.log('ux-r02-no-production-connectivity: PASS');