'use strict';

const crypto = require('node:crypto');

const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const UUID_DNS_NAMESPACE = Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex');

function fail(code) {
  throw new Error(code);
}

function deterministicUuidV8Sha256(name) {
  // RFC 9562 requires modern name-based hashes such as SHA-256 to use UUIDv8.
  // Keep the namespace/name binding while eliminating SHA-1 from release evidence.
  const bytes = crypto
    .createHash('sha256')
    .update(UUID_DNS_NAMESPACE)
    .update(Buffer.from(name, 'utf8'))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function createProductionFileInventorySbom({ sourceSha, sourceTree, files } = {}) {
  if (!GIT_SHA_PATTERN.test(sourceSha || '')) fail('PRODUCTION_SBOM_SOURCE_SHA_INVALID');
  if (!GIT_SHA_PATTERN.test(sourceTree || '')) fail('PRODUCTION_SBOM_SOURCE_TREE_INVALID');
  if (!files || typeof files !== 'object' || Array.isArray(files)) {
    fail('PRODUCTION_SBOM_FILES_INVALID');
  }

  const components = Object.entries(files)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, digest]) => {
      if (!name || !SHA256_PATTERN.test(digest || '')) {
        fail('PRODUCTION_SBOM_FILE_DIGEST_INVALID');
      }
      return {
        type: 'file',
        name,
        hashes: [{ alg: 'SHA-256', content: digest }],
      };
    });
  const serialUuid = deterministicUuidV8Sha256(
    `VVIP-TIGER-PRODUCTION-SBOM:${sourceSha}:${sourceTree}`,
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
        type: 'application',
        name: 'VVIP-TIGER',
        version: sourceSha,
      },
      properties: [
        { name: 'vvip:source_sha', value: sourceSha },
        { name: 'vvip:source_tree', value: sourceTree },
        { name: 'vvip:generator', value: 'VVIP_PRODUCTION_FILE_INVENTORY_V1' },
      ],
    },
    components,
  };
}

module.exports = Object.freeze({
  createProductionFileInventorySbom,
});
