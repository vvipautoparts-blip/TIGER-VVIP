import { CARE_CATEGORIES, CARE_PRIORITIES } from './pr35-contracts.js';
import { translate } from './pr35-i18n.js';

const labels = Object.freeze({ management_contact: 'تواصل رسمي مع الإدارة', support: 'دعم', complaint_report: 'شكوى أو بلاغ', missing_category: 'فئة غير موجودة', rejection_appeal: 'اعتراض على رفض', account_issue: 'مشكلة حساب', sector_access_request: 'طلب قطاع أو وصول', fraud_safety: 'احتيال أو سلامة', other: 'طلب آخر' });
const el = (tag, attrs = {}, text = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, value]) => key === 'class' ? node.className = value : node.setAttribute(key, value)); node.textContent = text; return node; };
const key = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
const queueableTransportCodes = new Set(['NETWORK_UNAVAILABLE', 'REQUEST_TIMEOUT', 'REQUEST_FAILED', 'REMOTE_ENFORCEMENT_FAILED']);

export async function submitCareRequest({ adapter, queue, payload, context, online }) {
  try {
    const result = await adapter.submitUserRequest(payload, context);
    if (result.ok) return Object.freeze({ state: 'sent', code: result.code });
    if (online() && !queueableTransportCodes.has(result.code)) return Object.freeze({ state: 'failed', code: result.code });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    const code = error?.code || 'REQUEST_FAILED';
    if (online() && !queueableTransportCodes.has(code)) return Object.freeze({ state: 'failed', code });
  }
  const queued = queue?.enqueue(payload, context);
  return queued?.ok
    ? Object.freeze({ state: 'pending', code: queued.code })
    : Object.freeze({ state: 'failed', code: queued?.code || 'QUEUE_UNAVAILABLE' });
}

export function createCareController({ root = document, adapter, identity, queue, clock = () => new Date().toISOString(), online = () => navigator.onLine }) {
  let layer; let opener; let requestController;
  function close() { requestController?.abort(); if (!layer) return; layer.remove(); layer = null; opener?.focus(); opener = null; }
  function open(trigger) {
    if (layer) return; opener = trigger || document.activeElement;
    layer = el('div', { class: 'pr35-layer', 'data-care-dialog': '' });
    const dialog = el('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-care-title', tabindex: '-1' });
    const title = el('h2', { id: 'pr35-care-title' }, translate('care.title'));
    const disclosure = el('p', { class: 'pr35-disclosure' }, translate('mode.local'));
    const form = el('form', { class: 'pr35-form', 'data-care-form': '' });
    const category = el('select', { name: 'category', required: '', 'aria-label': 'نوع الطلب' });
    CARE_CATEGORIES.forEach((id) => category.append(el('option', { value: id }, labels[id])));
    const priority = el('select', { name: 'priority', required: '', 'aria-label': 'الأولوية' });
    CARE_PRIORITIES.forEach((id) => priority.append(el('option', { value: id }, ({ low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' })[id])));
    priority.value = 'normal';
    const subject = el('input', { name: 'subject', required: '', maxlength: '160', placeholder: 'موضوع الطلب', 'aria-label': 'موضوع الطلب' });
    const description = el('textarea', { name: 'description', required: '', maxlength: '4000', placeholder: 'اكتب التفاصيل دون بيانات دخول أو أسرار', 'aria-label': 'تفاصيل الطلب' });
    const status = el('p', { class: 'pr35-status', role: 'status', 'aria-live': 'polite', 'data-care-state': 'idle' });
    const submit = el('button', { type: 'submit', class: 'pr35-primary' }, 'إرسال الطلب');
    const cancel = el('button', { type: 'button', 'data-care-close': '' }, translate('common.cancel'));
    form.append(category, priority, subject, description, status, submit, cancel); dialog.append(title, disclosure, form); layer.append(dialog); document.body.append(layer);
    cancel.addEventListener('click', close);
    layer.addEventListener('click', (event) => { if (event.target === layer) close(); });
    layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); if (event.key === 'Tab') { const controls = [...dialog.querySelectorAll('button,input,select,textarea')]; const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); if (!form.reportValidity()) return;
      requestController?.abort(); requestController = new AbortController(); submit.disabled = true; status.dataset.careState = 'pending'; status.textContent = translate('care.pending');
      const actor = identity(); const context = { actor, now: clock(), correlationKey: key('corr'), idempotencyKey: key('idem'), signal: requestController.signal };
      const payload = { category: category.value, priority: priority.value, subject: subject.value, description: description.value };
      try {
        const result = await submitCareRequest({ adapter, queue, payload, context, online });
        status.dataset.careState = result.state;
        status.textContent = translate(result.state === 'sent' ? 'care.confirmation' : result.state === 'pending' ? 'care.offlinePending' : 'care.failed');
        if (result.state === 'sent') form.reset();
      } catch (error) { if (error.name !== 'AbortError') { status.dataset.careState = 'failed'; status.textContent = translate('care.failed'); } }
      finally { submit.disabled = false; }
    });
    dialog.focus();
  }
  return Object.freeze({ open, close });
}
