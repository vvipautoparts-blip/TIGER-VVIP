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
        throw contextError('FUSION_RUNTIME_UNAVAILABLE');
      }
      return root.VVIPRuntimeReady;
    }).then(function (runtime) {
      const factory = root.VVIP_MARKETPLACE_REPOSITORY;
      if (!factory || typeof factory.createMarketplaceRepository !== 'function') {
        throw contextError('FUSION_MARKETPLACE_REPOSITORY_UNAVAILABLE');
      }
      const repository = factory.createMarketplaceRepository({
        client: runtime.supabase,
        clerk: runtime.clerk,
        config: runtime.config,
        auth: root.VVIP_AUTH
      });
      return Object.freeze({ runtime: runtime, repository: repository });
    }).catch(function (error) {
      readyPromise = null;
      throw error;
    });

    return readyPromise;
  }

  root.VVIPFusionMarketplaceContext = Object.freeze({ ready: ready });
})(window);
