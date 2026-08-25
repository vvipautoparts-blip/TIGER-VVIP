#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { buildZeroResidueProof } from "./zero-residue.mjs";

const EXIT_USAGE = 2;
const EXIT_BLOCKED = 3;
const EXIT_INTERNAL = 4;

function failUsage() {
  process.stderr.write("ZERO_RESIDUE_CLI_INVALID\n");
  process.exit(EXIT_USAGE);
}

function parseArgs(argv) {
  let check = false;
  let reportJson = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      if (check) failUsage();
      check = true;
      continue;
    }
    if (arg === "--report-json") {
      if (reportJson !== null || index + 1 >= argv.length) failUsage();
      reportJson = argv[index + 1];
      index += 1;
      continue;
    }
    failUsage();
  }

  if (!check && reportJson === null) failUsage();
  return { check, reportJson };
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024
  }).replace(/\r\n/g, "\n");
}

function repositoryRoot() {
  return path.resolve(git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim());
}

function ensureExternalReportPath(root, candidate) {
  if (candidate === null) return null;
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.includes("\0")) {
    failUsage();
  }

  const resolved = path.resolve(process.cwd(), candidate);
  const relative = path.relative(root, resolved);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    process.stderr.write("ZERO_RESIDUE_REPORT_MUST_BE_EXTERNAL\n");
    process.exit(EXIT_USAGE);
  }
  return resolved;
}

function trackedPaths(root) {
  const output = git(root, ["ls-files", "-z"]);
  if (output.length === 0) return [];
  return output.split("\0").filter(Boolean);
}

function worktreeEntries(root) {
  const output = git(root, ["status", "--porcelain=v1", "-uall"]);
  if (output.length === 0) return [];
  return output.split("\n").filter(Boolean);
}

function sourceIdentity(root) {
  return {
    sourceCommitSha: git(root, ["rev-parse", "HEAD"]).trim(),
    sourceTreeSha: git(root, ["rev-parse", "HEAD^{tree}"]).trim()
  };
}

function writeExternalJson(reportPath, proof) {
  if (reportPath === null) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(reportPath, `${JSON.stringify(proof, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = repositoryRoot();
  const reportPath = ensureExternalReportPath(root, args.reportJson);
  const source = sourceIdentity(root);

  const proof = buildZeroResidueProof({
    ...source,
    trackedPaths: trackedPaths(root),
    worktreeEntries: worktreeEntries(root)
  });

  writeExternalJson(reportPath, proof);

  process.stdout.write(`ZERO_RESIDUE_STATUS=${proof.status}\n`);
  process.stdout.write(`ZERO_RESIDUE_PROOF_HASH=${proof.proofHash}\n`);
  process.stdout.write(`ZERO_RESIDUE_FINDINGS=${proof.findings.length}\n`);

  if (args.check && proof.status !== "PASS") {
    process.exit(EXIT_BLOCKED);
  }
}

try {
  main();
} catch (error) {
  if (error && error.code === "ENOENT") {
    process.stderr.write("ZERO_RESIDUE_GIT_UNAVAILABLE\n");
  } else {
    process.stderr.write("ZERO_RESIDUE_INTERNAL_ERROR\n");
  }
  process.exit(EXIT_INTERNAL);
}
