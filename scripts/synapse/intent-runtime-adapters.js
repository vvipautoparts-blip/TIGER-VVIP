"use strict";

const { ACTIVATION_MODES, normalizeIntentEnvelope } = require("./intent-domain.js");

function createIntentRuntimeAdapter({ rpc } = {}) {
  if (typeof rpc !== "function") throw new TypeError("intent RPC adapter is required");

  return {
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
  };
}

module.exports = { createIntentRuntimeAdapter };
