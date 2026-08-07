"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/media/v13-media-contracts.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadModule() {
  return import(`${moduleUrl}?media-contracts=${Date.now()}-${Math.random()}`);
}

test("media contracts states purposes limits and errors are exact unique and deeply frozen", async () => {
  const module = await loadModule();

  assert.deepEqual(module.MEDIA_CONTRACTS, {
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

  assert.deepEqual(module.MEDIA_LIMITS, {
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

  assert.deepEqual(module.MEDIA_MIME_TYPES, ["image/jpeg", "image/webp"]);
  assert.deepEqual(module.MEDIA_DERIVATIVE_PURPOSES, {
    hero_4x3: { maxWidth: 1600, maxHeight: 1200 },
    card_4x3: { maxWidth: 800, maxHeight: 600 },
    thumbnail_4x3: { maxWidth: 400, maxHeight: 300 }
  });
  assert.deepEqual(module.MEDIA_ASSET_STATES, [
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
  assert.deepEqual(module.MEDIA_DERIVATIVE_STATES, [
    "staged",
    "verified",
    "active",
    "revoked",
    "purged"
  ]);
  assert.deepEqual(module.MEDIA_BINDING_STATES, [
    "draft",
    "ready",
    "published",
    "detached"
  ]);
  assert.deepEqual(module.MEDIA_DISCLOSURE_CLASSES, [
    "platform_owner",
    "partner_governance",
    "listing_principal",
    "beneficiary",
    "delegated_operations"
  ]);

  assert.deepEqual(Object.values(module.MEDIA_ERROR_CODES), [
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
  ]);

  const derivedCatalogs = [
    Object.keys(module.MEDIA_DERIVATIVE_PURPOSES),
    Object.values(module.MEDIA_ERROR_CODES)
  ];
  for (const catalog of derivedCatalogs) {
    assert.equal(new Set(catalog).size, catalog.length);
  }

  const frozenCatalogs = [
    module.MEDIA_MIME_TYPES,
    module.MEDIA_ASSET_STATES,
    module.MEDIA_DERIVATIVE_STATES,
    module.MEDIA_BINDING_STATES,
    module.MEDIA_DISCLOSURE_CLASSES
  ];
  for (const catalog of frozenCatalogs) {
    assert.equal(new Set(catalog).size, catalog.length);
    assert.equal(Object.isFrozen(catalog), true);
  }

  assert.equal(Object.isFrozen(module.MEDIA_CONTRACTS), true);
  assert.equal(Object.isFrozen(module.MEDIA_CONTRACTS.ASSET), true);
  assert.equal(Object.isFrozen(module.MEDIA_LIMITS), true);
  assert.equal(Object.isFrozen(module.MEDIA_DERIVATIVE_PURPOSES), true);
  assert.equal(Object.isFrozen(module.MEDIA_DERIVATIVE_PURPOSES.card_4x3), true);
  assert.equal(Object.isFrozen(module.MEDIA_ERROR_CODES), true);
});

test("media identifier country hash and opaque reference validators fail closed", async () => {
  const module = await loadModule();

  assert.equal(module.isMediaIdentifier("media_asset_00000001", "media_asset_"), true);
  assert.equal(module.isMediaIdentifier("tenant_global_0001", "tenant_"), true);
  assert.equal(module.isMediaIdentifier("listing_00000001", "listing_"), true);
  assert.equal(module.isMediaIdentifier("principal_00000001", "principal_"), true);
  assert.equal(module.isMediaIdentifier("media_asset_short", "media_asset_"), true);

  for (const value of [
    null,
    undefined,
    "",
    "media_asset_",
    "media_asset_bad space",
    "media_asset_bad/slash",
    "media_asset_bad\\slash",
    "media_asset_bad?query",
    "media_asset_bad#fragment",
    "https://example.invalid/media_asset_00000001",
    "x".repeat(129)
  ]) {
    assert.equal(module.isMediaIdentifier(value, "media_asset_"), false);
  }
  assert.equal(module.isMediaIdentifier("media_asset_00000001", ""), false);
  assert.equal(module.isMediaIdentifier("media_asset_00000001", "derivative_"), false);

  assert.equal(module.isCountryCode("JO"), true);
  assert.equal(module.isCountryCode("US"), true);
  for (const value of [undefined, null, "", "jo", "JOR", "J1", " J"] ) {
    assert.equal(module.isCountryCode(value), false);
  }

  assert.equal(module.isSha256("a".repeat(64)), true);
  assert.equal(module.isSha256("0123456789abcdef".repeat(4)), true);
  for (const value of [
    undefined,
    null,
    "a".repeat(63),
    "a".repeat(65),
    "A".repeat(64),
    "g".repeat(64),
    "0".repeat(63) + "-"
  ]) {
    assert.equal(module.isSha256(value), false);
  }

  assert.equal(module.isOpaqueObjectRef("media_object_ref_00000001"), true);
  assert.equal(module.isOpaqueDeliveryRef("media_delivery_ref_00000001"), true);

  const unsafeReferences = [
    undefined,
    null,
    "",
    "media_object_ref_",
    "media_object_ref_bad/path",
    "media_object_ref_bad\\path",
    "media_object_ref_../path",
    "media_object_ref_00000001?token=x",
    "media_object_ref_00000001#fragment",
    "https://bucket.invalid/object",
    "storage://bucket/object",
    "media object ref",
    "x".repeat(257)
  ];
  for (const value of unsafeReferences) {
    assert.equal(module.isOpaqueObjectRef(value), false);
  }

  for (const value of unsafeReferences.map((entry) => typeof entry === "string"
    ? entry.replace("media_object_ref_", "media_delivery_ref_")
    : entry)) {
    assert.equal(module.isOpaqueDeliveryRef(value), false);
  }
  assert.equal(module.isOpaqueObjectRef("media_delivery_ref_00000001"), false);
  assert.equal(module.isOpaqueDeliveryRef("media_object_ref_00000001"), false);
});

test("media contract source contains no implicit country media expansion or infrastructure surface", async () => {
  await loadModule();
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.doesNotMatch(source, /image\/png|video\//i);
  assert.doesNotMatch(source, /defaultCountry|countryCode\s*[:=]\s*["']JO["']/i);
  assert.doesNotMatch(source,
    /https?:\/\/|supabase\.co|service[_-]?role|postgres(?:ql)?:\/\/|createClient|storage\.from|process\.env|fetch\s*\(/i);
  assert.doesNotMatch(source,
    /window\.|document\.|localStorage|sessionStorage|indexedDB|globalThis\.crypto|Math\.imul|fnv|fallbackHash/i);
});
