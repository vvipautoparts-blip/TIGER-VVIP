const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const baselineRoot = path.join(repoRoot, 'project-control/v13.1');
const validatorPath = path.join(
  repoRoot,
  'project-control/scripts/validate_v13_1_authority.mjs'
);

function runValidator(root = baselineRoot) {
  return spawnSync(process.execPath, [validatorPath, '--root', root], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

function parseReport(result) {
  const output = result.status === 0 ? result.stdout : result.stderr;
  assert.ok(output.trim(), 'validator must emit a JSON report');
  return JSON.parse(output);
}

function withMutatedConstitution(mutator) {
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-v13-1-test-'));
  const tempRoot = path.join(tempParent, 'v13.1');
  fs.cpSync(baselineRoot, tempRoot, { recursive: true });

  const constitutionPath = path.join(
    tempRoot,
    'contracts/owner_constitution.json'
  );
  const constitution = JSON.parse(fs.readFileSync(constitutionPath, 'utf8'));
  mutator(constitution);
  fs.writeFileSync(
    constitutionPath,
    `${JSON.stringify(constitution, null, 2)}\n`,
    'utf8'
  );

  return {
    root: tempRoot,
    cleanup() {
      fs.rmSync(tempParent, { recursive: true, force: true });
    }
  };
}

function assertFailureCode(result, expectedCode) {
  assert.notEqual(result.status, 0, result.stdout);
  const report = parseReport(result);
  assert.equal(report.status, 'FAIL');
  assert.ok(
    report.failures.some((failure) => failure.code === expectedCode),
    `expected ${expectedCode}; got ${JSON.stringify(report.failures)}`
  );
}

test('valid final V13.1 authority package passes deterministically', () => {
  const result = runValidator();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = parseReport(result);
  assert.equal(report.status, 'PASS');
  assert.equal(report.constitution_id, 'V13.1');
  assert.equal(
    report.production_state,
    'BLOCKED_PENDING_CONTRACTS_TESTS_EVIDENCE'
  );
  assert.equal(report.max_images_per_listing, 7);
  assert.equal(report.global_fixed_impressions, null);
  assert.equal(report.full_general_access_capability_count, 3);
  assert.deepEqual(report.whatsapp_grant_authority_roles, ['OWNER', 'PARTNER']);
});

test('missing constitution fails closed', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-v13-1-missing-'));
  try {
    assertFailureCode(runValidator(tempRoot), 'V13_CONSTITUTION_MISSING');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('malformed constitution fails closed', () => {
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-v13-1-invalid-'));
  const contracts = path.join(tempParent, 'contracts');
  fs.mkdirSync(contracts, { recursive: true });
  fs.writeFileSync(
    path.join(contracts, 'owner_constitution.json'),
    '{invalid-json',
    'utf8'
  );

  try {
    assertFailureCode(runValidator(tempParent), 'V13_CONSTITUTION_INVALID');
  } finally {
    fs.rmSync(tempParent, { recursive: true, force: true });
  }
});

test('any image limit other than seven fails', () => {
  const fixture = withMutatedConstitution((constitution) => {
    constitution.listing_media.max_images_per_listing = 10;
  });

  try {
    assertFailureCode(runValidator(fixture.root), 'V13_IMAGE_LIMIT_NOT_SEVEN');
  } finally {
    fixture.cleanup();
  }
});

test('price-dependent image limit fails', () => {
  const fixture = withMutatedConstitution((constitution) => {
    constitution.listing_media.image_limit_price_dependent = true;
  });

  try {
    assertFailureCode(
      runValidator(fixture.root),
      'V13_IMAGE_LIMIT_PRICE_DEPENDENT'
    );
  } finally {
    fixture.cleanup();
  }
});

for (const fixedValue of [250, 400]) {
  test(`global fixed impressions ${fixedValue} fail`, () => {
    const fixture = withMutatedConstitution((constitution) => {
      constitution.exposure.global_fixed_impressions = fixedValue;
    });

    try {
      assertFailureCode(
        runValidator(fixture.root),
        'V13_GLOBAL_FIXED_IMPRESSIONS_FORBIDDEN'
      );
    } finally {
      fixture.cleanup();
    }
  });
}

for (const capabilityName of ['internal_chat', 'delivery', 'mediation']) {
  test(`${capabilityName} cannot be restricted to owner or partner grants`, () => {
    const fixture = withMutatedConstitution((constitution) => {
      constitution.capabilities[capabilityName].availability_policy =
        'OWNER_OR_PARTNER_GRANT_ONLY';
      constitution.capabilities[capabilityName].access_scope = 'SELECTED_USERS';
      constitution.capabilities[capabilityName].owner_or_partner_grant_required =
        true;
      constitution.capabilities[capabilityName].user_self_access_allowed = false;
    });

    try {
      assertFailureCode(
        runValidator(fixture.root),
        'V13_CAPABILITY_ACCESS_RESTRICTED'
      );
    } finally {
      fixture.cleanup();
    }
  });
}

test('WhatsApp must remain external-only and disabled by default', () => {
  const fixture = withMutatedConstitution((constitution) => {
    constitution.capabilities.external_whatsapp.default_access_state = 'ENABLED';
    constitution.capabilities.external_whatsapp.integration_mode = 'INTERNAL';
    constitution.capabilities.external_whatsapp.internal_message_transport = true;
  });

  try {
    assertFailureCode(
      runValidator(fixture.root),
      'V13_WHATSAPP_EXTERNAL_DEFAULT_DISABLED_REQUIRED'
    );
  } finally {
    fixture.cleanup();
  }
});

test('WhatsApp cannot be self-enabled or granted by any role except owner or partner', () => {
  const fixture = withMutatedConstitution((constitution) => {
    constitution.capabilities.external_whatsapp.user_self_enable_allowed = true;
    constitution.capabilities.external_whatsapp.grant_authority_roles = [
      'OWNER',
      'PARTNER',
      'USER'
    ];
  });

  try {
    assertFailureCode(
      runValidator(fixture.root),
      'V13_WHATSAPP_OWNER_PARTNER_GATE_REQUIRED'
    );
  } finally {
    fixture.cleanup();
  }
});

test('removing a required legacy override fails as a silent conflict', () => {
  const fixture = withMutatedConstitution((constitution) => {
    constitution.legacy_overrides = constitution.legacy_overrides.filter(
      (entry) => entry.legacy_rule_id !== 'GLOBAL_IMAGE_LIMIT_10'
    );
  });

  try {
    assertFailureCode(
      runValidator(fixture.root),
      'V13_SILENT_LEGACY_CONFLICT'
    );
  } finally {
    fixture.cleanup();
  }
});

test('production cannot be allowed without release seals', () => {
  const fixture = withMutatedConstitution((constitution) => {
    constitution.production_state = 'PRODUCTION_ALLOWED';
  });

  try {
    assertFailureCode(
      runValidator(fixture.root),
      'V13_PRODUCTION_CLAIM_WITHOUT_SEALS'
    );
  } finally {
    fixture.cleanup();
  }
});
