(function (global) {
  'use strict';

  const freeze = Object.freeze;

  function unavailable(dependency) {
    return freeze({
      ok: false,
      code: 'FUSION_DEPENDENCY_UNAVAILABLE',
      dependency
    });
  }

  function failed(dependency) {
    return freeze({
      ok: false,
      code: 'FUSION_DEPENDENCY_FAILED',
      dependency
    });
  }

  function success(value) {
    return freeze({ ok: true, value });
  }

  function safeInvoke(dependency, target, method, args) {
    const fn = target && target[method];
    if (typeof fn !== 'function') {
      return unavailable(dependency);
    }

    try {
      const value = Reflect.apply(fn, target, args);
      if (value && typeof value.then === 'function') {
        return value.then(success, function () {
          return failed(dependency);
        });
      }
      return success(value);
    } catch (_) {
      return failed(dependency);
    }
  }

  function createRuntimeAdapters(deps) {
    const dependencies = deps || {};

    const listings = freeze({
      readEligible: function () {
        return safeInvoke('listings.readEligible', dependencies.listings, 'readEligible', Array.from(arguments));
      },
      openComposer: function () {
        return safeInvoke('listings.openComposer', dependencies.listings, 'openComposer', Array.from(arguments));
      }
    });

    const search = freeze({
      run: function () {
        return safeInvoke('search.run', dependencies.search, 'run', Array.from(arguments));
      }
    });

    const media = freeze({
      openSession: function () {
        return safeInvoke('media.openSession', dependencies.media, 'openSession', Array.from(arguments));
      }
    });

    const capabilities = freeze({
      getPresentationView: function () {
        return safeInvoke(
          'capabilities.getPresentationView',
          dependencies.capabilities,
          'getPresentationView',
          Array.from(arguments)
        );
      }
    });

    const drafts = freeze({
      readLocal: function () {
        return safeInvoke('drafts.readLocal', dependencies.drafts, 'readLocal', Array.from(arguments));
      }
    });

    const network = freeze({
      snapshot: function () {
        return safeInvoke('network.snapshot', dependencies.network, 'snapshot', Array.from(arguments));
      }
    });

    return freeze({ listings, search, media, capabilities, drafts, network });
  }

  global.VVIPFusionRuntime = freeze({ createRuntimeAdapters });
})(window);
