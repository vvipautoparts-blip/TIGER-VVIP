const fail = (code) => Object.freeze({ ok: false, code });
const READ_OPERATIONS = new Set(['listTickets', 'getTicket']);

function confirmedResult(result, operation) {
  if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean' || typeof result.code !== 'string') {
    return fail('REMOTE_ENFORCEMENT_FAILED');
  }
  if (!result.ok) return Object.freeze(structuredClone(result));
  if (!READ_OPERATIONS.has(operation) && result.receipt?.confirmed !== true) {
    return fail('REMOTE_CONFIRMATION_REQUIRED');
  }
  return Object.freeze(structuredClone(result));
}

/**
 * Future trusted transport boundary. Configuration is injected by the host;
 * this module contains no endpoint or credential and performs no I/O itself.
 * Every write needs an explicit confirmed receipt from backend enforcement.
 */
export function createProductionCareAdapter({ transport, verified = false, online = () => true } = {}) {
  const call = async (operation, payload, context, privileged = false) => {
    if (typeof transport !== 'function' || verified !== true) return fail('CONFIGURATION_REQUIRED');
    if (!context?.actor?.id) return fail('IDENTITY_REQUIRED');
    try {
      if (!online()) return fail(privileged ? 'OFFLINE_PRIVILEGED_DENIED' : 'NETWORK_UNAVAILABLE');
      const result = await transport(Object.freeze({ operation, payload: structuredClone(payload), context: structuredClone(context) }));
      return confirmedResult(result, operation);
    } catch { return fail('REMOTE_ENFORCEMENT_FAILED'); }
  };
  return Object.freeze({
    listTickets: (query, context) => call('listTickets', query, context),
    submitUserRequest: (input, context) => call('submitUserRequest', input, context),
    getTicket: (id, context) => call('getTicket', { id }, context),
    addUserMessage: (id, input, context) => call('addUserMessage', { id, input }, context),
    addStaffMessage: (id, input, context) => call('addStaffMessage', { id, input }, context, true),
    addInternalNote: (id, input, context) => call('addInternalNote', { id, input }, context, true),
    escalateTicket: (id, input, context) => call('escalateTicket', { id, input }, context, true),
    mutateTicket: (input, context) => call('mutateTicket', input, context, true),
    mutateAuthorization: (input, context) => call('mutateAuthorization', input, context, true),
    appendAudit: (input, context) => call('appendAudit', input, context, true)
  });
}
