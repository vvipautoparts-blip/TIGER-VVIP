import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { translate, dictionaries } from '../../scripts/pr35/pr35-i18n.js';
import { filterAndPage, visibleProfileActions } from '../../scripts/pr35/pr35-owner-controller.js';
import { resolveCareIdentity, waitForClerk } from '../../scripts/pr35/pr35-bootstrap.js';
import { submitCareRequest } from '../../scripts/pr35/pr35-care-controller.js';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Care demo identity is limited to local preview', () => {
  assert.equal(resolveCareIdentity({ local: true }).id, 'demo-member');
  assert.deepEqual(resolveCareIdentity({ local: false }), { id: null, kind: 'user', accountState: 'inactive', assignments: [] });
  assert.equal(resolveCareIdentity({ local: false, clerkUser: { id: 'user-live' } }).id, 'user-live');
});

test('authorization bootstrap waits for Clerk initialization before reading identity', async () => {
  let clerk = null; let loads = 0; let polls = 0;
  const ready = { loaded: false, user: { id: 'owner-live' }, load: async () => { loads++; ready.loaded = true; } };
  const result = await waitForClerk({
    getClerk: () => clerk,
    timeoutMs: 100,
    pollMs: 1,
    sleep: async () => { polls++; clerk = ready; }
  });
  assert.equal(result.user.id, 'owner-live');
  assert.equal(loads, 1);
  assert.equal(polls, 1);
});

test('owner control loads the existing Clerk runtime before authorization bootstrap', async () => {
  const html = await read('owner-control.html');
  const clerk = html.indexOf('clerk.browser.js');
  const bootstrap = html.indexOf('scripts/pr35/pr35-bootstrap.js');
  assert.ok(clerk >= 0, 'owner control must load Clerk');
  assert.ok(clerk < bootstrap, 'Clerk must be declared before the authorization bootstrap');
});

test('offline pending is reported only after durable session enqueue succeeds', async () => {
  const base = { adapter: { submitUserRequest: async () => ({ ok: false, code: 'NETWORK_UNAVAILABLE' }) },
    payload: { category: 'support' }, context: { actor: { id: 'user-1', kind: 'user' } }, online: () => false };
  let enqueued = 0;
  const pending = await submitCareRequest({ ...base, queue: { enqueue: () => { enqueued++; return { ok: true, code: 'QUEUED' }; } } });
  assert.equal(enqueued, 1);
  assert.deepEqual(pending, { state: 'pending', code: 'QUEUED' });
  const failed = await submitCareRequest({ ...base, queue: { enqueue: () => ({ ok: false, code: 'SESSION_STORAGE_UNAVAILABLE' }) } });
  assert.deepEqual(failed, { state: 'failed', code: 'SESSION_STORAGE_UNAVAILABLE' });
});

test('transport failure queues a user submission even when the online hint is true', async () => {
  let enqueued = 0;
  const result = await submitCareRequest({
    adapter: { submitUserRequest: async () => ({ ok: false, code: 'REMOTE_ENFORCEMENT_FAILED' }) },
    queue: { enqueue: () => { enqueued++; return { ok: true, code: 'QUEUED' }; } },
    payload: { category: 'support' }, context: { actor: { id: 'user-1', kind: 'user' } }, online: () => true
  });
  assert.equal(enqueued, 1);
  assert.deepEqual(result, { state: 'pending', code: 'QUEUED' });
});

test('profile actions are absent unless policy explicitly authorizes them', () => {
  const denied = visibleProfileActions({ allowed: false }, { allowed: false });
  assert.deepEqual(denied, []);
  assert.deepEqual(visibleProfileActions({ allowed: true }, { allowed: false }), ['assign']);
  assert.deepEqual(visibleProfileActions({ allowed: true }, { allowed: true }), ['assign', 'suspend', 'revoke']);
});

test('owner search is normalized and pagination is bounded to twenty', () => {
  const rows = Array.from({ length: 45 }, (_, index) => ({ id: `a-${index}`, label: `مستخدم ${index}` }));
  const page = filterAndPage(rows, { query: ' مستخدم ', page: 2, pageSize: 200 }, ['label']);
  assert.equal(page.items.length, 20);
  assert.equal(page.page, 2);
  assert.equal(page.pageCount, 3);
  assert.equal(page.total, 45);
});

test('Arabic and English dictionaries are complete and confirmation is exact', () => {
  assert.deepEqual(Object.keys(dictionaries.ar).sort(), Object.keys(dictionaries.en).sort());
  assert.equal(translate('care.confirmation', 'ar'), 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.');
  assert.match(translate('mode.local', 'en'), /local/i);
});

test('canonical pages expose accessible lazy UI integration hooks', async () => {
  const [profile, owner, care, bootstrap] = await Promise.all([
    read('private-profile-p03.html'), read('owner-control.html'),
    read('scripts/pr35/pr35-care-controller.js'), read('scripts/pr35/pr35-bootstrap.js')
  ]);
  assert.match(profile, /data-profile-actions-menu/);
  assert.match(profile, /data-vvip-tiger-care-entry/);
  assert.match(profile, /vvip-pr35-owner-care\.css/);
  assert.match(profile, /pr35-bootstrap\.js/);
  assert.match(owner, /data-owner-auth-gate/);
  assert.match(owner, /data-owner-console[^>]*hidden/);
  assert.match(owner, /data-owner-assignments/);
  assert.match(owner, /data-owner-permission-requests/);
  assert.match(owner, /data-owner-care-queue/);
  assert.match(owner, /data-owner-audit/);
  assert.match(owner, /aria-live="polite"/);
  assert.match(care, /role.{0,20}dialog|role = "dialog"/s);
  assert.match(care, /AbortController/);
  assert.match(care, /pending|failed|sent/);
  assert.match(bootstrap, /import\(['"]\.\/pr35-(?:care|owner)-controller\.js['"]\)/);
});

test('assignment flow requires reason and review before confirmation', async () => {
  const source = await read('scripts/pr35/pr35-owner-controller.js');
  assert.match(source, /data-assignment-reason/);
  assert.match(source, /data-assignment-review/);
  assert.match(source, /review/i);
  assert.match(source, /canDelegate|authorize/);
  assert.doesNotMatch(source, /innerHTML\s*=/);
});

test('assignment form collects and requires the complete selected scope hierarchy', async () => {
  const source = await read('scripts/pr35/pr35-owner-controller.js');
  for (const key of ['sectorId', 'regionId', 'areaId', 'teamId']) {
    assert.match(source, new RegExp(`name: ['"]${key}['"]`));
  }
  assert.match(source, /scopeLevel\.addEventListener\(['"]change['"]/);
  assert.match(source, /toggleAttribute\(['"]required['"]/);
});

test('shared UI meets RTL, focus, motion, touch and stable loading contracts', async () => {
  const css = await read('styles/vvip-pr35-owner-care.css');
  assert.match(css, /min-(?:block-size|height):\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /inset-inline/);
  assert.match(css, /min-block-size/);
  assert.match(css, /\[dir="ltr"\]/);
});

test('Tiger Care disclosure is mode-aware and bootstrap forwards local mode', async () => {
  const [care, bootstrap] = await Promise.all([
    read('scripts/pr35/pr35-care-controller.js'),
    read('scripts/pr35/pr35-bootstrap.js')
  ]);
  assert.match(care, /local\s*\?\s*['"]mode\.local['"]\s*:\s*['"]mode\.productionUnavailable['"]/);
  assert.match(bootstrap, /createCareController\(\{[^}]*\blocal\b[^}]*\}\)/s);
});

test('assignment confirmation copy reflects local versus secure runtime', async () => {
  const source = await read('scripts/pr35/pr35-owner-controller.js');
  assert.match(source, /local\s*\?\s*['"]تأكيد التكليف المحلي['"]\s*:\s*['"]تأكيد التكليف الآمن['"]/);
});

test('owner search debounce matches the documented weak-network budget', async () => {
  const [source, budget] = await Promise.all([
    read('scripts/pr35/pr35-owner-controller.js'),
    read('docs/launch/pr35/PERFORMANCE_AND_WEAK_NETWORK_BUDGET.md')
  ]);
  assert.match(source, /setTimeout\([\s\S]*?,\s*250\)/);
  assert.match(budget, /250\s*ms/i);
});

test('owner controller has no unused ROLE_TEMPLATES import', async () => {
  const source = await read('scripts/pr35/pr35-owner-controller.js');
  assert.doesNotMatch(source, /\bROLE_TEMPLATES\b/);
});

test('resilience action allowlist uses consistent trailing-comma formatting', async () => {
  const source = await read('scripts/vvip-pr30-resilience.js');
  assert.doesNotMatch(source, /\n\s*,\s*['"]\[data-/);
  for (const selector of [
    '[data-vvip-tiger-care-entry]',
    '[data-profile-actions-trigger]',
    '[data-profile-assign]',
    '[data-profile-suspend]',
    '[data-profile-revoke]',
    '[data-new-assignment]'
  ]) assert.match(source, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
