const assert = require('node:assert/strict');
const fs = require('node:fs');
const files = ['operations-console/index.html','operations-console/operations-console.js','operations-console/mock-operations-data.js','operations-console/role-permissions.js'];
const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const forbidden of [/supabase/i, /clerk\s*admin/i, /fetch\s*\(/i, /XMLHttpRequest/i, /https?:\/\//i, /\bSQL\b/i, /db\s+push/i, /payment/i, /driver/i, /trip/i]) assert.equal(forbidden.test(source), false, `Forbidden production/transport term: ${forbidden}`);
console.log('ux-r01-no-production-connectivity: PASS');