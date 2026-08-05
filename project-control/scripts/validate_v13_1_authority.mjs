import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(here, '../v13.1');

const EXPECTED_PRODUCTION_STATE =
  'BLOCKED_PENDING_CONTRACTS_TESTS_EVIDENCE';
const EXPECTED_CAPABILITY_STATE =
  'BLOCKED_PENDING_DEDICATED_CONTRACTS_TESTS_EVIDENCE';
const REQUIRED_LEGACY_OVERRIDES = Object.freeze([
  'GLOBAL_IMAGE_LIMIT_10',
  'GLOBAL_FIXED_IMPRESSIONS_250',
  'GLOBAL_FIXED_IMPRESSIONS_400',
  'CHAT_FORBIDDEN',
  'DELIVERY_FORBIDDEN',
  'MEDIATION_FORBIDDEN'
]);

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');

  if (rootIndex === -1) {
    return { root: defaultRoot };
  }

  const suppliedRoot = argv[rootIndex + 1];
  return {
    root: suppliedRoot ? path.resolve(suppliedRoot) : defaultRoot
  };
}

function addFailure(failures, code, targetPath, message) {
  failures.push({
    code,
    path: targetPath,
    message
  });
}

function readConstitution(root, failures) {
  const constitutionPath = path.join(
    root,
    'contracts/owner_constitution.json'
  );

  if (!fs.existsSync(constitutionPath)) {
    addFailure(
      failures,
      'V13_CONSTITUTION_MISSING',
      constitutionPath,
      'The executable V13.1 owner constitution is required.'
    );
    return { constitution: null, constitutionPath };
  }

  try {
    const constitution = JSON.parse(
      fs.readFileSync(constitutionPath, 'utf8')
    );
    return { constitution, constitutionPath };
  } catch (error) {
    addFailure(
      failures,
      'V13_CONSTITUTION_INVALID',
      constitutionPath,
      error instanceof Error ? error.message : String(error)
    );
    return { constitution: null, constitutionPath };
  }
}

function validateIdentity(constitution, constitutionPath, failures) {
  const valid =
    constitution &&
    constitution.schema_version === 1 &&
    constitution.constitution_id === 'V13.1' &&
    constitution.authority === 'OWNER_FINAL_CONSTITUTION' &&
    constitution.precedence ===
      'SUPERSEDES_INCOMPATIBLE_LEGACY_RULES';

  if (!valid) {
    addFailure(
      failures,
      'V13_CONSTITUTION_INVALID',
      constitutionPath,
      'Constitution identity, schema version, authority, or precedence is invalid.'
    );
  }
}

function validateProductionState(
  constitution,
  constitutionPath,
  failures
) {
  if (constitution.production_state !== EXPECTED_PRODUCTION_STATE) {
    addFailure(
      failures,
      'V13_PRODUCTION_CLAIM_WITHOUT_SEALS',
      constitutionPath,
      `Production state must remain ${EXPECTED_PRODUCTION_STATE}.`
    );
  }
}

function validateListingMedia(
  constitution,
  constitutionPath,
  failures
) {
  const media = constitution.listing_media;

  if (!media || media.max_images_per_listing !== 7) {
    addFailure(
      failures,
      'V13_IMAGE_LIMIT_NOT_SEVEN',
      constitutionPath,
      'The final global listing image limit must be exactly seven.'
    );
  }

  if (!media || media.image_limit_price_dependent !== false) {
    addFailure(
      failures,
      'V13_IMAGE_LIMIT_PRICE_DEPENDENT',
      constitutionPath,
      'The image limit must never depend on payment value or package.'
    );
  }

  if (!media || media.video_enabled !== false) {
    addFailure(
      failures,
      'V13_CONSTITUTION_INVALID',
      constitutionPath,
      'Video must remain disabled in the current V13.1 release.'
    );
  }
}

function validateExposure(constitution, constitutionPath, failures) {
  const exposure = constitution.exposure;
  const valid =
    exposure &&
    exposure.global_fixed_impressions === null &&
    exposure.quantity_authority === 'COUNTRY_SEAL_ONLY' &&
    exposure.price_authority === 'COUNTRY_SEAL_ONLY';

  if (!valid) {
    addFailure(
      failures,
      'V13_GLOBAL_FIXED_IMPRESSIONS_FORBIDDEN',
      constitutionPath,
      'Global fixed impressions are forbidden; quantity and price belong to the country seal only.'
    );
  }
}

function validateGatedCapabilities(
  constitution,
  constitutionPath,
  failures
) {
  const capabilities = constitution.capabilities;

  for (const capabilityName of [
    'internal_chat',
    'delivery',
    'mediation'
  ]) {
    const capability = capabilities?.[capabilityName];
    const valid =
      capability?.constitutionally_allowed === true &&
      capability?.activation_state === EXPECTED_CAPABILITY_STATE &&
      Array.isArray(capability?.required_contract_domains) &&
      capability.required_contract_domains.length > 0;

    if (!valid) {
      addFailure(
        failures,
        'V13_CAPABILITY_ACTIVATED_WITHOUT_CONTRACT',
        constitutionPath,
        `${capabilityName} must be constitutionally allowed but operationally blocked pending dedicated contracts, tests, and evidence.`
      );
    }
  }
}

function validateWhatsApp(constitution, constitutionPath, failures) {
  const whatsapp = constitution.capabilities?.external_whatsapp;
  const valid =
    whatsapp?.prepared === true &&
    whatsapp?.integration_mode === 'EXTERNAL_ONLY' &&
    whatsapp?.activation_state === 'DISABLED' &&
    whatsapp?.internal_message_transport === false &&
    Array.isArray(whatsapp?.activation_requires) &&
    whatsapp.activation_requires.length > 0;

  if (!valid) {
    addFailure(
      failures,
      'V13_WHATSAPP_MUST_REMAIN_DISABLED',
      constitutionPath,
      'External WhatsApp must remain prepared, external-only, disabled, and outside internal message transport.'
    );
  }
}

function validateLegacyOverrides(
  constitution,
  constitutionPath,
  failures
) {
  const overrides = Array.isArray(constitution.legacy_overrides)
    ? constitution.legacy_overrides
    : [];
  const overridesById = new Map(
    overrides.map((entry) => [entry?.legacy_rule_id, entry])
  );

  for (const requiredId of REQUIRED_LEGACY_OVERRIDES) {
    const entry = overridesById.get(requiredId);
    const valid =
      entry?.classification === 'SUPERSEDED_BY_V13_1_OWNER_FINAL' &&
      typeof entry?.effective_rule === 'string' &&
      entry.effective_rule.length > 0;

    if (!valid) {
      addFailure(
        failures,
        'V13_SILENT_LEGACY_CONFLICT',
        constitutionPath,
        `Required legacy override is missing or invalid: ${requiredId}.`
      );
    }
  }
}

function validateChangeControl(
  constitution,
  constitutionPath,
  failures
) {
  const control = constitution.change_control;
  const valid =
    constitution.activation_invariant ===
      'CONSTITUTIONAL_ALLOWANCE_DOES_NOT_EQUAL_PRODUCTION_ACTIVATION' &&
    control?.direct_main_changes === false &&
    control?.pull_request_required === true &&
    control?.tests_required === true &&
    control?.evidence_required === true &&
    control?.rollback_required === true;

  if (!valid) {
    addFailure(
      failures,
      'V13_CONSTITUTION_INVALID',
      constitutionPath,
      'Activation invariant or mandatory change-control gates are invalid.'
    );
  }
}

function sortFailures(failures) {
  failures.sort((left, right) =>
    left.code.localeCompare(right.code) ||
    left.path.localeCompare(right.path) ||
    left.message.localeCompare(right.message)
  );
}

function emitFailure(failures) {
  sortFailures(failures);
  process.stderr.write(
    `${JSON.stringify({ status: 'FAIL', failures }, null, 2)}\n`
  );
  process.exitCode = 1;
}

function emitSuccess(constitution) {
  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'PASS',
        constitution_id: constitution.constitution_id,
        owner_final_revision: constitution.owner_final_revision,
        production_state: constitution.production_state,
        max_images_per_listing:
          constitution.listing_media.max_images_per_listing,
        global_fixed_impressions:
          constitution.exposure.global_fixed_impressions,
        checked_at: new Date().toISOString()
      },
      null,
      2
    )}\n`
  );
}

function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const failures = [];
  const { constitution, constitutionPath } = readConstitution(
    root,
    failures
  );

  if (!constitution) {
    emitFailure(failures);
    return;
  }

  validateIdentity(constitution, constitutionPath, failures);
  validateProductionState(constitution, constitutionPath, failures);
  validateListingMedia(constitution, constitutionPath, failures);
  validateExposure(constitution, constitutionPath, failures);
  validateGatedCapabilities(
    constitution,
    constitutionPath,
    failures
  );
  validateWhatsApp(constitution, constitutionPath, failures);
  validateLegacyOverrides(
    constitution,
    constitutionPath,
    failures
  );
  validateChangeControl(constitution, constitutionPath, failures);

  if (failures.length > 0) {
    emitFailure(failures);
    return;
  }

  emitSuccess(constitution);
}

main();
