"use strict";

const ORGANIC_SIGNAL_NAMES = Object.freeze([
  "lexical",
  "semantic",
  "structured",
  "graph",
  "geo",
  "time",
  "trust",
  "policy",
  "availability"
]);

const PAID_SIGNAL_FIELDS = new Set([
  "sponsored",
  "campaignId",
  "budget",
  "bid",
  "paidRank",
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

function safeString(value, maxLength = 128) {
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

function copyRequiredConcepts(values) {
  if (!Array.isArray(values) || values.length > 32 || new Set(values).size !== values.length) {
    throw new TypeError("HYBRID_RETRIEVAL_INVALID_INTENT");
  }
  if (!values.every((value) => stableId(value, "cpt_"))) {
    throw new TypeError("HYBRID_RETRIEVAL_INVALID_INTENT");
  }
  return [...values];
}

function safeConstraintValue(value) {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return safeString(value, 256);
}

function copyRequiredAttributes(value) {
  if (!plainObject(value) || Object.keys(value).length > 32) {
    throw new TypeError("HYBRID_RETRIEVAL_INVALID_INTENT");
  }
  const copy = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(key) || !safeConstraintValue(entry)) {
      throw new TypeError("HYBRID_RETRIEVAL_INVALID_INTENT");
    }
    copy[key] = entry;
  }
  return copy;
}

function copyIntent(intent) {
  if (!plainObject(intent)) throw new TypeError("HYBRID_RETRIEVAL_INVALID_INTENT");
  const allowed = new Set(["requiredConcepts", "requiredAttributes", "countryCode"]);
  if (Object.keys(intent).some((key) => !allowed.has(key))) {
    throw new TypeError("HYBRID_RETRIEVAL_INVALID_INTENT");
  }

  const countryCode = intent.countryCode ?? null;
  if (countryCode !== null && !/^[A-Z]{2}$/u.test(countryCode)) {
    throw new TypeError("HYBRID_RETRIEVAL_INVALID_INTENT");
  }

  return {
    requiredConcepts: copyRequiredConcepts(intent.requiredConcepts || []),
    requiredAttributes: copyRequiredAttributes(intent.requiredAttributes || {}),
    countryCode
  };
}

function validateCapsule(capsule) {
  if (!plainObject(capsule)
    || !stableId(capsule.capsuleId, "capsule_")
    || !safeString(capsule.sourceObjectId, 128)
    || !Array.isArray(capsule.canonicalConcepts)
    || !plainObject(capsule.structuredAttributes)) {
    throw new TypeError("HYBRID_RETRIEVAL_INVALID_CAPSULE");
  }
  return capsule;
}

function valuesEqual(actual, required) {
  return Object.is(actual, required);
}

function matchesHardConstraints(intent, capsule) {
  if (!intent.requiredConcepts.every((concept) => capsule.canonicalConcepts.includes(concept))) {
    return false;
  }

  for (const [key, required] of Object.entries(intent.requiredAttributes)) {
    if (!Object.hasOwn(capsule.structuredAttributes, key)
      || !valuesEqual(capsule.structuredAttributes[key], required)) {
      return false;
    }
  }

  if (intent.countryCode !== null) {
    if (!plainObject(capsule.countryPolicyContext)
      || capsule.countryPolicyContext.countryCode !== intent.countryCode) {
      return false;
    }
  }

  return true;
}

function copySignalEvidence(signalEnvelope) {
  if (!plainObject(signalEnvelope)) {
    throw new TypeError("HYBRID_RETRIEVAL_INVALID_SIGNALS");
  }

  for (const field of Object.keys(signalEnvelope)) {
    if (PAID_SIGNAL_FIELDS.has(field)) {
      throw new TypeError("HYBRID_RETRIEVAL_PAID_SIGNAL_DENIED");
    }
    if (!ORGANIC_SIGNAL_NAMES.includes(field)) {
      throw new TypeError("HYBRID_RETRIEVAL_SIGNAL_DENIED");
    }
  }

  const evidence = {};
  for (const field of ORGANIC_SIGNAL_NAMES) {
    if (!Object.hasOwn(signalEnvelope, field)) continue;
    const value = signalEnvelope[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new TypeError("HYBRID_RETRIEVAL_INVALID_SIGNAL_VALUE");
    }
    evidence[field] = value;
  }
  return evidence;
}

function referenceFusionScore(signalEvidence) {
  let total = 0;
  for (const field of ORGANIC_SIGNAL_NAMES) {
    if (Object.hasOwn(signalEvidence, field)) total += signalEvidence[field];
  }
  return total;
}

function retrieveCandidates(input) {
  if (!plainObject(input)) throw new TypeError("HYBRID_RETRIEVAL_INPUT_REQUIRED");
  const allowed = new Set(["intent", "capsules", "signals"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new TypeError("HYBRID_RETRIEVAL_UNKNOWN_FIELD");
  }

  const intent = copyIntent(input.intent);
  if (!Array.isArray(input.capsules) || input.capsules.length > 500) {
    throw new TypeError("HYBRID_RETRIEVAL_INVALID_CAPSULES");
  }
  if (!plainObject(input.signals)) {
    throw new TypeError("HYBRID_RETRIEVAL_INVALID_SIGNALS");
  }

  const seenCapsules = new Set();
  const ranked = [];

  for (const rawCapsule of input.capsules) {
    const capsule = validateCapsule(rawCapsule);
    if (seenCapsules.has(capsule.capsuleId)) {
      throw new TypeError("HYBRID_RETRIEVAL_DUPLICATE_CAPSULE");
    }
    seenCapsules.add(capsule.capsuleId);

    const signalEvidence = copySignalEvidence(input.signals[capsule.capsuleId] || {});
    if (!matchesHardConstraints(intent, capsule)) continue;

    ranked.push({
      capsuleId: capsule.capsuleId,
      sourceObjectId: capsule.sourceObjectId,
      signalEvidence,
      _referenceScore: referenceFusionScore(signalEvidence)
    });
  }

  ranked.sort((left, right) => {
    if (right._referenceScore !== left._referenceScore) {
      return right._referenceScore - left._referenceScore;
    }
    return left.sourceObjectId.localeCompare(right.sourceObjectId, "en");
  });

  const items = ranked.map(({ _referenceScore, ...item }) => item);
  return deepFreeze({
    rankingVersion: "one_field_reference_v1",
    items
  });
}

module.exports = Object.freeze({
  ORGANIC_SIGNAL_NAMES,
  retrieveCandidates
});
