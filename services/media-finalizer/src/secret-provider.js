'use strict';

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_CACHE_TTL_MS = 1_000;
const MAX_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_SECRET_ID_BYTES = 512;
const MAX_SECRET_STRING_BYTES = 16 * 1024;
const MAX_API_KEY_BYTES = 1024;

function secretError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function boundedTtl(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_CACHE_TTL_MS;
  return Math.max(MIN_CACHE_TTL_MS, Math.min(MAX_CACHE_TTL_MS, Math.trunc(numeric)));
}

function normalizeSecretId(value) {
  const secretId = String(value || '').trim();
  if (
    !secretId
    || Buffer.byteLength(secretId, 'utf8') > MAX_SECRET_ID_BYTES
    || !/^[A-Za-z0-9/_+=.@-]+$/.test(secretId)
  ) {
    throw secretError('MEDIA_SECRET_CONFIGURATION_INVALID');
  }
  return secretId;
}

function normalizeSupabaseUrl(value) {
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
    throw secretError('MEDIA_SECRET_INVALID');
  }
}

function normalizeApiKey(value) {
  const apiKey = typeof value === 'string' ? value.trim() : '';
  if (
    !apiKey.startsWith('sb_secret_')
    || Buffer.byteLength(apiKey, 'utf8') < 20
    || Buffer.byteLength(apiKey, 'utf8') > MAX_API_KEY_BYTES
    || /[\s\u0000-\u001f\u007f]/.test(apiKey)
  ) {
    throw secretError('MEDIA_SECRET_INVALID');
  }
  return apiKey;
}

function parseSecretDocument(secretString) {
  if (
    typeof secretString !== 'string'
    || Buffer.byteLength(secretString, 'utf8') < 2
    || Buffer.byteLength(secretString, 'utf8') > MAX_SECRET_STRING_BYTES
  ) {
    throw secretError('MEDIA_SECRET_INVALID');
  }

  let document;
  try {
    document = JSON.parse(secretString);
  } catch (_) {
    throw secretError('MEDIA_SECRET_INVALID');
  }
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw secretError('MEDIA_SECRET_INVALID');
  }

  return Object.freeze({
    supabaseUrl: normalizeSupabaseUrl(document.supabaseUrl),
    apiKey: normalizeApiKey(document.apiKey)
  });
}

let defaultSecretsManagerClient = null;
let defaultSecretsManagerTypes = null;

async function defaultGetSecretValue(input) {
  try {
    if (!defaultSecretsManagerTypes) {
      defaultSecretsManagerTypes = require('@aws-sdk/client-secrets-manager');
    }
    if (!defaultSecretsManagerClient) {
      defaultSecretsManagerClient = new defaultSecretsManagerTypes.SecretsManagerClient({});
    }
    return await defaultSecretsManagerClient.send(
      new defaultSecretsManagerTypes.GetSecretValueCommand(input)
    );
  } catch (_) {
    throw secretError('MEDIA_SECRET_UNAVAILABLE');
  }
}

function createSecretProvider(options = {}) {
  const secretId = normalizeSecretId(options.secretId);
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const cacheTtlMs = boundedTtl(options.cacheTtlMs);
  const getSecretValue = typeof options.getSecretValue === 'function'
    ? options.getSecretValue
    : defaultGetSecretValue;

  let cached = null;
  let cacheExpiresAt = 0;
  let inFlight = null;

  async function load() {
    let raw;
    try {
      raw = await getSecretValue({ SecretId: secretId });
    } catch (_) {
      throw secretError('MEDIA_SECRET_UNAVAILABLE');
    }
    try {
      return parseSecretDocument(raw && raw.SecretString);
    } catch (_) {
      throw secretError('MEDIA_SECRET_INVALID');
    }
  }

  async function get(request = {}) {
    const forceRefresh = request && request.forceRefresh === true;
    const current = Number(now());
    const nowMs = Number.isFinite(current) ? current : 0;

    if (!forceRefresh && cached && nowMs < cacheExpiresAt) return cached;
    if (!forceRefresh && inFlight) return inFlight;

    const pending = load().then((next) => {
      cached = next;
      cacheExpiresAt = nowMs + cacheTtlMs;
      return next;
    });
    inFlight = pending;
    try {
      return await pending;
    } finally {
      if (inFlight === pending) inFlight = null;
    }
  }

  return Object.freeze({ get });
}

let defaultProvider = null;
let defaultProviderSecretId = '';

function getDefaultSecretProvider(source = process.env) {
  const secretId = normalizeSecretId(source.TIGER_MEDIA_SUPABASE_SECRET_ID);
  if (!defaultProvider || defaultProviderSecretId !== secretId) {
    defaultProvider = createSecretProvider({ secretId });
    defaultProviderSecretId = secretId;
  }
  return defaultProvider;
}

module.exports = Object.freeze({
  createSecretProvider,
  getDefaultSecretProvider,
  parseSecretDocument,
  secretError
});
