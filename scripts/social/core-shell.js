(() => {
  'use strict';

  const SOCIAL_DESTINATIONS = new Set([
    'home',
    'search',
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
    const showSearch = destination === 'search';
    const showMarketplace = destination === 'marketplace';
    const showPlaceholder = !showHome && !showSearch && !showMarketplace && destination !== 'profile';

    setHidden('[data-tiger-social-feed]', !showHome);
    setHidden('[data-social-search-surface]', !showSearch);
    setHidden('[data-social-module-placeholder]', true);
    setHidden('[data-social-marketplace-surface]', !showMarketplace);

    if (showPlaceholder) {
      setHidden(`[data-social-module-placeholder="${destination}"]`, false);
    }

    if (showSearch) {
      document.querySelector('[data-social-search-input]')?.focus();
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

  function ensureSearchStyles() {
    if (document.querySelector('link[data-social-search-styles]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/tiger-social/search.css';
    link.dataset.socialSearchStyles = 'true';
    document.head.appendChild(link);
  }

  function ensureSearchSurface() {
    if (document.querySelector('[data-social-search-surface]')) return;
    const marketplace = document.querySelector('[data-social-marketplace-surface]');
    if (!marketplace || !marketplace.parentNode) return;

    const section = document.createElement('section');
    section.className = 'tiger-social-home social-search-surface';
    section.dataset.socialSearchSurface = 'true';
    section.setAttribute('aria-label', 'البحث الاجتماعي');
    section.setAttribute('aria-hidden', 'true');
    section.hidden = true;

    const heading = document.createElement('header');
    heading.className = 'social-search-heading';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'VVIP TIGER SOCIAL';
    const title = document.createElement('h2');
    title.textContent = 'البحث';
    heading.append(eyebrow, title);

    const label = document.createElement('label');
    label.className = 'social-search-box';
    const hiddenLabel = document.createElement('span');
    hiddenLabel.className = 'visually-hidden';
    hiddenLabel.textContent = 'ابحث عن أشخاص أو منشورات';
    const input = document.createElement('input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.maxLength = 160;
    input.placeholder = 'ابحث عن أشخاص أو منشورات…';
    input.dataset.socialSearchInput = 'true';
    label.append(hiddenLabel, input);

    const state = document.createElement('p');
    state.className = 'social-search-state';
    state.dataset.socialSearchState = 'true';
    state.setAttribute('role', 'status');
    state.setAttribute('aria-live', 'polite');
    state.textContent = 'ابحث عن أشخاص أو منشورات داخل VVIP TIGER.';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'social-search-retry';
    retry.dataset.socialSearchRetry = 'true';
    retry.setAttribute('data-social-search-retry', 'true');
    retry.setAttribute('aria-label', 'إعادة محاولة البحث');
    retry.hidden = true;
    retry.setAttribute('aria-hidden', 'true');
    retry.textContent = 'إعادة المحاولة';

    const peopleSection = document.createElement('section');
    peopleSection.className = 'social-search-results';
    const peopleTitle = document.createElement('h3');
    peopleTitle.textContent = 'الأشخاص';
    const people = document.createElement('div');
    people.dataset.socialSearchPeople = 'true';
    peopleSection.append(peopleTitle, people);

    const postsSection = document.createElement('section');
    postsSection.className = 'social-search-results';
    const postsTitle = document.createElement('h3');
    postsTitle.textContent = 'المنشورات';
    const posts = document.createElement('div');
    posts.dataset.socialSearchPosts = 'true';
    postsSection.append(postsTitle, posts);

    section.append(heading, label, state, retry, peopleSection, postsSection);
    marketplace.parentNode.insertBefore(section, marketplace);
  }

  function ensureSearchNavigation() {
    const header = document.querySelector('[data-social-mobile-header]');
    if (!header || header.querySelector('[data-social-nav="search"]')) return;
    const inert = header.querySelector('.social-circle-action--inactive');
    if (!inert) return;

    const button = document.createElement('button');
    button.className = 'social-circle-action';
    button.type = 'button';
    const data = button.dataset;
    data.socialNav = 'search';
    button.setAttribute('aria-label', 'البحث');
    button.textContent = '⌕';
    inert.replaceWith(button);
  }

  function bindSearchController() {
    const surface = document.querySelector('[data-social-search-surface]');
    if (!surface || surface.dataset.searchBound === 'true') return;
    const searchApi = window.TIGERSocialSearch;
    const runtimeApi = window.TIGERSocialRuntime;
    if (!searchApi || !runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== 'function') return;
    const runtime = runtimeApi.createCurrentSocialRuntime(window);
    if (!runtime || !runtime.search) return;
    searchApi.bindTigerSocialSearchSurface(surface, runtime.search);
    surface.dataset.searchBound = 'true';
  }

  function ensureSearchController() {
    ensureSearchStyles();
    ensureSearchSurface();
    ensureSearchNavigation();

    if (window.TIGERSocialSearch) {
      bindSearchController();
      return;
    }
    if (document.querySelector('script[data-social-search-controller]')) return;
    const script = document.createElement('script');
    script.src = 'scripts/social/search-controller.js';
    script.defer = true;
    script.dataset.socialSearchController = 'true';
    script.addEventListener('load', bindSearchController, { once: true });
    document.head.appendChild(script);
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
    ensureSearchController();
    showDestination(destinationFromHash() || 'home');
  });
})();