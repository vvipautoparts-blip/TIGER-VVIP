import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTicket, assignTicket } from '../../scripts/pr35/pr35-routing.js';
import { calculateSla } from '../../scripts/pr35/pr35-sla.js';

const now = '2026-07-14T12:00:00.000Z';
const ticket = { id: 'ticket-1', requesterId: 'user-1', category: 'fraud_safety', priority: 'urgent',
  sectorId: 'sector-auto', teamId: 'team-safety', status: 'new' };

test('routes by sector, type, priority and team with stable load tie-break', () => {
  const assignments = [
    { id: 'a3', subjectId: 'staff-z', state: 'active', sectorIds: ['sector-auto'], categories: ['fraud_safety'], priorities: ['urgent'], teamIds: ['team-safety'], openTicketCount: 1 },
    { id: 'a2', subjectId: 'staff-b', state: 'active', sectorIds: ['sector-auto'], categories: ['fraud_safety'], priorities: ['urgent'], teamIds: ['team-safety'], openTicketCount: 0 },
    { id: 'a1', subjectId: 'staff-a', state: 'active', sectorIds: ['sector-auto'], categories: ['fraud_safety'], priorities: ['urgent'], teamIds: ['team-safety'], openTicketCount: 0 },
    { id: 'bad', subjectId: 'staff-x', state: 'suspended', sectorIds: ['sector-auto'], categories: ['fraud_safety'], priorities: ['urgent'], teamIds: ['team-safety'], openTicketCount: 0 }
  ];
  const result = routeTicket({ ticket, assignments, now });
  assert.deepEqual({ assigneeId: result.assigneeId, assignmentId: result.assignmentId }, { assigneeId: 'staff-a', assignmentId: 'a1' });
  assert.equal(result.escalationRequired, true);
  assert.equal(routeTicket({ ticket, assignments: [], now }).code, 'NO_ELIGIBLE_ASSIGNEE');
});

test('ticket assignment requires explicit authority and immutable history', () => {
  const denied = assignTicket({ ticket, assigneeId: 'staff-a', actor: { id: 'forged', permissions: [] }, reason: 'توجيه', now });
  assert.equal(denied.code, 'PERMISSION_DENIED');
  const assigned = assignTicket({ ticket, assigneeId: 'staff-a', actor: { id: 'manager', permissions: ['care.ticket.assign'] }, reason: 'توجيه حسب الاختصاص', now });
  assert.equal(assigned.ok, true);
  assert.equal(assigned.ticket.assignmentHistory.length, 1);
  assert.equal(Object.isFrozen(assigned.ticket.assignmentHistory), true);
});

test('calculates response SLA due times and breach state at exact boundaries', () => {
  const createdAt = '2026-07-14T00:00:00.000Z';
  const hours = { urgent: 1, high: 4, normal: 24, low: 48 };
  for (const [priority, budget] of Object.entries(hours)) {
    const before = calculateSla({ priority, createdAt, now: new Date(Date.parse(createdAt) + budget * 3600000 - 1).toISOString() });
    assert.equal(before.breached, false);
    assert.equal(before.responseBudgetHours, budget);
    const due = calculateSla({ priority, createdAt, now: new Date(Date.parse(createdAt) + budget * 3600000).toISOString() });
    assert.equal(due.breached, true);
  }
  assert.equal(calculateSla({ priority: 'urgent', createdAt, acknowledgedAt: '2026-07-14T00:30:00.000Z', now: '2026-07-14T03:00:00.000Z' }).breached, false);
  assert.equal(calculateSla({ priority: 'normal', createdAt, resolvedAt: '2026-07-14T01:00:00.000Z', now: '2026-07-16T00:00:00.000Z' }).state, 'met');
});
