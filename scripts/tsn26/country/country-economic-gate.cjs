'use strict';

const { MANIFEST } = require('../financial/constitution.cjs');

const COST_KEYS = Object.freeze([
  'actual_tax',
  'withholding',
  'regulatory_cost',
  'psp_fee',
  'fx_buffer',
  'refund_reserve',
  'fraud_reserve',
]);

const PROTECTED_ECONOMIC_ACCOUNTS = new Set([
  'OWNER',
  'PARTNER_1',
  'PARTNER_2',
  'PARTNER_3',
  'SALES_POOL',
]);

const ACCOUNT_CAPACITY_BPS = Object.freeze({
  FISCAL_REGULATORY_RESERVE: MANIFEST.allocationsBps.fiscalRegulatoryReserve,
  'OPERATIONS:RISK': MANIFEST.operationsBps.risk,
  'OPERATIONS:MAINTENANCE': MANIFEST.operationsBps.maintenance,
  'OPERATIONS:DEVELOPMENT': MANIFEST.operationsBps.development,
  'OPERATIONS:TECHNICAL_SUPPORT': MANIFEST.operationsBps.technicalSupport,
  'OPERATIONS:ADVERTISING': MANIFEST.operationsBps.advertising,
  'OPERATIONS:CSR': MANIFEST.operationsBps.csr,
});

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

function validBps(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10_000;
}

function normalizeEconomics(raw) {
  const economics = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (const key of Object.keys(economics)) {
    if (!COST_KEYS.includes(key)) throw new Error(`unknown country economic cost: ${key}`);
  }
  return Object.fromEntries(COST_KEYS.map((key) => {
    const value = economics[key] ?? 0;
    if (!validBps(value)) throw new Error(`country economic cost ${key} must be integer basis points`);
    return [key, value];
  }));
}

function evaluateCountryEconomicGate(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error('country profile is required');
  if (typeof profile.country_code !== 'string' || !/^[A-Z]{2}$/.test(profile.country_code)) throw new Error('country_code must be two uppercase letters');
  if (typeof profile.policy_version !== 'string' || profile.policy_version.trim() === '') throw new Error('country policy_version is required');

  const reasons = [];
  const gates = profile.gates && typeof profile.gates === 'object' && !Array.isArray(profile.gates) ? profile.gates : {};
  for (const gate of ['legal', 'security', 'payment', 'privacy']) {
    if (gates[gate] !== true) reasons.push(`COUNTRY_GATE_FAILED:${gate}`);
  }

  const economics = normalizeEconomics(profile.economics_bps);
  const classification = profile.cost_classification && typeof profile.cost_classification === 'object' && !Array.isArray(profile.cost_classification)
    ? profile.cost_classification
    : {};
  const accountUsage = Object.fromEntries(Object.keys(ACCOUNT_CAPACITY_BPS).map((account) => [account, 0]));

  for (const key of COST_KEYS) {
    const cost = economics[key];
    if (cost === 0) continue;
    const account = classification[key];
    if (typeof account !== 'string' || account.trim() === '') {
      reasons.push(`UNCLASSIFIED_COST:${key}`);
      continue;
    }
    if (PROTECTED_ECONOMIC_ACCOUNTS.has(account)) {
      reasons.push(`FORBIDDEN_COST_ACCOUNT:${account}`);
      continue;
    }
    if (!Object.hasOwn(ACCOUNT_CAPACITY_BPS, account)) {
      reasons.push(`UNKNOWN_COST_ACCOUNT:${account}`);
      continue;
    }
    accountUsage[account] += cost;
  }

  let capacityExceeded = false;
  let capacityReview = false;
  for (const [account, usedBps] of Object.entries(accountUsage)) {
    const capacityBps = ACCOUNT_CAPACITY_BPS[account];
    if (usedBps > capacityBps) {
      reasons.push(`ACCOUNT_CAPACITY_EXCEEDED:${account}`);
      capacityExceeded = true;
      continue;
    }
    if (usedBps > 0 && usedBps * 10_000 >= capacityBps * 8_500) {
      reasons.push(`ACCOUNT_CAPACITY_REVIEW:${account}`);
      capacityReview = true;
    }
  }

  const hardFailure = reasons.some((reason) => !reason.startsWith('ACCOUNT_CAPACITY_REVIEW:'));
  const status = hardFailure ? 'RED' : capacityReview ? 'AMBER' : 'GREEN';
  const financialGate = status === 'GREEN';
  const goLiveAllowed = financialGate && ['legal', 'security', 'payment', 'privacy'].every((gate) => gates[gate] === true);

  const utilization = Object.fromEntries(Object.entries(accountUsage).map(([account, usedBps]) => [account, {
    used_bps: usedBps,
    capacity_bps: ACCOUNT_CAPACITY_BPS[account],
    remaining_bps: ACCOUNT_CAPACITY_BPS[account] - usedBps,
  }]));

  return freezeDeep({
    gate_version: 'TIGER_COUNTRY_ECONOMIC_GATE_V1',
    reference: 'TSN-26',
    constitution_id: MANIFEST.id,
    country_code: profile.country_code,
    country_policy_version: profile.policy_version,
    fiscal_regulatory_reserve_bps: MANIFEST.allocationsBps.fiscalRegulatoryReserve,
    country_actual_tax_bps: economics.actual_tax,
    fiscal_reserve_is_statutory_tax: false,
    economics_bps: economics,
    account_utilization: utilization,
    gate_status: {
      legal: gates.legal === true ? 'PASS' : 'FAIL',
      financial: financialGate ? 'PASS' : status,
      security: gates.security === true ? 'PASS' : 'FAIL',
      payment: gates.payment === true ? 'PASS' : 'FAIL',
      privacy: gates.privacy === true ? 'PASS' : 'FAIL',
    },
    status,
    go_live_allowed: goLiveAllowed,
    constitutional_change_required: capacityExceeded,
    reasons: [...new Set(reasons)].sort(),
  });
}

module.exports = Object.freeze({
  COST_KEYS,
  ACCOUNT_CAPACITY_BPS,
  PROTECTED_ECONOMIC_ACCOUNTS,
  evaluateCountryEconomicGate,
});
