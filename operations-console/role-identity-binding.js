const IDENTITY_TYPES = Object.freeze([
  Object.freeze({ value: 'ACCOUNT_ID', label: 'رقم / معرّف الحساب الداخلي' }),
  Object.freeze({ value: 'CLERK_USER_ID', label: 'Clerk User ID' })
]);

const IDENTITY_VALUE_PATTERN = /^[A-Za-z0-9_-]{3,200}$/;

function createTypeField(documentRef) {
  const label = documentRef.createElement('label');
  label.dataset.roleIdentityField = 'type';
  label.append('ربط هوية العامل');

  const select = documentRef.createElement('select');
  select.name = 'identityType';
  select.required = true;
  select.setAttribute('aria-describedby', 'role-identity-help');

  for (const item of IDENTITY_TYPES) {
    const option = documentRef.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    select.append(option);
  }
  label.append(select);
  return label;
}

function createValueField(documentRef) {
  const label = documentRef.createElement('label');
  label.dataset.roleIdentityField = 'value';
  label.append('رقم الحساب أو رقم Clerk');

  const input = documentRef.createElement('input');
  input.name = 'identityValue';
  input.required = true;
  input.autocomplete = 'off';
  input.maxLength = 200;
  input.pattern = '[A-Za-z0-9_-]{3,200}';
  input.placeholder = 'acct_...';
  input.setAttribute('aria-describedby', 'role-identity-help');
  label.append(input);
  return label;
}

function createHelp(documentRef) {
  const help = documentRef.createElement('small');
  help.id = 'role-identity-help';
  help.dataset.roleIdentityHelp = 'true';
  help.style.gridColumn = '1 / -1';
  help.textContent = 'اختر معرّف الحساب الداخلي أو Clerk User ID. هذه المعاينة لا تثبت الهوية؛ في Production يجب أن يتحقق الخادم من التطابق قبل تفعيل أي دور.';
  return help;
}

function synchronizePlaceholder(form) {
  const type = form.elements.identityType;
  const value = form.elements.identityValue;
  if (!type || !value) return;
  value.placeholder = type.value === 'CLERK_USER_ID' ? 'user_...' : 'acct_...';
}

export function identityBindingFromForm(form) {
  if (!form || !form.elements) return null;
  const type = String(form.elements.identityType?.value || '').trim();
  const value = String(form.elements.identityValue?.value || '').trim();
  if (!IDENTITY_TYPES.some((item) => item.value === type)) return null;
  if (!IDENTITY_VALUE_PATTERN.test(value)) return null;
  if (type === 'CLERK_USER_ID' && !value.startsWith('user_')) return null;
  return Object.freeze({ type, value });
}

export function mountRoleIdentityBinding(documentRef = document) {
  const form = documentRef.querySelector('#assignment-form');
  if (!form || form.querySelector('[data-role-identity-field]')) return false;

  const reason = form.querySelector('textarea[name="reason"]')?.closest('label') || null;
  const typeField = createTypeField(documentRef);
  const valueField = createValueField(documentRef);
  const help = createHelp(documentRef);

  if (reason) {
    form.insertBefore(typeField, reason);
    form.insertBefore(valueField, reason);
    form.insertBefore(help, reason);
  } else {
    form.append(typeField, valueField, help);
  }

  form.elements.identityType.addEventListener('change', () => synchronizePlaceholder(form));
  synchronizePlaceholder(form);
  return true;
}

function watchForAssignmentForm(documentRef = document) {
  mountRoleIdentityBinding(documentRef);
  const Observer = documentRef.defaultView?.MutationObserver || globalThis.MutationObserver;
  if (typeof Observer !== 'function') return null;
  const root = documentRef.querySelector('#modal-root') || documentRef.body;
  if (!root) return null;
  const observer = new Observer(() => mountRoleIdentityBinding(documentRef));
  observer.observe(root, { childList: true, subtree: true });
  return observer;
}

if (typeof document !== 'undefined') watchForAssignmentForm(document);

export const ROLE_IDENTITY_BINDING_TYPES = IDENTITY_TYPES;
