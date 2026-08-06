function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

const frozen = (values) => Object.freeze([...values]);

export const MEDIA_CONTRACTS = deepFreeze({
  ASSET: {
    name: "V13.1_MEDIA_ASSET_MANIFEST",
    version: 1
  },
  DERIVATIVE: {
    name: "V13.1_MEDIA_DERIVATIVE_MANIFEST",
    version: 1
  },
  BINDING: {
    name: "V13.1_LISTING_MEDIA_BINDING",
    version: 1
  },
  CARD: {
    name: "V13.1_MEDIA_FIRST_LISTING_CARD",
    version: 1
  }
});

export const MEDIA_LIMITS = Object.freeze({
  MAX_LISTING_MEDIA: 7,
  MAX_INGRESS_BYTES: 15 * 1024 * 1024,
  MAX_INGRESS_WIDTH: 1600,
  MAX_INGRESS_HEIGHT: 1200,
  MAX_ALT_TEXT: 140,
  MAX_CARD_BYTES: 2048,
  MAX_PAGE_ITEMS: 50,
  MAX_PAGE_BYTES: 128 * 1024,
  MAX_DELIVERY_TTL_MS: 300_000,
  IDENTIFIER: 128,
  OPAQUE_REF: 256
});

export const MEDIA_MIME_TYPES = frozen([
  "image/jpeg",
  "image/webp"
]);

export const MEDIA_DERIVATIVE_PURPOSES = deepFreeze({
  hero_4x3: {
    maxWidth: 1600,
    maxHeight: 1200
  },
  card_4x3: {
    maxWidth: 800,
    maxHeight: 600
  },
  thumbnail_4x3: {
    maxWidth: 400,
    maxHeight: 300
  }
});

export const MEDIA_ASSET_STATES = frozen([
  "reserved",
  "quarantined",
  "verified",
  "processed",
  "attached",
  "published",
  "rejected",
  "revoked",
  "purged"
]);

export const MEDIA_DERIVATIVE_STATES = frozen([
  "staged",
  "verified",
  "active",
  "revoked",
  "purged"
]);

export const MEDIA_BINDING_STATES = frozen([
  "draft",
  "ready",
  "published",
  "detached"
]);

export const MEDIA_DISCLOSURE_CLASSES = frozen([
  "platform_owner",
  "partner_governance",
  "listing_principal",
  "beneficiary",
  "delegated_operations"
]);

const mediaErrorValues = [
  "MEDIA_CONTRACT_INVALID",
  "MEDIA_CLIENT_FIELDS_DENIED",
  "MEDIA_IDENTIFIER_INVALID",
  "MEDIA_COUNTRY_REQUIRED",
  "MEDIA_COUNTRY_INVALID",
  "MEDIA_SEAL_REQUIRED",
  "MEDIA_MIME_INVALID",
  "MEDIA_DIMENSIONS_INVALID",
  "MEDIA_BYTES_INVALID",
  "MEDIA_HASH_INVALID",
  "MEDIA_STATE_INVALID",
  "MEDIA_TIMESTAMP_INVALID",
  "MEDIA_REVISION_INVALID",
  "MEDIA_OBJECT_REF_INVALID",
  "MEDIA_DERIVATIVE_PURPOSE_INVALID",
  "MEDIA_BINDING_INVALID",
  "MEDIA_BINDING_SET_INVALID",
  "MEDIA_BINDING_LIMIT_EXCEEDED",
  "MEDIA_BINDING_ORDER_INVALID",
  "MEDIA_BINDING_COVER_INVALID",
  "MEDIA_BINDING_ASSET_MISMATCH",
  "MEDIA_ASSET_STATE_DENIED",
  "MEDIA_DELIVERY_INVALID",
  "MEDIA_DELIVERY_EXPIRED",
  "MEDIA_CARD_INVALID",
  "MEDIA_CARD_TOO_LARGE"
];

export const MEDIA_ERROR_CODES = Object.freeze(
  Object.fromEntries(mediaErrorValues.map((code) => [code, code]))
);

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const opaquePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export function isMediaIdentifier(value, prefix) {
  return typeof value === "string"
    && typeof prefix === "string"
    && prefix.length > 0
    && value.length > prefix.length
    && value.length <= MEDIA_LIMITS.IDENTIFIER
    && value.startsWith(prefix)
    && identifierPattern.test(value);
}

export function isCountryCode(value) {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}

export function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isOpaqueRef(value, prefix) {
  return typeof value === "string"
    && value.length > prefix.length
    && value.length <= MEDIA_LIMITS.OPAQUE_REF
    && value.startsWith(prefix)
    && opaquePattern.test(value);
}

export function isOpaqueObjectRef(value) {
  return isOpaqueRef(value, "media_object_ref_");
}

export function isOpaqueDeliveryRef(value) {
  return isOpaqueRef(value, "media_delivery_ref_");
}
