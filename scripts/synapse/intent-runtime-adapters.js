"use strict";

const { ACTIVATION_MODES, normalizeIntentEnvelope } = require("./intent-domain.js");

const NON_RETRYABLE_MARKET_GENESIS_CODES = new Set([
  "MARKET_AUTHORITY_INCOMPLETE",
  "INTENT_NOT_MARKET_ELIGIBLE",
  "ACTOR_AUTHORITY_MISMATCH",
  "STALE_INTENT_REVISION",
  "POLICY_VERSION_MISMATCH",
  "SECTOR_AUTHORITY_MISMATCH",
  "MARKET_GENESIS_REQUEST_INVALID",
]);

function marketGenesisFailure(error) {
  const code = error && typeof error.code === "string" && error.code.length > 0
    ? error.code
    : "MARKET_GENESIS_DISPATCH_FAILED";

  return {
    ok: false,
    code,
    retryable: !NON_RETRYABLE_MARKET_GENESIS_CODES.has(code),
  };
}

function createIntentRuntimeAdapter({ rpc, marketGenesisBridge } = {}) {
  if (typeof rpc !== "function") throw new TypeError("intent RPC adapter is required");
  if (marketGenesisBridge != null && typeof marketGenesisBridge.dispatchConfirmedIntent !== "function") {
    throw new TypeError("Market Genesis bridge must expose dispatchConfirmedIntent()");
  }

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

      if (!marketGenesisBridge) {
        return { ok: true, value: response.data };
      }

      let marketGenesis;
      try {
        marketGenesis = await marketGenesisBridge.dispatchConfirmedIntent(
          response.data,
          context.marketGenesisAuthority,
        );
      } catch (error) {
        // Persistence already succeeded. Do not misreport a durable SYNAPSE intent
        // as failed or encourage duplicate creation retries because a downstream
        // Market Genesis compilation step is temporarily unavailable.
        marketGenesis = marketGenesisFailure(error);
      }

      return { ok: true, value: response.data, marketGenesis };
    },
  };
}

module.exports = { createIntentRuntimeAdapter };
