"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const REPOSITORY_PATH = path.join(ROOT, "scripts/runtime/vvip-marketplace-repository.js");
const marketplace = require(REPOSITORY_PATH);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createFakeClient() {
  const state = {
    dbExecutions: 0,
    publicExecutions: 0,
    mineExecutions: 0,
    signedUrlCalls: 0,
    rpcCalls: 0,
    publicFailures: 0,
    nextPublicGate: null,
    publicRequests: []
  };

  function queryBuilder(table) {
    const meta = {
      table,
      selection: "",
      filters: [],
      ordering: [],
      limit: null,
      search: []
    };

    const query = {
      select(columns) {
        meta.selection = String(columns || "");
        return query;
      },
      eq(column, value) {
        meta.filters.push([String(column), value]);
        return query;
      },
      order(column, options) {
        meta.ordering.push([String(column), options || null]);
        return query;
      },
      limit(value) {
        meta.limit = value;
        return query;
      },
      ilike(column, value) {
        meta.search.push([String(column), value]);
        return query;
      },
      then(resolve, reject) {
        return execute().then(resolve, reject);
      }
    };

    async function execute() {
      state.dbExecutions += 1;
      const isPublic = table === "vvip_marketplace_public_feed";

      if (!isPublic) {
        state.mineExecutions += 1;
        return {
          data: [{
            listing_id: "mine-" + state.mineExecutions,
            title: "private listing",
            status: "DRAFT",
            location_label: "private"
          }],
          error: null
        };
      }

      state.publicExecutions += 1;
      const execution = state.publicExecutions;
      state.publicRequests.push(JSON.parse(JSON.stringify(meta)));

      const gate = state.nextPublicGate;
      state.nextPublicGate = null;
      if (gate) await gate.promise;

      if (state.publicFailures > 0) {
        state.publicFailures -= 1;
        return { data: null, error: { message: "PUBLIC_READ_FAILED" } };
      }

      return {
        data: [{
          listing_id: "public-" + execution,
          active_market_country: "US",
          sector: "automotive",
          title: "public listing " + execution,
          summary: "public",
          specifications: { condition: "original" },
          price_minor: 100,
          currency_code: "USD",
          location_label: "public",
          contact_phone: null,
          whatsapp_enabled: false,
          published_at: "2026-08-08T00:00:00Z",
          media: [{
            canonical_storage_path: "public/" + execution + "/cover.webp",
            finalization_state: "CANONICAL",
            position: 0,
            is_cover: true,
            alt_text: "cover"
          }]
        }],
        error: null
      };
    }

    return query;
  }

  const client = {
    from(table) {
      return queryBuilder(table);
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, "listing-media-canonical");
        return {
          async createSignedUrls(paths, expiresIn) {
            state.signedUrlCalls += 1;
            assert.equal(expiresIn, 900);
            return {
              data: paths.map((item) => ({
                path: item,
                signedUrl: "https://signed.example/" + item + "?call=" + state.signedUrlCalls
              })),
              error: null
            };
          }
        };
      }
    },
    async rpc(name, args) {
      state.rpcCalls += 1;
      assert.equal(name, "vvip_marketplace_review_listing");
      return {
        data: {
          ok: true,
          call: state.rpcCalls,
          target_listing: args.target_listing,
          decision: args.decision
        },
        error: null
      };
    }
  };

  return { client, state };
}

function makeRepository(fake, options) {
  return marketplace.createMarketplaceRepository(Object.assign({
    client: fake.client,
    clerk: { user: { id: "user_cost03" } },
    config: { defaultCountryCode: "US" }
  }, options || {}));
}

function nextTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("COST-03 exposes a strict thirty-second public-read TTL", () => {
  assert.equal(marketplace.PUBLIC_READ_TTL_MS, 30_000);
});

test("concurrent identical public reads share one DB execution and one signed-url operation", async () => {
  const fake = createFakeClient();
  const gate = deferred();
  fake.state.nextPublicGate = gate;
  const repo = makeRepository(fake, { now: () => 1_000 });

  const first = repo.listPublic({ countryCode: "US", sector: "all", search: "car", limit: 30 });
  await nextTurn();
  assert.equal(fake.state.publicExecutions, 1);

  const second = repo.listPublic({ countryCode: "US", sector: "all", search: "car", limit: 30 });
  await nextTurn();
  assert.equal(fake.state.publicExecutions, 1, "second call must join the in-flight public request");

  gate.resolve();
  const [a, b] = await Promise.all([first, second]);

  assert.equal(fake.state.publicExecutions, 1);
  assert.equal(fake.state.signedUrlCalls, 1);
  assert.deepEqual(a, b);
  assert.notStrictEqual(a, b, "callers must receive defensive result arrays");
  assert.notStrictEqual(a[0], b[0], "callers must not share mutable listing objects");
});

test("fresh public result is reused for thirty seconds without DB or storage work", async () => {
  let now = 5_000;
  const fake = createFakeClient();
  const repo = makeRepository(fake, { now: () => now });

  const first = await repo.listPublic({ countryCode: "US", sector: "automotive", search: "car", limit: 30 });
  assert.equal(fake.state.publicExecutions, 1);
  assert.equal(fake.state.signedUrlCalls, 1);

  first[0].title = "caller mutation";
  first[0].specifications.condition = "caller mutation";
  first[0].media[0].url = "caller mutation";

  now += marketplace.PUBLIC_READ_TTL_MS - 1;
  const second = await repo.listPublic({ countryCode: "US", sector: "automotive", search: "car", limit: 30 });

  assert.equal(fake.state.publicExecutions, 1);
  assert.equal(fake.state.signedUrlCalls, 1);
  assert.equal(second[0].title, "public listing 1");
  assert.equal(second[0].specifications.condition, "original");
  assert.match(second[0].media[0].url, /^https:\/\/signed\.example\//);
});

test("expired public result performs a fresh DB read and signed-url operation", async () => {
  let now = 10_000;
  const fake = createFakeClient();
  const repo = makeRepository(fake, { now: () => now });

  const first = await repo.listPublic({ search: "car" });
  assert.equal(first[0].listing_id, "public-1");

  now += marketplace.PUBLIC_READ_TTL_MS + 1;
  const second = await repo.listPublic({ search: "car" });

  assert.equal(second[0].listing_id, "public-2");
  assert.equal(fake.state.publicExecutions, 2);
  assert.equal(fake.state.signedUrlCalls, 2);
});

test("public cache key follows normalized query semantics", async () => {
  const fake = createFakeClient();
  const repo = makeRepository(fake, { now: () => 20_000 });

  await repo.listPublic({
    countryCode: " us ",
    sector: " all ",
    search: "foo%,bar",
    limit: "30"
  });
  await repo.listPublic({
    countryCode: "US",
    sector: "all",
    search: "foobar",
    limit: 30
  });

  assert.equal(fake.state.publicExecutions, 1, "equivalent filters must share one canonical key");
  assert.deepEqual(fake.state.publicRequests[0].filters, [["active_market_country", "US"]]);
  assert.deepEqual(fake.state.publicRequests[0].search, [["title", "%foobar%"]]);
  assert.equal(fake.state.publicRequests[0].limit, 30);
});

test("different public filters remain isolated", async () => {
  const fake = createFakeClient();
  const repo = makeRepository(fake, { now: () => 30_000 });

  await repo.listPublic({ sector: "automotive" });
  await repo.listPublic({ sector: "real-estate" });

  assert.equal(fake.state.publicExecutions, 2);
  assert.equal(fake.state.signedUrlCalls, 2);
});

test("failed public read is never cached and the next call retries", async () => {
  const fake = createFakeClient();
  fake.state.publicFailures = 1;
  const repo = makeRepository(fake, { now: () => 40_000 });

  await assert.rejects(
    repo.listPublic({ search: "retry" }),
    (error) => error && error.code === "LISTINGS_READ_FAILED"
  );

  const retry = await repo.listPublic({ search: "retry" });
  assert.equal(retry[0].listing_id, "public-2");
  assert.equal(fake.state.publicExecutions, 2);
  assert.equal(fake.state.signedUrlCalls, 1, "failed DB read must not sign or populate a cache entry");
});

test("private listMine reads are never cached or coalesced", async () => {
  const fake = createFakeClient();
  const repo = makeRepository(fake, { now: () => 50_000 });

  await repo.listMine();
  await repo.listMine();

  assert.equal(fake.state.mineExecutions, 2);
  assert.equal(fake.state.dbExecutions, 2);
});

test("repository instances never share public cache state", async () => {
  const fake = createFakeClient();
  const repoA = makeRepository(fake, { now: () => 60_000 });
  const repoB = makeRepository(fake, { now: () => 60_000 });

  await repoA.listPublic({ search: "isolated" });
  await repoB.listPublic({ search: "isolated" });

  assert.equal(fake.state.publicExecutions, 2);
  assert.equal(fake.state.signedUrlCalls, 2);
});

test("successful review invalidates public cache and fences pre-review in-flight results", async () => {
  const fake = createFakeClient();
  const repo = makeRepository(fake, { now: () => 70_000 });

  await repo.listPublic({ search: "review" });
  await repo.listPublic({ search: "review" });
  assert.equal(fake.state.publicExecutions, 1);

  await repo.reviewListing("listing-review", "approve", null);
  assert.equal(fake.state.rpcCalls, 1);

  const afterReview = await repo.listPublic({ search: "review" });
  assert.equal(afterReview[0].listing_id, "public-2");
  assert.equal(fake.state.publicExecutions, 2);

  const gate = deferred();
  fake.state.nextPublicGate = gate;
  const pendingBeforeSecondReview = repo.listPublic({ search: "fence" });
  await nextTurn();
  assert.equal(fake.state.publicExecutions, 3);

  await repo.reviewListing("listing-review-2", "reject", "policy");
  const startedAfterSecondReview = await repo.listPublic({ search: "fence" });
  assert.equal(startedAfterSecondReview[0].listing_id, "public-4");
  assert.equal(fake.state.publicExecutions, 4, "post-review caller must not reuse a pre-review in-flight request");

  gate.resolve();
  const oldResult = await pendingBeforeSecondReview;
  assert.equal(oldResult[0].listing_id, "public-3");

  const finalRead = await repo.listPublic({ search: "fence" });
  assert.equal(finalRead[0].listing_id, "public-4", "old in-flight completion must not overwrite post-review cache");
  assert.equal(fake.state.publicExecutions, 4);
});

test("explicit write calls are never single-flight deduplicated", async () => {
  const fake = createFakeClient();
  const repo = makeRepository(fake, { now: () => 80_000 });

  await Promise.all([
    repo.reviewListing("listing-a", "approve", null),
    repo.reviewListing("listing-a", "approve", null)
  ]);

  assert.equal(fake.state.rpcCalls, 2);
});

test("marketplace repository introduces no persistent browser business-data cache", () => {
  const source = fs.readFileSync(REPOSITORY_PATH, "utf8");
  const forbidden = [
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bindexedDB\b/,
    /\bcaches\.open\b/,
    /\bnavigator\.serviceWorker\b/
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});
