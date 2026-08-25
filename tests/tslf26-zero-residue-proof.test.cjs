"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..");

async function loadZeroResidue() {
  return import(
    pathToFileURL(
      path.join(ROOT, "project-control/value-governance/zero-residue.mjs")
    ).href
  );
}

test("zero-residue proof binds exact source and passes only a clean canonical repository state", async () => {
  const zeroResidue = await loadZeroResidue();
  assert.equal(typeof zeroResidue.buildZeroResidueProof, "function");

  const proof = zeroResidue.buildZeroResidueProof({
    sourceCommitSha: "1".repeat(40),
    sourceTreeSha: "2".repeat(40),
    trackedPaths: [
      ".gitignore",
      "index.html",
      "project-control/value-governance/planner.mjs",
      "reports/README.md"
    ],
    worktreeEntries: []
  });

  assert.deepEqual(proof.contract, {
    name: "CVGE_ZERO_RESIDUE_PROOF",
    version: 1
  });
  assert.deepEqual(proof.source, {
    commitSha: "1".repeat(40),
    treeSha: "2".repeat(40)
  });
  assert.equal(proof.status, "PASS");
  assert.equal(proof.zeroResidue, true);
  assert.equal(proof.executable, false);
  assert.deepEqual(proof.findings, []);
  assert.match(proof.proofHash, /^[a-f0-9]{64}$/);
});

test("zero-residue proof fails closed on cleanup residue or dirty worktree", async () => {
  const zeroResidue = await loadZeroResidue();
  assert.equal(typeof zeroResidue.buildZeroResidueProof, "function");

  const proof = zeroResidue.buildZeroResidueProof({
    sourceCommitSha: "1".repeat(40),
    sourceTreeSha: "2".repeat(40),
    trackedPaths: [
      ".venv/lib/python3.12/site-packages/demo.py",
      ".quarantine/run-1/manifest.json",
      "reports/vvip-cleanroom-report.json",
      "reports/VVIP_CLEANROOM_REPORT.md"
    ],
    worktreeEntries: ["?? scratch.tmp"]
  });

  assert.equal(proof.status, "BLOCKED");
  assert.equal(proof.zeroResidue, false);
  assert.deepEqual(
    proof.findings.map((finding) => finding.code),
    [
      "LOCAL_ENVIRONMENT_RESIDUE",
      "QUARANTINE_STAGING_RESIDUE",
      "STALE_CLEANROOM_EVIDENCE",
      "STALE_CLEANROOM_EVIDENCE",
      "WORKTREE_RESIDUE"
    ]
  );
});

test("zero-residue proof is deterministic and rejects invalid source identity or unsafe evidence shapes", async () => {
  const zeroResidue = await loadZeroResidue();
  assert.equal(typeof zeroResidue.buildZeroResidueProof, "function");

  const input = {
    sourceCommitSha: "1".repeat(40),
    sourceTreeSha: "2".repeat(40),
    trackedPaths: ["index.html", "scripts/app.js"],
    worktreeEntries: []
  };
  assert.deepEqual(
    zeroResidue.buildZeroResidueProof(input),
    zeroResidue.buildZeroResidueProof({
      ...input,
      trackedPaths: [...input.trackedPaths].reverse()
    })
  );

  assert.throws(
    () => zeroResidue.buildZeroResidueProof({
      ...input,
      sourceCommitSha: "invalid"
    }),
    /ZERO_RESIDUE_PROOF_INVALID/
  );
  assert.throws(
    () => zeroResidue.buildZeroResidueProof({
      ...input,
      trackedPaths: ["../outside-repository"]
    }),
    /ZERO_RESIDUE_PROOF_INVALID/
  );
});
