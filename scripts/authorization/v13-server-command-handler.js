import { LIMITS } from "./v13-authority-contracts.js";
import { rejectClientAuthorityFields } from "./v13-authorization-envelope.js";

const POLLUTION_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function boundedActorId(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= LIMITS.IDENTIFIER;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function containsPollutionKey(value, seen = new Set()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return true;
  seen.add(value);
  for (const key of Object.keys(value)) {
    if (POLLUTION_KEYS.has(key) || containsPollutionKey(value[key], seen)) return true;
  }
  seen.delete(value);
  return false;
}

export function createAuthorizationServerCommandHandler({
  loadTrustedState,
  runTransaction,
  clock
} = {}) {
  const configured = typeof loadTrustedState === "function"
    && typeof runTransaction === "function"
    && typeof clock === "function";

  async function execute(request) {
    if (!configured) return fail("CONFIGURATION_REQUIRED");
    if (!boundedActorId(request?.authenticatedActorId)) return fail("IDENTITY_REQUIRED");
    if (request?.envelope?.actorId !== request.authenticatedActorId) {
      return fail("IDENTITY_DENIED");
    }
    if (!isPlainObject(request?.command) || containsPollutionKey(request.command)) {
      return fail("CLIENT_AUTHORITY_FIELDS_DENIED");
    }
    const clientFieldDecision = rejectClientAuthorityFields(request.command);
    if (!clientFieldDecision.ok) return fail(clientFieldDecision.code);
    return fail("REMOTE_ENFORCEMENT_FAILED");
  }

  return Object.freeze({ execute });
}
