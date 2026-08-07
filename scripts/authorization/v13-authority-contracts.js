const frozen = (values) => Object.freeze([...values]);

export const AUTHORITY_CLASSES = frozen([
  "OWNER_ROOT",
  "PARTNER_GLOBAL_ADMIN",
  "DELEGATED"
]);

export const ROLE_IDS = frozen([
  "owner",
  "partner",
  "platform_admin",
  "country_admin",
  "sector_manager",
  "regional_manager",
  "area_manager",
  "group_manager",
  "campaign_manager",
  "sales",
  "marketing",
  "tiger_care",
  "moderator",
  "service_provider",
  "regular_user"
]);

export const PERMISSION_IDS = frozen([
  "authorization.assignment.read",
  "authorization.assignment.manage",
  "authorization.permission.delegate",
  "authorization.partner.manage",
  "authorization.audit.read",
  "country.governance.read",
  "country.governance.manage",
  "country.operation.execute"
]);

export const SCOPE_LEVELS = frozen([
  "platform",
  "country",
  "sector",
  "region",
  "area",
  "team"
]);

export const ROLE_RANK = Object.freeze({
  regular_user: 0,
  service_provider: 1,
  sales: 1,
  marketing: 1,
  moderator: 2,
  tiger_care: 2,
  campaign_manager: 3,
  group_manager: 4,
  area_manager: 5,
  regional_manager: 6,
  sector_manager: 7,
  country_admin: 8,
  platform_admin: 9,
  partner: 10,
  owner: 11
});

const errorCodeValues = [
  "OK",
  "AUTHORIZED",
  "MALFORMED_ENVELOPE",
  "IDENTITY_REQUIRED",
  "IDENTITY_DENIED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_INACTIVE",
  "SESSION_INVALIDATED",
  "ENVELOPE_EXPIRED",
  "INVALID_SCOPE",
  "PERMISSION_DENIED",
  "OWNER_ROOT_IMMUTABLE",
  "PEER_PARTNER_MUTATION_DENIED",
  "CLIENT_AUTHORITY_FIELDS_DENIED",
  "STALE_AUTHORIZATION_ENVELOPE",
  "COUNTRY_SCOPE_MISMATCH",
  "COUNTRY_SEAL_REQUIRED",
  "SCOPE_ESCALATION_DENIED",
  "SELF_ELEVATION_DENIED",
  "UNOWNED_PERMISSION_DENIED",
  "DELEGATION_AUTHORITY_EXCEEDED",
  "DELEGATION_SCOPE_EXCEEDED",
  "UNKNOWN_ROLE",
  "UNKNOWN_PERMISSION",
  "INVALID_PERMISSION_LIST",
  "INVALID_ASSIGNMENT",
  "INVALID_ASSIGNMENT_WINDOW",
  "REASON_REQUIRED",
  "LEGAL_DECISION_REFERENCE_REQUIRED",
  "TRUSTED_ENFORCEMENT_REQUIRED",
  "CONFIGURATION_REQUIRED",
  "OFFLINE_PRIVILEGED_DENIED",
  "REMOTE_CONFIRMATION_REQUIRED",
  "REMOTE_ENFORCEMENT_FAILED",
  "INVALID_TIMESTAMP",
  "INVALID_CORRELATION_KEY",
  "INVALID_IDEMPOTENCY_KEY",
  "IDEMPOTENCY_CONFLICT",
  "ASSIGNMENT_NOT_FOUND",
  "ASSIGNMENT_TERMINAL"
];

export const ERROR_CODES = Object.freeze(
  Object.fromEntries(errorCodeValues.map((code) => [code, code]))
);

export const LIMITS = Object.freeze({
  ENVELOPE_TTL_SECONDS: 300,
  IDENTIFIER: 128,
  REASON: 500,
  LEGAL_REFERENCE: 128,
  PERMISSION_LIST: 50,
  ROLE_LIST: 50
});

const stableIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function isStableIdentifier(value, prefix) {
  return typeof value === "string"
    && typeof prefix === "string"
    && value.startsWith(prefix)
    && stableIdentifierPattern.test(value);
}
