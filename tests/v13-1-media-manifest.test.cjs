"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const manifestPath = path.resolve(
  __dirname,
  "../scripts/media/v13-media-manifest.js"
);
const contractsPath = path.resolve(
  __dirname,
  "../scripts/media/v13-media-contracts.js"
);
const manifestUrl = pathToFileURL(manifestPath).href;
const contractsUrl = pathToFileURL(contractsPath).href;

async function loadModules() {
  const nonce = `${Date.now()}-${Math.random()}`;
  const [manifest, contracts] = await Promise.all([
    import(`${manifestUrl}?manifest=${nonce}`),
    import(`${contractsUrl}?manifest-contracts=${nonce}`)
  ]);
  return { manifest, contracts };
}

function assetInput(overrides = {}) {
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
      sizeBytes: 250_000,
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

function derivativeInput(overrides = {}) {
  return {
    contract: {
      name: "V13.1_MEDIA_DERIVATIVE_MANIFEST",
      version: 1
    },
    derivativeId: "media_derivative_00000001",
    assetId: "media_asset_00000001",
    purpose: "card_4x3",
    mimeType: "image/webp",
    width: 800,
    height: 600,
    sizeBytes: 120_000,
    sha256: "b".repeat(64),
    objectRef: "media_object_ref_00000001",
    storageRevision: 1,
    state: "active",
    createdAt: "2026-08-06T08:02:00.000Z",
    ...overrides
  };
}

function bindingInput(index = 0, overrides = {}) {
  return {
    contract: {
      name: "V13.1_LISTING_MEDIA_BINDING",
      version: 1
    },
    bindingId: `media_binding_0000000${index + 1}`,
    tenantId: "tenant_global_0001",
    listingId: "listing_00000001",
    assetId: `media_asset_0000000${index + 1}`,
    position: index,
    isCover: index === 0,
    altText: index === 0 ? "  واجهة\u0000   المنتج  " : `صورة المنتج ${index + 1}`,
    state: "published",
    bindingRevision: 1,
    createdAt: "2026-08-06T08:03:00.000Z",
    updatedAt: "2026-08-06T08:04:00.000Z",
    ...overrides
  };
}

function publishedAsset(index = 0, overrides = {}) {
  return assetInput({
    assetId: `media_asset_0000000${index + 1}`,
    state: "published",
    ...overrides
  });
}

function assertFailure(result, code) {
  assert.deepEqual(result, { ok: false, code });
  assert.equal(Object.isFrozen(result), true);
}

test("valid media asset manifest is normalized allowlisted and deeply frozen", async () => {
  const { manifest } = await loadModules();
  const result = manifest.createMediaAssetManifest(assetInput());

  assert.equal(result.ok, true);
  assert.equal(result.code, "MEDIA_MANIFEST_VALID");
  assert.deepEqual(result.value, assetInput());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.contract), true);
  assert.equal(Object.isFrozen(result.value.ingress), true);

  const input = assetInput();
  const created = manifest.createMediaAssetManifest(input);
  input.ingress.sha256 = "f".repeat(64);
  input.countryCode = "US";
  assert.equal(created.value.ingress.sha256, "a".repeat(64));
  assert.equal(created.value.countryCode, "JO");
});

test("asset manifest requires explicit country seal safe ingress exact hash and valid lifecycle", async () => {
  const { manifest } = await loadModules();
  const cases = [
    [assetInput({ countryCode: undefined }), "MEDIA_COUNTRY_REQUIRED"],
    [assetInput({ countryCode: "jo" }), "MEDIA_COUNTRY_INVALID"],
    [assetInput({ countrySealVersion: undefined }), "MEDIA_SEAL_REQUIRED"],
    [assetInput({ countrySealVersion: "bad" }), "MEDIA_SEAL_REQUIRED"],
    [assetInput({ ingress: { ...assetInput().ingress, mimeType: "image/png" } }), "MEDIA_MIME_INVALID"],
    [assetInput({ ingress: { ...assetInput().ingress, mimeType: "video/mp4" } }), "MEDIA_MIME_INVALID"],
    [assetInput({ ingress: { ...assetInput().ingress, width: 1200, height: 1200 } }), "MEDIA_DIMENSIONS_INVALID"],
    [assetInput({ ingress: { ...assetInput().ingress, width: 1601 } }), "MEDIA_DIMENSIONS_INVALID"],
    [assetInput({ ingress: { ...assetInput().ingress, height: 1201 } }), "MEDIA_DIMENSIONS_INVALID"],
    [assetInput({ ingress: { ...assetInput().ingress, width: 0 } }), "MEDIA_DIMENSIONS_INVALID"],
    [assetInput({ ingress: { ...assetInput().ingress, sizeBytes: 0 } }), "MEDIA_BYTES_INVALID"],
    [assetInput({ ingress: { ...assetInput().ingress, sizeBytes: 15 * 1024 * 1024 + 1 } }), "MEDIA_BYTES_INVALID"],
    [assetInput({ ingress: { ...assetInput().ingress, sha256: "A".repeat(64) } }), "MEDIA_HASH_INVALID"],
    [assetInput({ ingress: { ...assetInput().ingress, sha256: "a".repeat(63) } }), "MEDIA_HASH_INVALID"],
    [assetInput({ state: "unknown" }), "MEDIA_STATE_INVALID"],
    [assetInput({ manifestRevision: 0 }), "MEDIA_REVISION_INVALID"],
    [assetInput({ manifestRevision: 1.5 }), "MEDIA_REVISION_INVALID"],
    [assetInput({ createdAt: "bad" }), "MEDIA_TIMESTAMP_INVALID"],
    [assetInput({ verifiedAt: null }), "MEDIA_TIMESTAMP_INVALID"],
    [assetInput({ verifiedAt: "2026-08-06T07:59:59.000Z" }), "MEDIA_TIMESTAMP_INVALID"],
    [assetInput({ revokedAt: "2026-08-06T08:02:00.000Z" }), "MEDIA_TIMESTAMP_INVALID"],
    [assetInput({ contract: { name: "WRONG", version: 1 } }), "MEDIA_CONTRACT_INVALID"],
    [assetInput({ assetId: "asset_00000001" }), "MEDIA_IDENTIFIER_INVALID"],
    [assetInput({ tenantId: "global_0001" }), "MEDIA_IDENTIFIER_INVALID"],
    [assetInput({ listingId: "item_00000001" }), "MEDIA_IDENTIFIER_INVALID"],
    [assetInput({ listingPrincipalId: "user_00000001" }), "MEDIA_IDENTIFIER_INVALID"]
  ];

  for (const [input, code] of cases) {
    assertFailure(manifest.createMediaAssetManifest(input), code);
  }

  const stateCases = [
    [assetInput({ state: "reserved", verifiedAt: null }), true],
    [assetInput({ state: "quarantined", verifiedAt: null }), true],
    [assetInput({ state: "processed" }), true],
    [assetInput({ state: "attached" }), true],
    [assetInput({ state: "published" }), true],
    [assetInput({ state: "revoked", revokedAt: "2026-08-06T08:02:00.000Z" }), true],
    [assetInput({ state: "purged", revokedAt: "2026-08-06T08:02:00.000Z" }), true],
    [assetInput({ state: "revoked", revokedAt: null }), false],
    [assetInput({ state: "published", revokedAt: "2026-08-06T08:02:00.000Z" }), false]
  ];
  for (const [input, valid] of stateCases) {
    assert.equal(manifest.createMediaAssetManifest(input).ok, valid);
  }
});

test("client-controlled sensitive fields and unsafe structures are rejected without echo", async () => {
  const { manifest } = await loadModules();
  const forbidden = [
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
    "dataResidencyRegion"
  ];

  for (const key of forbidden) {
    const input = assetInput({ [key]: "hidden-value" });
    assertFailure(manifest.createMediaAssetManifest(input), "MEDIA_CLIENT_FIELDS_DENIED");

    const nested = assetInput({
      ingress: {
        ...assetInput().ingress,
        [key]: "hidden-value"
      }
    });
    assertFailure(manifest.createMediaAssetManifest(nested), "MEDIA_CLIENT_FIELDS_DENIED");
  }

  assertFailure(
    manifest.createMediaAssetManifest(assetInput({ unknownField: true })),
    "MEDIA_CONTRACT_INVALID"
  );
  assertFailure(
    manifest.createMediaAssetManifest(assetInput({
      ingress: { ...assetInput().ingress, unknownField: true }
    })),
    "MEDIA_CONTRACT_INVALID"
  );

  const cycle = assetInput();
  cycle.self = cycle;
  assertFailure(manifest.createMediaAssetManifest(cycle), "MEDIA_CONTRACT_INVALID");

  const custom = Object.create({ inherited: true });
  Object.assign(custom, assetInput());
  assertFailure(manifest.createMediaAssetManifest(custom), "MEDIA_CONTRACT_INVALID");

  for (const bad of [null, [], new Date(), () => {}, Symbol("bad"), 1n]) {
    assertFailure(manifest.createMediaAssetManifest(bad), "MEDIA_CONTRACT_INVALID");
  }

  const polluted = JSON.parse('{"contract":{"name":"V13.1_MEDIA_ASSET_MANIFEST","version":1},"__proto__":{"polluted":true}}');
  assertFailure(manifest.createMediaAssetManifest(polluted), "MEDIA_CONTRACT_INVALID");
  assert.equal({}.polluted, undefined);
});

test("valid derivative manifest enforces purpose dimensions hash opaque object reference and revision", async () => {
  const { manifest } = await loadModules();
  const result = manifest.createMediaDerivativeManifest(derivativeInput());

  assert.equal(result.ok, true);
  assert.equal(result.code, "MEDIA_MANIFEST_VALID");
  assert.deepEqual(result.value, derivativeInput());
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.contract), true);

  const validPurposes = [
    derivativeInput({ purpose: "hero_4x3", width: 1600, height: 1200 }),
    derivativeInput({ purpose: "card_4x3", width: 800, height: 600 }),
    derivativeInput({ purpose: "thumbnail_4x3", width: 400, height: 300 })
  ];
  for (const input of validPurposes) {
    assert.equal(manifest.createMediaDerivativeManifest(input).ok, true);
  }

  const cases = [
    [derivativeInput({ purpose: "unknown" }), "MEDIA_DERIVATIVE_PURPOSE_INVALID"],
    [derivativeInput({ width: 801 }), "MEDIA_DIMENSIONS_INVALID"],
    [derivativeInput({ width: 800, height: 601 }), "MEDIA_DIMENSIONS_INVALID"],
    [derivativeInput({ width: 0 }), "MEDIA_DIMENSIONS_INVALID"],
    [derivativeInput({ mimeType: "image/png" }), "MEDIA_MIME_INVALID"],
    [derivativeInput({ sizeBytes: 0 }), "MEDIA_BYTES_INVALID"],
    [derivativeInput({ sizeBytes: 15 * 1024 * 1024 + 1 }), "MEDIA_BYTES_INVALID"],
    [derivativeInput({ sha256: "B".repeat(64) }), "MEDIA_HASH_INVALID"],
    [derivativeInput({ objectRef: "https://bucket.invalid/object" }), "MEDIA_OBJECT_REF_INVALID"],
    [derivativeInput({ objectRef: "media_object_ref_bad/path" }), "MEDIA_OBJECT_REF_INVALID"],
    [derivativeInput({ objectRef: "media_object_ref_../path" }), "MEDIA_OBJECT_REF_INVALID"],
    [derivativeInput({ objectRef: "media_object_ref_0001?token=x" }), "MEDIA_OBJECT_REF_INVALID"],
    [derivativeInput({ storageRevision: 0 }), "MEDIA_REVISION_INVALID"],
    [derivativeInput({ state: "published" }), "MEDIA_STATE_INVALID"],
    [derivativeInput({ createdAt: "bad" }), "MEDIA_TIMESTAMP_INVALID"],
    [derivativeInput({ contract: { name: "WRONG", version: 1 } }), "MEDIA_CONTRACT_INVALID"],
    [derivativeInput({ derivativeId: "derivative_00000001" }), "MEDIA_IDENTIFIER_INVALID"],
    [derivativeInput({ assetId: "asset_00000001" }), "MEDIA_IDENTIFIER_INVALID"],
    [derivativeInput({ unknown: true }), "MEDIA_CONTRACT_INVALID"]
  ];
  for (const [input, code] of cases) {
    assertFailure(manifest.createMediaDerivativeManifest(input), code);
  }
});

test("listing media binding normalizes safe alt text and rejects invalid identity order state and fields", async () => {
  const { manifest } = await loadModules();
  const result = manifest.createListingMediaBinding(bindingInput());

  assert.equal(result.ok, true);
  assert.equal(result.code, "MEDIA_MANIFEST_VALID");
  assert.equal(result.value.altText, "واجهة المنتج");
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.contract), true);

  const compatibility = "Ａ".repeat(2);
  const normalized = manifest.createListingMediaBinding(bindingInput(0, {
    altText: `  ${compatibility}   <b> صورة </b>  `
  }));
  assert.equal(normalized.ok, true);
  assert.equal(normalized.value.altText, "AA b صورة /b");

  const cases = [
    [bindingInput(0, { position: -1 }), "MEDIA_BINDING_INVALID"],
    [bindingInput(0, { position: 7 }), "MEDIA_BINDING_INVALID"],
    [bindingInput(0, { isCover: "yes" }), "MEDIA_BINDING_INVALID"],
    [bindingInput(0, { altText: "" }), "MEDIA_BINDING_INVALID"],
    [bindingInput(0, { altText: "x".repeat(141) }), "MEDIA_BINDING_INVALID"],
    [bindingInput(0, { state: "active" }), "MEDIA_STATE_INVALID"],
    [bindingInput(0, { bindingRevision: 0 }), "MEDIA_REVISION_INVALID"],
    [bindingInput(0, { createdAt: "bad" }), "MEDIA_TIMESTAMP_INVALID"],
    [bindingInput(0, { updatedAt: "2026-08-06T07:59:00.000Z" }), "MEDIA_TIMESTAMP_INVALID"],
    [bindingInput(0, { bindingId: "binding_00000001" }), "MEDIA_IDENTIFIER_INVALID"],
    [bindingInput(0, { assetId: "asset_00000001" }), "MEDIA_IDENTIFIER_INVALID"],
    [bindingInput(0, { unknown: true }), "MEDIA_CONTRACT_INVALID"],
    [bindingInput(0, { objectRef: "media_object_ref_00000001" }), "MEDIA_CLIENT_FIELDS_DENIED"]
  ];
  for (const [input, code] of cases) {
    assertFailure(manifest.createListingMediaBinding(input), code);
  }
});

test("binding set accepts zero through seven ordered assets with exactly one cover", async () => {
  const { manifest } = await loadModules();

  const empty = manifest.validateListingMediaBindingSet({ assets: [], bindings: [] });
  assert.equal(empty.ok, true);
  assert.deepEqual(empty.value, { assets: [], bindings: [] });
  assert.equal(Object.isFrozen(empty.value.assets), true);
  assert.equal(Object.isFrozen(empty.value.bindings), true);

  for (let count = 1; count <= 7; count += 1) {
    const assets = Array.from({ length: count }, (_, index) => publishedAsset(index));
    const bindings = Array.from({ length: count }, (_, index) => bindingInput(index));
    const result = manifest.validateListingMediaBindingSet({ assets, bindings });
    assert.equal(result.ok, true, `count ${count} should be valid`);
    assert.equal(result.code, "MEDIA_MANIFEST_VALID");
    assert.equal(result.value.assets.length, count);
    assert.equal(result.value.bindings.length, count);
    assert.deepEqual(result.value.bindings.map((binding) => binding.position),
      Array.from({ length: count }, (_, index) => index));
    assert.equal(result.value.bindings.filter((binding) => binding.isCover).length, 1);
    assert.equal(Object.isFrozen(result.value), true);
    assert.equal(Object.isFrozen(result.value.assets), true);
    assert.equal(Object.isFrozen(result.value.bindings), true);
  }

  const unordered = manifest.validateListingMediaBindingSet({
    assets: [publishedAsset(0), publishedAsset(1)],
    bindings: [bindingInput(1), bindingInput(0)]
  });
  assert.equal(unordered.ok, true);
  assert.deepEqual(unordered.value.bindings.map((binding) => binding.position), [0, 1]);
});

test("binding set rejects limit order cover identity tenant listing and asset-state mismatches", async () => {
  const { manifest } = await loadModules();

  const eightAssets = Array.from({ length: 8 }, (_, index) => publishedAsset(index));
  const eightBindings = Array.from({ length: 8 }, (_, index) => bindingInput(index));
  assertFailure(
    manifest.validateListingMediaBindingSet({ assets: eightAssets, bindings: eightBindings }),
    "MEDIA_BINDING_LIMIT_EXCEEDED"
  );

  const cases = [
    {
      value: {
        assets: [publishedAsset(0), publishedAsset(1)],
        bindings: [bindingInput(0), bindingInput(1, { position: 2 })]
      },
      code: "MEDIA_BINDING_ORDER_INVALID"
    },
    {
      value: {
        assets: [publishedAsset(0), publishedAsset(1)],
        bindings: [bindingInput(0), bindingInput(1, { position: 0 })]
      },
      code: "MEDIA_BINDING_ORDER_INVALID"
    },
    {
      value: {
        assets: [publishedAsset(0), publishedAsset(1)],
        bindings: [bindingInput(0, { isCover: false }), bindingInput(1)]
      },
      code: "MEDIA_BINDING_COVER_INVALID"
    },
    {
      value: {
        assets: [publishedAsset(0), publishedAsset(1)],
        bindings: [bindingInput(0), bindingInput(1, { isCover: true })]
      },
      code: "MEDIA_BINDING_COVER_INVALID"
    },
    {
      value: {
        assets: [publishedAsset(0), publishedAsset(1)],
        bindings: [bindingInput(0), bindingInput(1, { assetId: "media_asset_00000001" })]
      },
      code: "MEDIA_BINDING_ASSET_MISMATCH"
    },
    {
      value: {
        assets: [publishedAsset(0)],
        bindings: [bindingInput(0, { assetId: "media_asset_99999999" })]
      },
      code: "MEDIA_BINDING_ASSET_MISMATCH"
    },
    {
      value: {
        assets: [publishedAsset(0, { tenantId: "tenant_other_0001" })],
        bindings: [bindingInput(0)]
      },
      code: "MEDIA_BINDING_ASSET_MISMATCH"
    },
    {
      value: {
        assets: [publishedAsset(0, { listingId: "listing_other_0001" })],
        bindings: [bindingInput(0)]
      },
      code: "MEDIA_BINDING_ASSET_MISMATCH"
    },
    {
      value: {
        assets: [publishedAsset(0, { state: "processed" })],
        bindings: [bindingInput(0)]
      },
      code: "MEDIA_ASSET_STATE_DENIED"
    },
    {
      value: {
        assets: [assetInput({ state: "processed" })],
        bindings: [bindingInput(0, { state: "ready" })]
      },
      valid: true
    },
    {
      value: {
        assets: [assetInput({ state: "attached" })],
        bindings: [bindingInput(0, { state: "draft" })]
      },
      valid: true
    },
    {
      value: {
        assets: [assetInput({ state: "verified" })],
        bindings: [bindingInput(0, { state: "ready" })]
      },
      code: "MEDIA_ASSET_STATE_DENIED"
    }
  ];

  for (const entry of cases) {
    const result = manifest.validateListingMediaBindingSet(entry.value);
    if (entry.valid) {
      assert.equal(result.ok, true);
    } else {
      assertFailure(result, entry.code);
    }
  }

  assertFailure(
    manifest.validateListingMediaBindingSet({ assets: [], bindings: [bindingInput(0)] }),
    "MEDIA_BINDING_ASSET_MISMATCH"
  );
  assertFailure(
    manifest.validateListingMediaBindingSet({ assets: [publishedAsset(0)], bindings: [] }),
    "MEDIA_BINDING_ASSET_MISMATCH"
  );
  assertFailure(
    manifest.validateListingMediaBindingSet({ assets: "bad", bindings: [] }),
    "MEDIA_BINDING_SET_INVALID"
  );
  assertFailure(
    manifest.validateListingMediaBindingSet({ assets: [], bindings: [], unknown: true }),
    "MEDIA_BINDING_SET_INVALID"
  );
});

test("media manifest module remains pure infrastructure-free and never contains default country", async () => {
  await loadModules();
  const source = fs.readFileSync(manifestPath, "utf8");

  assert.doesNotMatch(source,
    /https?:\/\/|supabase\.co|service[_-]?role|postgres(?:ql)?:\/\/|createClient|storage\.from|process\.env|fetch\s*\(/i);
  assert.doesNotMatch(source,
    /window\.|document\.|localStorage|sessionStorage|indexedDB|globalThis\.crypto|Math\.imul|fnv|fallbackHash/i);
  assert.doesNotMatch(source, /defaultCountry|countryCode\s*[:=]\s*["']JO["']/i);
  assert.doesNotMatch(source, /image\/png|video\//i);
});
