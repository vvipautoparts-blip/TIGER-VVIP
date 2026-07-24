/**
 * VVIP TIGER Global V1 Listing API Contract
 * Server-side validation, state machine, and sanitization.
 * Auth: Clerk JWT (auth.jwt() ->> 'sub' via Supabase RLS)
 */
'use strict';

const VALID_STATUSES = Object.freeze([
  'draft','pending_review','under_review','published','rejected','paused','expired','archived'
]);
const VALID_CURRENCIES = Object.freeze(['JOD','SAR','AED','USD','EUR']);
const VALID_CONDITIONS = Object.freeze(['new','used','refurbished','for_rent']);
const VALID_SECTORS = Object.freeze(['automotive','materials','real_estate']);

// Listing state machine
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

function validateListingInput(data) {
  const errors = [];
  const cleaned = {};

  if (!data.sector_id || !VALID_SECTORS.includes(String(data.sector_id)))
    errors.push('sector_id must be one of: ' + VALID_SECTORS.join(', '));
  else cleaned.sector_id = String(data.sector_id);

  if (!data.category_id || typeof data.category_id !== 'string')
    errors.push('category_id is required');
  else cleaned.category_id = String(data.category_id).substring(0,100);

  if (!data.title_ar || typeof data.title_ar !== 'string') {
    errors.push('title_ar is required');
  } else {
    const t = String(data.title_ar).trim();
    if (t.length < 3 || t.length > 200) errors.push('title_ar must be 3-200 characters');
    else cleaned.title_ar = t;
  }

  if (data.title_en != null) {
    const t = String(data.title_en).trim();
    if (t.length > 200) errors.push('title_en max 200 chars');
    else cleaned.title_en = t || null;
  }

  if (data.description_ar != null) {
    const d = String(data.description_ar).trim();
    if (d.length > 5000) errors.push('description_ar max 5000 chars');
    else cleaned.description_ar = d || null;
  }

  if (data.price != null) {
    const p = parseFloat(data.price);
    if (isNaN(p) || p < 0) errors.push('price must be non-negative');
    else if (p > 999999999) errors.push('price exceeds maximum');
    else cleaned.price = p;
  }

  cleaned.currency = VALID_CURRENCIES.includes(String(data.currency))
    ? String(data.currency) : 'JOD';

  if (data.country_code != null) {
    const cc = String(data.country_code).toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(cc)) errors.push('country_code must be ISO2');
    else cleaned.country_code = cc;
  } else { cleaned.country_code = 'JO'; }

  if (data.city != null) cleaned.city = String(data.city).trim().substring(0,100) || null;
  if (data.area != null) cleaned.area = String(data.area).trim().substring(0,100) || null;

  if (data.condition != null) {
    if (!VALID_CONDITIONS.includes(String(data.condition)))
      errors.push('condition must be: ' + VALID_CONDITIONS.join(', '));
    else cleaned.condition = String(data.condition);
  }

  if (data.images != null) {
    if (!Array.isArray(data.images)) { errors.push('images must be array'); cleaned.images = []; }
    else if (data.images.length > 7) { errors.push('max 7 images'); cleaned.images = []; }
    else {
      cleaned.images = data.images.filter(img => img && img.url)
        .map((img,i) => ({ url: String(img.url).substring(0,1000), order: parseInt(img.order||i,10) }));
    }
  } else { cleaned.images = []; }

  if (data.attributes != null && typeof data.attributes === 'object' && !Array.isArray(data.attributes)) {
    const attrs = {};
    for (const [k,v] of Object.entries(data.attributes)) {
      if (['string','number','boolean'].includes(typeof v))
        attrs[String(k).substring(0,100)] = v;
    }
    cleaned.attributes = attrs;
  } else { cleaned.attributes = {}; }

  return { valid: errors.length === 0, errors, cleaned };
}

function validateStatusTransition(fromStatus, toStatus, actorRole) {
  if (!VALID_STATUSES.includes(fromStatus))
    return { allowed: false, reason: 'Invalid from_status: ' + fromStatus };
  if (!VALID_STATUSES.includes(toStatus))
    return { allowed: false, reason: 'Invalid to_status: ' + toStatus };
  const allowed = LISTING_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus))
    return { allowed: false, reason: `Transition from '${fromStatus}' to '${toStatus}' not permitted` };
  if (actorRole === 'owner' && toStatus === 'published')
    return { allowed: false, reason: 'Publication requires moderator approval' };
  if (actorRole === 'owner' && toStatus === 'under_review')
    return { allowed: false, reason: 'under_review set by moderators only' };
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
  VALID_STATUSES, VALID_CURRENCIES, VALID_CONDITIONS, VALID_SECTORS, LISTING_TRANSITIONS
};
