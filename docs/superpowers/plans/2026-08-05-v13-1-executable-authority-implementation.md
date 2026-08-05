# V13.1 Executable Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** تثبيت VVIP TIGER NEXUS GENOME V13.1 داخل المستودع بوصفه سلطة معمارية قابلة للقراءة آليًا، مع كشف التعارضات ومنع أي ادعاء إنتاج بلا عقود واختبارات وأدلة.

**Architecture:** إضافة حزمة مستقلة تحت `project-control/v13.1/` دون تغيير Runtime أو Migrations. تستخدم العقود ملفات `.yaml` بصيغة JSON-compatible YAML، ويطبق Validator باستخدام Node.js القياسي فقط، ثم يدمج كGate إضافية في Quality Gate الحالية.

**Tech Stack:** Node.js 22 built-ins, `node:test`, JSON-compatible YAML, JSON Schema documents, SHA-256, Bash quality gate, GitHub Actions.

## Global Constraints

- لا تعديل مباشر على `main`؛ كل العمل على فرع وPull Request.
- لا Framework أو Bundler أو Dependency جديدة.
- لا تغيير Runtime أو Auth أو RLS أو Database Migration في هذه الخطة.
- V12 = `CONCEPT_REFERENCE`; V13.1 = `ARCHITECTURAL_AUTHORITY` داخل نطاقه.
- حالة الإنتاج تبقى `BLOCKED`.
- الأردن وكل الدول تبقى مغلقة حتى الأدلة والأختام الرسمية.
- المنصة دليل إعلاني؛ لا صفقة أو توصيل أو ضمان أو حجز أموال أو دردشة داخل المنتج المفعّل.
- الإعلان هو مصدر الدخل المفعّل؛ الفيديو غير مسموح حاليًا.
- الحد الأعلى العالمي للصور 10 ولا يزاد مقابل المال.
- لا رقم ظهور عالمي ثابت، ولا تثبيت 400/500 في النواة.
- AI لا يفتح دولة ولا يمنح صلاحية ولا يحرك مالًا.
- لا أسرار أو بيانات قانونية أو ضريبية أو مصرفية حقيقية في GitHub أو Logs.
- جميع الفحوص Fail-Closed ولا تصلح الملفات تلقائيًا.

---

## File Structure

### Files to create

- `project-control/v13.1/README_AR.md` — طريقة استخدام الحزمة وحدودها.
- `project-control/v13.1/authority-manifest.json` — الإصدار والحالة والبصمات والمدخلات المعلقة.
- `project-control/v13.1/contracts/authority_order.yaml` — ترتيب مصادر الحقيقة.
- `project-control/v13.1/contracts/decision_registry.yaml` — القرارات المحمية.
- `project-control/v13.1/contracts/conflict_registry.yaml` — تصنيف التعارضات التاريخية.
- `project-control/v13.1/contracts/state_catalog.yaml` — حالات السلطة والإطلاق.
- `project-control/v13.1/contracts/transition_matrix.yaml` — الانتقالات المسموحة.
- `project-control/v13.1/contracts/error_catalog.yaml` — رموز الفشل الحتمية.
- `project-control/v13.1/schemas/authority-manifest.schema.json`
- `project-control/v13.1/schemas/decision-registry.schema.json`
- `project-control/v13.1/schemas/conflict-registry.schema.json`
- `project-control/v13.1/schemas/state-catalog.schema.json`
- `project-control/v13.1/schemas/transition-matrix.schema.json`
- `project-control/v13.1/schemas/error-catalog.schema.json`
- `project-control/scripts/validate_v13_1_authority.mjs` — Validator CLI.
- `project-control/tests/v13_1_authority_integrity.test.mjs` — Contract tests.
- `project-control/tests/fixtures/v13_1/README.md` — Fixture contract.
- `project-control/tests/fixtures/v13_1/duplicate-decision/decision_registry.yaml`
- `project-control/tests/fixtures/v13_1/unknown-state/transition_matrix.yaml`
- `project-control/tests/fixtures/v13_1/silent-conflict/conflict_registry.yaml`
- `project-control/tests/fixtures/v13_1/production-without-seals/authority-manifest.json`
- `docs/architecture/v13.1/V13_1_CONFLICT_OVERLAY.md` — خريطة التعارض الحالية.
- `docs/architecture/v13.1/V13_1_EXECUTION_STATUS.json` — حالة تنفيذ جديدة دون تزوير التاريخ.
- `tests/v13-1-quality-gate-contract.test.cjs` — اختبار دمج البوابة.

### Files to modify

- `scripts/quality-gate.sh` — إضافة Gate مستقلة بعد Project Control.
- `docs/owner-control/README.md` — رابط إلى Overlay الجديد دون تغيير الحالة التاريخية.

---

### Task 1: Write the Failing Authority Contract Tests

**Files:**
- Create: `project-control/tests/v13_1_authority_integrity.test.mjs`

**Interfaces:**
- Consumes: CLI future `node project-control/scripts/validate_v13_1_authority.mjs [--root <path>]`.
- Produces: test contract for exit codes and stable error identifiers.

- [ ] **Step 1: Create a process helper and baseline test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const validator = path.join(repoRoot, 'project-control/scripts/validate_v13_1_authority.mjs');

function run(root = path.join(repoRoot, 'project-control/v13.1')) {
  return spawnSync(process.execPath, [validator, '--root', root], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('approved V13.1 authority package passes deterministically', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'PASS');
  assert.equal(report.version, '13.1.0');
  assert.equal(report.production_state, 'BLOCKED');
});
```

- [ ] **Step 2: Add negative tests for stable failure codes**

```js
for (const [fixture, code] of [
  ['duplicate-decision', 'V13_DUPLICATE_DECISION_ID'],
  ['unknown-state', 'V13_UNKNOWN_STATE'],
  ['silent-conflict', 'V13_SILENT_CONFLICT'],
  ['production-without-seals', 'V13_PRODUCTION_CLAIM_WITHOUT_SEALS']
]) {
  test(`${fixture} fails closed`, () => {
    const result = run(path.join(repoRoot, 'project-control/tests/fixtures/v13_1', fixture));
    assert.notEqual(result.status, 0);
    const report = JSON.parse(result.stderr);
    assert.ok(report.failures.some(item => item.code === code));
  });
}
```

- [ ] **Step 3: Run test to verify RED**

Run:

```bash
node --test project-control/tests/v13_1_authority_integrity.test.mjs
```

Expected: FAIL because the validator and package do not exist.

- [ ] **Step 4: Commit the RED contract**

```bash
git add project-control/tests/v13_1_authority_integrity.test.mjs
git commit -m "test: define V13.1 authority integrity contract"
```

---

### Task 2: Add Schemas and Core Authority Contracts

**Files:**
- Create all files under `project-control/v13.1/schemas/` and `project-control/v13.1/contracts/`.
- Create `project-control/v13.1/README_AR.md`.

**Interfaces:**
- Produces strict top-level arrays/objects consumed by the validator.
- Contract files use valid JSON text with `.yaml` extensions.

- [ ] **Step 1: Create minimal strict schemas**

Each schema must use Draft 2020-12 and `additionalProperties: false`. Example decision item:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["schema_version", "decisions"],
  "additionalProperties": false,
  "properties": {
    "schema_version": { "const": 1 },
    "decisions": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "decision_id", "version", "title_ar", "domain", "scope",
          "status", "owner_role", "rule", "forbidden_outcomes",
          "affected_contracts", "test_references", "evidence_requirements",
          "rollback_strategy"
        ],
        "properties": {
          "decision_id": { "pattern": "^[A-Z][A-Z0-9-]+-[0-9]{3}$" },
          "version": { "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$" },
          "status": { "enum": ["ACTIVE", "PENDING_OFFICIAL_INPUT", "HISTORICAL_ONLY"] }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Seed protected V13.1 decisions**

The registry must include at least:

- `PRODUCT-001`: journey ends at reveal/call.
- `PRODUCT-002`: no transaction, delivery, guarantee, escrow, brokerage or internal chat.
- `ADS-001`: visual equality independent of payment.
- `ADS-002`: advertising/exposure is the enabled revenue source.
- `ADS-003`: video disabled.
- `ADS-004`: global image ceiling 10; no paid increase.
- `GEO-001`: global account and independent market contexts.
- `AI-001`: advisory-only AI.
- `FIN-001`: double-entry and reversal-only correction.
- `REL-001`: no release without contracts, tests, evidence and approval.
- `COUNTRY-001`: countries blocked by default.
- `JO-001`: Jordan blocked pending official inputs and seals.

- [ ] **Step 3: Create authority states and transitions**

Required states:

```text
CONCEPT_REFERENCE
ARCHITECTURAL_AUTHORITY
CONTRACT_PENDING
OFFICIAL_INPUT_PENDING
EVIDENCE_PENDING
BLOCKED
READY_FOR_OWNER_REVIEW
PRODUCTION_ALLOWED
REVOKED
```

Allowed path:

```text
CONCEPT_REFERENCE -> ARCHITECTURAL_AUTHORITY
ARCHITECTURAL_AUTHORITY -> CONTRACT_PENDING
CONTRACT_PENDING -> OFFICIAL_INPUT_PENDING | EVIDENCE_PENDING
OFFICIAL_INPUT_PENDING -> EVIDENCE_PENDING
EVIDENCE_PENDING -> READY_FOR_OWNER_REVIEW
READY_FOR_OWNER_REVIEW -> PRODUCTION_ALLOWED
* -> REVOKED
```

`PRODUCTION_ALLOWED` must require all release seals and owner approval.

- [ ] **Step 4: Create conflict classifications**

Seed explicit conflicts for:

- old social Feed descriptions;
- private one-to-one communication phase;
- subscriptions/entitlements as enabled revenue;
- fixed/global impressions;
- paid visual/image advantages;
- any AI authority over security, finance or country activation;
- stale legacy phase status.

Each record must name the old artifact, old meaning, V13.1 decision, classification, enforcement and migration note.

- [ ] **Step 5: Add README and run format checks**

Run:

```bash
node -e "for (const f of require('node:fs').readdirSync('project-control/v13.1/contracts')) JSON.parse(require('node:fs').readFileSync('project-control/v13.1/contracts/'+f,'utf8'))"
git diff --check
```

Expected: exit 0.

- [ ] **Step 6: Commit contracts and schemas**

```bash
git add project-control/v13.1
git commit -m "docs: add V13.1 executable authority contracts"
```

---

### Task 3: Implement the Fail-Closed Validator

**Files:**
- Create: `project-control/scripts/validate_v13_1_authority.mjs`

**Interfaces:**
- CLI: `node .../validate_v13_1_authority.mjs --root <package-root>`.
- Success stdout: one JSON object with `status`, `version`, `production_state`, `counts`, `checked_at`.
- Failure stderr: one JSON object with `status: FAIL` and `failures: [{code,path,message}]`.

- [ ] **Step 1: Implement argument and JSON-compatible YAML loading**

```js
function parseArgs(argv) {
  const index = argv.indexOf('--root');
  return {
    root: index >= 0 ? path.resolve(argv[index + 1]) : path.resolve(defaultRoot)
  };
}

function readJsonDocument(filePath, failures) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    failures.push({
      code: 'V13_AUTHORITY_SCHEMA_INVALID',
      path: filePath,
      message: error.message
    });
    return null;
  }
}
```

- [ ] **Step 2: Implement structural validation helpers**

Implement exact helpers:

```js
validateRequiredFiles(root, failures)
validateDecisionRegistry(document, failures)
validateStateCatalog(document, failures)
validateTransitionMatrix(document, stateIds, failures)
validateConflictRegistry(document, decisionIds, failures)
validateAuthorityOrder(document, failures)
validateManifest(document, root, failures)
validateProtectedOutcomes(documents, failures)
```

- [ ] **Step 3: Enforce semantic rules**

The validator must fail when:

- a decision ID is duplicated;
- a transition uses an unknown state;
- a conflict has no classification or governing decision;
- V12 is not `CONCEPT_REFERENCE`;
- V13.1 is not `ARCHITECTURAL_AUTHORITY`;
- production is not `BLOCKED` unless all required seals are present and Passed;
- Jordan is active without official evidence;
- any enabled capability contains internal chat, delivery, escrow, transaction or brokerage;
- any enabled revenue source other than advertising/exposure is present;
- `global_fixed_impressions` equals 400 or 500;
- image ceiling exceeds 10 or is price-dependent;
- AI actions include finance, authorization, legal approval or country activation.

- [ ] **Step 4: Generate stable PASS/FAIL JSON**

Sort failures by `code`, then `path`, then `message` before output so CI results are deterministic.

- [ ] **Step 5: Run baseline tests**

Run:

```bash
node --test project-control/tests/v13_1_authority_integrity.test.mjs
```

Expected: baseline may pass; negative fixture tests still fail because fixtures are not yet created.

- [ ] **Step 6: Commit validator**

```bash
git add project-control/scripts/validate_v13_1_authority.mjs
git commit -m "feat: validate V13.1 authority package"
```

---

### Task 4: Add Negative Fixtures and Manifest Hash Enforcement

**Files:**
- Create fixture files under `project-control/tests/fixtures/v13_1/`.
- Create/modify `project-control/v13.1/authority-manifest.json`.

**Interfaces:**
- Fixtures are minimal complete package copies assembled by the test helper from baseline plus one override.

- [ ] **Step 1: Update the test helper to build temporary fixture packages**

Use `fs.cpSync(baselineRoot, tempRoot, { recursive: true })`, then copy the fixture override into the exact relative path listed in `README.md`.

- [ ] **Step 2: Create the four malicious overrides**

- Duplicate a protected `decision_id`.
- Add transition to `UNKNOWN_STATE`.
- Add legacy Feed conflict with missing classification.
- Change `production_state` to `PRODUCTION_ALLOWED` while required seals are absent.

- [ ] **Step 3: Generate SHA-256 entries**

The manifest lists every contract and schema path with lowercase SHA-256. Use:

```js
crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
```

Do not hash the manifest itself.

- [ ] **Step 4: Add hash mismatch test**

Expected code: `V13_MANIFEST_HASH_MISMATCH`.

- [ ] **Step 5: Run all authority tests**

```bash
node --test project-control/tests/v13_1_authority_integrity.test.mjs
node project-control/scripts/validate_v13_1_authority.mjs
```

Expected: all tests PASS and validator outputs `production_state: BLOCKED`.

- [ ] **Step 6: Commit fixtures and manifest**

```bash
git add project-control/v13.1/authority-manifest.json project-control/tests/fixtures/v13_1 project-control/tests/v13_1_authority_integrity.test.mjs
git commit -m "test: enforce V13.1 negative authority cases"
```

---

### Task 5: Publish the Conflict Overlay and Truthful Execution Status

**Files:**
- Create: `docs/architecture/v13.1/V13_1_CONFLICT_OVERLAY.md`
- Create: `docs/architecture/v13.1/V13_1_EXECUTION_STATUS.json`
- Modify: `docs/owner-control/README.md`

**Interfaces:**
- Readable documents mirror contract IDs; they are not an independent source of truth.

- [ ] **Step 1: Write the conflict table**

Columns:

```text
legacy_artifact | legacy_requirement | governing_decision | classification | runtime_effect | migration_owner
```

The table must classify, not delete, Feed, private communication, subscriptions, fixed impressions, paid visual advantages and stale phase state.

- [ ] **Step 2: Create the execution status overlay**

Exact initial values:

```json
{
  "schema_version": 1,
  "authority_version": "13.1.0",
  "current_program": "V13_1_EXECUTABLE_AUTHORITY",
  "current_slice": "AUTHORITY_AND_CONFLICT_FREEZE",
  "status": "IN_PROGRESS",
  "production_state": "BLOCKED",
  "country_states": { "JO": "BLOCKED_PENDING_OFFICIAL_INPUT" },
  "legacy_phase_status": "HISTORICAL_ONLY",
  "runtime_changed": false
}
```

- [ ] **Step 3: Link from owner-control README**

Add a short section stating that the old roadmap remains historical and the V13.1 overlay controls new execution within its scope.

- [ ] **Step 4: Add test assertions**

The authority test must verify all readable decision IDs exist in the executable registry and no readable document claims production readiness.

- [ ] **Step 5: Commit the overlay**

```bash
git add docs/architecture/v13.1 docs/owner-control/README.md project-control/tests/v13_1_authority_integrity.test.mjs
git commit -m "docs: publish V13.1 conflict and execution overlay"
```

---

### Task 6: Integrate the Authority Gate into the Isolated Quality Gate

**Files:**
- Modify: `scripts/quality-gate.sh`
- Create: `tests/v13-1-quality-gate-contract.test.cjs`

**Interfaces:**
- New output: `GATE_v13_1_authority_integrity=PASS|FAIL`.

- [ ] **Step 1: Write the failing static contract test**

```js
const script = fs.readFileSync(path.join(root, 'scripts/quality-gate.sh'), 'utf8');
assert.match(script, /"v13_1_authority_integrity"/);
assert.match(script, /node project-control\/scripts\/validate_v13_1_authority\.mjs/);
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/v13-1-quality-gate-contract.test.cjs
```

Expected: FAIL because the gate is absent.

- [ ] **Step 3: Add the clean gate**

Insert after `validate_project_control`:

```bash
if [ -f project-control/scripts/validate_v13_1_authority.mjs ]; then
    run_clean_gate \
        "v13_1_authority_integrity" \
        node project-control/scripts/validate_v13_1_authority.mjs
else
    echo "GATE_v13_1_authority_integrity=SKIP"
fi
```

- [ ] **Step 4: Run focused tests**

```bash
node --test tests/v13-1-quality-gate-contract.test.cjs
node --test project-control/tests/v13_1_authority_integrity.test.mjs
bash -n scripts/quality-gate.sh
```

Expected: PASS.

- [ ] **Step 5: Commit CI integration**

```bash
git add scripts/quality-gate.sh tests/v13-1-quality-gate-contract.test.cjs
git commit -m "ci: enforce V13.1 authority integrity"
```

---

### Task 7: Full Verification and Evidence

**Files:**
- Modify only if generated intentionally: none.

- [ ] **Step 1: Run format and syntax checks**

```bash
git diff --check main...HEAD
bash -n scripts/quality-gate.sh
node project-control/scripts/validate_v13_1_authority.mjs
```

Expected: all exit 0.

- [ ] **Step 2: Run focused tests**

```bash
node --test project-control/tests/v13_1_authority_integrity.test.mjs
node --test tests/v13-1-quality-gate-contract.test.cjs
```

Expected: all PASS, fail 0.

- [ ] **Step 3: Run the full isolated quality gate**

```bash
bash scripts/quality-gate.sh
```

Expected final markers:

```text
GATE_v13_1_authority_integrity=PASS
ISOLATED_WORKTREE=CLEAN
OFFICIAL_WORKSPACE=UNCHANGED
TEMP_WORKSPACE_REMOVED=YES
VVIP_QUALITY_GATE=PASS
```

- [ ] **Step 4: Verify scope**

```bash
git diff --name-only main...HEAD
```

Expected: no Runtime HTML/CSS/JS, no Supabase migration, no secret-bearing file.

- [ ] **Step 5: Verify repository hygiene**

```bash
git status --porcelain=v1
git log --oneline --decorate main..HEAD
```

Expected: clean worktree and focused commits.

---

### Task 8: Pull Request and Owner Gate

- [ ] **Step 1: Open a draft PR**

Title:

```text
docs(control): establish V13.1 executable authority
```

Body must state:

- V13.1 authority and V12 concept relationship.
- No Runtime or Database change.
- Conflicts classified rather than deleted.
- Production and Jordan remain Blocked.
- Exact test evidence and Quality Gate output.
- Rollback: revert the PR; no data migration required.

- [ ] **Step 2: Wait for GitHub Actions**

Required successful checks:

- VVIP Quality Gate.
- Project Control Integrity.
- CodeQL/Dependency Review when triggered.

- [ ] **Step 3: Review all comments**

Classify each finding as valid, invalid or outside scope using evidence. Fix valid findings with new tests before implementation changes.

- [ ] **Step 4: Mark Ready only after evidence**

Do not merge while any required check, unresolved valid review or evidence item is missing.

- [ ] **Step 5: Merge and post-merge verify**

Re-run status checks on the merge commit and update the V13.1 execution overlay in a separate closure PR; do not falsify the historical phase tracker.

---

## Plan Self-Review

- Every protected V13.1 decision has a contract and test path.
- Runtime, Auth, Payment, RLS and Migrations remain outside this slice.
- No placeholder, invented official input or production claim exists.
- Negative tests cover duplicate IDs, unknown states, silent conflicts, hash drift and false production claims.
- The quality gate is additive and preserves all existing checks.
- Rollback is a clean Git revert because this slice is documentation/contracts/tests only.
