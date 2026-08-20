import fs from 'node:fs';
import { evaluatePreviewCandidate } from './preview_guard.mjs';

const contract = JSON.parse(
  fs.readFileSync(new URL('../gate6-staging/contract.v1.json', import.meta.url), 'utf8'),
);

const SHA40 = /^[0-9a-f]{40}$/;
const SUPABASE_ORIGIN = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/;

function addReason(reasons, code, detail = undefined) {
  if (reasons.some((item) => item.code === code && item.detail === detail)) return;
  reasons.push(detail === undefined ? { code } : { code, detail });
}

export function evaluateGate6Candidate(input = {}) {
  const reasons = [];
  const sourceSha = typeof input.sourceSha === 'string' ? input.sourceSha : '';
  const backend = input.backend && typeof input.backend === 'object' ? input.backend : {};
  const frontend = input.frontend && typeof input.frontend === 'object' ? input.frontend : {};
  const browserConfig = input.browserConfig && typeof input.browserConfig === 'object'
    ? input.browserConfig
    : {};

  if (!SHA40.test(sourceSha)) addReason(reasons, 'INVALID_SOURCE_SHA');
  if (input.environment !== contract.requiredEnvironment) {
    addReason(reasons, 'PRODUCTION_ENVIRONMENT_FORBIDDEN');
  }
  if (backend.status !== 'BOUND') addReason(reasons, 'BACKEND_UNBOUND');
  if (backend.provider !== contract.backendProvider) addReason(reasons, 'INVALID_BACKEND_PROVIDER');

  const projectRef = typeof backend.projectRef === 'string' ? backend.projectRef.trim() : '';
  const backendUrl = typeof backend.url === 'string' ? backend.url.trim() : '';
  if (
    projectRef === contract.forbiddenProductionSupabaseRef
    || backendUrl.includes(contract.forbiddenProductionSupabaseRef)
  ) {
    addReason(reasons, 'PRODUCTION_SUPABASE_FORBIDDEN');
  }
  const match = SUPABASE_ORIGIN.exec(backendUrl);
  if (!match || !projectRef || match[1] !== projectRef) {
    addReason(reasons, 'SUPABASE_URL_REF_MISMATCH');
  }

  if (input.dataMode !== contract.requiredDataMode) addReason(reasons, 'SYNTHETIC_DATA_REQUIRED');
  if (!contract.allowedPaymentModes.includes(input.paymentMode)) addReason(reasons, 'LIVE_PAYMENT_FORBIDDEN');
  if (frontend.provider !== contract.frontendProvider) addReason(reasons, 'INVALID_FRONTEND_PROVIDER');
  if (!/^https:\/\//i.test(String(frontend.url || ''))) addReason(reasons, 'HTTPS_STAGING_REQUIRED');
  if (!sourceSha || frontend.sourceSha !== sourceSha) addReason(reasons, 'DEPLOYMENT_SOURCE_MISMATCH');
  if (!String(frontend.deploymentId || '').trim()) addReason(reasons, 'DEPLOYMENT_ID_REQUIRED');

  const previewResult = evaluatePreviewCandidate({
    targetRing: 'R4_OWNER_PREVIEW',
    source: { commitSha: sourceSha },
    environment: 'PREVIEW',
    backend: { environment: 'STAGING', identity: projectRef },
    seed: { classification: input.dataMode, evidence: ['gate6://synthetic-seed'] },
    browserConfig,
    deployment: {
      url: frontend.url,
      evidence: frontend.deploymentId ? [`gate6://cloudflare/${frontend.deploymentId}`] : [],
      sourceSha: frontend.sourceSha,
    },
  });

  for (const reason of previewResult.reasons) {
    if (reason.code === 'PRIVILEGED_BROWSER_CONFIG_FORBIDDEN') {
      addReason(reasons, 'PRIVILEGED_BROWSER_CONFIG_FORBIDDEN', reason.detail);
    }
    if (reason.code === 'HTTPS_PREVIEW_REQUIRED') addReason(reasons, 'HTTPS_STAGING_REQUIRED');
    if (reason.code === 'DEPLOYMENT_SOURCE_MISMATCH') addReason(reasons, 'DEPLOYMENT_SOURCE_MISMATCH');
  }

  return reasons.length > 0
    ? { schemaVersion: contract.schemaVersion, decision: 'BLOCKED', eligible: false, reasons }
    : { schemaVersion: contract.schemaVersion, decision: 'SAFE', eligible: true, reasons: [] };
}

export const gate6StagingContract = Object.freeze({ ...contract });
