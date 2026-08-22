'use strict';

const SURFACE_CLASSES = Object.freeze([
  'PUBLIC',
  'STANDARD_AUTHENTICATED',
  'OWNER',
  'FINANCIAL',
  'DISCLOSURE',
]);

const HIGH_RISK_SURFACES = Object.freeze(['OWNER', 'FINANCIAL', 'DISCLOSURE']);
const INTEGRITY_STATES = Object.freeze(['TRUSTED', 'UNKNOWN', 'FAILED']);
const CAPTURE_STATES = Object.freeze(['CLEAR', 'RISK', 'ACTIVE']);
const APP_ACCESS_RISK_STATES = Object.freeze(['CLEAR', 'DETECTED']);
const RUNTIMES = Object.freeze(['WEB', 'ANDROID_NATIVE', 'APPLE_NATIVE']);
const DECISIONS = Object.freeze(['ALLOW', 'REDACT', 'REQUIRE_STEP_UP', 'REVOKE_VIEW']);

function requireObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('protected-view input must be an object');
  }
  return value;
}

function requireEnum(value, values, field) {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new TypeError(`${field} is not a supported value`);
  }
  return value;
}

function requireBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${field} must be boolean`);
  }
  return value;
}

function runtimeRequirements(runtime, protectedSurface) {
  if (!protectedSurface) {
    return {
      native_secure_surface_required: false,
      native_integrity_attestation_required: false,
      native_capture_observation_required: false,
    };
  }

  if (runtime === 'ANDROID_NATIVE') {
    return {
      native_secure_surface_required: true,
      native_integrity_attestation_required: true,
      native_capture_observation_required: false,
    };
  }

  if (runtime === 'APPLE_NATIVE') {
    return {
      native_secure_surface_required: false,
      native_integrity_attestation_required: true,
      native_capture_observation_required: true,
    };
  }

  return {
    native_secure_surface_required: false,
    native_integrity_attestation_required: false,
    native_capture_observation_required: false,
  };
}

function result(base, decision, reasonCode, redactionRequired) {
  return Object.freeze({
    ...base,
    decision,
    reason_code: reasonCode,
    redaction_required: redactionRequired === true,
  });
}

function evaluateProtectedView(rawInput) {
  const input = requireObject(rawInput);
  const surfaceClass = requireEnum(input.surface_class, SURFACE_CLASSES, 'surface_class');
  const authorizationValid = requireBoolean(input.authorization_valid, 'authorization_valid');
  const stepUpFresh = requireBoolean(input.step_up_fresh, 'step_up_fresh');
  const integrityState = requireEnum(input.integrity_state, INTEGRITY_STATES, 'integrity_state');
  const captureState = requireEnum(input.capture_state, CAPTURE_STATES, 'capture_state');
  const appAccessRisk = requireEnum(input.app_access_risk, APP_ACCESS_RISK_STATES, 'app_access_risk');
  const runtime = requireEnum(input.runtime, RUNTIMES, 'runtime');

  const protectedSurface = HIGH_RISK_SURFACES.includes(surfaceClass);
  const native = runtimeRequirements(runtime, protectedSurface);
  const base = {
    surface_class: surfaceClass,
    runtime,
    protected: protectedSurface,
    short_lived_view_required: protectedSurface,
    watermark_required: protectedSurface,
    app_switcher_redaction_required: protectedSurface,
    ...native,
  };

  if (surfaceClass !== 'PUBLIC' && !authorizationValid) {
    return result(base, 'REVOKE_VIEW', 'AUTHORIZATION_INVALID', true);
  }

  if (!protectedSurface) {
    return result(base, 'ALLOW', 'STANDARD_POLICY', false);
  }

  if (integrityState === 'FAILED') {
    return result(base, 'REVOKE_VIEW', 'INTEGRITY_FAILED', true);
  }

  if (captureState === 'ACTIVE') {
    return result(base, 'REVOKE_VIEW', 'CAPTURE_ACTIVE', true);
  }

  if (integrityState === 'UNKNOWN') {
    if (!stepUpFresh) {
      return result(base, 'REQUIRE_STEP_UP', 'INTEGRITY_UNPROVEN', true);
    }
    return result(base, 'REDACT', 'INTEGRITY_UNPROVEN', true);
  }

  if (appAccessRisk === 'DETECTED') {
    if (!stepUpFresh) {
      return result(base, 'REQUIRE_STEP_UP', 'APP_ACCESS_RISK', true);
    }
    return result(base, 'REDACT', 'APP_ACCESS_RISK', true);
  }

  if (captureState === 'RISK') {
    return result(base, 'REDACT', 'CAPTURE_RISK', true);
  }

  if (!stepUpFresh) {
    return result(base, 'REQUIRE_STEP_UP', 'STEP_UP_REQUIRED', true);
  }

  return result(base, 'ALLOW', 'PROTECTED_VIEW_ACTIVE', false);
}

module.exports = {
  SURFACE_CLASSES,
  HIGH_RISK_SURFACES,
  INTEGRITY_STATES,
  CAPTURE_STATES,
  APP_ACCESS_RISK_STATES,
  RUNTIMES,
  DECISIONS,
  evaluateProtectedView,
};
