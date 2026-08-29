(function (root) {
  'use strict';

  let readyPromise = null;

  function contextError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function ready() {
    if (readyPromise) return readyPromise;

    readyPromise = Promise.resolve().then(function () {
      if (!root.VVIPRuntimeReady || typeof root.VVIPRuntimeReady.then !== 'function') {
        throw contextError('NEXUS_RUNTIME_UNAVAILABLE');
      }
      return root.VVIPRuntimeReady;
    }).then(function (runtime) {
      if (!runtime || !runtime.supabase || !runtime.clerk) {
        throw contextError('NEXUS_RUNTIME_UNAVAILABLE');
      }
      return Object.freeze({ runtime: runtime });
    }).catch(function (error) {
      readyPromise = null;
      throw error;
    });

    return readyPromise;
  }

  root.TIGERNexusRuntimeContext = Object.freeze({ ready: ready });
})(window);
