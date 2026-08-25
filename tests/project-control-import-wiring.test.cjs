"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("project-control importer validates authority and target before opening postgres", () => {
  const importer = read("project-control/scripts/import_project_control.mjs");

  assert.match(importer, /project_control_import_guard\.mjs/);
  assert.match(importer, /OWNER_AUTHORITY_REGISTRY\.md/);
  assert.match(importer, /PROJECT_CONTROL_IMPORT_TARGET/);
  assert.match(importer, /PROJECT_CONTROL_IMPORT_ALLOWED_HOSTS/);
  assert.match(importer, /validateProjectControlImport\s*\(/);
  assert.match(importer, /ssl:\s*["']require["']/);

  const guardIndex = importer.indexOf("validateProjectControlImport(");
  const postgresIndex = importer.indexOf("postgres(databaseUrl");
  assert.ok(guardIndex >= 0, "expected fail-closed preflight");
  assert.ok(postgresIndex >= 0, "expected postgres connection creation");
  assert.ok(guardIndex < postgresIndex, "preflight must complete before postgres connection");
});
