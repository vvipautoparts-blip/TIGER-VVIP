"use strict";

const SAFE_REASON_CODES = Object.freeze([
  "category_fit",
  "attribute_fit",
  "market_fit",
  "availability_current",
  "evidence_fresh",
  "relationship_relevant",
  "sponsored",
  "structured_fit",
]);

const SAFE_RELATIONSHIPS = new Set(["friend", "community", "followed_business"]);

function explainMatch(match, viewerContext = {}) {
  const candidate = match?.candidate && typeof match.candidate === "object" ? match.candidate : match;
  const intent = viewerContext.intent || match?.intent || {};
  if (!candidate || typeof candidate !== "object") return Object.freeze(["structured_fit"]);

  const reasons = [];
  if (intent.category && candidate.category &&
      String(intent.category).toLowerCase() === String(candidate.category).toLowerCase()) reasons.push("category_fit");
  if (intent.sector && candidate.sector &&
      String(intent.sector).toLowerCase() === String(candidate.sector).toLowerCase()) reasons.push("attribute_fit");
  if (intent.market?.countryCode && candidate.countryCode &&
      String(intent.market.countryCode).toUpperCase() === String(candidate.countryCode).toUpperCase()) reasons.push("market_fit");
  if (candidate.availability === true || String(candidate.availabilityStatus || "").toUpperCase() === "CURRENT") reasons.push("availability_current");

  const now = viewerContext.now ? new Date(viewerContext.now) : new Date();
  const evidenceAt = candidate.evidenceAt || candidate.evidence?.observedAt || candidate.updatedAt;
  const maxAgeMs = Number(viewerContext.evidenceMaxAgeMs || 7 * 24 * 60 * 60 * 1000);
  if (evidenceAt && Number.isFinite(new Date(evidenceAt).getTime()) &&
      new Date(evidenceAt).getTime() <= now.getTime() &&
      now.getTime() - new Date(evidenceAt).getTime() <= maxAgeMs) reasons.push("evidence_fresh");

  if (viewerContext.allowRelationshipReasons === true &&
      SAFE_RELATIONSHIPS.has(String(candidate.relationshipClass || "").toLowerCase())) reasons.push("relationship_relevant");
  if (candidate.sponsored === true) reasons.push("sponsored");
  if (!reasons.length) reasons.push("structured_fit");

  return Object.freeze([...new Set(reasons)].filter((reason) => SAFE_REASON_CODES.includes(reason)));
}

module.exports = {
  SAFE_REASON_CODES,
  explainMatch,
};