'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('current project status cannot advertise superseded PR #345 as the active lane', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  assert.doesNotMatch(status, /Active lane:\s*PR #345\b/);
  assert.match(status, /PR #349\b/);
  assert.match(status, /TIGER NEXUS 2026/);
});

test('status surface remains subordinate to the mandatory owner binding', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  assert.match(status, /NON_AUTHORITATIVE_STATUS/);
  assert.match(status, /TIGER_OWNER_BINDING_CURRENT\.md/);
});

test('current deletion manifest exists and is bound to latest-only owner authority', () => {
  const manifest = read('docs/owner-control/DELETION_MANIFEST_CURRENT.md');
  assert.match(manifest, /TIGER_OWNER_BINDING_CURRENT\.md/);
  assert.match(manifest, /fusion-home-f02\.html/);
  assert.match(manifest, /scripts\/fusion\/f02-feed\.js/);
  assert.match(manifest, /scripts\/runtime\/vvip-marketplace-repository\.js/);
  assert.match(manifest, /scripts\/nexus\/pulse-vault\.js/);
  assert.match(manifest, /scripts\/nexus\/pulse-runtime\.js/);
  assert.match(manifest, /tests\/nexus\/pulse-vault\.test\.cjs/);
  assert.match(manifest, /tests\/nexus\/pulse-runtime\.test\.cjs/);
  assert.match(manifest, /P10_THREE_SECTOR_STRUCTURED_FIELDS\.md/);
  assert.match(manifest, /OWNER_BINDING_DECISIONS_2026-08-12\.md/);
  assert.match(manifest, /VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12\.md/);
  assert.match(manifest, /VVIP_TIGER_OWNER_MASTER_REFERENCE\.md/);
  assert.match(manifest, /VVIP_TIGER_MASTER_EXECUTION_ROADMAP\.yaml/);
  assert.match(manifest, /VVIP_TIGER_PHASE_TRACKER\.md/);
  assert.match(manifest, /phase-status\.json/);
  assert.match(manifest, /Git history/i);
  assert.match(manifest, /no blind deletion/i);
});

test('human and machine current authorities converge on one NEXUS first reference', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  const binding = read('docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  const router = read('docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md');
  const config = JSON.parse(read('config/fusion/current-authority.json'));
  const registry = JSON.parse(read('project-control/authority/authority-registry.v1.json'));

  assert.equal(config.currentReference, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  assert.equal(config.currentExperience, 'TIGER_NEXUS_2026');
  assert.equal(config.firstReferenceRequired, true);
  assert.match(binding, /Latest-only constitution/i);
  assert.match(router, /CURRENT_ONLY/);
  assert.match(status, /PR #349\b/);

  const owner = registry.records.find((record) => record.authority_id === 'authority.owner-constitution.v1');
  const platform = registry.records.filter((record) => record.domain === 'platform' && record.status === 'CURRENT_ONLY');
  assert.equal(owner?.canonical_path, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  assert.equal(platform.length, 1);
  assert.equal(platform[0].canonical_path, 'docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md');
  assert.deepEqual(platform[0].supersedes, ['TIGER_ONE_2026']);
});

test('current NEXUS implementation plan cannot resurrect deleted client Pulse Vault runtime', () => {
  const plan = read('docs/superpowers/plans/2026-08-29-tiger-nexus-2026.md');
  assert.doesNotMatch(plan, /Create:\s*`scripts\/nexus\/pulse-vault\.js`/);
  assert.doesNotMatch(plan, /Create:\s*`tests\/nexus\/pulse-vault\.test\.cjs`/);
  assert.match(plan, /scripts\/nexus\/pulse-runtime\.js/);
  assert.match(plan, /tests\/nexus\/pulse-runtime\.test\.cjs/);
});

test('current tree cannot retain fixed three-sector owner-control artifact', () => {
  assert.equal(
    fs.existsSync(path.join(root, 'docs/owner-control/P10_THREE_SECTOR_STRUCTURED_FIELDS.md')),
    false
  );
  const config = JSON.parse(read('config/fusion/current-authority.json'));
  assert.equal(config.nexus.activatedSectorsOnly, true);
});

test('superseded owner-canonical binding cannot remain in current tree', () => {
  assert.equal(
    fs.existsSync(path.join(root, 'docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md')),
    false
  );
  const binding = read('docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  assert.match(binding, /CURRENT_ONLY \/ OWNER_BINDING \/ FIRST_REFERENCE/);
});

test('owner-control tree contains no competing BINDING OWNER-CANONICAL declaration', () => {
  const ownerControl = path.join(root, 'docs/owner-control');
  const hits = [];
  for (const name of fs.readdirSync(ownerControl)) {
    if (!name.endsWith('.md')) continue;
    const source = fs.readFileSync(path.join(ownerControl, name), 'utf8');
    if (/\*\*Status:\*\*\s*BINDING\s*\/\s*OWNER-CANONICAL/i.test(source)) hits.push(name);
    if (/This Owner Binding Decisions file is the binding owner decision truth/i.test(source)) hits.push(name);
  }
  assert.deepEqual([...new Set(hits)], []);
});

test('superseded owner master control plane cannot compete with CURRENT_ONLY authority', () => {
  const retired = [
    'docs/owner-control/VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12.md',
    'docs/owner-control/VVIP_TIGER_OWNER_MASTER_REFERENCE.md',
    'docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.md',
    'docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml',
    'docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP_COMPLETION.md',
    'docs/owner-control/VVIP_TIGER_PHASE_TRACKER.md',
    'docs/owner-control/phase-status.json',
    'docs/change-control/20260710-master-execution-roadmap.json'
  ];
  for (const relative of retired) {
    assert.equal(fs.existsSync(path.join(root, relative)), false, `${relative} must stay deleted`);
  }

  const readme = read('docs/owner-control/README.md');
  assert.match(readme, /TIGER_OWNER_BINDING_CURRENT\.md/);
  assert.match(readme, /CURRENT_ONLY/);
  assert.doesNotMatch(readme, /VVIP_TIGER_OWNER_MASTER_REFERENCE\.md[\s\S]{0,160}المرجع الأعلى/);
  assert.doesNotMatch(readme, /VVIP_TIGER_MASTER_EXECUTION_ROADMAP\.(?:yaml|md)[\s\S]{0,160}المرجع الرسمي/);
});

test('latest owner Pulse and finance decisions cannot regress to superseded values', () => {
  const fusion = JSON.parse(read('config/fusion/current-authority.json'));
  const finance = JSON.parse(read('config/finance/current-distribution.json'));
  const binding = read('docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  const pulse = read('docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md');
  const financeAuthority = read('docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md');
  const values = read('docs/owner-control/VVIP_TIGER_VALUES_AND_NAMES_CHARTER.md');
  const registry = JSON.parse(read('project-control/authority/authority-registry.v1.json'));

  assert.deepEqual(fusion.pulseRing.tiersJod, [2, 10, 20, 45]);
  assert.match(binding, /PULSE_20/);
  assert.match(pulse, /PULSE_20/);
  assert.doesNotMatch(binding, /PULSE_25/);

  assert.equal(Object.prototype.hasOwnProperty.call(finance.mainDistributionPercent, 'TAX_RESERVE'), false);
  assert.equal(finance.pendingOwnerDecisionPercent, 16);
  assert.equal(finance.distributionExecutionAuthorized, false);
  assert.equal(finance.mainDistributionPercent.ACTUAL_OPERATIONS, 43);
  assert.equal(finance.actualOperationsPercent.CSR, 3);
  assert.match(financeAuthority, /TAX_RESERVE_STATUS:\s*CANCELLED/);
  assert.match(financeAuthority, /no separate 1% charity allocation/i);
  assert.doesNotMatch(values, /تخصيص\s+1%/);

  const advertising = registry.records.find((record) => record.domain === 'advertising' && record.status === 'CURRENT_ONLY');
  const financial = registry.records.find((record) => record.domain === 'financial-distribution' && record.status === 'CURRENT_ONLY');
  assert.ok(advertising.protected_boundaries.includes('2-10-20-45-jod'));
  assert.ok(financial.protected_boundaries.includes('tax-reserve-cancelled'));
  assert.ok(financial.protected_boundaries.includes('no-invented-reallocation'));
});
