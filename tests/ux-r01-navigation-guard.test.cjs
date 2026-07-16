const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const out = execFileSync('node', ['--input-type=module', '-e', `import { canAccess, isInScope } from './operations-console/role-permissions.js'; console.log(JSON.stringify({ salesAudit:canAccess('sales_agent','audit'), sectorOther:isInScope({sector:'العقارات'}, {scope:'sector',sector:'قطع السيارات وخدماتها'}), areaOther:isInScope({area:'شرق عمّان'}, {scope:'area',area:'غرب عمّان'}), assigner:canAccess('authorized_role_assigner','employees') }));`], { encoding:'utf8' });
const result = JSON.parse(out);
assert.equal(result.salesAudit, false);
assert.equal(result.sectorOther, false);
assert.equal(result.areaOther, false);
assert.equal(result.assigner, true);
console.log('ux-r01-navigation-guard: PASS');