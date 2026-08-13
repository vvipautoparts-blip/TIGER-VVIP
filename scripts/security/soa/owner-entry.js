import { collectClerkOwnerEvidence } from './clerk-owner-assurance.js';
import { createOwnerControlGate } from './owner-control-gate.js';

const MAX_RESPONSE_BYTES = 16 * 1024;
const LOCAL_HOSTS = new Set(['localhost','127.0.0.1','::1','[::1]','0.0.0.0']);
const REQUIRED_FUNCTION_SUFFIX = '/functions/v1/tiger-sovereign-owner-access';

function localHost(locationLike) {
  return Boolean(locationLike && LOCAL_HOSTS.has(String(locationLike.hostname || '').toLowerCase()));
}
function localPreview(locationLike) {
  if (!localHost(locationLike)) return false;
  const params = new URLSearchParams(String(locationLike.search || ''));
  return params.get('preview') === 'owner';
}
export function resolveOwnerEndpoint(raw, locationLike = globalThis.location) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return null;
  let url;
  const base = typeof locationLike?.origin === 'string' && locationLike.origin ? locationLike.origin : undefined;
  try { url = base ? new URL(value, base) : new URL(value); } catch { return null; }
  if (url.username || url.password || url.hash) return null;
  if (!url.pathname.endsWith(REQUIRED_FUNCTION_SUFFIX)) return null;
  const localTarget = LOCAL_HOSTS.has(url.hostname.toLowerCase());
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHost(locationLike) && localTarget)) return null;
  return url.toString().replace(/\/$/, '');
}
function metaEndpoint(root) {
  const node = root?.querySelector?.('meta[name="tiger-soa-owner-access-endpoint"]');
  return typeof node?.content === 'string' ? node.content : '';
}
async function defaultWaitForClerk({ timeoutMs = 3000, pollMs = 25 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (!globalThis.Clerk && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, pollMs));
  const clerk = globalThis.Clerk || null;
  if (!clerk) return null;
  if (clerk.loaded === false && typeof clerk.load === 'function') {
    try {
      await Promise.race([
        clerk.load(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CLERK_TIMEOUT')), Math.max(1, deadline - Date.now())))
      ]);
    } catch { return null; }
  }
  return clerk.loaded === false ? null : clerk;
}
async function defaultReadEvidence() {
  const clerk = await defaultWaitForClerk();
  return collectClerkOwnerEvidence(clerk);
}
async function defaultGetToken() {
  const session = globalThis.Clerk?.session;
  if (!session || typeof session.getToken !== 'function') return null;
  try {
    const token = await session.getToken();
    return typeof token === 'string' && token.length > 20 ? token : null;
  } catch { return null; }
}
export async function requestOwnerServerState({ endpoint, token, fetchImpl = globalThis.fetch } = {}) {
  if (!endpoint || typeof token !== 'string' || token.length <= 20 || typeof fetchImpl !== 'function') return null;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(5000) : undefined,
    });
  } catch { return null; }
  if (!response?.ok) return null;
  const declared = Number(response.headers?.get?.('content-length') || 0);
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) return null;
  let text;
  try { text = await response.text(); } catch { return null; }
  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
function setText(root, selector, value) {
  const node = root?.querySelector?.(selector);
  if (node) node.textContent = typeof value === 'string' && value.trim() ? value.trim() : '—';
}
export function renderSovereignOwnerDashboard(root, serverState) {
  if (!root || !serverState || serverState.source !== 'SOA_SERVER_VERIFIED' || serverState.allowed !== true) return false;
  const profile = serverState.publicProfile && typeof serverState.publicProfile === 'object' ? serverState.publicProfile : {};
  setText(root, '[data-soa-owner-name]', profile.publicDisplayName);
  setText(root, '[data-soa-owner-title]', profile.publicTitle);
  setText(root, '[data-soa-owner-country]', profile.publicCountryCode);
  setText(root, '[data-soa-owner-authority]', serverState.authorityStatus === 'ACTIVE' ? 'مفعّلة' : 'مقيّدة');
  setText(root, '[data-soa-owner-protection]', serverState.killSwitch === false ? 'الحماية السيادية سليمة' : 'موقوفة أمنيًا');
  setText(root, '[data-soa-owner-recovery]', serverState.recoveryState === 'NONE' ? 'لا يوجد استرداد نشط' : 'استرداد محمي');
  const badge = root.querySelector?.('[data-soa-owner-verified-badge]');
  if (badge) badge.hidden = profile.verifiedOwnerBadge !== true;
  return true;
}
export function createOwnerEntryCoordinator({
  root = globalThis.document,
  locationLike = globalThis.location,
  readEvidence = defaultReadEvidence,
  getToken = defaultGetToken,
  requestServerState = ({ endpoint, token }) => requestOwnerServerState({ endpoint, token }),
  onReady = (serverState) => renderSovereignOwnerDashboard(root, serverState),
  loadLocalPreview = () => import('../../pr35/pr35-bootstrap.js'),
} = {}) {
  return Object.freeze({
    async start() {
      const gate = createOwnerControlGate({ root, loadServerState: async () => null });
      if (localPreview(locationLike)) {
        const decision = await gate.verify({ localPreview: true });
        try { await loadLocalPreview(); } catch {}
        return decision;
      }
      const evidence = await readEvidence();
      const endpoint = resolveOwnerEndpoint(metaEndpoint(root), locationLike);
      if (!endpoint) return gate.verify({ evidence });
      const token = await getToken();
      if (!token) return gate.verify({ evidence });
      let serverState = null;
      try { serverState = await requestServerState({ endpoint, token }); } catch { serverState = null; }
      const verifiedGate = createOwnerControlGate({ root, loadServerState: async () => serverState });
      const decision = await verifiedGate.verify({ evidence });
      if (decision.mode === 'READY' && decision.sovereignAuthorized === true) onReady(serverState);
      return decision;
    }
  });
}

if (typeof document !== 'undefined') {
  createOwnerEntryCoordinator().start().catch(() => {});
}
