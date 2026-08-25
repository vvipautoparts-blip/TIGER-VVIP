"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const registryText = fs.readFileSync(
  path.join(root, "docs/architecture/OWNER_AUTHORITY_REGISTRY.md"),
  "utf8"
);

const localUrl = "postgresql://127.0.0.1:5432/tiger_dev";
const remoteUrl = "postgresql://db.example.internal:5432/tiger_dev";

test("project-control import preflight is fail-closed for target, host, protocol, and authority", async () => {
  const { validateProjectControlImport } = await import(
    "../project-control/scripts/project_control_import_guard.mjs"
  );

  assert.throws(
    () => validateProjectControlImport({ target: "production", databaseUrl: localUrl, allowedHosts: "", registryText }),
    /PROJECT_CONTROL_IMPORT_TARGET_DENIED/
  );

  assert.throws(
    () => validateProjectControlImport({ target: "staging", databaseUrl: localUrl, allowedHosts: "", registryText }),
    /PROJECT_CONTROL_IMPORT_TARGET_DENIED/
  );

  assert.throws(
    () => validateProjectControlImport({ target: "development", databaseUrl: remoteUrl, allowedHosts: "", registryText }),
    /PROJECT_CONTROL_IMPORT_HOST_DENIED/
  );

  assert.throws(
    () =>
      validateProjectControlImport({
        target: "development",
        databaseUrl: remoteUrl,
        allowedHosts: "*.example.internal",
        registryText,
      }),
    /PROJECT_CONTROL_IMPORT_HOST_ALLOWLIST_WILDCARD_FORBIDDEN/
  );

  assert.throws(
    () =>
      validateProjectControlImport({
        target: "development",
        databaseUrl: "https://db.example.internal/tiger_dev",
        allowedHosts: "db.example.internal",
        registryText,
      }),
    /PROJECT_CONTROL_IMPORT_DATABASE_URL_INVALID/
  );

  assert.throws(
    () => validateProjectControlImport({ target: "development", databaseUrl: localUrl, allowedHosts: "", registryText: "" }),
    /PROJECT_CONTROL_IMPORT_AUTHORITY_CONTRACT_MISSING/
  );

  assert.doesNotThrow(() =>
    validateProjectControlImport({ target: "development", databaseUrl: localUrl, allowedHosts: "", registryText })
  );

  assert.doesNotThrow(() =>
    validateProjectControlImport({
      target: "development",
      databaseUrl: remoteUrl,
      allowedHosts: "db.example.internal",
      registryText,
    })
  );
});
