import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AR_ACKNOWLEDGEMENT, EN_ACKNOWLEDGEMENT, validateCareRequest,
  transitionTicket, projectTicketForRequester, createCareTimeline,
  appendTimelineEvent
} from '../../scripts/pr35/pr35-tiger-care.js';

const now = '2026-07-14T12:00:00.000Z';
const request = { requesterId: 'user-1', category: 'support', priority: 'normal',
  subject: 'مساعدة في الحساب', description: 'أحتاج إلى مساعدة آمنة', sectorId: 'sector-auto' };

test('validates exact catalogs, acknowledgement copy, sanitization and bounds', () => {
  assert.equal(AR_ACKNOWLEDGEMENT, 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.');
  assert.equal(EN_ACKNOWLEDGEMENT, 'Your request has been received. We will contact you within 24 hours.');
  assert.equal(validateCareRequest(request).ok, true);
  assert.equal(validateCareRequest({ ...request, category: 'management_phone' }).code, 'INVALID_REQUEST_TYPE');
  assert.equal(validateCareRequest({ ...request, priority: 'critical' }).code, 'INVALID_PRIORITY');
  assert.equal(validateCareRequest({ ...request, description: '<img src=x onerror=alert(1)>' }).code, 'UNSAFE_CONTENT');
  assert.equal(validateCareRequest({ ...request, description: 'x'.repeat(4001) }).code, 'FIELD_TOO_LONG');
  const polluted = JSON.parse('{"requesterId":"user-1","category":"support","priority":"normal","subject":"ok","description":"ok","__proto__":{"admin":true}}');
  assert.equal(validateCareRequest(polluted).code, 'UNSAFE_KEY');
});

test('enforces the complete state graph and controlled reopening', () => {
  const actor = { id: 'staff-1', kind: 'staff', permissions: ['care.ticket.transition', 'care.ticket.resolve'] };
  const ticket = { id: 'ticket-1', requesterId: 'user-1', status: 'new', timeline: [] };
  assert.equal(transitionTicket({ ticket, toStatus: 'acknowledged', actor, reason: 'بدء المتابعة', now }).ok, true);
  assert.equal(transitionTicket({ ticket, toStatus: 'resolved', actor, reason: 'قفز', now }).code, 'INVALID_TRANSITION');
  const resolved = { ...ticket, status: 'resolved', resolutionSummary: 'تمت المعالجة' };
  assert.equal(transitionTicket({ ticket: resolved, toStatus: 'in_review', actor, now }).code, 'REASON_REQUIRED');
  assert.equal(transitionTicket({ ticket: resolved, toStatus: 'in_review', actor, reason: 'ظهرت معلومات جديدة', now }).ticket.reopenedCount, 1);
  assert.equal(transitionTicket({ ticket: resolved, toStatus: 'closed', actor, reason: 'إغلاق موثق', now }).ok, true);
  assert.equal(transitionTicket({ ticket: { ...ticket, status: 'closed' }, toStatus: 'in_review', actor, reason: 'no', now }).code, 'TERMINAL_STATUS');
  assert.equal(transitionTicket({ ticket: { ...ticket, status: 'in_review' }, toStatus: 'resolved', actor, reason: 'تم', now }).code, 'RESOLUTION_SUMMARY_REQUIRED');
  assert.equal(transitionTicket({ ticket: { ...ticket, status: 'in_review' }, toStatus: 'resolved', actor, reason: 'تم', resolutionSummary: 'تمت استعادة الوصول', now }).ok, true);
});

test('requester cancellation is owner-isolated and stops after staff action', () => {
  const requester = { id: 'user-1', kind: 'user', permissions: [] };
  const newTicket = { id: 'ticket-1', requesterId: 'user-1', status: 'new', timeline: [] };
  assert.equal(transitionTicket({ ticket: newTicket, toStatus: 'cancelled', actor: requester, reason: 'لم أعد بحاجة للطلب', now }).ok, true);
  assert.equal(transitionTicket({ ticket: newTicket, toStatus: 'cancelled', actor: { ...requester, id: 'user-2' }, reason: 'محاولة عابرة', now }).code, 'TICKET_NOT_FOUND');
  assert.equal(transitionTicket({ ticket: { ...newTicket, status: 'acknowledged' }, toStatus: 'cancelled', actor: requester, reason: 'متأخر', now }).code, 'CANCELLATION_NOT_ALLOWED');
});

test('isolates requester ownership and strips internal data', () => {
  const ticket = { id: 'ticket-1', requesterId: 'user-1', status: 'in_review', subject: 'حسابي',
    messages: [{ id: 'm1', visibility: 'user', body: 'مرحبًا' }, { id: 'm2', visibility: 'internal', body: 'سجل داخلي' }],
    internalNotes: [{ id: 'n1', body: 'سري' }], routingReason: 'fraud lane', auditMetadata: { ip: 'x' } };
  assert.equal(projectTicketForRequester(ticket, 'user-2').code, 'TICKET_NOT_FOUND');
  const own = projectTicketForRequester(ticket, 'user-1');
  assert.equal(own.ok, true);
  assert.deepEqual(own.ticket.messages.map((m) => m.id), ['m1']);
  assert.equal('internalNotes' in own.ticket, false);
  assert.equal('routingReason' in own.ticket, false);
  assert.equal('auditMetadata' in own.ticket, false);
});

test('timeline is append-only and immutable', () => {
  const timeline = createCareTimeline();
  const next = appendTimelineEvent(timeline, { id: 'event-1', type: 'created', actorId: 'user-1', at: now });
  assert.equal(Object.isFrozen(next), true);
  assert.equal(Object.isFrozen(next[0]), true);
  assert.equal(timeline.length, 0);
  assert.throws(() => { next.push({}); }, TypeError);
  assert.equal(appendTimelineEvent(next, { id: 'event-1', type: 'created', actorId: 'user-1', at: now }).code, 'DUPLICATE_EVENT');
});
