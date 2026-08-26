"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

test("S3 living surface controller exists and exports one-authority helpers", () => {
  const mod = require("../scripts/synapse/living-surface-controller.js");
  assert.equal(typeof mod.createLivingSurfaceController, "function");
  assert.equal(typeof mod.buildIntentDraftFromSurface, "function");
  assert.deepEqual(mod.SURFACE_SOURCES, ["HOME", "MARKETPLACE_RESCUE", "SOCIAL_ACTION", "PROFILE"]);
});

test("S3 surface drafts are local-first and never silently activate LIVE_NETWORK", () => {
  const { buildIntentDraftFromSurface } = require("../scripts/synapse/living-surface-controller.js");
  const draft = buildIntentDraftFromSurface({
    source: "HOME",
    summary: "أبحث عن سيارة كهربائية",
    direction: "NEED",
    sector: "automotive",
    category: "vehicle",
  }, { now: new Date("2026-08-25T12:00:00Z") });
  assert.equal(draft.activationMode, "ASSISTED");
  assert.equal(draft.sourceProvenance, "ASSISTED_DRAFT");
  assert.equal(draft.visibilityClass, "PRIVATE_LOCAL");
  assert.equal(draft.summary, "أبحث عن سيارة كهربائية");
});

test("S3 controller routes all creation through injected Intent runtime authority", async () => {
  const { createLivingSurfaceController } = require("../scripts/synapse/living-surface-controller.js");
  const calls = [];
  const intentRuntime = {
    async create(input, context) {
      calls.push({ input, context });
      return { ok: true, localOnly: input.activationMode !== "LIVE_NETWORK", value: input };
    },
  };
  const controller = createLivingSurfaceController({ intentRuntime, now: () => new Date("2026-08-25T12:00:00Z") });
  const result = await controller.createFromSurface({
    source: "MARKETPLACE_RESCUE",
    summary: "لا توجد نتائج وأريد بدائل",
    direction: "NEED",
    sector: "general",
    category: "marketplace",
  }, { actorSubject: "user_test" });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.activationMode, "ASSISTED");
  assert.equal(calls[0].context.explicitConfirmation, false);
});

test("S3 LIVE_NETWORK requires explicit confirmation at the living surface boundary", async () => {
  const { createLivingSurfaceController } = require("../scripts/synapse/living-surface-controller.js");
  const intentRuntime = { async create() { return { ok: true }; } };
  const controller = createLivingSurfaceController({ intentRuntime, now: () => new Date("2026-08-25T12:00:00Z") });
  await assert.rejects(
    () => controller.createFromSurface({
      source: "HOME",
      summary: "طلب مباشر",
      direction: "NEED",
      sector: "general",
      category: "general",
      activationMode: "LIVE_NETWORK",
    }, { actorSubject: "user_test", explicitConfirmation: false }),
    (error) => error && error.code === "S3_CONFIRMATION_REQUIRED",
  );
});

test("S3 index exposes Home, constellation, marketplace rescue and profile summary through one surface", () => {
  const index = read("index.html");
  for (const marker of [
    "data-synapse-intent-entry",
    "data-synapse-match-constellation",
    "data-synapse-marketplace-rescue",
    "data-synapse-profile-intent-summary",
  ]) assert.ok(index.includes(marker), marker);
  assert.ok(index.includes("scripts/synapse/intent-domain.js"));
  assert.ok(index.includes("scripts/synapse/intent-runtime-adapters.js"));
  assert.ok(index.includes("scripts/synapse/living-surface-controller.js"));
  assert.ok(index.includes("styles/tiger-synapse/living-surface.css"));
});

test("S3 public release exact-allowlists only the required living-surface files", () => {
  const release = read("tools/vvip_public_release.py");
  for (const file of [
    "styles/tiger-synapse/living-surface.css",
    "scripts/synapse/intent-domain.js",
    "scripts/synapse/intent-runtime-adapters.js",
    "scripts/synapse/living-surface-controller.js",
  ]) assert.ok(release.includes(`\"${file}\"`), file);
});

test("S3 stylesheet preserves bidi, focus visibility, truthful offline and bounded mobile layout", () => {
  const css = read("styles/tiger-synapse/living-surface.css");
  assert.match(css, /:focus-visible/);
  assert.match(css, /direction:\s*rtl/);
  assert.match(css, /max-inline-size/);
  assert.match(css, /data-synapse-state=["']offline["']/);
});
