'use strict';

const DEFAULT_TIMEOUT_MS = 8_000;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const MAX_RPC_RESPONSE_BYTES = 128 * 1024;
const MAX_PATH_BYTES = 2 * 1024;
const CANONICAL_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{64}\.(?:jpg|webp)$/i;

function mediaError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (
      url.protocol !== 'https:'
      || !url.hostname
      || url.username
      || url.password
      || url.port
      || (url.pathname && url.pathname !== '/')
      || url.search
      || url.hash
    ) {
      throw new Error('invalid');
    }
    return url.origin;
  } catch (_) {
    throw mediaError('MEDIA_SUPABASE_CONFIG_INVALID');
  }
}

function normalizeApiKey(value) {
  const apiKey = typeof value === 'string' ? value.trim() : '';
  if (!apiKey.startsWith('sb_secret_') || apiKey.length < 20 || apiKey.length > 1024 || /[\s\u0000-\u001f\u007f]/.test(apiKey)) {
    throw mediaError('MEDIA_SUPABASE_CONFIG_INVALID');
  }
  return apiKey;
}

function boundedInteger(value, fallback, minimum, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(numeric)));
}

function validateBucket(value) {
  const bucket = String(value || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(bucket)) throw mediaError('MEDIA_STORAGE_PATH_INVALID');
  return bucket;
}

function encodeSegment(value) {
  const segment = String(value);
  if (segment === '.') return '%2E';
  if (segment === '..') return '%2E%2E';
  return encodeURIComponent(segment);
}

function encodeObjectPath(value) {
  const path = String(value || '');
  if (!path || Buffer.byteLength(path, 'utf8') > MAX_PATH_BYTES || /[\u0000-\u001f\u007f]/.test(path)) {
    throw mediaError('MEDIA_STORAGE_PATH_INVALID');
  }
  return path.split('/').map(encodeSegment).join('/');
}

function validateRpcName(value) {
  const name = String(value || '');
  if (!/^[a-z0-9_]{1,128}$/.test(name)) throw mediaError('MEDIA_RPC_NAME_INVALID');
  return name;
}

function normalizeContentType(value) {
  return String(value || '').split(';', 1)[0].trim().toLowerCase();
}

function contentLength(response) {
  const raw = response && response.headers && typeof response.headers.get === 'function'
    ? response.headers.get('content-length')
    : null;
  if (raw === null || raw === undefined || raw === '') return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw mediaError('MEDIA_SOURCE_SIZE_INVALID');
  return parsed;
}

function createSupabaseClient(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const apiKey = normalizeApiKey(options.apiKey);
  const fetchImpl = typeof options.fetch === 'function' ? options.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw mediaError('MEDIA_SUPABASE_CONFIG_INVALID');
  const timeoutMs = boundedInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const maxDownloadBytes = boundedInteger(
    options.maxDownloadBytes,
    DEFAULT_MAX_DOWNLOAD_BYTES,
    1,
    DEFAULT_MAX_DOWNLOAD_BYTES
  );

  function requestHeaders(contentType) {
    return {
      apikey: apiKey,
      ...(contentType ? { 'Content-Type': contentType } : {})
    };
  }

  async function withDeadline(operationCode, callback) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (timer && typeof timer.unref === 'function') timer.unref();
    try {
      return await callback(controller.signal, controller);
    } catch (error) {
      if (error && error.code && /^MEDIA_/.test(error.code)) throw error;
      if (controller.signal.aborted) throw mediaError(operationCode === 'MEDIA_SOURCE_DOWNLOAD_FAILED' ? 'MEDIA_SOURCE_DOWNLOAD_TIMEOUT' : operationCode);
      throw mediaError(operationCode);
    } finally {
      clearTimeout(timer);
    }
  }

  async function rpc(name, body) {
    const rpcName = validateRpcName(name);
    return withDeadline('MEDIA_RPC_FAILED', async (signal) => {
      const response = await fetchImpl(`${baseUrl}/rest/v1/rpc/${encodeURIComponent(rpcName)}`, {
        method: 'POST',
        redirect: 'error',
        signal,
        headers: {
          ...requestHeaders('application/json'),
          Accept: 'application/json'
        },
        body: JSON.stringify(body || {})
      });
      const declaredLength = contentLength(response);
      if (declaredLength !== null && declaredLength > MAX_RPC_RESPONSE_BYTES) throw mediaError('MEDIA_RPC_RESPONSE_INVALID');
      let text = '';
      try {
        text = await response.text();
      } catch (_) {
        throw mediaError('MEDIA_RPC_FAILED');
      }
      if (Buffer.byteLength(text, 'utf8') > MAX_RPC_RESPONSE_BYTES) throw mediaError('MEDIA_RPC_RESPONSE_INVALID');
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch (_) { throw mediaError('MEDIA_RPC_RESPONSE_INVALID'); }
      }
      if (!response.ok) {
        const remote = data && typeof data.message === 'string' && /^[A-Z0-9_]{1,120}$/.test(data.message)
          ? data.message
          : 'MEDIA_RPC_FAILED';
        throw mediaError(remote);
      }
      return Array.isArray(data) ? data[0] : data;
    });
  }

  async function download(bucketValue, pathValue, request = {}) {
    const bucket = validateBucket(bucketValue);
    const path = encodeObjectPath(pathValue);
    const hasExpected = request && request.expectedBytes !== undefined && request.expectedBytes !== null;
    const expectedBytes = hasExpected ? Number(request.expectedBytes) : null;
    if (hasExpected && (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1 || expectedBytes > maxDownloadBytes)) {
      throw mediaError('MEDIA_SOURCE_SIZE_INVALID');
    }
    const hardLimit = hasExpected ? expectedBytes : maxDownloadBytes;

    return withDeadline('MEDIA_SOURCE_DOWNLOAD_FAILED', async (signal, controller) => {
      const response = await fetchImpl(`${baseUrl}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${path}`, {
        method: 'GET',
        redirect: 'error',
        signal,
        headers: requestHeaders()
      });
      if (!response || response.ok !== true) throw mediaError('MEDIA_SOURCE_DOWNLOAD_FAILED');

      const declaredLength = contentLength(response);
      if (declaredLength !== null) {
        if (declaredLength > maxDownloadBytes) throw mediaError('MEDIA_SOURCE_SIZE_INVALID');
        if (hasExpected && declaredLength !== expectedBytes) throw mediaError('MEDIA_SOURCE_SIZE_MISMATCH');
      }
      if (!response.body || typeof response.body.getReader !== 'function') throw mediaError('MEDIA_SOURCE_DOWNLOAD_FAILED');

      const reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      try {
        for (;;) {
          const next = await reader.read();
          if (!next || next.done) break;
          const chunk = Buffer.from(next.value || []);
          total += chunk.length;
          if (total > hardLimit || total > maxDownloadBytes) {
            controller.abort();
            try { await reader.cancel(); } catch (_) { /* best effort */ }
            throw mediaError(hasExpected ? 'MEDIA_SOURCE_SIZE_MISMATCH' : 'MEDIA_SOURCE_SIZE_INVALID');
          }
          chunks.push(chunk);
        }
      } catch (error) {
        if (error && error.code) throw error;
        if (controller.signal.aborted) throw mediaError('MEDIA_SOURCE_DOWNLOAD_TIMEOUT');
        throw mediaError('MEDIA_SOURCE_DOWNLOAD_FAILED');
      }

      if (hasExpected && total !== expectedBytes) throw mediaError('MEDIA_SOURCE_SIZE_MISMATCH');
      if (!hasExpected && (total < 1 || total > maxDownloadBytes)) throw mediaError('MEDIA_SOURCE_SIZE_INVALID');
      return Object.freeze({
        body: Buffer.concat(chunks, total),
        contentType: normalizeContentType(response.headers && response.headers.get && response.headers.get('content-type'))
      });
    });
  }

  async function upload(bucketValue, pathValue, body, mime) {
    const bucket = validateBucket(bucketValue);
    const rawPath = String(pathValue || '');
    if (!CANONICAL_PATH.test(rawPath)) throw mediaError('MEDIA_CANONICAL_PATH_INVALID');
    const path = encodeObjectPath(rawPath);
    const content = Buffer.isBuffer(body) ? body : Buffer.from(body || []);
    if (content.length < 1 || content.length > maxDownloadBytes) throw mediaError('MEDIA_CANONICAL_SIZE_INVALID');
    const contentType = String(mime || '').toLowerCase();
    const extension = rawPath.endsWith('.jpg') ? 'image/jpeg' : rawPath.endsWith('.webp') ? 'image/webp' : '';
    if (!extension || contentType !== extension) throw mediaError('MEDIA_CANONICAL_MIME_INVALID');

    return withDeadline('MEDIA_CANONICAL_UPLOAD_FAILED', async (signal) => {
      const response = await fetchImpl(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, {
        method: 'POST',
        redirect: 'error',
        signal,
        headers: {
          ...requestHeaders(contentType),
          'cache-control': 'public,max-age=31536000,immutable',
          'x-upsert': 'false'
        },
        body: content
      });
      if (!response || (!response.ok && response.status !== 409)) throw mediaError('MEDIA_CANONICAL_UPLOAD_FAILED');
      return true;
    });
  }

  async function remove(bucketValue, pathValue) {
    const bucket = validateBucket(bucketValue);
    const path = encodeObjectPath(pathValue);
    return withDeadline('MEDIA_SOURCE_REMOVE_FAILED', async (signal) => {
      const response = await fetchImpl(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, {
        method: 'DELETE',
        redirect: 'error',
        signal,
        headers: requestHeaders()
      });
      return Boolean(response && (response.ok || response.status === 404));
    });
  }

  function from(bucket) {
    const fixedBucket = validateBucket(bucket);
    return Object.freeze({
      download: (path, request) => download(fixedBucket, path, request),
      upload: (path, body, mime) => upload(fixedBucket, path, body, mime),
      remove: (path) => remove(fixedBucket, path)
    });
  }

  return Object.freeze({ rpc, download, upload, remove, from });
}

module.exports = Object.freeze({
  createSupabaseClient,
  mediaError
});
