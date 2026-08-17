'use strict';

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OWNER_SUBJECT = /^[A-Za-z0-9_-]{1,128}$/;

function fail(code, cause) {
  const error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  throw error;
}

function createMarketplaceListingOwnershipStore(options) {
  const client = options && options.client;
  if (!client || typeof client.from !== 'function') {
    fail('listing_ownership_store_unavailable');
  }

  async function getById(listingId, context) {
    const ownerClerkUserId = context && context.ownerClerkUserId;
    if (
      typeof listingId !== 'string'
      || !LISTING_ID.test(listingId)
      || typeof ownerClerkUserId !== 'string'
      || !OWNER_SUBJECT.test(ownerClerkUserId)
    ) {
      fail('listing_ownership_scope_invalid');
    }

    let result;
    try {
      result = await client
        .from('vvip_marketplace_listings')
        .select('listing_id,owner_subject')
        .eq('listing_id', listingId)
        .eq('owner_subject', ownerClerkUserId)
        .maybeSingle();
    } catch (cause) {
      fail('listing_ownership_store_unavailable', cause);
    }

    if (!result || result.error) {
      fail('listing_ownership_store_unavailable', result && result.error);
    }
    if (result.data == null) return null;

    const row = result.data;
    if (
      typeof row !== 'object'
      || Array.isArray(row)
      || row.listing_id !== listingId
      || row.owner_subject !== ownerClerkUserId
    ) {
      fail('listing_ownership_store_unavailable');
    }

    return Object.freeze({ listingId, ownerClerkUserId });
  }

  return Object.freeze({ getById });
}

exports.createMarketplaceListingOwnershipStore = createMarketplaceListingOwnershipStore;
Object.freeze(module.exports);
