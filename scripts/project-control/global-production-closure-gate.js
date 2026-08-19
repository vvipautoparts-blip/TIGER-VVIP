'use strict';

const REQUIRED_LAYERS = Object.freeze([
  'production_backend',
  'identity_security',
  'marketplace',
  'campaigns_payments',
  'global_infrastructure',
  'legal_country_activation',
  'observability',
  'launch_tests',
  'release_environments',
  'launch_gate',
]);

function evaluateClosure(manifest) {
  const blockers = [];
  const candidate = manifest && typeof manifest === 'object' ? manifest : {};

  if (candidate.fail_closed !== true) {
    blockers.push('launch_gate: fail_closed must be true');
  }

  if (!Number.isInteger(candidate.unresolved_p0) || candidate.unresolved_p0 !== 0) {
    blockers.push(`launch_gate: unresolved_p0 must be 0 (got ${String(candidate.unresolved_p0)})`);
  }

  if (!Number.isInteger(candidate.unresolved_p1) || candidate.unresolved_p1 !== 0) {
    blockers.push(`launch_gate: unresolved_p1 must be 0 (got ${String(candidate.unresolved_p1)})`);
  }

  const layers = Array.isArray(candidate.layers) ? candidate.layers : [];
  const layerById = new Map(layers.map((layer) => [layer && layer.id, layer]));

  for (const layerId of REQUIRED_LAYERS) {
    const layer = layerById.get(layerId);
    if (!layer) {
      blockers.push(`${layerId}: missing layer`);
      continue;
    }

    if (layer.status !== 'pass') {
      blockers.push(`${layerId}: status must be pass (got ${String(layer.status)})`);
      continue;
    }

    const evidence = Array.isArray(layer.evidence) ? layer.evidence : [];
    if (!evidence.some((item) => item && item.verified === true && typeof item.ref === 'string' && item.ref.trim() !== '')) {
      blockers.push(`${layerId}: pass requires at least one verified evidence reference`);
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
    checked_layers: REQUIRED_LAYERS.length,
  };
}

module.exports = {
  REQUIRED_LAYERS,
  evaluateClosure,
};
