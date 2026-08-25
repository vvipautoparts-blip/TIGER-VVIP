import { createHash } from "node:crypto";
import path from "node:path";

import { deepFreeze, isPlainObject } from "./contracts.mjs";

const ZERO_RESIDUE_CONTRACT = Object.freeze({
  name: "CVGE_ZERO_RESIDUE_PROOF",
  version: 1
});

const GIT_OBJECT_ID_PATTERN = /^[a-f0-9]{40}$/;
const LOCAL_ENVIRONMENT_ROOTS = new Set([
  ".venv",
  "venv",
  ".virtualenv",
  ".tox",
  ".nox"
]);
const STALE_CLEANROOM_EVIDENCE = new Set([
  "reports/vvip-cleanroom-report.json",
  "reports/VVIP_CLEANROOM_REPORT.md"
]);

const FINDING_PRIORITY = Object.freeze({
  LOCAL_ENVIRONMENT_RESIDUE: 10,
  QUARANTINE_STAGING_RESIDUE: 20,
  STALE_CLEANROOM_EVIDENCE: 30,
  WORKTREE_RESIDUE: 40
});

function fail() {
  throw new TypeError("ZERO_RESIDUE_PROOF_INVALID");
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
    normalized[key] = canonicalize(value[key]);
  }
  return normalized;
}

function hashCanonical(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");
}

function validateGitObjectId(value) {
  if (typeof value !== "string" || !GIT_OBJECT_ID_PATTERN.test(value)) fail();
  return value;
}

function validateRepositoryPath(value) {
  if (typeof value !== "string"
    || value.length === 0
    || value.length > 1024
    || value !== value.trim()
    || value.includes("\0")
    || value.includes("\\")
    || path.posix.isAbsolute(value)
    || path.win32.isAbsolute(value)) {
    fail();
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    fail();
  }
  return value;
}

function validateUniqueSortedPaths(value) {
  if (!Array.isArray(value) || value.length > 100_000) fail();
  const normalized = value.map((entry) => validateRepositoryPath(entry)).sort();
  if (new Set(normalized).size !== normalized.length) fail();
  return normalized;
}

function validateWorktreeEntries(value) {
  if (!Array.isArray(value) || value.length > 100_000) fail();
  const normalized = value.map((entry) => {
    if (typeof entry !== "string"
      || entry.length === 0
      || entry.length > 2048
      || entry.includes("\0")
      || entry.includes("\r")
      || entry.includes("\n")) {
      fail();
    }
    return entry;
  }).sort();
  if (new Set(normalized).size !== normalized.length) fail();
  return normalized;
}

function trackedFinding(repositoryPath) {
  const firstSegment = repositoryPath.split("/", 1)[0].toLowerCase();
  if (LOCAL_ENVIRONMENT_ROOTS.has(firstSegment)) {
    return { code: "LOCAL_ENVIRONMENT_RESIDUE", path: repositoryPath };
  }
  if (repositoryPath === ".quarantine" || repositoryPath.startsWith(".quarantine/")) {
    return { code: "QUARANTINE_STAGING_RESIDUE", path: repositoryPath };
  }
  if (STALE_CLEANROOM_EVIDENCE.has(repositoryPath)) {
    return { code: "STALE_CLEANROOM_EVIDENCE", path: repositoryPath };
  }
  return null;
}

function sortFindings(findings) {
  return findings.sort((left, right) => {
    const priority = FINDING_PRIORITY[left.code] - FINDING_PRIORITY[right.code];
    if (priority !== 0) return priority;
    return left.path.localeCompare(right.path);
  });
}

export function buildZeroResidueProof({
  sourceCommitSha,
  sourceTreeSha,
  trackedPaths,
  worktreeEntries
} = {}) {
  const source = {
    commitSha: validateGitObjectId(sourceCommitSha),
    treeSha: validateGitObjectId(sourceTreeSha)
  };
  const tracked = validateUniqueSortedPaths(trackedPaths);
  const worktree = validateWorktreeEntries(worktreeEntries);

  const findings = [];
  for (const repositoryPath of tracked) {
    const finding = trackedFinding(repositoryPath);
    if (finding) findings.push(finding);
  }
  for (const entry of worktree) {
    findings.push({ code: "WORKTREE_RESIDUE", path: entry });
  }
  sortFindings(findings);

  const zeroResidue = findings.length === 0;
  const semanticProof = {
    contract: ZERO_RESIDUE_CONTRACT,
    source,
    status: zeroResidue ? "PASS" : "BLOCKED",
    zeroResidue,
    trackedPathCount: tracked.length,
    worktreeEntryCount: worktree.length,
    findings,
    executable: false
  };

  return deepFreeze({
    ...semanticProof,
    proofHash: hashCanonical(semanticProof)
  });
}
