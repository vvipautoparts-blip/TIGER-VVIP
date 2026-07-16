"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const P07_DICTIONARY = path.join(ROOT, "docs/owner-control/p07/P07_DATA_DICTIONARY.json");
const P08_ROOT = path.join(ROOT, "docs/owner-control/p08");
const LEGACY_SUPABASE_ID = ["supabase", "user", "id"].join("_");
const LEGACY_AUTH_UID = ["auth", "uid"].join(".");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

(function main() {
  const requiredFiles = [
    "P08_CURRENT_SECURITY_AND_SCHEMA_AUDIT.md",
    "P08_SECURE_MIGRATION_SEQUENCE.md",
    "P08_RLS_POLICY_MATRIX.json",
    "P08_RLS_POLICY_MATRIX.md",
    "P08_STORAGE_POLICY_MATRIX.json",
    "P08_STORAGE_POLICY_MATRIX.md",
    "P08_PRE_DEPLOYMENT_ASSERTIONS.md",
    "P08_ROLLBACK_AND_RECOVERY_RUNBOOK.md",
    "P08_PRODUCTION_APPROVAL_GATE.md",
    "P08_EVIDENCE_MANIFEST.json",
    "P08_EVIDENCE_MANIFEST.md",
    "P08_COVERAGE_MATRIX.json",
    "P08_COVERAGE_MATRIX.md"
  ];
  for (const name of requiredFiles) {
    assert(fs.existsSync(path.join(P08_ROOT, name)), `missing P08 design artifact: ${name}`);
  }

  const p07 = readJson(P07_DICTIONARY);
  const rls = readJson(path.join(P08_ROOT, "P08_RLS_POLICY_MATRIX.json"));
  const storage = readJson(path.join(P08_ROOT, "P08_STORAGE_POLICY_MATRIX.json"));
  const evidence = readJson(path.join(P08_ROOT, "P08_EVIDENCE_MANIFEST.json"));

  const expectedEntities = p07.entities.map((entity) => entity.name).sort();
  const actualEntities = rls.entities.map((entity) => entity.entity).sort();
  assert(JSON.stringify(actualEntities) === JSON.stringify(expectedEntities), "RLS matrix must derive and cover every P07 entity exactly once");

  for (const entity of rls.entities) {
    assert(Array.isArray(entity.operations) && entity.operations.length === 4, `RLS matrix requires four operations for ${entity.entity}`);
    for (const operation of entity.operations) {
      assert(["SELECT", "INSERT", "UPDATE", "DELETE"].includes(operation.operation), `invalid operation for ${entity.entity}`);
      assert(["allow", "deny", "conditional"].includes(operation.decision), `missing decision for ${entity.entity}.${operation.operation}`);
      for (const field of ["actor", "jwt_claims", "ownership_condition", "administrative_condition", "sector_permission_condition", "sensitive_columns", "audit_requirement", "test_scenario", "rollback_behavior", "policy_name", "helper_function_dependency"]) {
        assert(Object.hasOwn(operation, field), `missing ${field} for ${entity.entity}.${operation.operation}`);
      }
      const serialized = JSON.stringify(operation).toLowerCase();
      assert(!serialized.includes("using (true)"), `broad using policy forbidden for ${entity.entity}.${operation.operation}`);
      assert(!serialized.includes("with check (true)"), `broad check policy forbidden for ${entity.entity}.${operation.operation}`);
      assert(!serialized.includes(LEGACY_SUPABASE_ID), `legacy Supabase identity forbidden for ${entity.entity}.${operation.operation}`);
      assert(!serialized.includes(LEGACY_AUTH_UID), `auth.uid identity forbidden for ${entity.entity}.${operation.operation}`);
    }
  }

  const requiredBuckets = [
    "temporary-upload-quarantine",
    "listing-media-processed",
    "profile-assets-private",
    "moderation-evidence",
    "tiger-care-attachments",
    "audit-artifacts"
  ];
  assert(JSON.stringify(storage.buckets.map((bucket) => bucket.name).sort()) === JSON.stringify(requiredBuckets.sort()), "storage matrix must cover six required buckets");

  const auditLogs = rls.entities.find((entity) => entity.entity === "audit_logs");
  assert(auditLogs, "audit_logs missing from RLS matrix");
  assert(auditLogs.operations.find((operation) => operation.operation === "UPDATE").decision === "deny", "audit logs update must be denied");
  assert(auditLogs.operations.find((operation) => operation.operation === "DELETE").decision === "deny", "audit logs delete must be denied");

  assert(evidence.production_gate.requires_backup === true, "production gate must require backup");
  assert(evidence.production_gate.requires_target_verification === true, "production gate must require exact target verification");
  assert(evidence.production_gate.requires_review_threads_zero === true, "production gate must require zero unresolved review threads");
  assert(evidence.production_gate.requires_rollback_rehearsal === true, "production gate must require tested rollback");

  console.log(JSON.stringify({
    test: "PR76 P08 SECURITY DESIGN PASS",
    p07_entities: expectedEntities.length,
    rls_operations: rls.entities.length * 4,
    storage_buckets: storage.buckets.length
  }));
}());
