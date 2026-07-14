import { CARE_PRIORITIES } from './pr35-contracts.js';

export const SLA_RESPONSE_HOURS = Object.freeze({ urgent: 1, high: 4, normal: 24, low: 48 });
export function calculateSla({ priority, createdAt, acknowledgedAt = null, resolvedAt = null, now }) {
  if (!CARE_PRIORITIES.includes(priority)) return Object.freeze({ ok: false, code: 'INVALID_PRIORITY' });
  const created = Date.parse(createdAt); const current = Date.parse(now);
  if (!Number.isFinite(created) || !Number.isFinite(current)) return Object.freeze({ ok: false, code: 'INVALID_TIMESTAMP' });
  const responseBudgetHours = SLA_RESPONSE_HOURS[priority];
  const due = created + responseBudgetHours * 3600000;
  const stoppedAt = acknowledgedAt ? Date.parse(acknowledgedAt) : resolvedAt ? Date.parse(resolvedAt) : current;
  if (!Number.isFinite(stoppedAt)) return Object.freeze({ ok: false, code: 'INVALID_TIMESTAMP' });
  const breached = stoppedAt >= due;
  return Object.freeze({ ok: true, code: 'OK', responseBudgetHours, dueAt: new Date(due).toISOString(),
    breached, state: breached ? 'breached' : acknowledgedAt || resolvedAt ? 'met' : 'active',
    remainingMs: Math.max(0, due - stoppedAt) });
}
