import { createPulseRuntime, PULSE_RUNTIME_MODES } from './pulse-runtime.js';
import { deriveOpportunityState, AUTO_FREEZE_MESSAGE_AR } from './opportunity-radar.js';

const MODES = new Set(PULSE_RUNTIME_MODES || ['NOW', 'SMART', 'PRECISE']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODE_LABELS = Object.freeze({ NOW: '⚡ الآن', SMART: '🧠 ذكي', PRECISE: '🎯 دقيق' });

function error(code) {
  const failure = new Error(code);
  failure.code = code;
  return failure;
}

function idempotencyKey(cryptoApi, operation) {
  if (!cryptoApi || typeof cryptoApi.randomUUID !== 'function') throw error('PULSE_CRYPTO_REQUIRED');
  const uuid = cryptoApi.randomUUID();
  if (!UUID.test(String(uuid || ''))) throw error('PULSE_CRYPTO_REQUIRED');
  return `${operation}:${uuid}`;
}

function snapshot(vault, ownedPostIds) {
  return Object.freeze({
    ok: true,
    vault,
    ownedPostIds: Object.freeze(new Set(ownedPostIds)),
  });
}

export function createPulseSurface(options = {}) {
  const runtime = options.runtime;
  const cryptoApi = options.crypto;
  if (!runtime || typeof runtime.ownedObjects !== 'function' || typeof runtime.readVault !== 'function'
      || typeof runtime.allocate !== 'function' || typeof runtime.pause !== 'function'
      || typeof runtime.setMode !== 'function') {
    throw error('PULSE_RUNTIME_REQUIRED');
  }

  let currentVault = null;
  let ownedPostIds = new Set();

  async function refresh() {
    const owned = await runtime.ownedObjects();
    const vault = await runtime.readVault();
    ownedPostIds = new Set(owned);
    currentVault = vault;
    return snapshot(currentVault, ownedPostIds);
  }

  async function refreshVaultOnly() {
    currentVault = await runtime.readVault();
    return snapshot(currentVault, ownedPostIds);
  }

  async function allocateFor(postId, units, mode) {
    if (!ownedPostIds.has(postId)) throw error('PULSE_OBJECT_NOT_OWNED');
    if (!MODES.has(mode)) throw error('PULSE_MODE_INVALID');
    await runtime.allocate({
      postId,
      units,
      mode,
      idempotencyKey: idempotencyKey(cryptoApi, 'allocate'),
    });
    return refreshVaultOnly();
  }

  async function pauseGroup(allocationGroupId) {
    await runtime.pause({
      allocationGroupId,
      idempotencyKey: idempotencyKey(cryptoApi, 'pause'),
    });
    return refreshVaultOnly();
  }

  async function setGroupMode(allocationGroupId, mode) {
    if (!MODES.has(mode)) throw error('PULSE_MODE_INVALID');
    await runtime.setMode({
      allocationGroupId,
      mode,
      idempotencyKey: idempotencyKey(cryptoApi, 'mode'),
    });
    return refreshVaultOnly();
  }

  return Object.freeze({
    refresh,
    allocateFor,
    pauseGroup,
    setGroupMode,
    state: () => snapshot(currentVault, ownedPostIds),
  });
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

function element(documentObject, name, className, text) {
  const node = documentObject.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function closeVault(layer) {
  layer.hidden = true;
  layer.setAttribute('aria-hidden', 'true');
}

function openVault(layer) {
  layer.hidden = false;
  layer.setAttribute('aria-hidden', 'false');
  const panel = layer.querySelector('[role="dialog"]');
  if (panel && typeof panel.focus === 'function') panel.focus();
}

function statusMessage(documentObject, text, state) {
  const node = element(documentObject, 'p', 'nexus-pulse-status', text);
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('data-nexus-pulse-status', state || 'info');
  return node;
}

function modeButton(documentObject, mode, currentMode, onSelect) {
  const button = element(documentObject, 'button', 'nexus-pulse-mode', MODE_LABELS[mode] || mode);
  button.type = 'button';
  button.setAttribute('data-nexus-pulse-mode', mode);
  button.setAttribute('aria-pressed', String(currentMode === mode));
  button.addEventListener('click', () => onSelect(mode));
  return button;
}

function groupForPost(vault, postId) {
  if (!vault || !Array.isArray(vault.groups) || !postId) return [];
  return vault.groups.filter((group) => group && group.postId === postId);
}

function enhanceOwnedFeedObjects(root, ownedPostIds, onOpen) {
  const documentObject = root.document;
  documentObject.querySelectorAll('[data-social-post-id]').forEach((article) => {
    const postId = article.getAttribute('data-social-post-id');
    const existing = article.querySelector('[data-nexus-pulse-trigger]');
    // Ownership + classification eligibility comes only from the server-backed ownedObjects projection.
    const eligible = Boolean(postId && ownedPostIds.has(postId));

    if (!eligible) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;

    const actions = article.querySelector('.social-feed-post__secondary-actions');
    if (!actions) return;
    const button = element(documentObject, 'button', 'social-post-action nexus-pulse-object-trigger', '⚡ نبّض');
    button.type = 'button';
    button.setAttribute('data-nexus-pulse-trigger', postId);
    button.setAttribute('aria-label', 'تخصيص ظهور Pulse لهذا العرض أو الطلب');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      onOpen(postId);
    });
    actions.prepend(button);
  });
}

function renderOpportunity(documentObject, group) {
  const opportunity = deriveOpportunityState({ state: group.opportunityState });
  const card = element(documentObject, 'div', `nexus-opportunity nexus-opportunity--${opportunity.state.toLowerCase()}`);
  card.setAttribute('data-nexus-opportunity-state', opportunity.state);
  const title = element(documentObject, 'strong', 'nexus-opportunity__label', opportunity.label);
  const message = element(documentObject, 'p', 'nexus-opportunity__message', opportunity.message);
  card.append(title, message);
  if (opportunity.autoFrozen) {
    card.setAttribute('data-nexus-auto-freeze', 'true');
    card.setAttribute('aria-label', AUTO_FREEZE_MESSAGE_AR);
  }
  return card;
}

function renderSelectedGroups(root, host, vault, selectedPostId, surface, rerender) {
  const documentObject = root.document;
  for (const group of groupForPost(vault, selectedPostId)) {
    const card = element(documentObject, 'article', 'nexus-pulse-group');
    card.setAttribute('data-nexus-pulse-group', group.allocationGroupId);
    const heading = element(documentObject, 'div', 'nexus-pulse-group__heading');
    heading.append(
      element(documentObject, 'strong', '', `المتبقي: ${group.remaining.toLocaleString('ar')}`),
      element(documentObject, 'span', '', `الوضع: ${MODE_LABELS[group.mode] || group.mode}`),
    );
    card.append(heading, renderOpportunity(documentObject, group));

    if (group.state === 'ACTIVE' || group.state === 'FROZEN') {
      const controls = element(documentObject, 'div', 'nexus-pulse-group__controls');
      const select = documentObject.createElement('select');
      select.setAttribute('aria-label', 'تغيير إيقاع Pulse');
      for (const mode of PULSE_RUNTIME_MODES) {
        const option = documentObject.createElement('option');
        option.value = mode;
        option.textContent = MODE_LABELS[mode] || mode;
        option.selected = mode === group.mode;
        select.append(option);
      }
      const change = element(documentObject, 'button', '', 'تغيير الإيقاع');
      change.type = 'button';
      change.addEventListener('click', async () => {
        change.disabled = true;
        try {
          await surface.setGroupMode(group.allocationGroupId, select.value);
          rerender();
        } catch (_) {
          rerender('تعذر تغيير الإيقاع الآن.', 'error');
        }
      });
      const pause = element(documentObject, 'button', '', 'إيقاف وإرجاع غير المستهلك');
      pause.type = 'button';
      pause.addEventListener('click', async () => {
        pause.disabled = true;
        try {
          await surface.pauseGroup(group.allocationGroupId);
          rerender();
        } catch (_) {
          rerender('تعذر إيقاف التخصيص الآن.', 'error');
        }
      });
      controls.append(select, change, pause);
      card.append(controls);
    }
    host.append(card);
  }
}

function renderVault(root, layer, surface, selectedPostId, selectedMode, onMode, rerender, message, messageState) {
  const documentObject = root.document;
  const host = layer.querySelector('[data-nexus-pulse-vault-content]');
  if (!host) return;
  host.replaceChildren();

  const state = surface.state();
  const vault = state.vault;
  if (!vault || vault.ok !== true) {
    host.append(statusMessage(documentObject, 'تعذر تحميل خزنة الظهور المؤكدة من الخادم.', 'error'));
    return;
  }

  const balance = element(documentObject, 'section', 'nexus-vault-balance');
  balance.append(
    element(documentObject, 'strong', 'nexus-vault-balance__number', vault.remaining.toLocaleString('ar')),
    element(documentObject, 'span', 'nexus-vault-balance__label', 'ظهور موثق متبقٍ'),
    element(documentObject, 'span', 'nexus-vault-balance__expiry', 'لا تنتهي'),
  );
  const metrics = element(documentObject, 'div', 'nexus-vault-metrics');
  metrics.append(
    element(documentObject, 'p', '', `متاح للتخصيص: ${vault.available.toLocaleString('ar')}`),
    element(documentObject, 'p', '', `مخصص حاليًا: ${vault.allocated.toLocaleString('ar')}`),
    element(documentObject, 'p', '', `تم استهلاكه: ${vault.consumed.toLocaleString('ar')}`),
  );
  host.append(balance, metrics);

  if (message) host.append(statusMessage(documentObject, message, messageState));

  if (!selectedPostId) {
    host.append(statusMessage(documentObject, 'اختر عرضًا أو طلبًا من منشوراتك واضغط ⚡ نبّض لتخصيص الظهور.', 'info'));
    return;
  }
  if (!state.ownedPostIds.has(selectedPostId)) {
    host.append(statusMessage(documentObject, 'هذا العنصر غير مؤكد كعنصر مملوك ومؤهل لهذه الجلسة.', 'error'));
    return;
  }

  const allocation = element(documentObject, 'section', 'nexus-pulse-allocation');
  const title = element(documentObject, 'h3', '', 'خصص ظهورًا لهذا العنصر');
  const input = documentObject.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.max = String(vault.available);
  input.step = '1';
  input.inputMode = 'numeric';
  input.setAttribute('data-nexus-pulse-units', '');
  input.setAttribute('aria-label', 'عدد وحدات الظهور');
  input.placeholder = vault.available > 0 ? `حتى ${vault.available.toLocaleString('ar')}` : 'لا يوجد رصيد متاح';
  input.disabled = vault.available <= 0;

  const modes = element(documentObject, 'div', 'nexus-vault-modes');
  for (const mode of PULSE_RUNTIME_MODES) modes.append(modeButton(documentObject, mode, selectedMode, onMode));

  const allocate = element(documentObject, 'button', 'nexus-pulse-allocate', 'تخصيص الظهور');
  allocate.type = 'button';
  allocate.disabled = vault.available <= 0;
  allocate.addEventListener('click', async () => {
    const units = Number(input.value);
    if (!Number.isSafeInteger(units) || units <= 0 || units > vault.available) {
      rerender('أدخل عدد ظهور صحيحًا ضمن الرصيد المتاح.', 'invalid');
      return;
    }
    allocate.disabled = true;
    try {
      await surface.allocateFor(selectedPostId, units, selectedMode);
      rerender('تم تخصيص الظهور من الخادم.', 'success');
    } catch (_) {
      rerender('تعذر تخصيص الظهور الآن.', 'error');
    }
  });
  allocation.append(title, input, modes, allocate);
  host.append(allocation);

  const groups = groupForPost(vault, selectedPostId);
  if (groups.length) {
    const groupHost = element(documentObject, 'section', 'nexus-pulse-groups');
    groupHost.append(element(documentObject, 'h3', '', 'التخصيصات الحالية'));
    renderSelectedGroups(root, groupHost, vault, selectedPostId, surface, rerender);
    host.append(groupHost);
  }
}

export async function installPulseSurface(root = window) {
  if (!root || !root.document) return Object.freeze({ installed: false, code: 'PULSE_DOCUMENT_REQUIRED' });
  if (root.TIGERNexusPulseSurfaceCurrent) return root.TIGERNexusPulseSurfaceCurrent;

  const documentObject = root.document;
  const layer = documentObject.querySelector('[data-nexus-pulse-vault]');
  const host = layer && layer.querySelector('[data-nexus-pulse-vault-content]');
  if (!layer || !host) return Object.freeze({ installed: false, code: 'PULSE_VAULT_SURFACE_REQUIRED' });

  const client = await runtimeClient(root);
  if (!client) {
    host.replaceChildren(statusMessage(documentObject, 'تعذر الاتصال بخزنة الظهور الآمنة.', 'error'));
    return Object.freeze({ installed: false, code: 'PULSE_RUNTIME_UNAVAILABLE' });
  }

  let surface;
  try {
    surface = createPulseSurface({ runtime: createPulseRuntime(client), crypto: root.crypto });
  } catch (_) {
    host.replaceChildren(statusMessage(documentObject, 'تعذر تجهيز خزنة الظهور الآمنة.', 'error'));
    return Object.freeze({ installed: false, code: 'PULSE_RUNTIME_UNAVAILABLE' });
  }

  let selectedPostId = null;
  let selectedMode = 'SMART';
  let refreshInFlight = null;
  let lastMessage = '';
  let lastMessageState = 'info';

  function rerender(message, state) {
    if (typeof message === 'string') {
      lastMessage = message;
      lastMessageState = state || 'info';
    } else {
      lastMessage = '';
      lastMessageState = 'info';
    }
    renderVault(root, layer, surface, selectedPostId, selectedMode, (mode) => {
      selectedMode = mode;
      rerender();
    }, rerender, lastMessage, lastMessageState);
    enhanceOwnedFeedObjects(root, surface.state().ownedPostIds, (postId) => {
      selectedPostId = postId;
      lastMessage = '';
      renderVault(root, layer, surface, selectedPostId, selectedMode, (mode) => {
        selectedMode = mode;
        rerender();
      }, rerender);
      openVault(layer);
    });
  }

  async function refreshAll() {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = surface.refresh()
      .then(() => {
        rerender();
        return Object.freeze({ ok: true });
      })
      .catch(() => {
        host.replaceChildren(statusMessage(documentObject, 'تعذر تحديث خزنة الظهور من الخادم.', 'error'));
        return Object.freeze({ ok: false, code: 'PULSE_REFRESH_FAILED' });
      })
      .finally(() => { refreshInFlight = null; });
    return refreshInFlight;
  }

  documentObject.addEventListener('click', (event) => {
    if (event.target.closest('[data-nexus-vault-close]')) {
      event.preventDefault();
      closeVault(layer);
      return;
    }
    const globalTrigger = event.target.closest('[data-nexus-vault-trigger]');
    if (globalTrigger) {
      event.preventDefault();
      selectedPostId = null;
      rerender();
      openVault(layer);
    }
  });

  documentObject.addEventListener('vvip:social-posts-rendered', () => { void refreshAll(); });
  root.addEventListener?.('tiger:nexus-pulse-refresh', () => { void refreshAll(); });

  const feedHost = documentObject.querySelector('[data-social-feed-items]');
  let observer = null;
  if (feedHost && typeof root.MutationObserver === 'function') {
    observer = new root.MutationObserver(() => {
      enhanceOwnedFeedObjects(root, surface.state().ownedPostIds, (postId) => {
        selectedPostId = postId;
        rerender();
        openVault(layer);
      });
    });
    observer.observe(feedHost, { childList: true, subtree: true });
  }

  const current = Object.freeze({
    installed: true,
    surface,
    refresh: refreshAll,
    destroy() { if (observer) observer.disconnect(); },
  });
  root.TIGERNexusPulseSurfaceCurrent = current;
  await refreshAll();
  return current;
}
