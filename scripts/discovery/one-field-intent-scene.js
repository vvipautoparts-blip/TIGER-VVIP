(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.TIGEROneFieldIntentScene = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const INTENT_FRAME_FIELDS = Object.freeze([
    "intentId",
    "intentType",
    "productFamily",
    "audience",
    "constraints",
    "categoryPath",
    "primaryFacets"
  ]);

  const EXPERIENCE_COMPONENT_PROPS = Object.freeze({
    IntentSummary: Object.freeze(["intentId", "summary"]),
    DynamicFacetBar: Object.freeze(["facets"]),
    ListingRail: Object.freeze(["itemIds"]),
    EntityRail: Object.freeze(["entityIds"]),
    EvidenceHint: Object.freeze(["itemId", "reasons"]),
    SponsoredRail: Object.freeze(["itemIds", "label"]),
    ContactHandoff: Object.freeze(["itemId", "channel"])
  });

  const PAID_ORGANIC_DENY_FIELDS = Object.freeze([
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

  function safeString(value, maxLength = 256) {
    return typeof value === "string"
      && value.trim().length > 0
      && value.length <= maxLength
      && !/[<>\u0000-\u001f\u007f]/u.test(value);
  }

  function safeIdentifier(value, prefix) {
    return safeString(value, 128)
      && value.startsWith(prefix)
      && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u.test(value);
  }

  function copyStringList(values, { maxItems = 32, maxLength = 128 } = {}) {
    if (!Array.isArray(values) || values.length > maxItems) {
      throw new TypeError("INVALID_STRING_LIST");
    }
    if (new Set(values).size !== values.length) {
      throw new TypeError("DUPLICATE_STRING_LIST_VALUE");
    }
    if (!values.every((value) => safeString(value, maxLength))) {
      throw new TypeError("INVALID_STRING_LIST_VALUE");
    }
    return [...values];
  }

  function rejectUnknownFields(source, allowed, code) {
    const allowedSet = new Set(allowed);
    if (Object.keys(source).some((key) => !allowedSet.has(key))) {
      throw new TypeError(code);
    }
  }

  function copyIntentFrame(input) {
    if (!plainObject(input)) throw new TypeError("INTENT_FRAME_REQUIRED");
    rejectUnknownFields(input, INTENT_FRAME_FIELDS, "INTENT_FRAME_UNKNOWN_FIELD");

    if (!safeIdentifier(input.intentId, "intent_")) {
      throw new TypeError("INVALID_INTENT_ID");
    }
    if (input.intentType !== "discover") {
      throw new TypeError("INVALID_INTENT_TYPE");
    }
    if (!safeString(input.productFamily, 128)) {
      throw new TypeError("INVALID_PRODUCT_FAMILY");
    }
    if (input.audience !== null && input.audience !== undefined && !safeString(input.audience, 128)) {
      throw new TypeError("INVALID_AUDIENCE");
    }

    return {
      intentId: input.intentId,
      intentType: input.intentType,
      productFamily: input.productFamily,
      audience: input.audience ?? null,
      constraints: copyStringList(input.constraints || [], { maxItems: 32, maxLength: 128 }),
      categoryPath: copyStringList(input.categoryPath || [], { maxItems: 16, maxLength: 128 }),
      primaryFacets: copyStringList(input.primaryFacets || [], { maxItems: 16, maxLength: 128 })
    };
  }

  function validateComponentPropValue(key, value) {
    if (["facets", "itemIds", "entityIds", "reasons"].includes(key)) {
      copyStringList(value, { maxItems: 50, maxLength: 128 });
      return;
    }
    if (["intentId", "itemId"].includes(key)) {
      if (!safeString(value, 128)) throw new TypeError("EXPERIENCE_PROP_INVALID");
      return;
    }
    if (["summary", "label", "channel"].includes(key)) {
      if (!safeString(value, key === "summary" ? 500 : 128)) {
        throw new TypeError("EXPERIENCE_PROP_INVALID");
      }
      return;
    }
    throw new TypeError("EXPERIENCE_PROP_DENIED");
  }

  function copyComponent(component) {
    if (!plainObject(component) || !safeString(component.type, 80)) {
      throw new TypeError("EXPERIENCE_COMPONENT_DENIED");
    }
    rejectUnknownFields(component, ["type", "props"], "EXPERIENCE_COMPONENT_FIELD_DENIED");

    const allowedProps = EXPERIENCE_COMPONENT_PROPS[component.type];
    if (!allowedProps) throw new TypeError("EXPERIENCE_COMPONENT_DENIED");
    if (!plainObject(component.props)) throw new TypeError("EXPERIENCE_PROP_DENIED");

    rejectUnknownFields(component.props, allowedProps, "EXPERIENCE_PROP_DENIED");
    for (const [key, value] of Object.entries(component.props)) {
      validateComponentPropValue(key, value);
    }

    const props = {};
    for (const key of allowedProps) {
      if (!Object.hasOwn(component.props, key)) continue;
      const value = component.props[key];
      props[key] = Array.isArray(value) ? [...value] : value;
    }

    return { type: component.type, props };
  }

  function copyOrganicFit(organicFit) {
    if (!plainObject(organicFit)) throw new TypeError("ORGANIC_FIT_REQUIRED");
    if (Object.keys(organicFit).some((key) => PAID_ORGANIC_DENY_FIELDS.includes(key))) {
      throw new TypeError("ORGANIC_PAID_METADATA_DENIED");
    }
    rejectUnknownFields(organicFit, ["reasons"], "ORGANIC_EVIDENCE_UNKNOWN_FIELD");
    return {
      reasons: copyStringList(organicFit.reasons || [], { maxItems: 20, maxLength: 160 })
    };
  }

  function copyPaidDelivery(paidDelivery) {
    if (!plainObject(paidDelivery)) throw new TypeError("PAID_DELIVERY_REQUIRED");
    rejectUnknownFields(paidDelivery, ["sponsored", "campaignId"], "PAID_DELIVERY_UNKNOWN_FIELD");
    if (typeof paidDelivery.sponsored !== "boolean") {
      throw new TypeError("INVALID_SPONSORED_FLAG");
    }
    if (paidDelivery.campaignId !== null && paidDelivery.campaignId !== undefined
      && !safeIdentifier(paidDelivery.campaignId, "campaign_")) {
      throw new TypeError("INVALID_CAMPAIGN_ID");
    }
    return {
      sponsored: paidDelivery.sponsored,
      campaignId: paidDelivery.campaignId ?? null
    };
  }

  function createIntentFrame(input) {
    return deepFreeze(copyIntentFrame(input));
  }

  function createExperienceManifest(input) {
    if (!plainObject(input)) throw new TypeError("EXPERIENCE_MANIFEST_REQUIRED");
    rejectUnknownFields(input, ["sceneType", "intentId", "components"], "EXPERIENCE_MANIFEST_UNKNOWN_FIELD");
    if (input.sceneType !== "intent_discovery") throw new TypeError("EXPERIENCE_SCENE_DENIED");
    if (!safeIdentifier(input.intentId, "intent_")) throw new TypeError("INVALID_INTENT_ID");
    if (!Array.isArray(input.components) || input.components.length > 32) {
      throw new TypeError("INVALID_EXPERIENCE_COMPONENTS");
    }

    return deepFreeze({
      sceneType: input.sceneType,
      intentId: input.intentId,
      components: input.components.map(copyComponent)
    });
  }

  function createDiscoveryEvidence(input) {
    if (!plainObject(input)) throw new TypeError("DISCOVERY_EVIDENCE_REQUIRED");
    rejectUnknownFields(input, ["itemId", "organicFit", "paidDelivery"], "DISCOVERY_EVIDENCE_UNKNOWN_FIELD");
    if (!safeString(input.itemId, 128)) throw new TypeError("INVALID_DISCOVERY_ITEM_ID");

    return deepFreeze({
      itemId: input.itemId,
      organicFit: copyOrganicFit(input.organicFit),
      paidDelivery: copyPaidDelivery(input.paidDelivery)
    });
  }

  return Object.freeze({
    EXPERIENCE_COMPONENT_PROPS,
    createIntentFrame,
    createExperienceManifest,
    createDiscoveryEvidence
  });
});
