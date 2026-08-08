(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }

  api.installRegistration(root);
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  function warnRegistrationFailure(root) {
    if (root && root.console && typeof root.console.warn === "function") {
      root.console.warn("VVIP_STATIC_DELIVERY_REGISTRATION_FAILED");
    }
  }

  function registerNow(root) {
    try {
      const result = root.navigator.serviceWorker.register(
        "sw-vvip-static.js",
        { scope: "./" }
      );

      Promise.resolve(result).catch(function () {
        warnRegistrationFailure(root);
      });
    } catch (_) {
      warnRegistrationFailure(root);
    }
  }

  function installRegistration(root) {
    if (!root || !root.navigator || !root.navigator.serviceWorker) return false;
    if (typeof root.navigator.serviceWorker.register !== "function") return false;

    if (root.document && root.document.readyState === "complete") {
      registerNow(root);
      return true;
    }

    if (typeof root.addEventListener !== "function") return false;
    root.addEventListener("load", function () {
      registerNow(root);
    }, { once: true });
    return true;
  }

  return Object.freeze({ installRegistration });
});
