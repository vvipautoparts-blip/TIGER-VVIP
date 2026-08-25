'use strict';

const TMU_PER_JOD = 1_000_000n;
const BPS_DENOMINATOR = 10_000n;

const TSN26_CONSTITUTION = Object.freeze({
  schema_version: 'TIGER_FINANCIAL_CONSTITUTION_V1',
  constitution_id: 'TFC-2026.08.001',
  effective_from: '2026-08-26T00:00:00.000Z',
  reference: 'TSN-26',
  money: Object.freeze({
    canonical_currency: 'JOD',
    internal_unit: 'TMU',
    units_per_jod: TMU_PER_JOD,
    floating_point_money_forbidden: true,
  }),
  top_level_bps: Object.freeze({
    OWNER: 500,
    PARTNER_1: 500,
    PARTNER_2: 500,
    PARTNER_3: 500,
    ACTUAL_OPERATIONS: 4300,
    FISCAL_REGULATORY_RESERVE: 1600,
    SALES_POOL: 2100,
  }),
  operations_bps: Object.freeze({
    RISK: 800,
    MAINTENANCE: 800,
    DEVELOPMENT: 800,
    TECHNICAL_SUPPORT: 800,
    ADVERTISING: 800,
    CSR: 300,
  }),
  sales_slots_bps: Object.freeze({
    GENERAL_MANAGER: 700,
    SECTOR_MANAGER: 700,
    MARKETER: 700,
  }),
  canonical_packages_jod: Object.freeze([2, 10, 25, 45]),
  direct_purchase_discount_bps: 700,
  external_payout_epoch_days: 14,
  payout_profile_deadline_hours: 12,
  invariants: Object.freeze([
    'FIN-001_SETTLEMENT_MUST_BALANCE',
    'FIN-002_MAX_ONE_PAID_SALES_ACTOR',
    'FIN-003_NO_FLOAT_MONEY',
    'FIN-004_NO_PAYOUT_WITHOUT_VERIFIED_DESTINATION',
    'AUD-001_FINANCIAL_HISTORY_APPEND_ONLY',
    'PAY-001_PAYMENT_REPLAY_CANNOT_DUPLICATE_SETTLEMENT',
    'AI-001_AI_CANNOT_ALTER_LEDGER',
  ]),
});

function sumNumbers(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function validateBpsMap(name, map, expected) {
  const errors = [];
  for (const [key, value] of Object.entries(map)) {
    if (!Number.isInteger(value) || value < 0) {
      errors.push(`${name}.${key} must be a non-negative integer basis-point value`);
    }
  }
  const total = sumNumbers(Object.values(map));
  if (total !== expected) errors.push(`${name} must total ${expected} bps; got ${total}`);
  return errors;
}

function validateConstitution(constitution) {
  const errors = [];
  if (!constitution || constitution.reference !== 'TSN-26') {
    errors.push('constitution reference must be TSN-26');
  }

  errors.push(...validateBpsMap('top_level_bps', constitution.top_level_bps || {}, 10_000));
  errors.push(...validateBpsMap('operations_bps', constitution.operations_bps || {}, 4_300));
  errors.push(...validateBpsMap('sales_slots_bps', constitution.sales_slots_bps || {}, 2_100));

  if (Object.values(constitution.operations_bps || {}).includes(4_900)) {
    errors.push('legacy 49% operations value is forbidden');
  }
  if (constitution.top_level_bps?.ACTUAL_OPERATIONS !== 4_300) {
    errors.push('ACTUAL_OPERATIONS must equal 43%');
  }
  if (constitution.top_level_bps?.FISCAL_REGULATORY_RESERVE !== 1_600) {
    errors.push('FISCAL_REGULATORY_RESERVE must equal 16%');
  }
  if (constitution.top_level_bps?.SALES_POOL !== 2_100) {
    errors.push('SALES_POOL must equal 21%');
  }
  if (constitution.direct_purchase_discount_bps !== 700) {
    errors.push('direct purchase incentive must equal 7%');
  }
  if (constitution.money?.floating_point_money_forbidden !== true) {
    errors.push('floating point money must be forbidden');
  }
  if (constitution.money?.units_per_jod !== TMU_PER_JOD) {
    errors.push('1 JOD must equal 1,000,000 TMU');
  }
  if (JSON.stringify(constitution.canonical_packages_jod) !== JSON.stringify([2, 10, 25, 45])) {
    errors.push('canonical exposure packages must be T2/T10/T25/T45');
  }

  return { valid: errors.length === 0, errors };
}

function assertConstitution() {
  const validation = validateConstitution(TSN26_CONSTITUTION);
  if (!validation.valid) {
    throw new Error(`Invalid TSN-26 constitution: ${validation.errors.join('; ')}`);
  }
}

function allocateBps(amountTmu, basisPoints) {
  if (typeof amountTmu !== 'bigint') throw new TypeError('money amount must be bigint TMU');
  if (!Number.isInteger(basisPoints)) throw new TypeError('basis points must be an integer');
  const numerator = amountTmu * BigInt(basisPoints);
  if (numerator % BPS_DENOMINATOR !== 0n) {
    throw new Error('allocation requires precision reserve handling; exact TMU result unavailable');
  }
  return numerator / BPS_DENOMINATOR;
}

function normalizeSaleClaims(saleClaims) {
  if (!Array.isArray(saleClaims)) throw new TypeError('sale_claims must be an array');
  if (saleClaims.length > 1) {
    throw new Error('One Sale = One Economic Actor: at most one paid sale claim is allowed');
  }
  if (saleClaims.length === 0) return null;

  const claim = saleClaims[0];
  const allowed = new Set(['GENERAL_MANAGER', 'SECTOR_MANAGER', 'MARKETER']);
  if (!claim || !allowed.has(claim.actor_type)) throw new Error('sale claim actor_type is invalid');
  if (typeof claim.actor_uid !== 'string' || claim.actor_uid.trim() === '') {
    throw new Error('sale claim actor_uid is required');
  }
  return Object.freeze({ actor_type: claim.actor_type, actor_uid: claim.actor_uid });
}

function settleExposurePurchase({ package_jod, sale_claims = [] }) {
  assertConstitution();

  if (!Number.isInteger(package_jod) || !TSN26_CONSTITUTION.canonical_packages_jod.includes(package_jod)) {
    throw new Error('purchase must use a canonical package: T2/T10/T25/T45');
  }

  const winningClaim = normalizeSaleClaims(sale_claims);
  const listPriceTmu = BigInt(package_jod) * TMU_PER_JOD;
  const discountTmu = winningClaim
    ? 0n
    : allocateBps(listPriceTmu, TSN26_CONSTITUTION.direct_purchase_discount_bps);
  const collectedTmu = listPriceTmu - discountTmu;

  const allocations = {};
  for (const [account, bps] of Object.entries(TSN26_CONSTITUTION.top_level_bps)) {
    allocations[account] = allocateBps(collectedTmu, bps);
  }

  const salesSlots = {};
  for (const [slot, bps] of Object.entries(TSN26_CONSTITUTION.sales_slots_bps)) {
    const amountTmu = allocateBps(collectedTmu, bps);
    if (!winningClaim) {
      salesSlots[slot] = Object.freeze({
        amount_tmu: amountTmu,
        status: 'DIRECT_PURCHASE',
        beneficiary_uid: null,
        destination_account: 'SALES_ABSENCE_ACCOUNT',
      });
    } else if (winningClaim.actor_type === slot) {
      salesSlots[slot] = Object.freeze({
        amount_tmu: amountTmu,
        status: 'PAID_TO_ACTOR',
        beneficiary_uid: winningClaim.actor_uid,
        destination_account: `ACTOR:${winningClaim.actor_uid}`,
      });
    } else {
      salesSlots[slot] = Object.freeze({
        amount_tmu: amountTmu,
        status: 'ABSENT',
        beneficiary_uid: null,
        destination_account: 'SALES_ABSENCE_ACCOUNT',
      });
    }
  }

  const topLevelTotal = Object.values(allocations).reduce((sum, amount) => sum + amount, 0n);
  const salesSlotTotal = Object.values(salesSlots).reduce((sum, slot) => sum + slot.amount_tmu, 0n);
  if (salesSlotTotal !== allocations.SALES_POOL) {
    throw new Error('sales slot breakdown does not equal SALES_POOL');
  }

  const unexplainedVarianceTmu = collectedTmu - topLevelTotal;
  if (unexplainedVarianceTmu !== 0n) {
    throw new Error(`TSN-26 settlement imbalance: ${unexplainedVarianceTmu} TMU`);
  }

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
  TMU_PER_JOD,
  BPS_DENOMINATOR,
  TSN26_CONSTITUTION,
  validateConstitution,
  settleExposurePurchase,
});
