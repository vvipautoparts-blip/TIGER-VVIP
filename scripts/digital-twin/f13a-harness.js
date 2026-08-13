'use strict';

const crypto = require('node:crypto');

const DIGITAL_TWIN_GATE = Object.freeze({ uniqueActors: 4_000_000, simultaneousActiveUsers: 4_000_000 });
const PERSONAS = Object.freeze(['buyer', 'seller', 'business', 'browser']);
const LOCALES = Object.freeze(['ar-JO', 'ar-SA', 'ar-AE', 'en-US', 'en-GB']);
const MARKETS = Object.freeze(['JO', 'SA', 'AE', 'US', 'GB', 'DE', 'ES', 'PT']);
const SECTORS = Object.freeze(['automotive', 'real-estate', 'technology', 'healthcare', 'services', 'materials', 'general']);
const DEVICES = Object.freeze(['mobile-low', 'mobile-mid', 'mobile-high', 'desktop']);
const NETWORKS = Object.freeze(['2g', '3g', '4g', 'wifi', 'data-saver']);

function fail() {
  const error = new Error('F13_INVALID_PLAN');
  error.code = 'F13_INVALID_PLAN';
  throw error;
}

function digest(seed, index, label) {
  return crypto.createHash('sha256').update(`${seed}\u0000${index}\u0000${label}`).digest();
}

function choose(values, bytes, offset) {
  const value = bytes.readUInt32BE(offset % (bytes.length - 3));
  return values[value % values.length];
}

function validateActorInput(seed, index) {
  if (typeof seed !== 'string' || seed.length < 1) fail();
  if (!Number.isSafeInteger(index) || index < 0) fail();
}

function generateActor(seed, index) {
  validateActorInput(seed, index);
  const bytes = digest(seed, index, 'actor');
  const actorHash = crypto.createHash('sha256').update(bytes).digest('hex');
  const behaviorHash = crypto.createHash('sha256').update(`${seed}:${index}:behavior`).digest('hex');
  return Object.freeze({
    actorId: `synthetic-${String(index).padStart(7, '0')}-${actorHash.slice(0, 12)}`,
    behaviorSeed: behaviorHash.slice(0, 24),
    deviceClass: choose(DEVICES, bytes, 0),
    locale: choose(LOCALES, bytes, 4),
    market: choose(MARKETS, bytes, 8),
    networkProfile: choose(NETWORKS, bytes, 12),
    persona: choose(PERSONAS, bytes, 16),
    sector: choose(SECTORS, bytes, 20),
    synthetic: true
  });
}

function validatePlanInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail();
  const { uniqueActors, simultaneousActiveUsers, shardSize, seed } = input;
  if (!Number.isSafeInteger(uniqueActors) || uniqueActors < 1) fail();
  if (!Number.isSafeInteger(simultaneousActiveUsers) || simultaneousActiveUsers < 1) fail();
  if (simultaneousActiveUsers > uniqueActors) fail();
  if (!Number.isSafeInteger(shardSize) || shardSize < 1) fail();
  if (typeof seed !== 'string' || seed.length < 1) fail();
}

function buildShardPlan(input) {
  validatePlanInput(input);
  const { uniqueActors, simultaneousActiveUsers, shardSize, seed } = input;
  const shardCount = Math.ceil(uniqueActors / shardSize);
  const shards = Array.from({ length: shardCount }, (_, shardIndex) => {
    const startIndex = shardIndex * shardSize;
    const endIndexExclusive = Math.min(startIndex + shardSize, uniqueActors);
    return Object.freeze({
      shardIndex,
      startIndex,
      endIndexExclusive,
      actorCount: endIndexExclusive - startIndex,
      replaySeed: `${seed}:shard:${shardIndex}`
    });
  });
  return Object.freeze({ seed, uniqueActors, simultaneousActiveUsers, shardSize, shards: Object.freeze(shards) });
}

function buildPlannedManifest(input) {
  const plan = buildShardPlan(input);
  return Object.freeze({
    result: 'PLANNED',
    globalLaunchEligible: false,
    targetUniqueActors: plan.uniqueActors,
    targetSimultaneousActiveUsers: plan.simultaneousActiveUsers,
    measuredUniqueActors: null,
    measuredPeakSimultaneousUsers: null,
    shardCount: plan.shards.length,
    seed: plan.seed
  });
}

module.exports = Object.freeze({ DIGITAL_TWIN_GATE, generateActor, buildShardPlan, buildPlannedManifest });