import { createHash } from 'node:crypto';
import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const REQUIRED_SCENARIOS = Object.freeze([
  'positive-authenticated',
  'missing-body-hash',
  'bad-body-hash',
  'missing-jwt',
  'bad-jwt',
  'expired-token',
  'wrong-subject',
  'wrong-capability',
  'replay',
  'oversized-body',
  'wrong-method',
  'wrong-content-type',
  'hostile-origin',
  'direct-function-url-bypass',
]);

const EXACT_FIXTURE_KEYS = Object.freeze([
  'allowedOrigin',
  'body',
  'expiredJwt',
  'validJwt',
  'wrongCapabilityJwt',
  'wrongSubjectJwt',
]);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function normalizeEndpoint(value, label) {
  let url;
  try {
    url = new URL(String(value || ''));
  } catch {
    fail(`PROBE_${label}_URL_INVALID`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    fail(`PROBE_${label}_URL_INVALID`);
  }
  return url.toString();
}

function validateFixture(fixture) {
  if (!exactObject(fixture, EXACT_FIXTURE_KEYS)) fail('PROBE_FIXTURE_INVALID');
  if (typeof fixture.body !== 'string' || Buffer.byteLength(fixture.body, 'utf8') < 2 || Buffer.byteLength(fixture.body, 'utf8') > 4096) {
    fail('PROBE_FIXTURE_INVALID');
  }
  for (const key of ['validJwt', 'expiredJwt', 'wrongSubjectJwt', 'wrongCapabilityJwt']) {
    if (typeof fixture[key] !== 'string' || fixture[key].length < 8 || /\s/.test(fixture[key])) fail('PROBE_FIXTURE_INVALID');
  }
  const origin = new URL(String(fixture.allowedOrigin || ''));
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    fail('PROBE_FIXTURE_INVALID');
  }
  return Object.freeze({ ...fixture });
}

function sha256(body) {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

function headersFor({ jwt, body, origin, contentType = 'application/json', hash = sha256(body), includeJwt = true, includeHash = true }) {
  const headers = {
    'content-type': contentType,
    origin,
  };
  if (includeJwt) headers['x-tiger-session'] = jwt;
  if (includeHash) headers['x-amz-content-sha256'] = hash;
  return headers;
}

async function boundedFetch({ fetchImpl, url, options, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      ...options,
      redirect: 'error',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function runScenario({ name, url, options, accepted, fetchImpl, now, timeoutMs }) {
  const started = now();
  let status = 0;
  try {
    const response = await boundedFetch({ fetchImpl, url, options, timeoutMs });
    status = Number(response && response.status) || 0;
  } catch {
    status = 0;
  }
  const durationMs = Math.max(0, Math.round(now() - started));
  return Object.freeze({
    name,
    status,
    durationMs,
    ok: accepted.includes(status),
  });
}

export async function runMediaFinalizerRuntimeProbes({
  cloudFrontUrl,
  functionUrl,
  fixture,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  timeoutMs = 5000,
} = {}) {
  if (typeof fetchImpl !== 'function' || typeof now !== 'function') fail('PROBE_PORT_INVALID');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 15000) fail('PROBE_TIMEOUT_INVALID');

  const edge = normalizeEndpoint(cloudFrontUrl, 'CLOUDFRONT');
  const direct = normalizeEndpoint(functionUrl, 'FUNCTION');
  if (new URL(edge).host === new URL(direct).host) fail('PROBE_ENDPOINT_AUTHORITY_COLLISION');
  const safeFixture = validateFixture(fixture);
  const body = safeFixture.body;
  const validHeaders = headersFor({
    jwt: safeFixture.validJwt,
    body,
    origin: safeFixture.allowedOrigin,
  });
  const oversizedBody = JSON.stringify({ pad: 'x'.repeat(5000) });

  const scenarios = [
    {
      name: 'positive-authenticated', url: edge, accepted: [200, 201, 202, 204],
      options: { method: 'POST', headers: validHeaders, body },
    },
    {
      name: 'missing-body-hash', url: edge, accepted: [400],
      options: { method: 'POST', headers: headersFor({ jwt: safeFixture.validJwt, body, origin: safeFixture.allowedOrigin, includeHash: false }), body },
    },
    {
      name: 'bad-body-hash', url: edge, accepted: [400],
      options: { method: 'POST', headers: headersFor({ jwt: safeFixture.validJwt, body, origin: safeFixture.allowedOrigin, hash: '0'.repeat(64) }), body },
    },
    {
      name: 'missing-jwt', url: edge, accepted: [401],
      options: { method: 'POST', headers: headersFor({ jwt: '', body, origin: safeFixture.allowedOrigin, includeJwt: false }), body },
    },
    {
      name: 'bad-jwt', url: edge, accepted: [401],
      options: { method: 'POST', headers: headersFor({ jwt: 'bad.jwt.token', body, origin: safeFixture.allowedOrigin }), body },
    },
    {
      name: 'expired-token', url: edge, accepted: [401],
      options: { method: 'POST', headers: headersFor({ jwt: safeFixture.expiredJwt, body, origin: safeFixture.allowedOrigin }), body },
    },
    {
      name: 'wrong-subject', url: edge, accepted: [403],
      options: { method: 'POST', headers: headersFor({ jwt: safeFixture.wrongSubjectJwt, body, origin: safeFixture.allowedOrigin }), body },
    },
    {
      name: 'wrong-capability', url: edge, accepted: [403],
      options: { method: 'POST', headers: headersFor({ jwt: safeFixture.wrongCapabilityJwt, body, origin: safeFixture.allowedOrigin }), body },
    },
    {
      name: 'replay', url: edge, accepted: [400, 409],
      options: { method: 'POST', headers: validHeaders, body },
    },
    {
      name: 'oversized-body', url: edge, accepted: [413],
      options: { method: 'POST', headers: headersFor({ jwt: safeFixture.validJwt, body: oversizedBody, origin: safeFixture.allowedOrigin }), body: oversizedBody },
    },
    {
      name: 'wrong-method', url: edge, accepted: [403, 405],
      options: { method: 'GET', headers: { origin: safeFixture.allowedOrigin } },
    },
    {
      name: 'wrong-content-type', url: edge, accepted: [403, 415],
      options: { method: 'POST', headers: headersFor({ jwt: safeFixture.validJwt, body, origin: safeFixture.allowedOrigin, contentType: 'text/plain' }), body },
    },
    {
      name: 'hostile-origin', url: edge, accepted: [403],
      options: { method: 'POST', headers: headersFor({ jwt: safeFixture.validJwt, body, origin: 'https://hostile.invalid' }), body },
    },
    {
      name: 'direct-function-url-bypass', url: direct, accepted: [401, 403],
      options: { method: 'POST', headers: validHeaders, body },
    },
  ];

  const results = [];
  for (const scenario of scenarios) {
    results.push(await runScenario({ ...scenario, fetchImpl, now, timeoutMs }));
  }
  return Object.freeze({
    ok: results.length === REQUIRED_SCENARIOS.length && results.every((result, index) => result.name === REQUIRED_SCENARIOS[index] && result.ok),
    results: Object.freeze(results),
  });
}

function parseArgs(argv) {
  const out = Object.create(null);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key || !key.startsWith('--') || value == null) fail('PROBE_ARGUMENTS_INVALID');
    out[key.slice(2)] = value;
  }
  const expected = ['cloudfront-url', 'fixture-file', 'function-url', 'output'];
  if (!exactObject(out, expected)) fail('PROBE_ARGUMENTS_INVALID');
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixture = JSON.parse(fs.readFileSync(args['fixture-file'], 'utf8'));
  const evidence = await runMediaFinalizerRuntimeProbes({
    cloudFrontUrl: args['cloudfront-url'],
    functionUrl: args['function-url'],
    fixture,
  });
  fs.mkdirSync(new URL('.', pathToFileURL(args.output)).pathname, { recursive: true });
  fs.writeFileSync(args.output, `${JSON.stringify(evidence)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
  if (!evidence.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${String(error && error.code || 'PROBE_FAILED')}\n`);
    process.exitCode = 1;
  });
}
