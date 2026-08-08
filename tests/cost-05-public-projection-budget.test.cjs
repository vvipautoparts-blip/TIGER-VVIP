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
  "media:vvip_marketplace_listing_media(storage_path,position,is_cover,alt_text)"
].join(",");

function createFakeClient() {
  const state = {
    selectCalls: [],
    orderCalls: []
  };

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

test("COST-05 exports the exact approved public feed projection budget", () => {
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
  const projection = String(marketplace.PUBLIC_FEED_SELECT || "");
  const forbidden = [
    "*",
    "specifications",
    "published_at",
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
    "email"
  ];

  for (const field of forbidden) {
    assert.equal(
      projection.includes(field),
      false,
      `public projection must exclude ${field}`
    );
  }
});

test("public projection retains every field consumed by current production marketplace rendering", () => {
  const projection = String(marketplace.PUBLIC_FEED_SELECT || "");
  const requiredListingFields = [
    "listing_id",
    "active_market_country",
    "sector",
    "title",
    "summary",
    "price_minor",
    "currency_code",
    "location_label",
    "contact_phone",
    "whatsapp_enabled"
  ];
  const requiredMediaFields = [
    "storage_path",
    "position",
    "is_cover",
    "alt_text"
  ];

  for (const field of requiredListingFields.concat(requiredMediaFields)) {
    assert.equal(
      projection.includes(field),
      true,
      `public projection must retain ${field}`
    );
  }
});
