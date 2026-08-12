'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const policyPath = path.join(root, 'project-control', 'cost', 'lean-cost-policy.v1.json');
const validatorPath = path.join(root, 'project-control', 'cost', 'validate-lean-cost-policy.cjs');

function readPolicy() {
  assert.ok(fs.existsSync(policyPath), 'canonical lean cost policy must exist');
  return JSON.parse(fs.readFileSync(policyPath, 'utf8'));
}

function loadValidator() {
  assert.ok(fs.existsSync(validatorPath), 'lean cost policy validator must exist');
  return require(validatorPath);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('canonical launch cost policy is valid and production remains locked', () => {
  const policy = readPolicy();
  const { validatePolicy } = loadValidator();
  const result = validatePolicy(policy);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(policy.schema_version, 'VVIP-COST-1');
  assert.equal(policy.platform, 'VVIP TIGER');
  assert.equal(policy.production_mutation_authorized, false);
  assert.equal(policy.real_charge_authorized, false);
});

test('all optional high-cost services default disabled', () => {
  const policy = readPolicy();
  for (const service of policy.services) {
    if (service.optional_high_cost) assert.equal(service.default_enabled, false, service.id);
  }
});

test('validator rejects hard limit below soft limit', () => {
  const policy = clone(readPolicy());
  policy.environments.staging.hard_limit_minor = 100;
  policy.environments.staging.soft_limit_minor = 101;
  const { validatePolicy } = loadValidator();
  const result = validatePolicy(policy);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.includes('hard_limit_minor')));
});

test('validator rejects unsafe production authority', () => {
  const policy = clone(readPolicy());
  policy.production_mutation_authorized = true;
  policy.real_charge_authorized = true;
  const { validatePolicy } = loadValidator();
  const result = validatePolicy(policy);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.includes('production_mutation_authorized')));
  assert.ok(result.errors.some((item) => item.includes('real_charge_authorized')));
});

test('validator rejects credential-like material', () => {
  const policy = clone(readPolicy());
  policy.notes = 'SUPABASE_DB_PASSWORD=should-never-be-here';
  const { validatePolicy } = loadValidator();
  const result = validatePolicy(policy);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.includes('credential-like')));
});

test('every scaling rule requires measurable evidence', () => {
  const policy = clone(readPolicy());
  policy.scaling_rules[0].required_evidence = [];
  const { validatePolicy } = loadValidator();
  const result = validatePolicy(policy);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.includes('required_evidence')));
});
