(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.VVIP_V13_COUNTRY_CONTEXT_CONTROLLER = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function success(context, persistence) {
    return Object.freeze({
      ok: true,
      context,
      persistence: persistence == null ? null : persistence
    });
  }

  function failure(error, context) {
    return Object.freeze({ ok: false, error, context });
  }

  function createCountryContextController(options) {
    const catalog = options && options.catalog;
    const contextApi = options && options.contextApi;
    const repository = options && options.repository;

    const contractAvailable = !!(
      catalog &&
      contextApi &&
      typeof contextApi.changeActiveMarket === "function"
    );
    const repositoryAvailable = !!(
      repository && typeof repository.saveSelection === "function"
    );

    function changeActiveMarket(currentContext, requestedCountry, operationOptions) {
      if (!contractAvailable) {
        return failure("COUNTRY_CONTEXT_CONTRACT_UNAVAILABLE", currentContext);
      }
      if (!repositoryAvailable) {
        return failure("PERSISTENCE_UNAVAILABLE", currentContext);
      }

      const candidate = contextApi.changeActiveMarket(
        currentContext,
        requestedCountry,
        {
          catalog,
          now: operationOptions && operationOptions.now
        }
      );

      if (!candidate || candidate.ok !== true) {
        return failure(
          candidate && candidate.error ? candidate.error : "COUNTRY_CONTEXT_CHANGE_REJECTED",
          currentContext
        );
      }

      const persisted = repository.saveSelection(candidate.value);
      if (!persisted || persisted.ok !== true) {
        return failure(
          persisted && persisted.error ? persisted.error : "PERSISTENCE_FAILED",
          currentContext
        );
      }

      return success(candidate.value, persisted.value);
    }

    return Object.freeze({ changeActiveMarket });
  }

  return Object.freeze({ createCountryContextController });
});
