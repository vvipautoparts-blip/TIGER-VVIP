"use strict";

/**
 * S2 policy boundary. Eligibility is intentionally independent from score,
 * spend, embeddings, client trust flags, and model output.
 */
const MATCHING_INTENT_STATUSES = new Set(["MATCHING", "ACTIVE"]);
const TERMINAL_INTENT_STATUSES = new Set(["REJECTED", "CANCELLED", "EXPIRED"]);
const TERMINAL_CANDIDATE_STATUSES = new Set(["REMOVED", "DELETED", "BLOCKED", "EXPIRED"]);
const PRIVATE_VISIBILITY = new Set(["PRIVATE_LOCAL", "ONLY_ME", "PRIVATE"]);

function asDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value || Date.now());
  return Number.isFinite(date.getTime()) ? date : null;
}

function asSet(value) {
  return new Set(Array.isArray(value) ? value.map((item) => String(item)) : []);
}

function valueOf(candidate, names) {
  for (const name of names) {
    if (candidate[name] !== undefined && candidate[name] !== null) return candidate[name];
  }
  return undefined;
}

function expiredAt(value, now) {
  if (value === undefined || value === null || value === "") return false;
  const date = asDate(value);
  return !date || date <= now;
}

function eligible(candidate, intent, policyContext = {}) {
  if (!candidate || typeof candidate !== "object" || !intent || typeof intent !== "object") return false;

  const now = asDate(policyContext.now);
  if (!now) return false;

  if (policyContext.policyAdmitted === false || policyContext.matchingEnabled === false) return false;
  if (TERMINAL_INTENT_STATUSES.has(String(intent.status || ""))) return false;
  if (intent.status && !MATCHING_INTENT_STATUSES.has(String(intent.status))) return false;
  if (expiredAt(intent.expiresAt, now)) return false;

  if (candidate.policyEligible === false || candidate.searchEligible === false ||
      candidate.visibilityEligible === false || candidate.eligible === false ||
      candidate.deleted === true || candidate.removed === true ||
      candidate.blocked === true || candidate.stale === true ||
      candidate.isStale === true) return false;

  const candidateStatus = String(candidate.status || "").toUpperCase();
  if (TERMINAL_CANDIDATE_STATUSES.has(candidateStatus)) return false;
  if (expiredAt(candidate.expiresAt, now) || expiredAt(candidate.availableUntil, now)) return false;

  const moderationStatus = valueOf(candidate, ["moderationStatus", "moderation"]);
  if (moderationStatus !== undefined &&
      !new Set(["APPROVED", "VISIBLE", "ACTIVE", "PUBLISHED", "AVAILABLE", "approved", "visible", "active", "published", "available"]).has(String(moderationStatus))) {
    return false;
  }

  const actor = String(valueOf(intent, ["actorSubject", "ownerSubject", "actor"]) || "");
  const owner = String(valueOf(candidate, ["ownerSubject", "actorSubject", "creatorSubject", "sellerSubject"]) || "");
  if (actor && owner && actor === owner) return false;

  const blockedActors = asSet([
    ...(Array.isArray(policyContext.blockedActorSubjects) ? policyContext.blockedActorSubjects : []),
    ...(Array.isArray(policyContext.blockedSubjects) ? policyContext.blockedSubjects : []),
  ]);
  const blockedCandidates = asSet([
    ...(Array.isArray(policyContext.blockedCandidateIds) ? policyContext.blockedCandidateIds : []),
    ...(Array.isArray(policyContext.hiddenCandidateIds) ? policyContext.hiddenCandidateIds : []),
  ]);
  const candidateId = String(valueOf(candidate, ["id", "candidateId", "objectId"]) || "");
  if ((owner && blockedActors.has(owner)) || blockedCandidates.has(candidateId)) return false;

  const visibility = String(candidate.visibilityClass || candidate.visibility || "").toUpperCase();
  if (PRIVATE_VISIBILITY.has(visibility)) return false;
  if (candidate.visibilityClass === "FRIENDS" && policyContext.viewerCanSeeFriends !== true) return false;

  const intentMarket = intent.market && typeof intent.market === "object" ? intent.market : {};
  const expectedCountry = String(policyContext.activeMarketCountry || intentMarket.countryCode || "").toUpperCase();
  const candidateCountry = String(valueOf(candidate, ["countryCode", "marketCountry", "activeMarketCountry"]) || "").toUpperCase();
  if (expectedCountry && candidateCountry && expectedCountry !== candidateCountry) return false;
  if (Array.isArray(policyContext.allowedCountries) && candidateCountry &&
      !policyContext.allowedCountries.map((item) => String(item).toUpperCase()).includes(candidateCountry)) return false;

  const expectedSector = String(intent.sector || "").trim().toLowerCase();
  const candidateSector = String(candidate.sector || "").trim().toLowerCase();
  if (expectedSector && candidateSector && expectedSector !== candidateSector) return false;
  if (Array.isArray(policyContext.allowedSectors) && candidateSector &&
      !policyContext.allowedSectors.map((item) => String(item).toLowerCase()).includes(candidateSector)) return false;

  const expectedCategory = String(intent.category || "").trim().toLowerCase();
  const candidateCategory = String(candidate.category || "").trim().toLowerCase();
  if (expectedCategory && candidateCategory && expectedCategory !== candidateCategory) return false;

  const intentDirection = String(intent.direction || "").toUpperCase();
  const candidateDirection = String(candidate.direction || "").toUpperCase();
  if (intentDirection && candidateDirection &&
      ((intentDirection === "NEED" && candidateDirection !== "OFFER") ||
       (intentDirection === "OFFER" && candidateDirection !== "NEED"))) return false;

  if (policyContext.requirePolicyVersion === true &&
      intent.policyVersion && candidate.policyVersion &&
      String(intent.policyVersion) !== String(candidate.policyVersion)) return false;

  return true;
}

function filterEligibleCandidates(candidates, intent, policyContext = {}) {
  if (!Array.isArray(candidates)) return [];
  return candidates.filter((candidate) => eligible(candidate, intent, policyContext));
}

module.exports = {
  eligible,
  filterEligibleCandidates,
};