const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'config/fusion/current-authority.json');
const validatorPath = path.join(root, 'scripts/fusion/verify-current-authority.cjs');
const ownerIndexPath = path.join(root, 'docs/fusion/FUSION_CURRENT_AUTHORITY.md');
const requirementsPath = path.join(root, 'docs/fusion/OWNER_REQUIREMENTS_TRACEABILITY_2026.md');
const ownerVisionPath = path.join(root, 'docs/fusion/OWNER_VISION_VVIP_TIGER_2026.md');
const aiShieldPath = path.join(root, 'docs/fusion/OWNER_REFERENCE_AI_REVERSE_ENGINEERING_SHIELD_2026.md');
const tigerPulseOwnerPath = path.join(root, 'docs/fusion/OWNER_REFERENCE_F07_TIGER_PULSE.md');
const tigerPulseSpecPath = path.join(root, 'docs/superpowers/specs/2026-08-13-f07-tiger-pulse-hero-dynamic-ad-ribbon-design.md');
const legacyBlueprintPath = path.join(root, 'docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md');
const architecturePath = path.join(root, 'docs/global/GLOBAL_ARCHITECTURE_DECISION_AR.md');

const REQUIRED_SUPERSEDED_IDS = [
  'LEGACY_JORDAN_FIRST',
  'LEGACY_FIXED_THREE_SECTORS',
  'LEGACY_FOUR_POSTS_WEEK',
  'LEGACY_120_DAY_LIFETIME',
  'LEGACY_TIGER_CARE',
  'LEGACY_BLUE_LOGIN',
  'LEGACY_SEPARATE_ADMIN_SURFACE'
];

const EXPECTED_FUSION_KEEP = [
  'SOA',
  'RLS',
  'release security',
  'financial ledger',
  'country gates',
  'audit',
  'recovery',
  'PR36 resource safety',
  'Strangler architecture'
];

const EXPECTED_FUSION_ADD = [
  'Single Surface',
  'Facebook muscle memory',
  'OpenSooq-grade search',
  'HEIC pipeline',
  'Adaptive Performance',
  '25K Showcase',
  '4M Digital Twin',
  'native mobile certification',
  'Sovereign Capability Graph',
  'Global Currency Fabric',
  'Runtime Vacuum'
];

const EXPECTED_PHASES = Array.from({ length: 17 }, (_, index) => `F${String(index).padStart(2, '0')}`);
const FINAL_REFERENCE = 'docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md';
const REQUIRED_REFERENCES = {
  ownerOperationalIndex: 'docs/fusion/FUSION_CURRENT_AUTHORITY.md',
  ownerRequirementsTraceability: 'docs/fusion/OWNER_REQUIREMENTS_TRACEABILITY_2026.md',
  ownerVisionReference: 'docs/fusion/OWNER_VISION_VVIP_TIGER_2026.md',
  aiPrivateCoreReference: 'docs/fusion/OWNER_REFERENCE_AI_REVERSE_ENGINEERING_SHIELD_2026.md',
  tigerPulseOwnerReference: 'docs/fusion/OWNER_REFERENCE_F07_TIGER_PULSE.md',
  tigerPulseEngineeringSpec: 'docs/superpowers/specs/2026-08-13-f07-tiger-pulse-hero-dynamic-ad-ribbon-design.md'
};

test('F00 authority manifest is the exact FUSION current authority', () => {
  assert.equal(fs.existsSync(manifestPath), true, 'current-authority.json must exist');
  assert.equal(fs.existsSync(validatorPath), true, 'authority validator must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 'VVIP_TIGER_FUSION_AUTHORITY_V1');
  assert.equal(manifest.productIdentity, 'GLOBAL_FIRST');
  assert.equal(manifest.currentReference, FINAL_REFERENCE);
  for (const [field, expected] of Object.entries(REQUIRED_REFERENCES)) {
    assert.equal(manifest[field], expected, `${field} must bind the approved owner reference`);
  }
  assert.deepEqual(manifest.fusionCore.keep, EXPECTED_FUSION_KEEP, 'FUSION retained foundations must not drift');
  assert.deepEqual(manifest.fusionCore.add, EXPECTED_FUSION_ADD, 'FUSION added systems must not drift');
  assert.equal(manifest.historicalEvidencePolicy, 'PRESERVE_OUTSIDE_CURRENT_AUTHORITY');
  assert.deepEqual(manifest.implementationPhases, EXPECTED_PHASES);
  assert.equal(manifest.digitalTwin.uniqueActors, 4_000_000);
  assert.equal(manifest.digitalTwin.simultaneousActiveUsers, 4_000_000);
  assert.equal(manifest.globalLaunchEligibilityRequiresBoth4M, true);
  assert.equal(manifest.launchTruth, 'EVIDENCE_FIRST');
  assert.equal(manifest.globalLaunchStatementAllowedOnlyWhen, 'F16_LAUNCH_PASSPORT_PASS');

  const decisions = new Map(manifest.supersededDecisions.map((entry) => [entry.id, entry.status]));
  for (const id of REQUIRED_SUPERSEDED_IDS) {
    assert.equal(decisions.get(id), 'SUPERSEDED', `${id} must be SUPERSEDED`);
  }

  const { verifyCurrentAuthority } = require(validatorPath);
  const result = verifyCurrentAuthority(manifest);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.deepEqual(result.errors, []);
});

test('F00 current owner index declares only FUSION authority', () => {
  assert.equal(fs.existsSync(ownerIndexPath), true, 'FUSION_CURRENT_AUTHORITY.md must exist');
  const text = fs.readFileSync(ownerIndexPath, 'utf8');
  assert.match(text, /CURRENT PRODUCT AUTHORITY/);
  assert.match(text, new RegExp(FINAL_REFERENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(text, /GLOBAL_FIRST/);
  assert.match(text, /SUPERSEDED \/ HISTORICAL ONLY/);
  assert.match(text, /F00\s*->\s*F16/);
  assert.match(text, /4,000,000 unique/);
  assert.match(text, /4,000,000 simultaneous/);
});

test('owner anti-omission references are present and non-empty', () => {
  for (const [label, filePath] of [
    ['owner requirements traceability', requirementsPath],
    ['owner vision', ownerVisionPath],
    ['AI-resistant private core reference', aiShieldPath],
    ['TIGER Pulse owner reference', tigerPulseOwnerPath],
    ['TIGER Pulse engineering specification', tigerPulseSpecPath]
  ]) {
    assert.equal(fs.existsSync(filePath), true, `${label} must exist`);
    const text = fs.readFileSync(filePath, 'utf8').trim();
    assert.ok(text.length > 200, `${label} must be substantive`);
  }

  const requirements = fs.readFileSync(requirementsPath, 'utf8');
  assert.match(requirements, /anti-omission/i);
  assert.match(requirements, /F00/);
  assert.match(requirements, /F16/);
  assert.match(requirements, /TIGER Pulse/i);
  assert.match(requirements, /HEIC/i);
  assert.match(requirements, /4,000,000/);
  assert.match(requirements, /Runtime Vacuum/i);
});

test('legacy official blueprint cannot remain current authority', () => {
  const text = fs.readFileSync(legacyBlueprintPath, 'utf8');
  assert.match(text, /SUPERSEDED \/ HISTORICAL ONLY/);
  assert.doesNotMatch(text, /This file is the highest product reference/);
  assert.doesNotMatch(text, /VVIP TIGER is Jordan-first/);
  assert.doesNotMatch(text, /Each account can publish 4 posts per week/);
  assert.doesNotMatch(text, /Listing lifetime is 120 days/);
  assert.doesNotMatch(text, /Tiger Care is a core unit/);
});

test('global architecture preserves Strangler but binds product authority to FUSION', () => {
  const text = fs.readFileSync(architecturePath, 'utf8');
  assert.match(text, /VVIP TIGER FUSION 2026/);
  assert.match(text, /product authority/i);
  assert.match(text, /migration architecture/i);
  assert.match(text, /Strangler Migration/);
});
