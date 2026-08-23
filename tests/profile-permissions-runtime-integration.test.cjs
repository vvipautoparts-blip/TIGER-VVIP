'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'public-profile-p05.html');
const CONTROLLER_PATH = path.join(ROOT, 'scripts/profile/pr39-profile-controller.js');
const PERMISSIONS_PATH = path.join(ROOT, 'scripts/social/permissions-control.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function loadController() {
  const window = {
    VVIP_PR39_PROFILE_CONTRACT: {
      OWNER_VIEW: 'OWNER_VIEW',
      AUTHORIZED_MEMBER_VIEW: 'AUTHORIZED_MEMBER_VIEW',
      AUTH_REQUIRED: 'AUTH_REQUIRED',
      createOwnerMenuItems() { return []; },
    },
    VVIP_PR38_ACCOUNT_SUMMARY: null,
    localStorage: {},
    location: {
      search: '',
      origin: 'https://example.test',
      replace() {},
    },
  };
  const document = {
    addEventListener() {},
    querySelector() { return null; },
  };
  vm.runInNewContext(read(CONTROLLER_PATH), {
    window,
    document,
    URL,
    URLSearchParams,
    Object,
    String,
    Promise,
    console,
  });
  return window.VVIP_PR39_PROFILE_CONTROLLER;
}

function nodeStub() {
  const attrs = new Map();
  return {
    hidden: true,
    textContent: '',
    setAttribute(name, value) { attrs.set(name, String(value)); },
    getAttribute(name) { return attrs.get(name) || null; },
  };
}

function activeSnapshot(overrides = {}) {
  return {
    snapshot_id: 'authz-snapshot:test',
    principal: 'user:viewer',
    target_id: 'user:target',
    surface: 'PROFILE_MORE_MENU',
    execution_authority: false,
    visible_capabilities: ['VIEW_PERMISSION_STATE'],
    management_capabilities: [],
    permission_state_projection: [],
    policy_version: '2026-08-23',
    authority_version: 'authz-runtime-v1',
    issued_at: '2026-08-23T04:00:00.000Z',
    expires_at: '2026-08-23T04:00:45.000Z',
    ttl_seconds: 45,
    presentation_status: 'ACTIVE',
    ...overrides,
  };
}

test('profile keeps one existing more-menu and places permissions inside it', () => {
  const html = read(HTML_PATH);
  assert.equal((html.match(/data-pr39-menu-trigger/g) || []).length, 1);
  assert.equal((html.match(/data-pr39-menu-item="permissions"/g) || []).length, 1);

  const menuStart = html.indexOf('data-pr39-menu hidden');
  const permissionsItem = html.indexOf('data-pr39-menu-item="permissions"');
  const menuEnd = html.indexOf('</div>', permissionsItem);
  assert.ok(menuStart >= 0 && permissionsItem > menuStart && menuEnd > permissionsItem,
    'permissions must live under the existing profile more-menu');
  assert.match(html, /data-pr39-permissions-item[^>]*hidden/);
  assert.match(html, />\s*الصلاحيات\s*</);
});

test('browser loads permissions-control before the profile controller', () => {
  const html = read(HTML_PATH);
  const permissionsScript = html.indexOf('scripts/social/permissions-control.js');
  const controllerScript = html.indexOf('scripts/profile/pr39-profile-controller.js');
  assert.ok(permissionsScript >= 0, 'permissions-control browser script is required');
  assert.ok(controllerScript > permissionsScript, 'permissions-control must load before profile controller');

  const permissionsSource = read(PERMISSIONS_PATH);
  assert.match(permissionsSource, /VVIP_PERMISSIONS_CONTROL/,
    'permissions-control must expose the same model to the browser without duplicating auth logic');
});

test('runtime adapter loads exactly one server snapshot for each menu-open and maps it through permissions-control', async () => {
  const controller = loadController();
  assert.equal(typeof controller.createPermissionsRuntimeAdapter, 'function');

  const permissionsItem = nodeStub();
  const managementNode = nodeStub();
  let loadCount = 0;
  let mappedInput = null;
  const permissionsControl = {
    buildPermissionsControlModel(input) {
      mappedInput = input;
      return Object.freeze({
        can_view: true,
        can_manage: false,
        management_controls: [],
        integration: Object.freeze({
          surface: 'PROFILE_MORE_MENU',
          state: 'PRESENTATION_MODEL_READY',
          reason: 'AUTHORIZATION_PRESENTATION_MODEL_READY',
        }),
      });
    },
  };

  const adapter = controller.createPermissionsRuntimeAdapter({
    targetId: 'user:target',
    permissionsItem,
    managementNode,
    permissionsControl,
    async loadCapabilitySnapshot(request) {
      loadCount += 1;
      assert.deepEqual(request, {
        target_id: 'user:target',
        surface: 'PROFILE_MORE_MENU',
      });
      return activeSnapshot();
    },
  });

  const model = await adapter.prepareForMenuOpen();
  assert.equal(loadCount, 1);
  assert.equal(mappedInput.target_id, 'user:target');
  assert.equal(mappedInput.snapshot.snapshot_id, 'authz-snapshot:test');
  assert.equal(permissionsItem.hidden, false);
  assert.equal(permissionsItem.textContent, 'الصلاحيات');
  assert.equal(managementNode.hidden, true);
  assert.equal(model.integration.dom_ready, true);
  assert.equal(model.integration.surface, 'PROFILE_MORE_MENU');
  assert.equal(model.integration.state, 'PRESENTATION_MODEL_READY');

  await adapter.prepareForMenuOpen();
  assert.equal(loadCount, 2, 'a second menu-open refreshes rather than trusting a stale browser cache');
});

test('missing or invalid snapshot fails closed and never falls back to a role name', async () => {
  const controller = loadController();
  const permissionsItem = nodeStub();
  const managementNode = nodeStub();

  const adapter = controller.createPermissionsRuntimeAdapter({
    targetId: 'user:target',
    permissionsItem,
    managementNode,
    permissionsControl: {
      buildPermissionsControlModel() {
        throw new TypeError('authorization snapshot is inactive');
      },
    },
    viewerRole: 'Owner / Super Admin',
    async loadCapabilitySnapshot() { return activeSnapshot({ presentation_status: 'INACTIVE' }); },
  });

  const result = await adapter.prepareForMenuOpen();
  assert.equal(result, null);
  assert.equal(permissionsItem.hidden, true);
  assert.equal(managementNode.hidden, true);
});

test('management projection is shown only when server model says can_manage', async () => {
  const controller = loadController();
  const permissionsItem = nodeStub();
  const managementNode = nodeStub();

  const adapter = controller.createPermissionsRuntimeAdapter({
    targetId: 'user:target',
    permissionsItem,
    managementNode,
    permissionsControl: {
      buildPermissionsControlModel() {
        return Object.freeze({
          can_view: true,
          can_manage: true,
          management_controls: Object.freeze([
            Object.freeze({ label: 'عرض أرباح المنصة', intent: 'REQUEST_GRANT' }),
          ]),
          integration: Object.freeze({
            surface: 'PROFILE_MORE_MENU',
            state: 'PRESENTATION_MODEL_READY',
            reason: 'AUTHORIZATION_PRESENTATION_MODEL_READY',
          }),
        });
      },
    },
    async loadCapabilitySnapshot() {
      return activeSnapshot({ management_capabilities: ['GRANT_PERMISSION'] });
    },
  });

  const model = await adapter.prepareForMenuOpen();
  assert.equal(model.can_manage, true);
  assert.equal(managementNode.hidden, false);
  assert.match(managementNode.textContent, /عرض أرباح المنصة/);
  assert.equal(model.integration.dom_ready, true);
});

test('profile controller contains no direct database/service-role permission authority', () => {
  const source = read(CONTROLLER_PATH);
  assert.doesNotMatch(source, /service_role/i);
  assert.doesNotMatch(source, /sensitive_permission_grants/i);
  assert.doesNotMatch(source, /viewer_capabilities/i);
  assert.doesNotMatch(source, /target_grants/i);
  assert.doesNotMatch(source, /\.rpc\s*\(/);
});
