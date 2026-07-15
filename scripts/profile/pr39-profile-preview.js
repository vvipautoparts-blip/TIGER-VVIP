(function (window) {
  "use strict";

  const STORAGE_KEY = "vvip:p05:profile-preview-draft:v1";
  const ALLOWED_KEYS = Object.freeze(["displayName", "publicUsername", "publicBio", "publicLocation", "avatarUrl", "coverUrl"]);

  function isPreviewAllowed(env) {
    const hostname = String(env && env.hostname || window.location.hostname || "").toLowerCase();
    const preview = String(env && env.preview || "");
    const localHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]" || hostname === "0.0.0.0";
    const codespaces = hostname !== "app.github.dev" && hostname.endsWith(".app.github.dev");
    return preview === "profile" && (localHost || codespaces);
  }

  function sanitizeDraft(input) {
    const raw = input && typeof input === "object" ? input : {};
    const out = {};
    ALLOWED_KEYS.forEach(function (key) {
      const value = String(raw[key] || "").replace(/[<>]/g, "").trim();
      if (!value) return;
      out[key] = value.slice(0, 220);
    });
    return out;
  }

  function writeSafeDraft(input, env, storage) {
    const safeStorage = storage || window.localStorage;
    if (!isPreviewAllowed(env)) {
      return { ok: false, message: "الحفظ المحلي متاح فقط في وضع المعاينة الآمنة." };
    }
    try {
      const payload = sanitizeDraft(input);
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return { ok: true, draft: payload };
    } catch (error) {
      return { ok: false, message: "تعذر حفظ المعاينة المحلية على هذا الجهاز." };
    }
  }

  function readSafeDraft(storage) {
    const safeStorage = storage || window.localStorage;
    try {
      const raw = safeStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return sanitizeDraft(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  window.VVIP_PR39_PROFILE_PREVIEW = Object.freeze({
    storageKey: STORAGE_KEY,
    isPreviewAllowed: isPreviewAllowed,
    sanitizeDraft: sanitizeDraft,
    writeSafeDraft: writeSafeDraft,
    readSafeDraft: readSafeDraft
  });
}(window));
