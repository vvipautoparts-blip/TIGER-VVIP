(function (root) {
  'use strict';

  let lastFocus = null;
  let loading = false;

  function layer() {
    return root.document && root.document.querySelector('[data-fusion-account-sheet]');
  }

  function safe(value) {
    return String(value == null ? '' : value).replace(/[<>\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function setIdentity(message, error) {
    const host = root.document.querySelector('[data-fusion-account-identity]');
    if (!host) return;
    host.replaceChildren();
    const line = root.document.createElement('p');
    line.textContent = message;
    if (error) line.setAttribute('role', 'alert');
    host.appendChild(line);
  }

  function renderActions(runtime) {
    const host = root.document.querySelector('[data-fusion-account-actions]');
    if (!host) return;
    host.replaceChildren();

    const recovery = root.document.createElement('button');
    recovery.type = 'button';
    recovery.className = 'button button--quiet';
    recovery.dataset.fusionAccountRecovery = 'true';
    recovery.textContent = 'الأمان واستعادة الوصول';
    recovery.addEventListener('click', function () {
      const clerk = runtime && runtime.clerk;
      if (!clerk || typeof clerk.openUserProfile !== 'function') {
        setIdentity('تعذر فتح إدارة الأمان لدى مزود الهوية الآن.', true);
        return;
      }
      clerk.openUserProfile({ routing: 'hash' });
    });

    const signOut = root.document.createElement('button');
    signOut.type = 'button';
    signOut.className = 'button button--quiet';
    signOut.dataset.fusionSignOut = 'true';
    signOut.textContent = 'تسجيل الخروج';
    signOut.addEventListener('click', function () {
      const clerk = runtime && runtime.clerk;
      if (!clerk || typeof clerk.signOut !== 'function') return;
      Promise.resolve(clerk.signOut()).then(function () {
        close();
        if (root.location && typeof root.location.reload === 'function') root.location.reload();
      }).catch(function () {
        setIdentity('تعذر تسجيل الخروج الآن. حاول مرة أخرى.', true);
      });
    });

    host.appendChild(recovery);
    host.appendChild(signOut);
  }

  async function currentRuntime() {
    const ready = root.VVIPRuntimeReady;
    if (!ready || typeof ready.then !== 'function') throw new Error('ACCOUNT_RUNTIME_UNAVAILABLE');
    const runtime = await ready;
    if (!runtime || !runtime.clerk) throw new Error('ACCOUNT_RUNTIME_UNAVAILABLE');
    return runtime;
  }

  async function hydrate() {
    if (loading) return;
    loading = true;
    try {
      const runtime = await currentRuntime();
      const user = runtime.clerk && runtime.clerk.user;
      if (!user) throw new Error('ACCOUNT_IDENTITY_UNAVAILABLE');
      const name = safe(user.fullName || user.firstName || user.username || 'حساب VVIP TIGER');
      const email = safe(user.primaryEmailAddress && user.primaryEmailAddress.emailAddress);
      setIdentity([name, email].filter(Boolean).join(' · '), false);
      renderActions(runtime);

      const lifecycle = root.TIGERSocialAccountLifecycleCurrent;
      if (!lifecycle || typeof lifecycle.load !== 'function') {
        throw new Error('ACCOUNT_LIFECYCLE_UNAVAILABLE');
      }
      await lifecycle.load();
    } catch (_) {
      setIdentity('تعذر تحميل بيانات الحساب الآمنة الآن.', true);
    } finally {
      loading = false;
    }
  }

  function openInternal() {
    const host = layer();
    if (!host) return false;
    lastFocus = root.document.activeElement;
    host.hidden = false;
    host.setAttribute('aria-hidden', 'false');
    const panel = host.querySelector('.fusion-account-panel');
    if (panel && typeof panel.focus === 'function') panel.focus();
    void hydrate();
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

  root.VVIPFusionAccount = Object.freeze({ open: open, close: close, hydrate: hydrate });
})(window);
