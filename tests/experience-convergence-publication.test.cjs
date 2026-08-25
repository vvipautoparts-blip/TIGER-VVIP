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
  return {
    writes,
    storage: {
      from() {
        return {
          async upload() { return { data: {}, error: null }; },
          async remove() { return { data: [], error: null }; }
        };
      }
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
                    async single() {
                      return {
                        data: Object.assign({ listing_id: "11111111-1111-4111-8111-111111111111" }, payload),
                        error: null
                      };
                    }
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

test("draft creation is content-first and has no commercial prerequisite", async () => {
  const client = createClientSpy();
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    config: { defaultCountryCode: "JO" }
  });

  const draft = await repository.createDraftWithMedia(validDraft(), []);
  assert.equal(draft.status, "DRAFT");
  assert.equal(client.writes.some((write) => write.op === "update"), false);
});

test("server review submission transitions the owned draft to pending review", async () => {
  const client = createClientSpy();
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    config: { defaultCountryCode: "JO" }
  });

  const result = await repository.submitForReview("11111111-1111-4111-8111-111111111111");
  assert.equal(result.status, "PENDING_REVIEW");
  assert.equal(
    client.writes.some((write) => write.op === "update" && write.payload.status === "PENDING_REVIEW"),
    true
  );
});

test("create and submit remains an authenticated listing operation", async () => {
  const client = createClientSpy();
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    config: { defaultCountryCode: "JO" }
  });

  const result = await repository.createAndSubmit(validDraft(), []);
  assert.equal(result.status, "PENDING_REVIEW");
  assert.equal(
    client.writes.some((write) => write.op === "update" && write.payload.status === "PENDING_REVIEW"),
    true
  );
});
