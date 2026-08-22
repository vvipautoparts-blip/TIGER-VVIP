import {
  AUTHORITY_CLASSES,
  isStableIdentifier
} from "./v13-authority-contracts.js";

export const ACT_AS_PERSONA_OPERATION = "act_as_persona";

function decision(allowed, code, personaId = null) {
  return Object.freeze({
    allowed,
    code,
    operation: ACT_AS_PERSONA_OPERATION,
    personaId: allowed ? personaId : null
  });
}

function validActor(actor) {
  return actor
    && typeof actor === "object"
    && typeof actor.id === "string"
    && actor.id.length > 0
    && actor.accountState === "active"
    && AUTHORITY_CLASSES.includes(actor.authorityClass);
}

function validPersonaId(personaId) {
  return typeof personaId === "string"
    && personaId.length > "persona_".length
    && isStableIdentifier(personaId, "persona_");
}

function bindingAuthorizesActor(binding, actorId, personaId) {
  return binding
    && typeof binding === "object"
    && binding.actorId === actorId
    && binding.personaId === personaId
    && binding.status === "active"
    && binding.canActAs === true;
}

export function authorizeActAsPersona({
  actor,
  request,
  trustedPersonaBindings
} = {}) {
  if (!validActor(actor)) {
    return decision(false, "IDENTITY_DENIED");
  }

  const personaId = request
    && typeof request === "object"
    && Object.hasOwn(request, "personaId")
    ? request.personaId
    : null;

  if (!validPersonaId(personaId)) {
    return decision(false, "INVALID_PERSONA");
  }

  if (!Array.isArray(trustedPersonaBindings)) {
    return decision(false, "PERSONA_AUTHORITY_DENIED");
  }

  const authorized = trustedPersonaBindings.some((binding) => (
    bindingAuthorizesActor(binding, actor.id, personaId)
  ));

  return authorized
    ? decision(true, "AUTHORIZED", personaId)
    : decision(false, "PERSONA_AUTHORITY_DENIED");
}
