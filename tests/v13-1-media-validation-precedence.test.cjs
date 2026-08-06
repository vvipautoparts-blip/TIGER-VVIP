"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const manifestUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/media/v13-media-manifest.js")
).href;

async function loadManifest() {
  return import(`${manifestUrl}?precedence=${Date.now()}-${Math.random()}`);
}

function baseAsset(overrides = {}) {
  return {
    contract: {
      name: "V13.1_MEDIA_ASSET_MANIFEST",
      version: 1
    },
    assetId: "media_asset_00000001",
    tenantId: "tenant_global_0001",
    listingId: "listing_00000001",
    listingPrincipalId: "principal_00000001",
    countryCode: "JO",
    countrySealVersion: "seal_version_0001",
    ingress: {
      mimeType: "image/webp",
      width: 1600,
      height: 1200,
      sizeBytes: 250000,
      sha256: "a".repeat(64)
    },
    state: "verified",
    manifestRevision: 1,
    createdAt: "2026-08-06T08:00:00.000Z",
    verifiedAt: "2026-08-06T08:01:00.000Z",
    revokedAt: null,
    ...overrides
  };
}

function without(source, key) {
  const copy = { ...source };
  delete copy[key];
  return copy;
}

function assertDenial(result, code) {
  assert.deepEqual(result, { ok: false, code });
  assert.equal(Object.isFrozen(result), true);
}

test("known required country values use deterministic missing-versus-invalid denials", async () => {
  const manifest = await loadManifest();
  const cases = [
    [without(baseAsset(), "countryCode"), "MEDIA_COUNTRY_REQUIRED"],
    [baseAsset({ countryCode: undefined }), "MEDIA_COUNTRY_REQUIRED"],
    [baseAsset({ countryCode: null }), "MEDIA_COUNTRY_REQUIRED"],
    [baseAsset({ countryCode: "" }), "MEDIA_COUNTRY_REQUIRED"],
    [baseAsset({ countryCode: "jo" }), "MEDIA_COUNTRY_INVALID"]
  ];

  for (const [input, code] of cases) {
    assertDenial(manifest.createMediaAssetManifest(input), code);
  }
});

test("known required seal values use one stable required-field denial", async () => {
  const manifest = await loadManifest();
  const cases = [
    without(baseAsset(), "countrySealVersion"),
    baseAsset({ countrySealVersion: undefined }),
    baseAsset({ countrySealVersion: null }),
    baseAsset({ countrySealVersion: "" }),
    baseAsset({ countrySealVersion: "bad" })
  ];

  for (const input of cases) {
    assertDenial(
      manifest.createMediaAssetManifest(input),
      "MEDIA_SEAL_REQUIRED"
    );
  }
});

test("forbidden client fields outrank missing known values without echoing attacker data", async () => {
  const manifest = await loadManifest();
  const input = baseAsset({
    countryCode: undefined,
    secret: "must-never-echo"
  });

  const result = manifest.createMediaAssetManifest(input);
  assertDenial(result, "MEDIA_CLIENT_FIELDS_DENIED");
  assert.equal(JSON.stringify(result).includes("must-never-echo"), false);
});

test("unknown fields remain contract errors even when a known required value is missing", async () => {
  const manifest = await loadManifest();
  assertDenial(
    manifest.createMediaAssetManifest(baseAsset({
      countryCode: undefined,
      unknownField: true
    })),
    "MEDIA_CONTRACT_INVALID"
  );
});

test("unsafe structures keep absolute fail-closed precedence", async () => {
  const manifest = await loadManifest();

  const cycle = baseAsset();
  cycle.self = cycle;
  assertDenial(
    manifest.createMediaAssetManifest(cycle),
    "MEDIA_CONTRACT_INVALID"
  );

  const polluted = JSON.parse(
    '{"contract":{"name":"V13.1_MEDIA_ASSET_MANIFEST","version":1},"__proto__":{"polluted":true}}'
  );
  assertDenial(
    manifest.createMediaAssetManifest(polluted),
    "MEDIA_CONTRACT_INVALID"
  );
  assert.equal({}.polluted, undefined);
});
