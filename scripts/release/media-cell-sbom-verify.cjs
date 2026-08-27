'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SECRET_KEY_PATTERN = /(?:secret|password|credential|access[_-]?key|service[_-]?role[_-]?key|private[_-]?key|authorization|session[_-]?token|capability[_-]?token)/i;
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

function hasSecretMaterial(value) {
  if (Array.isArray(value)) return value.some(hasSecretMaterial);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, entry]) => SECRET_KEY_PATTERN.test(key) || hasSecretMaterial(entry));
  }
  return typeof value === 'string' && SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function collectComponents(components, output = []) {
  if (!Array.isArray(components)) return output;
  for (const component of components) {
    if (!component || typeof component !== 'object' || Array.isArray(component)) continue;
    output.push(component);
    collectComponents(component.components, output);
  }
  return output;
}

function validateContainerSbom(bom, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail('CONTAINER_SBOM_OPTIONS_INVALID');
  const optionKeys = Object.keys(options);
  if (optionKeys.some((key) => key !== 'expectedSpecVersion')) fail('CONTAINER_SBOM_OPTIONS_INVALID');
  const expectedSpecVersion = options.expectedSpecVersion || '1.7';
  if (expectedSpecVersion !== '1.7') fail('CONTAINER_SBOM_EXPECTED_VERSION_INVALID');
  if (!bom || typeof bom !== 'object' || Array.isArray(bom)) fail('CONTAINER_SBOM_SCHEMA_INVALID');
  if (hasSecretMaterial(bom)) fail('CONTAINER_SBOM_SECRET_MATERIAL_REJECTED');
  if (bom.bomFormat !== 'CycloneDX' || bom.specVersion !== expectedSpecVersion) fail('CONTAINER_SBOM_SCHEMA_INVALID');
  if (!Array.isArray(bom.components) || bom.components.length === 0) fail('CONTAINER_SBOM_COMPONENTS_MISSING');

  const components = collectComponents(bom.components);
  const purls = components.map((component) => (typeof component.purl === 'string' ? component.purl : ''));
  const npmPackages = purls.filter((purl) => purl.startsWith('pkg:npm/')).length;
  const osPackages = purls.filter(
    (purl) => purl.startsWith('pkg:rpm/') || purl.startsWith('pkg:apk/') || purl.startsWith('pkg:deb/'),
  ).length;

  if (npmPackages === 0) fail('CONTAINER_SBOM_NPM_INVENTORY_MISSING');
  if (osPackages === 0) fail('CONTAINER_SBOM_OS_INVENTORY_MISSING');

  return Object.freeze({ componentCount: components.length, npmPackages, osPackages });
}

function writeSummary(file, summary) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(summary)}\n`, { encoding: 'utf8', mode: 0o600 });
}

if (require.main === module) {
  const [inputFile, outputFile] = process.argv.slice(2);
  if (!inputFile || !outputFile) fail('USAGE:media-cell-sbom-verify.cjs <container-sbom.json> <summary.json>');
  const bom = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  writeSummary(outputFile, validateContainerSbom(bom, { expectedSpecVersion: '1.7' }));
}

module.exports = Object.freeze({ validateContainerSbom });
