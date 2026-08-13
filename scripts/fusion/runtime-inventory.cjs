'use strict';

const path = require('node:path').posix;

const CLASSES = Object.freeze([
  'ACTIVE',
  'BRIDGE',
  'TEST',
  'HISTORICAL',
  'UNREFERENCED',
  'REVIEW'
]);

function normalizeLocalReference(rawValue, sourcePath) {
  if (typeof rawValue !== 'string') return null;
  const raw = rawValue.trim();
  if (!raw || raw.startsWith('#') || raw.startsWith('//')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(raw)) return null;

  const clean = raw.split('#', 1)[0].split('?', 1)[0].trim();
  if (!clean) return null;

  const normalized = clean.startsWith('/')
    ? path.normalize(clean.slice(1))
    : path.normalize(path.join(path.dirname(sourcePath || 'index.html'), clean));

  if (!normalized || normalized === '.' || normalized === '..') return null;
  if (normalized.startsWith('../') || path.isAbsolute(normalized)) return null;
  return normalized;
}

function collectStaticReferences(text, sourcePath) {
  const refs = new Set();
  const source = typeof text === 'string' ? text : '';
  const attributes = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = attributes.exec(source)) !== null) {
    const normalized = normalizeLocalReference(match[1], sourcePath);
    if (normalized) refs.add(normalized);
  }
  return [...refs].sort();
}

function isProtectedPath(file, registry = {}) {
  if (typeof file !== 'string' || !file) return false;
  const normalized = path.normalize(file).replace(/^\.\//, '');
  const prefixes = Array.isArray(registry.protectedPrefixes) ? registry.protectedPrefixes : [];
  return prefixes.some((value) => {
    const prefix = path.normalize(String(value)).replace(/^\.\//, '');
    if (!prefix) return false;
    const base = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    return normalized === base || normalized.startsWith(prefix.endsWith('/') ? prefix : prefix + '/');
  });
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((output, key) => {
    output[key] = stableValue(value[key]);
    return output;
  }, {});
}

function canonicalizeInventory(value) {
  return JSON.stringify(stableValue(value), null, 2) + '\n';
}

function inventoryRepository(options = {}) {
  const files = options.files && typeof options.files === 'object' ? options.files : {};
  const registry = options.registry && typeof options.registry === 'object' ? options.registry : {};
  const sourceSha = typeof options.sourceSha === 'string' ? options.sourceSha : '';
  const filePaths = Object.keys(files).filter((file) => !isProtectedPath(file, registry)).sort();
  const inbound = new Map(filePaths.map((file) => [file, new Set()]));
  const active = new Set();
  const queue = [];

  for (const entrypoint of Array.isArray(registry.entrypoints) ? registry.entrypoints : []) {
    if (!Object.prototype.hasOwnProperty.call(files, entrypoint) || isProtectedPath(entrypoint, registry)) continue;
    if (!active.has(entrypoint)) {
      active.add(entrypoint);
      queue.push(entrypoint);
    }
  }

  while (queue.length) {
    const sourcePath = queue.shift();
    for (const target of collectStaticReferences(files[sourcePath], sourcePath)) {
      if (!inbound.has(target)) continue;
      inbound.get(target).add(sourcePath);
      if (!active.has(target)) {
        active.add(target);
        queue.push(target);
      }
    }
  }

  const explicit = registry.explicit && typeof registry.explicit === 'object'
    ? registry.explicit
    : {};

  const entries = filePaths.map((file) => {
    const rule = explicit[file] && typeof explicit[file] === 'object' ? explicit[file] : null;
    let classification = rule && CLASSES.includes(rule.classification)
      ? rule.classification
      : (active.has(file) ? 'ACTIVE' : 'UNREFERENCED');
    let reasonCodes = rule && Array.isArray(rule.reasonCodes)
      ? [...new Set(rule.reasonCodes.map(String))].sort()
      : [active.has(file) ? 'ACTIVE_REFERENCE_GRAPH' : 'NO_ACTIVE_REFERENCE'];

    if (active.has(file) && classification === 'REVIEW') {
      classification = 'ACTIVE';
      reasonCodes = [...new Set([...reasonCodes, 'ACTIVE_INBOUND_REFERENCE'])].sort();
    }

    const entry = {
      path: file,
      classification,
      reasonCodes,
      inboundReferences: [...inbound.get(file)].sort()
    };
    if (rule && typeof rule.replacement === 'string' && rule.replacement) {
      entry.replacement = rule.replacement;
    }
    return entry;
  });

  return {
    schemaVersion: 1,
    generatedFor: 'FUSION_F01_RUNTIME_INVENTORY',
    mutationAuthorized: false,
    sourceSha,
    entries
  };
}

module.exports = Object.freeze({
  CLASSES,
  collectStaticReferences,
  inventoryRepository,
  isProtectedPath,
  canonicalizeInventory
});
