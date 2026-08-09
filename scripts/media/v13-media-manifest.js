import {
  MEDIA_ASSET_STATES,
  MEDIA_BINDING_STATES,
  MEDIA_CONTRACTS,
  MEDIA_DERIVATIVE_PURPOSES,
  MEDIA_DERIVATIVE_STATES,
  MEDIA_LIMITS,
  MEDIA_MIME_TYPES,
  isCountryCode,
  isMediaIdentifier,
  isOpaqueObjectRef,
  isSha256
} from "./v13-media-contracts.js";

const POLLUTION_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const CLIENT_CONTROLLED_KEYS = new Set([
  "filename",
  "exif",
  "url",
  "bucket",
  "path",
  "token",
  "session",
  "envelope",
  "secret",
  "authorityClass",
  "legalEntityCountry",
  "dataResidencyRegion",
  "objectRef",
  "deliveryRef"
]);
const ASSET_KEYS = new Set([
  "contract",
  "assetId",
  "tenantId",
  "listingId",
  "listingPrincipalId",
  "countryCode",
  "countrySealVersion",
  "ingress",
  "state",
  "manifestRevision",
  "createdAt",
  "verifiedAt",
  "revokedAt"
]);
const INGRESS_KEYS = new Set([
  "mimeType",
  "width",
  "height",
  "sizeBytes",
  "sha256"
]);
const DERIVATIVE_KEYS = new Set([
  "contract",
  "derivativeId",
  "assetId",
  "purpose",
  "mimeType",
  "width",
  "height",
  "sizeBytes",
  "sha256",
  "objectRef",
  "storageRevision",
  "state",
  "createdAt"
]);
const BINDING_KEYS = new Set([
  "contract",
  "bindingId",
  "tenantId",
  "listingId",
  "assetId",
  "position",
  "isCover",
  "altText",
  "state",
  "bindingRevision",
  "createdAt",
  "updatedAt"
]);
const BINDING_SET_KEYS = new Set(["assets", "bindings"]);
const VERIFIED_ASSET_STATES = new Set([
  "verified",
  "processed",
  "attached",
  "published",
  "revoked"
]);
const PRE_VERIFICATION_ASSET_STATES = new Set([
  "reserved",
  "quarantined",
  "rejected"
]);
const BINDING_ASSET_STATES = Object.freeze({
  draft: new Set(["processed", "attached"]),
  ready: new Set(["processed", "attached"]),
  published: new Set(["published"]),
  detached: new Set(["attached", "published", "revoked"])
});

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function success(value) {
  return Object.freeze({
    ok: true,
    code: "MEDIA_MANIFEST_VALID",
    value: deepFreeze(value)
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertSafeStructure(value, seen = new Set(), depth = 0, counter = { entries: 0 }) {
  if (depth > 12) throw new TypeError("STRUCTURE_INVALID");
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("STRUCTURE_INVALID");
    return;
  }
  if (typeof value === "undefined") return;
  if (typeof value === "function"
    || typeof value === "symbol"
    || typeof value === "bigint") {
    throw new TypeError("STRUCTURE_INVALID");
  }
  if (seen.has(value)) throw new TypeError("STRUCTURE_INVALID");
  if (Array.isArray(value)) {
    if (value.length > 100) throw new TypeError("STRUCTURE_INVALID");
    seen.add(value);
    for (const item of value) assertSafeStructure(item, seen, depth + 1, counter);
    seen.delete(value);
    return;
  }
  if (!isPlainObject(value)) throw new TypeError("STRUCTURE_INVALID");
  const keys = Object.keys(value);
  counter.entries += keys.length;
  if (keys.length > 100 || counter.entries > 500) throw new TypeError("STRUCTURE_INVALID");
  seen.add(value);
  for (const key of keys) {
    if (POLLUTION_KEYS.has(key)) throw new TypeError("STRUCTURE_INVALID");
    assertSafeStructure(value[key], seen, depth + 1, counter);
  }
  seen.delete(value);
}

function shapeError(value, allowed) {
  if (!isPlainObject(value)) return "MEDIA_CONTRACT_INVALID";
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      return CLIENT_CONTROLLED_KEYS.has(key)
        ? "MEDIA_CLIENT_FIELDS_DENIED"
        : "MEDIA_CONTRACT_INVALID";
    }
  }
  return null;
}

function contractMatches(value, expected) {
  return isPlainObject(value)
    && Object.keys(value).length === 2
    && value.name === expected.name
    && value.version === expected.version;
}

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function iso(value) {
  return new Date(Date.parse(value)).toISOString();
}

function validRevision(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function validBytes(value) {
  return Number.isSafeInteger(value)
    && value > 0
    && value <= MEDIA_LIMITS.MAX_INGRESS_BYTES;
}

function validDimensions(width, height, maxWidth, maxHeight) {
  return Number.isSafeInteger(width)
    && Number.isSafeInteger(height)
    && width > 0
    && height > 0
    && width <= maxWidth
    && height <= maxHeight
    && width * 3 === height * 4;
}

function validateAssetTimes(input) {
  if (!validTimestamp(input.createdAt)) return null;
  const created = Date.parse(input.createdAt);
  const verified = input.verifiedAt === null ? null : Date.parse(input.verifiedAt);
  const revoked = input.revokedAt === null ? null : Date.parse(input.revokedAt);

  if (input.verifiedAt !== null && !Number.isFinite(verified)) return null;
  if (input.revokedAt !== null && !Number.isFinite(revoked)) return null;
  if (verified !== null && verified < created) return null;
  if (revoked !== null && revoked < created) return null;

  if (PRE_VERIFICATION_ASSET_STATES.has(input.state)) {
    if (verified !== null || revoked !== null) return null;
  } else if (VERIFIED_ASSET_STATES.has(input.state)) {
    if (verified === null) return null;
    if (input.state === "revoked") {
      if (revoked === null || revoked < verified) return null;
    } else if (revoked !== null) {
      return null;
    }
  } else if (input.state === "purged") {
    if (revoked === null || (verified !== null && revoked < verified)) return null;
  }

  return Object.freeze({
    createdAt: iso(input.createdAt),
    verifiedAt: input.verifiedAt === null ? null : iso(input.verifiedAt),
    revokedAt: input.revokedAt === null ? null : iso(input.revokedAt)
  });
}

function sanitizeAltText(value) {
  if (typeof value !== "string") return null;
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F-\u009F<>]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return normalized.length > 0 && normalized.length <= MEDIA_LIMITS.MAX_ALT_TEXT
    ? normalized
    : null;
}

export function createMediaAssetManifest(input) {
  try {
    assertSafeStructure(input);
  } catch {
    return fail("MEDIA_CONTRACT_INVALID");
  }

  const topError = shapeError(input, ASSET_KEYS);
  if (topError) return fail(topError);
  const ingressError = shapeError(input.ingress, INGRESS_KEYS);
  if (ingressError) return fail(ingressError);
  if (!contractMatches(input.contract, MEDIA_CONTRACTS.ASSET)) {
    return fail("MEDIA_CONTRACT_INVALID");
  }
  if (!isMediaIdentifier(input.assetId, "media_asset_")
    || !isMediaIdentifier(input.tenantId, "tenant_")
    || !isMediaIdentifier(input.listingId, "listing_")
    || !isMediaIdentifier(input.listingPrincipalId, "principal_")) {
    return fail("MEDIA_IDENTIFIER_INVALID");
  }
  if (input.countryCode === undefined || input.countryCode === null || input.countryCode === "") {
    return fail("MEDIA_COUNTRY_REQUIRED");
  }
  if (!isCountryCode(input.countryCode)) return fail("MEDIA_COUNTRY_INVALID");
  if (!isMediaIdentifier(input.countrySealVersion, "seal_")) {
    return fail("MEDIA_SEAL_REQUIRED");
  }
  if (!MEDIA_MIME_TYPES.includes(input.ingress.mimeType)) return fail("MEDIA_MIME_INVALID");
  if (!validDimensions(
    input.ingress.width,
    input.ingress.height,
    MEDIA_LIMITS.MAX_INGRESS_WIDTH,
    MEDIA_LIMITS.MAX_INGRESS_HEIGHT
  )) {
    return fail("MEDIA_DIMENSIONS_INVALID");
  }
  if (!validBytes(input.ingress.sizeBytes)) return fail("MEDIA_BYTES_INVALID");
  if (!isSha256(input.ingress.sha256)) return fail("MEDIA_HASH_INVALID");
  if (!MEDIA_ASSET_STATES.includes(input.state)) return fail("MEDIA_STATE_INVALID");
  if (!validRevision(input.manifestRevision)) return fail("MEDIA_REVISION_INVALID");
  const times = validateAssetTimes(input);
  if (!times) return fail("MEDIA_TIMESTAMP_INVALID");

  return success({
    contract: {
      name: MEDIA_CONTRACTS.ASSET.name,
      version: MEDIA_CONTRACTS.ASSET.version
    },
    assetId: input.assetId,
    tenantId: input.tenantId,
    listingId: input.listingId,
    listingPrincipalId: input.listingPrincipalId,
    countryCode: input.countryCode,
    countrySealVersion: input.countrySealVersion,
    ingress: {
      mimeType: input.ingress.mimeType,
      width: input.ingress.width,
      height: input.ingress.height,
      sizeBytes: input.ingress.sizeBytes,
      sha256: input.ingress.sha256
    },
    state: input.state,
    manifestRevision: input.manifestRevision,
    createdAt: times.createdAt,
    verifiedAt: times.verifiedAt,
    revokedAt: times.revokedAt
  });
}

export function createMediaDerivativeManifest(input) {
  try {
    assertSafeStructure(input);
  } catch {
    return fail("MEDIA_CONTRACT_INVALID");
  }

  const topError = shapeError(input, DERIVATIVE_KEYS);
  if (topError) return fail(topError);
  if (!contractMatches(input.contract, MEDIA_CONTRACTS.DERIVATIVE)) {
    return fail("MEDIA_CONTRACT_INVALID");
  }
  if (!isMediaIdentifier(input.derivativeId, "media_derivative_")
    || !isMediaIdentifier(input.assetId, "media_asset_")) {
    return fail("MEDIA_IDENTIFIER_INVALID");
  }
  const purpose = MEDIA_DERIVATIVE_PURPOSES[input.purpose];
  if (!purpose) return fail("MEDIA_DERIVATIVE_PURPOSE_INVALID");
  if (!MEDIA_MIME_TYPES.includes(input.mimeType)) return fail("MEDIA_MIME_INVALID");
  if (!validDimensions(input.width, input.height, purpose.maxWidth, purpose.maxHeight)) {
    return fail("MEDIA_DIMENSIONS_INVALID");
  }
  if (!validBytes(input.sizeBytes)) return fail("MEDIA_BYTES_INVALID");
  if (!isSha256(input.sha256)) return fail("MEDIA_HASH_INVALID");
  if (!isOpaqueObjectRef(input.objectRef)) return fail("MEDIA_OBJECT_REF_INVALID");
  if (!validRevision(input.storageRevision)) return fail("MEDIA_REVISION_INVALID");
  if (!MEDIA_DERIVATIVE_STATES.includes(input.state)) return fail("MEDIA_STATE_INVALID");
  if (!validTimestamp(input.createdAt)) return fail("MEDIA_TIMESTAMP_INVALID");

  return success({
    contract: {
      name: MEDIA_CONTRACTS.DERIVATIVE.name,
      version: MEDIA_CONTRACTS.DERIVATIVE.version
    },
    derivativeId: input.derivativeId,
    assetId: input.assetId,
    purpose: input.purpose,
    mimeType: input.mimeType,
    width: input.width,
    height: input.height,
    sizeBytes: input.sizeBytes,
    sha256: input.sha256,
    objectRef: input.objectRef,
    storageRevision: input.storageRevision,
    state: input.state,
    createdAt: iso(input.createdAt)
  });
}

export function createListingMediaBinding(input) {
  try {
    assertSafeStructure(input);
  } catch {
    return fail("MEDIA_CONTRACT_INVALID");
  }

  const topError = shapeError(input, BINDING_KEYS);
  if (topError) return fail(topError);
  if (!contractMatches(input.contract, MEDIA_CONTRACTS.BINDING)) {
    return fail("MEDIA_CONTRACT_INVALID");
  }
  if (!isMediaIdentifier(input.bindingId, "media_binding_")
    || !isMediaIdentifier(input.tenantId, "tenant_")
    || !isMediaIdentifier(input.listingId, "listing_")
    || !isMediaIdentifier(input.assetId, "media_asset_")) {
    return fail("MEDIA_IDENTIFIER_INVALID");
  }
  if (!Number.isSafeInteger(input.position)
    || input.position < 0
    || input.position >= MEDIA_LIMITS.MAX_LISTING_MEDIA
    || typeof input.isCover !== "boolean") {
    return fail("MEDIA_BINDING_INVALID");
  }
  const altText = sanitizeAltText(input.altText);
  if (!altText) return fail("MEDIA_BINDING_INVALID");
  if (!MEDIA_BINDING_STATES.includes(input.state)) return fail("MEDIA_STATE_INVALID");
  if (!validRevision(input.bindingRevision)) return fail("MEDIA_REVISION_INVALID");
  if (!validTimestamp(input.createdAt) || !validTimestamp(input.updatedAt)) {
    return fail("MEDIA_TIMESTAMP_INVALID");
  }
  const created = Date.parse(input.createdAt);
  const updated = Date.parse(input.updatedAt);
  if (updated < created) return fail("MEDIA_TIMESTAMP_INVALID");

  return success({
    contract: {
      name: MEDIA_CONTRACTS.BINDING.name,
      version: MEDIA_CONTRACTS.BINDING.version
    },
    bindingId: input.bindingId,
    tenantId: input.tenantId,
    listingId: input.listingId,
    assetId: input.assetId,
    position: input.position,
    isCover: input.isCover,
    altText,
    state: input.state,
    bindingRevision: input.bindingRevision,
    createdAt: iso(input.createdAt),
    updatedAt: iso(input.updatedAt)
  });
}

export function validateListingMediaBindingSet(input) {
  try {
    assertSafeStructure(input);
  } catch {
    return fail("MEDIA_BINDING_SET_INVALID");
  }
  if (shapeError(input, BINDING_SET_KEYS)
    || !Array.isArray(input.assets)
    || !Array.isArray(input.bindings)) {
    return fail("MEDIA_BINDING_SET_INVALID");
  }
  if (input.assets.length > MEDIA_LIMITS.MAX_LISTING_MEDIA
    || input.bindings.length > MEDIA_LIMITS.MAX_LISTING_MEDIA) {
    return fail("MEDIA_BINDING_LIMIT_EXCEEDED");
  }
  if (input.assets.length !== input.bindings.length) {
    return fail("MEDIA_BINDING_ASSET_MISMATCH");
  }

  const assets = [];
  for (const item of input.assets) {
    const result = createMediaAssetManifest(item);
    if (!result.ok) return result;
    assets.push(result.value);
  }
  const bindings = [];
  for (const item of input.bindings) {
    const result = createListingMediaBinding(item);
    if (!result.ok) return result;
    bindings.push(result.value);
  }

  if (assets.length === 0) return success({ assets: [], bindings: [] });

  const sortedBindings = [...bindings].sort((left, right) => left.position - right.position);
  const positions = sortedBindings.map((binding) => binding.position);
  if (new Set(positions).size !== positions.length
    || positions.some((position, index) => position !== index)) {
    return fail("MEDIA_BINDING_ORDER_INVALID");
  }
  if (sortedBindings.filter((binding) => binding.isCover).length !== 1) {
    return fail("MEDIA_BINDING_COVER_INVALID");
  }

  const assetIds = assets.map((asset) => asset.assetId);
  const bindingAssetIds = sortedBindings.map((binding) => binding.assetId);
  if (new Set(assetIds).size !== assetIds.length
    || new Set(bindingAssetIds).size !== bindingAssetIds.length) {
    return fail("MEDIA_BINDING_ASSET_MISMATCH");
  }
  const assetById = new Map(assets.map((asset) => [asset.assetId, asset]));
  for (const binding of sortedBindings) {
    const asset = assetById.get(binding.assetId);
    if (!asset
      || asset.tenantId !== binding.tenantId
      || asset.listingId !== binding.listingId) {
      return fail("MEDIA_BINDING_ASSET_MISMATCH");
    }
    const allowedStates = BINDING_ASSET_STATES[binding.state];
    if (!allowedStates || !allowedStates.has(asset.state)) {
      return fail("MEDIA_ASSET_STATE_DENIED");
    }
  }

  const countries = new Set(assets.map((asset) => asset.countryCode));
  const sealVersions = new Set(assets.map((asset) => asset.countrySealVersion));
  const tenants = new Set(assets.map((asset) => asset.tenantId));
  const listings = new Set(assets.map((asset) => asset.listingId));
  if (countries.size !== 1
    || sealVersions.size !== 1
    || tenants.size !== 1
    || listings.size !== 1) {
    return fail("MEDIA_BINDING_ASSET_MISMATCH");
  }

  return success({
    assets: Object.freeze([...assets]),
    bindings: Object.freeze(sortedBindings)
  });
}
