import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateAssets } from "./evaluator.mjs";
import { collectRepositoryEvidence } from "./inventory.mjs";
import { buildAnalysisReport } from "./planner.mjs";
import { loadGovernanceInputs } from "./registry.mjs";

const MODULE_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(MODULE_PATH), "../..");
const ALLOWED_ARGUMENTS = new Set(["--check", "--report-json"]);
const HIGH_RISK_ERROR_CODES = new Set([
  "ACTION_CLASS_DENIED",
  "PROTECTED_OBLIGATION"
]);
const SAFE_ERROR_CODES = new Set([
  "ACTION_CLASS_DENIED",
  "ANALYSIS_DECISION_INVALID",
  "ANALYSIS_REPORT_INVALID",
  "ASSET_ID_DUPLICATE",
  "ASSET_REGISTRY_INVALID",
  "CLI_ARGUMENT_INVALID",
  "CLI_CONFIGURATION_INVALID",
  "EVIDENCE_INVALID",
  "PATH_ESCAPE_DENIED",
  "POLICY_VERSION_INVALID",
  "PROTECTED_OBLIGATION",
  "REGISTRY_PATH_DUPLICATE"
]);

function isWritableStream(value) {
  return value && typeof value.write === "function";
}

function safeErrorCode(error) {
  const candidate = error instanceof Error ? error.message : "";
  return SAFE_ERROR_CODES.has(candidate)
    ? candidate
    : "INTERNAL_ANALYSIS_FAILED";
}

function writeFailure(stderr, code) {
  stderr.write(`CVGE_CHECK=FAIL CODE=${code}\n`);
}

function validateInvocation({ argv, rootDir, stdout, stderr, now }) {
  if (!Array.isArray(argv)
    || argv.length !== 1
    || !ALLOWED_ARGUMENTS.has(argv[0])) {
    return "CLI_ARGUMENT_INVALID";
  }
  if (typeof rootDir !== "string"
    || rootDir.trim().length === 0
    || rootDir !== rootDir.trim()
    || !isWritableStream(stdout)
    || !isWritableStream(stderr)
    || typeof now !== "function") {
    return "CLI_CONFIGURATION_INVALID";
  }
  return null;
}

function writeCheckSummary(stdout, report) {
  stdout.write("CVGE_REPOSITORY_CHECK=PASS\n");
  stdout.write(`CVGE_POLICY_VERSION=${report.policyVersion}\n`);
  stdout.write(`CVGE_ASSETS_TOTAL=${report.summary.total}\n`);
  stdout.write(`CVGE_PREPARE_REMOVAL=${report.summary.prepareRemoval}\n`);
  stdout.write(`CVGE_QUARANTINE=${report.summary.quarantine}\n`);
  stdout.write(`CVGE_NO_ACTION=${report.summary.noAction}\n`);
  stdout.write(`CVGE_PLAN_HASH=${report.planHash}\n`);
}

export async function runValueGovernanceCli({
  argv,
  rootDir,
  stdout,
  stderr,
  now
} = {}) {
  const invocationError = validateInvocation({ argv, rootDir, stdout, stderr, now });
  if (invocationError) {
    if (isWritableStream(stderr)) writeFailure(stderr, invocationError);
    return 2;
  }

  try {
    const generatedAt = now();
    if (typeof generatedAt !== "string" || !Number.isFinite(Date.parse(generatedAt))) {
      throw new TypeError("CLI_CONFIGURATION_INVALID");
    }

    const { policy, registry } = await loadGovernanceInputs({ rootDir });
    const evidence = await collectRepositoryEvidence({
      rootDir,
      registry,
      now: generatedAt
    });
    const decisions = evaluateAssets({
      policy,
      registry,
      evidence,
      evaluatedAt: generatedAt
    });
    const report = buildAnalysisReport({
      policy,
      decisions,
      generatedAt
    });

    if (argv[0] === "--report-json") {
      stdout.write(`${JSON.stringify(report)}\n`);
    } else {
      writeCheckSummary(stdout, report);
    }
    return 0;
  } catch (error) {
    const code = safeErrorCode(error);
    writeFailure(stderr, code);
    return HIGH_RISK_ERROR_CODES.has(code) ? 3 : 2;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === MODULE_PATH) {
  process.exitCode = await runValueGovernanceCli({
    argv: process.argv.slice(2),
    rootDir: REPOSITORY_ROOT,
    stdout: process.stdout,
    stderr: process.stderr,
    now: () => new Date().toISOString()
  });
}
