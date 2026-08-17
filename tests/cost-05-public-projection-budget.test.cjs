"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const marketplace = require(path.resolve(__dirname, "../scripts/runtime/vvip-marketplace-repository.js"));

const EXPECTED_PUBLIC_FEED_SELECT = [
  "listing_id",
  "active_market_country",
  "sector",
  "title",
  "summary",
  "price_minor",
  "currency_code",
  "location_label",
  "contact_phone",
  "whatsapp_enabled",
  "published_at",
  "media"
].join(",");

function createFakeClient() {
  const state = { selectCalls: [], orderCalls: [] };

  function queryBuilder() {
    const query = {
      select(value) {
        state.selectCalls.push(String(value));
        return query;
      },
      eq() { return query; },
      order(column, options) {
        state.orderCalls.push([column, options || null]);
        return query;
      },
      limit() { return query; },
      ilike() { return query; },
      then(resolve, reject) {
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      }
    };
    return query;
  }

  return {
    state,
    client: {
      from() { return queryBuilder(); },
      storage: {
        from() {
          return {
            async createSignedUrls() {
              throw new Error("no media paths expected in this projection test");
            }
          };
        }
      }
    }
  };
}

test("COST-05 exports the exact approved sovereign public feed projection budget", () => {
  assert.equal(marketplace.PUBLIC_FEED_SELECT, EXPECTED_PUBLIC_FEED_SELECT);
});

test("public listing query uses the approved projection and keeps server-side published ordering", async () => {
  const fake = createFakeClient();
  const repo = marketplace.createMarketplaceRepository({
    client: fake.client,
    clerk: { user: { id: "user_cost05" } },
    config: { defaultCountryCode: "US" },
    now: () => 1_000
  });

  await repo.listPublic({ countryCode: "US", limit: 30 });

  assert.deepEqual(fake.state.selectCalls, [EXPECTED_PUBLIC_FEED_SELECT]);
  assert.deepEqual(fake.state.orderCalls, [[
    "published_at",
    { ascending: false, nullsFirst: false }
  ]]);
});

test("public projection excludes unused and private payload fields", () => {
  const fields = String(marketplace.PUBLIC_FEED_SELECT || "").split(",");
  const forbidden = [
    "*",
    "specifications",
    "media_id",
    "mime_type",
    "width",
    "height",
    "owner_subject",
    "rejection_reason",
    "status",
    "created_at",
    "updated_at",
    "clerk_user_id",
    "email",
    "canonical_sha256",
    "source_sha256",
    "canonical_verifier"
  ];

  for (const field of forbidden) {
    assert.equal(
      fields.includes(field),
      false,
      `public projection must exclude ${field}`
    );
  }
});

test("public projection retains every top-level field required by the sovereign feed transport", () => {
  const fields = String(marketplace.PUBLIC_FEED_SELECT || "").split(",");
  const requiredFields = [
    "listing_id",
    "active_market_country",
    "sector",
    "title",
    "summary",
    "price_minor",
    "currency_code",
    "location_label",
    "contact_phone",
    "whatsapp_enabled",
    "published_at",
    "media"
  ];

  for (const field of requiredFields) {
    assert.equal(
      fields.includes(field),
      true,
      `public projection must retain ${field}`
    );
  }
});
