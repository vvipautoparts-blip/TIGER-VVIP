"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const hardening = require("../scripts/runtime/vvip-marketplace-rollback.js");

test("removes uploaded objects and draft metadata when submit fails", async () => {
  const calls = { removed: null, deleted: null };
  const repository = {
    async createDraft() { return { listing_id: "listing-1" }; },
    async uploadMedia() { return [{ storage_path: "user/listing-1/image.webp" }]; },
    async submitForReview() {
      const error = new Error("submit failed");
      error.code = "LISTING_SUBMIT_FAILED";
      throw error;
    }
  };
  const client = {
    storage: {
      from(bucket) {
        assert.equal(bucket, "listing-media");
        return {
          async remove(paths) {
            calls.removed = paths;
            return { error: null };
          }
        };
      }
    },
    from(table) {
      assert.equal(table, "vvip_marketplace_listings");
      return {
        delete() {
          return {
            async eq(column, value) {
              calls.deleted = [column, value];
              return { error: null };
            }
          };
        }
      };
    }
  };
  const hardened = hardening.hardenRepository(repository, { client });
  await assert.rejects(() => hardened.createAndSubmit({}, []), { code: "LISTING_SUBMIT_FAILED" });
  assert.deepEqual(calls.removed, ["user/listing-1/image.webp"]);
  assert.deepEqual(calls.deleted, ["listing_id", "listing-1"]);
});

test("fails closed when compensation itself is incomplete", async () => {
  const repository = {
    async createDraft() { return { listing_id: "listing-2" }; },
    async uploadMedia() { return [{ storage_path: "user/listing-2/image.webp" }]; },
    async submitForReview() { throw new Error("submit failed"); }
  };
  const client = {
    storage: { from() { return { async remove() { return { error: new Error("remove failed") }; } }; } },
    from() { return { delete() { return { async eq() { return { error: null }; } }; } }; }
  };
  const hardened = hardening.hardenRepository(repository, { client });
  await assert.rejects(() => hardened.createAndSubmit({}, []), { code: "MARKETPLACE_ROLLBACK_INCOMPLETE" });
});
