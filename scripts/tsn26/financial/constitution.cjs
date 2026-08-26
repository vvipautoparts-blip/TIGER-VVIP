'use strict';

const MANIFEST = require('../../../config/tsn26/financial-constitution.v1.json');

const BPS_DENOMINATOR = 10_000n;
const TMU_PER_JOD = BigInt(MANIFEST.microUnitsPerJod);

function sumNumbers(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function validateBpsMap(name, map, expected) {
  const errors = [];
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    return [`${name} must be an object`];
  }
  for (const [key, value] of Object.entries(map)) {
    if (!Number.isInteger(value) || value < 0 || value > 10_000) {
      errors.push(`${name}.${key} must be a non-negative integer basis-point value`);
    }
  }
  const total = sumNumbers(Object.values(map));
  if (total !== expected) errors.push(`${name} must total ${expected} bps; got ${total}`);
  return errors;
}

function validateManifest(manifest) {
  const errors = [];
  if (!manifest || manifest.reference !== 'TSN-26') errors.push('manifest reference must be TSN-26');
  if (manifest.id !== 'TFC-2026.08.001') errors.push('unexpected active constitution id');
  if (manifest.schemaVersion !== 1 || manifest.status !== 'ACTIVE') errors.push('active schema version 1 is required');
  if (!Number.isFinite(Date.parse(manifest.effectiveFrom))) errors.push('effectiveFrom must be an ISO instant');
  if (manifest.currencyBase !== 'JOD') errors.push('canonical currency must be JOD');
  if (manifest.microUnitsPerJod !== 1_000_000) errors.push('1 JOD must equal 1,000,000 TMU');
  if (manifest.directPurchaseDiscountBps !== 700) errors.push('direct purchase incentive must equal 7%');
  if (manifest.directPurchaseDiscountTiming !== 'BEFORE_ALLOCATION') errors.push('direct purchase discount must precede allocation');
  if (manifest.externalPayoutEpochDays !== 14) errors.push('external payout epoch must equal 14 days');
  if (manifest.payoutProfileDeadlineHours !== 12) errors.push('payout profile deadline must equal 12 hours');
  if (JSON.stringify(manifest.canonicalPackagesJod) !== JSON.stringify([2, 10, 25, 45])) {
    errors.push('canonical exposure packages must be T2/T10/T25/T45');
  }
  errors.push(...validateBpsMap('allocationsBps', manifest.allocationsBps, 10_000));
  errors.push(...validateBpsMap('operationsBps', manifest.operationsBps, 4_300));
  errors.push(...validateBpsMap('salesSlotsBps', manifest.salesSlotsBps, 2_100));
  if (manifest.allocationsBps?.operations !== 4_300) errors.push('operations must equal 43%');
  if (manifest.allocationsBps?.fiscalRegulatoryReserve !== 1_600) errors.push('fiscal regulatory reserve must equal 16%');
  if (manifest.allocationsBps?.salesPool !== 2_100) errors.push('sales pool must equal 21%');
  return { valid: errors.length === 0, errors };
}

const manifestValidation = validateManifest(MANIFEST);
if (!manifestValidation.valid) {
  throw new Error(`Invalid TSN-26 manifest: ${manifestValidation.errors.join('; ')}`);
}

const TSN26_CONSTITUTION = Object.freeze({
  schema_version: 'TIGER_FINANCIAL_CONSTITUTION_V1',
  constitution_id: MANIFEST.id,
  effective_from: MANIFEST.effectiveFrom,
  reference: MANIFEST.reference,
  money: Object.freeze({
    canonical_currency: MANIFEST.currencyBase,
    internal_unit: 'TMU',
    units_per_jod: TMU_PER_JOD,
    floating_point_money_forbidden: true,
  }),
  top_level_bps: Object.freeze({
    OWNER: MANIFEST.allocationsBps.owner,
    PARTNER_1: MANIFEST.allocationsBps.partner1,
    PARTNER_2: MANIFEST.allocationsBps.partner2,
    PARTNER_3: MANIFEST.allocationsBps.partner3,
    ACTUAL_OPERATIONS: MANIFEST.allocationsBps.operations,
    FISCAL_REGULATORY_RESERVE: MANIFEST.allocationsBps.fiscalRegulatoryReserve,
    SALES_POOL: MANIFEST.allocationsBps.salesPool,
  }),
  operations_bps: Object.freeze({
    RISK: MANIFEST.operationsBps.risk,
    MAINTENANCE: MANIFEST.operationsBps.maintenance,
    DEVELOPMENT: MANIFEST.operationsBps.development,
    TECHNICAL_SUPPORT: MANIFEST.operationsBps.technicalSupport,
    ADVERTISING: MANIFEST.operationsBps.advertising,
    CSR: MANIFEST.operationsBps.csr,
  }),
  sales_slots_bps: Object.freeze({ ...MANIFEST.salesSlotsBps }),
  canonical_packages_jod: Object.freeze([...MANIFEST.canonicalPackagesJod]),
  direct_purchase_discount_bps: MANIFEST.directPurchaseDiscountBps,
  external_payout_epoch_days: MANIFEST.externalPayoutEpochDays,
  payout_profile_deadline_hours: MANIFEST.payoutProfileDeadlineHours,
  invariants: Object.freeze([
    'FIN-001_SETTLEMENT_MUST_BALANCE',
    'FIN-002_MAX_ONE_PAID_SALES_ACTOR',
    'FIN-003_NO_FLOAT_MONEY',
    'FIN-004_NO_PAYOUT_WITHOUT_VERIFIED_DESTINATION',
    'AUD-001_FINANCIAL_HISTORY_APPEND_ONLY',
    'PAY-001_PAYMENT_REPLAY_CANNOT_DUPLICATE_SETTLEMENT',
    'AI-001_AI_CANNOT_ALTER_LEDGER',
    'LEGACY-001_NO_PARALLEL_FINANCIAL_FALLBACK',
  ]),
});

function validateConstitution(constitution) {
  const errors = [];
  if (!constitution || constitution.reference !== 'TSN-26') errors.push('constitution reference must be TSN-26');
  errors.push(...validateBpsMap('top_level_bps', constitution?.top_level_bps || {}, 10_000));
  errors.push(...validateBpsMap('operations_bps', constitution?.operations_bps || {}, 4_300));
  errors.push(...validateBpsMap('sales_slots_bps', constitution?.sales_slots_bps || {}, 2_100));
  if (constitution?.top_level_bps?.ACTUAL_OPERATIONS !== MANIFEST.allocationsBps.operations) errors.push('operations mismatch');
  if (constitution?.top_level_bps?.FISCAL_REGULATORY_RESERVE !== MANIFEST.allocationsBps.fiscalRegulatoryReserve) errors.push('fiscal reserve mismatch');
  if (constitution?.top_level_bps?.SALES_POOL !== MANIFEST.allocationsBps.salesPool) errors.push('sales pool mismatch');
  if (constitution?.direct_purchase_discount_bps !== MANIFEST.directPurchaseDiscountBps) errors.push('direct purchase incentive mismatch');
  if (constitution?.money?.units_per_jod !== TMU_PER_JOD) errors.push('TMU scale mismatch');
  return { valid: errors.length === 0, errors };
}

function assertConstitution() {
  const validation = validateConstitution(TSN26_CONSTITUTION);
  if (!validation.valid) throw new Error(`Invalid TSN-26 constitution: ${validation.errors.join('; ')}`);
}

function allocateBps(amountTmu, basisPoints) {
  if (typeof amountTmu !== 'bigint' || amountTmu < 0n) throw new TypeError('money amount must be a non-negative bigint TMU');
  if (!Number.isInteger(basisPoints)) throw new TypeError('basis points must be an integer');
  const numerator = amountTmu * BigInt(basisPoints);
  if (numerator % BPS_DENOMINATOR !== 0n) {
    throw new Error('allocation requires precision reserve handling; exact TMU result unavailable');
  }
  return numerator / BPS_DENOMINATOR;
}

function normalizeSaleClaims(saleClaims) {
  if (!Array.isArray(saleClaims)) throw new TypeError('sale_claims must be an array');
  if (saleClaims.length > 1) throw new Error('One Sale = One Economic Actor: at most one paid sale claim is allowed');
  if (saleClaims.length === 0) return null;
  const claim = saleClaims[0];
  const allowed = new Set(Object.keys(TSN26_CONSTITUTION.sales_slots_bps));
  if (!claim || !allowed.has(claim.actor_type)) throw new Error('sale claim actor_type is invalid');
  if (typeof claim.actor_uid !== 'string' || claim.actor_uid.trim() === '') throw new Error('sale claim actor_uid is required');
  return Object.freeze({ actor_type: claim.actor_type, actor_uid: claim.actor_uid.trim() });
}

function settleExposurePurchase({ package_jod, sale_claims = [] }) {
  assertConstitution();
  if (!Number.isInteger(package_jod) || !TSN26_CONSTITUTION.canonical_packages_jod.includes(package_jod)) {
    throw new Error('purchase must use a canonical package: T2/T10/T25/T45');
  }

  const winningClaim = normalizeSaleClaims(sale_claims);
  const listPriceTmu = BigInt(package_jod) * TMU_PER_JOD;
  const discountTmu = winningClaim ? 0n : allocateBps(listPriceTmu, TSN26_CONSTITUTION.direct_purchase_discount_bps);
  const collectedTmu = listPriceTmu - discountTmu;

  const allocations = {};
  for (const [account, bps] of Object.entries(TSN26_CONSTITUTION.top_level_bps)) allocations[account] = allocateBps(collectedTmu, bps);

  const salesSlots = {};
  for (const [slot, bps] of Object.entries(TSN26_CONSTITUTION.sales_slots_bps)) {
    const amountTmu = allocateBps(collectedTmu, bps);
    if (!winningClaim) {
      salesSlots[slot] = Object.freeze({ amount_tmu: amountTmu, status: 'DIRECT_PURCHASE', beneficiary_uid: null, destination_account: 'SALES_ABSENCE_ACCOUNT' });
    } else if (winningClaim.actor_type === slot) {
      salesSlots[slot] = Object.freeze({ amount_tmu: amountTmu, status: 'PAID_TO_ACTOR', beneficiary_uid: winningClaim.actor_uid, destination_account: `ACTOR:${winningClaim.actor_uid}` });
    } else {
      salesSlots[slot] = Object.freeze({ amount_tmu: amountTmu, status: 'ABSENT', beneficiary_uid: null, destination_account: 'SALES_ABSENCE_ACCOUNT' });
    }
  }

  const topLevelTotal = Object.values(allocations).reduce((sum, amount) => sum + amount, 0n);
  const salesSlotTotal = Object.values(salesSlots).reduce((sum, slot) => sum + slot.amount_tmu, 0n);
  if (salesSlotTotal !== allocations.SALES_POOL) throw new Error('sales slot breakdown does not equal SALES_POOL');

  const unexplainedVarianceTmu = collectedTmu - topLevelTotal;
  if (unexplainedVarianceTmu !== 0n) throw new Error(`TSN-26 settlement imbalance: ${unexplainedVarianceTmu} TMU`);

  return Object.freeze({
    constitution_id: TSN26_CONSTITUTION.constitution_id,
    rule_version: TSN26_CONSTITUTION.schema_version,
    package_id: `T${package_jod}`,
    list_price_tmu: listPriceTmu,
    discount_tmu: discountTmu,
    collected_tmu: collectedTmu,
    purchase_mode: winningClaim ? 'ATTRIBUTED' : 'DIRECT_SOVEREIGN_PURCHASE',
    winning_sale_claim: winningClaim,
    allocations: Object.freeze(allocations),
    sales_slots: Object.freeze(salesSlots),
    unexplained_variance_tmu: unexplainedVarianceTmu,
    balanced: true,
  });
}

module.exports = Object.freeze({
  MANIFEST,
  TMU_PER_JOD,
  BPS_DENOMINATOR,
  TSN26_CONSTITUTION,
  validateManifest,
  validateConstitution,
  allocateBps,
  settleExposurePurchase,
});
