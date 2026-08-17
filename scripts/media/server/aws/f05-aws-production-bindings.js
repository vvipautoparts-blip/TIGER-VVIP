'use strict';

const { createHash } = require('node:crypto');

const MiB = 1024 * 1024;
const TOKEN = /^[A-Za-z0-9._:-]{1,96}$/;

function fail() {
  const error = new Error('media_production_binding_unavailable');
  error.code = 'media_production_binding_unavailable';
  throw error;
}

function callable(value, name) {
  return Boolean(value && typeof value[name] === 'function');
}

function validToken(value) {
  return typeof value === 'string' && TOKEN.test(value);
}

function createAwsProductionBindings(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail();
  const {
    listingStore,
    imageEngine,
    auditWriter,
    telemetryWriter,
    alertNotifier,
    circuitPolicyWriter,
  } = options;

  if (!callable(listingStore, 'getById')) fail();
  if (!callable(imageEngine, 'inspect') || !callable(imageEngine, 'rewrite')) fail();
  if (!validToken(imageEngine.backend) || !validToken(imageEngine.version)) fail();
  if (typeof auditWriter !== 'function' || typeof telemetryWriter !== 'function'
      || typeof alertNotifier !== 'function' || typeof circuitPolicyWriter !== 'function') fail();

  async function authorizeAdMedia(actor, scope) {
    if (!actor || actor.authenticated !== true || !validToken(actor.clerkUserId)) return false;
    if (!scope || !validToken(scope.listingId)) return false;
    try {
      const listing = await listingStore.getById(scope.listingId, { ownerClerkUserId: actor.clerkUserId });
      return Boolean(listing
        && listing.listingId === scope.listingId
        && listing.ownerClerkUserId === actor.clerkUserId);
    } catch {
      return false;
    }
  }

  async function sha256(bytes) {
    if (!(bytes instanceof Uint8Array)) fail();
    return createHash('sha256').update(bytes).digest('hex');
  }

  const imageStack = Object.freeze({
    inspect: (bytes, policy) => imageEngine.inspect(bytes, policy),
    rewrite: (bytes, policy) => imageEngine.rewrite(bytes, policy),
  });

  const productionRuntime = Object.freeze({
    schemaVersion: 'F05_PRODUCTION_RUNTIME_V1',
    environment: 'production',
    provider: 'aws',
    requestLimit: Object.freeze({
      enforced: true,
      maxBytes: 16 * MiB,
      contentEncoding: 'identity-only',
    }),
    imageStack: Object.freeze({
      backend: imageEngine.backend,
      version: imageEngine.version,
      jpeg: true,
      webp: true,
      metadataStrip: true,
      srgb: true,
      animationDisabled: true,
      heicDecode: false,
    }),
    audit: Object.freeze({ durable: true, privacySafe: true }),
    telemetry: Object.freeze({ privacyBudgeted: true, routeScoped: true }),
    alerting: Object.freeze({ routeScoped: true }),
    circuitControl: Object.freeze({
      authority: 'trusted_policy_plane',
      recommendationOnlyInput: true,
    }),
  });

  return Object.freeze({
    productionRuntime,
    authorizeAdMedia,
    sha256,
    imageStack,
    auditSink: Object.freeze({ write: (event) => auditWriter(event) }),
    telemetrySink: Object.freeze({ write: (event) => telemetryWriter(event) }),
    alertSink: Object.freeze({ notify: (event) => alertNotifier(event) }),
    policyControl: Object.freeze({ applyCircuitRecommendation: (recommendation) => circuitPolicyWriter(recommendation) }),
  });
}

exports.createAwsProductionBindings = createAwsProductionBindings;
Object.freeze(module.exports);
