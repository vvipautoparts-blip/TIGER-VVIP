(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.addEventListener("load", function () { api.start().catch(api.recover); });
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const SAFE_RETURN_PATHS = new Set([
    "index.html", "/index.html", "./index.html",
    "private-profile-p03.html", "/private-profile-p03.html", "./private-profile-p03.html"
  ]);

  function authError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function localPreviewAllowed(locationLike) {
    const location = locationLike || root.location;
    const preview = new URLSearchParams(location.search).get("preview");
    const local = ["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"].includes(location.hostname);
    return local && preview === "home";
  }

  function safeReturnPath(locationLike) {
    const location = locationLike || root.location;
    const returnTo = new URLSearchParams(location.search).get("return_to");
    return SAFE_RETURN_PATHS.has(returnTo) ? returnTo : "";
  }

  function showHome() {
    if (root.VVIP_PR29 && typeof root.VVIP_PR29.showHome === "function") root.VVIP_PR29.showHome();
  }

  function showGate() {
    if (root.VVIP_PR29 && typeof root.VVIP_PR29.showGate === "function") root.VVIP_PR29.showGate();
  }

  function finishSignedIn() {
    const returnTo = safeReturnPath();
    if (returnTo) {
      root.location.replace(returnTo);
      return;
    }
    showHome();
  }

  async function start() {
    if (localPreviewAllowed()) {
      showHome();
      return;
    }
    const runtime = await Promise.resolve(root.VVIPRuntimeReady);
    const clerk = runtime && runtime.clerk;
    if (!clerk) throw authError("CLERK_RUNTIME_UNAVAILABLE");
    if (clerk.isSignedIn) {
      finishSignedIn();
      return;
    }
    showGate();
    const host = root.document && root.document.getElementById("clerk-sign-in");
    if (!host) throw authError("CLERK_HOST_UNAVAILABLE");
    const redirectPath = safeReturnPath() || "index.html";
    const redirectUrl = new URL(redirectPath, root.location.href).href;
    clerk.mountSignIn(host, {
      routing: "hash",
      fallbackRedirectUrl: redirectUrl,
      forceRedirectUrl: redirectUrl
    });
    if (typeof clerk.addListener === "function") {
      clerk.addListener(function () {
        if (clerk.isSignedIn) finishSignedIn();
      });
    }
  }

  function recover(error) {
    console.warn("VVIP_CLERK_GATE_RECOVERY", error && error.code);
    showGate();
    const host = root.document && root.document.getElementById("clerk-sign-in");
    if (host) host.innerHTML = '<p class="auth-error">تعذر تحميل بوابة الدخول الآمنة. تحقق من الاتصال ثم حاول مرة أخرى.</p>';
  }

  return Object.freeze({ start, recover, localPreviewAllowed, safeReturnPath, authError });
});
