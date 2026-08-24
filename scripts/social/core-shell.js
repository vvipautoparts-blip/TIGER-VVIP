(() => {
  'use strict';

  const SOCIAL_DESTINATIONS = new Set([
    'home',
    'friends',
    'messages',
    'notifications',
    'profile',
    'marketplace',
  ]);
  const SOCIAL_AUDIENCES = new Set(['public', 'friends', 'only_me']);
  const POST_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function setCurrentNav(destination) {
    document.querySelectorAll('[data-social-nav]').forEach((control) => {
      if (control.dataset.socialNav === destination) {
        control.setAttribute('aria-current', 'page');
      } else {
        control.removeAttribute('aria-current');
      }
    });
  }

  function setHidden(selector, hidden) {
    document.querySelectorAll(selector).forEach((node) => {
      node.hidden = hidden;
      node.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    });
  }

  function showDestination(destination) {
    if (!SOCIAL_DESTINATIONS.has(destination)) return false;

    setCurrentNav(destination);

    const showHome = destination === 'home';
    const showMarketplace = destination === 'marketplace';
    const showPlaceholder = !showHome && !showMarketplace;

    setHidden('[data-tiger-social-feed]', !showHome);
    setHidden('[data-social-module-placeholder]', true);
    setHidden('[data-social-marketplace-surface]', !showMarketplace);

    if (showPlaceholder) {
      setHidden(`[data-social-module-placeholder="${destination}"]`, false);
    }

    return true;
  }

  function destinationFromHash() {
    const value = window.location.hash.replace(/^#/, '').trim().toLowerCase();
    return SOCIAL_DESTINATIONS.has(value) ? value : null;
  }

  function loadProfile(profileId) {
    const current = window.TIGERSocialProfileCurrent;
    if (current && typeof current.load === 'function') {
      return current.load(profileId);
    }
    const ready = window.TIGERSocialProfileReady;
    if (ready && typeof ready.then === 'function') {
      return ready.then((controller) => (
        controller && typeof controller.load === 'function'
          ? controller.load(profileId)
          : { ok: false, code: 'SOCIAL_PROFILE_UNAVAILABLE' }
      ));
    }
    return Promise.resolve({ ok: false, code: 'SOCIAL_PROFILE_UNAVAILABLE' });
  }

  function openProfile(profileId) {
    const targetId = profileId === null || profileId === undefined ? null : profileId;
    if (targetId !== null && !POST_UUID.test(targetId)) {
      return Promise.resolve({ ok: false, code: 'SOCIAL_INVALID_PROFILE_ID' });
    }
    showDestination('profile');
    if (window.location.hash !== '#profile') {
      window.history.replaceState(null, '', '#profile');
    }
    return loadProfile(targetId);
  }

  function setPostSheetOpen(open) {
    const sheet = document.querySelector('[data-social-post-sheet]');
    if (!sheet) return;

    sheet.hidden = !open;
    sheet.setAttribute('aria-hidden', open ? 'false' : 'true');

    if (open) {
      const dialog = sheet.querySelector('[role="dialog"]');
      const draft = sheet.querySelector('[data-social-post-draft]');
      (draft || dialog)?.focus();
    }
  }

  function rpcClient() {
    const client = window.VVIP_SUPABASE;
    return client && typeof client.rpc === 'function' ? client : null;
  }

  function validPostId(value) {
    return typeof value === 'string' && POST_UUID.test(value);
  }

  async function callSocialRpc(name, params) {
    const client = rpcClient();
    if (!client) return { ok: false };
    try {
      const response = await client.rpc(name, params);
      if (!response || response.error || response.data === null || response.data === undefined) {
        return { ok: false };
      }
      return { ok: true, value: response.data };
    } catch (_) {
      return { ok: false };
    }
  }

  function postArticle(control) {
    return control?.closest?.('[data-social-post-id]') || null;
  }

  function ensureSaveControl(article) {
    let save = article.querySelector('[data-social-save-trigger]');
    if (save) return save;

    const actions = article.querySelector('.social-feed-post__secondary-actions');
    if (!actions) return null;

    save = document.createElement('button');
    save.type = 'button';
    save.className = 'social-post-action social-post-action--save';
    save.setAttribute('data-social-save-trigger', '');
    save.setAttribute('aria-label', 'حفظ المنشور');
    save.setAttribute('aria-pressed', 'false');
    save.textContent = 'حفظ';

    const share = actions.querySelector('[data-social-share-trigger]');
    if (share) actions.insertBefore(save, share);
    else actions.append(save);
    return save;
  }

  function setSavedState(control, saved) {
    control.dataset.socialSaved = saved ? 'true' : 'false';
    control.setAttribute('aria-pressed', saved ? 'true' : 'false');
    control.textContent = saved ? 'محفوظ' : 'حفظ';
  }

  async function hydrateBookmarkState(article, control) {
    if (!control || control.dataset.socialBookmarkHydrated === 'true') return;
    const postId = article.dataset.socialPostId;
    if (!validPostId(postId) || !rpcClient()) {
      control.disabled = true;
      return;
    }

    control.disabled = true;
    const result = await callSocialRpc('vvip_social_bookmark_state', { p_post_id: postId });
    if (!result.ok || !result.value || typeof result.value.saved !== 'boolean') {
      control.disabled = true;
      return;
    }

    control.dataset.socialBookmarkHydrated = 'true';
    setSavedState(control, result.value.saved);
    control.disabled = false;
  }

  function enhancePostActions() {
    document.querySelectorAll('[data-social-post-id]').forEach((article) => {
      const postId = article.dataset.socialPostId;
      const share = article.querySelector('[data-social-share-trigger]');
      const save = ensureSaveControl(article);
      const ready = validPostId(postId) && Boolean(rpcClient());

      if (share) {
        share.disabled = !ready || share.dataset.socialReposted === 'true';
        share.setAttribute('aria-disabled', share.disabled ? 'true' : 'false');
      }

      if (save) {
        if (!ready) {
          save.disabled = true;
        } else {
          void hydrateBookmarkState(article, save);
        }
      }
    });
  }

  function installFeedEnhancer() {
    enhancePostActions();
    document.addEventListener('vvip:social-posts-rendered', enhancePostActions);
    const host = document.querySelector('[data-social-feed-items]');
    if (!host || typeof MutationObserver !== 'function') return;

    const observer = new MutationObserver(() => {
      enhancePostActions();
    });
    observer.observe(host, { childList: true, subtree: true });
  }

  async function handleSave(control) {
    const article = postArticle(control);
    const postId = article?.dataset?.socialPostId;
    if (!article || !validPostId(postId) || control.disabled) return;

    const saved = control.dataset.socialSaved === 'true';
    control.disabled = true;
    const result = await callSocialRpc(
      saved ? 'vvip_social_unsave_post' : 'vvip_social_save_post',
      { p_post_id: postId }
    );

    if (!result.ok || !result.value || typeof result.value.saved !== 'boolean') {
      control.disabled = false;
      return;
    }

    setSavedState(control, result.value.saved);
    control.disabled = false;
  }

  async function handleShare(control) {
    const article = postArticle(control);
    const postId = article?.dataset?.socialPostId;
    const audience = article?.getAttribute?.('data-social-post-audience');
    if (!article || !validPostId(postId) || !SOCIAL_AUDIENCES.has(audience) || control.disabled) return;

    control.disabled = true;
    const result = await callSocialRpc('vvip_social_repost_post', {
      p_original_post_id: postId,
      p_audience: audience,
    });

    if (!result.ok) {
      control.disabled = false;
      control.setAttribute('aria-disabled', 'false');
      return;
    }

    control.dataset.socialReposted = 'true';
    control.setAttribute('aria-pressed', 'true');
    control.setAttribute('aria-disabled', 'true');
    control.textContent = 'تمت المشاركة';
  }

  document.addEventListener('click', (event) => {
    const saveControl = event.target.closest('[data-social-save-trigger]');
    if (saveControl) {
      event.preventDefault();
      void handleSave(saveControl);
      return;
    }

    const shareControl = event.target.closest('[data-social-share-trigger]');
    if (shareControl) {
      event.preventDefault();
      void handleShare(shareControl);
      return;
    }

    const postTrigger = event.target.closest('[data-social-post-trigger]');
    if (postTrigger) {
      event.preventDefault();
      setPostSheetOpen(true);
      return;
    }

    if (event.target.closest('[data-social-post-close]')) {
      event.preventDefault();
      setPostSheetOpen(false);
      return;
    }

    const profileTarget = event.target.closest('[data-social-profile-id]');
    if (profileTarget) {
      event.preventDefault();
      void openProfile(profileTarget.getAttribute('data-social-profile-id'));
      return;
    }

    const control = event.target.closest('[data-social-nav]');
    if (!control) return;

    const destination = control.dataset.socialNav;
    if (!SOCIAL_DESTINATIONS.has(destination)) return;

    if (control.tagName === 'A') {
      const href = control.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      event.preventDefault();
    }

    if (destination === 'profile') {
      void openProfile(null);
      return;
    }

    showDestination(destination);

    const nextHash = `#${destination}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setPostSheetOpen(false);
  });

  window.addEventListener('hashchange', () => {
    const destination = destinationFromHash();
    if (destination === 'profile') {
      void openProfile(null);
    } else if (destination) {
      showDestination(destination);
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    const destination = destinationFromHash() || 'home';
    if (destination === 'profile') void openProfile(null);
    else showDestination(destination);
    installFeedEnhancer();
  });

  window.TIGERSocialShell = Object.freeze({ showDestination, openProfile });
})();
