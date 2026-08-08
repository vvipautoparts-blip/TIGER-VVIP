(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.VVIP_RUNTIME_LOADER = api;
    root.VVIPRuntimeReady = api.boot().catch(function (error) {
      root.dispatchEvent(new CustomEvent("vvip:runtime-error", { detail: { code: error.code || "RUNTIME_BOOT_FAILED" } }));
      throw error;
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const REQUIRED = ["environment", "clerkPublishableKey", "supabaseUrl", "supabasePublishableKey"];

  function runtimeError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function decodeBase64Url(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    if (typeof root.atob === "function") return root.atob(normalized + padding);
    if (typeof Buffer !== "undefined") return Buffer.from(normalized + padding, "base64").toString("utf8");
    throw runtimeError("BASE64_DECODER_UNAVAILABLE");
  }

  function clerkFrontendApi(publishableKey) {
    const match = /^(pk_(?:test|live))_(.+)$/.exec(String(publishableKey || ""));
    if (!match) throw runtimeError("CLERK_PUBLISHABLE_KEY_INVALID");
    const decoded = decodeBase64Url(match[2]).replace(/\$$/, "").trim();
    if (!/^[A-Za-z0-9.-]+$/.test(decoded) || decoded.includes("..")) {
      throw runtimeError("CLERK_FRONTEND_API_INVALID");
    }
    return decoded;
  }

  function validateConfig(input) {
    const config = input && typeof input === "object" ? input : {};
    for (const field of REQUIRED) {
      if (!String(config[field] || "").trim()) throw runtimeError("RUNTIME_CONFIG_MISSING_" + field.toUpperCase());
    }
    if (!/^https:\/\/[A-Za-z0-9.-]+$/.test(config.supabaseUrl)) {
      throw runtimeError("SUPABASE_URL_INVALID");
    }
    const supabaseKey = String(config.supabasePublishableKey);
    if (/service_role|secret/i.test(supabaseKey)) throw runtimeError("SUPABASE_SECRET_KEY_FORBIDDEN");
    const frontendApi = clerkFrontendApi(config.clerkPublishableKey);
    if (config.environment === "production") {
      if (!String(config.clerkPublishableKey).startsWith("pk_live_")) {
        throw runtimeError("PRODUCTION_CLERK_KEY_REQUIRED");
      }
      if (frontendApi.endsWith(".clerk.accounts.dev")) {
        throw runtimeError("PRODUCTION_CLERK_DEV_DOMAIN_FORBIDDEN");
      }
    }
    const country = String(config.defaultCountryCode || "");
    if (country && !/^[A-Z]{2}$/.test(country)) throw runtimeError("DEFAULT_COUNTRY_INVALID");
    return Object.freeze(Object.assign({}, config, { clerkFrontendApi: frontendApi }));
  }

  function loadScript(src, attributes) {
    if (!root.document) return Promise.reject(runtimeError("DOCUMENT_UNAVAILABLE"));
    const existing = root.document.querySelector('script[data-vvip-runtime-src="' + src + '"]');
    if (existing && existing.dataset.loaded === "true") return Promise.resolve(existing);
    return new Promise(function (resolve, reject) {
      const script = existing || root.document.createElement("script");
      script.src = src;
      script.async = false;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.dataset.vvipRuntimeSrc = src;
      Object.keys(attributes || {}).forEach(function (name) {
        script.setAttribute(name, attributes[name]);
      });
      script.addEventListener("load", function () {
        script.dataset.loaded = "true";
        resolve(script);
      }, { once: true });
      script.addEventListener("error", function () {
        reject(runtimeError("RUNTIME_SCRIPT_LOAD_FAILED"));
      }, { once: true });
      if (!existing) root.document.head.appendChild(script);
    });
  }

  async function boot(options) {
    const config = validateConfig((options && options.config) || root.__VVIP_RUNTIME_CONFIG__);
    const load = (options && options.loadScript) || loadScript;
    const clerkOrigin = "https://" + config.clerkFrontendApi;

    await load(clerkOrigin + "/npm/@clerk/ui@1/dist/ui.browser.js");
    await load(clerkOrigin + "/npm/@clerk/clerk-js@6/dist/clerk.browser.js", {
      "data-clerk-publishable-key": config.clerkPublishableKey
    });
    if (!root.Clerk) throw runtimeError("CLERK_RUNTIME_UNAVAILABLE");
    if (!root.__internal_ClerkUICtor) throw runtimeError("CLERK_UI_RUNTIME_UNAVAILABLE");
    await root.Clerk.load({ ui: { ClerkUI: root.__internal_ClerkUICtor } });

    await load("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js");
    if (!root.supabase || typeof root.supabase.createClient !== "function") {
      throw runtimeError("SUPABASE_RUNTIME_UNAVAILABLE");
    }

    const client = root.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
      {
        accessToken: async function () {
          const session = root.Clerk && root.Clerk.session;
          return session && typeof session.getToken === "function"
            ? session.getToken()
            : null;
        },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { "X-VVIP-Source-SHA": String(config.sourceSha || "unknown") } }
      }
    );

    const runtime = Object.freeze({ config: config, clerk: root.Clerk, supabase: client });
    root.VVIP_RUNTIME = runtime;
    root.VVIP_SUPABASE = client;
    root.dispatchEvent(new CustomEvent("vvip:runtime-ready", { detail: { sourceSha: config.sourceSha || "unknown" } }));
    return runtime;
  }

  return Object.freeze({ boot, validateConfig, clerkFrontendApi, decodeBase64Url, runtimeError });
});
