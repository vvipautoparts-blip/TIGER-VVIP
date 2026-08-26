import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REQUIRED_FIELDS = [
  "authority_id",
  "domain",
  "version",
  "status",
  "owner_decision_ref",
  "canonical_path",
  "supersedes",
  "protected_boundaries",
];
const VALID_STATUSES = new Set(["CURRENT_ONLY", "BOUNDED_MIGRATION", "HISTORICAL_ONLY"]);

function failure(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  throw error;
}

function assertRelativePath(value, field) {
  if (typeof value !== "string" || value.length === 0 || path.posix.isAbsolute(value)) {
    failure("AUTHORITY_PATH_INVALID", `${field} must be a relative repository path`);
  }
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    failure("AUTHORITY_PATH_INVALID", `${field} escapes the repository`, { field, value });
  }
  return normalized;
}

function canonicalRecord(record) {
  return Object.fromEntries(REQUIRED_FIELDS.map((field) => [field, record[field]]));
}

function validateRecordShape(record, repositoryRoot) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    failure("AUTHORITY_RECORD_INVALID", "authority records must be objects");
  }
  const fields = Object.keys(record).sort();
  const expected = [...REQUIRED_FIELDS].sort();
  if (JSON.stringify(fields) !== JSON.stringify(expected)) {
    failure("AUTHORITY_RECORD_FIELDS_INVALID", "authority record fields are not exact", { fields });
  }
  if (typeof record.authority_id !== "string" || !/^[a-z0-9][a-z0-9.-]*$/.test(record.authority_id)) {
    failure("AUTHORITY_ID_INVALID", "authority_id is invalid");
  }
  if (typeof record.domain !== "string" || !/^[a-z0-9][a-z0-9.-]*$/.test(record.domain)) {
    failure("AUTHORITY_DOMAIN_INVALID", "domain is invalid");
  }
  if (!Number.isInteger(record.version) || record.version < 0) {
    failure("AUTHORITY_VERSION_INVALID", "version must be a non-negative integer");
  }
  if (!VALID_STATUSES.has(record.status)) {
    failure("AUTHORITY_STATUS_INVALID", "status is not a supported authority status");
  }
  const ownerDecisionRef = assertRelativePath(record.owner_decision_ref, "owner_decision_ref");
  const canonicalPath = assertRelativePath(record.canonical_path, "canonical_path");
  for (const [field, value] of [["owner_decision_ref", ownerDecisionRef], ["canonical_path", canonicalPath]]) {
    if (!fs.statSync(path.join(repositoryRoot, value), { throwIfNoEntry: false })?.isFile()) {
      failure(field === "canonical_path" ? "AUTHORITY_CANONICAL_PATH_MISSING" : "AUTHORITY_OWNER_REF_MISSING", `${field} does not resolve`, { value });
    }
  }
  if (!Array.isArray(record.supersedes) || new Set(record.supersedes).size !== record.supersedes.length) {
    failure("AUTHORITY_SUPERSEDES_INVALID", "supersedes must be a unique array");
  }
  if (!Array.isArray(record.protected_boundaries) || record.protected_boundaries.length === 0 || new Set(record.protected_boundaries).size !== record.protected_boundaries.length) {
    failure("AUTHORITY_BOUNDARIES_INVALID", "protected_boundaries must be a non-empty unique array");
  }
  return { ...record, owner_decision_ref: ownerDecisionRef, canonical_path: canonicalPath };
}

function detectCycles(recordsById) {
  const visiting = new Set();
  const visited = new Set();
  const walk = (id) => {
    if (visiting.has(id)) failure("AUTHORITY_SUPERSEDES_CYCLE", "supersedes graph contains a cycle", { authority_id: id });
    if (visited.has(id)) return;
    visiting.add(id);
    for (const target of recordsById.get(id).supersedes) walk(target);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of recordsById.keys()) walk(id);
}

export function validateAuthorityGraph({ records, repositoryRoot = process.cwd() }) {
  if (!Array.isArray(records) || records.length === 0) {
    failure("AUTHORITY_REGISTRY_EMPTY", "authority registry must contain records");
  }
  const normalized = records.map((record) => validateRecordShape(record, repositoryRoot));
  const recordsById = new Map();
  for (const record of normalized) {
    if (recordsById.has(record.authority_id)) {
      failure("AUTHORITY_DUPLICATE_ID", `duplicate authority_id: ${record.authority_id}`);
    }
    recordsById.set(record.authority_id, record);
  }

  const currentByDomain = {};
  for (const record of normalized) {
    if (record.status === "CURRENT_ONLY" || record.status === "BOUNDED_MIGRATION") {
      if (currentByDomain[record.domain]) {
        failure("AUTHORITY_DUPLICATE_CURRENT", `domain has multiple current authorities: ${record.domain}`, { domain: record.domain });
      }
      currentByDomain[record.domain] = record.authority_id;
    }
  }
  for (const domain of new Set(normalized.map((record) => record.domain))) {
    if (!currentByDomain[domain]) failure("AUTHORITY_NO_CURRENT", `domain has no current authority: ${domain}`, { domain });
  }

  for (const record of normalized) {
    for (const targetId of record.supersedes) {
      const target = recordsById.get(targetId);
      if (!target) failure("AUTHORITY_SUPERSEDES_UNKNOWN", `supersedes references an unknown authority: ${targetId}`, { authority_id: record.authority_id, targetId });
      if (target.authority_id === record.authority_id) failure("AUTHORITY_SUPERSEDES_CYCLE", "authority cannot supersede itself", { authority_id: record.authority_id });
      if (target.domain !== record.domain) failure("AUTHORITY_SUPERSEDES_DOMAIN_MISMATCH", "supersedes must remain inside one domain", { authority_id: record.authority_id, targetId });
    }
  }
  detectCycles(recordsById);

  for (const record of normalized) {
    for (const targetId of record.supersedes) {
      const target = recordsById.get(targetId);
      if (record.status === "HISTORICAL_ONLY" && target.status !== "HISTORICAL_ONLY") {
        failure("AUTHORITY_HISTORICAL_RESURRECTION", "historical authority cannot supersede a current authority", { authority_id: record.authority_id, targetId });
      }
      if (target.version >= record.version) failure("AUTHORITY_VERSION_ORDER_INVALID", "an authority may supersede only an older version", { authority_id: record.authority_id, targetId });
    }
  }

  const ordered = normalized.map(canonicalRecord).sort((a, b) => a.authority_id.localeCompare(b.authority_id));
  const graphDigest = crypto.createHash("sha256").update(JSON.stringify({ records: ordered })).digest("hex");
  return {
    ok: true,
    graphDigest,
    currentByDomain: Object.fromEntries(Object.entries(currentByDomain).sort(([a], [b]) => a.localeCompare(b))),
    retiredIds: normalized.filter((record) => record.status === "HISTORICAL_ONLY").map((record) => record.authority_id).sort(),
  };
}

function runCli() {
  const scriptPath = fileURLToPath(import.meta.url);
  const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");
  const registryPath = path.join(repositoryRoot, "project-control/authority/authority-registry.v1.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const result = validateAuthorityGraph({ records: registry.records, repositoryRoot });
  console.log(`AUTHORITY_GRAPH=PASS`);
  console.log(`AUTHORITY_GRAPH_DIGEST=${result.graphDigest}`);
  console.log(`AUTHORITY_CURRENT_DOMAINS=${Object.keys(result.currentByDomain).length}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) runCli();
