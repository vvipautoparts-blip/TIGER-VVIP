"use strict";

const { eligible } = require("./match-eligibility.js");

const CALIBRATIONS = Object.freeze({
  "S2-DETERMINISTIC-1": Object.freeze({
    version: "S2-DETERMINISTIC-1",
    weights: Object.freeze({
      intent: 0.45,
      fit: 0.25,
      freshness: 0.18,
      diversity: 0.12,
      negative: 0.20,
    }),
    signalWeights: Object.freeze({
      fit: 1.00,
      category: 1.00,
      attribute: 0.90,
      availability: 0.85,
      freshness: 0.75,
      evidence: 0.65,
      relationship: 0.55,
    }),
    halfLivesMs: Object.freeze({
      fit: 30 * 24 * 60 * 60 * 1000,
      category: 30 * 24 * 60 * 60 * 1000,
      attribute: 21 * 24 * 60 * 60 * 1000,
      availability: 2 * 24 * 60 * 60 * 1000,
      freshness: 7 * 24 * 60 * 60 * 1000,
      evidence: 7 * 24 * 60 * 60 * 1000,
      relationship: 14 * 24 * 60 * 60 * 1000,
      negative: 7 * 24 * 60 * 60 * 1000,
    }),
  }),
});

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function dateValue(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function decay(value, at, now, halfLifeMs) {
  const quality = clamp(Number(value));
  const timestamp = dateValue(at);
  if (!timestamp || timestamp > now || !Number.isFinite(halfLifeMs) || halfLifeMs <= 0) return timestamp && timestamp > now ? 0 : quality;
  const age = Math.max(0, now.getTime() - timestamp.getTime());
  return clamp(quality * Math.exp(-Math.log(2) * age / halfLifeMs));
}

function calibration(policyVersion) {
  const requested = String(policyVersion || "S2-DETERMINISTIC-1");
  return CALIBRATIONS[requested] || Object.freeze({
    ...CALIBRATIONS["S2-DETERMINISTIC-1"],
    version: requested,
  });
}

function structuredFit(candidate, intent) {
  const checks = [];
  if (intent.category && candidate.category) checks.push(String(intent.category).toLowerCase() === String(candidate.category).toLowerCase());
  if (intent.sector && candidate.sector) checks.push(String(intent.sector).toLowerCase() === String(candidate.sector).toLowerCase());
  if (intent.market?.countryCode && candidate.countryCode) checks.push(String(intent.market.countryCode).toUpperCase() === String(candidate.countryCode).toUpperCase());
  if (intent.direction && candidate.direction) {
    checks.push((intent.direction === "NEED" && candidate.direction === "OFFER") ||
      (intent.direction === "OFFER" && candidate.direction === "NEED"));
  }
  if (!checks.length) return 0.5;
  return checks.filter(Boolean).length / checks.length;
}

function collectSignals(candidate) {
  const positive = Array.isArray(candidate.signals) ? candidate.signals : [];
  const negative = Array.isArray(candidate.negativeSignals) ? candidate.negativeSignals : [];
  return { positive, negative };
}

function temporalSignalScore(candidate, intent, now, config) {
  const { positive, negative } = collectSignals(candidate);
  let weighted = 0;
  let weightTotal = 0;
  for (const signal of positive) {
    if (!signal || signal.admissible === false) continue;
    const kind = String(signal.kind || signal.type || "fit").toLowerCase();
    const weight = Number(config.signalWeights[kind] || config.signalWeights.fit);
    const value = signal.value ?? signal.quality ?? signal.score;
    const halfLife = Number(signal.halfLifeMs || config.halfLivesMs[kind] || config.halfLivesMs.fit);
    weighted += decay(value, signal.at || signal.timestamp || signal.createdAt, now, halfLife) * weight;
    weightTotal += weight;
  }
  const intentStrength = weightTotal ? clamp(weighted / weightTotal) : structuredFit(candidate, intent);

  let negativeWeighted = 0;
  for (const signal of negative) {
    if (!signal || signal.admissible === false) continue;
    const kind = String(signal.kind || signal.type || "negative").toLowerCase();
    const weight = Number(signal.weight || 1);
    const halfLife = Number(signal.halfLifeMs || config.halfLivesMs[kind] || config.halfLivesMs.negative);
    negativeWeighted += decay(signal.value ?? signal.score ?? 1, signal.at || signal.timestamp || signal.createdAt, now, halfLife) * weight;
  }
  return { intentStrength, negativePenalty: clamp(negativeWeighted) };
}

function currentFit(candidate, intent, now) {
  const configured = Number(candidate.fitScore ?? candidate.structuredFit);
  const fit = Number.isFinite(configured) ? clamp(configured) : structuredFit(candidate, intent);
  const availability = candidate.availability === true || String(candidate.availabilityStatus || "").toUpperCase() === "CURRENT"
    ? 1
    : Number.isFinite(Number(candidate.availabilityScore)) ? clamp(Number(candidate.availabilityScore)) : 0.5;
  const freshness = Number.isFinite(Number(candidate.freshnessScore))
    ? clamp(Number(candidate.freshnessScore))
    : candidate.updatedAt ? decay(1, candidate.updatedAt, now, 7 * 24 * 60 * 60 * 1000) : 0.5;
  return { fit, freshness: clamp((availability + freshness) / 2) };
}

function rankCandidate(candidate, intent, now = new Date(), policyVersion = "S2-DETERMINISTIC-1") {
  if (!candidate || !intent) return 0;
  const timestamp = dateValue(now);
  if (!timestamp) return 0;
  const config = calibration(policyVersion);
  const temporal = temporalSignalScore(candidate, intent, timestamp, config);
  const current = currentFit(candidate, intent, timestamp);
  const diversity = Number.isFinite(Number(candidate.diversityScore)) ? clamp(Number(candidate.diversityScore)) : 0.5;
  const raw = config.weights.intent * temporal.intentStrength +
    config.weights.fit * current.fit +
    config.weights.freshness * current.freshness +
    config.weights.diversity * diversity -
    config.weights.negative * temporal.negativePenalty;
  return Number(clamp(raw).toFixed(12));
}

function identity(candidate) {
  return String(candidate?.id || candidate?.candidateId || candidate?.objectId || "");
}

function rankCandidates({ candidates, intent, now = new Date(), policyVersion = "S2-DETERMINISTIC-1", policyContext = {}, limit = 7 } = {}) {
  const boundedLimit = Math.min(7, Math.max(1, Number(limit) || 7));
  const timestamp = dateValue(now);
  if (!timestamp || !Array.isArray(candidates) || !intent) return [];

  const ranked = candidates
    .filter((candidate) => eligible(candidate, intent, { ...policyContext, now: timestamp }))
    .map((candidate) => ({
      candidate,
      score: rankCandidate(candidate, intent, timestamp, policyVersion),
      calibrationVersion: calibration(policyVersion).version,
    }))
    .sort((left, right) => right.score - left.score || identity(left.candidate).localeCompare(identity(right.candidate)));

  const chosen = [];
  const seenObjects = new Set();
  const ownerCounts = new Map();
  const typeCounts = new Map();
  for (const match of ranked) {
    const candidate = match.candidate;
    const id = identity(candidate);
    const duplicateKey = String(candidate.duplicateKey || candidate.canonicalObjectId || id);
    const owner = String(candidate.ownerSubject || candidate.sellerSubject || candidate.actorSubject || "unknown");
    const type = String(candidate.contentType || candidate.objectType || "unknown");
    if (seenObjects.has(duplicateKey) || ownerCounts.get(owner) >= 2 || typeCounts.get(type) >= 3) continue;
    seenObjects.add(duplicateKey);
    ownerCounts.set(owner, (ownerCounts.get(owner) || 0) + 1);
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    chosen.push(Object.freeze(match));
    if (chosen.length >= boundedLimit) break;
  }
  return Object.freeze(chosen);
}

module.exports = {
  CALIBRATIONS,
  rankCandidate,
  rankCandidates,
};