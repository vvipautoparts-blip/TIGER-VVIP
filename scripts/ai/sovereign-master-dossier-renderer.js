'use strict';

const crypto = require('node:crypto');
const proof = require('./sovereign-proof-system');
const dossier = require('./sovereign-master-dossier');
const catalog = require('./sovereign-master-dossier-catalog');
const enterprise = require('./sovereign-master-dossier-enterprise');

const INPUT_FIELDS = Object.freeze(['releaseDNA', 'claims']);
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, allowed, code) {
  if (!isPlainObject(value)) fail(code);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) fail('UNSAFE_KEY');
    if (!allowedSet.has(key)) fail(code);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function escapeCell(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function renderClaim(claim) {
  const lines = [
    `### [${claim.truthState}] ${claim.id} — ${claim.title}`,
    '',
    claim.statement,
    '',
    `- Truth state: \`${claim.truthState}\``,
    `- Claim type: \`${claim.claimType}\``,
    `- Release digest: \`${claim.releaseDigest}\``,
  ];
  if (claim.sources.length > 0) {
    lines.push('- Repository evidence:');
    for (const source of claim.sources) {
      lines.push(`  - \`${source.path}\` — SHA-256 \`${source.sha256}\` — ${source.byteLength} bytes — provenance \`${source.provenanceBoundary}\``);
    }
  } else {
    lines.push('- Repository evidence: none asserted for this truth state.');
  }
  if (claim.reverificationRequired) lines.push('- Reverification required: `true`');
  lines.push('');
  return lines;
}

function renderGapTable(gaps) {
  const lines = [
    '### Derived Gap Register',
    '',
    '| Claim | Section | State | Reverification |',
    '| --- | --- | --- | --- |',
  ];
  for (const gap of gaps) {
    lines.push(`| ${escapeCell(gap.claimId)} | ${escapeCell(gap.sectionId)} | ${escapeCell(gap.truthState)} | ${gap.reverificationRequired ? 'YES' : 'NO'} |`);
  }
  if (gaps.length === 0) lines.push('| — | — | — | — |');
  lines.push('');
  return lines;
}

function renderDatabaseSpecs() {
  const lines = ['### Enterprise Database Field Specifications', ''];
  for (const [tableName, table] of Object.entries(enterprise.DATABASE_SPECS)) {
    lines.push(
      `#### [${table.truthState}] \`public.${tableName}\``,
      '',
      table.purpose,
      '',
      `- Source contract: \`${table.sourcePath}\``,
      `- RLS / authority boundary: ${table.rls}`,
      '',
      '| Field | Type | Purpose | Security semantics |',
      '| --- | --- | --- | --- |',
    );
    for (const field of table.fields) {
      lines.push(`| \`${escapeCell(field.name)}\` | \`${escapeCell(field.type)}\` | ${escapeCell(field.purpose)} | ${escapeCell(field.security)} |`);
    }
    lines.push('');
  }
  return lines;
}

function renderApiSpecs() {
  const lines = [
    '### API and Gateway Inventory',
    '',
    '| Interface | Route / boundary | Truth state | Source | Security contract |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const api of enterprise.API_SPECS) {
    lines.push(`| ${escapeCell(api.id)} | \`${escapeCell(api.route)}\` | ${escapeCell(api.truthState)} | ${api.sourcePath ? `\`${escapeCell(api.sourcePath)}\`` : '—'} | ${escapeCell(api.security)} |`);
  }
  lines.push('', '#### Current TIGER AI request contract', '');
  const current = enterprise.API_SPECS.find((api) => api.id === 'AI-EDGE-TIGER-SOVEREIGN');
  lines.push(`Accepted client request fields in the current repository contract: ${current.requestFields.map((field) => `\`${field}\``).join(', ')}.`, '');
  lines.push('The designed `/v1/ai/*` routes remain design targets and are not presented as deployed endpoints.', '');
  return lines;
}

function renderUiSpecs() {
  const lines = ['### UI Component and Journey Specifications', ''];
  for (const screen of enterprise.UI_SPECS) {
    lines.push(`#### [${screen.truthState}] ${screen.id} — ${screen.title}`, '');
    lines.push(`- Components / journey: ${screen.components.map((component) => `\`${component}\``).join(', ')}`);
    lines.push(`- Source paths: ${screen.sourcePaths.length ? screen.sourcePaths.map((entry) => `\`${entry}\``).join(', ') : 'none — design/pending evidence only'}`);
    if (screen.note) lines.push(`- Truth note: ${screen.note}`);
    lines.push('');
  }
  return lines;
}

function renderSecurityOpsSpecs() {
  const lines = ['### Automated Operations, Load and Security Evidence Matrix', ''];
  for (const item of enterprise.SECURITY_OPS_SPECS) {
    lines.push(`#### [${item.truthState}] ${item.id}`, '', item.requirement, '');
    lines.push(`- Kind: \`${item.kind}\``);
    lines.push(`- Source paths: ${item.sourcePaths.length ? item.sourcePaths.map((entry) => `\`${entry}\``).join(', ') : 'none yet'}`, '');
  }
  return lines;
}

function renderOperationsSpecs() {
  const lines = ['### Operations, DR and Protected Activation Matrix', ''];
  for (const item of enterprise.OPERATIONS_SPECS) {
    lines.push(`#### [${item.truthState}] ${item.id}`, '', item.requirement, '');
    if (item.actions) lines.push(`- Protected actions: ${item.actions.map((action) => `\`${action}\``).join(', ')}`);
    lines.push(`- Source paths: ${item.sourcePaths.length ? item.sourcePaths.map((entry) => `\`${entry}\``).join(', ') : 'none — real evidence still required'}`, '');
  }
  return lines;
}

function renderWorkPlan() {
  const lines = [
    '### Complete Dossier Work Plan',
    '',
    '| Phase | Status | Scope | Exit criteria |',
    '| --- | --- | --- | --- |',
  ];
  for (const phase of enterprise.WORK_PLAN) {
    lines.push(`| ${escapeCell(phase.id)} — ${escapeCell(phase.title)} | ${escapeCell(phase.status)} | ${escapeCell(phase.scope)} | ${escapeCell(phase.exitCriteria.join('; '))} |`);
  }
  lines.push('', 'The final phase remains a protected owner gate; the work plan cannot auto-approve merge, database promotion or production activation.', '');
  return lines;
}

function renderMasterDossier(input) {
  assertExactKeys(input, INPUT_FIELDS, 'DOSSIER_RENDER_UNKNOWN_FIELD');
  if (!Object.prototype.hasOwnProperty.call(input, 'releaseDNA') || !Object.prototype.hasOwnProperty.call(input, 'claims')) {
    fail('DOSSIER_RENDER_REQUIRED_FIELD');
  }
  if (!proof.verifyReleaseDNAIntegrity(input.releaseDNA)) fail('DOSSIER_RENDER_RELEASE_DNA_INVALID');
  if (!Array.isArray(input.claims) || input.claims.length > 4096) fail('DOSSIER_RENDER_CLAIMS_INVALID');

  const claimIds = new Set();
  for (const claim of input.claims) {
    if (!dossier.isTrustedClaim(claim)) fail('DOSSIER_RENDER_CLAIM_UNTRUSTED');
    if (claim.releaseDigest !== input.releaseDNA.digest) fail('DOSSIER_RENDER_RELEASE_MISMATCH');
    if (claimIds.has(claim.id)) fail('DOSSIER_RENDER_DUPLICATE_CLAIM');
    claimIds.add(claim.id);
  }

  const gaps = dossier.deriveGapRegister({ releaseDNA: input.releaseDNA, claims: input.claims });
  const counts = { VERIFIED: 0, DESIGNED: 0, PENDING: 0, STALE: 0, BLOCKED: 0 };
  for (const claim of input.claims) counts[claim.truthState] += 1;

  const lines = [
    '# VVIP TIGER SOVEREIGN MASTER SYSTEM DOSSIER',
    '',
    '> Documentation Truth Rule: NO EVIDENCE -> NO VERIFIED CLAIM -> NO RELEASE AUTHORITY.',
    '',
    `Release DNA: \`${input.releaseDNA.digest}\``,
    '',
    'Platform Production Readiness: `NOT_PROVEN`',
    '',
    'This dossier distinguishes repository implementation, design intent, pending real-world evidence, stale proof and blocked release authority. A repository definition is not represented as staging or production execution evidence.',
    '',
    'Repository source facts currently prove bytes from the checked-out repository only (`CURRENT_CHECKOUT_BYTES`). Trusted commit/build/deployment provenance is a separate work-plan layer and is not implied by the renderer.',
    '',
    '## Truth-State Summary',
    '',
    '| State | Count |',
    '| --- | ---: |',
    `| VERIFIED | ${counts.VERIFIED} |`,
    `| DESIGNED | ${counts.DESIGNED} |`,
    `| PENDING | ${counts.PENDING} |`,
    `| STALE | ${counts.STALE} |`,
    `| BLOCKED | ${counts.BLOCKED} |`,
    `| Derived gaps | ${gaps.length} |`,
    '',
  ];

  for (const section of catalog.SECTIONS) {
    lines.push(`## ${section.id} — ${section.title}`, '', section.purpose, '');
    const sectionClaims = input.claims.filter((claim) => claim.sectionId === section.id);
    if (sectionClaims.length === 0) lines.push('_No claims registered for this release section._', '');
    for (const claim of sectionClaims) lines.push(...renderClaim(claim));

    if (section.id === '01_Architecture_Data_Paths') lines.push(...renderDatabaseSpecs(), ...renderApiSpecs());
    if (section.id === '02_UI_UX_User_Journeys') lines.push(...renderUiSpecs());
    if (section.id === '03_Automated_Ops_Load_Security') lines.push(...renderSecurityOpsSpecs());
    if (section.id === '04_Operations_DR_Production_Activation') lines.push(...renderOperationsSpecs());
    if (section.id === '06_Gap_Register') lines.push(...renderGapTable(gaps), ...renderWorkPlan());
    if (section.id === '07_Release_Passport') {
      lines.push(
        '### Release Authority Boundary',
        '',
        'No actual production passport or owner decision is inferred from documentation. Actual issuance requires the canonical 45-gate truth engine, valid cryptographic proof, real owner decisions, and the required production-sequence evidence for the exact Release DNA.',
        '',
      );
    }
  }

  lines.push(
    '## Document Integrity',
    '',
    'The rendered Markdown is a deterministic presentation of the supplied release-bound claims and immutable Enterprise registries. The document itself is not a source of operational authority.',
    '',
  );

  const markdown = `${lines.join('\n')}\n`;
  return deepFreeze({
    schemaVersion: 'TIGER_MASTER_DOSSIER_V1',
    releaseDigest: input.releaseDNA.digest,
    platformProductionReadiness: 'NOT_PROVEN',
    truthStateCounts: counts,
    gapCount: gaps.length,
    markdown,
    digest: sha256Text(markdown),
  });
}

module.exports = Object.freeze({
  renderMasterDossier,
});
