'use strict';

const { CONTACT_STATES } = require('../private-market-contracts.js');

const REAL_ESTATE_CATEGORY_TO_ENTITY = Object.freeze({
  apartment: 'APARTMENT',
  house: 'HOUSE',
  villa: 'VILLA',
  land: 'LAND',
  office: 'OFFICE',
  shop: 'SHOP',
  warehouse: 'WAREHOUSE',
  farm: 'FARM',
  'commercial-property': 'COMMERCIAL_PROPERTY',
});

const REAL_ESTATE_PHYSICS = Object.freeze({
  sector_id: 'real-estate',
  version: '1.0.0',
  allowed_entity_types: Object.freeze(Object.values(REAL_ESTATE_CATEGORY_TO_ENTITY)),
  forbidden_entity_types: Object.freeze(['WHOLE_VEHICLE']),
  required_dimensions: Object.freeze(['property_type', 'offer_mode', 'area_sqm', 'availability_from']),
  optional_dimensions: Object.freeze([
    'country',
    'region',
    'city',
    'area',
    'land_area_sqm',
    'bedrooms',
    'bathrooms',
    'furnishing',
    'price',
  ]),
  normalization_rules: Object.freeze({
    property_type: 'CATEGORY_TO_ENTITY_ENUM',
    offer_mode: 'UPPERCASE_ENUM',
    area_sqm: 'POSITIVE_NUMBER',
    land_area_sqm: 'POSITIVE_NUMBER',
  }),
  publication_validators: Object.freeze([
    'PROPERTY_TYPE_ALLOWED',
    'OFFER_MODE_ALLOWED',
    'AREA_PRESENT',
    'LOCATION_POLICY_VALID',
    'MODERATION_APPROVED',
  ]),
  discovery_validators: Object.freeze([
    'NOT_EXPIRED',
    'LOCATION_SCOPE_ALLOWED',
    'POLICY_VERSION_CURRENT',
  ]),
  sponsored_admission_validators: Object.freeze([
    'ORGANIC_ADMISSION_VALID',
    'MINIMUM_RELEVANCE_MET',
    'SPONSORED_LABEL_REQUIRED',
  ]),
  freshness_policy: Object.freeze({ max_age_seconds: 2592000 }),
  geography_semantics: Object.freeze({
    precision: 'COARSE',
    exact_private_coordinates_forbidden: true,
    allowlisted_fields: Object.freeze(['country', 'region', 'city', 'area']),
  }),
  price_value_semantics: Object.freeze({
    descriptive_only: true,
    transaction_authority: false,
    allowed_periods: Object.freeze(['TOTAL', 'MONTH', 'YEAR']),
  }),
  evidence_semantics: Object.freeze({
    ownership_claim_not_guaranteed_by_platform: true,
    freshness_required: true,
  }),
  compatibility_semantics: Object.freeze({ mode: 'DIMENSIONAL' }),
  ranking_feature_allowlist: Object.freeze([
    'location_area_fit',
    'property_type_fit',
    'offer_mode_fit',
    'size_range_fit',
    'price_range_fit',
    'availability_fit',
    'freshness',
  ]),
  explanation_reason_allowlist: Object.freeze([
    'LOCATION_AREA_FIT',
    'PROPERTY_TYPE_FIT',
    'OFFER_MODE_FIT',
    'SIZE_RANGE_FIT',
    'PRICE_RANGE_OVERLAP',
    'CURRENT_AVAILABILITY',
    'FRESHNESS',
    'SPONSORED_STATUS',
  ]),
  contact_modes: Object.freeze(['SOCIAL_MESSAGE']),
  disclosure_requirements: Object.freeze(['ADVERTISEMENT_ONLY', 'NO_TRANSACTION']),
  media_requirements: Object.freeze({ minimum_images: 0, policy_moderated: true }),
  country_overlays: Object.freeze({
    JO: Object.freeze({ contact_modes: Object.freeze(['SOCIAL_MESSAGE']) }),
  }),
  moderation_policy_hooks: Object.freeze(['REAL_ESTATE_CONTENT_POLICY']),
  retention_audit_class: 'MARKET_DISCOVERY',
  migration_compatibility_range: '^1.0.0',
  hard_invariants: Object.freeze({
    transaction_features_forbidden: true,
    sponsored_cannot_bypass_eligibility: true,
  }),
});

const ALLOWED_PROPERTY_TYPES = new Set(REAL_ESTATE_PHYSICS.allowed_entity_types);
const ALLOWED_OFFER_MODES = new Set(['SALE', 'RENT']);

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

function optionalPositiveNumber(value, field) {
  if (value == null) return undefined;
  return positiveNumber(value, field);
}

function normalizePropertyType(value) {
  const raw = nonEmptyString(value, 'property_type');
  const fromCategory = REAL_ESTATE_CATEGORY_TO_ENTITY[raw.toLowerCase()];
  const normalized = fromCategory || raw.toUpperCase();
  if (!ALLOWED_PROPERTY_TYPES.has(normalized)) {
    throw new Error(`property_type is not allowed by Real Estate Physics: ${normalized}`);
  }
  return normalized;
}

function normalizeOfferMode(value) {
  const normalized = nonEmptyString(value, 'offer_mode').toUpperCase();
  if (!ALLOWED_OFFER_MODES.has(normalized)) {
    throw new Error(`offer_mode is not allowed by Real Estate Physics: ${normalized}`);
  }
  return normalized;
}

function tokenize(...values) {
  const tokens = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    for (const token of value.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (token.length > 1 && !tokens.includes(token)) tokens.push(token);
    }
  }
  return tokens;
}

function compactObject(entries) {
  return Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined && value !== null));
}

function descriptivePriceFromListing(record, attributes) {
  if (record.numericPrice == null) return undefined;
  const amount = positiveNumber(record.numericPrice, 'numericPrice');
  const currency = nonEmptyString(record.currency, 'currency').toUpperCase();
  const period = attributes.pricePeriod == null
    ? 'TOTAL'
    : nonEmptyString(attributes.pricePeriod, 'sectorAttributes.pricePeriod').toUpperCase();
  if (!REAL_ESTATE_PHYSICS.price_value_semantics.allowed_periods.includes(period)) {
    throw new Error(`price period is not allowed: ${period}`);
  }
  return { amount, currency, period, descriptive_only: true };
}

function canonicalizeRealEstateRecord(record, context = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new TypeError('Real Estate Listing Contract record must be an object');
  }
  if (record.sector !== REAL_ESTATE_PHYSICS.sector_id) {
    throw new Error('Real Estate Lens accepts only records from the real-estate sector');
  }

  const attributesSource = record.sectorAttributes && typeof record.sectorAttributes === 'object' && !Array.isArray(record.sectorAttributes)
    ? record.sectorAttributes
    : {};
  const propertyType = normalizePropertyType(record.category);
  const offerMode = normalizeOfferMode(attributesSource.offerMode);
  const areaSqm = positiveNumber(attributesSource.areaSqm, 'sectorAttributes.areaSqm');
  const country = nonEmptyString(record.country, 'country').toUpperCase();
  const contact = context.contact && typeof context.contact === 'object' && !Array.isArray(context.contact)
    ? context.contact
    : {};
  const sponsored = context.sponsored === true;

  const contactCapability = contact.blocked_by_policy === true
    ? CONTACT_STATES.CONTACT_BLOCKED
    : CONTACT_STATES.CONTACT_REQUIRES_REVEAL;

  const attributes = compactObject({
    property_type: propertyType,
    offer_mode: offerMode,
    area_sqm: areaSqm,
    land_area_sqm: optionalPositiveNumber(attributesSource.landAreaSqm, 'sectorAttributes.landAreaSqm'),
    bedrooms: attributesSource.bedrooms,
    bathrooms: attributesSource.bathrooms,
    furnishing: attributesSource.furnishing,
    availability_from: attributesSource.availableFrom,
  });

  const coarseGeo = compactObject({
    country,
    region: context.region,
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
      sector_id: REAL_ESTATE_PHYSICS.sector_id,
      category_id: 'property',
      subcategory_id: record.category,
      entity_type: propertyType,
      offer_mode: offerMode,
      attributes,
    },
    discovery: compactObject({
      title: nonEmptyString(record.title, 'title'),
      summary: nonEmptyString(record.description, 'description'),
      searchable_tokens: tokenize(record.title, record.description, record.city, record.area, propertyType, offerMode),
      coarse_geo: coarseGeo,
      price_value: descriptivePriceFromListing(record, attributesSource),
      freshness_state: 'FRESH',
      expires_at: nonEmptyString(record.expiresAt, 'expiresAt'),
    }),
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

function copyRange(value) {
  if (value == null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('range must be an object');
  return compactObject({ min: value.min, max: value.max });
}

function copyPriceFilter(value) {
  if (value == null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('price filter must be an object');
  return compactObject({
    min: value.min,
    max: value.max,
    currency: typeof value.currency === 'string' ? value.currency.toUpperCase() : value.currency,
    period: typeof value.period === 'string' ? value.period.toUpperCase() : value.period,
  });
}

function mapRealEstateRetrieval(request = {}) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('Real Estate retrieval request must be an object');
  }

  return compactObject({
    property_type: request.property_type == null ? undefined : normalizePropertyType(request.property_type),
    offer_mode: request.offer_mode == null ? undefined : normalizeOfferMode(request.offer_mode),
    region: request.region,
    area: request.area,
    area_sqm: copyRange(request.area_sqm),
    bedrooms: copyRange(request.bedrooms),
    price: copyPriceFilter(request.price),
    availability_from: request.availability_from,
  });
}

const REAL_ESTATE_LENS = Object.freeze({
  physics: REAL_ESTATE_PHYSICS,
  canonicalize: canonicalizeRealEstateRecord,
  mapRetrieval: mapRealEstateRetrieval,
});

module.exports = {
  REAL_ESTATE_PHYSICS,
  REAL_ESTATE_LENS,
  canonicalizeRealEstateRecord,
  mapRealEstateRetrieval,
};
