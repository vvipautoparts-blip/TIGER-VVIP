'use strict';

const sharp = require('sharp');
const { createHash, timingSafeEqual } = require('node:crypto');
const policy = require('./policy.js');

const LISTING_SOURCE_BUCKET = 'listing-media';
const LISTING_CANONICAL_BUCKET = 'listing-media-canonical';
const PROOF_SOURCE_BUCKET = 'proof-capture-staging';
const DEFAULT_TIMEOUT_SECONDS = 8;
const VERIFIER_ID = process.env.VVIP_MEDIA_VERIFIER_ID || 'aws-lambda-sharp-v1';

function env(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw Object.assign(new Error(`ENV_${name}_REQUIRED`), { code: `ENV_${name}_REQUIRED` });
  return value.replace(/\/$/, '');
}

function headers(serviceKey, contentType) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...(contentType ? { 'Content-Type': contentType } : {})
  };
}

function encodeObjectPath(value) {
  return String(value || '').split('/').map(encodeURIComponent).join('/');
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function storageClient(baseUrl, serviceKey) {
  return {
    from(bucket) {
      return Object.freeze({
        async download(path) {
          const response = await fetch(`${baseUrl}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`, {
            method: 'GET',
            headers: headers(serviceKey)
          });
          if (!response.ok) throw Object.assign(new Error('MEDIA_SOURCE_DOWNLOAD_FAILED'), { code: 'MEDIA_SOURCE_DOWNLOAD_FAILED' });
          const body = Buffer.from(await response.arrayBuffer());
          const contentType = String(response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
          return Object.freeze({ body, contentType });
        },
        async upload(path, body, mime) {
          const response = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`, {
            method: 'POST',
            headers: {
              ...headers(serviceKey, mime),
              'cache-control': 'public,max-age=31536000,immutable',
              'x-upsert': 'false'
            },
            body
          });
          if (!response.ok && response.status !== 409) {
            throw Object.assign(new Error('MEDIA_CANONICAL_UPLOAD_FAILED'), { code: 'MEDIA_CANONICAL_UPLOAD_FAILED' });
          }
        },
        async remove(path) {
          const response = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`, {
            method: 'DELETE',
            headers: headers(serviceKey)
          });
          return response.ok || response.status === 404;
        }
      });
    }
  };
}

async function rpcNamed(baseUrl, serviceKey, name, body) {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: {
      ...headers(serviceKey, 'application/json'),
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }
  if (!response.ok) {
    const code = data && typeof data.message === 'string' ? data.message : 'MEDIA_RPC_FAILED';
    throw Object.assign(new Error(code), { code });
  }
  return Array.isArray(data) ? data[0] : data;
}

function marketplaceRpc(baseUrl, serviceKey, name, body) {
  return rpcNamed(baseUrl, serviceKey, `vvip_marketplace_${name}`, body);
}

function proofRpc(baseUrl, serviceKey, operation, body) {
  const names = Object.freeze({
    claim_proof_capture: 'vvip_synapse_proof_capture_claim',
    complete_proof_capture: 'vvip_synapse_proof_capture_finalize'
  });
  const name = names[operation];
  if (!name) throw Object.assign(new Error('PROOF_CAPTURE_RPC_INVALID'), { code: 'PROOF_CAPTURE_RPC_INVALID' });
  return rpcNamed(baseUrl, serviceKey, name, body);
}

function requestMethod(event) {
  return String(event && event.requestContext && event.requestContext.http && event.requestContext.http.method || event && event.httpMethod || '').toUpperCase();
}

function parseRequest(event) {
  if (!event || requestMethod(event) !== 'POST') {
    throw Object.assign(new Error('METHOD_NOT_ALLOWED'), { code: 'METHOD_NOT_ALLOWED', statusCode: 405 });
  }
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { throw Object.assign(new Error('REQUEST_JSON_INVALID'), { code: 'REQUEST_JSON_INVALID', statusCode: 400 }); }
  const token = String(body.finalizationToken || '').trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!/^[0-9a-f]{64}$/.test(token)) {
    throw Object.assign(new Error('FINALIZATION_REQUEST_INVALID'), { code: 'FINALIZATION_REQUEST_INVALID', statusCode: 400 });
  }

  const captureReceiptId = String(body.captureReceiptId || '').trim();
  if (captureReceiptId) {
    if (!uuid.test(captureReceiptId)) {
      throw Object.assign(new Error('PROOF_CAPTURE_REQUEST_INVALID'), { code: 'PROOF_CAPTURE_REQUEST_INVALID', statusCode: 400 });
    }
    return Object.freeze({ kind: 'proof', captureReceiptId, token });
  }

  const mediaId = String(body.mediaId || '').trim();
  if (!uuid.test(mediaId)) {
    throw Object.assign(new Error('FINALIZATION_REQUEST_INVALID'), { code: 'FINALIZATION_REQUEST_INVALID', statusCode: 400 });
  }
  return Object.freeze({ kind: 'listing', mediaId, token });
}

function allowedOrigin(event) {
  const origin = String((event && event.headers && (event.headers.origin || event.headers.Origin)) || '').trim();
  const allowed = String(process.env.VVIP_MEDIA_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return origin;
}

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin || 'null',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
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

async function canonicalize(source, mime, timeoutSeconds) {
  policy.assertStrictContainer(source, mime);
  const metadata = await sharp(source, { limitInputPixels: policy.MAX_PIXELS, animated: false }).metadata();
  policy.assertDecodedMetadata(metadata, mime);

  let pipeline = sharp(source, { limitInputPixels: policy.MAX_PIXELS, animated: false })
    .rotate()
    .toColourspace('srgb');
  if (mime === 'image/jpeg') {
    pipeline = pipeline.jpeg({ quality: 86, chromaSubsampling: '4:4:4', progressive: true });
  } else {
    pipeline = pipeline.webp({ quality: 84, effort: 4, smartSubsample: true });
  }
  const output = await pipeline.timeout({ seconds: timeoutSeconds }).toBuffer({ resolveWithObject: true });
  policy.assertStrictContainer(output.data, mime);
  policy.assertDecodedMetadata({ format: output.info.format, width: output.info.width, height: output.info.height, pages: 1 }, mime);
  return output;
}

async function finalizeProofCapture(baseUrl, serviceKey, storage, request, timeoutSeconds) {
  const tokenDigest = createHash('sha256').update(request.token, 'utf8').digest('hex');
  const claim = await proofRpc(baseUrl, serviceKey, 'claim_proof_capture', {
    p_receipt_id: request.captureReceiptId,
    p_token_digest: tokenDigest
  });
  if (!claim || claim.ok !== true || !claim.source_storage_path) {
    throw Object.assign(new Error('PROOF_CAPTURE_CLAIM_INVALID'), { code: 'PROOF_CAPTURE_CLAIM_INVALID' });
  }

  const sourceObject = await storage.from(PROOF_SOURCE_BUCKET).download(claim.source_storage_path);
  const detectedMime = policy.detectStrictMime(sourceObject.body);
  const canonical = await canonicalize(sourceObject.body, detectedMime, timeoutSeconds);
  const canonicalSha256 = createHash('sha256').update(canonical.data).digest('hex');

  const completed = await proofRpc(baseUrl, serviceKey, 'complete_proof_capture', {
    p_receipt_id: request.captureReceiptId,
    p_token_digest: tokenDigest,
    p_canonical_digest: canonicalSha256,
    p_verifier_id: VERIFIER_ID
  });
  if (!completed || completed.ok !== true || completed.status !== 'FINALIZED') {
    throw Object.assign(new Error('PROOF_CAPTURE_COMPLETE_INVALID'), { code: 'PROOF_CAPTURE_COMPLETE_INVALID' });
  }

  await storage.from(PROOF_SOURCE_BUCKET).remove(claim.source_storage_path).catch(() => undefined);
  return Object.freeze({ captureReceiptId: request.captureReceiptId, canonicalSha256 });
}

async function handler(event) {
  const origin = allowedOrigin(event);
  if (!origin) return response(403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' }, null);

  const method = requestMethod(event);
  if (method === 'OPTIONS') return preflight(origin);

  let job = null;
  let request = null;
  try {
    request = parseRequest(event);
    const baseUrl = env('SUPABASE_URL');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const storage = storageClient(baseUrl, serviceKey);
    const timeoutSeconds = Math.max(1, Math.min(20, Number(process.env.VVIP_MEDIA_PROCESSING_TIMEOUT_SECONDS) || DEFAULT_TIMEOUT_SECONDS));

    if (request.kind === 'proof') {
      const proof = await finalizeProofCapture(baseUrl, serviceKey, storage, request, timeoutSeconds);
      return response(200, {
        ok: true,
        captureReceiptId: proof.captureReceiptId,
        state: 'FINALIZED',
        canonicalSha256: proof.canonicalSha256
      }, origin);
    }

    job = await marketplaceRpc(baseUrl, serviceKey, 'claim_media_finalization', {
      target_media: request.mediaId,
      finalization_token: request.token
    });
    if (!job || !job.job_id || !job.source_storage_path) throw Object.assign(new Error('MEDIA_FINALIZATION_CLAIM_INVALID'), { code: 'MEDIA_FINALIZATION_CLAIM_INVALID' });

    const sourceObject = await storage.from(LISTING_SOURCE_BUCKET).download(job.source_storage_path);
    const expectedMime = String(job.expected_mime_type || '').toLowerCase();
    if (sourceObject.contentType && !constantTimeEqual(sourceObject.contentType, expectedMime)) {
      throw Object.assign(new Error('MEDIA_STORAGE_MIME_MISMATCH'), { code: 'MEDIA_STORAGE_MIME_MISMATCH' });
    }
    if (sourceObject.body.length !== Number(job.expected_byte_size)) {
      throw Object.assign(new Error('MEDIA_STORAGE_SIZE_MISMATCH'), { code: 'MEDIA_STORAGE_SIZE_MISMATCH' });
    }

    const sourceSha256 = createHash('sha256').update(sourceObject.body).digest('hex');
    const canonical = await canonicalize(sourceObject.body, expectedMime, timeoutSeconds);
    const canonicalSha256 = createHash('sha256').update(canonical.data).digest('hex');
    const canonicalPath = policy.canonicalPath(job.listing_id, job.media_id, canonicalSha256, expectedMime);

    await storage.from(LISTING_CANONICAL_BUCKET).upload(canonicalPath, canonical.data, expectedMime);
    const completed = await marketplaceRpc(baseUrl, serviceKey, 'complete_media_finalization', {
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

    storage.from(LISTING_SOURCE_BUCKET).remove(job.source_storage_path).catch(() => undefined);
    return response(200, {
      ok: true,
      mediaId: job.media_id,
      state: completed && completed.finalization_state || 'CANONICAL',
      canonicalSha256
    }, origin);
  } catch (error) {
    if (job && job.job_id && request && request.kind === 'listing') {
      try {
        const baseUrl = env('SUPABASE_URL');
        const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
        await marketplaceRpc(baseUrl, serviceKey, 'fail_media_finalization', {
          target_job: job.job_id,
          finalization_token: request.token,
          failure_code: policy.safeFailureCode(error)
        });
      } catch (_) { /* original failure remains authoritative */ }
    }
    const statusCode = Number(error && error.statusCode) || 422;
    return response(statusCode, { ok: false, code: policy.safeFailureCode(error) }, origin);
  }
}

exports.handler = handler;
exports.canonicalize = canonicalize;
exports.storageClient = storageClient;
exports.requestMethod = requestMethod;
exports.finalizeProofCapture = finalizeProofCapture;
