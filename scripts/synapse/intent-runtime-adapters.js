(function (root, factory) {
  "use strict";
  const domain = typeof module === "object" && module.exports
    ? require("./intent-domain.js")
    : root && root.TIGERSynapseIntentDomain;
  const api = factory(domain);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.TIGERSynapseIntentRuntime = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function (domain) {
  "use strict";
  if (!domain || !domain.ACTIVATION_MODES || typeof domain.normalizeIntentEnvelope !== "function") {
    throw new Error("TIGER intent domain authority is required");
  }

  const { ACTIVATION_MODES, normalizeIntentEnvelope } = domain;

  function createIntentRuntimeAdapter({ rpc } = {}) {
    if (typeof rpc !== "function") throw new TypeError("intent RPC adapter is required");

    return Object.freeze({
      async create(input, context = {}) {
        const envelope = normalizeIntentEnvelope(input, context);
        if (envelope.activationMode !== ACTIVATION_MODES.LIVE_NETWORK) {
          return { ok: true, localOnly: true, envelope };
        }
        if (context.explicitConfirmation !== true) {
          const error = new Error("explicit confirmation is required");
          error.code = "INTENT_CONFIRMATION_REQUIRED";
          throw error;
        }

        const response = await rpc("vvip_synapse_intent_create", {
          p_direction: envelope.direction,
          p_sector: envelope.sector,
          p_category: envelope.category,
          p_summary: envelope.summary,
          p_required_constraints: envelope.requiredConstraints,
          p_preferences: envelope.preferences,
          p_market_policy: envelope.market,
          p_activation_mode: envelope.activationMode,
          p_visibility_class: envelope.visibilityClass,
          p_expires_at: envelope.expiresAt,
          p_source_provenance: envelope.sourceProvenance,
          p_schema_version: envelope.schemaVersion,
          p_policy_version: envelope.policyVersion,
          p_explicit_confirmation: true,
        });
        if (!response || response.error) return { ok: false, code: "INTENT_CREATE_FAILED" };
        return { ok: true, value: response.data };
      },
    });
  }

  return { createIntentRuntimeAdapter };
});
