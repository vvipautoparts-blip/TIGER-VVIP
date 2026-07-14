import { safeCareText } from './pr35-tiger-care.js';

const fail = (code) => Object.freeze({ ok: false, code });
const eligible = (assignment, ticket, now) => assignment.state === 'active'
  && (!assignment.startsAt || Date.parse(assignment.startsAt) <= Date.parse(now))
  && (!assignment.expiresAt || Date.parse(now) < Date.parse(assignment.expiresAt))
  && (!assignment.sectorIds?.length || assignment.sectorIds.includes(ticket.sectorId))
  && (!assignment.categories?.length || assignment.categories.includes(ticket.category))
  && (!assignment.priorities?.length || assignment.priorities.includes(ticket.priority))
  && (!assignment.teamIds?.length || assignment.teamIds.includes(ticket.teamId));

export function routeTicket({ ticket, assignments = [], now }) {
  if (!ticket || !Number.isFinite(Date.parse(now))) return fail('INVALID_ROUTING_INPUT');
  const matches = assignments.filter((item) => eligible(item, ticket, now)).sort((a, b) =>
    (a.openTicketCount || 0) - (b.openTicketCount || 0) || a.subjectId.localeCompare(b.subjectId) || a.id.localeCompare(b.id));
  if (!matches.length) return Object.freeze({ ok: false, code: 'NO_ELIGIBLE_ASSIGNEE', assigneeId: null,
    teamId: ticket.teamId || null, escalationRequired: true });
  const match = matches[0];
  return Object.freeze({ ok: true, code: 'ROUTED', assigneeId: match.subjectId, assignmentId: match.id,
    teamId: ticket.teamId || match.teamIds?.[0] || null,
    escalationRequired: ticket.priority === 'urgent' || ticket.category === 'fraud_safety' });
}

export function assignTicket({ ticket, assigneeId, actor, reason, now }) {
  if (!actor?.permissions?.includes('care.ticket.assign')) return fail('PERMISSION_DENIED');
  try {
    const safeAssignee = safeCareText(assigneeId, { max: 128 }); const safeReason = safeCareText(reason, { max: 500 });
    const at = new Date(now); if (!Number.isFinite(at.getTime())) return fail('INVALID_TIMESTAMP');
    const entry = Object.freeze({ assigneeId: safeAssignee, assignedBy: actor.id, reason: safeReason, at: at.toISOString() });
    const history = Object.freeze([...(ticket.assignmentHistory || []).map((item) => Object.freeze(structuredClone(item))), entry]);
    return Object.freeze({ ok: true, code: 'TICKET_ASSIGNED', ticket: Object.freeze({ ...structuredClone(ticket), assigneeId: safeAssignee, assignmentHistory: history }), auditInput: entry });
  } catch (error) { return fail(error.code || 'INVALID_ASSIGNMENT'); }
}
