'use strict';

const crypto = require('node:crypto');
const proof = require('./sovereign-proof-system');
const dossier = require('./sovereign-master-dossier');
const catalog = require('./sovereign-master-dossier-catalog');

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
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
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
      lines.push(`  - \`${source.path}\` — SHA-256 \`${source.sha256}\` — ${source.byteLength} bytes`);
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
    if (section.id === '06_Gap_Register') lines.push(...renderGapTable(gaps));
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
    'The rendered Markdown is a deterministic presentation of the supplied release-bound claims. The Markdown itself is not a source of operational authority.',
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
