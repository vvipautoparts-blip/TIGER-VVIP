const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaPath = path.join(__dirname, '..', 'config', 'fusion', 'f13-digital-twin-evidence-schema.json');

test('F13A evidence schema requires immutable run identity and measured scale evidence', () => {
  assert.equal(fs.existsSync(schemaPath), true, 'F13 evidence schema must exist');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  assert.equal(schema.$id, 'VVIP_TIGER_FUSION_F13_DIGITAL_TWIN_EVIDENCE_V1');
  assert.deepEqual(schema.properties.result.enum, ['PLANNED', 'RUNNING', 'PASS', 'FAIL']);
  for (const field of ['result','environment','commitSha','artifactDigest','runStartedAt','runFinishedAt','targetUniqueActors','targetSimultaneousActiveUsers','measuredUniqueActors','measuredPeakSimultaneousUsers','failureCount','replaySeeds']) {
    assert.ok(schema.required.includes(field), `required field missing: ${field}`);
  }
  assert.equal(schema.properties.targetUniqueActors.const, 4_000_000);
  assert.equal(schema.properties.targetSimultaneousActiveUsers.const, 4_000_000);
  assert.equal(schema.properties.commitSha.pattern, '^[0-9a-f]{40}$');
  assert.equal(schema.properties.artifactDigest.pattern, '^sha256:[0-9a-f]{64}$');
  assert.equal(schema.additionalProperties, false);
});

test('F13A PASS contract encodes exact measured 4M thresholds and zero failures', () => {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const passRule = schema.allOf.find((entry) => entry.if && entry.if.properties && entry.if.properties.result && entry.if.properties.result.const === 'PASS');
  assert.ok(passRule, 'PASS conditional rule must exist');
  assert.equal(passRule.then.properties.measuredUniqueActors.minimum, 4_000_000);
  assert.equal(passRule.then.properties.measuredPeakSimultaneousUsers.minimum, 4_000_000);
  assert.equal(passRule.then.properties.failureCount.const, 0);
  assert.equal(passRule.then.properties.globalLaunchEligible.const, false, 'F13 PASS alone cannot declare global launch eligibility');
});