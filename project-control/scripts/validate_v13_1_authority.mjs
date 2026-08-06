import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(here, '../v13.1');

const EXPECTED_PRODUCTION_STATE =
  'BLOCKED_PENDING_CONTRACTS_TESTS_EVIDENCE';
const GENERAL_CAPABILITY_NAMES = Object.freeze([
  'internal_chat',
  'delivery',
  'mediation'
]);
const REQUIRED_LEGACY_OVERRIDES = Object.freeze([
  'GLOBAL_IMAGE_LIMIT_10',
  'GLOBAL_FIXED_IMPRESSIONS_250',
  'GLOBAL_FIXED_IMPRESSIONS_400',
  'CHAT_FORBIDDEN',
  'DELIVERY_FORBIDDEN',
  'MEDIATION_FORBIDDEN'
]);
const REQUIRED_MANIFEST_ARTIFACTS = Object.freeze([
  'contracts/owner_constitution.json',
  'contracts/conflict_registry.json'
]);
const FORBIDDEN_WHATSAPP_APPROVAL_FIELDS = Object.freeze([
  'approval_policy',
  'required_approver_groups',
  'unanimous_approval_required',
  'single_approver_sufficient',
  'grant_required',
  'grant_authority_roles',
  'revocation_authority_roles',
  'grantee_scope',
  'grant_audit_required',
  'user_self_enable_allowed',
  'default_access_state'
]);

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  const suppliedRoot = rootIndex >= 0 ? argv[rootIndex + 1] : null;
  return { root: suppliedRoot ? path.resolve(suppliedRoot) : defaultRoot };
}

function addFailure(failures, code, targetPath, message) {
  failures.push({ code, path: targetPath, message });
}

function readRequiredJson(root, relativePath, missingCode, invalidCode, failures) {
  const filePath = path.join(root, relativePath);

  if (!fs.existsSync(filePath)) {
    addFailure(failures, missingCode, filePath, `${relativePath} is required.`);
    return { document: null, filePath };
  }

  try {
    return {
      document: JSON.parse(fs.readFileSync(filePath, 'utf8')),
      filePath
    };
  } catch (error) {
    addFailure(
      failures,
      invalidCode,
      filePath,
      error instanceof Error ? error.message : String(error)
    );
    return { document: null, filePath };
  }
}

function validateIdentity(constitution, constitutionPath, failures) {
  const valid =
    constitution?.schema_version === 1 &&
    constitution?.constitution_id === 'V13.1' &&
    constitution?.authority === 'OWNER_FINAL_CONSTITUTION' &&
    constitution?.precedence === 'SUPERSEDES_INCOMPATIBLE_LEGACY_RULES';

  if (!valid) {
    addFailure(
      failures,
      'V13_CONSTITUTION_INVALID',
      constitutionPath,
      'Constitution identity, schema version, authority, or precedence is invalid.'
    );
  }
}

function validateProductionState(constitution, constitutionPath, failures) {
  if (constitution?.production_state !== EXPECTED_PRODUCTION_STATE) {
    addFailure(
      failures,
      'V13_PRODUCTION_CLAIM_WITHOUT_SEALS',
      constitutionPath,
      `Production state must remain ${EXPECTED_PRODUCTION_STATE}.`
    );
  }
}

function validateListingMedia(constitution, constitutionPath, failures) {
  const media = constitution?.listing_media;

  if (media?.max_images_per_listing !== 7) {
    addFailure(
      failures,
      'V13_IMAGE_LIMIT_NOT_SEVEN',
      constitutionPath,
      'The final global listing image limit must be exactly seven.'
    );
  }

  if (media?.image_limit_price_dependent !== false) {
    addFailure(
      failures,
      'V13_IMAGE_LIMIT_PRICE_DEPENDENT',
      constitutionPath,
      'The image limit must never depend on payment value or package.'
    );
  }

  if (media?.video_enabled !== false) {
    addFailure(
      failures,
      'V13_CONSTITUTION_INVALID',
      constitutionPath,
      'Video must remain disabled in the current V13.1 release.'
    );
  }
}

function validateExposure(constitution, constitutionPath, failures) {
  const exposure = constitution?.exposure;
  const valid =
    exposure?.global_fixed_impressions === null &&
    exposure?.quantity_authority === 'COUNTRY_SEAL_ONLY' &&
    exposure?.price_authority === 'COUNTRY_SEAL_ONLY';

  if (!valid) {
    addFailure(
      failures,
      'V13_GLOBAL_FIXED_IMPRESSIONS_FORBIDDEN',
      constitutionPath,
      'Global fixed impressions are forbidden; quantity and price belong to the country seal only.'
    );
  }
}

function validateGeneralCapabilities(constitution, constitutionPath, failures) {
  const capabilities = constitution?.capabilities;

  for (const capabilityName of GENERAL_CAPABILITY_NAMES) {
    const capability = capabilities?.[capabilityName];
    const valid =
      capability?.constitutionally_allowed === true &&
      capability?.availability_policy === 'FULL_GENERAL_AVAILABILITY' &&
      capability?.access_scope === 'ALL_USERS' &&
      capability?.owner_or_partner_grant_required === false &&
      capability?.user_self_access_allowed === true;

    if (!valid) {
      addFailure(
        failures,
        'V13_CAPABILITY_ACCESS_RESTRICTED',
        constitutionPath,
        `${capabilityName} must have full general availability for all users without owner or partner approval.`
      );
    }
  }
}

function validateWhatsApp(constitution, constitutionPath, failures) {
  const whatsapp = constitution?.capabilities?.external_whatsapp;
  const handoffValid =
    whatsapp?.prepared === true &&
    whatsapp?.implementation_state === 'FULLY_PREPARED' &&
    whatsapp?.integration_mode === 'EXTERNAL_HANDOFF_ONLY' &&
    whatsapp?.handoff_type === 'DEVICE_APP_DEEP_LINK' &&
    whatsapp?.target_application === 'WHATSAPP_INSTALLED_ON_USER_DEVICE' &&
    whatsapp?.internal_message_transport === false &&
    whatsapp?.platform_sends_messages === false &&
    whatsapp?.platform_receives_messages === false &&
    whatsapp?.platform_reads_messages === false &&
    whatsapp?.platform_stores_messages === false &&
    whatsapp?.platform_manages_whatsapp_account === false &&
    whatsapp?.whatsapp_api_integration === false;

  if (!handoffValid) {
    addFailure(
      failures,
      'V13_WHATSAPP_EXTERNAL_HANDOFF_REQUIRED',
      constitutionPath,
      'WhatsApp must be a device-app deep-link handoff only; the platform must not send, receive, read, store, or manage WhatsApp messages or accounts.'
    );
  }

  const approvalFieldsPresent = FORBIDDEN_WHATSAPP_APPROVAL_FIELDS.some(
    (field) => Object.prototype.hasOwnProperty.call(whatsapp ?? {}, field)
  );
  const accessValid =
    whatsapp?.availability_policy === 'FULL_GENERAL_AVAILABILITY' &&
    whatsapp?.access_scope === 'ALL_USERS' &&
    whatsapp?.approval_required === false &&
    whatsapp?.user_self_access_allowed === true &&
    !approvalFieldsPresent;

  if (!accessValid) {
    addFailure(
      failures,
      'V13_WHATSAPP_APPROVAL_FORBIDDEN',
      constitutionPath,
      'WhatsApp handoff access must be available to all users without owner, partner, unanimous, or per-user approval.'
    );
  }
}

function validateLegacyOverrides(constitution, constitutionPath, failures) {
  const overrides = Array.isArray(constitution?.legacy_overrides)
    ? constitution.legacy_overrides
    : [];
  const byId = new Map(overrides.map((entry) => [entry?.legacy_rule_id, entry]));

  for (const requiredId of REQUIRED_LEGACY_OVERRIDES) {
    const entry = byId.get(requiredId);
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

function validateChangeControl(constitution, constitutionPath, failures) {
  const control = constitution?.change_control;
  const valid =
    constitution?.capability_access_invariant ===
      'ALL_DECLARED_CAPABILITIES_HAVE_FULL_GENERAL_AVAILABILITY_WITHOUT_APPROVAL' &&
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
      'Capability access invariant or mandatory change-control gates are invalid.'
    );
  }
}

function validateConflictRegistry(registry, registryPath, constitution, failures) {
  if (!registry) return;

  const conflicts = Array.isArray(registry.conflicts) ? registry.conflicts : [];
  const ids = conflicts.map((entry) => entry?.legacy_rule_id);
  const uniqueIds = new Set(ids);

  const structurallyValid =
    registry.schema_version === 1 &&
    registry.constitution_id === 'V13.1' &&
    conflicts.length === REQUIRED_LEGACY_OVERRIDES.length &&
    uniqueIds.size === conflicts.length;

  if (!structurallyValid) {
    addFailure(
      failures,
      'V13_CONFLICT_REGISTRY_INVALID',
      registryPath,
      'Conflict registry identity, count, or identifier uniqueness is invalid.'
    );
  }

  const constitutionOverrides = new Map(
    (constitution?.legacy_overrides ?? []).map((entry) => [
      entry?.legacy_rule_id,
      entry?.effective_rule
    ])
  );

  for (const requiredId of REQUIRED_LEGACY_OVERRIDES) {
    const entry = conflicts.find((conflict) => conflict?.legacy_rule_id === requiredId);
    const valid =
      entry?.classification === 'SUPERSEDED_BY_V13_1_OWNER_FINAL' &&
      entry?.enforcement === 'BLOCK_LEGACY_RULE' &&
      entry?.effective_rule === constitutionOverrides.get(requiredId);

    if (!valid) {
      addFailure(
        failures,
        'V13_SILENT_LEGACY_CONFLICT',
        registryPath,
        `Conflict registry does not enforce the final rule for ${requiredId}.`
      );
    }
  }
}

function sha256(filePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex');
}

function validateManifest(manifest, manifestPath, root, failures) {
  if (!manifest) return;

  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  const artifactPaths = artifacts.map((artifact) => artifact?.path);
  const uniquePaths = new Set(artifactPaths);
  const structurallyValid =
    manifest.schema_version === 1 &&
    manifest.constitution_id === 'V13.1' &&
    manifest.algorithm === 'sha256' &&
    manifest.production_state === EXPECTED_PRODUCTION_STATE &&
    artifacts.length === REQUIRED_MANIFEST_ARTIFACTS.length &&
    uniquePaths.size === artifacts.length;

  if (!structurallyValid) {
    addFailure(
      failures,
      'V13_MANIFEST_INVALID',
      manifestPath,
      'Authority manifest identity, algorithm, production state, count, or path uniqueness is invalid.'
    );
  }

  for (const requiredPath of REQUIRED_MANIFEST_ARTIFACTS) {
    const artifact = artifacts.find((item) => item?.path === requiredPath);
    const artifactPath = path.join(root, requiredPath);

    if (!artifact || !fs.existsSync(artifactPath)) {
      addFailure(
        failures,
        'V13_MANIFEST_INVALID',
        manifestPath,
        `Manifest artifact is missing: ${requiredPath}.`
      );
      continue;
    }

    const actualHash = sha256(artifactPath);
    if (artifact.sha256 !== actualHash) {
      addFailure(
        failures,
        'V13_MANIFEST_HASH_MISMATCH',
        artifactPath,
        `SHA-256 mismatch for ${requiredPath}.`
      );
    }
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

function emitSuccess(constitution, registry, manifest) {
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
        full_general_access_capability_count:
          GENERAL_CAPABILITY_NAMES.length + 1,
        whatsapp_handoff_type:
          constitution.capabilities.external_whatsapp.handoff_type,
        whatsapp_approval_required:
          constitution.capabilities.external_whatsapp.approval_required,
        conflict_count: registry.conflicts.length,
        manifest_artifact_count: manifest.artifacts.length
      },
      null,
      2
    )}\n`
  );
}

function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const failures = [];

  const {
    document: constitution,
    filePath: constitutionPath
  } = readRequiredJson(
    root,
    'contracts/owner_constitution.json',
    'V13_CONSTITUTION_MISSING',
    'V13_CONSTITUTION_INVALID',
    failures
  );
  const {
    document: registry,
    filePath: registryPath
  } = readRequiredJson(
    root,
    'contracts/conflict_registry.json',
    'V13_CONFLICT_REGISTRY_MISSING',
    'V13_CONFLICT_REGISTRY_INVALID',
    failures
  );
  const {
    document: manifest,
    filePath: manifestPath
  } = readRequiredJson(
    root,
    'authority-manifest.json',
    'V13_MANIFEST_MISSING',
    'V13_MANIFEST_INVALID',
    failures
  );

  if (constitution) {
    validateIdentity(constitution, constitutionPath, failures);
    validateProductionState(constitution, constitutionPath, failures);
    validateListingMedia(constitution, constitutionPath, failures);
    validateExposure(constitution, constitutionPath, failures);
    validateGeneralCapabilities(constitution, constitutionPath, failures);
    validateWhatsApp(constitution, constitutionPath, failures);
    validateLegacyOverrides(constitution, constitutionPath, failures);
    validateChangeControl(constitution, constitutionPath, failures);
  }

  validateConflictRegistry(registry, registryPath, constitution, failures);
  validateManifest(manifest, manifestPath, root, failures);

  if (failures.length > 0) {
    emitFailure(failures);
    return;
  }

  emitSuccess(constitution, registry, manifest);
}

main();
