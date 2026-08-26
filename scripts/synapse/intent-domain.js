(function (root, factory) {
  "use strict";
  const api = factory(root && root.crypto, typeof require === "function" ? require : null);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.TIGERSynapseIntentDomain = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function (browserCrypto, nodeRequire) {
  "use strict";

  let cryptoApi = browserCrypto || null;
  if ((!cryptoApi || typeof cryptoApi.randomUUID !== "function") && nodeRequire) {
    try { cryptoApi = nodeRequire("node:crypto"); } catch (_) { cryptoApi = null; }
  }

  const ACTIVATION_MODES = Object.freeze({
    PRIVATE_LOCAL: "PRIVATE_LOCAL",
    ASSISTED: "ASSISTED",
    LIVE_NETWORK: "LIVE_NETWORK",
  });

  const INTENT_STATUSES = Object.freeze({
    DRAFT_LOCAL: "DRAFT_LOCAL",
    CONFIRMED: "CONFIRMED",
    MATCHING: "MATCHING",
    ACTIVE: "ACTIVE",
    PAUSED: "PAUSED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
    EXPIRED: "EXPIRED",
  });

  const TERMINAL_STATUSES = new Set([
    INTENT_STATUSES.REJECTED,
    INTENT_STATUSES.CANCELLED,
    INTENT_STATUSES.EXPIRED,
  ]);

  const ALLOWED_TRANSITIONS = Object.freeze({
    DRAFT_LOCAL: new Set(["CONFIRMED"]),
    CONFIRMED: new Set(["MATCHING", "REJECTED", "CANCELLED"]),
    MATCHING: new Set(["ACTIVE", "REJECTED", "CANCELLED"]),
    ACTIVE: new Set(["PAUSED", "CANCELLED", "EXPIRED"]),
    PAUSED: new Set(["ACTIVE", "CANCELLED", "EXPIRED"]),
  });

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
  }

  function boundedObject(value, code, maxBytes = 6000) {
    if (value === undefined) return {};
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, "intent object must be a JSON object");
    let encoded;
    try { encoded = JSON.stringify(value); } catch (_) { fail(code, "intent object is not serializable"); }
    if (encoded.length > maxBytes) fail(code, "intent object exceeds its bounded size");
    return JSON.parse(encoded);
  }

  function validDate(value, code) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) fail(code, "invalid intent timestamp");
    return date;
  }

  function secureRandomUUID() {
    if (!cryptoApi || typeof cryptoApi.randomUUID !== "function") {
      fail("INTENT_UUID_UNAVAILABLE", "cryptographic randomUUID is required");
    }
    return cryptoApi.randomUUID();
  }

  function normalizeIntentEnvelope(input = {}, context = {}) {
    const actorSubject = String(context.actorSubject || "");
    if (!/^user_[A-Za-z0-9._:-]{1,160}$/.test(actorSubject)) fail("INTENT_ACTOR_REQUIRED", "trusted actor subject is required");

    const direction = input.direction;
    if (direction !== "NEED" && direction !== "OFFER") fail("INTENT_DIRECTION_INVALID", "intent direction is invalid");

    const activationMode = input.activationMode;
    if (!Object.values(ACTIVATION_MODES).includes(activationMode)) fail("INTENT_MODE_INVALID", "intent activation mode is invalid");

    const sector = String(input.sector || "").trim();
    const category = String(input.category || "").trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(sector)) fail("INTENT_SECTOR_INVALID", "intent sector is invalid");
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(category)) fail("INTENT_CATEGORY_INVALID", "intent category is invalid");

    const summary = String(input.summary || "").trim();
    if (summary.length < 1 || summary.length > 500) fail("INTENT_SUMMARY_INVALID", "intent summary is outside the bounded range");

    const now = context.now instanceof Date ? new Date(context.now) : validDate(context.now || new Date(), "INTENT_NOW_INVALID");
    const expiresAt = validDate(input.expiresAt, "INTENT_EXPIRY_INVALID");
    if (expiresAt <= now || expiresAt.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000) fail("INTENT_EXPIRY_INVALID", "intent expiry must be future and at most 30 days");

    const sourceProvenance = input.sourceProvenance;
    if (!["USER_DECLARED", "ASSISTED_DRAFT", "SOCIAL_ACTION"].includes(sourceProvenance)) fail("INTENT_PROVENANCE_INVALID", "intent source provenance is invalid");

    const envelope = {
      intentId: String(input.intentId || secureRandomUUID()),
      actorSubject,
      direction,
      sector,
      category,
      summary,
      requiredConstraints: boundedObject(input.requiredConstraints, "INTENT_CONSTRAINTS_INVALID"),
      preferences: boundedObject(input.preferences, "INTENT_PREFERENCES_INVALID"),
      market: boundedObject(input.market, "INTENT_MARKET_INVALID", 2000),
      activationMode,
      visibilityClass: activationMode === ACTIVATION_MODES.PRIVATE_LOCAL ? "PRIVATE_LOCAL" : String(input.visibilityClass || "MATCHING_NETWORK"),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: INTENT_STATUSES.DRAFT_LOCAL,
      sourceProvenance,
      schemaVersion: String(context.schemaVersion || "S1"),
      policyVersion: String(context.policyVersion || "SYNAPSE-S1"),
      revision: 0,
    };
    return deepFreeze(envelope);
  }

  function transitionIntent(intent, targetStatus, context = {}) {
    if (!intent || typeof intent !== "object") fail("INTENT_INVALID", "intent envelope is required");
    if (!Object.values(INTENT_STATUSES).includes(targetStatus)) fail("INTENT_STATUS_INVALID", "intent target status is invalid");
    if (TERMINAL_STATUSES.has(intent.status)) fail("INTENT_TERMINAL", "terminal intent cannot transition");
    if (!ALLOWED_TRANSITIONS[intent.status]?.has(targetStatus)) fail("INTENT_TRANSITION_INVALID", "intent transition is not allowed");

    const now = context.now instanceof Date ? new Date(context.now) : validDate(context.now || new Date(), "INTENT_NOW_INVALID");
    if (targetStatus === INTENT_STATUSES.CONFIRMED && context.explicitConfirmation !== true) fail("INTENT_CONFIRMATION_REQUIRED", "explicit confirmation is required");
    if (targetStatus === INTENT_STATUSES.MATCHING && context.authenticated !== true) fail("INTENT_AUTH_REQUIRED", "authenticated activation is required");
    if (targetStatus === INTENT_STATUSES.ACTIVE && context.policyAdmitted !== true) fail("INTENT_POLICY_REQUIRED", "policy admission is required");
    if (targetStatus === INTENT_STATUSES.EXPIRED && now < new Date(intent.expiresAt)) fail("INTENT_NOT_EXPIRED", "intent expiry has not been reached");

    return deepFreeze({
      ...intent,
      status: targetStatus,
      updatedAt: now.toISOString(),
      revision: intent.revision + 1,
    });
  }

  return {
    ACTIVATION_MODES,
    INTENT_STATUSES,
    normalizeIntentEnvelope,
    transitionIntent,
  };
});
