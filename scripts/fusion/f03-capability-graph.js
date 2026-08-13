import {
  AUTHORITY_CLASSES,
  LIMITS,
  PERMISSION_IDS
} from "../authorization/v13-authority-contracts.js";

const ENTRY_MAP = Object.freeze({
  "authorization.assignment.read": Object.freeze({ id: "my-capabilities", label: "My capabilities" }),
  "authorization.assignment.manage": Object.freeze({ id: "capability-assignments", label: "Capability assignments" }),
  "authorization.permission.delegate": Object.freeze({ id: "delegation", label: "Delegation" }),
  "authorization.partner.manage": Object.freeze({ id: "partners", label: "Partners" }),
  "authorization.audit.read": Object.freeze({ id: "audit-history", label: "Decision / audit history" }),
  "country.governance.read": Object.freeze({ id: "countries", label: "Countries" }),
  "country.governance.manage": Object.freeze({ id: "country-governance", label: "Country governance" }),
  "country.operation.execute": Object.freeze({ id: "country-operations", label: "Country operations" })
});

const FORBIDDEN_INTERMEDIARY_PREFIXES = Object.freeze([
  "checkout.",
  "escrow.",
  "delivery.",
  "shipping.",
  "transaction.settlement.",
  "transaction.commission.",
  "dispute."
]);

function denial(code) {
  return Object.freeze({
    ok: false,
    code,
    actor: null,
    entries: Object.freeze([])
  });
}

function malformed(snapshot) {
  return !snapshot
    || typeof snapshot !== "object"
    || Array.isArray(snapshot)
    || snapshot.schemaVersion !== "VVIP_TIGER_SCG_SNAPSHOT_V1"
    || typeof snapshot.actorId !== "string"
    || snapshot.actorId.length < 1
    || snapshot.actorId.length > LIMITS.IDENTIFIER
    || !AUTHORITY_CLASSES.includes(snapshot.authorityClass)
    || !Array.isArray(snapshot.permissionIds)
    || snapshot.permissionIds.length > LIMITS.PERMISSION_LIST
    || !snapshot.scope
    || typeof snapshot.scope !== "object"
    || Array.isArray(snapshot.scope)
    || typeof snapshot.policyVersion !== "string"
    || snapshot.policyVersion.length < 1
    || !Number.isSafeInteger(snapshot.assignmentRevision)
    || snapshot.assignmentRevision < 0;
}

export function buildCapabilityView(snapshot, nowMs = Date.now()) {
  if (!snapshot || snapshot.serverConfirmed !== true) {
    return denial("REMOTE_CONFIRMATION_REQUIRED");
  }

  if (malformed(snapshot)) {
    return denial("MALFORMED_CAPABILITY_SNAPSHOT");
  }

  const issuedAt = Date.parse(snapshot.issuedAt);
  const expiresAt = Date.parse(snapshot.expiresAt);
  if (!Number.isFinite(issuedAt)
    || !Number.isFinite(expiresAt)
    || !Number.isFinite(nowMs)
    || expiresAt <= issuedAt) {
    return denial("MALFORMED_CAPABILITY_SNAPSHOT");
  }

  if ((expiresAt - issuedAt) / 1000 > LIMITS.ENVELOPE_TTL_SECONDS) {
    return denial("CAPABILITY_SNAPSHOT_TTL_EXCEEDED");
  }

  if (expiresAt <= nowMs) {
    return denial("CAPABILITY_SNAPSHOT_EXPIRED");
  }

  for (const permission of snapshot.permissionIds) {
    if (typeof permission !== "string") {
      return denial("MALFORMED_CAPABILITY_SNAPSHOT");
    }

    if (FORBIDDEN_INTERMEDIARY_PREFIXES.some((prefix) => permission.startsWith(prefix))) {
      return denial("MARKETPLACE_INTERMEDIARY_CAPABILITY_DENIED");
    }

    if (!PERMISSION_IDS.includes(permission)) {
      return denial("UNKNOWN_PERMISSION");
    }
  }

  const entries = Object.freeze(snapshot.permissionIds.map((permission) => ENTRY_MAP[permission]));
  const actor = Object.freeze({
    id: snapshot.actorId,
    authorityClass: snapshot.authorityClass,
    scope: Object.freeze({ ...snapshot.scope }),
    policyVersion: snapshot.policyVersion,
    assignmentRevision: snapshot.assignmentRevision
  });

  return Object.freeze({
    ok: true,
    code: "OK",
    actor,
    entries
  });
}
