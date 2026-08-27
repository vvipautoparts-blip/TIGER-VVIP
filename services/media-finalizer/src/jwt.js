'use strict';

const { createPublicKey, createVerify } = require('node:crypto');

const CLERK_SUBJECT = /^user_[A-Za-z0-9_-]{6,123}$/;
const MAX_TOKEN_BYTES = 16 * 1024;

function jwtError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function requireString(value, code) {
  const text = String(value || '').trim();
  if (!text) throw jwtError(code);
  return text;
}

function decodeJson(segment, code) {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch (_) {
    throw jwtError(code);
  }
}

function numericClaim(payload, name) {
  const value = payload && payload[name];
  if (!Number.isInteger(value) || value < 0) throw jwtError(`JWT_${name.toUpperCase()}_INVALID`);
  return value;
}

function audienceIncludes(claim, expected) {
  if (typeof claim === 'string') return claim === expected;
  return Array.isArray(claim) && claim.length > 0 && claim.every((item) => typeof item === 'string') && claim.includes(expected);
}

function createDefaultJwksLoader(jwksUrl, fetchImpl) {
  const endpoint = new URL(requireString(jwksUrl, 'JWT_JWKS_URL_REQUIRED'));
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.hash) {
    throw jwtError('JWT_JWKS_URL_INVALID');
  }
  const request = fetchImpl || globalThis.fetch;
  if (typeof request !== 'function') throw jwtError('JWT_JWKS_FETCH_UNAVAILABLE');
  return async function loadJwks() {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 3000) : null;
    try {
      const response = await request(endpoint.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
        signal: controller && controller.signal
      });
      if (!response || !response.ok) throw jwtError('JWT_JWKS_FETCH_FAILED');
      return await response.json();
    } catch (error) {
      if (error && error.code) throw error;
      throw jwtError('JWT_JWKS_FETCH_FAILED');
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}

function createClerkJwtVerifier(options = {}) {
  const issuer = requireString(options.issuer, 'JWT_ISSUER_REQUIRED');
  const audience = requireString(options.audience, 'JWT_AUDIENCE_REQUIRED');
  const authorizedParties = new Set(Array.from(options.authorizedParties || []).map((value) => String(value || '').trim()).filter(Boolean));
  if (authorizedParties.size === 0) throw jwtError('JWT_AUTHORIZED_PARTIES_REQUIRED');
  const clockSkewSeconds = Math.max(0, Math.min(60, Number(options.clockSkewSeconds) || 30));
  const maxLifetimeSeconds = Math.max(30, Math.min(900, Number(options.maxLifetimeSeconds) || 300));
  const jwksTtlMs = Math.max(30_000, Math.min(3_600_000, Number(options.jwksTtlMs) || 300_000));
  const nowSeconds = typeof options.nowSeconds === 'function' ? options.nowSeconds : () => Math.floor(Date.now() / 1000);
  const nowMs = typeof options.nowMs === 'function' ? options.nowMs : Date.now;
  const loadJwks = typeof options.loadJwks === 'function'
    ? options.loadJwks
    : createDefaultJwksLoader(options.jwksUrl || `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`, options.fetch);

  let keyCache = null;
  let keyCacheExpiresAt = 0;

  async function refreshKeys(force) {
    const current = Number(nowMs());
    if (!force && keyCache && Number.isFinite(current) && current < keyCacheExpiresAt) return keyCache;
    const document = await loadJwks();
    if (!document || !Array.isArray(document.keys) || document.keys.length === 0) throw jwtError('JWT_JWKS_INVALID');
    const next = new Map();
    for (const jwk of document.keys) {
      if (!jwk || typeof jwk !== 'object' || typeof jwk.kid !== 'string' || !jwk.kid) continue;
      if (jwk.kty !== 'RSA' || (jwk.use && jwk.use !== 'sig') || (jwk.alg && jwk.alg !== 'RS256')) continue;
      try {
        next.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
      } catch (_) {
        // Invalid keys are ignored; an empty usable set fails closed below.
      }
    }
    if (next.size === 0) throw jwtError('JWT_JWKS_NO_USABLE_KEYS');
    keyCache = next;
    keyCacheExpiresAt = current + jwksTtlMs;
    return next;
  }

  async function keyFor(kid) {
    let keys = await refreshKeys(false);
    if (keys.has(kid)) return keys.get(kid);
    keys = await refreshKeys(true);
    const key = keys.get(kid);
    if (!key) throw jwtError('JWT_SIGNING_KEY_NOT_FOUND');
    return key;
  }

  async function verify(token) {
    const raw = requireString(token, 'JWT_REQUIRED');
    if (Buffer.byteLength(raw, 'utf8') > MAX_TOKEN_BYTES) throw jwtError('JWT_TOO_LARGE');
    const parts = raw.split('.');
    if (parts.length !== 3 || parts.some((part) => !part)) throw jwtError('JWT_COMPACT_INVALID');
    const header = decodeJson(parts[0], 'JWT_HEADER_INVALID');
    const payload = decodeJson(parts[1], 'JWT_PAYLOAD_INVALID');
    if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) throw jwtError('JWT_ALGORITHM_INVALID');
    if (header.typ != null && String(header.typ).toUpperCase() !== 'JWT') throw jwtError('JWT_TYPE_INVALID');

    const key = await keyFor(header.kid);
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    let signature;
    try { signature = Buffer.from(parts[2], 'base64url'); } catch (_) { throw jwtError('JWT_SIGNATURE_INVALID'); }
    if (signature.length === 0 || !verifier.verify(key, signature)) throw jwtError('JWT_SIGNATURE_INVALID');

    if (payload.iss !== issuer) throw jwtError('JWT_ISSUER_INVALID');
    if (!audienceIncludes(payload.aud, audience)) throw jwtError('JWT_AUDIENCE_INVALID');
    if (typeof payload.azp !== 'string' || !authorizedParties.has(payload.azp)) throw jwtError('JWT_AUTHORIZED_PARTY_INVALID');
    if (Object.prototype.hasOwnProperty.call(payload, 'act')) throw jwtError('JWT_IMPERSONATION_FORBIDDEN');
    if (typeof payload.sub !== 'string' || !CLERK_SUBJECT.test(payload.sub)) throw jwtError('JWT_SUBJECT_INVALID');

    const issuedAt = numericClaim(payload, 'iat');
    const notBefore = numericClaim(payload, 'nbf');
    const expiresAt = numericClaim(payload, 'exp');
    const now = Number(nowSeconds());
    if (!Number.isInteger(now)) throw jwtError('JWT_CLOCK_INVALID');
    if (expiresAt <= issuedAt || expiresAt - issuedAt > maxLifetimeSeconds) throw jwtError('JWT_LIFETIME_INVALID');
    if (issuedAt > now + clockSkewSeconds) throw jwtError('JWT_ISSUED_AT_INVALID');
    if (notBefore > now + clockSkewSeconds) throw jwtError('JWT_NOT_YET_VALID');
    if (expiresAt < now - clockSkewSeconds) throw jwtError('JWT_EXPIRED');

    return Object.freeze({
      subject: payload.sub,
      sessionId: typeof payload.sid === 'string' ? payload.sid : null,
      issuer,
      audience,
      authorizedParty: payload.azp,
      issuedAt,
      notBefore,
      expiresAt
    });
  }

  return Object.freeze({ verify });
}

module.exports = Object.freeze({ createClerkJwtVerifier, jwtError });
