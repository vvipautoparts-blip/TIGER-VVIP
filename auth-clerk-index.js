window.addEventListener("load", async function () {
  "use strict";

  const SAFE_RETURN_PATHS = new Set([
    "index.html",
    "/index.html",
    "./index.html",
    "private-profile-p03.html",
    "/private-profile-p03.html",
    "./private-profile-p03.html"
  ]);

  function localPreviewAllowed() {
    const preview = new URLSearchParams(location.search).get("preview");
    const isLocalHost = location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "::1" ||
      location.hostname === "[::1]" ||
      location.hostname === "0.0.0.0";
    return isLocalHost && preview === "home";
  }

  function safeReturnPath() {
    const returnTo = new URLSearchParams(location.search).get("return_to");
    return SAFE_RETURN_PATHS.has(returnTo) ? returnTo : "";
  }

  function finishSignedIn() {
    const returnTo = safeReturnPath();
    if (returnTo) {
      location.replace(returnTo);
      return;
    }
    window.VVIP_PR29 && window.VVIP_PR29.showHome();
  }

  if (localPreviewAllowed()) {
    window.VVIP_PR29 && window.VVIP_PR29.showHome();
    return;
  }

  const host = document.getElementById("clerk-sign-in");
  try {
    if (!window.Clerk) throw new Error("Clerk runtime unavailable");
    await window.Clerk.load();
    if (window.Clerk.isSignedIn) {
      finishSignedIn();
      return;
    }
    window.VVIP_PR29 && window.VVIP_PR29.showGate();
    const redirectPath = safeReturnPath() || "index.html";
    const redirectUrl = new URL(redirectPath, location.href).href;
    if (host) {
      window.Clerk.mountSignIn(host, {
        routing: "hash",
        fallbackRedirectUrl: redirectUrl,
        forceRedirectUrl: redirectUrl
      });
    }
    if (typeof window.Clerk.addListener === "function") {
      window.Clerk.addListener(function () {
        if (window.Clerk.isSignedIn) finishSignedIn();
      });
    }
  } catch (error) {
    console.warn("VVIP_CLERK_GATE_RECOVERY");
    if (host) host.innerHTML = '<p class="auth-error">تعذر تحميل بوابة الدخول الآمنة. حاول مرة أخرى.</p>';
  }
});
