'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const OCI_SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SECRET_KEY_PATTERN = /(?:secret|password|credential|access[_-]?key|service[_-]?role[_-]?key|private[_-]?key|authorization|jwt|capability|signed[_-]?url)/i;
const SECRET_VALUE_PATTERNS = Object.freeze([
  /sb_secret_[A-Za-z0-9._-]+/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /Bearer\s+[A-Za-z0-9._~+\/-]+=*/i,
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

function hasSecretMaterial(value) {
  if (Array.isArray(value)) return value.some(hasSecretMaterial);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, entry]) => SECRET_KEY_PATTERN.test(key) || hasSecretMaterial(entry));
  }
  return typeof value === 'string' && SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function ensureObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
}

function findManifestBinding(sbom) {
  const properties = Array.isArray(sbom?.metadata?.properties) ? sbom.metadata.properties : [];
  const bindings = properties.filter((entry) => entry?.name === 'tiger:oci_manifest_digest');
  if (bindings.length !== 1) return null;
  return bindings[0]?.value;
}

function bindRealContainerSbom(sbom, expectedManifestDigest) {
  ensureObject(sbom, 'MEDIA_CELL_SBOM_INVALID');
  if (!OCI_SHA256_PATTERN.test(expectedManifestDigest || '')) fail('MEDIA_CELL_SBOM_SUBJECT_INVALID');
  if (hasSecretMaterial(sbom)) fail('MEDIA_CELL_SBOM_SECRET_MATERIAL_REJECTED');
  if (sbom.bomFormat !== 'CycloneDX') fail('MEDIA_CELL_SBOM_FORMAT_INVALID');
  if (sbom.specVersion !== '1.7') fail('MEDIA_CELL_SBOM_SPEC_VERSION_INVALID');
  if (!Array.isArray(sbom.components) || sbom.components.length === 0) fail('MEDIA_CELL_SBOM_COMPONENTS_EMPTY');

  const output = JSON.parse(JSON.stringify(sbom));
  output.metadata = output.metadata && typeof output.metadata === 'object' && !Array.isArray(output.metadata)
    ? output.metadata
    : {};
  const properties = Array.isArray(output.metadata.properties)
    ? output.metadata.properties.filter((entry) => entry?.name !== 'tiger:oci_manifest_digest')
    : [];
  properties.push({ name: 'tiger:oci_manifest_digest', value: expectedManifestDigest });
  output.metadata.properties = properties.sort((left, right) => {
    const leftName = String(left?.name || '');
    const rightName = String(right?.name || '');
    if (leftName !== rightName) return leftName.localeCompare(rightName);
    return String(left?.value || '').localeCompare(String(right?.value || ''));
  });
  return canonicalize(output);
}

function validateRealContainerSbom(sbom, expectedManifestDigest) {
  ensureObject(sbom, 'MEDIA_CELL_SBOM_INVALID');
  if (!OCI_SHA256_PATTERN.test(expectedManifestDigest || '')) fail('MEDIA_CELL_SBOM_SUBJECT_INVALID');
  if (hasSecretMaterial(sbom)) fail('MEDIA_CELL_SBOM_SECRET_MATERIAL_REJECTED');
  if (sbom.bomFormat !== 'CycloneDX') fail('MEDIA_CELL_SBOM_FORMAT_INVALID');
  if (sbom.specVersion !== '1.7') fail('MEDIA_CELL_SBOM_SPEC_VERSION_INVALID');
  if (!Array.isArray(sbom.components) || sbom.components.length === 0) fail('MEDIA_CELL_SBOM_COMPONENTS_EMPTY');

  const binding = findManifestBinding(sbom);
  if (!OCI_SHA256_PATTERN.test(binding || '') || binding !== expectedManifestDigest) fail('MEDIA_CELL_SBOM_SUBJECT_MISMATCH');

  const canonical = canonicalJson(sbom);
  return Object.freeze({
    specVersion: '1.7',
    subjectDigest: expectedManifestDigest,
    componentCount: sbom.components.length,
    sha256: crypto.createHash('sha256').update(canonical).digest('hex'),
  });
}

function writeCanonicalJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${canonicalJson(value)}\n`, { encoding: 'utf8', mode: 0o600 });
}

if (require.main === module) {
  const [inputFile, expectedManifestDigest, outputFile] = process.argv.slice(2);
  if (!inputFile || !expectedManifestDigest || !outputFile) {
    fail('USAGE:media-cell-sbom.cjs <syft-cyclonedx.json> <sha256:manifest> <bound-sbom.json>');
  }
  const source = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const bound = bindRealContainerSbom(source, expectedManifestDigest);
  validateRealContainerSbom(bound, expectedManifestDigest);
  writeCanonicalJson(outputFile, bound);
}

module.exports = Object.freeze({
  bindRealContainerSbom,
  validateRealContainerSbom,
  canonicalJson,
});
