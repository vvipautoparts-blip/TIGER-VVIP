"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const repoModule = require("../scripts/runtime/vvip-marketplace-repository.js");

function clientStub() {
  return {
    storage: { from() { return {}; } },
    from() { return {}; }
  };
}

test("listing creation surface contains only content and preview before server review submission", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "scripts", "vvip-production-marketplace.js"),
    "utf8"
  );
  const steps = [...source.matchAll(/data-step=\"([^\"]+)\"/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(steps)], ["content", "preview"]);
  assert.match(source, /submitForReview\(state\.draftListingId\)/);
});

test("marketplace repository exposes only the current listing lifecycle surface", () => {
  const repository = repoModule.createMarketplaceRepository({
    client: clientStub(),
    clerk: { user: { id: "owner_subject" } },
    config: { defaultCountryCode: "JO" }
  });

  assert.deepEqual(Object.keys(repository).sort(), [
    "createAndSubmit",
    "createDraft",
    "createDraftWithMedia",
    "listMine",
    "listPublic",
    "reviewListing",
    "submitForReview",
    "toggleFavorite",
    "uploadMedia"
  ].sort());
});
