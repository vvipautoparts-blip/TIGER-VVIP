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

  // Transitional zero-authority shim. All trusted media and publication behavior
  // lives in the canonical repository. The release convergence task removes this
  // file and its script injection entirely after zero-reference proof.
  return base;
});
