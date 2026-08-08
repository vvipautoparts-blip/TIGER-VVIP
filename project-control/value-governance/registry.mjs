import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import {
  ACTION_CLASSES,
  LIFECYCLE_STATES,
  POLICY_VERSION,
  deepFreeze,
  isPlainObject,
  validateAssetId
} from "./contracts.mjs";

const POLICY_KEYS = Object.freeze([
  "allowNetwork",
  "allowProduction",
  "allowWorktreeMutation",
  "automaticQuarantineClasses",
  "automaticRemovalClasses",
  "minimumEvidenceConfidence",
  "mode",
  "policyVersion",
  "protectedClass",
  "staleEvidenceHours"
]);

const REGISTRY_KEYS = Object.freeze([
  "assets",
  "completeness",
  "policyVersion",
  "registryVersion"
]);

const ASSET_KEYS = Object.freeze([
  "accountableRole",
  "actionClass",
  "assetId",
  "canonicalReplacement",
  "expectedEvidence",
  "lifecycleState",
  "path",
  "protectedObligations",
  "purpose",
  "type"
]);

const REGISTRY_VERSION = "CVGE_ASSET_REGISTRY_V1";
const REGISTRY_COMPLETENESS = "INITIAL_CRITICAL_ASSETS_ONLY";
const TYPE_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const ROLE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const EVIDENCE_CODES = new Set([
  "canonical_replacement",
  "file_exists",
  "reference_count",
  "rollback_reproducible",
  "sha256"
]);
const PROTECTED_OBLIGATIONS = new Set([
  "accessibility",
  "audit",
  "contract",
  "country_activation",
  "financial",
  "identity",
  "legal",
  "privacy",
  "recovery",
  "retention",
  "security",
  "tax"
]);

function decision(ok, code) {
  return Object.freeze({ ok, code });
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function boundedText(value, max) {
  return typeof value === "string"
    && value === value.trim()
    && value.length > 0
    && value.length <= max;
}

function uniqueKnownList(value, allowed, max = 32) {
  return Array.isArray(value)
    && value.length <= max
    && value.every((entry) => typeof entry === "string" && allowed.has(entry))
    && new Set(value).size === value.length;
}

function isSafeRepositoryPath(value) {
  if (!boundedText(value, 512)
    || value.includes("\0")
    || value.includes("\\")
    || path.posix.isAbsolute(value)
    || path.win32.isAbsolute(value)) {
    return false;
  }
  const segments = value.split("/");
  return segments.length > 0
    && segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function validateAsset(asset) {
  if (!hasExactKeys(asset, ASSET_KEYS)
    || !validateAssetId(asset.assetId)
    || !boundedText(asset.type, 64)
    || !TYPE_PATTERN.test(asset.type)
    || !isSafeRepositoryPath(asset.path)
    || !boundedText(asset.purpose, 512)
    || !boundedText(asset.accountableRole, 64)
    || !ROLE_PATTERN.test(asset.accountableRole)
    || !ACTION_CLASSES.includes(asset.actionClass)
    || !LIFECYCLE_STATES.includes(asset.lifecycleState)
    || !uniqueKnownList(asset.protectedObligations, PROTECTED_OBLIGATIONS)
    || !uniqueKnownList(asset.expectedEvidence, EVIDENCE_CODES)
    || asset.expectedEvidence.length === 0
    || (asset.canonicalReplacement !== null
      && (!validateAssetId(asset.canonicalReplacement)
        || asset.canonicalReplacement === asset.assetId))) {
    return decision(false, "ASSET_REGISTRY_INVALID");
  }

  if (asset.actionClass === "C"
    && !["ACTIVE", "PROTECTED"].includes(asset.lifecycleState)) {
    return decision(false, "ACTION_CLASS_DENIED");
  }
  if (asset.actionClass === "A" && asset.protectedObligations.length > 0) {
    return decision(false, "ACTION_CLASS_DENIED");
  }
  if (asset.actionClass === "B"
    && ["REMOVAL_READY", "REMOVED"].includes(asset.lifecycleState)) {
    return decision(false, "ACTION_CLASS_DENIED");
  }
  return decision(true, "OK");
}

export function validatePolicy(policy) {
  if (!hasExactKeys(policy, POLICY_KEYS)
    || policy.policyVersion !== POLICY_VERSION
    || policy.mode !== "ANALYSIS_ONLY"
    || !uniqueKnownList(policy.automaticRemovalClasses, new Set(ACTION_CLASSES), 3)
    || !uniqueKnownList(policy.automaticQuarantineClasses, new Set(ACTION_CLASSES), 3)
    || policy.protectedClass !== "C"
    || typeof policy.minimumEvidenceConfidence !== "number"
    || !Number.isFinite(policy.minimumEvidenceConfidence)
    || policy.minimumEvidenceConfidence < 0
    || policy.minimumEvidenceConfidence > 1
    || !Number.isInteger(policy.staleEvidenceHours)
    || policy.staleEvidenceHours <= 0
    || policy.allowWorktreeMutation !== false
    || policy.allowNetwork !== false
    || policy.allowProduction !== false) {
    return decision(false, "POLICY_VERSION_INVALID");
  }

  if (policy.automaticRemovalClasses.includes(policy.protectedClass)
    || policy.automaticQuarantineClasses.includes(policy.protectedClass)
    || policy.automaticRemovalClasses.some((entry) => entry !== "A")
    || policy.automaticQuarantineClasses.some((entry) => entry !== "B")) {
    return decision(false, "ACTION_CLASS_DENIED");
  }
  return decision(true, "OK");
}

export function validateRegistry(registry, policy) {
  const policyDecision = validatePolicy(policy);
  if (!policyDecision.ok) return policyDecision;

  if (!hasExactKeys(registry, REGISTRY_KEYS)
    || registry.registryVersion !== REGISTRY_VERSION
    || registry.policyVersion !== policy.policyVersion
    || registry.completeness !== REGISTRY_COMPLETENESS
    || !Array.isArray(registry.assets)
    || registry.assets.length === 0
    || registry.assets.length > 10_000) {
    return decision(false, "ASSET_REGISTRY_INVALID");
  }

  const assetIds = new Set();
  const governedPaths = new Set();
  for (const asset of registry.assets) {
    const assetDecision = validateAsset(asset);
    if (!assetDecision.ok) return assetDecision;
    if (assetIds.has(asset.assetId)) return decision(false, "ASSET_ID_DUPLICATE");
    if (governedPaths.has(asset.path)) return decision(false, "REGISTRY_PATH_DUPLICATE");
    assetIds.add(asset.assetId);
    governedPaths.add(asset.path);
  }

  for (const asset of registry.assets) {
    if (asset.canonicalReplacement !== null
      && !assetIds.has(asset.canonicalReplacement)) {
      return decision(false, "ASSET_REGISTRY_INVALID");
    }
  }
  return decision(true, "OK");
}

async function resolveCheckedInput(rootDir, relativePath) {
  if (!isSafeRepositoryPath(relativePath)) {
    throw new TypeError("PATH_ESCAPE_DENIED");
  }
  const canonicalRoot = await realpath(rootDir);
  const candidate = path.resolve(canonicalRoot, relativePath);
  const canonicalCandidate = await realpath(candidate);
  const relative = path.relative(canonicalRoot, canonicalCandidate);
  if (relative === ""
    || relative.startsWith(`..${path.sep}`)
    || relative === ".."
    || path.isAbsolute(relative)) {
    throw new TypeError("PATH_ESCAPE_DENIED");
  }
  return canonicalCandidate;
}

async function readJsonFile(rootDir, relativePath, invalidCode) {
  try {
    const filePath = await resolveCheckedInput(rootDir, relativePath);
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error instanceof TypeError && error.message === "PATH_ESCAPE_DENIED") throw error;
    throw new TypeError(invalidCode);
  }
}

export async function loadGovernanceInputs({
  rootDir,
  policyPath = "project-control/value-governance/policy.v1.json",
  registryPath = "project-control/value-governance/registry.v1.json"
} = {}) {
  if (!boundedText(rootDir, 4_096)) throw new TypeError("PATH_ESCAPE_DENIED");
  const policy = await readJsonFile(rootDir, policyPath, "POLICY_VERSION_INVALID");
  const policyDecision = validatePolicy(policy);
  if (!policyDecision.ok) throw new TypeError(policyDecision.code);

  const registry = await readJsonFile(rootDir, registryPath, "ASSET_REGISTRY_INVALID");
  const registryDecision = validateRegistry(registry, policy);
  if (!registryDecision.ok) throw new TypeError(registryDecision.code);

  return deepFreeze({ policy, registry });
}
