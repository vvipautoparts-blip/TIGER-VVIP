export const AUTHORIZATION_QUERY_CONTRACT = Object.freeze({
  name: "V13.1_AUTHORIZATION_QUERY",
  version: 1
});

export const AUTHORIZATION_QUERY_CURSOR_CONTRACT = Object.freeze({
  name: "V13.1_AUTHORIZATION_QUERY_CURSOR",
  version: 1
});

export const AUTHORIZATION_QUERY_OPERATIONS = Object.freeze({
  listAssignments: Object.freeze({
    permission: "authorization.assignment.read",
    kind: "governance",
    family: "assignment",
    version: 1
  }),
  listAuditEvents: Object.freeze({
    permission: "authorization.audit.read",
    kind: "governance",
    family: "audit",
    version: 1
  })
});

export const AUTHORIZATION_ASSIGNMENT_STATES = Object.freeze([
  "pending",
  "active",
  "suspended",
  "revoked",
  "expired"
]);

export const AUTHORIZATION_QUERY_LIMITS = Object.freeze({
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 50,
  MAX_CURSOR_LENGTH: 2_048,
  CURSOR_TTL_MS: 300_000,
  MAX_ACTION_FILTERS: 10,
  MAX_AUDIT_WINDOW_MS: 90 * 24 * 60 * 60 * 1_000,
  MAX_RESULT_BYTES: 128 * 1_024,
  MAX_STRUCTURE_DEPTH: 10,
  MAX_STRUCTURE_ENTRIES: 256,
  MAX_ARRAY_ITEMS: 256,
  MAX_STRING_LENGTH: 4_096
});
