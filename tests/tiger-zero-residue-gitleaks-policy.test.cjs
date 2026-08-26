const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const policyPath = path.join(__dirname, '..', '.gitleaks.toml');

test('zero-residue policy narrowly allowlists the known Gate 5 idempotency fixture', () => {
  const policy = fs.readFileSync(policyPath, 'utf8');

  assert.match(
    policy,
    /description = "Known non-secret historical Gate 5 idempotency fixture"/,
  );
  assert.match(policy, /targetRules = \["generic-api-key"\]/);
  assert.match(policy, /condition = "AND"/);
  assert.match(
    policy,
    /commits = \["fb0a0a023f7445c143ca88e16cf638174fb2c7fc"\]/,
  );
  assert.match(
    policy,
    /paths = \['''\^tests\/tiger-gate5-network-chaos\\\.test\\\.mjs\$'''\]/,
  );
  assert.match(
    policy,
    /regexTarget = "line"/,
  );
  assert.match(
    policy,
    /regexes = \['''idempotencyKey:\\s\*'idem-chaos-001''''\]/,
  );
});
