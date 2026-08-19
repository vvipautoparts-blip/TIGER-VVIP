import fs from 'node:fs';

const contract = JSON.parse(
  fs.readFileSync(new URL('../preview-guard/contract.v1.json', import.meta.url), 'utf8'),
);

const SHA40 = /^[0-9a-f]{40}$/;
const PROD_IDENTITY = /(?:^|[-_.])(prod|production)(?:$|[-_.])/i;
const PRIVILEGED_VALUE = /(?:sb_secret_|service[_-]?role|sk_(?:live|test)_|private[_-]?key|admin[_-]?key)/i;

function hasEvidence(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function addReason(reasons, code, detail = undefined) {
  reasons.push(detail === undefined ? { code } : { code, detail });
}

export function evaluatePreviewCandidate(input = {}) {
  const reasons = [];
  const source = input?.source && typeof input.source === 'object' ? input.source : {};
  const commitSha = typeof source.commitSha === 'string' ? source.commitSha : '';

  if (!SHA40.test(commitSha)) addReason(reasons, 'INVALID_COMMIT_SHA');

  if (input?.targetRing !== contract.targetRing) {
    addReason(reasons, 'INVALID_TARGET_RING');
  }

  if (input?.environment !== contract.requiredEnvironment) {
    addReason(reasons, 'INVALID_PREVIEW_ENVIRONMENT');
  }

  const backend = input?.backend && typeof input.backend === 'object' ? input.backend : {};
  if (backend.environment !== contract.requiredBackendEnvironment) {
    addReason(reasons, 'BACKEND_NOT_STAGING');
  }
  const backendIdentity = typeof backend.identity === 'string' ? backend.identity.trim() : '';
  if (!backendIdentity || PROD_IDENTITY.test(backendIdentity)) {
    addReason(reasons, 'PRODUCTION_BACKEND_FORBIDDEN');
  }

  const seed = input?.seed && typeof input.seed === 'object' ? input.seed : {};
  if (seed.classification !== contract.requiredSeedClassification) {
    addReason(reasons, 'SYNTHETIC_SEED_REQUIRED');
  }
  if (!hasEvidence(seed.evidence)) {
    addReason(reasons, 'SEED_EVIDENCE_REQUIRED');
  }

  const browserConfig = input?.browserConfig && typeof input.browserConfig === 'object'
    ? input.browserConfig
    : {};
  const names = Array.isArray(browserConfig.publicKeys) ? browserConfig.publicKeys : [];
  const values = browserConfig.values && typeof browserConfig.values === 'object'
    ? browserConfig.values
    : {};
  const privilegedNamePatterns = contract.privilegedBrowserConfigNamePatterns
    .map((pattern) => pattern.toLowerCase());

  for (const rawName of names) {
    const name = String(rawName || '');
    const normalized = name.toLowerCase();
    if (privilegedNamePatterns.some((pattern) => normalized.includes(pattern))) {
      addReason(reasons, 'PRIVILEGED_BROWSER_CONFIG_FORBIDDEN', name);
    }
  }
  for (const [name, rawValue] of Object.entries(values)) {
    const normalizedName = String(name).toLowerCase();
    if (privilegedNamePatterns.some((pattern) => normalizedName.includes(pattern))) {
      addReason(reasons, 'PRIVILEGED_BROWSER_CONFIG_FORBIDDEN', name);
      continue;
    }
    if (PRIVILEGED_VALUE.test(String(rawValue || ''))) {
      addReason(reasons, 'PRIVILEGED_BROWSER_CONFIG_FORBIDDEN', name);
    }
  }

  const deployment = input?.deployment && typeof input.deployment === 'object'
    ? input.deployment
    : {};
  const deploymentUrl = typeof deployment.url === 'string' ? deployment.url.trim() : '';
  if (!/^https:\/\//i.test(deploymentUrl)) {
    addReason(reasons, 'HTTPS_PREVIEW_REQUIRED');
  }
  if (!hasEvidence(deployment.evidence)) {
    addReason(reasons, 'DEPLOYMENT_EVIDENCE_REQUIRED');
  }
  if (!commitSha || deployment.sourceSha !== commitSha) {
    addReason(reasons, 'DEPLOYMENT_SOURCE_MISMATCH');
  }

  if (reasons.length > 0) {
    return {
      schemaVersion: contract.schemaVersion,
      targetRing: contract.targetRing,
      decision: 'BLOCKED',
      eligible: false,
      reasons,
    };
  }

  return {
    schemaVersion: contract.schemaVersion,
    targetRing: contract.targetRing,
    decision: 'SAFE',
    eligible: true,
    reasons: [],
  };
}

export const previewGuardContract = Object.freeze({
  schemaVersion: contract.schemaVersion,
  targetRing: contract.targetRing,
  requiredEnvironment: contract.requiredEnvironment,
  requiredBackendEnvironment: contract.requiredBackendEnvironment,
  requiredSeedClassification: contract.requiredSeedClassification,
  httpsRequired: contract.httpsRequired === true,
  deploymentMustMatchSourceSha: contract.deploymentMustMatchSourceSha === true,
});
