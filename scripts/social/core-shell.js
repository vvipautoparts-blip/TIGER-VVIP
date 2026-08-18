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
    const showPlaceholder = !showHome && !showMarketplace && destination !== 'profile';

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

  document.addEventListener('click', (event) => {
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

    const control = event.target.closest('[data-social-nav]');
    if (!control) return;

    const destination = control.dataset.socialNav;
    if (!SOCIAL_DESTINATIONS.has(destination)) return;

    if (control.tagName === 'A') {
      const href = control.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      event.preventDefault();
    }

    showDestination(destination);

    if (destination !== 'profile') {
      const nextHash = `#${destination}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setPostSheetOpen(false);
  });

  window.addEventListener('hashchange', () => {
    const destination = destinationFromHash();
    if (destination) showDestination(destination);
  });

  window.addEventListener('DOMContentLoaded', () => {
    showDestination(destinationFromHash() || 'home');
  });
})();
