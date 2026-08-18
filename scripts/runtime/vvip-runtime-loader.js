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
  const FORBIDDEN_AD_PLAN_FIELDS = Object.freeze([
    "durationDays",
    "expiresAfterDays",
    "tier",
    "slotCount",
    "visualPriority",
    "featuredPriority",
    "featured",
    "badge",
    "badgeType",
    "rankBoost",
    "searchPriority"
  ]);

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

  function normalizeVisibilityPlans(input, defaultCountryCode) {
    if (input === undefined || input === null) return Object.freeze([]);
    if (!Array.isArray(input)) throw runtimeError("AD_PLANS_INVALID");
    const market = String(defaultCountryCode || "").trim().toUpperCase();

    const plans = input.map(function (candidate) {
      const plan = candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate : null;
      if (!plan) throw runtimeError("AD_PLAN_INVALID");

      for (const field of FORBIDDEN_AD_PLAN_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(plan, field)) {
          throw runtimeError("LEGACY_AD_PLAN_FORBIDDEN");
        }
      }

      const id = String(plan.id || "").trim();
      const productType = String(plan.productType || "").trim();
      const label = String(plan.label || "").trim();
      const description = String(plan.description || "").trim();
      const currency = String(plan.currency || "").trim().toUpperCase();
      const marketCountry = String(plan.marketCountry || "").trim().toUpperCase();
      const pricingVersion = String(plan.pricingVersion || "").trim();
      const lifecyclePolicyId = String(plan.lifecyclePolicyId || "").trim();
      const priceMinor = Number(plan.priceMinor);
      const committedImpressions = Number(plan.committedImpressions);

      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,79}$/.test(id)) throw runtimeError("AD_PLAN_ID_INVALID");
      if (productType !== "distribution-credit") throw runtimeError("LEGACY_AD_PLAN_FORBIDDEN");
      if (!label || label.length > 80) throw runtimeError("AD_PLAN_LABEL_INVALID");
      if (description.length > 160) throw runtimeError("AD_PLAN_DESCRIPTION_INVALID");
      if (!Number.isSafeInteger(priceMinor) || priceMinor <= 0) throw runtimeError("AD_PLAN_PRICE_INVALID");
      if (!/^[A-Z]{3}$/.test(currency)) throw runtimeError("AD_PLAN_CURRENCY_INVALID");
      if (!/^[A-Z]{2}$/.test(marketCountry)) throw runtimeError("AD_PLAN_MARKET_INVALID");
      if (market && marketCountry !== market) throw runtimeError("AD_PLAN_MARKET_MISMATCH");
      if (!Number.isSafeInteger(committedImpressions) || committedImpressions <= 0) {
        throw runtimeError("AD_PLAN_COMMITTED_IMPRESSIONS_INVALID");
      }
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,63}$/.test(pricingVersion)) {
        throw runtimeError("AD_PLAN_PRICING_VERSION_INVALID");
      }
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/.test(lifecyclePolicyId)) {
        throw runtimeError("AD_PLAN_LIFECYCLE_POLICY_INVALID");
      }

      return Object.freeze({
        id: id,
        productType: "distribution-credit",
        label: label,
        description: description,
        priceMinor: priceMinor,
        currency: currency,
        marketCountry: marketCountry,
        committedImpressions: committedImpressions,
        pricingVersion: pricingVersion,
        lifecyclePolicyId: lifecyclePolicyId
      });
    });

    return Object.freeze(plans);
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
    const visibilityPlans = normalizeVisibilityPlans(config.visibilityPlans, country);
    return Object.freeze(Object.assign({}, config, {
      clerkFrontendApi: frontendApi,
      visibilityPlans: visibilityPlans
    }));
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

  return Object.freeze({
    boot,
    validateConfig,
    normalizeVisibilityPlans,
    clerkFrontendApi,
    decodeBase64Url,
    runtimeError
  });
});