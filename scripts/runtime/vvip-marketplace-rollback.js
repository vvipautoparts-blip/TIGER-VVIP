(function (root, factory) {
  "use strict";
  const base = typeof module === "object" && module.exports
    ? require("./vvip-marketplace-repository.js")
    : root.VVIP_MARKETPLACE_REPOSITORY;
  const api = factory(base);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VVIP_MARKETPLACE_REPOSITORY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (base) {
  "use strict";

  if (!base || typeof base.createMarketplaceRepository !== "function") {
    throw new Error("MARKETPLACE_BASE_REPOSITORY_REQUIRED");
  }

  function hardeningError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function hardenRepository(repository) {
    if (!repository || typeof repository.createDraftWithMedia !== "function" || typeof repository.prepareForPublication !== "function") {
      throw hardeningError("MARKETPLACE_TRUSTED_PUBLICATION_API_REQUIRED");
    }
    if (typeof repository.submitForReview === "function" || typeof repository.createAndSubmit === "function") {
      throw hardeningError("MARKETPLACE_LEGACY_PUBLICATION_BYPASS_PRESENT");
    }
    return repository;
  }

  function createMarketplaceRepository(options) {
    return hardenRepository(base.createMarketplaceRepository(options));
  }

  return Object.freeze(Object.assign({}, base, {
    createMarketplaceRepository: createMarketplaceRepository,
    hardenRepository: hardenRepository
  }));
});
