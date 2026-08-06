import {
  ACTION_CLASSES,
  LIFECYCLE_STATES,
  deepFreeze,
  isPlainObject,
  validateAssetId,
  validateSha256
} from "./contracts.mjs";
import {
  validatePolicy,
  validateRegistry
} from "./registry.mjs";

const KNOWN_EVIDENCE_CODES = new Set([
  "ASSET_MISSING",
  "CANONICAL_REPLACEMENT_VERIFIED",
  "EVIDENCE_INVALID",
  "FILE_EXISTS",
  "PATH_ESCAPE_DENIED",
  "REFERENCE_COUNT_COLLECTED",
  "ROLLBACK_REPRODUCIBLE",
  "SHA256_COLLECTED"
]);

const INCOMPLETE_EVIDENCE_CODES = new Set([
  "ASSET_MISSING",
  "PATH_ESCAPE_DENIED"
]);

function boundedText(value, max) {
  return typeof value === "string"
    && value.trim().length > 0
    && value.trim().length <= max;
}

function validEvidenceRecord(value) {
  return isPlainObject(value)
    && validateAssetId(value.assetId)
    && boundedText(value.path, 512)
    && typeof value.exists === "boolean"
    && boundedText(value.kind, 64)
    && (value.size === null
      || (Number.isSafeInteger(value.size) && value.size >= 0))
    && (value.sha256 === null || validateSha256(value.sha256))
    && Number.isSafeInteger(value.referenceCount)
    && value.referenceCount >= 0
    && Array.isArray(value.evidenceCodes)
    && value.evidenceCodes.length > 0
    && value.evidenceCodes.length <= 32
    && value.evidenceCodes.every((code) => boundedText(code, 96))
    && new Set(value.evidenceCodes).size === value.evidenceCodes.length;
}

function evidenceCodeSet(evidence) {
  return new Set(evidence.evidenceCodes);
}

function hasUnknownEvidence(evidence) {
  return evidence.evidenceCodes.some((code) => !KNOWN_EVIDENCE_CODES.has(code));
}

function hasContradictoryEvidence(evidence, codes) {
  if (evidence.exists) {
    return evidence.kind !== "file"
      || evidence.size === null
      || !validateSha256(evidence.sha256)
      || !codes.has("FILE_EXISTS")
      || !codes.has("SHA256_COLLECTED")
      || codes.has("ASSET_MISSING")
      || codes.has("PATH_ESCAPE_DENIED");
  }

  return evidence.size !== null
    || evidence.sha256 !== null
    || codes.has("FILE_EXISTS")
    || codes.has("SHA256_COLLECTED")
    || (!codes.has("ASSET_MISSING") && !codes.has("PATH_ESCAPE_DENIED"));
}

function expectedEvidenceComplete(asset, evidence, codes) {
  return asset.expectedEvidence.every((requirement) => {
    switch (requirement) {
      case "file_exists":
        return evidence.exists === true && codes.has("FILE_EXISTS");
      case "sha256":
        return validateSha256(evidence.sha256) && codes.has("SHA256_COLLECTED");
      case "reference_count":
        return Number.isSafeInteger(evidence.referenceCount)
          && evidence.referenceCount >= 0
          && codes.has("REFERENCE_COUNT_COLLECTED");
      case "rollback_reproducible":
        return codes.has("ROLLBACK_REPRODUCIBLE");
      case "canonical_replacement":
        return asset.canonicalReplacement !== null
          && codes.has("CANONICAL_REPLACEMENT_VERIFIED");
      default:
        return false;
    }
  });
}

function evidenceHashes(evidence) {
  return validateSha256(evidence?.sha256)
    ? Object.freeze([evidence.sha256])
    : Object.freeze([]);
}

function buildDecision(asset, {
  proposedState = asset.lifecycleState,
  decision = "NO_ACTION",
  reasonCodes,
  confidence,
  evidence
}) {
  return deepFreeze({
    assetId: asset.assetId,
    path: asset.path,
    currentState: asset.lifecycleState,
    proposedState,
    actionClass: asset.actionClass,
    decision,
    reasonCodes: [...reasonCodes].sort(),
    confidence,
    evidenceHashes: evidenceHashes(evidence)
  });
}

function evaluateAsset(asset, evidence, policy) {
  if (asset.actionClass === "C" || asset.protectedObligations.length > 0) {
    const complete = validEvidenceRecord(evidence)
      && !hasUnknownEvidence(evidence)
      && !hasContradictoryEvidence(evidence, evidenceCodeSet(evidence))
      && expectedEvidenceComplete(asset, evidence, evidenceCodeSet(evidence));
    return buildDecision(asset, {
      proposedState: "PROTECTED",
      reasonCodes: ["PROTECTED_OBLIGATION"],
      confidence: complete ? 1 : 0,
      evidence
    });
  }

  if (!validEvidenceRecord(evidence)) {
    return buildDecision(asset, {
      reasonCodes: ["EVIDENCE_INCOMPLETE"],
      confidence: 0,
      evidence: null
    });
  }

  const codes = evidenceCodeSet(evidence);
  if (hasUnknownEvidence(evidence)
    || codes.has("EVIDENCE_INVALID")
    || hasContradictoryEvidence(evidence, codes)) {
    return buildDecision(asset, {
      reasonCodes: ["EVIDENCE_INVALID"],
      confidence: 0,
      evidence
    });
  }

  if ([...codes].some((code) => INCOMPLETE_EVIDENCE_CODES.has(code))
    || !expectedEvidenceComplete(asset, evidence, codes)) {
    return buildDecision(asset, {
      reasonCodes: ["EVIDENCE_INCOMPLETE"],
      confidence: 0,
      evidence
    });
  }

  if (evidence.referenceCount > 0) {
    return buildDecision(asset, {
      reasonCodes: ["DEPENDENCY_UNRESOLVED"],
      confidence: 1,
      evidence
    });
  }

  if (asset.actionClass === "A"
    && policy.automaticRemovalClasses.includes("A")
    && codes.has("ROLLBACK_REPRODUCIBLE")
    && ["DEPRECATION_CANDIDATE", "QUARANTINED"].includes(asset.lifecycleState)) {
    return buildDecision(asset, {
      proposedState: "REMOVAL_READY",
      decision: "PREPARE_REMOVAL",
      reasonCodes: [
        "DEPENDENCY_FREE",
        "ROLLBACK_REPRODUCIBLE",
        "VALUE_NOT_PRESENT"
      ],
      confidence: 1,
      evidence
    });
  }

  if (asset.actionClass === "B"
    && policy.automaticQuarantineClasses.includes("B")
    && asset.lifecycleState === "DEPRECATION_CANDIDATE") {
    return buildDecision(asset, {
      proposedState: "QUARANTINED",
      decision: "QUARANTINE",
      reasonCodes: ["QUARANTINE_REQUIRED"],
      confidence: 1,
      evidence
    });
  }

  return buildDecision(asset, {
    reasonCodes: ["VALUE_NOT_PROVEN_ZERO"],
    confidence: 1,
    evidence
  });
}

export function evaluateAssets({ policy, registry, evidence } = {}) {
  const policyDecision = validatePolicy(policy);
  if (!policyDecision.ok) throw new TypeError(policyDecision.code);
  const registryDecision = validateRegistry(registry, policy);
  if (!registryDecision.ok) throw new TypeError(registryDecision.code);
  if (!isPlainObject(evidence)
    || typeof evidence.generatedAt !== "string"
    || !Number.isFinite(Date.parse(evidence.generatedAt))
    || !Array.isArray(evidence.assets)
    || evidence.assets.length > 10_000) {
    throw new TypeError("EVIDENCE_INVALID");
  }

  const evidenceByAssetId = new Map();
  for (const record of evidence.assets) {
    if (!isPlainObject(record)
      || !validateAssetId(record.assetId)
      || evidenceByAssetId.has(record.assetId)) {
      throw new TypeError("EVIDENCE_INVALID");
    }
    evidenceByAssetId.set(record.assetId, record);
  }

  const registeredIds = new Set(registry.assets.map((asset) => asset.assetId));
  for (const assetId of evidenceByAssetId.keys()) {
    if (!registeredIds.has(assetId)) throw new TypeError("EVIDENCE_INVALID");
  }

  const decisions = [...registry.assets]
    .sort((left, right) => left.assetId.localeCompare(right.assetId))
    .map((asset) => {
      const record = evidenceByAssetId.get(asset.assetId);
      if (record && record.path !== asset.path) {
        return buildDecision(asset, {
          reasonCodes: ["EVIDENCE_INVALID"],
          confidence: 0,
          evidence: record
        });
      }
      return evaluateAsset(asset, record, policy);
    });

  for (const decision of decisions) {
    if (!ACTION_CLASSES.includes(decision.actionClass)
      || !LIFECYCLE_STATES.includes(decision.currentState)
      || !LIFECYCLE_STATES.includes(decision.proposedState)) {
      throw new TypeError("EVIDENCE_INVALID");
    }
  }

  return deepFreeze(decisions);
}
