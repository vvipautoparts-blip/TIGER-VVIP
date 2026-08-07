'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const proof = require('../scripts/ai/sovereign-proof-system');
const dossier = require('../scripts/ai/sovereign-master-dossier');
const catalog = require('../scripts/ai/sovereign-master-dossier-catalog');
const renderer = require('../scripts/ai/sovereign-master-dossier-renderer');

const H = (char) => char.repeat(64);
const REPO_ROOT = path.resolve(__dirname, '..');

function release(overrides = {}) {
  return proof.createReleaseDNA({
    commitSha: '3a4d7c4d789b866debfaec25e1bdeef7a4a7a99b',
    frontendBuildHash: H('a'),
    backendBuildHash: H('b'),
    migrationDigests: [{ path: 'supabase/migrations/20260807094000_tiger_sovereign_trust_fabric.sql', sha256: H('c') }],
    aiPolicyHash: H('d'), promptHash: H('e'), modelConfigHash: H('f'), toolRegistryHash: H('1'),
    rlsPolicyHash: H('2'), securityConfigHash: H('3'), environmentClass: 'RELEASE_CANDIDATE',
    ...overrides,
  });
}

test('Master Dossier has one immutable canonical eight-section structure', () => {
  assert.deepEqual(catalog.SECTIONS.map((section) => section.id), [
    '00_Executive_Truth',
    '01_Architecture_Data_Paths',
    '02_UI_UX_User_Journeys',
    '03_Automated_Ops_Load_Security',
    '04_Operations_DR_Production_Activation',
    '05_Evidence_Graph',
    '06_Gap_Register',
    '07_Release_Passport',
  ]);
  assert.equal(Object.isFrozen(catalog.SECTIONS), true);
  assert.equal(Object.isFrozen(catalog.SECTIONS[0]), true);
});

test('trusted repository source fact hashes real bytes, binds Release DNA, rejects traversal, and cannot survive JSON cloning as trusted', () => {
  const releaseDNA = release();
  const fact = dossier.createRepositorySourceFact({
    releaseDNA,
    path: 'supabase/functions/tiger-sovereign-ai/index.ts',
  });
  const expected = crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(REPO_ROOT, 'supabase/functions/tiger-sovereign-ai/index.ts')))
    .digest('hex');

  assert.equal(fact.releaseDigest, releaseDNA.digest);
  assert.equal(fact.path, 'supabase/functions/tiger-sovereign-ai/index.ts');
  assert.equal(fact.sha256, expected);
  assert.equal(dossier.isTrustedRepositorySourceFact(fact), true);
  assert.equal(dossier.isTrustedRepositorySourceFact(JSON.parse(JSON.stringify(fact))), false);
  assert.throws(() => dossier.createRepositorySourceFact({ releaseDNA, path: '../.env' }), /DOSSIER_SOURCE_PATH_INVALID/);
  assert.throws(() => dossier.createRepositorySourceFact({ releaseDNA, path: '/etc/passwd' }), /DOSSIER_SOURCE_PATH_INVALID/);
  assert.throws(() => dossier.createRepositorySourceFact({ releaseDNA, path: '..\\.env' }), /DOSSIER_SOURCE_PATH_INVALID/);
});

test('VERIFIED repository implementation claim requires a same-release trusted repository fact', () => {
  const releaseDNA = release();
  const source = dossier.createRepositorySourceFact({ releaseDNA, path: 'supabase/functions/tiger-sovereign-ai/index.ts' });
  const claim = dossier.createClaim({
    releaseDNA,
    id: 'ARCH-AI-GATEWAY-001',
    sectionId: '01_Architecture_Data_Paths',
    title: 'Current AI server boundary',
    claimType: 'REPOSITORY_IMPLEMENTATION',
    truthState: 'VERIFIED',
    statement: 'The current AI server boundary is the Supabase Edge Function tiger-sovereign-ai.',
    sources: [source],
  });
  assert.equal(claim.truthState, 'VERIFIED');
  assert.equal(claim.releaseDigest, releaseDNA.digest);
  assert.equal(Object.isFrozen(claim), true);

  assert.throws(() => dossier.createClaim({
    releaseDNA,
    id: 'ARCH-AI-GATEWAY-002', sectionId: '01_Architecture_Data_Paths', title: 'Unproven implementation',
    claimType: 'REPOSITORY_IMPLEMENTATION', truthState: 'VERIFIED', statement: 'Implemented.', sources: [],
  }), /VERIFIED_REPOSITORY_CLAIM_REQUIRES_TRUSTED_SOURCE/);
});

test('old VERIFIED claims reconcile to STALE for a changed Release DNA and never silently rebind', () => {
  const previous = release();
  const source = dossier.createRepositorySourceFact({ previous, releaseDNA: previous, path: 'supabase/functions/tiger-sovereign-ai/index.ts' });
  const claim = dossier.createClaim({
    releaseDNA: previous, id: 'ARCH-AI-GATEWAY-003', sectionId: '01_Architecture_Data_Paths', title: 'Gateway source',
    claimType: 'REPOSITORY_IMPLEMENTATION', truthState: 'VERIFIED', statement: 'Verified for previous release.', sources: [source],
  });
  const next = release({ promptHash: H('9') });
  const reconciled = dossier.reconcileClaimForRelease({ claim, releaseDNA: next });
  assert.equal(reconciled.truthState, 'STALE');
  assert.equal(reconciled.originalReleaseDigest, previous.digest);
  assert.equal(reconciled.releaseDigest, next.digest);
  assert.equal(reconciled.reverificationRequired, true);
});

test('DESIGN can be DESIGNED without runtime proof, but design cannot be relabeled VERIFIED', () => {
  const releaseDNA = release();
  const designed = dossier.createClaim({
    releaseDNA, id: 'API-DESIGN-001', sectionId: '01_Architecture_Data_Paths', title: 'Future execute route',
    claimType: 'DESIGN', truthState: 'DESIGNED', statement: 'Proposed route: /v1/ai/execute.', sources: [],
  });
  assert.equal(designed.truthState, 'DESIGNED');
  assert.throws(() => dossier.createClaim({
    releaseDNA, id: 'API-DESIGN-002', sectionId: '01_Architecture_Data_Paths', title: 'Future approval route',
    claimType: 'DESIGN', truthState: 'VERIFIED', statement: 'Proposed route: /v1/ai/approval-requests.', sources: [],
  }), /DESIGN_CLAIM_CANNOT_BE_VERIFIED/);
});

test('performance target is not measurement evidence and cannot become VERIFIED without trusted measurement proof', () => {
  const releaseDNA = release();
  const target = dossier.createClaim({
    releaseDNA, id: 'PERF-TARGET-001', sectionId: '03_Automated_Ops_Load_Security', title: 'Latency target',
    claimType: 'MEASUREMENT', truthState: 'PENDING', statement: 'Target p95 latency is below 150 ms.', sources: [],
  });
  assert.equal(target.truthState, 'PENDING');
  assert.throws(() => dossier.createClaim({
    releaseDNA, id: 'PERF-TARGET-002', sectionId: '03_Automated_Ops_Load_Security', title: 'Latency measured',
    claimType: 'MEASUREMENT', truthState: 'VERIFIED', statement: 'p95 latency is below 150 ms.', sources: [],
  }), /VERIFIED_MEASUREMENT_REQUIRES_TRUSTED_MEASUREMENT/);
});

test('automated CI evidence cannot satisfy MANUAL_ACCEPTANCE truth', () => {
  const releaseDNA = release();
  const source = dossier.createRepositorySourceFact({ releaseDNA, path: 'tests/pr36-media-worker.test.cjs' });
  assert.throws(() => dossier.createClaim({
    releaseDNA, id: 'PR36-MANUAL-001', sectionId: '02_UI_UX_User_Journeys', title: 'PR36 real image upload',
    claimType: 'MANUAL_ACCEPTANCE', truthState: 'VERIFIED', statement: 'Real JPG upload path is manually accepted.', sources: [source],
  }), /VERIFIED_MANUAL_ACCEPTANCE_REQUIRES_MANUAL_EVIDENCE/);
});

test('canonical catalog truthfully separates implemented source facts from proposed APIs and pending real-world proof', () => {
  const ids = new Set(catalog.CLAIMS.map((claim) => claim.id));
  for (const id of [
    'ARCH-AI-EDGE-FUNCTION',
    'DATA-AI-APPROVAL-REQUESTS',
    'DATA-AI-AUDIT-EVENTS',
    'API-V1-AI-EXECUTE',
    'API-V1-AI-APPROVAL-REQUESTS',
    'API-V1-AI-AUDIT-EVENTS',
    'UI-OWNER-CONTROL',
    'UI-PR36-MANUAL-REAL-IMAGE',
    'OPS-LOAD-P95-150MS-TARGET',
    'OPS-DR-RESTORE-DRILL',
    'OPS-OWNER-TRIPLE-APPROVAL',
  ]) assert.equal(ids.has(id), true, `${id} must exist in canonical dossier catalog`);

  assert.equal(catalog.CLAIMS.find((claim) => claim.id === 'ARCH-AI-EDGE-FUNCTION').defaultTruthState, 'VERIFIED');
  assert.equal(catalog.CLAIMS.find((claim) => claim.id === 'API-V1-AI-EXECUTE').defaultTruthState, 'DESIGNED');
  assert.equal(catalog.CLAIMS.find((claim) => claim.id === 'UI-PR36-MANUAL-REAL-IMAGE').defaultTruthState, 'PENDING');
  assert.equal(catalog.CLAIMS.find((claim) => claim.id === 'OPS-LOAD-P95-150MS-TARGET').defaultTruthState, 'PENDING');
});

test('gap register is derived from claim truth and cannot omit pending, stale or blocked claims', () => {
  const releaseDNA = release();
  const claims = [
    dossier.createClaim({ releaseDNA, id: 'A-001', sectionId: '00_Executive_Truth', title: 'Verified', claimType: 'GOVERNANCE', truthState: 'VERIFIED', statement: 'Verified governance fact.', sources: [] }),
    dossier.createClaim({ releaseDNA, id: 'A-002', sectionId: '00_Executive_Truth', title: 'Pending', claimType: 'DESIGN', truthState: 'PENDING', statement: 'Pending work.', sources: [] }),
    dossier.createClaim({ releaseDNA, id: 'A-003', sectionId: '00_Executive_Truth', title: 'Blocked', claimType: 'DESIGN', truthState: 'BLOCKED', statement: 'Blocked work.', sources: [] }),
  ];
  const gaps = dossier.deriveGapRegister({ releaseDNA, claims });
  assert.deepEqual(gaps.map((gap) => gap.claimId), ['A-002', 'A-003']);
});

test('renderer emits all canonical sections, visible truth labels, and never claims platform 100% without attested passport proof', () => {
  const releaseDNA = release();
  const claims = catalog.instantiateClaims({ releaseDNA });
  const result = renderer.renderMasterDossier({ releaseDNA, claims });

  for (const section of catalog.SECTIONS) assert.match(result.markdown, new RegExp(section.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(result.markdown, /\[VERIFIED\]/);
  assert.match(result.markdown, /\[DESIGNED\]/);
  assert.match(result.markdown, /\[PENDING\]/);
  assert.equal(result.platformProductionReadiness, 'NOT_PROVEN');
  assert.doesNotMatch(result.markdown, /PRODUCTION_READY_100|100% production ready/i);
});

test('unknown or authority-shaped fields fail closed', () => {
  const releaseDNA = release();
  assert.throws(() => dossier.createRepositorySourceFact({ releaseDNA, path: 'README.md', ownerApproved: true }), /DOSSIER_SOURCE_UNKNOWN_FIELD/);
  assert.throws(() => dossier.createClaim({
    releaseDNA, id: 'AUTH-001', sectionId: '00_Executive_Truth', title: 'Authority', claimType: 'DESIGN',
    truthState: 'PENDING', statement: 'No authority.', sources: [], ownerApproved: true,
  }), /DOSSIER_CLAIM_UNKNOWN_FIELD/);
});
