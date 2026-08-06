import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir,
  realpath
} from "node:fs/promises";
import path from "node:path";

import {
  deepFreeze,
  isPlainObject,
  validateAssetId
} from "./contracts.mjs";

const MAX_REFERENCE_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_ASSETS = 10_000;
const MAX_REPOSITORY_FILES = 100_000;
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".py",
  ".sh",
  ".sql",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml"
]);
const IGNORED_DIRECTORIES = new Set([".git", "node_modules"]);
const NON_DEPENDENCY_METADATA_PATHS = new Set([
  "project-control/schemas/value_asset.schema.json",
  "project-control/value-governance/policy.v1.json",
  "project-control/value-governance/registry.v1.json"
]);

function boundedText(value, max) {
  return typeof value === "string"
    && value.trim().length > 0
    && value.trim().length <= max;
}

function isSafeRelativePath(value) {
  if (!boundedText(value, 512)
    || value !== value.trim()
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

function isInsideRoot(rootDir, candidate) {
  const relative = path.relative(rootDir, candidate);
  return relative === ""
    || (!relative.startsWith(`..${path.sep}`)
      && relative !== ".."
      && !path.isAbsolute(relative));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function countLiteralOccurrences(text, needle) {
  if (needle.length === 0) return 0;
  let count = 0;
  let offset = 0;
  while (offset <= text.length - needle.length) {
    const found = text.indexOf(needle, offset);
    if (found === -1) break;
    count += 1;
    offset = found + needle.length;
  }
  return count;
}

function validateInputs(rootDir, registry, now) {
  if (!boundedText(rootDir, 4_096)
    || !isPlainObject(registry)
    || !Array.isArray(registry.assets)
    || registry.assets.length === 0
    || registry.assets.length > MAX_ASSETS
    || typeof now !== "string"
    || !Number.isFinite(Date.parse(now))) {
    throw new TypeError("EVIDENCE_INVALID");
  }

  const assetIds = new Set();
  for (const asset of registry.assets) {
    if (!isPlainObject(asset)
      || !validateAssetId(asset.assetId)
      || !isSafeRelativePath(asset.path)
      || assetIds.has(asset.assetId)) {
      throw new TypeError("EVIDENCE_INVALID");
    }
    assetIds.add(asset.assetId);
  }
}

async function listReferenceSources(rootDir) {
  const files = [];

  async function visit(relativeDir) {
    const absoluteDir = relativeDir === ""
      ? rootDir
      : path.join(rootDir, ...relativeDir.split("/"));
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      const relativePath = relativeDir === ""
        ? entry.name
        : `${relativeDir}/${entry.name}`;
      const absolutePath = path.join(rootDir, ...relativePath.split("/"));

      if (entry.isDirectory()) {
        await visit(relativePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (NON_DEPENDENCY_METADATA_PATHS.has(relativePath)) continue;

      const extension = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXTENSIONS.has(extension)) continue;
      const metadata = await lstat(absolutePath);
      if (metadata.size > MAX_REFERENCE_TEXT_BYTES) continue;
      files.push({ absolutePath, relativePath });
      if (files.length > MAX_REPOSITORY_FILES) {
        throw new TypeError("EVIDENCE_INVALID");
      }
    }
  }

  await visit("");
  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return files;
}

async function collectReferenceCounts(rootDir, assets) {
  const counts = new Map(assets.map((asset) => [asset.path, 0]));
  const sources = await listReferenceSources(rootDir);

  for (const source of sources) {
    const bytes = await readFile(source.absolutePath);
    if (bytes.includes(0)) continue;
    const text = bytes.toString("utf8");
    for (const asset of assets) {
      const occurrences = countLiteralOccurrences(text, asset.path);
      if (occurrences > 0) {
        counts.set(asset.path, counts.get(asset.path) + occurrences);
      }
    }
  }
  return counts;
}

function unavailableEvidence(asset, kind, code) {
  return {
    assetId: asset.assetId,
    path: asset.path,
    exists: false,
    kind,
    size: null,
    sha256: null,
    referenceCount: 0,
    evidenceCodes: [code]
  };
}

async function collectAssetEvidence(rootDir, asset, referenceCounts) {
  const candidate = path.resolve(rootDir, ...asset.path.split("/"));
  if (!isInsideRoot(rootDir, candidate)) {
    return unavailableEvidence(asset, "denied", "PATH_ESCAPE_DENIED");
  }

  let initialMetadata;
  try {
    initialMetadata = await lstat(candidate);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      return unavailableEvidence(asset, "missing", "ASSET_MISSING");
    }
    throw error;
  }

  let canonicalCandidate;
  try {
    canonicalCandidate = await realpath(candidate);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      return unavailableEvidence(asset, "missing", "ASSET_MISSING");
    }
    throw error;
  }

  if (!isInsideRoot(rootDir, canonicalCandidate)) {
    return unavailableEvidence(asset, "denied", "PATH_ESCAPE_DENIED");
  }

  const metadata = initialMetadata.isSymbolicLink()
    ? await lstat(canonicalCandidate)
    : initialMetadata;
  if (!metadata.isFile()) {
    return unavailableEvidence(asset, "invalid", "EVIDENCE_INVALID");
  }

  const bytes = await readFile(canonicalCandidate);
  return {
    assetId: asset.assetId,
    path: asset.path,
    exists: true,
    kind: "file",
    size: bytes.length,
    sha256: sha256(bytes),
    referenceCount: referenceCounts.get(asset.path) ?? 0,
    evidenceCodes: [
      "FILE_EXISTS",
      "REFERENCE_COUNT_COLLECTED",
      "SHA256_COLLECTED"
    ]
  };
}

export async function collectRepositoryEvidence({ rootDir, registry, now } = {}) {
  validateInputs(rootDir, registry, now);
  const canonicalRoot = await realpath(rootDir);
  const assets = [...registry.assets].sort((left, right) => left.assetId.localeCompare(right.assetId));
  const referenceCounts = await collectReferenceCounts(canonicalRoot, assets);
  const evidence = [];

  for (const asset of assets) {
    evidence.push(await collectAssetEvidence(canonicalRoot, asset, referenceCounts));
  }

  return deepFreeze({
    generatedAt: now,
    assets: evidence
  });
}
