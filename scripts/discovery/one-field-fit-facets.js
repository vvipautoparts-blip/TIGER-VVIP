"use strict";

const MAX_PRIMARY_FACETS = 8;

const DENIED_FACETS = new Set([
  "secret_rank",
  "seller_commission",
  "commission",
  "sponsored",
  "campaign_id",
  "paid_rank",
  "budget",
  "bid",
  "delivery_priority"
]);

const FIT_REASON_MAP = Object.freeze({
  productFamily: "matches_product_family",
  noAddedSugar: "matches_no_added_sugar",
  geography: "matches_requested_geography",
  personaKind: "matches_eligible_persona_kind",
  condition: "matches_requested_condition",
  availability: "matches_availability",
  freshness: "matches_freshness",
  trust: "matches_trust_requirement"
});

const PAID_FIT_FIELDS = new Set([
  "sponsored",
  "campaignId",
  "paidRank",
  "budget",
  "bid",
  "deliveryPriority"
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function plainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeFacetName(value) {
  return typeof value === "string"
    && /^[a-z][a-z0-9_]{0,63}$/u.test(value);
}

function safeString(value, maxLength = 128) {
  return typeof value === "string"
    && value.trim().length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

function copyFacetList(values, code, maxItems = 128) {
  if (!Array.isArray(values) || values.length > maxItems || new Set(values).size !== values.length) {
    throw new TypeError(code);
  }
  if (!values.every(safeFacetName)) throw new TypeError(code);
  return [...values];
}

function hasObservedValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function facetObserved(facet, capsules) {
  for (const capsule of capsules) {
    if (!plainObject(capsule)) throw new TypeError("FACET_CAPSULE_INVALID");

    if (facet === "condition" && hasObservedValue(capsule.conditionState)) {
      return true;
    }
    if (facet === "location" && plainObject(capsule.geoContext)
      && Object.keys(capsule.geoContext).some((key) => hasObservedValue(capsule.geoContext[key]))) {
      return true;
    }
    if (plainObject(capsule.structuredAttributes)
      && Object.hasOwn(capsule.structuredAttributes, facet)
      && hasObservedValue(capsule.structuredAttributes[facet])) {
      return true;
    }
  }
  return false;
}

function generateFacets(input) {
  if (!plainObject(input)) throw new TypeError("FACET_INPUT_REQUIRED");
  const allowed = new Set(["intent", "capsules", "facetSchema"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new TypeError("FACET_INPUT_UNKNOWN_FIELD");
  }
  if (!plainObject(input.intent)) throw new TypeError("FACET_INTENT_REQUIRED");
  if (!Array.isArray(input.capsules) || input.capsules.length > 500) {
    throw new TypeError("FACET_CAPSULES_INVALID");
  }

  const requested = copyFacetList(input.intent.primaryFacets || [], "FACET_INTENT_INVALID", 32);
  const schema = new Set(copyFacetList(input.facetSchema || [], "FACET_SCHEMA_INVALID", 128));
  const selected = [];

  for (const facet of requested) {
    if (selected.length >= MAX_PRIMARY_FACETS) break;
    if (!schema.has(facet) || DENIED_FACETS.has(facet)) continue;
    if (!facetObserved(facet, input.capsules)) continue;
    selected.push(facet);
  }

  return deepFreeze(selected);
}

function createFitExplanation(input) {
  if (!plainObject(input)) throw new TypeError("FIT_EXPLANATION_REQUIRED");
  const allowed = new Set(["itemId", "matchedEvidence"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new TypeError("FIT_EXPLANATION_UNKNOWN_FIELD");
  }
  if (!safeString(input.itemId, 128)) throw new TypeError("FIT_ITEM_ID_INVALID");
  if (!plainObject(input.matchedEvidence)) throw new TypeError("FIT_EVIDENCE_REQUIRED");

  for (const field of Object.keys(input.matchedEvidence)) {
    if (PAID_FIT_FIELDS.has(field) || !Object.hasOwn(FIT_REASON_MAP, field)) {
      throw new TypeError("FIT_EVIDENCE_DENIED");
    }
    if (typeof input.matchedEvidence[field] !== "boolean") {
      throw new TypeError("FIT_EVIDENCE_INVALID");
    }
  }

  const reasons = [];
  for (const [field, reason] of Object.entries(FIT_REASON_MAP)) {
    if (input.matchedEvidence[field] === true) reasons.push(reason);
  }

  return deepFreeze({
    itemId: input.itemId,
    reasons
  });
}

module.exports = Object.freeze({
  MAX_PRIMARY_FACETS,
  generateFacets,
  createFitExplanation
});
