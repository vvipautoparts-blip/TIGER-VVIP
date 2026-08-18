"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/finance/vvip-attribution-policy.js")
).href;

async function loadPolicy() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

const LOCKED_AT = "2026-08-19T12:00:00.000Z";

function evidence(overrides = {}) {
  return {
    evidenceId: "ev_default_001",
    type: "VERIFIED_LEAD",
    capturedAt: "2026-08-19T11:00:00.000Z",
    marketerId: "mkt_4412",
    managerAssignmentId: "asn_sector_038",
    sectorId: "JO:AUTOMOTIVE",
    ...overrides
  };
}

test("checkout code outranks lower-priority valid evidence", async () => {
  const { ATTRIBUTION_POLICY_VERSION, resolveAttribution } = await loadPolicy();
  const result = resolveAttribution({
    transactionId: "txn_attr_priority_001",
    lockedAt: LOCKED_AT,
    evidence: [
      evidence({
        evidenceId: "ev_cookie_001",
        type: "CONSENTED_FIRST_PARTY_COOKIE",
        capturedAt: "2026-08-18T12:00:00.000Z",
        marketerId: "mkt_cookie",
        managerAssignmentId: "asn_cookie"
      }),
      evidence({
        evidenceId: "ev_checkout_001",
        type: "CHECKOUT_CODE",
        capturedAt: "2026-08-19T11:59:00.000Z",
        marketerId: "mkt_checkout",
        managerAssignmentId: "asn_checkout"
      })
    ]
  });

  assert.equal(ATTRIBUTION_POLICY_VERSION, "VVIP_ATTRIBUTION_2026_08_19_V2_1");
  assert.deepEqual(result, {
    policyVersion: ATTRIBUTION_POLICY_VERSION,
    transactionId: "txn_attr_priority_001",
    status: "ATTRIBUTED",
    saleChannel: "REFERRED_SALE",
    lockedAt: LOCKED_AT,
    winningEvidenceId: "ev_checkout_001",
    evidenceType: "CHECKOUT_CODE",
    marketerId: "mkt_checkout",
    managerAssignmentId: "asn_checkout",
    sectorId: "JO:AUTOMOTIVE"
  });
  assert.equal(Object.isFrozen(result), true);
});

test("7, 30, and 60 day evidence is valid at the exact boundary", async () => {
  const { resolveAttribution } = await loadPolicy();
  const cases = [
    ["CONSENTED_FIRST_PARTY_COOKIE", "2026-08-12T12:00:00.000Z"],
    ["VERIFIED_ORDER_START", "2026-07-20T12:00:00.000Z"],
    ["VERIFIED_LEAD", "2026-06-20T12:00:00.000Z"]
  ];

  for (const [type, capturedAt] of cases) {
    const result = resolveAttribution({
      transactionId: `txn_exact_window_${type.toLowerCase()}`,
      lockedAt: LOCKED_AT,
      evidence: [evidence({
        evidenceId: `ev_exact_window_${type.toLowerCase()}`,
        type,
        capturedAt
      })]
    });
    assert.equal(result.status, "ATTRIBUTED");
    assert.equal(result.evidenceType, type);
  }
});

test("evidence one millisecond beyond each window expires to a direct sale", async () => {
  const { resolveAttribution } = await loadPolicy();
  const cases = [
    ["CONSENTED_FIRST_PARTY_COOKIE", "2026-08-12T11:59:59.999Z"],
    ["VERIFIED_ORDER_START", "2026-07-20T11:59:59.999Z"],
    ["VERIFIED_LEAD", "2026-06-20T11:59:59.999Z"],
    ["CHECKOUT_CODE", "2026-08-18T23:59:59.999Z"]
  ];

  for (const [type, capturedAt] of cases) {
    const result = resolveAttribution({
      transactionId: `txn_expired_window_${type.toLowerCase()}`,
      lockedAt: LOCKED_AT,
      evidence: [evidence({
        evidenceId: `ev_expired_window_${type.toLowerCase()}`,
        type,
        capturedAt
      })]
    });
    assert.deepEqual(result, {
      policyVersion: "VVIP_ATTRIBUTION_2026_08_19_V2_1",
      transactionId: `txn_expired_window_${type.toLowerCase()}`,
      status: "DIRECT_PLATFORM",
      saleChannel: "DIRECT_PLATFORM",
      lockedAt: LOCKED_AT,
      winningEvidenceId: null,
      evidenceType: null,
      marketerId: null,
      managerAssignmentId: null,
      sectorId: null
    });
  }
});

test("newest evidence wins deterministic ties within the same priority", async () => {
  const { resolveAttribution } = await loadPolicy();
  const result = resolveAttribution({
    transactionId: "txn_attr_newest_001",
    lockedAt: LOCKED_AT,
    evidence: [
      evidence({
        evidenceId: "ev_lead_old_001",
        capturedAt: "2026-08-18T10:00:00.000Z",
        marketerId: "mkt_old_001"
      }),
      evidence({
        evidenceId: "ev_lead_new_001",
        capturedAt: "2026-08-18T11:00:00.000Z",
        marketerId: "mkt_new_001"
      })
    ]
  });

  assert.equal(result.winningEvidenceId, "ev_lead_new_001");
  assert.equal(result.marketerId, "mkt_new_001");
});

test("no eligible claim is direct and risk-only evidence never awards commission", async () => {
  const { resolveAttribution } = await loadPolicy();
  const none = resolveAttribution({
    transactionId: "txn_attr_direct_none_001",
    lockedAt: LOCKED_AT
  });
  const riskOnly = resolveAttribution({
    transactionId: "txn_attr_direct_risk_001",
    lockedAt: LOCKED_AT,
    evidence: [
      {
        evidenceId: "ev_device_risk_001",
        type: "DEVICE_RISK_SIGNAL",
        capturedAt: "2026-08-19T11:00:00.000Z"
      },
      {
        evidenceId: "ev_payment_risk_001",
        type: "PAYMENT_RISK_SIGNAL",
        capturedAt: "2026-08-19T11:30:00.000Z"
      }
    ]
  });

  for (const result of [none, riskOnly]) {
    assert.equal(result.status, "DIRECT_PLATFORM");
    assert.equal(result.saleChannel, "DIRECT_PLATFORM");
    assert.equal(result.winningEvidenceId, null);
    assert.equal(result.marketerId, null);
    assert.equal(result.managerAssignmentId, null);
  }
});

test("fraud review remains non-postable and carries no beneficiary", async () => {
  const { resolveAttribution } = await loadPolicy();
  const result = resolveAttribution({
    transactionId: "txn_attr_review_001",
    lockedAt: LOCKED_AT,
    fraudReviewRequired: true,
    evidence: [evidence()]
  });

  assert.deepEqual(result, {
    policyVersion: "VVIP_ATTRIBUTION_2026_08_19_V2_1",
    transactionId: "txn_attr_review_001",
    status: "ATTRIBUTION_REVIEW",
    saleChannel: null,
    lockedAt: LOCKED_AT,
    winningEvidenceId: null,
    evidenceType: null,
    marketerId: null,
    managerAssignmentId: null,
    sectorId: null
  });
});

test("eligible evidence fails closed when identity or sector binding is incomplete", async () => {
  const { resolveAttribution } = await loadPolicy();

  for (const missingField of [
    "evidenceId",
    "marketerId",
    "managerAssignmentId",
    "sectorId"
  ]) {
    const invalid = evidence();
    delete invalid[missingField];
    assert.throws(
      () => resolveAttribution({
        transactionId: `txn_attr_missing_${missingField}`,
        lockedAt: LOCKED_AT,
        evidence: [invalid]
      }),
      /VVIP_INVALID_ATTRIBUTION_EVIDENCE/
    );
  }
});

test("resolver rejects unknown evidence and invalid or future time", async () => {
  const { resolveAttribution } = await loadPolicy();

  assert.throws(
    () => resolveAttribution({
      transactionId: "txn_attr_unknown_type_001",
      lockedAt: LOCKED_AT,
      evidence: [evidence({ type: "BROWSER_FINGERPRINT" })]
    }),
    /VVIP_INVALID_ATTRIBUTION_EVIDENCE/
  );
  assert.throws(
    () => resolveAttribution({
      transactionId: "txn_attr_invalid_time_001",
      lockedAt: LOCKED_AT,
      evidence: [evidence({ capturedAt: "not-a-date" })]
    }),
    /VVIP_INVALID_ATTRIBUTION_TIME/
  );
  assert.throws(
    () => resolveAttribution({
      transactionId: "txn_attr_future_time_001",
      lockedAt: LOCKED_AT,
      evidence: [evidence({ capturedAt: "2026-08-19T12:00:00.001Z" })]
    }),
    /VVIP_INVALID_ATTRIBUTION_TIME/
  );
});

test("resolver rejects timezone-less lock and evidence timestamps", async () => {
  const { resolveAttribution } = await loadPolicy();

  assert.throws(
    () => resolveAttribution({
      transactionId: "txn_attr_local_lock_001",
      lockedAt: "2026-08-19T12:00:00.000",
      evidence: []
    }),
    /VVIP_INVALID_ATTRIBUTION_TIME/
  );

  assert.throws(
    () => resolveAttribution({
      transactionId: "txn_attr_local_evidence_001",
      lockedAt: LOCKED_AT,
      evidence: [evidence({ capturedAt: "2026-08-19T11:59:00.000" })]
    }),
    /VVIP_INVALID_ATTRIBUTION_TIME/
  );
});

test("resolver rejects duplicate evidence identifiers before winner selection", async () => {
  const { resolveAttribution } = await loadPolicy();

  assert.throws(
    () => resolveAttribution({
      transactionId: "txn_attr_duplicate_evidence_001",
      lockedAt: LOCKED_AT,
      evidence: [
        evidence({
          evidenceId: "ev_duplicate_001",
          marketerId: "mkt_first_001"
        }),
        evidence({
          evidenceId: "ev_duplicate_001",
          marketerId: "mkt_second_001"
        })
      ]
    }),
    /VVIP_INVALID_ATTRIBUTION_EVIDENCE/
  );
});
