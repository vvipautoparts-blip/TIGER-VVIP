# VVIP TIGER LEAN GLOBAL Cost Governor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement COST-01: a repository-enforced, fail-closed cost policy that prevents unsafe budget configuration before any paid infrastructure is activated.

**Architecture:** Add one canonical JSON policy under `project-control/cost`, one side-effect-free Node.js validator, one focused Node test suite, and wire the existing VVIP Quality Gate to verify this stacked branch. The governor is policy-only in COST-01: it cannot call cloud APIs, deploy resources, mutate Production, or create charges.

**Tech Stack:** JSON, Node.js 22 built-ins (`fs`, `path`, `assert`, `node:test`), GitHub Actions, existing `scripts/quality-gate.sh`.

## Global Constraints

- Base source is `73551218df2647e88ee801b86bdb97ed00bbf758`.
- Work stays on `feat/lean-global-cost-governor-20260808`; `main` is not modified.
- Production database is not mutated.
- Production Edge Functions are not deployed or changed.
- No paid cloud resource, billing plan, payment method, provider subscription, or real charge is authorized.
- No secrets or provider credentials are added to source control.
- Existing security gates and fail-closed behavior are not weakened for cost savings.
- Every optimization remains reversible and independently testable.
- COST-01 does not claim a future monthly bill; later cost claims require measured Staging evidence.

---

## File Map

- Create `project-control/cost/lean-cost-policy.v1.json` — canonical cost policy data only.
- Create `project-control/cost/validate-lean-cost-policy.cjs` — pure validation library + CLI entry point; no provider/network calls.
- Create `tests/lean-cost-governor.test.cjs` — TDD contract and mutation tests.
- Modify `.github/workflows/vvip-quality-gate.yml` — add this stack/base to existing gate triggers rather than creating a duplicate expensive workflow.
- Existing design: `docs/superpowers/specs/2026-08-08-lean-global-cost-governor-design.md`.

---

### Task 1: RED contract for canonical cost policy

**Files:**
- Create: `tests/lean-cost-governor.test.cjs`

**Interfaces:**
- Consumes: future `validatePolicy(policy)` export from `project-control/cost/validate-lean-cost-policy.cjs`.
- Produces: executable requirements for the canonical policy and validator.

- [ ] **Step 1: Write the failing test**

Create `tests/lean-cost-governor.test.cjs` with the following contract:

```js
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
```

- [ ] **Step 2: Commit the RED test**

Commit message:

```text
test(cost): define lean cost governor contract
```

The repository Quality Gate is expected to be RED because the policy/validator do not yet exist.

---

### Task 2: Canonical policy and validator GREEN

**Files:**
- Create: `project-control/cost/lean-cost-policy.v1.json`
- Create: `project-control/cost/validate-lean-cost-policy.cjs`
- Test: `tests/lean-cost-governor.test.cjs`

**Interfaces:**
- `validatePolicy(policy: object) -> { ok: boolean, errors: string[] }`
- CLI: `node project-control/cost/validate-lean-cost-policy.cjs [optional-policy-path]`; exit `0` for valid, `1` for invalid/missing/malformed.

- [ ] **Step 1: Create the canonical policy**

Use schema `VVIP-COST-1` with:

```json
{
  "schema_version": "VVIP-COST-1",
  "platform": "VVIP TIGER",
  "currency": "USD",
  "accounting_unit": "minor",
  "production_mutation_authorized": false,
  "real_charge_authorized": false,
  "hard_limit_increase_approval_class": "OWNER_PROTECTED_COST_APPROVAL",
  "environments": {
    "local": { "soft_limit_minor": 0, "hard_limit_minor": 0 },
    "ci": { "soft_limit_minor": 0, "hard_limit_minor": 0 },
    "staging": { "soft_limit_minor": 0, "hard_limit_minor": 0 },
    "production": { "soft_limit_minor": 0, "hard_limit_minor": 0 }
  },
  "services": [
    { "id": "static_delivery", "optional_high_cost": false, "default_enabled": true },
    { "id": "database", "optional_high_cost": false, "default_enabled": true },
    { "id": "object_storage", "optional_high_cost": false, "default_enabled": true },
    { "id": "edge_server_compute", "optional_high_cost": false, "default_enabled": true },
    { "id": "ai_inference", "optional_high_cost": true, "default_enabled": false },
    { "id": "high_volume_observability", "optional_high_cost": true, "default_enabled": false },
    { "id": "sms_otp_delivery", "optional_high_cost": true, "default_enabled": false },
    { "id": "video_processing", "optional_high_cost": true, "default_enabled": false }
  ],
  "launch_principles": [
    "STATIC_FIRST",
    "PAY_FOR_MEASURED_DEMAND",
    "ZERO_IDLE_OPTIONAL_WORKERS",
    "DIRECT_OBJECT_STORAGE_MEDIA",
    "DATABASE_EFFICIENCY_BEFORE_SCALE",
    "AI_FAIL_CLOSED_AND_BUDGETED",
    "BOUNDED_DIAGNOSTIC_TELEMETRY",
    "SECURITY_EVIDENCE_OVERRIDES_COST_OPTIMIZATION"
  ],
  "scaling_rules": [
    {
      "id": "SCALE_ONLY_WITH_MEASURED_PRESSURE",
      "required_evidence": ["staging_usage", "capacity_pressure", "unit_cost_projection"],
      "owner_approval_required_for_production_hard_limit_increase": true
    }
  ]
}
```

Zero-dollar ceilings are intentional in COST-01: the repository governor establishes a no-charge baseline before provider-specific pricing/budgets are separately approved.

- [ ] **Step 2: Implement the side-effect-free validator**

`project-control/cost/validate-lean-cost-policy.cjs` must:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_ENVIRONMENTS = ['local', 'ci', 'staging', 'production'];
const REQUIRED_SERVICES = [
  'static_delivery', 'database', 'object_storage', 'edge_server_compute',
  'ai_inference', 'high_volume_observability', 'sms_otp_delivery', 'video_processing'
];
const CREDENTIAL_PATTERNS = [
  /service_role\s*[:=]/i,
  /SUPABASE_DB_PASSWORD\s*[:=]/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i,
  /sk_(live|test)_[A-Za-z0-9]+/i,
  /api[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{12,}/i
];

function validatePolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return { ok: false, errors: ['policy must be an object'] };
  }
  if (policy.schema_version !== 'VVIP-COST-1') errors.push('schema_version must be VVIP-COST-1');
  if (policy.platform !== 'VVIP TIGER') errors.push('platform must be VVIP TIGER');
  if (policy.currency !== 'USD') errors.push('currency must be USD in COST-01');
  if (policy.accounting_unit !== 'minor') errors.push('accounting_unit must be minor');
  if (policy.production_mutation_authorized !== false) errors.push('production_mutation_authorized must remain false in COST-01');
  if (policy.real_charge_authorized !== false) errors.push('real_charge_authorized must remain false in COST-01');
  if (policy.hard_limit_increase_approval_class !== 'OWNER_PROTECTED_COST_APPROVAL') {
    errors.push('hard_limit_increase_approval_class must be OWNER_PROTECTED_COST_APPROVAL');
  }

  if (!policy.environments || typeof policy.environments !== 'object') {
    errors.push('environments must be an object');
  } else {
    for (const name of REQUIRED_ENVIRONMENTS) {
      const env = policy.environments[name];
      if (!env || typeof env !== 'object') {
        errors.push(`environment ${name} is required`);
        continue;
      }
      for (const key of ['soft_limit_minor', 'hard_limit_minor']) {
        if (!Number.isSafeInteger(env[key]) || env[key] < 0) errors.push(`${name}.${key} must be a non-negative safe integer`);
      }
      if (Number.isSafeInteger(env.soft_limit_minor) && Number.isSafeInteger(env.hard_limit_minor) && env.hard_limit_minor < env.soft_limit_minor) {
        errors.push(`${name}.hard_limit_minor must be >= soft_limit_minor`);
      }
    }
  }

  if (!Array.isArray(policy.services)) {
    errors.push('services must be an array');
  } else {
    const seen = new Set();
    for (const service of policy.services) {
      if (!service || typeof service.id !== 'string' || !service.id) {
        errors.push('service id is required');
        continue;
      }
      if (seen.has(service.id)) errors.push(`duplicate service id: ${service.id}`);
      seen.add(service.id);
      if (typeof service.optional_high_cost !== 'boolean') errors.push(`${service.id}.optional_high_cost must be boolean`);
      if (typeof service.default_enabled !== 'boolean') errors.push(`${service.id}.default_enabled must be boolean`);
      if (service.optional_high_cost === true && service.default_enabled !== false) errors.push(`${service.id} optional high-cost service must default disabled`);
    }
    for (const id of REQUIRED_SERVICES) if (!seen.has(id)) errors.push(`required service missing: ${id}`);
  }

  if (!Array.isArray(policy.scaling_rules) || policy.scaling_rules.length === 0) {
    errors.push('scaling_rules must contain at least one rule');
  } else {
    for (const rule of policy.scaling_rules) {
      if (!rule || typeof rule.id !== 'string' || !rule.id) errors.push('scaling rule id is required');
      if (!Array.isArray(rule.required_evidence) || rule.required_evidence.length === 0 || rule.required_evidence.some((item) => typeof item !== 'string' || !item.trim())) {
        errors.push(`${rule?.id || 'scaling rule'}.required_evidence must contain measurable evidence keys`);
      }
      if (rule.owner_approval_required_for_production_hard_limit_increase !== true) {
        errors.push(`${rule?.id || 'scaling rule'} must require owner approval for production hard-limit increase`);
      }
    }
  }

  const serialized = JSON.stringify(policy);
  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(serialized)) {
      errors.push('policy contains credential-like material');
      break;
    }
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  const defaultPath = path.join(__dirname, 'lean-cost-policy.v1.json');
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPath;
  try {
    const policy = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const result = validatePolicy(policy);
    if (!result.ok) {
      for (const error of result.errors) console.error(`COST_POLICY_ERROR=${error}`);
      process.exitCode = 1;
      return;
    }
    console.log('VVIP_LEAN_COST_POLICY=PASS');
  } catch (error) {
    console.error(`COST_POLICY_ERROR=${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { validatePolicy };

if (require.main === module) main();
```

This file contains no `fetch`, HTTP client, provider SDK, shell execution, database connection, or credential input.

- [ ] **Step 3: Run focused tests**

Run:

```bash
node --test tests/lean-cost-governor.test.cjs
node project-control/cost/validate-lean-cost-policy.cjs
```

Expected:

```text
all tests PASS
VVIP_LEAN_COST_POLICY=PASS
```

- [ ] **Step 4: Commit GREEN implementation**

Commit message:

```text
feat(cost): add fail-closed lean cost governor
```

---

### Task 3: Wire existing Quality Gate without duplicating CI

**Files:**
- Modify: `.github/workflows/vvip-quality-gate.yml`

**Interfaces:**
- Consumes: existing `scripts/quality-gate.sh`, which already runs every `tests/*.test.cjs` file.
- Produces: exact-head Quality Gate runs for the COST-01 branch/PR.

- [ ] **Step 1: Add the documentation base branch to PR triggers**

Under `on.pull_request.branches`, add:

```yaml
      - feat/documentation-sovereign-knowledge-plane-20260808
```

- [ ] **Step 2: Add the COST-01 branch to push triggers**

Under `on.push.branches`, add:

```yaml
      - feat/lean-global-cost-governor-20260808
```

Do not create a second full quality workflow; reuse the existing one to avoid duplicate CI compute.

- [ ] **Step 3: Commit workflow trigger change**

Commit message:

```text
ci(cost): verify lean cost governor exact heads
```

---

### Task 4: Exact-head verification and Draft PR

**Files:**
- No runtime files added.
- PR metadata only after exact-head branch checks are observable.

**Interfaces:**
- Consumes: COST-01 exact HEAD.
- Produces: reviewable Draft PR stacked on `feat/documentation-sovereign-knowledge-plane-20260808`.

- [ ] **Step 1: Verify branch head and diff**

Confirm the branch remains a descendant of `73551218df2647e88ee801b86bdb97ed00bbf758` and contains only COST-01 design/plan/policy/validator/tests/CI-trigger changes.

- [ ] **Step 2: Inspect GitHub Actions for exact HEAD**

Required truth before any merge statement:

```text
VVIP Quality Gate = PASS on exact COST-01 HEAD
```

CodeQL / Dependency Review / Project Control results are recorded if they trigger; lack of a triggered independent check is not converted into PASS.

- [ ] **Step 3: Open Draft PR**

Base:

```text
feat/documentation-sovereign-knowledge-plane-20260808
```

Head:

```text
feat/lean-global-cost-governor-20260808
```

PR boundaries must explicitly state:

```text
MAIN=LOCKED
PRODUCTION_DB=LOCKED
PRODUCTION_EDGE=LOCKED
REAL_CHARGES=NOT_AUTHORIZED
PROVIDER_PURCHASES=NOT_AUTHORIZED
```

- [ ] **Step 4: Stop at protected review boundary**

Do not merge, deploy, apply remote migrations, configure paid providers, or raise production limits from this task.

---

## Plan Self-Review

- Spec coverage: COST-01 policy, validator, tests, CI, exact-head evidence, no-paid-resource boundary are all mapped.
- Scope: Later COST-02 through COST-07 remain separate implementation slices; they are intentionally not bundled into COST-01.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: `validatePolicy(policy) -> { ok, errors }` is consistent across tests and implementation.
- Cost discipline: reuses the existing full Quality Gate instead of adding a duplicate workflow.
