import { installPulseSurface } from './pulse-surface.js';

const SECTOR_KEY = /^[a-z0-9][a-z0-9._-]{0,127}$/;
let sectorRegistryPromise = null;

function enabledSectors(root) {
  const source = root.VVIP_FUSION_SECTOR_REGISTRY;
  if (!Array.isArray(source)) return [];
  return source
    .filter((entry) => entry && typeof entry === 'object' && entry.enabled === true
      && typeof entry.key === 'string' && SECTOR_KEY.test(entry.key.trim())
      && typeof entry.label === 'string' && entry.label.trim().length > 0 && entry.label.trim().length <= 120)
    .slice(0, 100)
    .map((entry) => Object.freeze({ key: entry.key.trim(), label: entry.label.trim(), enabled: true }));
}

async function runtimeClient(root) {
  if (root.VVIP_SUPABASE && typeof root.VVIP_SUPABASE.rpc === 'function') return root.VVIP_SUPABASE;
  const ready = root.VVIPRuntimeReady;
  if (!ready || typeof ready.then !== 'function') return null;
  try {
    const runtime = await ready;
    const client = runtime && runtime.supabase;
    return client && typeof client.rpc === 'function' ? client : null;
  } catch (_) {
    return null;
  }
}

function normalizeServerRegistry(data) {
  if (!Array.isArray(data) || data.length > 100) return null;
  const normalized = [];
  const seen = new Set();
  for (const row of data) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
    const key = typeof row.key === 'string' ? row.key.trim() : '';
    const label = typeof row.label === 'string' ? row.label.trim() : '';
    if (!SECTOR_KEY.test(key) || !label || label.length > 120 || row.enabled !== true || seen.has(key)) return null;
    seen.add(key);
    normalized.push(Object.freeze({ key, label, enabled: true }));
  }
  return Object.freeze(normalized);
}

function commitServerRegistry(root, registry) {
  const safe = Array.isArray(registry) ? registry.slice(0, 100) : [];
  root.VVIP_FUSION_SECTOR_REGISTRY = Object.freeze(safe);
  return root.VVIP_FUSION_SECTOR_REGISTRY;
}

async function hydrateServerSectorRegistry(root) {
  if (sectorRegistryPromise) return sectorRegistryPromise;
  sectorRegistryPromise = (async () => {
    const client = await runtimeClient(root);
    if (!client) return commitServerRegistry(root, []);
    let response;
    try { response = await client.rpc('vvip_nexus_sector_registry'); }
    catch (_) { return commitServerRegistry(root, []); }
    if (!response || response.error) return commitServerRegistry(root, []);
    const registry = normalizeServerRegistry(response.data);
    return commitServerRegistry(root, registry || []);
  })();
  try { return await sectorRegistryPromise; }
  finally { sectorRegistryPromise = null; }
}

function option(documentObject, value, label) {
  const node = documentObject.createElement('option');
  node.value = value;
  node.textContent = label;
  return node;
}

function hydrateSectorOptions(root, sector) {
  if (!sector) return false;
  const current = typeof sector.value === 'string' ? sector.value : '';
  const sectors = enabledSectors(root);
  sector.replaceChildren(option(root.document, '', 'اختر القطاع'));
  for (const entry of sectors) sector.append(option(root.document, entry.key, entry.label));
  if (current && sectors.some((entry) => entry.key === current)) sector.value = current;
  return sectors.length > 0;
}

function bindCanonicalComposer(root) {
  const documentObject = root.document;
  const trigger = documentObject.querySelector('[data-social-post-trigger]');
  const sheet = documentObject.querySelector('[data-social-post-sheet]');
  if (!trigger || !sheet) return false;

  const title = sheet.querySelector('#social-post-title');
  const draft = sheet.querySelector('[data-social-post-draft]');
  const sector = sheet.querySelector('[data-nexus-sector]');
  const intent = sheet.querySelector('[data-nexus-intent]');
  if (!title || !draft || !sector || !intent) return false;

  trigger.textContent = 'ماذا تعرض أو تحتاج؟';
  title.textContent = 'عرض أو طلب قطاعي';
  draft.placeholder = 'صف ما تعرضه أو تحتاجه باختصار…';
  return hydrateSectorOptions(root, sector);
}

function bindCommand(root) {
  const trigger = root.document.querySelector('[data-fusion-capability-menu]');
  if (!trigger) return false;
  trigger.setAttribute('aria-label', 'TIGER Command');
  return true;
}

export function installNexus(root = window) {
  if (!root || !root.document) return Object.freeze({ installed: false });
  if (root.TIGERNexusBootstrapCurrent) return root.TIGERNexusBootstrapCurrent;

  const composerBound = bindCanonicalComposer(root);
  const commandBound = bindCommand(root);
  if (!composerBound || !commandBound) {
    return Object.freeze({ installed: false, code: 'NEXUS_CANONICAL_DOM_REQUIRED' });
  }

  void hydrateServerSectorRegistry(root).then(() => bindCanonicalComposer(root));
  void installPulseSurface(root);
  const current = Object.freeze({ installed: true });
  root.TIGERNexusBootstrapCurrent = current;
  return current;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => installNexus(window), { once: true });
  else installNexus(window);
}
