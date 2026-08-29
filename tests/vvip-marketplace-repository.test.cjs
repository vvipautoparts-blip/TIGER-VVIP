"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const repo = require("../scripts/runtime/vvip-marketplace-repository.js");

const LISTING_ID = "11111111-1111-4111-8111-111111111111";
const MEDIA_ID = "22222222-2222-4222-8222-222222222222";
const TOKEN = "a".repeat(64);
const RAW_PATH = "user_owner/" + LISTING_ID + "/" + MEDIA_ID + ".jpg";

function thenableQuery(result) {
  const query = {
    select() { return query; },
    eq() { return query; },
    order() { return query; },
    limit() { return query; },
    ilike() { return query; },
    delete() { return query; },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }
  };
  return query;
}

function mutationClient() {
  const calls = { buckets: [], uploads: [], removes: [], rpc: [], deletedListings: [], mediaInserts: [] };

  const client = {
    from(table) {
      if (table === "vvip_marketplace_listings") {
        return {
          insert() {
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({ data: { listing_id: LISTING_ID, active_market_country: "JO", sector: "automotive" } });
                  }
                };
              }
            };
          },
          delete() {
            return {
              eq(column, value) {
                calls.deletedListings.push([column, value]);
                return Promise.resolve({ data: null });
              }
            };
          }
        };
      }
      if (table === "vvip_marketplace_listing_media") {
        return {
          insert(payload) {
            calls.mediaInserts.push(payload);
            return Promise.resolve({ data: null, error: null });
          }
        };
      }
      throw new Error("unexpected table: " + table);
    },
    storage: {
      from(bucket) {
        calls.buckets.push(bucket);
        return {
          upload(path) {
            calls.uploads.push(path);
            return Promise.resolve({ data: { path } });
          },
          remove(paths) {
            calls.removes.push(paths.slice());
            return Promise.resolve({ data: paths });
          }
        };
      }
    },
    rpc(name, args) {
      calls.rpc.push([name, args]);
      if (name === "vvip_marketplace_request_media_finalization") {
        return Promise.resolve({ data: { media_id: MEDIA_ID, finalization_token: TOKEN } });
      }
      throw new Error("unexpected rpc: " + name);
    }
  };

  return { client, calls };
}

test("normalizes a global listing draft without hard-coded country or currency", () => {
  const value = repo.normalizeDraft({
    sector: "automotive",
    title: "  <b>قطعة أصلية</b>  ",
    summary: "وصف",
    location: "عمّان",
    priceMinor: 1250,
    currencyCode: "jod",
    specifications: { condition: "new" },
    whatsappEnabled: true,
    contactPhone: "+962790000000"
  }, { defaultCountryCode: "JO" });
  assert.equal(value.title, "قطعة أصلية");
  assert.equal(value.currency_code, "JOD");
  assert.equal(value.active_market_country, "JO");
  assert.equal(value.status, "DRAFT");
  assert.equal(value.whatsapp_enabled, true);
  assert.ok(Object.isFrozen(value));
});

test("rejects invalid sectors, countries, currencies, and minor-unit prices", () => {
  const base = { sector: "automotive", title: "عنوان", location: "مكان", priceMinor: 1, currencyCode: "JOD" };
  assert.throws(() => repo.normalizeDraft({ ...base, sector: "other" }, { defaultCountryCode: "JO" }), { code: "LISTING_SECTOR_INVALID" });
  assert.throws(() => repo.normalizeDraft(base, { defaultCountryCode: "JORDAN" }), { code: "LISTING_COUNTRY_INVALID" });
  assert.throws(() => repo.normalizeDraft({ ...base, currencyCode: "JD" }, { defaultCountryCode: "JO" }), { code: "LISTING_CURRENCY_INVALID" });
  assert.throws(() => repo.normalizePriceMinor(1.2), { code: "LISTING_PRICE_INVALID" });
});

test("allows only trusted JPEG and WebP upload extensions", () => {
  assert.equal(repo.extensionForMime("image/jpeg"), "jpg");
  assert.equal(repo.extensionForMime("image/webp"), "webp");
  assert.throws(() => repo.extensionForMime("image/png"), { code: "MEDIA_MIME_INVALID" });
  assert.throws(() => repo.extensionForMime("video/mp4"), { code: "MEDIA_MIME_INVALID" });
});

test("requires authenticated Clerk identity before repository mutation", async () => {
  const client = { from() { throw new Error("must not query"); }, storage: {} };
  const repository = repo.createMarketplaceRepository({ client, clerk: { user: null }, config: { defaultCountryCode: "JO" } });
  await assert.rejects(() => repository.createDraft({}), { code: "AUTH_REQUIRED" });
});

test("repository exposes one review-submission command and no paid publication bypass", () => {
  const client = { from() { return {}; }, storage: {} };
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    config: { defaultCountryCode: "JO" }
  });
  assert.equal(typeof repository.submitForReview, "function");
  assert.equal(repository.createAndSubmit, undefined);
  assert.equal(repository.prepareForPublication, undefined);
  assert.equal(repository.requestPublication, undefined);
});

test("createDraftWithMedia fails closed before finalization when HTTPS endpoint is absent", async () => {
  const { client, calls } = mutationClient();
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    config: { defaultCountryCode: "JO" },
    randomUUID: () => MEDIA_ID
  });

  await assert.rejects(() => repository.createDraftWithMedia({
    sector: "automotive",
    title: "سيارة موثوقة",
    location: "Amman",
    priceMinor: 1000,
    currencyCode: "JOD"
  }, [{ blob: { size: 4, type: "image/jpeg" }, mimeType: "image/jpeg", width: 800, height: 600 }]), { code: "MEDIA_FINALIZER_URL_REQUIRED" });

  assert.equal(calls.rpc.length, 0, "do not mint a finalization grant when transport policy is invalid");
  assert.equal(calls.deletedListings.length, 1, "failed finalization must remove the draft truth");
  assert.deepEqual(calls.removes, [[RAW_PATH]]);
  assert.equal(calls.mediaInserts.length, 1);
  assert.equal(calls.mediaInserts[0][0].media_id, MEDIA_ID);
  assert.equal(calls.mediaInserts[0][0].storage_path, RAW_PATH);
});

test("createDraftWithMedia finalizes each locally-identified derivative through the trusted server gate", async () => {
  const { client, calls } = mutationClient();
  const fetchCalls = [];
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    auth: {
      getSessionToken: async () => "signed-session-token-for-test"
    },
    crypto: {
      subtle: {
        digest: async () => new Uint8Array(32).buffer
      }
    },
    config: { defaultCountryCode: "JO", mediaFinalizerUrl: "https://media.example.test/finalize" },
    randomUUID: () => MEDIA_ID,
    fetch: async (url, options) => {
      fetchCalls.push([url, options]);
      return { ok: true, json: async () => ({ ok: true, mediaId: MEDIA_ID, state: "CANONICAL" }) };
    }
  });

  const draft = await repository.createDraftWithMedia({
    sector: "automotive",
    title: "سيارة موثوقة",
    location: "Amman",
    priceMinor: 1000,
    currencyCode: "JOD"
  }, [{ blob: { size: 4, type: "image/jpeg" }, mimeType: "image/jpeg", width: 800, height: 600 }]);

  assert.equal(draft.listing_id, LISTING_ID);
  assert.deepEqual(calls.rpc, [["vvip_marketplace_request_media_finalization", { target_media: MEDIA_ID }]]);
  assert.equal(calls.mediaInserts.length, 1);
  assert.equal(calls.mediaInserts[0][0].media_id, MEDIA_ID);
  assert.equal(calls.mediaInserts[0][0].storage_path, RAW_PATH);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0][0], "https://media.example.test/finalize");
  assert.equal(fetchCalls[0][1].credentials, "omit");
  assert.equal(fetchCalls[0][1].cache, "no-store");
  assert.deepEqual(JSON.parse(fetchCalls[0][1].body), { mediaId: MEDIA_ID, finalizationToken: TOKEN });
  assert.equal(calls.deletedListings.length, 0);
});

test("public reads use the safe feed projection and sign canonical media only", async () => {
  const calls = { table: "", select: "", buckets: [], paths: [] };
  const rows = [{
    listing_id: LISTING_ID,
    title: "Listing",
    media: [
      { canonical_storage_path: "canonical/cover.webp", finalization_state: "CANONICAL", position: 0, is_cover: true },
      { canonical_storage_path: "canonical/pending.webp", finalization_state: "PENDING", position: 1, is_cover: false }
    ]
  }];
  const query = thenableQuery({ data: rows });
  const client = {
    from(table) {
      calls.table = table;
      return {
        select(value) { calls.select = value; return query; }
      };
    },
    storage: {
      from(bucket) {
        calls.buckets.push(bucket);
        return {
          createSignedUrls(paths) {
            calls.paths.push(paths.slice());
            return Promise.resolve({ data: paths.map((path) => ({ path, signedUrl: "https://signed.example/" + path })) });
          }
        };
      }
    }
  };

  const repository = repo.createMarketplaceRepository({ client, clerk: { user: null }, config: {} });
  const result = await repository.listPublic({ limit: 30 });

  assert.equal(calls.table, "vvip_marketplace_public_feed");
  assert.match(calls.select, /media/);
  assert.deepEqual(calls.buckets, ["listing-media-canonical"]);
  assert.deepEqual(calls.paths, [["canonical/cover.webp"]]);
  assert.match(result[0].media[0].url, /^https:\/\/signed\.example\//);
  assert.equal(result[0].media[1].url, "");
});
