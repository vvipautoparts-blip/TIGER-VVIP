"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulePath = path.resolve(
  __dirname,
  "../scripts/discovery/one-field-concept-lifecycle.js"
);

function loadLifecycle() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function proposalInput() {
  return {
    proposalId: "proposal_concept_cereal_01",
    operation: "PROPOSE_CONCEPT",
    conceptId: "cpt_candidate_breakfast_cereal_01",
    aliases: ["Breakfast cereal", "حبوب الإفطار"],
    proposedBy: "ai"
  };
}

test("AI may create an immutable ephemeral concept proposal but not canonical state", () => {
  const { createConceptProposal } = loadLifecycle();
  const proposal = createConceptProposal(proposalInput());

  assert.equal(proposal.state, "ephemeral");
  assert.equal(proposal.canonical, false);
  assert.equal(proposal.operation, "PROPOSE_CONCEPT");
  assert.equal(Object.isFrozen(proposal), true);
  assert.equal(Object.isFrozen(proposal.aliases), true);
});

test("direct canonical write or direct promotion operations are denied", () => {
  const { createConceptProposal } = loadLifecycle();

  for (const operation of ["AI_DIRECT_CANONICAL_WRITE", "PROMOTE_CANONICAL"]) {
    const input = proposalInput();
    input.operation = operation;
    assert.throws(
      () => createConceptProposal(input),
      /CONCEPT_DIRECT_CANONICAL_WRITE_DENIED/,
      operation
    );
  }
});

test("lifecycle rejects invalid state jumps such as ephemeral directly to promoted", () => {
  const { createConceptProposal, transitionConcept } = loadLifecycle();
  const proposal = createConceptProposal(proposalInput());

  assert.throws(
    () => transitionConcept({
      record: proposal,
      action: "promote",
      governanceDecision: {
        decisionId: "governance_concept_01",
        approved: true
      }
    }),
    /CONCEPT_STATE_TRANSITION_DENIED/
  );
});

test("canonical candidate qualification requires supply demand quality and duplication evidence gates", () => {
  const { createConceptProposal, transitionConcept } = loadLifecycle();
  const proposal = createConceptProposal(proposalInput());
  const observed = transitionConcept({
    record: proposal,
    action: "observe"
  });

  assert.equal(observed.state, "observed");

  assert.throws(
    () => transitionConcept({
      record: observed,
      action: "qualify",
      evidence: {
        supplyEvidence: true,
        demandEvidence: true,
        qualityPassed: true,
        duplicationChecked: false
      }
    }),
    /CONCEPT_EVIDENCE_GATES_NOT_MET/
  );

  const candidate = transitionConcept({
    record: observed,
    action: "qualify",
    evidence: {
      supplyEvidence: true,
      demandEvidence: true,
      qualityPassed: true,
      duplicationChecked: true
    }
  });

  assert.equal(candidate.state, "canonical_candidate");
  assert.equal(candidate.canonical, false);
});

test("promotion requires an explicit approved governance decision", () => {
  const { createConceptProposal, transitionConcept } = loadLifecycle();
  const proposal = createConceptProposal(proposalInput());
  const observed = transitionConcept({ record: proposal, action: "observe" });
  const candidate = transitionConcept({
    record: observed,
    action: "qualify",
    evidence: {
      supplyEvidence: true,
      demandEvidence: true,
      qualityPassed: true,
      duplicationChecked: true
    }
  });

  assert.throws(
    () => transitionConcept({ record: candidate, action: "promote" }),
    /CONCEPT_GOVERNANCE_REQUIRED/
  );

  const promoted = transitionConcept({
    record: candidate,
    action: "promote",
    governanceDecision: {
      decisionId: "governance_concept_01",
      approved: true
    }
  });

  assert.equal(promoted.state, "promoted");
  assert.equal(promoted.canonical, true);
  assert.equal(promoted.conceptId, candidate.conceptId);
  assert.equal(promoted.governanceDecisionId, "governance_concept_01");
  assert.equal(Object.isFrozen(promoted), true);
});

test("canonical concept identifiers cannot embed mutable platform or view brand labels", () => {
  const { createConceptProposal } = loadLifecycle();

  for (const conceptId of [
    "cpt_tiger_breakfast_cereal",
    "cpt_vvip_breakfast_cereal",
    "cpt_one_field_breakfast_cereal",
    "cpt_mall_breakfast_cereal"
  ]) {
    const input = proposalInput();
    input.conceptId = conceptId;
    assert.throws(
      () => createConceptProposal(input),
      /CONCEPT_ID_NOT_BRAND_NEUTRAL/,
      conceptId
    );
  }
});
