(function (root) {
  "use strict";

  if (!root || typeof root.addEventListener !== "function") return;

  function registerStaticDelivery() {
    const navigatorLike = root.navigator;
    if (!navigatorLike || !navigatorLike.serviceWorker) return;
    if (typeof navigatorLike.serviceWorker.register !== "function") return;

    Promise.resolve(
      navigatorLike.serviceWorker.register("sw-vvip-static.js", { scope: "./" })
    ).catch(function () {
      if (root.console && typeof root.console.warn === "function") {
        root.console.warn("VVIP_STATIC_DELIVERY_REGISTRATION_FAILED");
      }
    });
  }

  root.addEventListener("load", registerStaticDelivery, { once: true });
})(typeof window !== "undefined" ? window : this);
