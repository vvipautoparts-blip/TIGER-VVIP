'use strict';

const { createHash, timingSafeEqual } = require('node:crypto');
const policy = require('./policy.js');
const { parseVerifiedRequest } = require('./request.js');
const { verifySessionToken } = require('./identity.js');
const { getDefaultSecretProvider } = require('./secret-provider.js');
const { createSupabaseClient } = require('./supabase-client.js');
const { canonicalize: defaultCanonicalize } = require('./canonicalize.js');

const LISTING_SOURCE_BUCKET = 'listing-media';
const LISTING_CANONICAL_BUCKET = 'listing-media-canonical';
const PROOF_SOURCE_BUCKET = 'proof-capture-staging';
const DEFAULT_TIMEOUT_SECONDS = 8;
const VERIFIER_ID = process.env.VVIP_MEDIA_VERIFIER_ID || 'aws-lambda-sharp-v1';

function finalizerError(code, statusCode) {
  const error = new Error(code);
  error.code = code;
  if (statusCode) error.statusCode = statusCode;
  return error;
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function marketplaceRpc(supabase, name, body) {
  return supabase.rpc(`vvip_marketplace_${name}`, body);
}

function proofRpc(supabase, operation, body) {
  const names = Object.freeze({
    claim_proof_capture: 'vvip_synapse_proof_capture_claim',
    complete_proof_capture: 'vvip_synapse_proof_capture_finalize'
  });
  const name = names[operation];
  if (!name) throw finalizerError('PROOF_CAPTURE_RPC_INVALID');
  return supabase.rpc(name, body);
}

function requestMethod(event) {
  return String(
    event && event.requestContext && event.requestContext.http && event.requestContext.http.method
    || event && event.httpMethod
    || ''
  ).toUpperCase();
}

function allowedOrigin(event) {
  const origin = String((event && event.headers && (event.headers.origin || event.headers.Origin)) || '').trim();
  const allowed = String(process.env.VVIP_MEDIA_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return origin;
}

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin || 'null',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type,x-tiger-session,x-amz-content-sha256',
    'access-control-max-age': '600',
    'vary': 'Origin'
  };
}

function response(statusCode, body, origin) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(origin)
    },
    body: JSON.stringify(body)
  };
}

function preflight(origin) {
  return {
    statusCode: 204,
    headers: {
      'cache-control': 'no-store',
      ...corsHeaders(origin)
    },
    body: ''
  };
}

async function finalizeProofCapture(supabase, storage, request, timeoutSeconds, canonicalize) {
  const tokenDigest = createHash('sha256').update(request.token, 'utf8').digest('hex');
  const claim = await proofRpc(supabase, 'claim_proof_capture', {
    p_receipt_id: request.captureReceiptId,
    p_token_digest: tokenDigest
  });
  if (!claim || claim.ok !== true || !claim.source_storage_path) {
    throw finalizerError('PROOF_CAPTURE_CLAIM_INVALID');
  }

  const sourceObject = await storage.from(PROOF_SOURCE_BUCKET).download(claim.source_storage_path);
  const detectedMime = policy.detectStrictMime(sourceObject.body);
  const canonical = await canonicalize(sourceObject.body, detectedMime, timeoutSeconds);
  const canonicalSha256 = createHash('sha256').update(canonical.data).digest('hex');

  const completed = await proofRpc(supabase, 'complete_proof_capture', {
    p_receipt_id: request.captureReceiptId,
    p_token_digest: tokenDigest,
    p_canonical_digest: canonicalSha256,
    p_verifier_id: VERIFIER_ID
  });
  if (!completed || completed.ok !== true || completed.status !== 'FINALIZED') {
    throw finalizerError('PROOF_CAPTURE_COMPLETE_INVALID');
  }

  await storage.from(PROOF_SOURCE_BUCKET).remove(claim.source_storage_path).catch(() => undefined);
  return Object.freeze({
    captureReceiptId: request.captureReceiptId,
    canonicalSha256
  });
}

function createHandler(ports = {}) {
  const parseRequest = typeof ports.parseVerifiedRequest === 'function'
    ? ports.parseVerifiedRequest
    : parseVerifiedRequest;
  const verifyIdentity = typeof ports.verifySessionToken === 'function'
    ? ports.verifySessionToken
    : verifySessionToken;
  const getSecretProvider = typeof ports.getSecretProvider === 'function'
    ? ports.getSecretProvider
    : getDefaultSecretProvider;
  const buildSupabase = typeof ports.createSupabaseClient === 'function'
    ? ports.createSupabaseClient
    : createSupabaseClient;
  const canonicalize = typeof ports.canonicalize === 'function'
    ? ports.canonicalize
    : defaultCanonicalize;

  return async function handler(event) {
    const origin = allowedOrigin(event);
    if (!origin) return response(403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' }, null);

    const method = requestMethod(event);
    if (method === 'OPTIONS') return preflight(origin);

    let job = null;
    let request = null;
    let supabase = null;
    let storage = null;
    let ownerBound = false;

    try {
      request = parseRequest(event);
      const identity = await verifyIdentity(request.sessionToken);
      if (!identity || typeof identity.subject !== 'string' || !identity.subject) {
        throw finalizerError('IDENTITY_SUBJECT_INVALID', 401);
      }

      const credentials = await getSecretProvider().get();
      supabase = buildSupabase({
        baseUrl: credentials.supabaseUrl,
        apiKey: credentials.apiKey,
        maxDownloadBytes: policy.MAX_SOURCE_BYTES
      });
      storage = supabase;

      const timeoutSeconds = Math.max(
        1,
        Math.min(20, Number(process.env.VVIP_MEDIA_PROCESSING_TIMEOUT_SECONDS) || DEFAULT_TIMEOUT_SECONDS)
      );

      if (request.kind === 'proof') {
        const proof = await finalizeProofCapture(
          supabase,
          storage,
          request,
          timeoutSeconds,
          canonicalize
        );
        return response(200, {
          ok: true,
          captureReceiptId: proof.captureReceiptId,
          state: 'FINALIZED',
          canonicalSha256: proof.canonicalSha256
        }, origin);
      }

      job = await marketplaceRpc(supabase, 'claim_media_finalization', {
        target_media: request.mediaId,
        finalization_token: request.token
      });
      if (!job || !job.job_id || !job.source_storage_path || !job.owner_subject) {
        throw finalizerError('MEDIA_FINALIZATION_CLAIM_INVALID');
      }
      if (job.owner_subject !== identity.subject) {
        throw finalizerError('MEDIA_FINALIZATION_OWNER_MISMATCH', 403);
      }
      ownerBound = true;

      const expectedBytes = Number(job.expected_byte_size);
      const sourceObject = await storage.from(LISTING_SOURCE_BUCKET).download(
        job.source_storage_path,
        { expectedBytes }
      );
      const expectedMime = String(job.expected_mime_type || '').toLowerCase();
      if (sourceObject.contentType && !constantTimeEqual(sourceObject.contentType, expectedMime)) {
        throw finalizerError('MEDIA_STORAGE_MIME_MISMATCH');
      }
      if (sourceObject.body.length !== expectedBytes) {
        throw finalizerError('MEDIA_STORAGE_SIZE_MISMATCH');
      }

      const sourceSha256 = createHash('sha256').update(sourceObject.body).digest('hex');
      const canonical = await canonicalize(sourceObject.body, expectedMime, timeoutSeconds);
      const canonicalSha256 = createHash('sha256').update(canonical.data).digest('hex');
      const canonicalPath = policy.canonicalPath(
        job.listing_id,
        job.media_id,
        canonicalSha256,
        expectedMime
      );

      await storage.from(LISTING_CANONICAL_BUCKET).upload(
        canonicalPath,
        canonical.data,
        expectedMime
      );
      const completed = await marketplaceRpc(supabase, 'complete_media_finalization', {
        target_job: job.job_id,
        finalization_token: request.token,
        source_digest: sourceSha256,
        canonical_path: canonicalPath,
        canonical_digest: canonicalSha256,
        canonical_mime: expectedMime,
        canonical_size: canonical.data.length,
        canonical_image_width: canonical.info.width,
        canonical_image_height: canonical.info.height,
        verifier_id: VERIFIER_ID
      });
      if (!completed || completed.finalization_state !== 'CANONICAL') {
        throw finalizerError('MEDIA_FINALIZATION_COMPLETE_INVALID');
      }

      storage.from(LISTING_SOURCE_BUCKET)
        .remove(job.source_storage_path)
        .catch(() => undefined);

      return response(200, {
        ok: true,
        mediaId: job.media_id,
        state: completed.finalization_state,
        canonicalSha256
      }, origin);
    } catch (error) {
      if (ownerBound && supabase && job && job.job_id && request && request.kind === 'listing') {
        try {
          await marketplaceRpc(supabase, 'fail_media_finalization', {
            target_job: job.job_id,
            finalization_token: request.token,
            failure_code: policy.safeFailureCode(error)
          });
        } catch (_) {
          /* original failure remains authoritative */
        }
      }
      const statusCode = Number(error && error.statusCode) || 422;
      return response(statusCode, {
        ok: false,
        code: policy.safeFailureCode(error)
      }, origin);
    }
  };
}

const handler = createHandler();

exports.handler = handler;
exports.createHandler = createHandler;
exports.requestMethod = requestMethod;
exports.finalizeProofCapture = finalizeProofCapture;
