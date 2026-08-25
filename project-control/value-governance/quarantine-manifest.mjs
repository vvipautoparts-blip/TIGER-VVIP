import { createHash } from "node:crypto";

import {
  deepFreeze,
  isPlainObject,
  validateAssetId,
  validateSha256
} from "./contracts.mjs";
import { validateCleanupTransactionManifest } from "./transaction-manifest.mjs";

const QUARANTINE_MANIFEST_CONTRACT = Object.freeze({
  name: "CVGE_SECRET_SAFE_QUARANTINE_MANIFEST",
  version: 1
});

const QUARANTINE_PRECONDITIONS = Object.freeze([
  "TRANSACTION_MANIFEST_HASH_MATCH",
  "EXACT_SOURCE_COMMIT_MATCH",
  "EXACT_SOURCE_TREE_MATCH",
  "TARGET_CONTENT_HASH_MATCH",
  "SECRET_SAFE_METADATA_ONLY",
  "QUARANTINE_HASH_VERIFICATION_REQUIRED",
  "RESTORE_REHEARSAL_REQUIRED"
]);

const SENSITIVE_PAYLOAD_KEY = /^(?:content|rawcontent|secret|token|password|credential|privatekey|authorization)$/i;

function fail() {
  throw new TypeError("QUARANTINE_MANIFEST_INVALID");
}

function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail();
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (!isPlainObject(value)) fail();

  const normalized = {};
  for (const key of Object.keys(value).sort()) {
    if (SENSITIVE_PAYLOAD_KEY.test(key)) fail();
    normalized[key] = canonicalize(value[key]);
  }
  return normalized;
}

function hashCanonical(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");
}

function quarantineObjectId(operation) {
  const binding = {
    assetId: operation.assetId,
    targetPath: operation.targetPath,
    expectedContentHash: operation.expectedContentHash,
    cleanupPlanHash: operation.cleanupPlanHash
  };
  return `q-${hashCanonical(binding)}`;
}

function normalizeOperation(operation) {
  if (!validateAssetId(operation.assetId)
    || !validateSha256(operation.expectedContentHash)
    || !validateSha256(operation.cleanupPlanHash)) {
    fail();
  }

  return {
    assetId: operation.assetId,
    targetPath: operation.targetPath,
    expectedContentHash: operation.expectedContentHash,
    cleanupPlanHash: operation.cleanupPlanHash,
    quarantineObjectId: quarantineObjectId(operation),
    quarantineIntent: "COPY_TO_VERIFIED_QUARANTINE",
    rollback: {
      required: true,
      method: "CONTENT_ADDRESSED_RESTORE",
      targetPath: operation.targetPath,
      expectedContentHash: operation.expectedContentHash
    }
  };
}

export function buildSecretSafeQuarantineManifest({ transactionManifest } = {}) {
  let validated;
  try {
    validated = validateCleanupTransactionManifest(transactionManifest);
  } catch {
    fail();
  }

  if (validated.executable !== false) fail();

  const operations = validated.operations
    .map((operation) => normalizeOperation(operation))
    .sort((left, right) => left.assetId.localeCompare(right.assetId));

  const quarantineIds = operations.map((operation) => operation.quarantineObjectId);
  const targetPaths = operations.map((operation) => operation.targetPath);
  if (new Set(quarantineIds).size !== quarantineIds.length
    || new Set(targetPaths).size !== targetPaths.length) {
    fail();
  }

  const semanticManifest = {
    contract: QUARANTINE_MANIFEST_CONTRACT,
    source: validated.source,
    policyVersion: validated.policyVersion,
    transactionManifestHash: validated.manifestHash,
    preconditions: QUARANTINE_PRECONDITIONS,
    operations,
    executable: false,
    containsRawContent: false
  };

  return deepFreeze({
    ...semanticManifest,
    manifestHash: hashCanonical(semanticManifest)
  });
}
