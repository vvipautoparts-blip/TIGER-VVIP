"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const repo = require("../scripts/runtime/vvip-marketplace-repository.js");

const APPROVED_SECTORS = [
  "automotive",
  "real-estate",
  "construction",
  "professional-services",
  "equipment",
  "trade-supply",
  "engineering-consulting"
];

function validDraft(sector = "automotive") {
  return {
    sector,
    title: "إعلان صالح",
    summary: "وصف واضح",
    location: "عمّان",
    priceMinor: 1000,
    currencyCode: "JOD",
    activeMarketCountry: "JO"
  };
}

function createClientSpy() {
  const writes = [];
  const rpcCalls = [];
  return {
    writes,
    rpcCalls,
    storage: {
      from() {
        return {
          async upload() { return { data: {}, error: null }; },
          async remove() { return { data: [], error: null }; }
        };
      }
    },
    async rpc(name, payload) {
      rpcCalls.push({ name, payload });
      return { data: null, error: { message: "trusted transport unavailable" } };
    },
    from(table) {
      return {
        insert(payload) {
          writes.push({ op: "insert", table, payload });
          return {
            select() {
              return {
                async single() {
                  return {
                    data: Object.assign({ listing_id: "11111111-1111-4111-8111-111111111111" }, payload),
                    error: null
                  };
                }
              };
            }
          };
        },
        update(payload) {
          writes.push({ op: "update", table, payload });
          return {
            eq() {
              return {
                select() {
                  return {
                    async single() { return { data: payload, error: null }; }
                  };
                }
              };
            }
          };
        },
        delete() {
          writes.push({ op: "delete", table });
          return { async eq() { return { data: null, error: null }; } };
        }
      };
    }
  };
}

test("repository accepts the seven owner-approved marketplace sectors", () => {
  for (const sector of APPROVED_SECTORS) {
    const normalized = repo.normalizeDraft(validDraft(sector), { defaultCountryCode: "JO" });
    assert.equal(normalized.sector, sector);
    assert.equal(normalized.status, "DRAFT");
  }
});

test("draft creation is content-first and does not require a payment entitlement", async () => {
  const client = createClientSpy();
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    config: { defaultCountryCode: "JO" }
  });

  assert.equal(typeof repository.createDraftWithMedia, "function");
  const draft = await repository.createDraftWithMedia(validDraft(), []);
  assert.equal(draft.status, "DRAFT");
  assert.equal(client.writes.some((write) => write.op === "update"), false);
  assert.equal(client.writes.some((write) => write.payload && write.payload.status === "PENDING_REVIEW"), false);
});

test("publication preparation requires an opaque entitlement receipt before trusted transport", () => {
  const client = createClientSpy();
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    config: { defaultCountryCode: "JO" }
  });

  assert.equal(typeof repository.prepareForPublication, "function");
  assert.throws(
    () => repository.prepareForPublication("11111111-1111-4111-8111-111111111111", {
      planId: "visibility-standard",
      entitlementReceipt: null
    }),
    { code: "ENTITLEMENT_RECEIPT_REQUIRED" }
  );

  assert.equal(client.rpcCalls.length, 0);
  assert.equal(client.writes.some((write) => write.payload && write.payload.status === "PENDING_REVIEW"), false);
});

test("publication preparation uses PR190 step-up auth and resumes the same trusted intent", async () => {
  const client = createClientSpy();
  const clerk = { user: null };
  let descriptor = null;
  const auth = {
    async requireAuth(intent, resume) {
      descriptor = intent;
      clerk.user = { id: "user_owner" };
      await resume();
      return false;
    }
  };
  const repository = repo.createMarketplaceRepository({
    client,
    clerk,
    auth,
    config: { defaultCountryCode: "JO" }
  });

  await assert.rejects(
    () => repository.prepareForPublication("11111111-1111-4111-8111-111111111111", {
      planId: "visibility-standard",
      entitlementReceipt: "server-verified-receipt-placeholder"
    }),
    { code: "PUBLICATION_PREPARE_FAILED" }
  );
  assert.deepEqual(descriptor, {
    name: "PREPARE_PUBLICATION",
    listingId: "11111111-1111-4111-8111-111111111111"
  });
  assert.deepEqual(client.rpcCalls, [{
    name: "vvip_marketplace_prepare_publication",
    payload: {
      target_listing: "11111111-1111-4111-8111-111111111111",
      target_plan_id: "visibility-standard",
      entitlement_receipt: "server-verified-receipt-placeholder"
    }
  }]);
  assert.equal(client.writes.some((write) => write.op === "update"), false);
});

test("trusted publication transport failure never falls back to browser status mutation", async () => {
  const client = createClientSpy();
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    config: { defaultCountryCode: "JO" }
  });

  await assert.rejects(
    () => repository.prepareForPublication("11111111-1111-4111-8111-111111111111", {
      planId: "visibility-standard",
      entitlementReceipt: "server-verified-receipt-placeholder"
    }),
    { code: "PUBLICATION_PREPARE_FAILED" }
  );
  assert.equal(client.rpcCalls.length, 1);
  assert.equal(client.writes.some((write) => write.op === "update"), false);
});
