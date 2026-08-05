# V13.1 Executable Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** تثبيت قرار المالك النهائي لـV13.1 بوصفه دستورًا تنفيذيًا يفرض سبع صور، يمنع أي رقم ظهور عالمي ثابت، ويسمح بالدردشة والتوصيل والوساطة دستوريًا مع إبقائها محجوبة إنتاجيًا حتى عقودها واختباراتها وأدلتها.

**Architecture:** حزمة تحكم إضافية تحت `project-control/v13.1/`، لا تغير Runtime أو قاعدة البيانات في هذه الشريحة. عقد JSON حتمي، اختبارات Node، مدقق Fail-Closed، وسجل تعارضات، ثم Gate إضافية في Quality Gate.

**Tech Stack:** Node.js 22 built-ins, `node:test`, JSON, SHA-256, Bash, GitHub Actions.

## Global Constraints

- لا تعديل مباشر على `main`.
- لا Framework أو Bundler أو Dependency جديدة.
- القرار النهائي للصور: 7 صور لكل إعلان، بلا زيادة مدفوعة.
- الفيديو غير مفعّل.
- `global_fixed_impressions = null` دائمًا في النواة.
- 250 و400 ممنوعان كقيمتين عالميتين.
- كمية الظهور وسعره يحددان في ختم الدولة فقط.
- الدردشة والتوصيل والوساطة مسموحة دستوريًا ومحجوبة تشغيليًا حتى عقود مستقلة واختبارات وأدلة.
- واتساب خارجي فقط، مجهز ومعطل.
- الإنتاج والدول تبقى محجوبة.
- لا Runtime أو Auth أو RLS أو Migration في شريحة الدستور.
- جميع التغييرات عبر TDD وPR وCI وخطة رجوع.

---

### Task 1: Prove RED for the Owner Constitution

**Files:**
- Create: `tests/v13-1-owner-constitution.test.cjs`

**Interfaces:**
- Consumes: `project-control/v13.1/contracts/owner_constitution.json`.
- Produces: executable owner-decision contract.

- [x] **Step 1: Write tests for authority, images, exposure, capabilities, WhatsApp and overrides**
- [x] **Step 2: Open a draft PR so GitHub Actions evaluates the proposed merge result**
- [x] **Step 3: Observe the expected failure**

Expected failure:

```text
V13.1 owner constitution must exist as an executable repository contract
```

- [x] **Step 4: Confirm unrelated tests still pass**

Evidence: Quality Gate run 29 reached the new test, passed the existing suites, and failed only the six new constitutional assertions.

---

### Task 2: Implement the Minimal Final Constitution

**Files:**
- Create: `project-control/v13.1/contracts/owner_constitution.json`
- Create: `docs/architecture/v13.1/V13_1_OWNER_FINAL_AMENDMENT.md`
- Create: `docs/architecture/v13.1/V13_1_EXECUTION_STATUS.json`
- Create: `docs/architecture/v13.1/V13_1_SCOPE_GUARD.md`
- Create: `project-control/v13.1/README_AR.md`

**Interfaces:**
- Produces the final immutable decision projection consumed by later validators and Runtime plans.

- [x] **Step 1: Set constitutional identity and fail-closed production state**

```json
{
  "constitution_id": "V13.1",
  "authority": "OWNER_FINAL_CONSTITUTION",
  "precedence": "SUPERSEDES_INCOMPATIBLE_LEGACY_RULES",
  "production_state": "BLOCKED_PENDING_CONTRACTS_TESTS_EVIDENCE"
}
```

- [x] **Step 2: Set exact media policy**

```json
{
  "max_images_per_listing": 7,
  "video_enabled": false,
  "image_limit_price_dependent": false
}
```

- [x] **Step 3: Set country-seal-only exposure policy**

```json
{
  "global_fixed_impressions": null,
  "quantity_authority": "COUNTRY_SEAL_ONLY",
  "price_authority": "COUNTRY_SEAL_ONLY",
  "forbidden_global_values": [250, 400]
}
```

- [x] **Step 4: Separate constitutional allowance from activation**

For `internal_chat`, `delivery`, and `mediation`:

```json
{
  "constitutionally_allowed": true,
  "activation_state": "BLOCKED_PENDING_DEDICATED_CONTRACTS_TESTS_EVIDENCE"
}
```

- [x] **Step 5: Keep external WhatsApp disabled**

```json
{
  "prepared": true,
  "integration_mode": "EXTERNAL_ONLY",
  "activation_state": "DISABLED",
  "internal_message_transport": false
}
```

- [x] **Step 6: Add explicit legacy overrides**

Required legacy IDs:

```text
GLOBAL_IMAGE_LIMIT_10
GLOBAL_FIXED_IMPRESSIONS_250
GLOBAL_FIXED_IMPRESSIONS_400
CHAT_FORBIDDEN
DELIVERY_FORBIDDEN
MEDIATION_FORBIDDEN
```

- [x] **Step 7: Run GitHub Actions GREEN verification**

Expected: VVIP Quality Gate success after implementing the contract.

---

### Task 3: Remove Active Documentation Contradictions

**Files:**
- Modify: `docs/superpowers/specs/2026-08-05-v13-1-executable-authority-design.md`
- Modify: `docs/superpowers/plans/2026-08-05-v13-1-executable-authority-implementation.md`

**Interfaces:**
- Both documents must mirror the executable contract and never override it.

- [x] **Step 1: Replace 10-image language with exactly seven images**
- [x] **Step 2: Replace absolute chat/delivery/mediation prohibition with allowed-but-gated language**
- [x] **Step 3: Remove any global 400/500 Pilot assumption from the active design**
- [x] **Step 4: Record WhatsApp as external-only and disabled**
- [ ] **Step 5: Add a regression test that scans active V13.1 files for contradictory claims**

Run after implementation:

```bash
node --test tests/v13-1-active-document-consistency.test.cjs
```

Expected: PASS.

---

### Task 4: Add the Fail-Closed Authority Validator

**Files:**
- Create: `project-control/scripts/validate_v13_1_authority.mjs`
- Create: `project-control/tests/v13_1_authority_integrity.test.mjs`

**Interfaces:**
- CLI: `node project-control/scripts/validate_v13_1_authority.mjs`
- Success stdout: JSON object with `status`, `constitution_id`, `production_state`, `checked_at`.
- Failure stderr: JSON object with `status: "FAIL"` and stable failure codes.

- [ ] **Step 1: Write failing tests for missing/invalid constitution**

Required error codes:

```text
V13_CONSTITUTION_MISSING
V13_CONSTITUTION_INVALID
V13_IMAGE_LIMIT_NOT_SEVEN
V13_IMAGE_LIMIT_PRICE_DEPENDENT
V13_GLOBAL_FIXED_IMPRESSIONS_FORBIDDEN
V13_CAPABILITY_ACTIVATED_WITHOUT_CONTRACT
V13_WHATSAPP_MUST_REMAIN_DISABLED
V13_SILENT_LEGACY_CONFLICT
V13_PRODUCTION_CLAIM_WITHOUT_SEALS
```

- [ ] **Step 2: Observe RED**

```bash
node --test project-control/tests/v13_1_authority_integrity.test.mjs
```

- [ ] **Step 3: Implement minimal validator with Node standard libraries**
- [ ] **Step 4: Sort failures deterministically**
- [ ] **Step 5: Run GREEN and all existing tests**
- [ ] **Step 6: Commit focused validator change**

---

### Task 5: Add Negative Fixtures

**Files:**
- Create fixture directories under `project-control/tests/fixtures/v13_1/`.

**Interfaces:**
- Each fixture copies the valid baseline and overrides one field.

- [ ] **Step 1: Add ten-images fixture**
- [ ] **Step 2: Add price-dependent-images fixture**
- [ ] **Step 3: Add global-250 fixture**
- [ ] **Step 4: Add global-400 fixture**
- [ ] **Step 5: Add activated-chat-without-contract fixture**
- [ ] **Step 6: Add activated-delivery-without-contract fixture**
- [ ] **Step 7: Add activated-mediation-without-contract fixture**
- [ ] **Step 8: Add enabled-WhatsApp fixture**
- [ ] **Step 9: Add missing-legacy-override fixture**
- [ ] **Step 10: Add false-production-allowed fixture**
- [ ] **Step 11: Run all negative cases and verify exact error codes**

---

### Task 6: Add Conflict Registry and Manifest

**Files:**
- Create: `project-control/v13.1/contracts/conflict_registry.json`
- Create: `project-control/v13.1/authority-manifest.json`
- Create: `docs/architecture/v13.1/V13_1_CONFLICT_OVERLAY.md`

**Interfaces:**
- Conflict registry maps every old rule to the governing final rule.
- Manifest contains SHA-256 for executable contracts and schemas, excluding itself.

- [ ] **Step 1: Write failing tests for missing conflicts and hash drift**
- [ ] **Step 2: Observe RED**
- [ ] **Step 3: Seed explicit conflicts**
- [ ] **Step 4: Generate contract hashes**
- [ ] **Step 5: Verify any silent legacy conflict fails CI**
- [ ] **Step 6: Commit registry and manifest**

---

### Task 7: Integrate a Dedicated V13.1 Quality Gate

**Files:**
- Create: `tests/v13-1-quality-gate-contract.test.cjs`
- Modify: `scripts/quality-gate.sh`

**Interfaces:**
- New marker: `GATE_v13_1_authority_integrity=PASS|FAIL`.

- [ ] **Step 1: Write failing static gate test**
- [ ] **Step 2: Observe RED**
- [ ] **Step 3: Add the gate after `validate_project_control`**

```bash
if [ -f project-control/scripts/validate_v13_1_authority.mjs ]; then
    run_clean_gate \
        "v13_1_authority_integrity" \
        node project-control/scripts/validate_v13_1_authority.mjs
else
    echo "GATE_v13_1_authority_integrity=SKIP"
fi
```

- [ ] **Step 4: Run syntax, focused tests and full isolated gate**
- [ ] **Step 5: Confirm official workspace unchanged**

---

### Task 8: Complete the Constitutional PR

**Files:**
- No Runtime or Migration files.

- [ ] **Step 1: Run `git diff --check`**
- [ ] **Step 2: Run all focused V13.1 tests**
- [ ] **Step 3: Run full `bash scripts/quality-gate.sh`**
- [ ] **Step 4: Verify CodeQL, Dependency Review and Project Control Integrity**
- [ ] **Step 5: Review PR diff for contradictions and secrets**
- [ ] **Step 6: Mark PR ready only when all checks are green**
- [ ] **Step 7: Merge only with exact head SHA and post-merge verification**

---

## Subsequent Full-Programming Plans

After the constitutional PR, create and execute separate TDD plans in this order:

1. Global account and country contexts.
2. Authorization envelopes and RLS.
3. Listing lifecycle and seven-image Runtime alignment.
4. Exposure capacity and country seal.
5. Wallet and double-entry ledger.
6. Seven-sector taxonomy, fields, search and filters.
7. Internal chat.
8. Delivery.
9. Mediation.
10. External WhatsApp disabled adapter and activation guard.
11. UX screen system and accessibility.
12. Security, resilience, SLO and recovery.
13. Jordan activation capsule and controlled Pilot.

Each plan must produce working, independently testable software and cannot infer missing legal, tax, payment or privacy values.

## Verification Standard

A task is complete only when:

- its test was observed failing for the intended reason;
- minimal implementation made it pass;
- all existing tests remain green;
- GitHub Actions validates the proposed merge result;
- no secret, silent conflict, Runtime overclaim or production activation was introduced.
