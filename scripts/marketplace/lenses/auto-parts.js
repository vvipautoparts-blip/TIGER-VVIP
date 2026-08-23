'use strict';

const { CONTACT_STATES } = require('../private-market-contracts.js');

const WHOLE_VEHICLE_PROBABILITY_THRESHOLD = 0.5;
const ALLOWED_CONDITIONS = new Set(['NEW', 'USED', 'REFURBISHED']);
const WHOLE_VEHICLE_PART_TYPES = new Set(['vehicle', 'car', 'whole-vehicle', 'whole_vehicle', 'complete-vehicle']);

const AUTO_PARTS_PHYSICS = Object.freeze({
  sector_id: 'automotive',
  version: '1.0.0',
  allowed_entity_types: Object.freeze(['AUTO_PART']),
  forbidden_entity_types: Object.freeze(['WHOLE_VEHICLE']),
  required_dimensions: Object.freeze(['part_type', 'make', 'model', 'fitment_year']),
  optional_dimensions: Object.freeze([
    'generation',
    'engine',
    'drivetrain',
    'part_number',
    'oem_number',
    'condition',
    'manufacturer_type',
    'price',
  ]),
  normalization_rules: Object.freeze({
    entity_type: 'AUTO_PART_ONLY',
    condition: 'UPPERCASE_ENUM',
    year_range: 'INTEGER_RANGE',
    source_category: 'PARTS_ONLY',
  }),
  category_firewall: Object.freeze({
    allowed_source_category: 'parts',
    whole_vehicle_ads_forbidden: true,
    semantic_probability_threshold: WHOLE_VEHICLE_PROBABILITY_THRESHOLD,
    fail_closed_on_whole_vehicle_signal: true,
  }),
  publication_validators: Object.freeze([
    'AUTO_PARTS_CATEGORY_FIREWALL',
    'WHOLE_VEHICLE_FORBIDDEN',
    'PART_TYPE_REQUIRED',
    'FITMENT_VALID',
    'MODERATION_APPROVED',
  ]),
  discovery_validators: Object.freeze([
    'AUTO_PARTS_CATEGORY_FIREWALL',
    'WHOLE_VEHICLE_FORBIDDEN',
    'NOT_EXPIRED',
    'FITMENT_VALID',
    'POLICY_VERSION_CURRENT',
  ]),
  sponsored_admission_validators: Object.freeze([
    'ORGANIC_ADMISSION_VALID',
    'WHOLE_VEHICLE_FORBIDDEN',
    'MINIMUM_RELEVANCE_MET',
    'SPONSORED_LABEL_REQUIRED',
  ]),
  freshness_policy: Object.freeze({ max_age_seconds: 2592000 }),
  geography_semantics: Object.freeze({
    precision: 'COARSE',
    exact_private_coordinates_forbidden: true,
    allowlisted_fields: Object.freeze(['country', 'city', 'area']),
  }),
  price_value_semantics: Object.freeze({
    descriptive_only: true,
    transaction_authority: false,
  }),
  evidence_semantics: Object.freeze({
    whole_vehicle_semantic_evidence_authoritative_for_rejection: true,
    lexical_backstop_enabled: true,
    freshness_required: true,
  }),
  compatibility_semantics: Object.freeze({
    mode: 'FITMENT_GRAPH',
    dimensions: Object.freeze(['make', 'model', 'generation', 'year', 'engine', 'drivetrain', 'part_number', 'oem_number']),
  }),
  ranking_feature_allowlist: Object.freeze([
    'fitment_confidence',
    'part_type_fit',
    'oem_number_fit',
    'part_number_fit',
    'condition_fit',
    'price_range_fit',
    'freshness',
  ]),
  explanation_reason_allowlist: Object.freeze([
    'FITMENT_MATCH',
    'PART_TYPE_MATCH',
    'OEM_NUMBER_MATCH',
    'PART_NUMBER_MATCH',
    'CONDITION_MATCH',
    'PRICE_RANGE_OVERLAP',
    'FRESHNESS',
    'SPONSORED_STATUS',
  ]),
  contact_modes: Object.freeze(['SOCIAL_MESSAGE']),
  disclosure_requirements: Object.freeze(['ADVERTISEMENT_ONLY', 'NO_TRANSACTION', 'FITMENT_NOT_A_PLATFORM_GUARANTEE']),
  media_requirements: Object.freeze({ minimum_images: 0, policy_moderated: true }),
  country_overlays: Object.freeze({
    JO: Object.freeze({ contact_modes: Object.freeze(['SOCIAL_MESSAGE']) }),
  }),
  moderation_policy_hooks: Object.freeze(['AUTO_PARTS_CONTENT_POLICY', 'WHOLE_VEHICLE_SEMANTIC_FIREWALL']),
  retention_audit_class: 'MARKET_DISCOVERY',
  migration_compatibility_range: '^1.0.0',
  hard_invariants: Object.freeze({
    transaction_features_forbidden: true,
    sponsored_cannot_bypass_eligibility: true,
    whole_vehicle_ads_forbidden: true,
  }),
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function positiveNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive number`);
  }
  return value;
}

function compactObject(entries) {
  return Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined && value !== null));
}

function normalizeCondition(value) {
  if (value == null) return undefined;
  const normalized = nonEmptyString(value, 'condition').toUpperCase();
  if (!ALLOWED_CONDITIONS.has(normalized)) {
    throw new Error(`condition is not allowed by Auto Parts Physics: ${normalized}`);
  }
  return normalized;
}

function normalizeYear(value, field) {
  if (value == null) return undefined;
  if (!Number.isInteger(value) || value < 1886 || value > 2200) {
    throw new TypeError(`${field} must be a plausible integer vehicle year`);
  }
  return value;
}

function validateYearRange(yearFrom, yearTo) {
  const from = normalizeYear(yearFrom, 'yearFrom');
  const to = normalizeYear(yearTo, 'yearTo');
  if (from != null && to != null && from > to) {
    throw new Error('yearFrom cannot be greater than yearTo');
  }
  return { from, to };
}

function lexicalWholeVehicleSignal(record) {
  const text = `${record && record.title ? record.title : ''} ${record && record.description ? record.description : ''}`
    .normalize('NFKC')
    .toLowerCase();

  const englishHighSignal = /\b(?:complete\s+|whole\s+)?(?:car|vehicle)\s+for\s+sale\b/u;
  const englishReadyToDrive = /\b(?:whole|complete)\s+(?:car|vehicle)\b|\bready\s+to\s+drive\b/u;
  const arabicForSale = /(?:سيارة|مركبة)\s+(?:كاملة\s+)?للبيع|للبيع\s+(?:سيارة|مركبة)/u;
  const arabicWhole = /(?:سيارة|مركبة)\s+كاملة|جاهزة\s+للقيادة/u;

  return englishHighSignal.test(text)
    || englishReadyToDrive.test(text)
    || arabicForSale.test(text)
    || arabicWhole.test(text);
}

function validateAutoPartsCategoryFirewall(record, context = {}) {
  const reasonCodes = [];
  const source = isPlainObject(record) ? record : {};
  const attributes = isPlainObject(source.sectorAttributes) ? source.sectorAttributes : {};

  if (source.sector !== AUTO_PARTS_PHYSICS.sector_id) {
    reasonCodes.push('WRONG_SECTOR');
  }
  if (source.category !== AUTO_PARTS_PHYSICS.category_firewall.allowed_source_category) {
    reasonCodes.push('AUTO_PARTS_ONLY');
  }

  const normalizedPartType = typeof attributes.partType === 'string'
    ? attributes.partType.trim().toLowerCase()
    : '';
  const entityType = typeof attributes.entityType === 'string'
    ? attributes.entityType.trim().toUpperCase()
    : '';
  const structuralWholeVehicleSignal = entityType === 'WHOLE_VEHICLE'
    || attributes.wholeVehicle === true
    || attributes.vehicleSale === true
    || WHOLE_VEHICLE_PART_TYPES.has(normalizedPartType);

  const semanticProbability = context.semantic_evidence && Number(context.semantic_evidence.whole_vehicle_probability);
  const semanticWholeVehicleSignal = Number.isFinite(semanticProbability)
    && semanticProbability >= WHOLE_VEHICLE_PROBABILITY_THRESHOLD;

  if (structuralWholeVehicleSignal || semanticWholeVehicleSignal || lexicalWholeVehicleSignal(source)) {
    reasonCodes.push('WHOLE_VEHICLE_FORBIDDEN');
  }

  return Object.freeze({
    ok: reasonCodes.length === 0,
    reason_codes: Object.freeze([...new Set(reasonCodes)]),
  });
}

function assertFirewall(record, context) {
  const verdict = validateAutoPartsCategoryFirewall(record, context);
  if (!verdict.ok) {
    throw new Error(verdict.reason_codes.join('|'));
  }
}

function tokenize(...values) {
  const tokens = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    for (const token of value.toLowerCase().split(/[^\p{L}\p{N}-]+/u)) {
      if (token.length > 1 && !tokens.includes(token)) tokens.push(token);
    }
  }
  return tokens;
}

function canonicalizeAutoPartsRecord(record, context = {}) {
  if (!isPlainObject(record)) {
    throw new TypeError('Auto Parts Listing Contract record must be an object');
  }
  assertFirewall(record, context);

  const sourceAttributes = isPlainObject(record.sectorAttributes) ? record.sectorAttributes : {};
  const yearRange = validateYearRange(sourceAttributes.yearFrom, sourceAttributes.yearTo);
  const country = nonEmptyString(record.country, 'country').toUpperCase();
  const contact = isPlainObject(context.contact) ? context.contact : {};
  const sponsored = context.sponsored === true;
  const contactCapability = contact.blocked_by_policy === true
    ? CONTACT_STATES.CONTACT_BLOCKED
    : CONTACT_STATES.CONTACT_REQUIRES_REVEAL;

  const attributes = compactObject({
    part_type: nonEmptyString(sourceAttributes.partType, 'sectorAttributes.partType'),
    make: nonEmptyString(sourceAttributes.make, 'sectorAttributes.make'),
    model: nonEmptyString(sourceAttributes.model, 'sectorAttributes.model'),
    generation: sourceAttributes.generation,
    year_from: yearRange.from,
    year_to: yearRange.to,
    engine: sourceAttributes.engine,
    drivetrain: sourceAttributes.drivetrain,
    part_number: sourceAttributes.partNumber,
    oem_number: sourceAttributes.oemNumber,
    condition: normalizeCondition(sourceAttributes.condition),
    manufacturer_type: sourceAttributes.manufacturerType,
  });

  const coarseGeo = compactObject({
    country,
    city: record.city,
    area: record.area,
  });

  return {
    identity: {
      ad_id: nonEmptyString(record.listingId, 'listingId'),
      owner_subject: nonEmptyString(record.ownerClerkUserId, 'ownerClerkUserId'),
      source_type: 'LISTING',
      source_revision: Number.isInteger(context.source_revision) ? context.source_revision : record.schemaVersion,
      created_at: nonEmptyString(record.createdAt, 'createdAt'),
      updated_at: nonEmptyString(record.updatedAt, 'updatedAt'),
      provenance_state: nonEmptyString(context.provenance_state, 'context.provenance_state'),
      moderation_state: nonEmptyString(context.moderation_state, 'context.moderation_state'),
      country,
      policy_version: nonEmptyString(context.policy_version, 'context.policy_version'),
    },
    taxonomy: {
      sector_id: AUTO_PARTS_PHYSICS.sector_id,
      category_id: 'parts',
      subcategory_id: attributes.part_type,
      entity_type: 'AUTO_PART',
      offer_mode: 'OFFER',
      attributes,
    },
    discovery: {
      title: nonEmptyString(record.title, 'title'),
      summary: nonEmptyString(record.description, 'description'),
      searchable_tokens: tokenize(
        record.title,
        record.description,
        attributes.part_type,
        attributes.make,
        attributes.model,
        attributes.generation,
        attributes.part_number,
        attributes.oem_number,
      ),
      coarse_geo: coarseGeo,
      price_value: {
        amount: positiveNumber(record.numericPrice, 'numericPrice'),
        currency: nonEmptyString(record.currency, 'currency').toUpperCase(),
        descriptive_only: true,
      },
      freshness_state: 'FRESH',
      expires_at: nonEmptyString(record.expiresAt, 'expiresAt'),
    },
    advertising: {
      organic_eligibility_state: context.organic_eligibility_state || 'PENDING_POLICY',
      sponsorship_eligibility_state: context.sponsorship_eligibility_state || 'PENDING_POLICY',
      sponsored,
      pulse_campaign_ref: sponsored ? context.pulse_campaign_ref || null : null,
      delivery_market: country,
      labeling_requirement: sponsored,
      verified_viewability_eligible: context.verified_viewability_eligible === true,
    },
    contact: {
      contact_capability_class: contactCapability,
      reveal_policy_ref: contact.reveal_policy_ref || null,
      safe_public_display_identity: contact.safe_public_display_identity || 'Seller',
      allowed_handoff_channels: Array.isArray(contact.allowed_handoff_channels)
        ? [...contact.allowed_handoff_channels]
        : ['SOCIAL_MESSAGE'],
      blocked_by_policy: contact.blocked_by_policy === true,
    },
  };
}

function copyPriceFilter(value) {
  if (value == null) return undefined;
  if (!isPlainObject(value)) throw new TypeError('price filter must be an object');
  return compactObject({
    min: value.min,
    max: value.max,
    currency: typeof value.currency === 'string' ? value.currency.toUpperCase() : value.currency,
  });
}

function mapAutoPartsRetrieval(request = {}) {
  if (!isPlainObject(request)) {
    throw new TypeError('Auto Parts retrieval request must be an object');
  }

  return compactObject({
    part_type: request.part_type,
    make: request.make,
    model: request.model,
    generation: request.generation,
    year: normalizeYear(request.year, 'year'),
    engine: request.engine,
    drivetrain: request.drivetrain,
    part_number: request.part_number,
    oem_number: request.oem_number,
    condition: normalizeCondition(request.condition),
    price: copyPriceFilter(request.price),
  });
}

const AUTO_PARTS_LENS = Object.freeze({
  physics: AUTO_PARTS_PHYSICS,
  canonicalize: canonicalizeAutoPartsRecord,
  mapRetrieval: mapAutoPartsRetrieval,
});

module.exports = {
  AUTO_PARTS_PHYSICS,
  AUTO_PARTS_LENS,
  validateAutoPartsCategoryFirewall,
  canonicalizeAutoPartsRecord,
  mapAutoPartsRetrieval,
};
