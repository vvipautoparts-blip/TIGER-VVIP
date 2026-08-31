'use strict';

const { CURRENT_OWNER_POLICY } = require('../policy/current-owner-policy.cjs');

const ACTOR_CLASSES = Object.freeze(new Set(['HUMAN', 'DIGITAL']));
const APPROVED_SALES_ROLES = Object.freeze(new Set(Object.keys(CURRENT_OWNER_POLICY.finance.salesRoles)));

function normalizeActor(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('ACTOR_INVALID');
  if (typeof input.actorId !== 'string' || input.actorId.trim() === '') throw new Error('ACTOR_INVALID');
  if (!ACTOR_CLASSES.has(input.actorClass)) throw new Error('ACTOR_CLASS_INVALID');
  if (typeof input.role !== 'string' || input.role.trim() === '') throw new Error('ACTOR_INVALID');
  return Object.freeze({
    actorId: input.actorId.trim(),
    actorClass: input.actorClass,
    role: input.role.trim(),
    active: input.active === true,
    verified: input.verified === true,
  });
}

function financialEligibilityForActor(actor) {
  if (!actor || actor.actorClass !== 'DIGITAL') throw new Error('DIGITAL_ACTOR_REQUIRED');
  return Object.freeze({
    isFinancialBeneficiary: false,
    commissionEligible: false,
    partnerSharePercent: 0,
    salesCommissionPercent: 0,
    financialEntitlementMicroJod: 0,
    payoutDestination: null,
  });
}

function assertEligibleHumanSalesWinner(actor) {
  if (!actor || actor.actorClass === 'DIGITAL') throw new Error('DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN');
  if (
    actor.actorClass !== 'HUMAN' ||
    actor.active !== true ||
    actor.verified !== true ||
    !APPROVED_SALES_ROLES.has(actor.role)
  ) throw new Error('HUMAN_SALES_WINNER_NOT_ELIGIBLE');
  return actor;
}

module.exports = Object.freeze({ normalizeActor, financialEligibilityForActor, assertEligibleHumanSalesWinner });
