'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');

const SHA40 = /^[0-9a-f]{40}$/;

function deterministicUuid(label, sourceSha) {
  const hex = crypto.createHash('sha256')
    .update(`TIGER_GATE6:${label}:${sourceSha}`)
    .digest('hex')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function buildSyntheticSeed({ sourceSha } = {}) {
  if (!SHA40.test(String(sourceSha || ''))) {
    throw new TypeError('Gate 6 synthetic seed requires an exact lowercase 40-character SHA');
  }

  const tag = sourceSha.slice(0, 12);
  const payload = {
    schema_version: 1,
    classification: 'SYNTHETIC_SANITIZED',
    source_sha: sourceSha,
    generation: 'DETERMINISTIC_SOURCE_SHA',
    fixtures: ['A', 'B'].map((label) => ({
      user_id: deterministicUuid(`USER_${label}`, sourceSha),
      external_subject: `gate6-synthetic-${label.toLowerCase()}-${tag}`,
      email: `gate6-${label.toLowerCase()}-${tag}@example.invalid`,
      display_name: `TIGER Gate6 Synthetic ${label} ${tag}`,
      synthetic: true,
    })),
  };
  const digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return Object.freeze({ ...payload, digest_sha256: digest });
}

function main(argv = process.argv.slice(2)) {
  const arg = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  try {
    const seed = buildSyntheticSeed({ sourceSha: arg('--source-sha') });
    const output = arg('--output');
    const text = `${JSON.stringify(seed, null, 2)}\n`;
    if (output) fs.writeFileSync(output, text, 'utf8');
    else process.stdout.write(text);
    process.stderr.write(`TIGER_GATE6_SYNTHETIC_SEED=PASS digest=${seed.digest_sha256}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`TIGER_GATE6_SYNTHETIC_SEED=BLOCKED reason=${error.message}\n`);
    return 1;
  }
}

module.exports = { buildSyntheticSeed, deterministicUuid, main };
if (require.main === module) process.exitCode = main();
