import { validateIdempotencyKey, validateCorrelationKey } from './pr35-contracts.js';
import { validateCareRequest, safeCareText, projectTicketForRequester, transitionTicket, appendTimelineEvent } from './pr35-tiger-care.js';
import { createDedupeRegistry } from './pr35-network.js';
import { calculateSla } from './pr35-sla.js';
import { authorize } from './pr35-policy.js';

const fail = (code) => Object.freeze({ ok: false, code });
const clone = (value) => structuredClone(value);
const immutableList = (items) => Object.freeze(items.map((item) => Object.freeze(clone(item))));

export function createLocalCareAdapter({ clock = () => new Date().toISOString(), online = () => true, notifier } = {}) {
  const tickets = new Map(); const dedupe = createDedupeRegistry(); let ticketSequence = 0; let eventSequence = 0;
  const validateContext = (context) => !context?.actor?.id ? 'IDENTITY_REQUIRED'
    : !validateIdempotencyKey(context.idempotencyKey).ok ? 'INVALID_IDEMPOTENCY_KEY'
      : !validateCorrelationKey(context.correlationKey).ok ? 'INVALID_CORRELATION_KEY' : null;
  const run = async (payload, context, operation) => {
    const invalid = validateContext(context); if (invalid) return fail(invalid);
    try { return await dedupe.run(context.idempotencyKey, payload, operation); }
    catch (error) { return fail(error.code || 'INVALID_COMMAND'); }
  };
  const notify = async (ticket) => {
    if (notifier?.configured !== true || typeof notifier.send !== 'function') return Object.freeze({ status: 'not_configured' });
    try { const result = await notifier.send(Object.freeze({ type: 'care_request_received', ticketId: ticket.id, requesterId: ticket.requesterId }));
      return Object.freeze({ status: result?.confirmed === true ? 'confirmed' : 'failed' });
    } catch { return Object.freeze({ status: 'failed' }); }
  };
  const ticketScope = (ticket) => {
    if (ticket?.scope) return ticket.scope;
    if (ticket?.teamId && ticket?.areaId && ticket?.regionId && ticket?.sectorId) return { level: 'team', sectorId: ticket.sectorId, regionId: ticket.regionId, areaId: ticket.areaId, teamId: ticket.teamId };
    if (ticket?.areaId && ticket?.regionId && ticket?.sectorId) return { level: 'area', sectorId: ticket.sectorId, regionId: ticket.regionId, areaId: ticket.areaId };
    if (ticket?.regionId && ticket?.sectorId) return { level: 'region', sectorId: ticket.sectorId, regionId: ticket.regionId };
    if (ticket?.sectorId) return { level: 'sector', sectorId: ticket.sectorId };
    return { level: 'platform' };
  };
  const privileged = (context, permission, ticket) => {
    if (!online()) return 'OFFLINE_PRIVILEGED_DENIED';
    if (context?.actor?.kind !== 'staff') return 'PERMISSION_DENIED';
    const auth = authorize({ actor: context.actor, permission, resourceScope: ticketScope(ticket), now: context.now || clock() });
    return auth.allowed ? null : auth.code;
  };
  const find = (id) => tickets.get(id);

  async function submitUserRequest(input, context) {
    if (context?.actor?.kind !== 'user') return fail('PERMISSION_DENIED');
    if (input?.requesterId && input.requesterId !== context.actor.id) return fail('FORGED_IDENTITY');
    const bound = { ...input, requesterId: context.actor.id }; const valid = validateCareRequest(bound); if (!valid.ok) return valid;
    return run(valid.value, context, async () => {
      const createdAt = clock(); const id = `care-ticket-${++ticketSequence}`;
      const createdEvent = Object.freeze({ id: `care-event-${++eventSequence}`, type: 'created', actorId: context.actor.id, at: createdAt, visibility: 'user' });
      const sla = calculateSla({ priority: valid.value.priority, createdAt, now: createdAt });
      const ticket = Object.freeze({ id, ...clone(valid.value), status: 'new', createdAt, updatedAt: createdAt,
        assigneeId: null, messages: Object.freeze([]), internalNotes: Object.freeze([]), escalationHistory: Object.freeze([]),
        assignmentHistory: Object.freeze([]), timeline: Object.freeze([createdEvent]), sla });
      tickets.set(id, ticket); const notification = await notify(ticket);
      return Object.freeze({ ok: true, code: 'REQUEST_ACCEPTED', data: clone(ticket), receipt: Object.freeze({
        persistence: 'local_volatile', idempotencyKey: context.idempotencyKey,
        acknowledgement: 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.',
        email: Object.freeze({ status: 'not_configured' }), notification }) });
    });
  }

  async function getTicket(id, context) {
    const ticket = find(id); if (!ticket || !context?.actor?.id) return fail('TICKET_NOT_FOUND');
    if (context.actor.kind === 'user') { const projected = projectTicketForRequester(ticket, context.actor.id); return projected.ok ? Object.freeze({ ok: true, code: 'OK', data: projected.ticket }) : projected; }
    if (context.actor.kind !== 'staff' || privileged(context, 'care.ticket.read.scoped', ticket)) return fail('TICKET_NOT_FOUND');
    return Object.freeze({ ok: true, code: 'OK', data: clone(ticket) });
  }

  async function addStaffMessage(id, input, context) {
    if (!online()) return fail('OFFLINE_PRIVILEGED_DENIED');
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    const denied = privileged(context, 'care.message.create.scoped', ticket); if (denied) return fail(denied);
    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    return run({ id, body }, context, async () => {
      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    });
  }

  async function addUserMessage(id, input, context) {
    const ticket = find(id); if (!ticket || context?.actor?.kind !== 'user' || ticket.requesterId !== context.actor.id) return fail('TICKET_NOT_FOUND');
    if (input?.authorId && input.authorId !== context.actor.id) return fail('FORGED_IDENTITY');
    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    return run({ id, body }, context, async () => {
      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    });
  }

  async function addInternalNote(id, input, context) {
    if (!online()) return fail('OFFLINE_PRIVILEGED_DENIED');
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    const denied = privileged(context, 'care.internal_note.create', ticket); if (denied) return fail(denied);
    let body; try { body = safeCareText(input?.body, { max: 2000 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
    return run({ id, body, reason: context.reason }, context, async () => {
      const at = clock(); const note = Object.freeze({ id: `care-note-${++eventSequence}`, authorId: context.actor.id, body, at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'internal_note_added', actorId: context.actor.id, at, visibility: 'internal' });
      const next = Object.freeze({ ...ticket, internalNotes: immutableList([...ticket.internalNotes, note]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'INTERNAL_NOTE_ADDED', data: clone(note), audit: Object.freeze({ action: 'care.internal_note.create', reason: context.reason }) });
    });
  }

  async function changeStatus(id, command, context) {
    if (!online()) return fail('OFFLINE_PRIVILEGED_DENIED');
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    const denied = privileged(context, 'care.ticket.transition', ticket); if (denied) return fail(denied);
    return run({ id, ...command, reason: context.reason }, context, async () => {
      const result = transitionTicket({ ticket, toStatus: command.toStatus, actor: context.actor, reason: context.reason,
        resolutionSummary: command.resolutionSummary, now: clock() });
      if (!result.ok) return result; tickets.set(id, result.ticket); return Object.freeze({ ...result, data: clone(result.ticket) });
    });
  }

  async function escalateTicket(id, input, context) {
    if (!online()) return fail('OFFLINE_PRIVILEGED_DENIED');
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    const denied = privileged(context, 'care.ticket.escalate', ticket); if (denied) return fail(denied);
    let teamId; try { teamId = safeCareText(input?.toTeamId, { max: 128 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
    return run({ id, teamId, reason: context.reason }, context, async () => {
      if (!['acknowledged', 'in_review', 'waiting_user'].includes(ticket.status)) return fail('INVALID_TRANSITION');
      const at = clock(); const entry = Object.freeze({ id: `care-escalation-${++eventSequence}`, fromTeamId: ticket.teamId || null,
        toTeamId: teamId, actorId: context.actor.id, reason: context.reason, at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'escalated', actorId: context.actor.id, at, visibility: 'user' });
      const next = Object.freeze({ ...ticket, status: 'escalated', teamId, escalationHistory: immutableList([...ticket.escalationHistory, entry]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'TICKET_ESCALATED', data: clone(next), audit: Object.freeze({ action: 'care.ticket.escalate', reason: context.reason }) });
    });
  }

  return Object.freeze({ submitUserRequest, getTicket, addUserMessage, addStaffMessage, addInternalNote, transitionTicket: changeStatus,
    mutateTicket: changeStatus, escalateTicket,
    listTickets: async (query = {}, context) => {
      const all = [...tickets.values()];
      if (context?.actor?.kind === 'user') return Object.freeze({ ok: true, code: 'OK', items: immutableList(all.filter((ticket) => ticket.requesterId === context.actor.id).map((ticket) => projectTicketForRequester(ticket, context.actor.id).ticket).slice(0, Math.min(50, query.limit || 20))) });
      return fail('PERMISSION_DENIED');
    }
  });
}
