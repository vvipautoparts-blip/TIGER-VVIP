const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const ALLOWED_DATABASE_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const REQUIRED_AUTHORITY_MARKERS = [
  '**Effective authority:** Issue #312',
  '**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**',
  '`project-control/data/phases.json`',
  '`project-control/data/tasks.json`',
  '`project-control/data/task_dependencies.json`',
  'NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT',
];

const fail = code => {
  throw new Error(code);
};

const normalizeHostname = value => String(value ?? '').trim().toLowerCase();

const parseExplicitHosts = allowedHosts => {
  const hosts = String(allowedHosts ?? '')
    .split(',')
    .map(normalizeHostname)
    .filter(Boolean);

  if (hosts.some(host => host.includes('*'))) {
    fail('PROJECT_CONTROL_IMPORT_HOST_ALLOWLIST_WILDCARD_FORBIDDEN');
  }

  return new Set(hosts);
};

const assertAuthorityContract = registryText => {
  const registry = String(registryText ?? '');
  const missingMarker = REQUIRED_AUTHORITY_MARKERS.some(marker => !registry.includes(marker));
  if (missingMarker) {
    fail('PROJECT_CONTROL_IMPORT_AUTHORITY_CONTRACT_MISSING');
  }

  for (const artifact of [
    'project-control/data/phases.json',
    'project-control/data/tasks.json',
    'project-control/data/task_dependencies.json',
  ]) {
    const row = registry.split('\n').find(line => line.includes(`\`${artifact}\``)) ?? '';
    if (!row.includes('NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT')) {
      fail('PROJECT_CONTROL_IMPORT_AUTHORITY_CONTRACT_MISSING');
    }
  }
};

export function validateProjectControlImport({
  target,
  databaseUrl,
  allowedHosts = '',
  registryText,
} = {}) {
  const normalizedTarget = String(target ?? '').trim().toLowerCase();
  if (normalizedTarget !== 'development') {
    fail('PROJECT_CONTROL_IMPORT_TARGET_DENIED');
  }

  let parsed;
  try {
    parsed = new URL(String(databaseUrl ?? ''));
  } catch {
    fail('PROJECT_CONTROL_IMPORT_DATABASE_URL_INVALID');
  }

  if (!ALLOWED_DATABASE_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
    fail('PROJECT_CONTROL_IMPORT_DATABASE_URL_INVALID');
  }

  const hostname = normalizeHostname(parsed.hostname);
  const explicitHosts = parseExplicitHosts(allowedHosts);
  if (!LOCAL_DATABASE_HOSTS.has(hostname) && !explicitHosts.has(hostname)) {
    fail('PROJECT_CONTROL_IMPORT_HOST_DENIED');
  }

  assertAuthorityContract(registryText);

  return Object.freeze({
    target: normalizedTarget,
    hostname,
  });
}
