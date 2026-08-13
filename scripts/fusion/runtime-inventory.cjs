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

function inventoryRepository(options = {}) {
  const files = options.files && typeof options.files === 'object' ? options.files : {};
  const registry = options.registry && typeof options.registry === 'object' ? options.registry : {};
  const sourceSha = typeof options.sourceSha === 'string' ? options.sourceSha : '';
  const filePaths = Object.keys(files).sort();
  const inbound = new Map(filePaths.map((file) => [file, new Set()]));
  const active = new Set();
  const queue = [];

  for (const entrypoint of Array.isArray(registry.entrypoints) ? registry.entrypoints : []) {
    if (!Object.prototype.hasOwnProperty.call(files, entrypoint)) continue;
    if (!active.has(entrypoint)) {
      active.add(entrypoint);
      queue.push(entrypoint);
    }
  }

  while (queue.length) {
    const sourcePath = queue.shift();
    for (const target of collectStaticReferences(files[sourcePath], sourcePath)) {
      if (!Object.prototype.hasOwnProperty.call(files, target)) continue;
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
    const classification = rule && CLASSES.includes(rule.classification)
      ? rule.classification
      : (active.has(file) ? 'ACTIVE' : 'UNREFERENCED');
    const reasonCodes = rule && Array.isArray(rule.reasonCodes)
      ? [...new Set(rule.reasonCodes.map(String))].sort()
      : [active.has(file) ? 'ACTIVE_REFERENCE_GRAPH' : 'NO_ACTIVE_REFERENCE'];
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
  inventoryRepository
});
