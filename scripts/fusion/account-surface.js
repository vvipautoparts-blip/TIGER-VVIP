(function (root) {
  'use strict';

  let lastFocus = null;

  function layer() {
    return root.document && root.document.querySelector('[data-fusion-account-sheet]');
  }

  function openInternal() {
    const host = layer();
    if (!host) return false;
    lastFocus = root.document.activeElement;
    host.hidden = false;
    host.setAttribute('aria-hidden', 'false');
    const panel = host.querySelector('.fusion-account-panel');
    if (panel && typeof panel.focus === 'function') panel.focus();
    return true;
  }

  function close() {
    const host = layer();
    if (!host || host.hidden) return;
    host.hidden = true;
    host.setAttribute('aria-hidden', 'true');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function open() {
    const auth = root.VVIP_AUTH;
    if (!auth || typeof auth.requireAuth !== 'function') return Promise.resolve(false);
    return Promise.resolve(auth.requireAuth({ name: 'OPEN_ACCOUNT' }, openInternal));
  }

  root.document.addEventListener('click', function (event) {
    if (event.target.closest('[data-fusion-account-trigger]')) {
      event.preventDefault();
      open().catch(function () {});
      return;
    }
    if (event.target.closest('[data-fusion-account-close]')) close();
  });

  root.document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') close();
  });

  root.VVIPFusionAccount = Object.freeze({ open, close });
})(window);
