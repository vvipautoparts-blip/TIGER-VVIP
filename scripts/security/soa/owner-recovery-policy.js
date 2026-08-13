export const OWNER_RECOVERY_HOLD_SECONDS = 24 * 60 * 60;
const STRONG_START_FACTORS = Object.freeze(['secondaryPasskey','totp','backupCode']);

function frozen(value){ return Object.freeze(value); }
function factorsObject(value){ return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

export function evaluateOwnerRecoveryStart({ factors = {}, totalCredentialLoss = false } = {}) {
  const normalized = factorsObject(factors);
  if (totalCredentialLoss === true) {
    return frozen({
      allowed:true,
      code:'OWNER_RECOVERY_HOLD_REQUIRED',
      recoveryState:'PENDING',
      holdSeconds:OWNER_RECOVERY_HOLD_SECONDS,
      l4Blocked:true,
      sovereignAuthorized:false,
    });
  }
  const strong = STRONG_START_FACTORS.some((key) => normalized[key] === true);
  if (!strong) {
    return frozen({
      allowed:false,
      code:'ERR_OWNER_RECOVERY_STRONG_FACTOR_REQUIRED',
      recoveryState:'NONE',
      holdSeconds:0,
      l4Blocked:true,
      sovereignAuthorized:false,
    });
  }
  return frozen({
    allowed:true,
    code:'OWNER_RECOVERY_STRONG_FACTOR_ACCEPTED',
    recoveryState:'PENDING',
    holdSeconds:0,
    l4Blocked:true,
    sovereignAuthorized:false,
  });
}

export function evaluateOwnerRecoveryCompletion({ serverEvidenceVerified = false, holdElapsed = false, factors = {} } = {}) {
  const normalized = factorsObject(factors);
  const factorsReady = normalized.passkey === true && normalized.totp === true && normalized.backupCodes === true;
  const ready = serverEvidenceVerified === true && holdElapsed === true && factorsReady;
  return frozen({
    readyForAuthorityReview:ready,
    code: ready ? 'OWNER_RECOVERY_READY_FOR_AUTHORITY_REVIEW' : 'ERR_OWNER_RECOVERY_COMPLETION_BLOCKED',
    sovereignAuthorized:false,
    l4Blocked:true,
  });
}
