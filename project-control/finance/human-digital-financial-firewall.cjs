'use strict';

const HUMAN_SALES_ROLES = Object.freeze([
  'GENERAL_MANAGER',
  'SECTOR_MANAGER',
  'MARKETER'
]);

const ZERO_DIGITAL_FINANCIAL_PROFILE = Object.freeze({
  financialBeneficiary: false,
  commissionBps: 0,
  shareBps: 0,
  financialEntitlement: 0,
  payoutDestination: null,
  walletAllowed: false,
  walletId: null
});

class FinancialFirewallError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FinancialFirewallError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new FinancialFirewallError(code, message);
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function hasFinancialDestination(value) {
  return value !== undefined && value !== null && value !== '';
}

function enforceFinancialActorPolicy(actor) {
  if (!actor || typeof actor !== 'object' || Array.isArray(actor)) {
    fail('INVALID_FINANCIAL_ACTOR', 'Financial actor must be an object.');
  }

  if (actor.actorType !== 'DIGITAL') {
    return { ...actor };
  }

  const attemptedBenefit =
    actor.financialBeneficiary === true ||
    isPositiveNumber(actor.commissionBps) ||
    isPositiveNumber(actor.shareBps) ||
    isPositiveNumber(actor.financialEntitlement) ||
    hasFinancialDestination(actor.payoutDestination) ||
    actor.walletAllowed === true ||
    hasFinancialDestination(actor.walletId) ||
    hasFinancialDestination(actor.wallet);

  if (attemptedBenefit) {
    fail(
      'DIGITAL_ACTOR_FINANCIAL_BENEFIT_PROHIBITED',
      'DIGITAL actors cannot receive commission, share, entitlement, payout destination, or wallet authority.'
    );
  }

  return {
    ...actor,
    ...ZERO_DIGITAL_FINANCIAL_PROFILE
  };
}

function validateSaleOwnershipClaims(claims) {
  if (!Array.isArray(claims)) {
    fail('INVALID_SALE_CLAIMS', 'Sale ownership claims must be an array.');
  }

  if (claims.length === 0) {
    return null;
  }

  if (claims.length > 1) {
    fail(
      'AMBIGUOUS_MULTI_WINNER_SALE_CLAIM',
      'One sale may have at most one winning sales-role claim.'
    );
  }

  const claim = claims[0];
  if (!claim || typeof claim !== 'object' || Array.isArray(claim)) {
    fail('INELIGIBLE_SALE_CLAIM', 'Sale claim must be an object.');
  }

  if (claim.actorType === 'DIGITAL') {
    fail(
      'DIGITAL_ACTOR_CANNOT_OWN_SALE',
      'DIGITAL actors cannot own sale commission claims.'
    );
  }

  const eligible =
    claim.actorType === 'HUMAN' &&
    claim.status === 'ACTIVE' &&
    claim.eligibility === 'ELIGIBLE' &&
    HUMAN_SALES_ROLES.includes(claim.role) &&
    typeof claim.userId === 'string' &&
    claim.userId.trim().length > 0;

  if (!eligible) {
    fail(
      'INELIGIBLE_SALE_CLAIM',
      'Sale claim must belong to one ACTIVE, ELIGIBLE HUMAN sales role with a user identity.'
    );
  }

  return { ...claim };
}

function assertSalesAdministrationAuthority(distribution) {
  if (!distribution || typeof distribution !== 'object') {
    fail('INVALID_FINANCIAL_DISTRIBUTION', 'Financial distribution authority is required.');
  }

  const percentages = distribution.salesAdministrationPercent;
  if (
    !percentages ||
    percentages.GENERAL_MANAGER !== 7 ||
    percentages.SECTOR_MANAGER !== 7 ||
    percentages.MARKETER !== 7 ||
    percentages.GENERAL_MANAGER + percentages.SECTOR_MANAGER + percentages.MARKETER !== 21 ||
    distribution.mainDistributionPercent?.SALES_ADMINISTRATION !== 21 ||
    distribution.oneSaleOneWinner !== true
  ) {
    fail(
      'SALES_ADMINISTRATION_AUTHORITY_MISMATCH',
      'Sales administration must remain 7 + 7 + 7 = 21 with one sale / one winner.'
    );
  }
}

function buildSalesAdministrationPlan({ claims, distribution }) {
  assertSalesAdministrationAuthority(distribution);
  const winner = validateSaleOwnershipClaims(claims);

  if (!winner) {
    if (
      distribution.selfService?.discountPercent !== 7 ||
      distribution.selfService?.appliesOnlyWhenNoSalesClaimant !== true ||
      distribution.selfService?.salesCommissionPaid !== false ||
      distribution.selfService?.salesAdministrationEnvelopeRoutesTo !== 'OWNER'
    ) {
      fail(
        'SELF_SERVICE_AUTHORITY_MISMATCH',
        'No-claimant purchases must use the current 7% self-service discount and route sales administration to OWNER.'
      );
    }

    return {
      winnerRole: null,
      winnerUserId: null,
      selfServiceDiscountPercent: 7,
      allocations: HUMAN_SALES_ROLES.map((sourceRole) => ({
        sourceRole,
        percent: 7,
        beneficiaryType: 'OWNER',
        beneficiaryUserId: null,
        reasonCode: 'ABSENT_SALES_ROLE'
      }))
    };
  }

  return {
    winnerRole: winner.role,
    winnerUserId: winner.userId,
    selfServiceDiscountPercent: 0,
    allocations: HUMAN_SALES_ROLES.map((sourceRole) => {
      if (sourceRole === winner.role) {
        return {
          sourceRole,
          percent: 7,
          beneficiaryType: 'HUMAN_SALES_ROLE',
          beneficiaryUserId: winner.userId,
          reasonCode: 'WINNING_SALES_ROLE'
        };
      }

      return {
        sourceRole,
        percent: 7,
        beneficiaryType: 'OWNER',
        beneficiaryUserId: null,
        reasonCode: 'NON_WINNING_SALES_ROLE'
      };
    })
  };
}

function assertFinalDistributionExecutable(distribution) {
  if (!distribution || typeof distribution !== 'object') {
    fail('INVALID_FINANCIAL_DISTRIBUTION', 'Financial distribution authority is required.');
  }

  if (
    distribution.pendingOwnerDecisionPercent !== 0 ||
    distribution.distributionExecutionAuthorized !== true
  ) {
    fail(
      'PENDING_OWNER_REALLOCATION',
      'Final distribution remains blocked until the owner explicitly reallocates the unresolved percentage.'
    );
  }

  const total = Object.values(distribution.mainDistributionPercent || {}).reduce((sum, value) => {
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);

  if (total !== 100) {
    fail(
      'FINANCIAL_DISTRIBUTION_NOT_100_PERCENT',
      'Final distribution execution requires an exact 100% current owner-authorized allocation.'
    );
  }

  return true;
}

module.exports = Object.freeze({
  HUMAN_SALES_ROLES,
  ZERO_DIGITAL_FINANCIAL_PROFILE,
  FinancialFirewallError,
  enforceFinancialActorPolicy,
  validateSaleOwnershipClaims,
  buildSalesAdministrationPlan,
  assertFinalDistributionExecutable
});
