(function (global) {
  'use strict';

  let started = false;

  function rootElement() {
    if (!global.document || typeof global.document.querySelector !== 'function') return null;
    return global.document.querySelector('[data-vvip-fusion-authoritative]');
  }

  function setState(root, state) {
    if (!root || typeof root.setAttribute !== 'function') return;
    root.setAttribute('data-fusion-state', state);
  }

  function showHome() {
    const root = rootElement();
    if (!root) return false;

    root.hidden = false;
    if (typeof root.setAttribute === 'function') root.setAttribute('aria-hidden', 'false');

    if (!started) {
      started = true;
      setState(root, 'ready');
      if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent('vvip:fusion-surface-ready', {
          detail: Object.freeze({ authoritative: true })
        }));
      }
    }

    return true;
  }

  function snapshot() {
    const root = rootElement();
    return Object.freeze({
      present: Boolean(root),
      visible: Boolean(root && !root.hidden),
      state: root && typeof root.getAttribute === 'function'
        ? (root.getAttribute('data-fusion-state') || 'idle')
        : 'idle'
    });
  }

  global.VVIPFusionSurface = Object.freeze({ showHome, snapshot });
})(window);
