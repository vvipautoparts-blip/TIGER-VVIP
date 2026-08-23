/**
 * VVIP TIGER Global V1 Listing API compatibility contract.
 *
 * Current authority comes from the canonical listing contract and explicit
 * capabilities. This module exists only for legacy snake_case API consumers;
 * it must not re-introduce a country master, whole-vehicle inventory, or
 * role-label authorization.
 */
'use strict';

const canonicalListing = require('./listing-contract.js');

const VALID_STATUSES = Object.freeze([
  'draft','pending_review','under_review','published','rejected','paused','expired','archived'
]);
const VALID_CONDITIONS = Object.freeze(['new','used','refurbished']);
const VALID_SECTORS = Object.freeze(['automotive','materials','real_estate','food']);

const LEGACY_SAFE_CATEGORY_ALIASES = Object.freeze({
  automotive: Object.freeze(['auto_parts','auto_services']),
  materials: Object.freeze(['build_materials','tools_supplies']),
  real_estate: Object.freeze(['apartments','villas','commercial','land']),
  food: Object.freeze([])
});

function canonicalSectorId(sectorId) {
  return sectorId === 'real_estate' ? 'real-estate' : sectorId;
}

function validCategoriesForSector(sectorId) {
  const canonicalSector = canonicalSectorId(sectorId);
  const canonical = canonicalListing.CATEGORIES[canonicalSector] || [];
  const legacy = LEGACY_SAFE_CATEGORY_ALIASES[sectorId] || [];
  return Object.freeze(Array.from(new Set([...canonical, ...legacy])));
}

const VALID_CATEGORY_IDS = Object.freeze(Object.fromEntries(
  VALID_SECTORS.map((sectorId) => [sectorId, validCategoriesForSector(sectorId)])
));

// Listing state machine remains compatibility-shaped, but every transition is
// separately authorized by explicit capability rather than a role string.
const LISTING_TRANSITIONS = Object.freeze({
  draft:          ['pending_review','archived'],
  pending_review: ['under_review','draft'],
  under_review:   ['published','rejected'],
  published:      ['paused','expired','archived'],
  rejected:       ['draft','archived'],
  paused:         ['published','archived'],
  expired:        ['archived'],
  archived:       []
});

const TRANSITION_CAPABILITIES = Object.freeze({
  'draft->pending_review': Object.freeze(['listing.submit.own']),
  'draft->archived': Object.freeze(['listing.manage.own']),
  'pending_review->under_review': Object.freeze(['listing.review.take']),
  'pending_review->draft': Object.freeze(['listing.submit.own']),
  'under_review->published': Object.freeze(['listing.review.publish']),
  'under_review->rejected': Object.freeze(['listing.review.reject']),
  'published->paused': Object.freeze(['listing.manage.own','listing.review.pause']),
  'published->expired': Object.freeze(['listing.lifecycle.expire']),
  'published->archived': Object.freeze(['listing.manage.own']),
  'rejected->draft': Object.freeze(['listing.manage.own']),
  'rejected->archived': Object.freeze(['listing.manage.own']),
  'paused->published': Object.freeze(['listing.review.publish']),
  'paused->archived': Object.freeze(['listing.manage.own']),
  'expired->archived': Object.freeze(['listing.lifecycle.archive'])
});

function validateListingInput(data) {
  const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const errors = [];
  const cleaned = {};

  if (!source.sector_id || !VALID_SECTORS.includes(String(source.sector_id))) {
    errors.push('sector_id must be one of: ' + VALID_SECTORS.join(', '));
  } else {
    cleaned.sector_id = String(source.sector_id);
  }

  if (!source.category_id || typeof source.category_id !== 'string') {
    errors.push('category_id is required');
  } else if (!cleaned.sector_id || !VALID_CATEGORY_IDS[cleaned.sector_id].includes(String(source.category_id))) {
    errors.push('category_id is not allowed for sector_id');
  } else {
    cleaned.category_id = String(source.category_id).substring(0,100);
  }

  if (!source.title_ar || typeof source.title_ar !== 'string') {
    errors.push('title_ar is required');
  } else {
    const t = String(source.title_ar).trim();
    if (t.length < 3 || t.length > 200) errors.push('title_ar must be 3-200 characters');
    else cleaned.title_ar = t;
  }

  if (source.title_en != null) {
    const t = String(source.title_en).trim();
    if (t.length > 200) errors.push('title_en max 200 chars');
    else cleaned.title_en = t || null;
  }

  if (source.description_ar != null) {
    const d = String(source.description_ar).trim();
    if (d.length > 5000) errors.push('description_ar max 5000 chars');
    else cleaned.description_ar = d || null;
  }

  if (source.price != null) {
    const p = Number(source.price);
    if (!Number.isFinite(p) || p < 0) errors.push('price must be non-negative');
    else if (p > 999999999) errors.push('price exceeds maximum');
    else cleaned.price = p;
  }

  if (source.currency == null || source.currency === '') {
    errors.push('currency is required');
  } else {
    const currency = String(source.currency).toUpperCase().trim();
    if (!/^[A-Z]{3}$/.test(currency)) errors.push('currency must be an ISO 4217 alpha-3 code');
    else cleaned.currency = currency;
  }

  if (source.country_code == null || source.country_code === '') {
    errors.push('country_code is required');
  } else {
    const cc = String(source.country_code).toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(cc)) errors.push('country_code must be ISO2');
    else cleaned.country_code = cc;
  }

  if (source.city != null) cleaned.city = String(source.city).trim().substring(0,100) || null;
  if (source.area != null) cleaned.area = String(source.area).trim().substring(0,100) || null;

  if (source.condition != null) {
    if (!VALID_CONDITIONS.includes(String(source.condition)))
      errors.push('condition must be: ' + VALID_CONDITIONS.join(', '));
    else cleaned.condition = String(source.condition);
  }

  if (source.images != null) {
    if (!Array.isArray(source.images)) { errors.push('images must be array'); cleaned.images = []; }
    else if (source.images.length > 7) { errors.push('max 7 images'); cleaned.images = []; }
    else {
      cleaned.images = source.images.filter(img => img && img.url)
        .map((img,i) => ({ url: String(img.url).substring(0,1000), order: Number.parseInt(img.order ?? i,10) }));
    }
  } else { cleaned.images = []; }

  if (source.attributes != null && typeof source.attributes === 'object' && !Array.isArray(source.attributes)) {
    const attrs = {};
    for (const [k,v] of Object.entries(source.attributes)) {
      if (['string','number','boolean'].includes(typeof v))
        attrs[String(k).substring(0,100)] = v;
    }
    cleaned.attributes = attrs;
  } else { cleaned.attributes = {}; }

  return { valid: errors.length === 0, errors, cleaned };
}

function normalizeCapabilities(authorizationContext) {
  if (!authorizationContext || typeof authorizationContext !== 'object' || Array.isArray(authorizationContext)) return [];
  if (!Array.isArray(authorizationContext.capabilities)) return [];
  return Array.from(new Set(authorizationContext.capabilities.filter((capability) => typeof capability === 'string')));
}

function validateStatusTransition(fromStatus, toStatus, authorizationContext) {
  if (!VALID_STATUSES.includes(fromStatus))
    return { allowed: false, reason: 'Invalid from_status: ' + fromStatus };
  if (!VALID_STATUSES.includes(toStatus))
    return { allowed: false, reason: 'Invalid to_status: ' + toStatus };
  const allowedTransitions = LISTING_TRANSITIONS[fromStatus] || [];
  if (!allowedTransitions.includes(toStatus))
    return { allowed: false, reason: `Transition from '${fromStatus}' to '${toStatus}' not permitted` };

  const transitionKey = `${fromStatus}->${toStatus}`;
  const requiredAny = TRANSITION_CAPABILITIES[transitionKey] || [];
  const held = normalizeCapabilities(authorizationContext);
  if (!requiredAny.some((capability) => held.includes(capability))) {
    return { allowed: false, reason: 'Explicit capability required for transition: ' + transitionKey };
  }
  return { allowed: true, reason: null };
}

function sanitizeListingForOwner(listing) {
  if (!listing) return null;
  const s = { ...listing }; delete s.moderator_id; return s;
}

function sanitizeListingForPublic(listing) {
  if (!listing) return null;
  const s = { ...listing };
  delete s.moderator_id; delete s.rejection_reason; delete s.clerk_user_id;
  return s;
}

module.exports = {
  validateListingInput, validateStatusTransition,
  sanitizeListingForOwner, sanitizeListingForPublic,
  VALID_STATUSES, VALID_CONDITIONS, VALID_SECTORS, VALID_CATEGORY_IDS,
  LISTING_TRANSITIONS, TRANSITION_CAPABILITIES
};
