const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const qualityGatePath = path.join(root, 'scripts/quality-gate.sh');
const qualityGate = fs.readFileSync(qualityGatePath, 'utf8');

test('quality gate runs the V13.1 authority validator as a clean isolated gate', () => {
  assert.match(
    qualityGate,
    /run_clean_gate\s+\\\n\s+"v13_1_authority_integrity"\s+\\\n\s+node project-control\/scripts\/validate_v13_1_authority\.mjs/
  );
});

test('quality gate emits an explicit skip marker only when the validator is absent', () => {
  assert.match(
    qualityGate,
    /GATE_v13_1_authority_integrity=SKIP/
  );
});

test('V13.1 authority gate executes after project-control validation and before security scans', () => {
  const projectControlIndex = qualityGate.indexOf(
    'node project-control/scripts/validate_project_control.mjs'
  );
  const v13Index = qualityGate.indexOf(
    'node project-control/scripts/validate_v13_1_authority.mjs'
  );
  const secretScanIndex = qualityGate.indexOf(
    'bash scripts/security/p08-steel-shield/scan-secret-leaks.sh'
  );

  assert.ok(projectControlIndex >= 0, 'project-control validator must exist');
  assert.ok(v13Index > projectControlIndex, 'V13.1 gate must follow project control');
  assert.ok(secretScanIndex > v13Index, 'security scans must follow the V13.1 gate');
});
