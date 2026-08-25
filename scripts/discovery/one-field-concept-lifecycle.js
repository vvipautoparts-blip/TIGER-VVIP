"use strict";

const ALLOWED_PROPOSAL_OPERATIONS = new Set([
  "PROPOSE_CONCEPT",
  "PROPOSE_ATTRIBUTE",
  "PROPOSE_ALIAS",
  "PROPOSE_RELATION",
  "PROPOSE_MERGE",
  "PROPOSE_EXPERIENCE"
]);

const MUTABLE_BRAND_TOKENS = Object.freeze([
  "tiger",
  "vvip",
  "one_field",
  "onefield",
  "mall"
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function plainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeString(value, maxLength = 256) {
  return typeof value === "string"
    && value.trim().length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

function stableId(value, prefix) {
  return safeString(value, 128)
    && value.startsWith(prefix)
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/u.test(value);
}

function assertBrandNeutralConceptId(conceptId) {
  if (!stableId(conceptId, "cpt_")) {
    throw new TypeError("CONCEPT_INVALID_ID");
  }

  const normalized = conceptId.toLowerCase();
  if (MUTABLE_BRAND_TOKENS.some((token) => normalized.includes(token))) {
    throw new TypeError("CONCEPT_ID_NOT_BRAND_NEUTRAL");
  }
}

function copyAliases(values) {
  if (!Array.isArray(values) || values.length === 0 || values.length > 32) {
    throw new TypeError("CONCEPT_ALIASES_INVALID");
  }
  if (new Set(values).size !== values.length) {
    throw new TypeError("CONCEPT_ALIASES_INVALID");
  }
  if (!values.every((value) => safeString(value, 256))) {
    throw new TypeError("CONCEPT_ALIASES_INVALID");
  }
  return [...values];
}

function assertProposalOperation(operation) {
  if (operation === "AI_DIRECT_CANONICAL_WRITE" || operation === "PROMOTE_CANONICAL") {
    throw new TypeError("CONCEPT_DIRECT_CANONICAL_WRITE_DENIED");
  }
  if (!ALLOWED_PROPOSAL_OPERATIONS.has(operation)) {
    throw new TypeError("CONCEPT_PROPOSAL_OPERATION_DENIED");
  }
}

function createConceptProposal(input) {
  if (!plainObject(input)) throw new TypeError("CONCEPT_PROPOSAL_REQUIRED");
  const allowed = new Set([
    "proposalId",
    "operation",
    "conceptId",
    "aliases",
    "proposedBy"
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new TypeError("CONCEPT_PROPOSAL_UNKNOWN_FIELD");
  }
  if (!stableId(input.proposalId, "proposal_")) {
    throw new TypeError("CONCEPT_PROPOSAL_INVALID_ID");
  }
  assertProposalOperation(input.operation);
  assertBrandNeutralConceptId(input.conceptId);
  if (!safeString(input.proposedBy, 64)) {
    throw new TypeError("CONCEPT_PROPOSER_INVALID");
  }

  return deepFreeze({
    proposalId: input.proposalId,
    operation: input.operation,
    conceptId: input.conceptId,
    aliases: copyAliases(input.aliases),
    proposedBy: input.proposedBy,
    state: "ephemeral",
    canonical: false,
    governanceDecisionId: null
  });
}

function copyEvidence(evidence) {
  if (!plainObject(evidence)) throw new TypeError("CONCEPT_EVIDENCE_REQUIRED");
  const allowed = new Set([
    "supplyEvidence",
    "demandEvidence",
    "qualityPassed",
    "duplicationChecked"
  ]);
  if (Object.keys(evidence).some((key) => !allowed.has(key))) {
    throw new TypeError("CONCEPT_EVIDENCE_INVALID");
  }
  for (const key of allowed) {
    if (typeof evidence[key] !== "boolean") {
      throw new TypeError("CONCEPT_EVIDENCE_INVALID");
    }
  }
  return {
    supplyEvidence: evidence.supplyEvidence,
    demandEvidence: evidence.demandEvidence,
    qualityPassed: evidence.qualityPassed,
    duplicationChecked: evidence.duplicationChecked
  };
}

function evidenceGatesMet(evidence) {
  return evidence.supplyEvidence
    && evidence.demandEvidence
    && evidence.qualityPassed
    && evidence.duplicationChecked;
}

function copyGovernanceDecision(decision) {
  if (!plainObject(decision)) throw new TypeError("CONCEPT_GOVERNANCE_REQUIRED");
  const allowed = new Set(["decisionId", "approved"]);
  if (Object.keys(decision).some((key) => !allowed.has(key))) {
    throw new TypeError("CONCEPT_GOVERNANCE_REQUIRED");
  }
  if (!stableId(decision.decisionId, "governance_")) {
    throw new TypeError("CONCEPT_GOVERNANCE_REQUIRED");
  }
  if (decision.approved !== true) {
    throw new TypeError("CONCEPT_GOVERNANCE_REQUIRED");
  }
  return {
    decisionId: decision.decisionId,
    approved: true
  };
}

function copyRecord(record) {
  if (!plainObject(record)
    || !stableId(record.proposalId, "proposal_")
    || !safeString(record.state, 64)) {
    throw new TypeError("CONCEPT_RECORD_INVALID");
  }
  assertBrandNeutralConceptId(record.conceptId);
  return {
    proposalId: record.proposalId,
    operation: record.operation,
    conceptId: record.conceptId,
    aliases: copyAliases(record.aliases),
    proposedBy: record.proposedBy,
    state: record.state,
    canonical: record.canonical === true,
    governanceDecisionId: record.governanceDecisionId ?? null
  };
}

function transitionConcept(input) {
  if (!plainObject(input)) throw new TypeError("CONCEPT_TRANSITION_REQUIRED");
  const allowed = new Set(["record", "action", "evidence", "governanceDecision"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new TypeError("CONCEPT_TRANSITION_UNKNOWN_FIELD");
  }

  const record = copyRecord(input.record);

  if (record.state === "ephemeral" && input.action === "observe") {
    return deepFreeze({ ...record, state: "observed", canonical: false });
  }

  if (record.state === "observed" && input.action === "qualify") {
    const evidence = copyEvidence(input.evidence);
    if (!evidenceGatesMet(evidence)) {
      throw new TypeError("CONCEPT_EVIDENCE_GATES_NOT_MET");
    }
    return deepFreeze({
      ...record,
      state: "canonical_candidate",
      canonical: false
    });
  }

  if (record.state === "canonical_candidate" && input.action === "promote") {
    const governance = copyGovernanceDecision(input.governanceDecision);
    return deepFreeze({
      ...record,
      state: "promoted",
      canonical: true,
      governanceDecisionId: governance.decisionId
    });
  }

  if (record.state === "canonical_candidate" && input.action === "merge") {
    const governance = copyGovernanceDecision(input.governanceDecision);
    return deepFreeze({
      ...record,
      state: "merged",
      canonical: false,
      governanceDecisionId: governance.decisionId
    });
  }

  if (["observed", "canonical_candidate"].includes(record.state)
    && input.action === "reject") {
    const governance = copyGovernanceDecision(input.governanceDecision);
    return deepFreeze({
      ...record,
      state: "rejected",
      canonical: false,
      governanceDecisionId: governance.decisionId
    });
  }

  if (["observed", "canonical_candidate", "promoted"].includes(record.state)
    && input.action === "retire") {
    const governance = copyGovernanceDecision(input.governanceDecision);
    return deepFreeze({
      ...record,
      state: "retired",
      canonical: false,
      governanceDecisionId: governance.decisionId
    });
  }

  throw new TypeError("CONCEPT_STATE_TRANSITION_DENIED");
}

module.exports = Object.freeze({
  createConceptProposal,
  transitionConcept
});
