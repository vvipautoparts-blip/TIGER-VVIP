"use strict";

const CAPSULE_FIELDS = Object.freeze([
  "capsuleId",
  "sourceObjectId",
  "sourceObjectType",
  "canonicalConcepts",
  "aliases",
  "structuredAttributes",
  "relations",
  "multimodalRepresentations",
  "personaId",
  "domainViews",
  "conditionState",
  "geoContext",
  "timeFreshness",
  "availabilitySignal",
  "evidenceRefs",
  "trustProjection",
  "countryPolicyContext"
]);

const SOURCE_ID_PREFIX = Object.freeze({
  post: "post_",
  listing: "listing_",
  entity: "entity_"
});

const UNSAFE_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "token",
  "secret",
  "password",
  "servicerole",
  "authorization",
  "apikey",
  "privatekey"
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

function safeString(value, maxLength = 512) {
  return typeof value === "string"
    && value.trim().length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

function stableId(value, prefix) {
  return safeString(value, 128)
    && value.startsWith(prefix)
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/u.test(value);
}

function assertId(value, prefix) {
  if (!stableId(value, prefix)) {
    throw new TypeError("SEMANTIC_CAPSULE_INVALID_ID");
  }
}

function copyUniqueStringList(values, {
  prefix = null,
  maxItems = 64,
  maxLength = 256
} = {}) {
  if (!Array.isArray(values) || values.length > maxItems) {
    throw new TypeError("SEMANTIC_CAPSULE_INVALID_LIST");
  }
  if (new Set(values).size !== values.length) {
    throw new TypeError("SEMANTIC_CAPSULE_DUPLICATE_VALUE");
  }
  for (const value of values) {
    if (prefix) assertId(value, prefix);
    else if (!safeString(value, maxLength)) {
      throw new TypeError("SEMANTIC_CAPSULE_INVALID_VALUE");
    }
  }
  return [...values];
}

function normalizedKey(key) {
  return String(key).replace(/[^A-Za-z0-9_]/g, "").toLowerCase();
}

function assertSafeKey(key) {
  const normalized = normalizedKey(key);
  if (UNSAFE_KEYS.has(key) || UNSAFE_KEYS.has(normalized)) {
    throw new TypeError("SEMANTIC_CAPSULE_UNSAFE_DATA");
  }
}

function copySafeData(value, depth = 0) {
  if (depth > 6) throw new TypeError("SEMANTIC_CAPSULE_UNSAFE_DATA");

  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("SEMANTIC_CAPSULE_UNSAFE_DATA");
    return value;
  }
  if (typeof value === "string") {
    if (!safeString(value, 2048)) throw new TypeError("SEMANTIC_CAPSULE_UNSAFE_DATA");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 64) throw new TypeError("SEMANTIC_CAPSULE_UNSAFE_DATA");
    return value.map((entry) => copySafeData(entry, depth + 1));
  }
  if (!plainObject(value)) throw new TypeError("SEMANTIC_CAPSULE_UNSAFE_DATA");

  const keys = Object.keys(value);
  if (keys.length > 64) throw new TypeError("SEMANTIC_CAPSULE_UNSAFE_DATA");

  const copy = {};
  for (const key of keys) {
    assertSafeKey(key);
    copy[key] = copySafeData(value[key], depth + 1);
  }
  return copy;
}

function copyOptionalSafeObject(value) {
  if (value === null || value === undefined) return null;
  if (!plainObject(value)) throw new TypeError("SEMANTIC_CAPSULE_UNSAFE_DATA");
  return copySafeData(value);
}

function rejectUnknownFields(input) {
  const allowed = new Set(CAPSULE_FIELDS);
  if (Object.keys(input).some((field) => !allowed.has(field))) {
    throw new TypeError("SEMANTIC_CAPSULE_UNKNOWN_FIELD");
  }
}

function createSemanticCapsule(input) {
  if (!plainObject(input)) throw new TypeError("SEMANTIC_CAPSULE_REQUIRED");
  rejectUnknownFields(input);

  assertId(input.capsuleId, "capsule_");

  const sourcePrefix = SOURCE_ID_PREFIX[input.sourceObjectType];
  if (!sourcePrefix) throw new TypeError("SEMANTIC_CAPSULE_SOURCE_TYPE_DENIED");
  assertId(input.sourceObjectId, sourcePrefix);
  assertId(input.personaId, "persona_");

  if (!safeString(input.conditionState, 128)) {
    throw new TypeError("SEMANTIC_CAPSULE_INVALID_VALUE");
  }
  if (!safeString(input.availabilitySignal, 128)) {
    throw new TypeError("SEMANTIC_CAPSULE_INVALID_VALUE");
  }

  const capsule = {
    capsuleId: input.capsuleId,
    sourceObjectId: input.sourceObjectId,
    sourceObjectType: input.sourceObjectType,
    canonicalConcepts: copyUniqueStringList(input.canonicalConcepts, { prefix: "cpt_" }),
    aliases: copyUniqueStringList(input.aliases, { maxItems: 64, maxLength: 512 }),
    structuredAttributes: copySafeData(input.structuredAttributes),
    relations: copyUniqueStringList(input.relations, { prefix: "rel_" }),
    multimodalRepresentations: copyUniqueStringList(input.multimodalRepresentations, { prefix: "media_" }),
    personaId: input.personaId,
    domainViews: copyUniqueStringList(input.domainViews, { prefix: "view_" }),
    conditionState: input.conditionState,
    geoContext: copyOptionalSafeObject(input.geoContext),
    timeFreshness: copyOptionalSafeObject(input.timeFreshness),
    availabilitySignal: input.availabilitySignal,
    evidenceRefs: copyUniqueStringList(input.evidenceRefs, { prefix: "evidence_" }),
    trustProjection: copyOptionalSafeObject(input.trustProjection),
    countryPolicyContext: copyOptionalSafeObject(input.countryPolicyContext)
  };

  return deepFreeze(capsule);
}

module.exports = Object.freeze({
  CAPSULE_FIELDS,
  createSemanticCapsule
});
