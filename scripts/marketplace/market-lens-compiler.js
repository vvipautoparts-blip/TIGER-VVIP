'use strict';

/**
 * Generic TIGER PRIVATE MARKET GENESIS Lens adapter.
 *
 * The core deliberately knows nothing about concrete sectors. A Lens supplies
 * immutable Sector Physics plus canonicalization/retrieval mapping functions.
 */

function assertLensContract(lens) {
  if (!lens || typeof lens !== 'object') {
    throw new TypeError('Lens contract is required');
  }
  if (!lens.physics || typeof lens.physics !== 'object') {
    throw new TypeError('Lens physics are required');
  }
  if (typeof lens.physics.sector_id !== 'string' || lens.physics.sector_id.length === 0) {
    throw new TypeError('Lens physics.sector_id is required');
  }
  if (typeof lens.physics.version !== 'string' || lens.physics.version.length === 0) {
    throw new TypeError('Lens physics.version is required');
  }
  if (typeof lens.canonicalize !== 'function') {
    throw new TypeError('Lens canonicalize(record) function is required');
  }
  if (typeof lens.mapRetrieval !== 'function') {
    throw new TypeError('Lens mapRetrieval(request) function is required');
  }
}

function compileLensRecord(record, lens, context = {}) {
  assertLensContract(lens);

  const genome = lens.canonicalize(record, context);
  const retrievalFeatures = lens.mapRetrieval(context.retrieval_request || {}, context);

  return {
    sector_id: lens.physics.sector_id,
    physics_version: lens.physics.version,
    genome,
    retrieval_features: retrievalFeatures,
  };
}

module.exports = {
  compileLensRecord,
};
