export const AUTO_FREEZE_MESSAGE_AR = 'رصيدك محفوظ — لا نحرق الظهور عندما لا توجد فرصة مؤهلة.';

const COPY = Object.freeze({
  LOW: Object.freeze({
    label: 'الفرصة هادئة الآن',
    message: 'الفرص المؤهلة محدودة حاليًا؛ سيستمر التوزيع فقط عندما تتحقق شروط الأهلية.'
  }),
  BALANCED: Object.freeze({
    label: 'الفرصة متوازنة',
    message: 'توجد فرص مؤهلة متوازنة، ويستمر التوزيع وفق وضع Pulse المختار.'
  }),
  STRONG: Object.freeze({
    label: 'الفرصة قوية الآن',
    message: 'نشاط الفرص المؤهلة مرتفع حاليًا، مع بقاء الأهلية والتحقق قبل أي استهلاك.'
  }),
  FROZEN: Object.freeze({
    label: 'الحماية التلقائية مفعّلة',
    message: AUTO_FREEZE_MESSAGE_AR
  })
});

function cleanReason(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, 160) : null;
}

function frozenFailure() {
  return Object.freeze({
    ok: false,
    code: 'PULSE_OPPORTUNITY_INVALID',
    state: 'FROZEN',
    autoFrozen: true,
    label: COPY.FROZEN.label,
    message: AUTO_FREEZE_MESSAGE_AR,
    reason: null
  });
}

export function deriveOpportunityState(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return frozenFailure();
  const state = typeof snapshot.state === 'string' ? snapshot.state.trim().toUpperCase() : '';
  if (!Object.prototype.hasOwnProperty.call(COPY, state)) return frozenFailure();
  const copy = COPY[state];
  return Object.freeze({
    ok: true,
    code: 'OK',
    state,
    autoFrozen: state === 'FROZEN',
    label: copy.label,
    message: copy.message,
    reason: cleanReason(snapshot.reason)
  });
}

export const OPPORTUNITY_STATES = Object.freeze(Object.keys(COPY));
