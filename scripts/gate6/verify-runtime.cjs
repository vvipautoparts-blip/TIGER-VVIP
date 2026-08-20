'use strict';

const fs = require('node:fs');

const SHA40 = /^[0-9a-f]{40}$/;
const SUPABASE_ORIGIN = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/;
const PROD_REF = 'zelcngyyvbomuzokvuxo';
const PRIVILEGED = /(?:sb_secret_|service[_-]?role|private[_-]?key|admin[_-]?key|database[_-]?password)/i;

function httpsOrigin(raw, label) {
  let url;
  try {
    url = new URL(String(raw || ''));
  } catch {
    throw new Error(`${label} must be a valid HTTPS URL`);
  }
  if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS`);
  return url.origin;
}

async function responseJson(response, label) {
  if (!response || response.ok !== true) {
    throw new Error(`${label} failed with status ${response?.status ?? 'unknown'}`);
  }
  return response.json();
}

async function verifyGate6Runtime({
  sourceSha,
  stagingUrl,
  supabaseUrl,
  supabaseProjectRef,
  supabasePublishableKey,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!SHA40.test(String(sourceSha || ''))) {
    throw new Error('runtime source SHA must be exact lowercase 40-character SHA');
  }
  if (typeof fetchImpl !== 'function') throw new Error('runtime fetch implementation is required');

  const frontendOrigin = httpsOrigin(stagingUrl, 'Staging URL');
  const backendOrigin = httpsOrigin(supabaseUrl, 'Supabase URL');
  const match = SUPABASE_ORIGIN.exec(backendOrigin);
  if (!match || match[1] !== supabaseProjectRef) throw new Error('Supabase URL/project ref mismatch');
  if (supabaseProjectRef === PROD_REF || backendOrigin.includes(PROD_REF)) {
    throw new Error('Production Supabase project is forbidden');
  }

  const publicKey = String(supabasePublishableKey || '');
  if (!publicKey || PRIVILEGED.test(publicKey)) {
    throw new Error('Supabase publishable key is invalid or privileged');
  }

  const manifestResponse = await fetchImpl(`${frontendOrigin}/gate6-staging-manifest.json`, {
    headers: { accept: 'application/json' },
  });
  const manifest = await responseJson(manifestResponse, 'staging manifest');
  if (manifest.environment !== 'staging') throw new Error('staging environment marker mismatch');
  if (manifest.source_sha !== sourceSha) throw new Error('deployed source SHA mismatch');
  if (
    manifest?.backend?.provider !== 'supabase'
    || manifest.backend.project_ref !== supabaseProjectRef
    || manifest.backend.url_origin !== backendOrigin
  ) {
    throw new Error('deployed backend binding mismatch');
  }
  if (manifest.data_mode !== 'SYNTHETIC_SANITIZED') {
    throw new Error('deployed data mode is not synthetic sanitized');
  }
  if (!['disabled', 'sandbox'].includes(manifest.payment_mode)) {
    throw new Error('deployed payment mode is not safe');
  }

  const healthResponse = await fetchImpl(`${backendOrigin}/auth/v1/settings`, {
    headers: { apikey: publicKey, accept: 'application/json' },
  });
  await responseJson(healthResponse, 'backend health');

  return {
    schema_version: 1,
    status: 'PASS',
    source_sha: sourceSha,
    frontend: { provider: 'cloudflare-pages', url: frontendOrigin, https: true },
    backend: {
      provider: 'supabase',
      project_ref: supabaseProjectRef,
      url_origin: backendOrigin,
      health: 'PASS',
    },
    data_mode: 'SYNTHETIC_SANITIZED',
    payment_mode: manifest.payment_mode,
  };
}

async function main(argv = process.argv.slice(2)) {
  const arg = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  try {
    const evidence = await verifyGate6Runtime({
      sourceSha: arg('--source-sha'),
      stagingUrl: arg('--staging-url'),
      supabaseUrl: arg('--supabase-url'),
      supabaseProjectRef: arg('--supabase-project-ref'),
      supabasePublishableKey: arg('--supabase-publishable-key'),
    });
    const output = arg('--output');
    const text = `${JSON.stringify(evidence, null, 2)}\n`;
    if (output) fs.writeFileSync(output, text, 'utf8');
    else process.stdout.write(text);
    return 0;
  } catch (error) {
    process.stderr.write(`TIGER_GATE6_RUNTIME=BLOCKED reason=${error.message}\n`);
    return 1;
  }
}

module.exports = { verifyGate6Runtime, main };
if (require.main === module) {
  main().then((code) => { process.exitCode = code; });
}
