import { authorize, canDelegate } from './pr35-policy.js';
import { ROLE_IDS, PERMISSION_IDS, ROLE_TEMPLATES, SCOPE_LEVELS } from './pr35-contracts.js';
import { calculateSla } from './pr35-sla.js';

const PAGE_SIZE = 20;
const text = (value) => String(value ?? '').trim().toLocaleLowerCase();
export function filterAndPage(rows, { query = '', page = 1, pageSize = PAGE_SIZE } = {}, fields = ['id']) {
  const needle = text(query); const size = Math.min(PAGE_SIZE, Math.max(1, Number(pageSize) || PAGE_SIZE));
  const filtered = rows.filter((row) => !needle || fields.some((field) => text(row[field]).includes(needle)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / size)); const current = Math.min(pageCount, Math.max(1, Number(page) || 1));
  return Object.freeze({ items: filtered.slice((current - 1) * size, current * size), page: current, pageCount, total: filtered.length });
}
export function visibleProfileActions(assignDecision, stateDecision) {
  if (!assignDecision?.allowed) return Object.freeze([]);
  return Object.freeze(stateDecision?.allowed ? ['assign', 'suspend', 'revoke'] : ['assign']);
}
const make = (tag, attrs = {}, value = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, val]) => key === 'class' ? node.className = val : node.setAttribute(key, val)); node.textContent = value; return node; };
const scopeFrom = (form) => { const data = new FormData(form); const level = data.get('scopeLevel'); const scope = { level }; for (const key of ['sectorId', 'regionId', 'areaId', 'teamId']) { const value = text(data.get(key)); if (value) scope[key] = value; } return scope; };
const contextKey = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
const safeMessage = (code) => ({ OFFLINE_PRIVILEGED_DENIED: 'لا يمكن تنفيذ إجراء إداري دون اتصال آمن.', CONFIGURATION_REQUIRED: 'الخدمة الآمنة غير مهيأة. لم يتم حفظ أي تغيير.', PERMISSION_DENIED: 'هذا الإجراء غير متاح لصلاحياتك الحالية.', SCOPE_DENIED: 'النطاق المحدد خارج صلاحياتك.', SELF_ELEVATION_DENIED: 'لا يمكن تعديل صلاحياتك بنفسك.' })[code] || 'تعذر إتمام الإجراء بأمان. راجع البيانات وحاول مرة أخرى.';

export function createOwnerController({ root = document, repository, careAdapter, identity, clock = () => new Date().toISOString(), local = false }) {
  const actor = () => identity(); const now = () => clock(); let activeDialog; let returnFocus; let searchAbort; let debounce; let assignmentFilter = 'all';
  const decision = (permission, scope = { level: 'platform' }) => authorize({ actor: actor(), permission, resourceScope: scope, now: now() });
  const setStatus = (message, state = 'idle') => { const node = root.querySelector('[data-owner-status]'); if (node) { node.textContent = message; node.dataset.state = state; } };
  function closeDialog() { if (!activeDialog) return; activeDialog.remove(); activeDialog = null; returnFocus?.focus(); }
  function dialog(title) { returnFocus = document.activeElement; const layer = make('div', { class: 'pr35-layer' }); const panel = make('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-dialog-title', tabindex: '-1' }); panel.append(make('h2', { id: 'pr35-dialog-title' }, title)); layer.append(panel); document.body.append(layer); activeDialog = layer; layer.addEventListener('click', (event) => { if (event.target === layer) closeDialog(); }); layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDialog(); if (event.key === 'Tab') { const controls = [...panel.querySelectorAll('button,input,select,textarea')].filter((item) => !item.hidden && !item.disabled); const first = controls[0], last = controls.at(-1); if (!first) { event.preventDefault(); panel.focus(); } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }); return panel; }
  function openAssignment(subjectId = 'profile-user') {
    const permitted = decision('authorization.assignment.manage'); if (!permitted.allowed) { setStatus(safeMessage(permitted.code), 'failed'); return; }
    const panel = dialog('تكليف تشغيلي'); const form = make('form', { class: 'pr35-form', 'data-assignment-form': '' });
    const subject = make('input', { name: 'subjectId', value: subjectId, required: '', maxlength: '128', 'aria-label': 'معرف المستخدم' }); subject.value = subjectId;
    const role = make('select', { name: 'roleId', required: '', 'aria-label': 'المنصب' }); ROLE_IDS.filter((id) => id !== 'owner').forEach((id) => role.append(make('option', { value: id }, id.replaceAll('_', ' '))));
    const scopeLevel = make('select', { name: 'scopeLevel', required: '', 'aria-label': 'مستوى النطاق' }); SCOPE_LEVELS.forEach((id) => scopeLevel.append(make('option', { value: id }, id)));
    const scopeFields = [
      make('input', { name: 'sectorId', maxlength: '128', placeholder: 'معرف القطاع', 'aria-label': 'معرف القطاع' }),
      make('input', { name: 'regionId', maxlength: '128', placeholder: 'معرف المنطقة', 'aria-label': 'معرف المنطقة' }),
      make('input', { name: 'areaId', maxlength: '128', placeholder: 'معرف النطاق المحلي', 'aria-label': 'معرف النطاق المحلي' }),
      make('input', { name: 'teamId', maxlength: '128', placeholder: 'معرف الفريق', 'aria-label': 'معرف الفريق' })
    ];
    const syncScopeFields = () => {
      const requiredCount = SCOPE_LEVELS.indexOf(scopeLevel.value);
      scopeFields.forEach((field, index) => {
        const needed = index < requiredCount;
        field.toggleAttribute('required', needed); field.hidden = !needed; if (!needed) field.value = '';
      });
    };
    scopeLevel.addEventListener('change', syncScopeFields); syncScopeFields();
    const permission = make('select', { name: 'permissionIds', multiple: '', required: '', 'aria-label': 'الصلاحيات المفوضة' }); PERMISSION_IDS.filter((id) => id !== 'authorization.owner.manage' && id !== 'audit.event.append').forEach((id) => permission.append(make('option', { value: id }, id)));
    const expiry = make('input', { name: 'expiresAt', type: 'datetime-local', required: '', 'aria-label': 'تاريخ انتهاء التكليف' });
    const reason = make('textarea', { name: 'reason', required: '', maxlength: '500', 'data-assignment-reason': '', placeholder: 'سبب موثق ومطلوب', 'aria-label': 'سبب التكليف' });
    const state = make('div', { class: 'pr35-review', 'data-assignment-review': '', 'aria-live': 'polite' });
    const next = make('button', { type: 'button', class: 'pr35-primary' }, 'مراجعة التكليف'); const cancel = make('button', { type: 'button' }, 'إلغاء');
    form.append(subject, role, scopeLevel, ...scopeFields, permission, expiry, reason, state, next, cancel); panel.append(form); cancel.addEventListener('click', closeDialog);
    next.addEventListener('click', () => {
      if (!form.reportValidity()) return; const data = new FormData(form); const permissionIds = data.getAll('permissionIds'); const scope = scopeFrom(form);
      const review = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
      if (!review.allowed) { state.textContent = safeMessage(review.code); state.dataset.state = 'failed'; return; }
      state.textContent = `مراجعة قبل التأكيد: ${data.get('roleId')} — ${scope.level} — ${permissionIds.length} صلاحيات — ينتهي ${data.get('expiresAt')}`; state.dataset.state = 'review'; next.hidden = true;
      const confirm = make('button', { type: 'button', class: 'pr35-primary', 'data-assignment-confirm': '' }, 'تأكيد التكليف المحلي'); form.append(confirm); confirm.focus();
      confirm.addEventListener('click', async () => {
        const finalReview = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
        if (!finalReview.allowed || !navigator.onLine) { state.textContent = safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : finalReview.code); state.dataset.state = 'failed'; return; }
        confirm.disabled = true; state.textContent = 'جاري التحقق والتنفيذ…';
        const result = await repository.createAssignment({ subjectId: data.get('subjectId'), roleId: data.get('roleId'), permissionIds, scope, startsAt: now(), expiresAt: new Date(data.get('expiresAt')).toISOString() }, { actor: actor(), now: now(), reason: data.get('reason'), correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') });
        if (!result.ok) { state.textContent = safeMessage(result.code); state.dataset.state = 'failed'; confirm.disabled = false; return; }
        state.textContent = local ? 'تم التكليف داخل العرض المحلي المؤقت فقط.' : 'تم تأكيد التكليف من الخدمة الآمنة.'; state.dataset.state = 'sent'; await renderAssignments();
      });
    }); panel.focus();
  }
  async function changeAssignment(id, action) {
    const allowed = decision('authorization.assignment.manage'); if (!allowed.allowed || !navigator.onLine) { setStatus(safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : allowed.code), 'failed'); return; }
    const panel = dialog(action === 'revoke' ? 'سحب التكليف' : 'تعليق التكليف'); const form = make('form', { class: 'pr35-form' }); const reason = make('textarea', { required: '', maxlength: '500', 'aria-label': 'سبب الإجراء', placeholder: 'السبب مطلوب للتوثيق' }); const confirm = make('button', { type: 'submit', class: 'pr35-danger' }, 'تأكيد الإجراء'); form.append(reason, confirm); panel.append(form);
    form.addEventListener('submit', async (event) => { event.preventDefault(); if (!form.reportValidity()) return; confirm.disabled = true; const method = action === 'revoke' ? repository.revokeAssignment : repository.suspendAssignment; const result = await method({ assignmentId: id }, { actor: actor(), now: now(), reason: reason.value, correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') }); setStatus(result.ok ? 'تم تحديث التكليف محليًا مع سجل تدقيق.' : safeMessage(result.code), result.ok ? 'sent' : 'failed'); closeDialog(); await renderAssignments(); }); panel.focus();
  }
  async function renderAssignments(query = '') {
    const host = root.querySelector('[data-owner-assignments-list]'); if (!host) return; host.replaceChildren(make('div', { class: 'pr35-skeleton', 'aria-hidden': 'true' }));
    const result = await repository.listAssignments({ limit: 20, scope: { level: 'platform' } }, { actor: actor(), now: now() }); host.replaceChildren();
    if (!result.ok) { host.append(make('p', { class: 'pr35-empty' }, safeMessage(result.code))); return; }
    const filtered = assignmentFilter === 'all' ? result.items : result.items.filter((item) => item.state === assignmentFilter);
    const page = filterAndPage(filtered, { query },  ['subjectId', 'roleId', 'state']); if (!page.items.length) { host.append(make('p', { class: 'pr35-empty' }, 'لا توجد تكليفات مطابقة.')); return; }
    page.items.forEach((item) => { const card = make('article', { class: 'pr35-row' }); card.append(make('strong', {}, item.subjectId), make('span', {}, `${item.roleId} · ${item.scope.level} · ${item.state}`)); if (item.state === 'active') { const suspend = make('button', { type: 'button', 'data-suspend-assignment': item.id }, 'تعليق'); const revoke = make('button', { type: 'button', 'data-revoke-assignment': item.id }, 'سحب'); suspend.addEventListener('click', () => changeAssignment(item.id, 'suspend')); revoke.addEventListener('click', () => changeAssignment(item.id, 'revoke')); card.append(suspend, revoke); } host.append(card); });
  }
  function renderDemoQueues() {
    const care = root.querySelector('[data-owner-care-list]'); const permissions = root.querySelector('[data-owner-permission-list]'); const audit = root.querySelector('[data-owner-audit-list]');
    if (care) { const samples = [{ id: 'TC-1042', category: 'مشكلة حساب', priority: 'urgent', createdAt: new Date(Date.parse(now()) - 55 * 60000).toISOString() }, { id: 'TC-1041', category: 'اعتراض على رفض', priority: 'normal', createdAt: new Date(Date.parse(now()) - 2 * 3600000).toISOString() }]; care.replaceChildren(); samples.forEach((ticket) => { const sla = calculateSla({ priority: ticket.priority, createdAt: ticket.createdAt, now: now() }); const node = make('article', { class: `pr35-row${sla.breached || sla.remainingMs < 15 * 60000 ? ' is-warning' : ''}` }); node.append(make('strong', {}, `${ticket.id} — ${ticket.category}`), make('span', {}, sla.breached ? 'تجاوز SLA — يحتاج تصعيدًا' : `متبقٍ ${Math.max(1, Math.ceil(sla.remainingMs / 60000))} دقيقة`), make('button', { type: 'button', disabled: '', title: 'عرض توضيحي محلي' }, 'عرض محلي')); care.append(node); }); }
    if (permissions) permissions.replaceChildren(make('p', { class: 'pr35-empty' }, 'لا توجد طلبات صلاحية معلقة في العرض المحلي.'));
    if (audit) audit.replaceChildren(make('p', { class: 'pr35-empty' }, 'ستظهر أحداث التدقيق غير القابلة للتعديل بعد الإجراءات المحلية.'));
  }
  function bindSearch() { const input = root.querySelector('[data-owner-search]'); if (!input) return; input.addEventListener('input', () => { clearTimeout(debounce); searchAbort?.abort(); searchAbort = new AbortController(); debounce = setTimeout(() => { if (!searchAbort.signal.aborted) renderAssignments(input.value); }, 220); }); root.querySelectorAll('[data-owner-filter]').forEach((button) => button.addEventListener('click', () => { assignmentFilter = button.dataset.ownerFilter; root.querySelectorAll('[data-owner-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button))); renderAssignments(input.value); })); }
  async function mountConsole() { const gate = root.querySelector('[data-owner-auth-gate]'); const consoleNode = root.querySelector('[data-owner-console]'); const allowed = decision('owner.console.read'); if (!allowed.allowed) { if (gate) gate.textContent = safeMessage(allowed.code); return false; } if (gate) gate.hidden = true; if (consoleNode) consoleNode.hidden = false; root.querySelector('[data-owner-local-disclosure]')?.toggleAttribute('hidden', !local); root.querySelector('[data-new-assignment]')?.addEventListener('click', () => openAssignment()); bindSearch(); renderDemoQueues(); await renderAssignments(); return true; }
  function mountProfileActions(host) { const assign = decision('authorization.assignment.manage'); const state = host.dataset.assignmentId ? decision('authorization.assignment.manage') : { allowed: false }; const actions = visibleProfileActions(assign, state); if (!actions.length) { host.remove(); return; } host.hidden = false; const trigger = host.querySelector('[data-profile-actions-trigger]'); const menu = host.querySelector('[role="menu"]'); trigger.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button')?.focus(); }); host.querySelector('[data-profile-assign]')?.addEventListener('click', () => openAssignment(host.dataset.subjectId || 'profile-user')); host.querySelector('[data-profile-suspend]')?.toggleAttribute('hidden', !actions.includes('suspend')); host.querySelector('[data-profile-revoke]')?.toggleAttribute('hidden', !actions.includes('revoke')); if (host.dataset.assignmentId) { host.querySelector('[data-profile-suspend]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'suspend')); host.querySelector('[data-profile-revoke]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'revoke')); } menu.addEventListener('keydown', (event) => { const items = [...menu.querySelectorAll('button:not([hidden])')]; const index = items.indexOf(document.activeElement); if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length].focus(); } if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); } if (event.key === 'Escape') { menu.hidden = true; trigger.focus(); } }); }
  return Object.freeze({ mountConsole, mountProfileActions, openAssignment, closeDialog, renderAssignments });
}
