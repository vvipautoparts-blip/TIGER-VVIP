'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ACTIVE_ROOTS = Object.freeze([
  'apps/',
  'packages/',
  'scripts/',
  'src/',
  'server/',
  'api/',
  'prisma/schema.prisma',
  'supabase/functions/',
]);

const EXCLUDED_PREFIXES = Object.freeze([
  'scripts/tsn26/',
  'docs/',
  'reports/',
  'archive/',
  'archives/',
  'tests/',
  'prisma/migrations/',
  'supabase/migrations/',
]);

const SOURCE_EXTENSIONS = new Set([
  '.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.json', '.sql', '.prisma', '.py', '.sh',
]);

const FORBIDDEN_LEGACY_PATTERNS = Object.freeze([
  { id: 'LEGACY_REGIONAL_MANAGER', regex: /\bREGIONAL_MANAGER\b/g },
  { id: 'LEGACY_DIRECT_SUPERVISOR', regex: /\bDIRECT_SUPERVISOR\b/g },
  { id: 'LEGACY_SUPPORT_MARKETER', regex: /\bSUPPORT_MARKETER\b/g },
  { id: 'LEGACY_DIRECT_MARKETER', regex: /\bDIRECT_MARKETER\b/g },
  { id: 'LEGACY_STATE_ORGANIZER', regex: /\bSTATE_ORGANIZER\b/g },
  { id: 'LEGACY_SALES_DNA_ENGINE', regex: /\bTIGER[_ -]?SOVEREIGN[_ -]?SALES[_ -]?DNA\b/gi },
  { id: 'LEGACY_DYNAMIC_GENESIS_TOKEN', regex: /\bDYNAMIC[_ -]?GENESIS[_ -]?TOKEN\b/gi },
  { id: 'LEGACY_HIERARCHICAL_TOKEN_MATRIX', regex: /\bH(?:IERARCHICAL)?[_ -]?TID\b/gi },
  { id: 'LEGACY_FINANCE_FALLBACK', regex: /\b(?:legacy|old)[_-]?(?:finance|financial|commission)[_-]?(?:fallback|engine|route|handler)\b/gi },
  { id: 'LEGACY_HIERARCHICAL_COMMISSION', regex: /\b(?:upstream|downstream|hierarchical)[_-]?commission\b/gi },
]);

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/').replace(/^\.\//, '');
}

function isActiveSource(relativePath) {
  const file = normalize(relativePath);
  if (EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
  const inActiveRoot = ACTIVE_ROOTS.some((root) => root.endsWith('/') ? file.startsWith(root) : file === root);
  if (!inActiveRoot) return false;
  return SOURCE_EXTENSIONS.has(path.extname(file));
}

function trackedFiles(root) {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output.split('\0').filter(Boolean);
  } catch (error) {
    throw new Error(`TSN-26 purge guard cannot enumerate tracked files: ${error.message}`);
  }
}

function lineNumberForOffset(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (text.charCodeAt(index) === 10) line += 1;
  return line;
}

function scanActiveLegacyFinance(root) {
  const violations = [];
  for (const relativePath of trackedFiles(root).filter(isActiveSource).sort()) {
    const absolutePath = path.join(root, relativePath);
    let content;
    try {
      content = fs.readFileSync(absolutePath, 'utf8');
    } catch (error) {
      violations.push({
        rule: 'LEG-001',
        pattern: 'UNREADABLE_ACTIVE_SOURCE',
        path: normalize(relativePath),
        line: 0,
        detail: error.message,
      });
      continue;
    }

    for (const entry of FORBIDDEN_LEGACY_PATTERNS) {
      entry.regex.lastIndex = 0;
      let match;
      while ((match = entry.regex.exec(content)) !== null) {
        violations.push({
          rule: 'LEG-001',
          pattern: entry.id,
          path: normalize(relativePath),
          line: lineNumberForOffset(content, match.index),
          detail: match[0],
        });
        if (match[0].length === 0) entry.regex.lastIndex += 1;
      }
    }
  }
  return violations;
}

function assertNoActiveLegacyFinance(root) {
  const violations = scanActiveLegacyFinance(root);
  if (violations.length > 0) {
    const summary = violations
      .map((item) => `${item.rule}:${item.pattern}:${item.path}:${item.line}`)
      .join('\n');
    throw new Error(`TSN-26 fail-closed legacy finance purge guard blocked release:\n${summary}`);
  }
  return true;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '../../..');
  const violations = scanActiveLegacyFinance(root);
  if (violations.length > 0) {
    process.stderr.write(`${JSON.stringify({ status: 'BLOCKED', violations }, null, 2)}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`${JSON.stringify({ status: 'PASS', reference: 'TSN-26', violations: [] })}\n`);
  }
}

module.exports = Object.freeze({
  ACTIVE_ROOTS,
  EXCLUDED_PREFIXES,
  FORBIDDEN_LEGACY_PATTERNS,
  scanActiveLegacyFinance,
  assertNoActiveLegacyFinance,
});
