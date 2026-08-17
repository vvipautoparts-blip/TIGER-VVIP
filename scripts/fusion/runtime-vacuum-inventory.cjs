'use strict';

const fs = require('node:fs');
const path = require('node:path');

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function isRuntimeCandidate(relativePath) {
  const p = normalize(relativePath);
  if (p.startsWith('assets/') || p.startsWith('public/') || p.startsWith('supabase/functions/')) return true;
  if (p.includes('/')) return false;
  return /\.(html|js|css)$/i.test(p) || /^(sw\.js|manifest\.json|manifest\.webmanifest)$/i.test(p);
}

function classifyRuntimePath(relativePath, policy) {
  const p = normalize(relativePath);
  const lower = p.toLowerCase();
  const protectedExact = new Set(policy.protectedActive || []);
  const protectedPattern = (policy.protectedPathPatterns || []).some((token) => lower.includes(String(token).toLowerCase()));

  if (protectedExact.has(p) || protectedPattern) {
    return { classification: 'ACTIVE', reason: 'protected FUSION/current runtime foundation', requiresEvidence: false };
  }

  if ((policy.migrationBridgeExact || []).includes(p)) {
    return { classification: 'MIGRATION_BRIDGE', reason: 'legacy route retained until Single Surface replacement evidence exists', requiresEvidence: false };
  }

  const deletePattern = (policy.deleteCandidatePatterns || []).find((token) => lower.includes(String(token).toLowerCase()));
  if (deletePattern) {
    return { classification: 'DELETE_CANDIDATE', reason: `filename matches explicit cleanup marker: ${deletePattern}`, requiresEvidence: true };
  }

  if (p.startsWith('assets/') || p.startsWith('public/')) {
    return { classification: 'ACTIVE', reason: 'current runtime asset surface pending reachability refinement', requiresEvidence: false };
  }

  if (!p.includes('/') && /\.html$/i.test(p)) {
    return { classification: p === 'index.html' ? 'ACTIVE' : 'MIGRATION_BRIDGE', reason: p === 'index.html' ? 'primary current entrypoint' : 'legacy multi-page shell route pending F02/F03 migration', requiresEvidence: false };
  }

  if (!p.includes('/') && /\.(js|css)$/i.test(p)) {
    return { classification: 'MIGRATION_BRIDGE', reason: 'top-level legacy shell runtime pending dependency/reachability proof', requiresEvidence: false };
  }

  return null;
}

function walk(root, ignoredDirectories, current = '') {
  const dir = path.join(root, current);
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const rel = current ? path.join(current, entry.name) : entry.name;
    if (entry.isDirectory()) output.push(...walk(root, ignoredDirectories, rel));
    else if (entry.isFile()) output.push(normalize(rel));
  }
  return output;
}

function buildRuntimeInventory(root, policy) {
  const ignored = new Set(policy.ignoredDirectories || []);
  const runtimePaths = walk(root, ignored).filter(isRuntimeCandidate).sort();
  const candidates = [];
  const unclassified = [];

  for (const runtimePath of runtimePaths) {
    const result = classifyRuntimePath(runtimePath, policy);
    if (!result) {
      unclassified.push(runtimePath);
      continue;
    }
    candidates.push({ path: runtimePath, ...result });
  }

  const counts = Object.fromEntries((policy.allowedClassifications || []).map((name) => [name, 0]));
  for (const entry of candidates) counts[entry.classification] = (counts[entry.classification] || 0) + 1;

  return Object.freeze({ candidates, unclassified, counts });
}

module.exports = Object.freeze({ isRuntimeCandidate, classifyRuntimePath, buildRuntimeInventory });
