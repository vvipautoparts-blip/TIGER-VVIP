'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const authz = require('../scripts/security/authorization-runtime-bridge.js');
const permissions = require('../scripts/social/permissions-control.js');
const { createDisclosureRuntimeBridge } = require('../scripts/security/disclosure-runtime-bridge.js');
const { createAuthorizationAuditAdapter } = require('../scripts/security/authorization-runtime-audit.js');

const D64_A = 'a'.repeat(64);
const D64_B = 'b'.repeat(64);
const D64_C = 'c'.repeat(64);
const D64_D = 'd'.repeat(64);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function scope() {
  return {
    resource_scope: { kind: 'profile', ids: ['user:target'] },
    sector_scope: ['SOCIAL'],
    entity_scope: ['user:target'],
    geo_policy_scope: ['JO'],
  };
}

function activeGrant(action) {
  return {
    principal: 'user:viewer',
    action,
    resource_scope: { kind: 'profile', ids: ['user:target'] },
    sector_scope: ['SOCIAL'],
    entity_scope: ['user:target'],
    geo_policy_scope: ['JO'],
    policy_version: '2026-08-23',
    status: 'ACTIVE',
    revoked_at: null,
    not_before: '2026-08-23T05:00:00.000Z',
    expires_at: '2026-08-23T06:00:00.000Z',
  };
}

function disclosureRequest(overrides = {}) {
  return {
    id: 'disclosure-request:integration-001',
    requester: 'user:viewer',
    artifact_id: 'artifact:owner-only:001',
    classification: 'OWNER_ONLY',
    artifact_scope_digest: D64_A,
    purpose: 'explicit owner-sealed view request',
    nonce_digest: D64_B,
    challenge_digest: D64_C,
    issued_at: '2026-08-23T05:00:00.000Z',
    expires_at: '2026-08-23T05:10:00.000Z',
    ...overrides,
  };
}

function ownerEvidence() {
  return {
    authorization_id: 'owner-stepup:integration-001',
    owner_subject: 'owner:root',
    action: 'APPROVE_DISCLOSURE',
    assurance: 'PHISHING_RESISTANT',
    challenge_digest: D64_C,
    scope_digest: D64_A,
    nonce_digest: D64_B,
  };
}

test('profile projection can show management capability but never carries execution authority', () => {
  const snapshot = authz.buildCapabilitySnapshot({
    authenticated_principal: 'user:viewer',
    target_id: 'user:target',
    surface: 'PROFILE_MORE_MENU',
    requested_scope: scope(),
    grants: [activeGrant('VIEW_PERMISSION_STATE'), activeGrant('GRANT_PERMISSION')],
    policy_version: '2026-08-23',
    authority_version: 'authz-runtime-v1',
    server_now: '2026-08-23T05:15:00.000Z',
    snapshot_ttl_seconds: 45,
  });

  const presentationSnapshot = {
    ...snapshot,
    presentation_status: 'ACTIVE',
    permission_state_projection: [{
      capability_id: 'VIEW_FINANCIAL_EARNINGS',
      status: 'NOT_GRANTED',
      active: false,
      checked: false,
    }],
  };
  const model = permissions.buildPermissionsControlModel({
    target_id: 'user:target',
    snapshot: presentationSnapshot,
  });

  assert.equal(snapshot.execution_authority, false);
  assert.equal(model.can_manage, true);
  assert.equal(model.management_controls.length, 1);
  assert.equal(model.management_controls[0].intent, 'REQUEST_GRANT');
});

test('stale presentation cannot execute after persistent grant revocation', async () => {
  let grantActive = true;
  const bridge = authz.createSensitiveActionLeaseBridge({
    async issuePersistentSensitiveActionLease(input) {
      assert.equal(input.principal, 'user:viewer');
      assert.equal(Object.hasOwn(input, 'scope_digest'), false);
      return grantActive
        ? { ok: true, reason_code: 'SENSITIVE_ACTION_LEASE_ISSUED', lease_id: 'lease:001' }
        : { ok: false, reason_code: 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE', lease_id: null };
    },
    async consumePersistentSensitiveActionLease() {
      return grantActive
        ? { ok: true, reason_code: 'SENSITIVE_ACTION_LEASE_CONSUMED', lease_id: 'lease:001' }
        : { ok: false, reason_code: 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE', lease_id: 'lease:001' };
    },
  });

  const input = {
    grant_id: 'grant:001',
    authenticated_principal: 'user:viewer',
    action: 'GRANT_PERMISSION',
    requested_scope: scope(),
    nonce_hash: D64_A,
    policy_version: '2026-08-23',
    audit_evidence_ref: 'audit:integration:001',
  };
  const issued = await bridge.requestSensitiveActionLease(input);
  assert.equal(issued.ok, true);

  grantActive = false;
  const consumed = await bridge.consumeSensitiveActionLease({
    lease_id: issued.lease_id,
    authenticated_principal: input.authenticated_principal,
    action: input.action,
    requested_scope: input.requested_scope,
    nonce_hash: input.nonce_hash,
    policy_version: input.policy_version,
  });
  assert.equal(consumed.ok, false);
  assert.equal(consumed.reason_code, 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE');
});

test('persistent sensitive lease contract is single-use and client scope digests are rejected', async () => {
  let consumed = false;
  const bridge = authz.createSensitiveActionLeaseBridge({
    async issuePersistentSensitiveActionLease() {
      return { ok: true, reason_code: 'SENSITIVE_ACTION_LEASE_ISSUED', lease_id: 'lease:single-use' };
    },
    async consumePersistentSensitiveActionLease() {
      if (consumed) {
        return { ok: false, reason_code: 'SENSITIVE_PERMISSION_LEASE_REPLAY_OR_CONFLICT', lease_id: 'lease:single-use' };
      }
      consumed = true;
      return { ok: true, reason_code: 'SENSITIVE_ACTION_LEASE_CONSUMED', lease_id: 'lease:single-use' };
    },
  });

  const base = {
    grant_id: 'grant:single-use',
    authenticated_principal: 'user:viewer',
    action: 'GRANT_PERMISSION',
    requested_scope: scope(),
    nonce_hash: D64_A,
    policy_version: '2026-08-23',
    audit_evidence_ref: 'audit:integration:002',
  };
  await assert.rejects(
    () => bridge.requestSensitiveActionLease({ ...base, scope_digest: D64_D }),
    /scope digest/i,
  );

  const issued = await bridge.requestSensitiveActionLease(base);
  const consumeInput = {
    lease_id: issued.lease_id,
    authenticated_principal: base.authenticated_principal,
    action: base.action,
    requested_scope: base.requested_scope,
    nonce_hash: base.nonce_hash,
    policy_version: base.policy_version,
  };
  const [first, replay] = [
    await bridge.consumeSensitiveActionLease(consumeInput),
    await bridge.consumeSensitiveActionLease(consumeInput),
  ];
  assert.equal(first.ok, true);
  assert.equal(replay.ok, false);
  assert.equal(replay.reason_code, 'SENSITIVE_PERMISSION_LEASE_REPLAY_OR_CONFLICT');
});

test('owner-sealed disclosure consumes persistent owner authorization once and old JS state cannot resurrect it', async () => {
  let authorizationConsumed = false;
  let leaseConsumed = false;
  const bridge = createDisclosureRuntimeBridge({
    async issuePersistentDisclosureLease(input) {
      assert.equal(input.owner_authorization_id, 'owner-stepup:integration-001');
      if (authorizationConsumed) {
        return { ok: false, reason_code: 'DISCLOSURE_OWNER_AUTHORIZATION_REPLAY_OR_CONFLICT', lease_id: null };
      }
      authorizationConsumed = true;
      return {
        ok: true,
        reason_code: 'DISCLOSURE_LEASE_ISSUED',
        lease_id: 'disclosure-lease:001',
        request_id: input.request_id,
      };
    },
    async consumePersistentDisclosureLease() {
      if (leaseConsumed) {
        return { ok: false, reason_code: 'DISCLOSURE_LEASE_REPLAY_OR_CONFLICT', lease_id: 'disclosure-lease:001' };
      }
      leaseConsumed = true;
      return { ok: true, reason_code: 'DISCLOSURE_LEASE_CONSUMED', lease_id: 'disclosure-lease:001' };
    },
  });

  const request = disclosureRequest();
  const issued = await bridge.issueDisclosureLease({
    request,
    owner_step_up_evidence: ownerEvidence(),
    audit_evidence_ref: 'audit:disclosure:001',
  });
  assert.equal(issued.ok, true);

  const secondApproval = await bridge.issueDisclosureLease({
    request: disclosureRequest({ id: 'disclosure-request:integration-002' }),
    owner_step_up_evidence: ownerEvidence(),
    audit_evidence_ref: 'audit:disclosure:002',
  });
  assert.equal(secondApproval.ok, false);
  assert.equal(secondApproval.reason_code, 'DISCLOSURE_OWNER_AUTHORIZATION_REPLAY_OR_CONFLICT');

  const firstConsume = await bridge.consumeDisclosureLease({
    lease: { id: issued.lease_id, status: 'ISSUED' },
    request,
  });
  assert.equal(firstConsume.ok, true);

  const replayUsingOldIssuedObject = await bridge.consumeDisclosureLease({
    lease: { id: issued.lease_id, status: 'ISSUED' },
    request,
  });
  assert.equal(replayUsingOldIssuedObject.ok, false);
  assert.equal(replayUsingOldIssuedObject.reason_code, 'DISCLOSURE_LEASE_REPLAY_OR_CONFLICT');
});

test('authorization audit reuses the existing chain and rejects secret/client-authority material recursively', async () => {
  let appended = null;
  const audit = createAuthorizationAuditAdapter({
    async appendAuditChainEvent(event) {
      appended = event;
      return { ok: true, reason_code: 'AUDIT_APPENDED', sequence_no: 7 };
    },
  });

  const base = {
    correlation_id: 'corr-integration-001',
    actor: 'user:viewer',
    target: 'user:target',
    action: 'GRANT_PERMISSION',
    decision: 'DENY',
    reason_code: 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE',
    authority_refs: ['grant:001', 'lease:001'],
    scope_digest: D64_A,
    policy_version: '2026-08-23',
    environment: 'REPOSITORY',
    release_digest: D64_D,
    previous_hash: null,
  };

  const result = await audit.appendAuthorizationDecision(base);
  assert.equal(result.ok, true);
  assert.equal(appended.agent_id, 'unified-authorization-runtime-bridge');
  assert.equal(appended.metadata.target, 'user:target');
  assert.equal(appended.metadata.scope_digest, D64_A);

  await assert.rejects(
    () => audit.appendAuthorizationDecision({ ...base, extra_metadata: { nested: { password: 'never' } } }),
    /secret|credential/i,
  );
  await assert.rejects(
    () => audit.appendAuthorizationDecision({ ...base, extra_metadata: { roles: ['Owner'] } }),
    /authority-shaped/i,
  );
});

test('source integration keeps database time authoritative and browser roles outside sensitive persistence', () => {
  const sensitiveMigration = read('supabase/migrations/20260823052000_sensitive_action_lease_runtime.sql');
  const disclosureMigration = read('supabase/migrations/20260823051000_owner_sealed_disclosure_runtime.sql');
  const serverTimeMigration = read('supabase/migrations/20260823041000_tsrf_server_time_authority_hardening.sql');
  const controller = read('scripts/profile/pr39-profile-controller.js');
  const permissionsSource = read('scripts/social/permissions-control.js');

  for (const source of [sensitiveMigration, disclosureMigration, serverTimeMigration]) {
    assert.match(source, /statement_timestamp\(\)/i);
  }
  assert.doesNotMatch(sensitiveMigration, /\bp_now\b/i);
  assert.doesNotMatch(disclosureMigration, /\bp_now\b/i);

  assert.match(sensitiveMigration, /for\s+share/i);
  assert.match(sensitiveMigration, /for\s+update/i);
  assert.match(sensitiveMigration, /interval\s+'60 seconds'/i);
  assert.match(disclosureMigration, /unique\s*\(\s*owner_authorization_id\s*\)/i);
  assert.match(disclosureMigration, /for\s+update/i);

  for (const source of [controller, permissionsSource]) {
    assert.doesNotMatch(source, /service_role/i);
    assert.doesNotMatch(source, /sensitive_permission_(?:grants|leases)/i);
    assert.doesNotMatch(source, /\.rpc\s*\(/i);
  }
});

test('Task 9 integration contains no deployment/apply command and preserves source-only non-claims', () => {
  const sources = [
    read('scripts/security/authorization-runtime-bridge.js'),
    read('scripts/security/disclosure-runtime-bridge.js'),
    read('scripts/security/authorization-runtime-audit.js'),
    read('supabase/migrations/20260823051000_owner_sealed_disclosure_runtime.sql'),
    read('supabase/migrations/20260823052000_sensitive_action_lease_runtime.sql'),
  ].join('\n');

  assert.doesNotMatch(sources, /supabase\s+db\s+push/i);
  assert.doesNotMatch(sources, /functions\s+deploy|deploy-pages/i);
  assert.doesNotMatch(sources, /\bpsql\s+/i);
});
