'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const OCI_SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const UUID_DNS_NAMESPACE = Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex');
const REQUIRED_MATERIALS = Object.freeze([
  'services/media-finalizer/Dockerfile',
  'services/media-finalizer/package-lock.json',
  'infra/media-finalizer/foundation/template.yaml',
  'infra/media-finalizer/foundation/guard.guard',
  'infra/media-finalizer/regional/template.yaml',
  'infra/media-finalizer/regional/guard.guard',
  'infra/media-finalizer/edge/template.yaml',
  'infra/media-finalizer/edge/guard.guard',
]);

function fail(code) {
  throw new Error(code);
}

function exactKeys(value, allowed, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(code);
}

function deterministicUuidV8Sha256(name) {
  const bytes = crypto
    .createHash('sha256')
    .update(UUID_DNS_NAMESPACE)
    .update(Buffer.from(name, 'utf8'))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function validateCoreEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) fail('MEDIA_CELL_MATERIALS_EVIDENCE_INVALID');
  exactKeys(evidence, ['source', 'materials', 'image'], 'MEDIA_CELL_MATERIALS_EVIDENCE_INVALID');
  const { source, materials, image } = evidence;
  exactKeys(source, ['commitSha', 'treeSha', 'immutable'], 'MEDIA_CELL_MATERIALS_SOURCE_INVALID');
  if (!GIT_SHA_PATTERN.test(source.commitSha || '') || !GIT_SHA_PATTERN.test(source.treeSha || '') || source.immutable !== true) {
    fail('MEDIA_CELL_MATERIALS_SOURCE_INVALID');
  }
  exactKeys(materials, REQUIRED_MATERIALS, 'MEDIA_CELL_MATERIALS_INVALID');
  for (const name of REQUIRED_MATERIALS) {
    if (!SHA256_PATTERN.test(materials[name] || '')) fail('MEDIA_CELL_MATERIAL_DIGEST_INVALID');
  }
  exactKeys(image, ['repository', 'manifestDigest', 'baseDigest'], 'MEDIA_CELL_MATERIALS_IMAGE_INVALID');
  if (!OCI_SHA256_PATTERN.test(image.manifestDigest || '') || !OCI_SHA256_PATTERN.test(image.baseDigest || '')) {
    fail('MEDIA_CELL_MATERIALS_IMAGE_DIGEST_INVALID');
  }
  if (typeof image.repository !== 'string' || image.repository.length < 3 || image.repository.includes('@')) {
    fail('MEDIA_CELL_MATERIALS_IMAGE_REPOSITORY_INVALID');
  }
}

function createMediaCellSbom(evidence = {}) {
  validateCoreEvidence(evidence);
  const { source, materials, image } = evidence;
  const components = Object.entries(materials)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, digest]) => ({
      type: 'file',
      name,
      hashes: [{ alg: 'SHA-256', content: digest }],
    }));
  const serialUuid = deterministicUuidV8Sha256(
    `TIGER-SEALED-MEDIA-MATERIALS:${source.commitSha}:${source.treeSha}:${image.manifestDigest}`,
  );

  return {
    $schema: 'https://cyclonedx.org/schema/bom-1.7.schema.json',
    bomFormat: 'CycloneDX',
    specVersion: '1.7',
    serialNumber: `urn:uuid:${serialUuid}`,
    version: 1,
    metadata: {
      lifecycles: [{ phase: 'build' }],
      component: {
        type: 'container',
        name: 'TIGER-media-finalizer-materials',
        version: source.commitSha,
      },
      properties: [
        { name: 'tiger:source_commit', value: source.commitSha },
        { name: 'tiger:source_tree', value: source.treeSha },
        { name: 'tiger:oci_manifest_digest', value: image.manifestDigest },
        { name: 'tiger:base_image_digest', value: image.baseDigest },
        { name: 'tiger:generator', value: 'TIGER_MEDIA_CELL_MATERIALS_V1' },
        { name: 'tiger:evidence_class', value: 'build-materials-not-container-inventory' },
      ],
    },
    components,
  };
}

function writeCanonicalJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${canonicalJson(value)}\n`, { encoding: 'utf8', mode: 0o600 });
}

if (require.main === module) {
  const [inputFile, outputFile] = process.argv.slice(2);
  if (!inputFile || !outputFile) fail('USAGE:media-cell-sbom.cjs <evidence.json> <materials.json>');
  const evidence = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  writeCanonicalJson(outputFile, createMediaCellSbom(evidence));
}

module.exports = Object.freeze({ createMediaCellSbom, canonicalJson, REQUIRED_MATERIALS });
