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

  function rollbackError(cause, cleanupErrors) {
    const error = new Error("MARKETPLACE_ROLLBACK_INCOMPLETE");
    error.code = "MARKETPLACE_ROLLBACK_INCOMPLETE";
    error.cause = cause;
    error.cleanupErrors = cleanupErrors.slice();
    return error;
  }

  function hardenRepository(repository, options) {
    const client = options && options.client;
    if (!repository || !client || !client.storage || typeof client.from !== "function") {
      throw new Error("MARKETPLACE_ROLLBACK_CLIENT_REQUIRED");
    }

    async function createAndSubmit(input, images) {
      const draft = await repository.createDraft(input);
      let mediaRows = [];
      try {
        mediaRows = await repository.uploadMedia(draft.listing_id, images);
        return await repository.submitForReview(draft.listing_id);
      } catch (cause) {
        const cleanupErrors = [];
        const paths = (mediaRows || [])
          .map(function (row) { return row && row.storage_path; })
          .filter(Boolean);
        if (paths.length) {
          try {
            const removed = await client.storage.from("listing-media").remove(paths);
            if (removed && removed.error) cleanupErrors.push(removed.error);
          } catch (error) {
            cleanupErrors.push(error);
          }
        }
        try {
          const deleted = await client
            .from("vvip_marketplace_listings")
            .delete()
            .eq("listing_id", draft.listing_id);
          if (deleted && deleted.error) cleanupErrors.push(deleted.error);
        } catch (error) {
          cleanupErrors.push(error);
        }
        if (cleanupErrors.length) throw rollbackError(cause, cleanupErrors);
        throw cause;
      }
    }

    return Object.freeze(Object.assign({}, repository, { createAndSubmit: createAndSubmit }));
  }

  function createMarketplaceRepository(options) {
    return hardenRepository(base.createMarketplaceRepository(options), options);
  }

  return Object.freeze(Object.assign({}, base, {
    createMarketplaceRepository: createMarketplaceRepository,
    hardenRepository: hardenRepository,
    rollbackError: rollbackError
  }));
});
