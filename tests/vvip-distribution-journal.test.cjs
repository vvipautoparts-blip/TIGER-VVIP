"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const attributionUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/finance/vvip-attribution-policy.js")
).href;
const journalUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/finance/vvip-distribution-journal.js")
).href;

async function loadModules() {
  const tag = `${Date.now()}-${Math.random()}`;
  return Promise.all([
    import(attributionUrl),
    import(`${journalUrl}?test=${tag}`)
  ]);
}

function journalInput(attribution, overrides = {}) {
  return {
    journalId: "journal_distribution_001",
    sourceEventId: "event_revenue_recognized_001",
    idempotencyKey: "idem_distribution_001",
    occurredAt: "2026-08-19T12:05:00.000Z",
    amountMinor: 100000,
    currency: "jod",
    transactionKey: attribution.transactionId,
    attribution,
    ...overrides
  };
}

function referredAttribution(resolveAttribution) {
  return resolveAttribution({
    transactionId: "txn_journal_referred_001",
    lockedAt: "2026-08-19T12:00:00.000Z",
    evidence: [{
      evidenceId: "evidence_checkout_001",
      type: "CHECKOUT_CODE",
      capturedAt: "2026-08-19T11:59:00.000Z",
      marketerId: "mkt_4412",
      managerAssignmentId: "asn_sector_038",
      sectorId: "JO:AUTOMOTIVE"
    }]
  });
}

function directAttribution(resolveAttribution) {
  return resolveAttribution({
    transactionId: "txn_journal_direct_001",
    lockedAt: "2026-08-19T12:00:00.000Z"
  });
}

test("referred revenue creates one immutable balanced distribution journal", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const attribution = referredAttribution(resolveAttribution);
  const journal = createDistributionJournal(journalInput(attribution));

  assert.equal(journal.status, "POSTED");
  assert.equal(journal.saleChannel, "REFERRED_SALE");
  assert.equal(journal.policyVersion, "VVIP_DYNAMIC_YIELD_2026_08_19_V2");
  assert.equal(journal.currency, "JOD");
  assert.deepEqual(journal.source, {
    account: "NET_RECOGNIZED_REVENUE_CLEARING",
    direction: "DEBIT",
    amountMinor: 100000
  });
  assert.equal(journal.debitTotalMinor, 100000);
  assert.equal(journal.creditTotalMinor, 100000);
  assert.equal(journal.residualMinor, 0);
  assert.equal(Object.isFrozen(journal), true);
  assert.equal(Object.isFrozen(journal.source), true);
  assert.equal(Object.isFrozen(journal.destinations), true);

  const marketer = journal.destinations.find(
    (entry) => entry.recipient === "PRIMARY_MARKETER"
  );
  const manager = journal.destinations.find(
    (entry) => entry.recipient === "SECTOR_MANAGER"
  );
  assert.equal(marketer.beneficiaryReference, "mkt_4412");
  assert.equal(marketer.account, "commission:marketer:mkt_4412");
  assert.equal(marketer.amountMinor, 5000);
  assert.equal(manager.beneficiaryReference, "asn_sector_038");
  assert.equal(manager.account, "commission:sector_manager:asn_sector_038");
  assert.equal(manager.amountMinor, 5000);
});

test("direct revenue uses only the approved pools and reserves", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const attribution = directAttribution(resolveAttribution);
  const journal = createDistributionJournal(journalInput(attribution));
  const recipients = journal.destinations.map((entry) => entry.recipient);

  assert.equal(journal.saleChannel, "DIRECT_PLATFORM");
  assert.equal(recipients.includes("PRIMARY_MARKETER"), false);
  assert.equal(recipients.includes("SECTOR_MANAGER"), false);
  assert.equal(recipients.includes("CUSTOMER_SERVICE_PERFORMANCE"), true);
  assert.equal(recipients.includes("GROWTH_ACQUISITION_RESERVE"), true);
  assert.equal(recipients.includes("RISK_CHARGEBACK_RESERVE"), true);
  assert.equal(journal.debitTotalMinor, 100000);
  assert.equal(journal.creditTotalMinor, 100000);
  assert.equal(journal.residualMinor, 0);

  assert.equal(
    journal.destinations.find(
      (entry) => entry.recipient === "CUSTOMER_SERVICE_PERFORMANCE"
    ).amountMinor,
    5000
  );
  assert.equal(
    journal.destinations.find(
      (entry) => entry.recipient === "GROWTH_ACQUISITION_RESERVE"
    ).amountMinor,
    3000
  );
  assert.equal(
    journal.destinations.find(
      (entry) => entry.recipient === "RISK_CHARGEBACK_RESERVE"
    ).amountMinor,
    2000
  );
});

test("identical input replays deterministically for zero and remainder-producing amounts", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const attribution = referredAttribution(resolveAttribution);

  for (const amountMinor of [0, 3, 10001]) {
    const input = journalInput(attribution, {
      amountMinor,
      journalId: `journal_replay_${amountMinor}`,
      sourceEventId: `event_replay_${amountMinor}`,
      idempotencyKey: `idempotency_replay_${amountMinor}`
    });
    const first = createDistributionJournal(input);
    const replay = createDistributionJournal(input);
    assert.deepEqual(first, replay);
    assert.equal(first.debitTotalMinor, amountMinor);
    assert.equal(first.creditTotalMinor, amountMinor);
    assert.equal(first.residualMinor, 0);
    assert.ok(first.destinations.every((entry) => Object.isFrozen(entry)));
  }
});

test("fraud-review attribution cannot be posted as a distribution journal", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const review = resolveAttribution({
    transactionId: "txn_journal_review_001",
    lockedAt: "2026-08-19T12:00:00.000Z",
    fraudReviewRequired: true
  });

  assert.throws(
    () => createDistributionJournal(journalInput(review)),
    /VVIP_INVALID_JOURNAL/
  );
});

test("journal rejects a structurally changed attribution decision", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const valid = referredAttribution(resolveAttribution);
  const changed = Object.freeze({
    ...valid,
    saleChannel: "DIRECT_PLATFORM"
  });

  assert.throws(
    () => createDistributionJournal(journalInput(changed)),
    /VVIP_INVALID_JOURNAL/
  );
});

test("canonical accounts cannot be replaced by browser-supplied destinations", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const attribution = directAttribution(resolveAttribution);
  const journal = createDistributionJournal({
    ...journalInput(attribution),
    beneficiaryAccounts: {
      OWNER_MANAGEMENT: "external:attacker",
      PLATFORM_RETAINED: "external:attacker"
    }
  });

  assert.equal(
    journal.destinations.find(
      (entry) => entry.recipient === "OWNER_MANAGEMENT"
    ).account,
    "commission:owner_management"
  );
  assert.equal(
    journal.destinations.find(
      (entry) => entry.recipient === "PLATFORM_RETAINED"
    ).account,
    "revenue:platform_retained"
  );
  assert.equal(Object.hasOwn(journal, "beneficiaryAccounts"), false);
});

test("journal validates identifiers, money, currency, and exact transaction binding", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const attribution = referredAttribution(resolveAttribution);

  for (const [field, value] of [
    ["journalId", "short"],
    ["sourceEventId", null],
    ["idempotencyKey", ""],
    ["transactionKey", "txn_other_transaction_001"]
  ]) {
    assert.throws(
      () => createDistributionJournal(journalInput(attribution, { [field]: value })),
      /VVIP_INVALID_JOURNAL/
    );
  }

  for (const amountMinor of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => createDistributionJournal(journalInput(attribution, { amountMinor })),
      /VVIP_INVALID_MONEY/
    );
  }

  for (const currency of ["JO", "JODD", "12A", null]) {
    assert.throws(
      () => createDistributionJournal(journalInput(attribution, { currency })),
      /VVIP_INVALID_CURRENCY/
    );
  }
});

test("journal rejects a V2 event before the policy effective instant", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const attribution = resolveAttribution({
    transactionId: "txn_journal_historical_001",
    lockedAt: "2026-08-18T23:58:00.000Z"
  });

  assert.throws(
    () => createDistributionJournal(journalInput(attribution, {
      occurredAt: "2026-08-18T23:59:59.999Z"
    })),
    /VVIP_INVALID_JOURNAL/
  );
});

test("journal accepts an event at the exact V2 effective instant", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const attribution = resolveAttribution({
    transactionId: "txn_journal_effective_boundary_001",
    lockedAt: "2026-08-19T00:00:00.000Z"
  });
  const journal = createDistributionJournal(journalInput(attribution, {
    occurredAt: "2026-08-19T00:00:00.000Z"
  }));

  assert.equal(journal.status, "POSTED");
  assert.equal(journal.occurredAt, "2026-08-19T00:00:00.000Z");
});

test("journal rejects timezone-less event timestamps", async () => {
  const [{ resolveAttribution }, { createDistributionJournal }] = await loadModules();
  const attribution = directAttribution(resolveAttribution);

  assert.throws(
    () => createDistributionJournal(journalInput(attribution, {
      occurredAt: "2026-08-20T12:05:00.000"
    })),
    /VVIP_INVALID_JOURNAL/
  );
});

test("journal rejects well-formed frozen attribution not issued by the resolver", async () => {
  const [, { createDistributionJournal }] = await loadModules();
  const spoofed = Object.freeze({
    policyVersion: "VVIP_ATTRIBUTION_2026_08_19_V2_1",
    transactionId: "txn_journal_spoofed_001",
    status: "ATTRIBUTED",
    saleChannel: "REFERRED_SALE",
    lockedAt: "2026-08-19T12:00:00.000Z",
    winningEvidenceId: "evidence_spoofed_001",
    evidenceType: "CHECKOUT_CODE",
    marketerId: "mkt_spoofed_001",
    managerAssignmentId: "asn_spoofed_001",
    sectorId: "JO:AUTOMOTIVE"
  });

  assert.throws(
    () => createDistributionJournal(journalInput(spoofed)),
    /VVIP_INVALID_JOURNAL/
  );
});

test("journal rejects malformed beneficiary identifiers in frozen attribution", async () => {
  const [, { createDistributionJournal }] = await loadModules();
  const base = {
    policyVersion: "VVIP_ATTRIBUTION_2026_08_19_V2_1",
    transactionId: "txn_journal_bad_beneficiary_001",
    status: "ATTRIBUTED",
    saleChannel: "REFERRED_SALE",
    lockedAt: "2026-08-19T12:00:00.000Z",
    winningEvidenceId: "evidence_valid_001",
    evidenceType: "CHECKOUT_CODE",
    marketerId: "mkt_valid_001",
    managerAssignmentId: "asn_valid_001",
    sectorId: "JO:AUTOMOTIVE"
  };

  for (const [field, value] of [
    ["winningEvidenceId", "bad id"],
    ["marketerId", "bad id"],
    ["managerAssignmentId", "bad id"],
    ["sectorId", "bad id"]
  ]) {
    const malformed = Object.freeze({ ...base, [field]: value });
    assert.throws(
      () => createDistributionJournal(journalInput(malformed)),
      /VVIP_INVALID_JOURNAL/
    );
  }
});
