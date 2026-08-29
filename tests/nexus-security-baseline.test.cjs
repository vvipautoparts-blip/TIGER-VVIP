'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const authority = JSON.parse(fs.readFileSync('config/fusion/current-authority.json', 'utf8'));
const nexusDoc = fs.readFileSync('docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md', 'utf8');
const releaseWorkflow = fs.readFileSync('.github/workflows/production-release-artifact.yml', 'utf8');

test('NEXUS security baseline pins current verification references', () => {
  assert.deepEqual(authority.securityBaseline, {
    applicationVerification: 'OWASP_ASVS_5.0.0',
    digitalIdentity: 'NIST_SP_800-63-4',
    authentication: 'NIST_SP_800-63B-4',
    supplyChainSpecification: 'SLSA_1.2',
    artifactProvenance: 'GITHUB_ARTIFACT_ATTESTATIONS_SIGSTORE',
    failClosed: true,
    identityProviderMigrationAuthorized: false,
    conformanceClaim: 'NOT_ASSERTED_UNTIL_VERIFIED'
  });
  assert.match(nexusDoc, /OWASP ASVS 5\.0\.0/);
  assert.match(nexusDoc, /NIST SP 800-63-4/);
  assert.match(nexusDoc, /NIST SP 800-63B-4/);
  assert.match(nexusDoc, /SLSA 1\.2/);
});

test('production release verifies GitHub artifact attestations before upload', () => {
  assert.match(releaseWorkflow, /id-token:\s*write/);
  assert.match(releaseWorkflow, /attestations:\s*write/);
  assert.match(releaseWorkflow, /uses:\s*actions\/attest@/);
  assert.match(releaseWorkflow, /gh attestation verify/);
});
