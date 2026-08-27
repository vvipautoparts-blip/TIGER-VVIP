'use strict';

const SECRET_PATTERN = /^sb_secret_[A-Za-z0-9._~-]{20,512}$/;

function secretError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function defaultLoader(secretArn, region) {
  let client = null;
  let Command = null;
  return async function loadSecret() {
    try {
      if (!client) {
        const sdk = require('@aws-sdk/client-secrets-manager');
        client = new sdk.SecretsManagerClient(region ? { region } : {});
        Command = sdk.GetSecretValueCommand;
      }
      return await client.send(new Command({ SecretId: secretArn, VersionStage: 'AWSCURRENT' }));
    } catch (error) {
      if (error && error.code === 'MODULE_NOT_FOUND') throw secretError('SECRETS_MANAGER_SDK_UNAVAILABLE');
      throw secretError('SUPABASE_SECRET_READ_FAILED');
    }
  };
}

function secretString(result) {
  if (result && typeof result.SecretString === 'string') return result.SecretString;
  if (result && result.SecretBinary) {
    try { return Buffer.from(result.SecretBinary).toString('utf8'); } catch (_) { /* fail below */ }
  }
  throw secretError('SUPABASE_SECRET_PAYLOAD_INVALID');
}

function parseSecret(result) {
  let data;
  try { data = JSON.parse(secretString(result)); } catch (error) {
    if (error && error.code) throw error;
    throw secretError('SUPABASE_SECRET_JSON_INVALID');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw secretError('SUPABASE_SECRET_JSON_INVALID');
  const key = String(data.supabaseSecretKey || '').trim();
  if (!SECRET_PATTERN.test(key)) throw secretError('SUPABASE_SECRET_FORMAT_INVALID');
  return key;
}

function createSupabaseSecretProvider(options = {}) {
  const secretArn = String(options.secretArn || '').trim();
  if (!/^arn:aws[a-z-]*:secretsmanager:[a-z0-9-]+:\d{12}:secret:.+/.test(secretArn)) throw secretError('SUPABASE_SECRET_ARN_INVALID');
  const ttlMs = Math.max(30_000, Math.min(3_600_000, Number(options.ttlMs) || 300_000));
  const nowMs = typeof options.nowMs === 'function' ? options.nowMs : Date.now;
  const loadSecret = typeof options.loadSecret === 'function' ? options.loadSecret : defaultLoader(secretArn, options.region);
  let cachedKey = null;
  let expiresAt = 0;
  let inflight = null;

  async function refresh() {
    const key = parseSecret(await loadSecret());
    const current = Number(nowMs());
    if (!Number.isFinite(current)) throw secretError('SUPABASE_SECRET_CLOCK_INVALID');
    cachedKey = key;
    expiresAt = current + ttlMs;
    return key;
  }

  async function get() {
    const current = Number(nowMs());
    if (cachedKey && Number.isFinite(current) && current < expiresAt) return cachedKey;
    if (inflight) return inflight;
    inflight = refresh();
    try { return await inflight; }
    finally { inflight = null; }
  }

  function clear() {
    cachedKey = null;
    expiresAt = 0;
  }

  return Object.freeze({ get, clear });
}

module.exports = Object.freeze({ createSupabaseSecretProvider, secretError });
