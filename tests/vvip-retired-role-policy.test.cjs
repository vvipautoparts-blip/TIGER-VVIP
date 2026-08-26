"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const v13Url = pathToFileURL(path.resolve(__dirname, "../scripts/authorization/v13-authority-contracts.js")).href;
const pr35Url = pathToFileURL(path.resolve(__dirname, "../scripts/pr35/pr35-contracts.js")).href;
const consoleUrl = pathToFileURL(path.resolve(__dirname, "../operations-console/role-permissions.js")).href;
const retiredRootSchemaPath = path.resolve(__dirname, "../supabase-schema.sql");

async function load(url, tag) {
  return import(`${url}?${tag}=${Date.now()}-${Math.random()}`);
}

test("retired area manager is absent from every active authority catalog", async () => {
  const [v13, pr35, consoleRoles] = await Promise.all([
    load(v13Url, "v13"),
    load(pr35Url, "pr35"),
    load(consoleUrl, "console")
  ]);

  assert.equal(v13.ROLE_IDS.includes("area_manager"), false);
  assert.equal(Object.hasOwn(v13.ROLE_RANK, "area_manager"), false);
  assert.equal(pr35.ROLE_IDS.includes("area_manager"), false);
  assert.equal(Object.hasOwn(pr35.ROLE_TEMPLATES, "area_manager"), false);
  assert.equal(consoleRoles.ROLES.some((role) => role.id === "area_manager"), false);
  assert.equal(Object.hasOwn(consoleRoles.ACCESS, "area_manager"), false);
  assert.deepEqual(consoleRoles.allowedScopes("area_manager"), []);
});

test("geographic area scope remains available after retiring the role", async () => {
  const [v13, pr35, consoleRoles] = await Promise.all([
    load(v13Url, "v13-scope"),
    load(pr35Url, "pr35-scope"),
    load(consoleUrl, "console-scope")
  ]);

  assert.equal(v13.SCOPE_LEVELS.includes("area"), true);
  assert.equal(pr35.SCOPE_LEVELS.includes("area"), true);
  assert.equal(consoleRoles.SCOPES.includes("area"), true);
});

test("retired role remains explicitly representable as history but never active authority", async () => {
  const [v13, pr35] = await Promise.all([
    load(v13Url, "v13-history"),
    load(pr35Url, "pr35-history")
  ]);

  assert.deepEqual([...v13.RETIRED_ROLE_IDS], ["area_manager"]);
  assert.equal(v13.HISTORICAL_ROLE_IDS.includes("area_manager"), true);
  assert.equal(v13.ROLE_IDS.includes("area_manager"), false);

  assert.deepEqual([...pr35.RETIRED_ROLE_IDS], ["area_manager"]);
  assert.equal(pr35.HISTORICAL_ROLE_IDS.includes("area_manager"), true);
  assert.equal(pr35.ROLE_IDS.includes("area_manager"), false);
});

test("retired root bootstrap schema cannot return as parallel role authority", () => {
  assert.equal(
    fs.existsSync(retiredRootSchemaPath),
    false,
    "supabase-schema.sql must remain retired; canonical database authority is supabase/migrations only"
  );
});
