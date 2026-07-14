import { CARE_CATEGORIES, CARE_PRIORITIES, TICKET_STATUSES } from './pr35-contracts.js';
import { normalizeText, assertSafeKey } from './pr35-sanitize.js';

export const AR_ACKNOWLEDGEMENT = 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.';
export const EN_ACKNOWLEDGEMENT = 'Your request has been received. We will contact you within 24 hours.';
const unsafeMarkup = /<\s*\/?\s*[a-z!]|(?:javascript|data)\s*:|\bon\w+\s*=/iu;
const transitions = Object.freeze({
  new: ['acknowledged', 'cancelled'], acknowledged: ['in_review', 'waiting_user', 'escalated', 'cancelled'],
  in_review: ['waiting_user', 'escalated', 'resolved', 'cancelled'],
  waiting_user: ['in_review', 'escalated', 'cancelled'], escalated: ['in_review', 'waiting_user', 'resolved', 'cancelled'],
  resolved: ['in_review', 'closed'], closed: [], cancelled: []
});
const fail = (code) => Object.freeze({ ok: false, code });
const clone = (value) => structuredClone(value);

export function safeCareText(value, { max, required = true } = {}) {
  const text = normalizeText(value, { max, required });
  if (unsafeMarkup.test(text)) throw Object.assign(new TypeError('UNSAFE_CONTENT'), { code: 'UNSAFE_CONTENT' });
  return text;
}

export function validateCareRequest(input) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('INVALID_REQUEST');
    for (const key of Object.keys(input)) assertSafeKey(key);
    if (!CARE_CATEGORIES.includes(input.category)) return fail('INVALID_REQUEST_TYPE');
    if (!CARE_PRIORITIES.includes(input.priority)) return fail('INVALID_PRIORITY');
    const value = Object.freeze({ requesterId: safeCareText(input.requesterId, { max: 128 }), category: input.category,
      priority: input.priority, subject: safeCareText(input.subject, { max: 160 }),
      description: safeCareText(input.description, { max: 4000 }),
      sectorId: safeCareText(input.sectorId, { max: 128, required: false }),
      regionId: safeCareText(input.regionId, { max: 128, required: false }),
      areaId: safeCareText(input.areaId, { max: 128, required: false }),
      listingId: safeCareText(input.listingId, { max: 128, required: false }),
      teamId: safeCareText(input.teamId, { max: 128, required: false }) });
    return Object.freeze({ ok: true, code: 'OK', value });
  } catch (error) { return fail(error.code || 'INVALID_REQUEST'); }
}

export function transitionTicket({ ticket, toStatus, actor, reason, resolutionSummary, now }) {
  if (!ticket || !TICKET_STATUSES.includes(ticket.status) || !TICKET_STATUSES.includes(toStatus)) return fail('INVALID_STATUS');
  const requesterCancellation = actor?.kind === 'user' && toStatus === 'cancelled';
  if (requesterCancellation) {
    if (!actor?.id || ticket.requesterId !== actor.id) return fail('TICKET_NOT_FOUND');
    if (ticket.status !== 'new') return fail('CANCELLATION_NOT_ALLOWED');
  } else if (!actor?.id || actor.kind !== 'staff' || !actor.permissions?.includes('care.ticket.transition')) return fail('PERMISSION_DENIED');
  if (!transitions[ticket.status].includes(toStatus)) return fail(transitions[ticket.status].length ? 'INVALID_TRANSITION' : 'TERMINAL_STATUS');
  try {
    const safeReason = safeCareText(reason, { max: 500 });
    let safeResolution = ticket.resolutionSummary || '';
    if (toStatus === 'resolved') safeResolution = safeCareText(resolutionSummary, { max: 1000 });
    const at = new Date(now); if (!Number.isFinite(at.getTime())) return fail('INVALID_TIMESTAMP');
    const reopening = ticket.status === 'resolved' && toStatus === 'in_review';
    const event = Object.freeze({ id: `transition:${ticket.id}:${at.toISOString()}:${toStatus}`, type: 'status_changed',
      actorId: actor.id, at: at.toISOString(), fromStatus: ticket.status, toStatus, reason: safeReason });
    const timeline = appendTimelineEvent(ticket.timeline || [], event);
    if (!Array.isArray(timeline)) return timeline;
    const next = Object.freeze({ ...clone(ticket), status: toStatus, resolutionSummary: safeResolution,
      reopenedCount: (ticket.reopenedCount || 0) + (reopening ? 1 : 0), timeline });
    return Object.freeze({ ok: true, code: reopening ? 'TICKET_REOPENED' : 'TICKET_TRANSITIONED', ticket: next,
      auditInput: Object.freeze({ action: reopening ? 'care.ticket.reopen' : 'care.ticket.transition', reason: safeReason, at: at.toISOString() }) });
  } catch (error) {
    if (error.code === 'FIELD_REQUIRED') return fail(reason === undefined || reason === null || reason === '' ? 'REASON_REQUIRED' : 'RESOLUTION_SUMMARY_REQUIRED');
    return fail(error.code || 'INVALID_COMMAND');
  }
}

export function projectTicketForRequester(ticket, actorId) {
  if (!ticket || !actorId || ticket.requesterId !== actorId) return fail('TICKET_NOT_FOUND');
  const { internalNotes: _n, routingReason: _r, auditMetadata: _a, assignmentHistory: _h,
    escalationHistory: _e, ...visible } = clone(ticket);
  visible.messages = (visible.messages || []).filter((message) => message.visibility === 'user');
  visible.timeline = (visible.timeline || []).filter((event) => event.visibility !== 'internal');
  return Object.freeze({ ok: true, code: 'OK', ticket: Object.freeze(visible) });
}

export function createCareTimeline() { return Object.freeze([]); }
export function appendTimelineEvent(timeline, event) {
  if (!Array.isArray(timeline) || !event?.id || !event.type || !event.actorId || !Number.isFinite(Date.parse(event.at))) return fail('INVALID_TIMELINE_EVENT');
  if (timeline.some((item) => item.id === event.id)) return fail('DUPLICATE_EVENT');
  return Object.freeze([...timeline.map((item) => Object.freeze(clone(item))), Object.freeze(clone(event))]);
}
