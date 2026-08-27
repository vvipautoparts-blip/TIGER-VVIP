'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const IDENTITY_MODULE = path.join(__dirname, '..', 'services', 'media-finalizer', 'src', 'identity.js');
const HANDLER = path.join(__dirname, '..', 'services', 'media-finalizer', 'src', 'handler.js');
const ISSUER = 'https://clerk.example.test';
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;
const AUDIENCE = 'tiger-media-finalizer';
const PARTY = 'https://vvip.example.test';
const NOW_SECONDS = 1_787_808_000;

function identityApi() {
  assert.equal(fs.existsSync(IDENTITY_MODULE), true, 'SEALED_MEDIA_IDENTITY_MODULE_MISSING');
  return require(IDENTITY_MODULE);
}

function keyPair(kid) {
  const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = pair.publicKey.export({ format: 'jwk' });
  return {
    kid,
    privateKey: pair.privateKey,
    jwk: { ...jwk, kid, alg: 'RS256', use: 'sig' }
  };
}

function encode(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function claims(overrides = {}) {
  return {
    iss: ISSUER,
    aud: AUDIENCE,
    azp: PARTY,
    sub: 'user_owner',
    iat: NOW_SECONDS - 10,
    nbf: NOW_SECONDS - 10,
    exp: NOW_SECONDS + 300,
    ...overrides
  };
}

function signToken(key, claimOverrides = {}, headerOverrides = {}) {
  const header = { alg: 'RS256', kid: key.kid, typ: 'JWT', ...headerOverrides };
  const signingInput = `${encode(header)}.${encode(claims(claimOverrides))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput, 'utf8'), key.privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
}

function jwksResponse(keys, status = 200) {
  const text = JSON.stringify({ keys: keys.map((key) => key.jwk || key) });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return String(name).toLowerCase() === 'content-length'
          ? String(Buffer.byteLength(text, 'utf8'))
          : null;
      }
    },
    text: async () => text
  };
}

function verifierOptions(fetchImpl, overrides = {}) {
  return {
    issuer: ISSUER,
    audience: AUDIENCE,
    authorizedParties: [PARTY],
    jwksUrl: JWKS_URL,
    fetch: fetchImpl,
    now: () => NOW_SECONDS * 1000,
    ...overrides
  };
}

async function rejection(promise, code, statusCode = 401) {
  await assert.rejects(promise, (error) => {
    assert.equal(error && error.code, code);
    assert.equal(error && error.statusCode, statusCode);
    assert.equal(String(error && error.message), code);
    return true;
  });
}

test('Clerk verifier accepts a valid RS256 token only after JWKS signature and claim checks', async () => {
  const { createClerkJwtVerifier } = identityApi();
  const key = keyPair('kid-valid');
  let fetchCalls = 0;
  const verifier = createClerkJwtVerifier(verifierOptions(async (url) => {
    fetchCalls += 1;
    assert.equal(url, JWKS_URL);
    return jwksResponse([key]);
  }));

  const result = await verifier.verifySessionToken(signToken(key));
  assert.deepEqual(result, {
    authenticated: true,
    subject: 'user_owner',
    issuer: ISSUER,
    audience: AUDIENCE,
    authorizedParty: PARTY
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(fetchCalls, 1);
});

test('Clerk verifier rejects algorithm confusion before any JWKS request', async () => {
  const { createClerkJwtVerifier } = identityApi();
  const key = keyPair('kid-alg');
  let fetchCalls = 0;
  const verifier = createClerkJwtVerifier(verifierOptions(async () => {
    fetchCalls += 1;
    return jwksResponse([key]);
  }));

  for (const alg of ['none', 'HS256', 'RS512']) {
    const token = signToken(key, {}, { alg });
    await rejection(verifier.verifySessionToken(token), 'IDENTITY_ALGORITHM_DENIED');
  }
  assert.equal(fetchCalls, 0);
});

test('Clerk verifier fails closed on issuer audience authorized party time and subject claims', async () => {
  const { createClerkJwtVerifier } = identityApi();
  const key = keyPair('kid-claims');
  const verifier = createClerkJwtVerifier(verifierOptions(async () => jwksResponse([key])));

  const cases = [
    [{ iss: 'https://attacker.example.test' }, 'IDENTITY_ISSUER_INVALID'],
    [{ aud: 'other-service' }, 'IDENTITY_AUDIENCE_INVALID'],
    [{ aud: ['other-service', 'another'] }, 'IDENTITY_AUDIENCE_INVALID'],
    [{ azp: 'https://attacker.example.test' }, 'IDENTITY_AUTHORIZED_PARTY_INVALID'],
    [{ exp: NOW_SECONDS - 120 }, 'IDENTITY_EXPIRED'],
    [{ nbf: NOW_SECONDS + 120 }, 'IDENTITY_NOT_YET_VALID'],
    [{ sub: '' }, 'IDENTITY_SUBJECT_INVALID']
  ];

  for (const [claimOverrides, code] of cases) {
    await rejection(verifier.verifySessionToken(signToken(key, claimOverrides)), code);
  }
});

test('unknown kid gets one bounded JWKS refresh and can recover after key rotation', async () => {
  const { createClerkJwtVerifier } = identityApi();
  const oldKey = keyPair('kid-old');
  const newKey = keyPair('kid-new');
  let fetchCalls = 0;
  const verifier = createClerkJwtVerifier(verifierOptions(async () => {
    fetchCalls += 1;
    return fetchCalls === 1 ? jwksResponse([oldKey]) : jwksResponse([oldKey, newKey]);
  }));

  const result = await verifier.verifySessionToken(signToken(newKey));
  assert.equal(result.subject, 'user_owner');
  assert.equal(fetchCalls, 2, 'unknown kid may force exactly one refresh');
});

test('unknown kid and forged signature return stable identity errors without raw token detail', async () => {
  const { createClerkJwtVerifier } = identityApi();
  const trusted = keyPair('kid-trusted');
  const unknown = keyPair('kid-unknown');
  let unknownCalls = 0;
  const unknownVerifier = createClerkJwtVerifier(verifierOptions(async () => {
    unknownCalls += 1;
    return jwksResponse([trusted]);
  }));
  await rejection(unknownVerifier.verifySessionToken(signToken(unknown)), 'IDENTITY_KEY_NOT_FOUND');
  assert.equal(unknownCalls, 2);

  const attacker = keyPair('kid-attacker');
  const forgedHeader = { alg: 'RS256', kid: trusted.kid, typ: 'JWT' };
  const signingInput = `${encode(forgedHeader)}.${encode(claims())}`;
  const forged = `${signingInput}.${crypto.sign('RSA-SHA256', Buffer.from(signingInput), attacker.privateKey).toString('base64url')}`;
  const forgedVerifier = createClerkJwtVerifier(verifierOptions(async () => jwksResponse([trusted])));
  await rejection(forgedVerifier.verifySessionToken(forged), 'IDENTITY_SIGNATURE_INVALID');
});

test('identity configuration is explicit, HTTPS-only and requires issuer audience JWKS and authorized parties', () => {
  const { identityConfigFromEnv } = identityApi();
  const config = identityConfigFromEnv({
    TIGER_CLERK_ISSUER: ISSUER,
    TIGER_CLERK_AUDIENCE: AUDIENCE,
    TIGER_CLERK_JWKS_URL: JWKS_URL,
    TIGER_CLERK_AUTHORIZED_PARTIES: `${PARTY},https://vvip-alt.example.test`
  });
  assert.deepEqual(config, {
    issuer: ISSUER,
    audience: AUDIENCE,
    jwksUrl: JWKS_URL,
    authorizedParties: [PARTY, 'https://vvip-alt.example.test']
  });
  assert.equal(Object.isFrozen(config), true);

  for (const bad of [
    {},
    { TIGER_CLERK_ISSUER: 'http://clerk.example.test', TIGER_CLERK_AUDIENCE: AUDIENCE, TIGER_CLERK_JWKS_URL: JWKS_URL, TIGER_CLERK_AUTHORIZED_PARTIES: PARTY },
    { TIGER_CLERK_ISSUER: ISSUER, TIGER_CLERK_AUDIENCE: AUDIENCE, TIGER_CLERK_JWKS_URL: 'http://clerk.example.test/jwks', TIGER_CLERK_AUTHORIZED_PARTIES: PARTY }
  ]) {
    assert.throws(() => identityConfigFromEnv(bad), /IDENTITY_CONFIGURATION_INVALID/);
  }
});

test('handler verifies the X-Tiger-Session token before Secrets Manager and Supabase privileged access', () => {
  const source = fs.readFileSync(HANDLER, 'utf8');
  assert.match(source, /require\(['"]\.\/identity\.js['"]\)/);
  assert.match(source, /require\(['"]\.\/secret-provider\.js['"]\)/);
  assert.match(source, /require\(['"]\.\/supabase-client\.js['"]\)/);
  assert.match(source, /ports\.verifySessionToken[\s\S]*verifySessionToken/);
  assert.match(source, /ports\.getSecretProvider[\s\S]*getDefaultSecretProvider/);
  assert.match(source, /ports\.createSupabaseClient[\s\S]*createSupabaseClient/);

  const verification = source.indexOf('const identity = await verifyIdentity(request.sessionToken)');
  const secretLoad = source.indexOf('getSecretProvider().get()', verification);
  const clientCreation = source.indexOf('buildSupabase({', secretLoad);
  assert.ok(verification >= 0, 'IDENTITY_VERIFICATION_CALL_MISSING');
  assert.ok(secretLoad > verification, 'IDENTITY_MUST_PRECEDE_SECRET_ACCESS');
  assert.ok(clientCreation > secretLoad, 'IDENTITY_AND_SECRET_MUST_PRECEDE_SUPABASE_PRIVILEGED_ACCESS');
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|env\(['"]SUPABASE_URL['"]\)/i);
});

test('identity verifier has no token logging or permissive algorithm fallback', () => {
  const source = fs.readFileSync(IDENTITY_MODULE, 'utf8');
  assert.doesNotMatch(source, /console\.|logger\./i);
  assert.doesNotMatch(source, /JSON\.stringify\s*\(\s*[^)\r\n]*\btoken\b[^)\r\n]*\)/i);
  assert.doesNotMatch(source, /IDENTITY_[^\r\n]*\+\s*token\b/i);
  assert.match(source, /RS256/);
  assert.doesNotMatch(source, /HS256|none/i);
});
