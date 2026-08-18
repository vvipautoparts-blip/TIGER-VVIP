import { createHash } from "node:crypto";

export const COMMISSION_POLICY_VERSION = "VVIP_DYNAMIC_YIELD_2026_08_19_V2";
export const COMMISSION_POLICY_EFFECTIVE_AT = "2026-08-19T00:00:00.000Z";

const TOTAL_BASIS_POINTS = 10000;
const TRANSACTION_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._/-]{7,159}$/;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function createPolicy(saleChannel, shares) {
  const totalBasisPoints = Object.values(shares)
    .reduce((sum, basisPoints) => sum + basisPoints, 0);
  if (totalBasisPoints !== TOTAL_BASIS_POINTS) {
    throw new Error("VVIP_DISTRIBUTION_RECONCILIATION_FAILED");
  }
  return deepFreeze({
    policyId: "VVIP_CENTRAL_DYNAMIC_YIELD_COMMISSION",
    version: COMMISSION_POLICY_VERSION,
    effectiveDate: COMMISSION_POLICY_EFFECTIVE_AT.slice(0, 10),
    saleChannel,
    calculationBase: "NET_RECOGNIZED_REVENUE",
    sectorOverridesAllowed: false,
    totalBasisPoints,
    shares
  });
}

export const SALE_CHANNELS = Object.freeze([
  "REFERRED_SALE",
  "DIRECT_PLATFORM"
]);

export const RETIRED_COMMISSION_RECIPIENTS = Object.freeze([
  "SECONDARY_MARKETER",
  "SUPERVISOR",
  "AREA_MANAGER"
]);

const referredShares = {
  OWNER_MANAGEMENT: 500,
  OPERATING_PARTNER_1: 500,
  OPERATING_PARTNER_2: 500,
  OPERATING_PARTNER_3: 500,
  GENERAL_MANAGER: 500,
  SECTOR_MANAGER: 500,
  PRIMARY_MARKETER: 500,
  TECH_CONTENT: 150,
  CUSTOMER_SERVICE_BASE: 150,
  PLATFORM_RETAINED: 6200
};

const directShares = {
  OWNER_MANAGEMENT: 500,
  OPERATING_PARTNER_1: 500,
  OPERATING_PARTNER_2: 500,
  OPERATING_PARTNER_3: 500,
  GENERAL_MANAGER: 500,
  TECH_CONTENT: 150,
  CUSTOMER_SERVICE_BASE: 150,
  CUSTOMER_SERVICE_PERFORMANCE: 500,
  GROWTH_ACQUISITION_RESERVE: 300,
  RISK_CHARGEBACK_RESERVE: 200,
  PLATFORM_RETAINED: 6200
};

export const CENTRAL_COMMISSION_POLICIES = deepFreeze({
  REFERRED_SALE: createPolicy("REFERRED_SALE", referredShares),
  DIRECT_PLATFORM: createPolicy("DIRECT_PLATFORM", directShares)
});

export const ACTIVE_COMMISSION_RECIPIENTS = Object.freeze([
  ...new Set(Object.values(CENTRAL_COMMISSION_POLICIES)
    .flatMap((policy) => Object.keys(policy.shares)))
]);

function assertMoney(amountMinor) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new TypeError("VVIP_INVALID_MONEY");
  }
}

function assertTransactionKey(transactionKey) {
  if (typeof transactionKey !== "string"
    || !TRANSACTION_KEY_PATTERN.test(transactionKey)) {
    throw new TypeError("VVIP_INVALID_TRANSACTION_KEY");
  }
}

function assertSaleChannel(saleChannel) {
  if (typeof saleChannel !== "string"
    || !Object.hasOwn(CENTRAL_COMMISSION_POLICIES, saleChannel)) {
    throw new TypeError("VVIP_INVALID_SALE_CHANNEL");
  }
}

function transactionRotation(saleChannel, transactionKey, recipientCount) {
  const digest = createHash("sha256")
    .update(COMMISSION_POLICY_VERSION)
    .update("\u0000")
    .update(saleChannel)
    .update("\u0000")
    .update(transactionKey)
    .digest();
  return digest.readUInt32BE(0) % recipientCount;
}

export function getCommissionPolicyForSaleChannel(saleChannel) {
  assertSaleChannel(saleChannel);
  return CENTRAL_COMMISSION_POLICIES[saleChannel];
}

export function allocateNetRecognizedRevenueMinorUnits({
  amountMinor,
  saleChannel,
  transactionKey
} = {}) {
  assertMoney(amountMinor);
  assertSaleChannel(saleChannel);
  assertTransactionKey(transactionKey);

  const policy = CENTRAL_COMMISSION_POLICIES[saleChannel];
  const shareEntries = Object.entries(policy.shares);
  const rotation = transactionRotation(
    saleChannel,
    transactionKey,
    shareEntries.length
  );

  const calculated = shareEntries.map(([recipient, basisPoints], index) => {
    const exactNumerator = BigInt(amountMinor) * BigInt(basisPoints);
    const floorAmount = exactNumerator / BigInt(TOTAL_BASIS_POINTS);
    return {
      recipient,
      basisPoints,
      index,
      floorAmount,
      fractionalRemainder: exactNumerator % BigInt(TOTAL_BASIS_POINTS)
    };
  });

  const floorTotal = calculated.reduce(
    (sum, item) => sum + item.floorAmount,
    0n
  );
  const remainderUnits = Number(BigInt(amountMinor) - floorTotal);

  const ranked = [...calculated].sort((left, right) => {
    if (left.fractionalRemainder !== right.fractionalRemainder) {
      return left.fractionalRemainder > right.fractionalRemainder ? -1 : 1;
    }
    const leftRank = (left.index - rotation + calculated.length) % calculated.length;
    const rightRank = (right.index - rotation + calculated.length) % calculated.length;
    return leftRank - rightRank;
  });

  const roundedRecipients = new Set(
    ranked.slice(0, remainderUnits).map((item) => item.recipient)
  );
  const allocations = {};

  for (const item of calculated) {
    const roundingAdjustmentMinor = roundedRecipients.has(item.recipient) ? 1 : 0;
    allocations[item.recipient] = {
      basisPoints: item.basisPoints,
      amountMinor: Number(item.floorAmount) + roundingAdjustmentMinor,
      roundingAdjustmentMinor
    };
  }

  const reconciled = Object.values(allocations)
    .reduce((sum, allocation) => sum + allocation.amountMinor, 0);
  const residualMinor = amountMinor - reconciled;
  if (residualMinor !== 0) {
    throw new Error("VVIP_DISTRIBUTION_RECONCILIATION_FAILED");
  }

  return deepFreeze({
    policyVersion: COMMISSION_POLICY_VERSION,
    saleChannel,
    transactionKey,
    amountMinor,
    allocations,
    residualMinor
  });
}
