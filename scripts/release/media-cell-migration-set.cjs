'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_MIGRATIONS = Object.freeze([
  'supabase/migrations/20260816090001_sovereign_media_finalization.sql',
  'supabase/migrations/20260827120000_sealed_media_identity_binding.sql',
]);

function fail(code) {
  throw new Error(code);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function createMediaMigrationSet(root = path.resolve(__dirname, '..', '..')) {
  const migrations = [...REQUIRED_MIGRATIONS]
    .sort((a, b) => a.localeCompare(b))
    .map((relative) => {
      const absolute = path.resolve(root, relative);
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
        fail(`MEDIA_MIGRATION_REQUIRED_FILE_MISSING:${relative}`);
      }
      return Object.freeze({ path: relative, sha256: sha256(fs.readFileSync(absolute)) });
    });

  const authority = Object.freeze({
    schemaVersion: 'tiger-media-migration-set-v1',
    migrations,
  });
  return Object.freeze({
    ...authority,
    sha256: sha256(Buffer.from(canonicalJson(authority), 'utf8')),
  });
}

if (require.main === module) {
  const [rootArg] = process.argv.slice(2);
  process.stdout.write(`${canonicalJson(createMediaMigrationSet(rootArg ? path.resolve(rootArg) : undefined))}\n`);
}

module.exports = Object.freeze({ REQUIRED_MIGRATIONS, createMediaMigrationSet, canonicalJson });
