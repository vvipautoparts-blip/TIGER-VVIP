(function (root, factory) {
  "use strict";
  const contract = typeof module !== "undefined" && module.exports
    ? require("./listing-contract.js")
    : root.VVIP_LISTING_CONTRACT;
  const api = factory(contract);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.VVIP_LISTING_REPOSITORY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (contract) {
  "use strict";

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  class ListingRepository {
    async create() { throw new Error("repository_method_not_implemented"); }
    async update() { throw new Error("repository_method_not_implemented"); }
    async getById() { throw new Error("repository_method_not_implemented"); }
    async list() { throw new Error("repository_method_not_implemented"); }
  }

  class LocalListingRepository extends ListingRepository {
    constructor(options) {
      super();
      this.records = new Map();
      this.idempotency = new Map();
      this.now = options && options.now ? options.now : () => new Date().toISOString();
    }

    async create(input) {
      const key = `create:${input && input.ownerClerkUserId}:${input && input.idempotencyKey}`;
      if (this.idempotency.has(key)) return clone(this.idempotency.get(key));
      const result = contract.createListing(input, { now: this.now() });
      if (!result.ok) throw Object.assign(new Error("listing_validation_failed"), { errors: result.errors });
      if (this.records.has(result.value.listingId)) throw new Error("listing_already_exists");
      const stored = clone(result.value);
      this.records.set(stored.listingId, stored);
      this.idempotency.set(key, stored);
      return clone(stored);
    }

    async update(listingId, patch, context) {
      const existing = this.records.get(listingId);
      if (!existing || !context || existing.ownerClerkUserId !== context.ownerClerkUserId) return null;
      const idempotencyKey = patch && patch.idempotencyKey;
      const key = `update:${existing.ownerClerkUserId}:${listingId}:${idempotencyKey}`;
      if (this.idempotency.has(key)) return clone(this.idempotency.get(key));
      const immutable = { listingId: existing.listingId, ownerClerkUserId: existing.ownerClerkUserId, createdAt: existing.createdAt };
      const candidate = Object.assign({}, existing, patch, immutable, { updatedAt: this.now() });
      const result = contract.createListing(candidate, { now: candidate.updatedAt });
      if (!result.ok) throw Object.assign(new Error("listing_validation_failed"), { errors: result.errors });
      const stored = clone(result.value);
      this.records.set(listingId, stored);
      this.idempotency.set(key, stored);
      return clone(stored);
    }

    async getById(listingId, context) {
      const record = this.records.get(listingId);
      return record && context && record.ownerClerkUserId === context.ownerClerkUserId ? clone(record) : null;
    }

    async list(query) {
      const page = contract.normalizePagination(query);
      const owner = query && query.ownerClerkUserId;
      const records = Array.from(this.records.values())
        .filter((record) => record.ownerClerkUserId === owner)
        .sort((a, b) => a.listingId.localeCompare(b.listingId));
      const cursorIndex = page.cursor ? records.findIndex((record) => record.listingId === page.cursor) : -1;
      const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      const items = records.slice(start, start + page.limit);
      const hasMore = start + items.length < records.length;
      return Object.freeze({ items: clone(items), nextCursor: hasMore ? items[items.length - 1].listingId : null, limit: page.limit });
    }
  }

  class SupabaseListingRepository extends ListingRepository {
    async create() { throw new Error("supabase_adapter_not_configured"); }
    async update() { throw new Error("supabase_adapter_not_configured"); }
    async getById() { throw new Error("supabase_adapter_not_configured"); }
    async list() { throw new Error("supabase_adapter_not_configured"); }
  }

  return Object.freeze({ ListingRepository, LocalListingRepository, SupabaseListingRepository });
});
