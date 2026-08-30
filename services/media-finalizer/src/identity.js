'use strict';

const crypto = require('node:crypto');

const ALGORITHM = 'RS256';
const MAX_TOKEN_BYTES = 16 * 1024;
const MAX_JWKS_BYTES = 64 * 1024;
const DEFAULT_CLOCK_SKEW_SECONDS = 30;
const DEFAULT_JWKS_TTL_MS = 5 * 60 * 1000;
const MAX_AUTHORIZED_PARTIES = 20;
const MAX_CLAIM_TEXT = 512;

function identityFailure(code, statusCode = 401) {
  const error = new Error(code);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function fail(code, statusCode = 401) {
  throw identityFailure(code, statusCode);
}

function httpsUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return '';
    return url.toString().replace(/\/$/, '');
  } catch (_) {
    return '';
  }
}

function boundedText(value, maximum = MAX_CLAIM_TEXT) {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : '';
}

function normalizeAuthorizedParties(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || '').split(',');
  const normalized = list.map((entry) => String(entry || '').trim()).filter(Boolean);
  if (normalized.length < 1 || normalized.length > MAX_AUTHORIZED_PARTIES) return null;
  if (new Set(normalized).size !== normalized.length) return null;
  if (normalized.some((entry) => !boundedText(entry, MAX_CLAIM_TEXT) || /\s/.test(entry))) return null;
  return Object.freeze(normalized.slice());
}

function validateConfiguration(input) {
  const source = input && typeof input === 'object' ? input : {};
  const issuer = httpsUrl(source.issuer);
  const jwksUrl = httpsUrl(source.jwksUrl);
  const audience = boundedText(String(source.audience || '').trim(), 256);
  const authorizedParties = normalizeAuthorizedParties(source.authorizedParties);
  if (!issuer || !jwksUrl || !audience || !authorizedParties) {
    throw identityFailure('IDENTITY_CONFIGURATION_INVALID', 500);
  }
  return Object.freeze({ issuer, audience, jwksUrl, authorizedParties });
}

function identityConfigFromEnv(source = process.env) {
  return validateConfiguration({
    issuer: source.TIGER_CLERK_ISSUER,
    audience: source.TIGER_CLERK_AUDIENCE,
    jwksUrl: source.TIGER_CLERK_JWKS_URL,
    authorizedParties: source.TIGER_CLERK_AUTHORIZED_PARTIES
  });
}

function decodeJsonSegment(segment) {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) fail('IDENTITY_TOKEN_INVALID');
  let value;
  try {
    const bytes = Buffer.from(segment, 'base64url');
    if (bytes.length < 2 || bytes.length > MAX_TOKEN_BYTES) fail('IDENTITY_TOKEN_INVALID');
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    if (error && error.code) throw error;
    fail('IDENTITY_TOKEN_INVALID');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('IDENTITY_TOKEN_INVALID');
  return value;
}

function parseToken(token) {
  if (
    typeof token !== 'string'
    || token.length < 16
    || Buffer.byteLength(token, 'utf8') > MAX_TOKEN_BYTES
    || /\s/.test(token)
  ) {
    fail('IDENTITY_TOKEN_INVALID');
  }
  const segments = token.split('.');
  if (segments.length !== 3 || segments.some((segment) => !segment)) fail('IDENTITY_TOKEN_INVALID');
  const header = decodeJsonSegment(segments[0]);
  if (header.alg !== ALGORITHM) fail('IDENTITY_ALGORITHM_DENIED');
  const kid = boundedText(header.kid, 256);
  if (!kid) fail('IDENTITY_KEY_ID_INVALID');
  const payload = decodeJsonSegment(segments[1]);
  if (!/^[A-Za-z0-9_-]+$/.test(segments[2])) fail('IDENTITY_TOKEN_INVALID');
  let signature;
  try {
    signature = Buffer.from(segments[2], 'base64url');
  } catch (_) {
    fail('IDENTITY_TOKEN_INVALID');
  }
  if (signature.length < 64 || signature.length > 1024) fail('IDENTITY_TOKEN_INVALID');
  return Object.freeze({
    header,
    payload,
    kid,
    signingInput: `${segments[0]}.${segments[1]}`,
    signature
  });
}

function numericDate(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function audienceMatches(actual, expected) {
  if (typeof actual === 'string') return actual === expected;
  if (!Array.isArray(actual) || actual.length < 1 || actual.length > 20) return false;
  return actual.every((entry) => typeof entry === 'string' && entry.length > 0 && entry.length <= 256)
    && actual.includes(expected);
}

function validateClaims(payload, config, nowSeconds, clockSkewSeconds) {
  if (payload.iss !== config.issuer) fail('IDENTITY_ISSUER_INVALID');
  if (!audienceMatches(payload.aud, config.audience)) fail('IDENTITY_AUDIENCE_INVALID');

  const authorizedParty = boundedText(payload.azp, MAX_CLAIM_TEXT);
  if (!authorizedParty || !config.authorizedParties.includes(authorizedParty)) {
    fail('IDENTITY_AUTHORIZED_PARTY_INVALID');
  }

  const expiration = numericDate(payload.exp);
  if (expiration === null || expiration <= nowSeconds - clockSkewSeconds) fail('IDENTITY_EXPIRED');

  if (Object.prototype.hasOwnProperty.call(payload, 'nbf')) {
    const notBefore = numericDate(payload.nbf);
    if (notBefore === null || notBefore > nowSeconds + clockSkewSeconds) fail('IDENTITY_NOT_YET_VALID');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'iat')) {
    const issuedAt = numericDate(payload.iat);
    if (issuedAt === null || issuedAt > nowSeconds + clockSkewSeconds) fail('IDENTITY_ISSUED_AT_INVALID');
  }

  const subject = boundedText(payload.sub, 256);
  if (!subject) fail('IDENTITY_SUBJECT_INVALID');

  return Object.freeze({
    authenticated: true,
    subject,
    issuer: config.issuer,
    audience: config.audience,
    authorizedParty
  });
}

function publicKeyFromJwk(jwk) {
  if (!jwk || typeof jwk !== 'object' || Array.isArray(jwk)) return null;
  if (!boundedText(jwk.kid, 256)) return null;
  if (jwk.kty !== 'RSA' || jwk.alg !== ALGORITHM || jwk.use !== 'sig') return null;
  if (!boundedText(jwk.n, 16 * 1024) || !boundedText(jwk.e, 128)) return null;
  try {
    return crypto.createPublicKey({ key: jwk, format: 'jwk' });
  } catch (_) {
    return null;
  }
}

function createClerkJwtVerifier(options) {
  const config = validateConfiguration(options);
  const fetchImpl = options && options.fetch;
  const now = options && typeof options.now === 'function' ? options.now : Date.now;
  const clockSkewSeconds = Math.max(0, Math.min(120, Number(options && options.clockSkewSeconds) || DEFAULT_CLOCK_SKEW_SECONDS));
  const jwksTtlMs = Math.max(1_000, Math.min(60 * 60 * 1000, Number(options && options.jwksTtlMs) || DEFAULT_JWKS_TTL_MS));
  if (typeof fetchImpl !== 'function') throw identityFailure('IDENTITY_CONFIGURATION_INVALID', 500);

  let keyCache = new Map();
  let cacheExpiresAt = 0;

  async function fetchKeys(force) {
    const current = Number(now());
    if (!force && keyCache.size > 0 && Number.isFinite(current) && current < cacheExpiresAt) return;

    let response;
    try {
      response = await fetchImpl(config.jwksUrl, {
        method: 'GET',
        headers: { accept: 'application/json' },
        redirect: 'error'
      });
    } catch (_) {
      fail('IDENTITY_JWKS_UNAVAILABLE', 503);
    }
    if (!response || response.ok !== true) fail('IDENTITY_JWKS_UNAVAILABLE', 503);

    const contentLengthRaw = response.headers && typeof response.headers.get === 'function'
      ? response.headers.get('content-length')
      : null;
    if (contentLengthRaw) {
      const contentLength = Number(contentLengthRaw);
      if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MAX_JWKS_BYTES) {
        fail('IDENTITY_JWKS_INVALID', 503);
      }
    }

    let text;
    try {
      text = await response.text();
    } catch (_) {
      fail('IDENTITY_JWKS_UNAVAILABLE', 503);
    }
    if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_JWKS_BYTES) {
      fail('IDENTITY_JWKS_INVALID', 503);
    }

    let document;
    try {
      document = JSON.parse(text);
    } catch (_) {
      fail('IDENTITY_JWKS_INVALID', 503);
    }
    if (!document || typeof document !== 'object' || Array.isArray(document) || !Array.isArray(document.keys)) {
      fail('IDENTITY_JWKS_INVALID', 503);
    }
    if (document.keys.length < 1 || document.keys.length > 32) fail('IDENTITY_JWKS_INVALID', 503);

    const next = new Map();
    for (const jwk of document.keys) {
      const key = publicKeyFromJwk(jwk);
      if (!key) continue;
      if (next.has(jwk.kid)) fail('IDENTITY_JWKS_INVALID', 503);
      next.set(jwk.kid, key);
    }
    if (next.size < 1) fail('IDENTITY_JWKS_INVALID', 503);

    keyCache = next;
    cacheExpiresAt = Number.isFinite(current) ? current + jwksTtlMs : 0;
  }

  async function keyFor(kid) {
    await fetchKeys(false);
    let key = keyCache.get(kid);
    if (key) return key;
    await fetchKeys(true);
    key = keyCache.get(kid);
    if (!key) fail('IDENTITY_KEY_NOT_FOUND');
    return key;
  }

  async function verifySessionToken(token) {
    const parsed = parseToken(token);
    const publicKey = await keyFor(parsed.kid);
    let valid = false;
    try {
      valid = crypto.verify(
        'RSA-SHA256',
        Buffer.from(parsed.signingInput, 'utf8'),
        publicKey,
        parsed.signature
      );
    } catch (_) {
      valid = false;
    }
    if (!valid) fail('IDENTITY_SIGNATURE_INVALID');

    const currentMs = Number(now());
    if (!Number.isFinite(currentMs)) fail('IDENTITY_TIME_INVALID', 500);
    return validateClaims(parsed.payload, config, currentMs / 1000, clockSkewSeconds);
  }

  return Object.freeze({ verifySessionToken });
}

let defaultVerifier = null;
let defaultFingerprint = '';

function defaultFetch(url, init) {
  if (typeof globalThis.fetch !== 'function') throw identityFailure('IDENTITY_CONFIGURATION_INVALID', 500);
  return globalThis.fetch(url, init);
}

function verifySessionToken(token) {
  const config = identityConfigFromEnv(process.env);
  const fingerprint = JSON.stringify(config);
  if (!defaultVerifier || fingerprint !== defaultFingerprint) {
    defaultVerifier = createClerkJwtVerifier({
      ...config,
      fetch: defaultFetch,
      now: Date.now
    });
    defaultFingerprint = fingerprint;
  }
  return defaultVerifier.verifySessionToken(token);
}

module.exports = Object.freeze({
  ALGORITHM,
  createClerkJwtVerifier,
  identityConfigFromEnv,
  identityFailure,
  verifySessionToken
});
