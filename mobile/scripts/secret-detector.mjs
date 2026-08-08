const HIGH_CONFIDENCE_PATTERNS = Object.freeze([
  Object.freeze({ code: 'CLERK_SECRET_KEY', regex: /\bsk_(?:live|test)_[A-Za-z0-9_-]{8,}\b/g }),
  Object.freeze({ code: 'SUPABASE_SECRET_KEY', regex: /\bsb_secret_[A-Za-z0-9._-]{8,}\b/g }),
  Object.freeze({ code: 'PRIVATE_KEY_PEM', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g }),
]);

const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{8,}\b/g;

function decodeBase64UrlJson(segment) {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export function detectServerSecrets(text) {
  const source = String(text || '');
  const findings = [];

  for (const { code, regex } of HIGH_CONFIDENCE_PATTERNS) {
    regex.lastIndex = 0;
    const match = regex.exec(source);
    if (match) findings.push(Object.freeze({ code, offset: match.index }));
  }

  JWT_PATTERN.lastIndex = 0;
  for (const match of source.matchAll(JWT_PATTERN)) {
    const segments = match[0].split('.');
    const payload = decodeBase64UrlJson(segments[1]);
    if (payload && payload.role === 'service_role') {
      findings.push(Object.freeze({ code: 'SUPABASE_SERVICE_ROLE_JWT', offset: match.index }));
      break;
    }
  }

  return Object.freeze(findings);
}

export function containsServerSecret(text) {
  return detectServerSecrets(text).length > 0;
}
