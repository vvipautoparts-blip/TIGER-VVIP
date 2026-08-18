import {
  COMMISSION_POLICY_EFFECTIVE_AT,
  COMMISSION_POLICY_VERSION,
  allocateNetRecognizedRevenueMinorUnits
} from "./vvip-commission-policy.js";
import {
  ATTRIBUTION_POLICY_VERSION,
  isResolverIssuedAttributionDecision
} from "./vvip-attribution-policy.js";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._/-]{7,159}$/;
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;
const OFFSET_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const COMMISSION_POLICY_EFFECTIVE_TIMESTAMP = Date.parse(
  COMMISSION_POLICY_EFFECTIVE_AT
);

const FIXED_DESTINATIONS = Object.freeze({
  OWNER_MANAGEMENT: Object.freeze({
    beneficiaryReference: "OWNER_MANAGEMENT",
    account: "commission:owner_management"
  }),
  OPERATING_PARTNER_1: Object.freeze({
    beneficiaryReference: "OP_01",
    account: "commission:operating_partner:OP_01"
  }),
  OPERATING_PARTNER_2: Object.freeze({
    beneficiaryReference: "OP_02",
    account: "commission:operating_partner:OP_02"
  }),
  OPERATING_PARTNER_3: Object.freeze({
    beneficiaryReference: "OP_03",
    account: "commission:operating_partner:OP_03"
  }),
  GENERAL_MANAGER: Object.freeze({
    beneficiaryReference: "GENERAL_MANAGER",
    account: "commission:general_manager"
  }),
  TECH_CONTENT: Object.freeze({
    beneficiaryReference: "TECH_CONTENT",
    account: "allocation:tech_content"
  }),
  CUSTOMER_SERVICE_BASE: Object.freeze({
    beneficiaryReference: "CUSTOMER_SERVICE_BASE",
    account: "allocation:customer_service_base"
  }),
  CUSTOMER_SERVICE_PERFORMANCE: Object.freeze({
    beneficiaryReference: "CUSTOMER_SERVICE_PERFORMANCE",
    account: "allocation:customer_service_performance"
  }),
  GROWTH_ACQUISITION_RESERVE: Object.freeze({
    beneficiaryReference: "GROWTH_ACQUISITION_RESERVE",
    account: "reserve:growth_acquisition"
  }),
  RISK_CHARGEBACK_RESERVE: Object.freeze({
    beneficiaryReference: "RISK_CHARGEBACK_RESERVE",
    account: "reserve:risk_chargeback"
  }),
  PLATFORM_RETAINED: Object.freeze({
    beneficiaryReference: "PLATFORM_RETAINED",
    account: "revenue:platform_retained"
  })
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function assertIdentifier(value) {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) {
    throw new TypeError("VVIP_INVALID_JOURNAL");
  }
  return value;
}

function assertMoney(amountMinor) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new TypeError("VVIP_INVALID_MONEY");
  }
}

function normalizeCurrency(currency) {
  if (typeof currency !== "string" || !CURRENCY_PATTERN.test(currency)) {
    throw new TypeError("VVIP_INVALID_CURRENCY");
  }
  return currency.toUpperCase();
}

function normalizeOccurredAt(occurredAt, lockedAt) {
  if (typeof occurredAt !== "string"
    || !OFFSET_TIMESTAMP_PATTERN.test(occurredAt)
    || typeof lockedAt !== "string"
    || !OFFSET_TIMESTAMP_PATTERN.test(lockedAt)) {
    throw new TypeError("VVIP_INVALID_JOURNAL");
  }
  const timestamp = Date.parse(occurredAt);
  const lockedTimestamp = Date.parse(lockedAt);
  if (!Number.isFinite(timestamp)
    || !Number.isFinite(lockedTimestamp)
    || timestamp < lockedTimestamp
    || timestamp < COMMISSION_POLICY_EFFECTIVE_TIMESTAMP) {
    throw new TypeError("VVIP_INVALID_JOURNAL");
  }
  return new Date(timestamp).toISOString();
}

function assertAttribution(attribution, transactionKey) {
  if (!attribution
    || typeof attribution !== "object"
    || !Object.isFrozen(attribution)
    || attribution.policyVersion !== ATTRIBUTION_POLICY_VERSION
    || attribution.transactionId !== transactionKey) {
    throw new TypeError("VVIP_INVALID_JOURNAL");
  }

  if (attribution.status === "ATTRIBUTED") {
    if (attribution.saleChannel !== "REFERRED_SALE"
      || typeof attribution.evidenceType !== "string") {
      throw new TypeError("VVIP_INVALID_JOURNAL");
    }
    assertIdentifier(attribution.winningEvidenceId);
    assertIdentifier(attribution.marketerId);
    assertIdentifier(attribution.managerAssignmentId);
    assertIdentifier(attribution.sectorId);
  } else if (attribution.status === "DIRECT_PLATFORM") {
    if (attribution.saleChannel !== "DIRECT_PLATFORM"
      || attribution.winningEvidenceId !== null
      || attribution.evidenceType !== null
      || attribution.marketerId !== null
      || attribution.managerAssignmentId !== null
      || attribution.sectorId !== null) {
      throw new TypeError("VVIP_INVALID_JOURNAL");
    }
  } else {
    throw new TypeError("VVIP_INVALID_JOURNAL");
  }

  if (!isResolverIssuedAttributionDecision(attribution)) {
    throw new TypeError("VVIP_INVALID_JOURNAL");
  }
}

function destinationFor(recipient, attribution) {
  if (recipient === "PRIMARY_MARKETER") {
    return {
      beneficiaryReference: attribution.marketerId,
      account: `commission:marketer:${encodeURIComponent(attribution.marketerId)}`
    };
  }
  if (recipient === "SECTOR_MANAGER") {
    return {
      beneficiaryReference: attribution.managerAssignmentId,
      account: `commission:sector_manager:${encodeURIComponent(
        attribution.managerAssignmentId
      )}`
    };
  }
  const fixed = FIXED_DESTINATIONS[recipient];
  if (!fixed) {
    throw new TypeError("VVIP_INVALID_JOURNAL");
  }
  return fixed;
}

export function createDistributionJournal({
  journalId,
  sourceEventId,
  idempotencyKey,
  occurredAt,
  amountMinor,
  currency,
  transactionKey,
  attribution
} = {}) {
  const normalizedJournalId = assertIdentifier(journalId);
  const normalizedSourceEventId = assertIdentifier(sourceEventId);
  const normalizedIdempotencyKey = assertIdentifier(idempotencyKey);
  const normalizedTransactionKey = assertIdentifier(transactionKey);
  assertMoney(amountMinor);
  const normalizedCurrency = normalizeCurrency(currency);
  assertAttribution(attribution, normalizedTransactionKey);
  const normalizedOccurredAt = normalizeOccurredAt(occurredAt, attribution.lockedAt);

  const distribution = allocateNetRecognizedRevenueMinorUnits({
    amountMinor,
    saleChannel: attribution.saleChannel,
    transactionKey: normalizedTransactionKey
  });

  const destinations = Object.entries(distribution.allocations)
    .map(([recipient, allocation]) => {
      const target = destinationFor(recipient, attribution);
      return {
        recipient,
        beneficiaryReference: target.beneficiaryReference,
        account: target.account,
        direction: "CREDIT",
        basisPoints: allocation.basisPoints,
        amountMinor: allocation.amountMinor,
        roundingAdjustmentMinor: allocation.roundingAdjustmentMinor
      };
    });

  const debitTotalMinor = amountMinor;
  const creditTotalMinor = destinations
    .reduce((sum, destination) => sum + destination.amountMinor, 0);
  const residualMinor = debitTotalMinor - creditTotalMinor;
  if (debitTotalMinor !== creditTotalMinor || residualMinor !== 0) {
    throw new Error("VVIP_DISTRIBUTION_RECONCILIATION_FAILED");
  }

  return deepFreeze({
    journalId: normalizedJournalId,
    sourceEventId: normalizedSourceEventId,
    idempotencyKey: normalizedIdempotencyKey,
    policyVersion: COMMISSION_POLICY_VERSION,
    occurredAt: normalizedOccurredAt,
    currency: normalizedCurrency,
    saleChannel: attribution.saleChannel,
    source: {
      account: "NET_RECOGNIZED_REVENUE_CLEARING",
      direction: "DEBIT",
      amountMinor
    },
    destinations,
    debitTotalMinor,
    creditTotalMinor,
    residualMinor,
    status: "POSTED"
  });
}
