'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RUNTIME_ROOTS = Object.freeze([
  'src',
  'scripts',
  'config',
  'supabase/functions',
  'supabase/migrations',
]);

const FORBIDDEN_PARALLEL_PATHS = Object.freeze([
  'src/tsn26/financial-constitution.cjs',
  'src/tsn26/financial-constitution-manifest.cjs',
]);

// Exact superseded role identifiers from pre-TSN-26 financial models.
const LEGACY_ROLE_IDENTIFIERS = Object.freeze([
  'REGIONAL_MANAGER',
  'DIRECT_SUPERVISOR',
  'DIRECT_MARKETER',
  'STATE_ORGANIZER',
  'SUPPORT_MARKETER',
]);

const SELF_RELATIVE = 'scripts/tsn26/system/legacy-financial-guard.cjs';
const TEXT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.json', '.sql', '.toml', '.yml', '.yaml']);

function walkTextFiles(rootDir, relativeDir, output) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absoluteDir)) return;

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDir.replaceAll('\\', '/'), entry.name);
    const absolutePath = path.join(rootDir, relativePath);
    if (entry.isDirectory()) {
      walkTextFiles(rootDir, relativePath, output);
      continue;
    }
    if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    if (relativePath === SELF_RELATIVE) continue;
    output.push(relativePath);
  }
}

function scanLegacyFinancialResidue(rootDir) {
  const root = path.resolve(rootDir);
  const forbiddenPaths = FORBIDDEN_PARALLEL_PATHS.filter((relativePath) => fs.existsSync(path.join(root, relativePath)));
  const files = [];
  for (const runtimeRoot of RUNTIME_ROOTS) walkTextFiles(root, runtimeRoot, files);

  const legacyIdentifierHits = [];
  const legacyOperations49Hits = [];

  for (const relativePath of files) {
    const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
    for (const identifier of LEGACY_ROLE_IDENTIFIERS) {
      if (content.includes(identifier)) legacyIdentifierHits.push({ path: relativePath, identifier });
    }

    const hasOperationsMarker = /ACTUAL_OPERATIONS|operations(?:Pct|_bps|Bps)|operational allocation/i.test(content);
    const hasLegacy49 = /\b4900\b|\b49\s*%/i.test(content);
    if (hasOperationsMarker && hasLegacy49) legacyOperations49Hits.push({ path: relativePath });
  }

  return Object.freeze({
    forbiddenPaths: Object.freeze(forbiddenPaths),
    legacyIdentifierHits: Object.freeze(legacyIdentifierHits),
    legacyOperations49Hits: Object.freeze(legacyOperations49Hits),
  });
}

function assertNoLegacyFinancialResidue(rootDir) {
  const result = scanLegacyFinancialResidue(rootDir);
  const problems = [];
  if (result.forbiddenPaths.length) problems.push(`parallel paths: ${result.forbiddenPaths.join(', ')}`);
  if (result.legacyIdentifierHits.length) problems.push(`legacy identifiers: ${JSON.stringify(result.legacyIdentifierHits)}`);
  if (result.legacyOperations49Hits.length) problems.push(`legacy 49% operations: ${JSON.stringify(result.legacyOperations49Hits)}`);
  if (problems.length) throw new Error(`TSN26_LEGACY_FINANCIAL_RESIDUE:${problems.join(' | ')}`);
  return true;
}

if (require.main === module) {
  assertNoLegacyFinancialResidue(path.resolve(__dirname, '../../..'));
  process.stdout.write('TSN26_LEGACY_FINANCIAL_GUARD=PASS\n');
}

module.exports = {
  RUNTIME_ROOTS,
  FORBIDDEN_PARALLEL_PATHS,
  LEGACY_ROLE_IDENTIFIERS,
  scanLegacyFinancialResidue,
  assertNoLegacyFinancialResidue,
};
