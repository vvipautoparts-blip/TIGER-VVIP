(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.VVIP_AUTH = api;
    if (typeof window !== "undefined") window.VVIP_AUTH = api;
    root.addEventListener("load", function () { api.start().catch(api.recover); });
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const SAFE_RETURN_PATHS = new Set([
    "index.html", "/index.html", "./index.html"
  ]);
  const INTENT_STORAGE_KEY = "vvip.auth.intent.v1";
  const SIMPLE_INTENTS = new Set([
    "OPEN_ACCOUNT",
    "CREATE_SOCIAL_POST",
    "OPEN_SOCIAL_FRIENDS",
    "SOCIAL_FRIEND_ACTION",
    "SOCIAL_MESSAGE_ACTION",
    "SOCIAL_PROFILE_EDIT",
    "SOCIAL_PROFILE_BLOCK",
    "SOCIAL_PROFILE_UNBLOCK",
    "SOCIAL_REPORT_SUBMIT",
    "SOCIAL_PROFILE_FOLLOW",
    "SOCIAL_PROFILE_UNFOLLOW",
    "SOCIAL_FEED_PREFERENCE"
  ]);
  const CLERK_USER_PATTERN = /^user_[A-Za-z0-9_-]{6,128}$/;
  const SESSION_TOKEN_MAX_LENGTH = 16 * 1024;

  let activeClerk = null;
  let listenerRegistered = false;
  let mounted = false;
  let pendingIntent = null;
  let pendingResume = null;
  let resumeInFlight = false;

  function authError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function hasActiveSession(clerk) {
    return Boolean(
      clerk
      && clerk.isSignedIn === true
      && clerk.user
      && typeof clerk.user.id === "string"
      && CLERK_USER_PATTERN.test(clerk.user.id)
      && clerk.session
      && typeof clerk.session.getToken === "function"
    );
  }

  function safeReturnPath(locationLike) {
    const location = locationLike || root.location;
    const returnTo = new URLSearchParams(location.search).get("return_to");
    return SAFE_RETURN_PATHS.has(returnTo) ? returnTo : "";
  }

  function fusionSurface() {
    const surface = root.VVIPFusionSurface;
    return surface && typeof surface === "object" ? surface : null;
  }

  function showHome() {
    const surface = fusionSurface();
    if (!surface || typeof surface.showHome !== "function") throw authError("NEXUS_SURFACE_UNAVAILABLE");
    surface.showHome();
  }

  function hideHome() {
    const surface = fusionSurface();
    if (!surface || typeof surface.hideHome !== "function") throw authError("NEXUS_SURFACE_UNAVAILABLE");
    surface.hideHome();
  }

  function gateElement() {
    return root.document && typeof root.document.querySelector === "function"
      ? root.document.querySelector("[data-vvip-auth-gate]")
      : null;
  }

  function errorElement() {
    return root.document && typeof root.document.querySelector === "function"
      ? root.document.querySelector("[data-auth-error]")
      : null;
  }

  function showGate() {
    hideHome();
    const gate = gateElement();
    if (!gate) throw authError("NEXUS_AUTH_GATE_UNAVAILABLE");
    gate.hidden = false;
    if (typeof gate.setAttribute === "function") gate.setAttribute("aria-hidden", "false");
  }

  function hideGate() {
    const gate = gateElement();
    if (!gate) return;
    gate.hidden = true;
    if (typeof gate.setAttribute === "function") gate.setAttribute("aria-hidden", "true");
  }

  function clearAuthError() {
    const node = errorElement();
    if (!node) return;
    node.textContent = "";
    node.hidden = true;
  }

  function showAuthError() {
    const node = errorElement();
    if (node) {
      node.textContent = "تعذر تحميل بوابة الدخول الآمنة. تحقق من الاتصال ثم حاول مرة أخرى.";
      node.hidden = false;
      return;
    }
    const host = root.document && root.document.getElementById("clerk-sign-in");
    if (host) host.innerHTML = '<p class="auth-error">تعذر تحميل بوابة الدخول الآمنة. تحقق من الاتصال ثم حاول مرة أخرى.</p>';
  }

  function normalizeIntentDescriptor(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw authError("AUTH_INTENT_INVALID");
    const keys = Object.keys(input).sort();
    const name = typeof input.name === "string" ? input.name : "";
    if (SIMPLE_INTENTS.has(name)) {
      if (keys.length !== 1 || keys[0] !== "name") throw authError("AUTH_INTENT_INVALID");
      return Object.freeze({ name });
    }
    throw authError("AUTH_INTENT_INVALID");
  }

  function storage() {
    try {
      return root.sessionStorage || null;
    } catch (_) {
      return null;
    }
  }

  function persistIntent(descriptor) {
    const target = storage();
    if (!target) return;
    try {
      target.setItem(INTENT_STORAGE_KEY, JSON.stringify(descriptor));
    } catch (_) {
      // Protected actions can still use the in-memory resume path when storage is unavailable.
    }
  }

  function clearStoredIntent() {
    const target = storage();
    if (!target) return;
    try {
      target.removeItem(INTENT_STORAGE_KEY);
    } catch (_) {
      // No-op: storage is optional resilience only.
    }
  }

  function consumeStoredIntent() {
    const target = storage();
    if (!target) return null;
    let raw = null;
    try {
      raw = target.getItem(INTENT_STORAGE_KEY);
      target.removeItem(INTENT_STORAGE_KEY);
    } catch (_) {
      return null;
    }
    if (!raw) return null;
    try {
      return normalizeIntentDescriptor(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function resetForClerk(clerk) {
    if (activeClerk === clerk) return;
    activeClerk = clerk;
    listenerRegistered = false;
    mounted = false;
    pendingIntent = null;
    pendingResume = null;
    resumeInFlight = false;
  }

  function dispatchResume(descriptor) {
    if (!descriptor || typeof root.dispatchEvent !== "function") return;
    if (typeof root.CustomEvent === "function") {
      root.dispatchEvent(new root.CustomEvent("vvip:auth-resume", { detail: descriptor }));
    }
  }

  async function completeSignedIn() {
    if (resumeInFlight) return;
    if (!hasActiveSession(activeClerk)) {
      if (activeClerk) lockSignedOut(activeClerk);
      return;
    }
    resumeInFlight = true;
    try {
      clearAuthError();
      showHome();
      hideGate();
      const stored = consumeStoredIntent();
      const resume = pendingResume;
      const descriptor = pendingIntent || stored;
      pendingIntent = null;
      pendingResume = null;

      if (typeof resume === "function") {
        await Promise.resolve(resume());
        return;
      }
      if (descriptor) {
        dispatchResume(descriptor);
        return;
      }

      const returnTo = safeReturnPath();
      if (returnTo && root.location && typeof root.location.replace === "function") {
        root.location.replace(returnTo);
      }
    } finally {
      resumeInFlight = false;
    }
  }

  function lockSignedOut(clerk) {
    clearAuthError();
    showGate();
    mountClerk(clerk);
  }

  function registerListener(clerk) {
    if (listenerRegistered || !clerk || typeof clerk.addListener !== "function") return;
    listenerRegistered = true;
    clerk.addListener(function () {
      if (hasActiveSession(clerk)) {
        completeSignedIn().catch(recover);
        return;
      }
      try {
        lockSignedOut(clerk);
      } catch (_) {
        recover();
      }
    });
  }

  async function resolveClerk() {
    const runtime = await Promise.resolve(root.VVIPRuntimeReady);
    const clerk = runtime && runtime.clerk;
    if (!clerk) throw authError("CLERK_RUNTIME_UNAVAILABLE");
    resetForClerk(clerk);
    registerListener(clerk);
    return clerk;
  }

  async function getSessionToken() {
    const clerk = await resolveClerk();
    if (!hasActiveSession(clerk)) throw authError("AUTH_REQUIRED");
    let token;
    try {
      token = await clerk.session.getToken();
    } catch (_) {
      throw authError("AUTH_SESSION_TOKEN_UNAVAILABLE");
    }
    if (
      typeof token !== "string"
      || token.length < 16
      || token.length > SESSION_TOKEN_MAX_LENGTH
      || /\s/.test(token)
    ) {
      throw authError("AUTH_SESSION_TOKEN_UNAVAILABLE");
    }
    return token;
  }

  function redirectUrl() {
    const redirectPath = safeReturnPath() || "index.html";
    return new URL(redirectPath, root.location.href).href;
  }

  function mountClerk(clerk) {
    if (mounted) return;
    const host = root.document && root.document.getElementById("clerk-sign-in");
    if (!host) throw authError("CLERK_HOST_UNAVAILABLE");
    const target = redirectUrl();
    clerk.mountSignIn(host, {
      routing: "hash",
      oauthFlow: "auto",
      withSignUp: true,
      fallbackRedirectUrl: target,
      forceRedirectUrl: target,
      signUpFallbackRedirectUrl: target,
      signUpForceRedirectUrl: target
    });
    mounted = true;
  }

  async function start() {
    clearAuthError();
    showGate();

    const clerk = await resolveClerk();
    if (hasActiveSession(clerk)) {
      await completeSignedIn();
      return;
    }
    mountClerk(clerk);
  }

  async function requireAuth(descriptor, resume) {
    const normalized = normalizeIntentDescriptor(descriptor);
    const clerk = await resolveClerk();
    if (hasActiveSession(clerk)) {
      clearStoredIntent();
      if (typeof resume === "function") await Promise.resolve(resume());
      return true;
    }

    pendingIntent = normalized;
    pendingResume = typeof resume === "function" ? resume : null;
    persistIntent(normalized);
    clearAuthError();
    showGate();
    mountClerk(clerk);
    return false;
  }

  function recover() {
    console.warn("VVIP_CLERK_GATE_RECOVERY");
    try {
      showGate();
    } catch (_) {
      // Fail closed: never reveal the protected surface when the canonical gate is unavailable.
    }
    showAuthError();
  }

  return Object.freeze({
    start,
    requireAuth,
    getSessionToken,
    normalizeIntentDescriptor,
    consumeStoredIntent,
    recover,
    safeReturnPath,
    authError,
    hasActiveSession
  });
});
