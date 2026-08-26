import { createHash } from 'node:crypto';

export const ALLOWED_SIGNAL_TYPES = Object.freeze([
  'METRIC',
  'LOG',
  'TRACE',
  'PROFILE',
  'KERNEL',
  'NETWORK',
  'DATABASE',
  'RUM',
  'BUSINESS',
  'FRAUD',
  'COST',
  'RELEASE',
  'SECURITY',
]);

export const ALLOWED_FACT_CLASSES = Object.freeze([
  'PRODUCTION_FACT',
  'SIMULATION',
  'DERIVED_HYPOTHESIS',
]);

export const ALLOWED_EDGE_TYPES = Object.freeze([
  'CORRELATES_WITH',
  'CAUSED_BY_CANDIDATE',
  'OBSERVED_DURING',
  'EMITTED_BY',
  'USES_RELEASE',
  'AFFECTS',
  'VERIFIES',
  'DERIVED_FROM',
]);

const SIGNAL_TYPES = new Set(ALLOWED_SIGNAL_TYPES);
const FACT_CLASSES = new Set(ALLOWED_FACT_CLASSES);
const EDGE_TYPES = new Set(ALLOWED_EDGE_TYPES);
const MAX_ID_LENGTH = 256;
const MAX_KEY_LENGTH = 128;
const MAX_STRING_LENGTH = 8_192;
const MAX_DEPTH = 16;
const MAX_OBJECT_KEYS = 512;
const MAX_ARRAY_ITEMS = 1_024;

const SECRET_KEY_MARKERS = Object.freeze([
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'cookie',
  'privatekey',
  'apikey',
  'servicerole',
  'sessiontoken',
  'refreshtoken',
]);

const SECRET_VALUE_PATTERNS = Object.freeze([
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/i,
  /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b/,
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
  /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^\s,;]{8,}/i,
]);

export class AionEvidenceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionEvidenceError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionEvidenceError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateBoundedString(value, field, { allowEmpty = false, max = MAX_ID_LENGTH } = {}) {
  if (typeof value !== 'string') {
    fail('AION_EVIDENCE_INVALID', `${field} must be a string`);
  }
  if ((!allowEmpty && value.length === 0) || value.length > max || value.includes('\0')) {
    fail('AION_EVIDENCE_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function normalizeSecretKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function keyLooksSecret(key) {
  const normalized = normalizeSecretKey(key);
  return SECRET_KEY_MARKERS.some((marker) => normalized.includes(marker));
}

function valueLooksSecret(value) {
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function sanitizeValue(value, path = 'value', depth = 0) {
  if (depth > MAX_DEPTH) {
    fail('AION_EVIDENCE_INVALID', `${path} exceeds maximum nesting depth`);
  }

  if (value === null || typeof value === 'boolean') return value;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('AION_EVIDENCE_INVALID', `${path} must be finite`);
    return value;
  }

  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH || value.includes('\0')) {
      fail('AION_EVIDENCE_INVALID', `${path} string is outside allowed bounds`);
    }
    if (valueLooksSecret(value)) {
      fail('AION_SECRET_MATERIAL_REJECTED', `${path} contains secret-like material`);
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) {
      fail('AION_EVIDENCE_INVALID', `${path} exceeds maximum array size`);
    }
    return value.map((item, index) => sanitizeValue(item, `${path}[${index}]`, depth + 1));
  }

  if (!isPlainObject(value)) {
    fail('AION_EVIDENCE_INVALID', `${path} contains an unsupported value type`);
  }

  const entries = Object.entries(value);
  if (entries.length > MAX_OBJECT_KEYS) {
    fail('AION_EVIDENCE_INVALID', `${path} exceeds maximum object size`);
  }

  const output = {};
  for (const [key, nested] of entries) {
    validateBoundedString(key, `${path} key`, { max: MAX_KEY_LENGTH });
    if (keyLooksSecret(key)) {
      fail('AION_SECRET_MATERIAL_REJECTED', `${path}.${key} is a secret-bearing key`);
    }
    output[key] = sanitizeValue(nested, `${path}.${key}`, depth + 1);
  }
  return output;
}

function parseIsoTimestamp(value, field) {
  validateBoundedString(value, field, { max: 64 });
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!isoPattern.test(value)) {
    fail('AION_TIMESTAMP_INVALID', `${field} must be an ISO-8601 timestamp with timezone`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    fail('AION_TIMESTAMP_INVALID', `${field} is not a valid timestamp`);
  }
  return milliseconds;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = canonicalize(value[key]);
    return output;
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function sanitizeStructuredObject(value, field, { required = true } = {}) {
  if (value === undefined && !required) return undefined;
  if (!isPlainObject(value)) fail('AION_EVIDENCE_INVALID', `${field} must be a plain object`);
  return sanitizeValue(value, field);
}

function requireSource(source) {
  const sanitized = sanitizeStructuredObject(source, 'source');
  validateBoundedString(sanitized.system, 'source.system');
  validateBoundedString(sanitized.component, 'source.component');
  return sanitized;
}

function requireSubject(subject) {
  const sanitized = sanitizeStructuredObject(subject, 'subject');
  validateBoundedString(sanitized.type, 'subject.type');
  validateBoundedString(sanitized.id, 'subject.id');
  return sanitized;
}

function ensureEnvelopeShape(node) {
  if (!isPlainObject(node) || node.schema_version !== 'TIGER-AION-EVIDENCE-1') {
    fail('AION_EVIDENCE_INVALID', 'graph node is not a TIGER AION evidence envelope');
  }
  validateBoundedString(node.evidence_id, 'node.evidence_id');
  if (!SIGNAL_TYPES.has(node.signal_type) || !FACT_CLASSES.has(node.fact_class)) {
    fail('AION_EVIDENCE_INVALID', `graph node ${node.evidence_id} has invalid vocabulary`);
  }
  if (typeof node.content_digest !== 'string' || !/^[a-f0-9]{64}$/.test(node.content_digest)) {
    fail('AION_EVIDENCE_INVALID', `graph node ${node.evidence_id} has invalid digest`);
  }
}

export function createEvidenceEnvelope(input) {
  if (!isPlainObject(input)) fail('AION_EVIDENCE_INVALID', 'evidence input must be a plain object');

  const evidenceId = validateBoundedString(input.evidence_id, 'evidence_id');

  if (!SIGNAL_TYPES.has(input.signal_type)) {
    fail('AION_SIGNAL_TYPE_INVALID', `unsupported signal type: ${String(input.signal_type)}`);
  }
  if (!FACT_CLASSES.has(input.fact_class)) {
    fail('AION_FACT_CLASS_INVALID', `unsupported fact class: ${String(input.fact_class)}`);
  }
  if (input.fact_class === 'PRODUCTION_FACT' && input.authoritative_source !== true) {
    fail('AION_EVIDENCE_INVALID', 'PRODUCTION_FACT requires authoritative_source=true');
  }

  const occurredAtMs = parseIsoTimestamp(input.occurred_at, 'occurred_at');
  const observedAtMs = parseIsoTimestamp(input.observed_at, 'observed_at');
  const expiresAtMs = parseIsoTimestamp(input.expires_at, 'expires_at');
  if (observedAtMs < occurredAtMs) {
    fail('AION_TIMESTAMP_INVALID', 'observed_at cannot precede occurred_at');
  }
  if (expiresAtMs < observedAtMs) {
    fail('AION_TIMESTAMP_INVALID', 'expires_at cannot precede observed_at');
  }

  const source = requireSource(input.source);
  const subject = requireSubject(input.subject);
  const correlation = sanitizeStructuredObject(input.correlation ?? {}, 'correlation');
  const attributes = sanitizeStructuredObject(input.attributes ?? {}, 'attributes');
  const sensitivity = validateBoundedString(input.sensitivity, 'sensitivity', { max: 64 });

  const safeEnvelope = {
    schema_version: 'TIGER-AION-EVIDENCE-1',
    evidence_id: evidenceId,
    signal_type: input.signal_type,
    fact_class: input.fact_class,
    occurred_at: input.occurred_at,
    observed_at: input.observed_at,
    source,
    subject,
    correlation,
    sensitivity,
    attributes,
    expires_at: input.expires_at,
  };

  const contentDigest = sha256(canonicalJson(safeEnvelope));
  return Object.freeze({ ...safeEnvelope, content_digest: contentDigest });
}

export function isEvidenceFresh(envelope, nowMs) {
  if (!isPlainObject(envelope) || envelope.schema_version !== 'TIGER-AION-EVIDENCE-1') return false;
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) return false;
  const expiresAtMs = Date.parse(envelope.expires_at);
  const observedAtMs = Date.parse(envelope.observed_at);
  if (!Number.isFinite(expiresAtMs) || !Number.isFinite(observedAtMs)) return false;
  return nowMs >= observedAtMs && nowMs <= expiresAtMs;
}

export function createProofGraph({ nodes, edges }) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    fail('AION_EVIDENCE_INVALID', 'proof graph requires node and edge arrays');
  }
  if (nodes.length > 100_000 || edges.length > 500_000) {
    fail('AION_EVIDENCE_INVALID', 'proof graph exceeds bounded in-memory size');
  }

  const nodeIds = new Set();
  const safeNodes = nodes.map((node) => {
    ensureEnvelopeShape(node);
    if (nodeIds.has(node.evidence_id)) {
      fail('AION_GRAPH_DUPLICATE_ID', `duplicate evidence id: ${node.evidence_id}`);
    }
    nodeIds.add(node.evidence_id);
    return node;
  });

  const edgeIds = new Set();
  const safeEdges = edges.map((edge) => {
    if (!isPlainObject(edge)) fail('AION_EVIDENCE_INVALID', 'graph edge must be a plain object');
    const edgeId = validateBoundedString(edge.edge_id, 'edge.edge_id');
    if (edgeIds.has(edgeId)) fail('AION_GRAPH_DUPLICATE_ID', `duplicate edge id: ${edgeId}`);
    edgeIds.add(edgeId);
    if (!EDGE_TYPES.has(edge.type)) fail('AION_EVIDENCE_INVALID', `unsupported edge type: ${String(edge.type)}`);
    const from = validateBoundedString(edge.from, 'edge.from');
    const to = validateBoundedString(edge.to, 'edge.to');
    if (!nodeIds.has(from) || !nodeIds.has(to)) {
      fail('AION_GRAPH_DANGLING_EDGE', `edge ${edgeId} references a missing node`);
    }
    return Object.freeze({ edge_id: edgeId, type: edge.type, from, to });
  });

  safeNodes.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
  safeEdges.sort((a, b) => a.edge_id.localeCompare(b.edge_id));

  return Object.freeze({
    schema_version: 'TIGER-AION-PROOF-GRAPH-1',
    nodes: Object.freeze([...safeNodes]),
    edges: Object.freeze([...safeEdges]),
  });
}

export function digestProofGraph(graph) {
  if (!isPlainObject(graph) || graph.schema_version !== 'TIGER-AION-PROOF-GRAPH-1') {
    fail('AION_EVIDENCE_INVALID', 'invalid TIGER AION proof graph');
  }
  const normalized = createProofGraph({ nodes: [...graph.nodes], edges: [...graph.edges] });
  return sha256(canonicalJson(normalized));
}
