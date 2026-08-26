"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const marketplace = require(path.resolve(__dirname, "../scripts/runtime/vvip-marketplace-repository.js"));

function createClient(rows, options) {
  const state = {
    signedPathBatches: [],
    dbExecutions: 0
  };
  const config = options || {};

  function queryBuilder() {
    const query = {
      select() { return query; },
      eq() { return query; },
      order() { return query; },
      limit() { return query; },
      ilike() { return query; },
      then(resolve, reject) {
        state.dbExecutions += 1;
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      }
    };
    return query;
  }

  const client = {
    from() { return queryBuilder(); },
    storage: {
      from(bucket) {
        assert.equal(bucket, "listing-media-canonical");
        return {
          async createSignedUrls(paths, expiresIn) {
            state.signedPathBatches.push(paths.slice());
            assert.equal(expiresIn, 900);
            if (config.signingError) {
              return { data: null, error: { message: "SIGNING_FAILED" } };
            }
            return {
              data: paths.map((item) => ({
                path: item,
                signedUrl: "https://signed.example/" + encodeURIComponent(item)
              })),
              error: null
            };
          }
        };
      }
    }
  };

  return { client, state };
}

function repository(fake) {
  return marketplace.createMarketplaceRepository({
    client: fake.client,
    clerk: { user: { id: "user_cost04" } },
    config: { defaultCountryCode: "US" },
    now: () => 1_000
  });
}

function media(pathname, position, isCover, extra) {
  return Object.assign({
    canonical_storage_path: pathname,
    finalization_state: pathname ? "CANONICAL" : "PENDING_FINALIZATION",
    position,
    is_cover: isCover,
    alt_text: pathname || "missing path"
  }, extra || {});
}

function sampleRows() {
  return [
    {
      listing_id: "listing-a",
      title: "A",
      media: [
        media("a/position-0.webp", 0, false),
        media("shared/explicit-cover.webp", 1, true),
        media("a/position-2.webp", 2, false),
        media("a/position-3.webp", 3, false),
        media("a/position-4.webp", 4, false),
        media("a/position-5.webp", 5, false),
        media("a/position-6.webp", 6, false)
      ]
    },
    {
      listing_id: "listing-b",
      title: "B",
      media: [
        media("b/position-5.webp", 5, false),
        media("b/position-0.webp", 0, false),
        media("", -1, true)
      ]
    },
    {
      listing_id: "listing-c",
      title: "C",
      media: [
        media("shared/explicit-cover.webp", 4, true),
        media("c/position-0.webp", 0, false)
      ]
    }
  ];
}

test("COST-04 signs at most one canonical display-critical path per listing and deduplicates the batch", async () => {
  const fake = createClient(sampleRows());
  const repo = repository(fake);

  await repo.listPublic({ countryCode: "US", limit: 30 });

  assert.equal(fake.state.signedPathBatches.length, 1);
  assert.deepEqual(fake.state.signedPathBatches[0], [
    "shared/explicit-cover.webp",
    "b/position-0.webp"
  ]);
});

test("explicit canonical cover wins over lower-position non-cover media", async () => {
  const fake = createClient(sampleRows());
  const rows = await repository(fake).listPublic({});
  const listing = rows.find((item) => item.listing_id === "listing-a");

  assert.equal(listing.media[0].url, "");
  assert.match(listing.media[1].url, /^https:\/\/signed\.example\//);
  assert.equal(listing.media[2].url, "");
});

test("lowest-position canonical media is selected when no valid explicit cover path exists", async () => {
  const fake = createClient(sampleRows());
  const rows = await repository(fake).listPublic({});
  const listing = rows.find((item) => item.listing_id === "listing-b");

  assert.equal(listing.media[0].canonical_storage_path, "b/position-5.webp");
  assert.equal(listing.media[0].url, "");
  assert.equal(listing.media[1].canonical_storage_path, "b/position-0.webp");
  assert.match(listing.media[1].url, /^https:\/\/signed\.example\//);
  assert.equal(listing.media[2].url, "");
});

test("canonical media metadata and ordering are preserved while non-selected URLs remain empty", async () => {
  const source = sampleRows();
  const fake = createClient(source);
  const rows = await repository(fake).listPublic({});

  for (let index = 0; index < source.length; index += 1) {
    assert.equal(rows[index].media.length, source[index].media.length);
    assert.deepEqual(
      rows[index].media.map((item) => item.canonical_storage_path),
      source[index].media.map((item) => item.canonical_storage_path)
    );
    for (let mediaIndex = 0; mediaIndex < source[index].media.length; mediaIndex += 1) {
      const output = rows[index].media[mediaIndex];
      const input = source[index].media[mediaIndex];
      assert.equal(output.finalization_state, input.finalization_state);
      assert.equal(output.position, input.position);
      assert.equal(output.is_cover, input.is_cover);
      assert.ok(Object.prototype.hasOwnProperty.call(output, "url"));
    }
  }

  const signed = rows.flatMap((listing) => listing.media).filter((item) => item.url);
  assert.equal(signed.length, 3, "three listings have selected canonical media, including a deduplicated shared path");
});

test("listings without usable canonical paths do not trigger Storage signing", async () => {
  const fake = createClient([
    { listing_id: "no-media", media: [] },
    { listing_id: "no-path", media: [media("", 0, true), media(null, 1, false)] }
  ]);

  const rows = await repository(fake).listPublic({});

  assert.equal(fake.state.signedPathBatches.length, 0);
  assert.deepEqual(rows[0].media, []);
  assert.equal(rows[1].media[0].url, "");
  assert.equal(rows[1].media[1].url, "");
});

test("canonical Storage signing failure remains fail closed", async () => {
  const fake = createClient(sampleRows(), { signingError: true });

  await assert.rejects(
    repository(fake).listPublic({}),
    (error) => error && error.code === "MEDIA_SIGNING_FAILED"
  );
});
