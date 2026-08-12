import { createHash } from "node:crypto";

export const COMMISSION_POLICY_VERSION = "VVIP_COMMISSION_2026_08_12_V1";

const freezeRecord = (record) => Object.freeze({ ...record });
const freezeList = (values) => Object.freeze([...values]);

const RETIRED = [
  "SECONDARY_MARKETER",
  "SUPERVISOR",
  "AREA_MANAGER"
];

const REDISTRIBUTION_RECIPIENTS = [
  "SECTOR_MANAGER",
  "COUNTRY_EXECUTIVE_COMMISSIONER",
  "MARKETING"
];

export const RETIRED_COMMISSION_RECIPIENTS = freezeList(RETIRED);

export const ACTIVE_COMMISSION_RECIPIENTS = freezeList([
  "PRIMARY_MARKETER",
  ...REDISTRIBUTION_RECIPIENTS
]);

const primaryMarketer = freezeRecord({
  basisPointsNumerator: 430,
  basisPointsDenominator: 1
});

const redistribution = Object.freeze({
  SECTOR_MANAGER: freezeRecord({ numerator: 2383, denominator: 3 }),
  COUNTRY_EXECUTIVE_COMMISSIONER: freezeRecord({ numerator: 2734, denominator: 3 }),
  MARKETING: freezeRecord({ numerator: 3304, denominator: 3 })
});

export const CENTRAL_COMMISSION_POLICY = Object.freeze({
  policyId: "VVIP_CENTRAL_ALL_SECTOR_COMMISSION",
  version: COMMISSION_POLICY_VERSION,
  scope: "GLOBAL_ALL_CURRENT_AND_FUTURE_SECTORS",
  sectorOverridesAllowed: false,
  effectiveDate: "2026-08-12",
  primaryMarketer,
  redistribution,
  removedShare: freezeRecord({ numerator: 1093, denominator: 100 }),
  removedShareBasisPoints: freezeRecord({ numerator: 1093, denominator: 1 }),
  settlement: freezeRecord({
    arithmetic: "INTEGER_MINOR_UNITS",
    remainder: "DETERMINISTIC_TRANSACTION_BOUND_ROTATION",
    residualAllowed: false,
    missingRecipientBehavior: "RECIPIENT_ASSIGNMENT_REQUIRED"
  })
});

const SECTOR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._/-]{1,159}$/;
const TRANSACTION_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._/-]{7,159}$/;

function assertSectorId(sectorId) {
  if (typeof sectorId !== "string" || !SECTOR_ID_PATTERN.test(sectorId)) {
    throw new Error("INVALID_SECTOR_ID");
  }
}

function assertRemovedShareMinorUnits(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("INVALID_REMOVED_SHARE_MINOR_UNITS");
  }
}

function assertTransactionKey(transactionKey) {
  if (typeof transactionKey !== "string" || !TRANSACTION_KEY_PATTERN.test(transactionKey)) {
    throw new Error("INVALID_TRANSACTION_KEY");
  }
}

function deterministicRotation(transactionKey) {
  const digest = createHash("sha256")
    .update(COMMISSION_POLICY_VERSION)
    .update("\u0000")
    .update(transactionKey)
    .digest();

  return digest.readUInt32BE(0) % REDISTRIBUTION_RECIPIENTS.length;
}

export function getCommissionPolicyForSector(sectorId) {
  assertSectorId(sectorId);
  return CENTRAL_COMMISSION_POLICY;
}

export function allocateRemovedShareMinorUnits({
  removedShareMinorUnits,
  transactionKey
} = {}) {
  assertRemovedShareMinorUnits(removedShareMinorUnits);
  assertTransactionKey(transactionKey);

  const recipientCount = REDISTRIBUTION_RECIPIENTS.length;
  const base = Math.floor(removedShareMinorUnits / recipientCount);
  const remainder = removedShareMinorUnits % recipientCount;
  const rotation = deterministicRotation(transactionKey);

  const mutableAmounts = Object.fromEntries(
    REDISTRIBUTION_RECIPIENTS.map((recipient) => [recipient, base])
  );

  for (let offset = 0; offset < remainder; offset += 1) {
    const recipient = REDISTRIBUTION_RECIPIENTS[(rotation + offset) % recipientCount];
    mutableAmounts[recipient] += 1;
  }

  const amounts = Object.freeze({ ...mutableAmounts });
  const reconciled = Object.values(amounts).reduce((sum, value) => sum + value, 0);

  if (reconciled !== removedShareMinorUnits) {
    throw new Error("COMMISSION_RECONCILIATION_FAILED");
  }

  return Object.freeze({
    policyVersion: COMMISSION_POLICY_VERSION,
    transactionKey,
    removedShareMinorUnits,
    amounts,
    residualMinorUnits: 0
  });
}
