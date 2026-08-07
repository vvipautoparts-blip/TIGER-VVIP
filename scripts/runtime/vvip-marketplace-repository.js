(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VVIP_MARKETPLACE_REPOSITORY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  function marketplaceError(code, cause) {
    const error = new Error(code);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function text(value, maximum) {
    return String(value == null ? "" : value)
      .replace(/<[^>]*>/g, " ")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maximum);
  }

  function normalizePriceMinor(value) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0 || number > 99999999999999) {
      throw marketplaceError("LISTING_PRICE_INVALID");
    }
    return number;
  }

  function normalizeDraft(input, config) {
    const source = input && typeof input === "object" ? input : {};
    const sector = text(source.sector, 32);
    if (!["automotive", "materials", "real-estate"].includes(sector)) {
      throw marketplaceError("LISTING_SECTOR_INVALID");
    }
    const title = text(source.title, 80);
    const location = text(source.location || source.location_label, 120);
    const country = text(source.activeMarketCountry || source.active_market_country || config.defaultCountryCode, 16).toUpperCase();
    const currency = text(source.currencyCode || source.currency_code, 16).toUpperCase();
    if (title.length < 2) throw marketplaceError("LISTING_TITLE_INVALID");
    if (!location) throw marketplaceError("LISTING_LOCATION_INVALID");
    if (!/^[A-Z]{2}$/.test(country)) throw marketplaceError("LISTING_COUNTRY_INVALID");
    if (!/^[A-Z]{3}$/.test(currency)) throw marketplaceError("LISTING_CURRENCY_INVALID");
    const specifications = source.specifications && typeof source.specifications === "object" && !Array.isArray(source.specifications)
      ? source.specifications
      : source.sectorDetails && typeof source.sectorDetails === "object"
        ? source.sectorDetails
        : {};
    const normalizedSpecs = {};
    Object.keys(specifications).slice(0, 30).forEach(function (key) {
      const safeKey = text(key, 64);
      const safeValue = text(specifications[key], 240);
      if (safeKey && safeValue) normalizedSpecs[safeKey] = safeValue;
    });
    const phone = text(source.contactPhone || source.contact_phone, 32) || null;
    return Object.freeze({
      active_market_country: country,
      sector: sector,
      title: title,
      summary: text(source.summary, 2000),
      specifications: normalizedSpecs,
      price_minor: normalizePriceMinor(source.priceMinor || source.price_minor),
      currency_code: currency,
      location_label: location,
      contact_phone: phone,
      whatsapp_enabled: Boolean(source.whatsappEnabled || source.whatsapp_enabled) && Boolean(phone),
      status: "DRAFT"
    });
  }

  function extensionForMime(mime) {
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    throw marketplaceError("MEDIA_MIME_INVALID");
  }

  function actorId(clerk) {
    const id = clerk && clerk.user && clerk.user.id;
    if (!id || typeof id !== "string" || id.length > 128) throw marketplaceError("AUTH_REQUIRED");
    return id;
  }

  function assertClientResult(result, code) {
    if (result && result.error) throw marketplaceError(code, result.error);
    return result ? result.data : null;
  }

  function createMarketplaceRepository(options) {
    const client = options && options.client;
    const clerk = options && options.clerk;
    const config = (options && options.config) || {};
    const ids = (options && options.randomUUID) || function () {
      if (root.crypto && typeof root.crypto.randomUUID === "function") return root.crypto.randomUUID();
      throw marketplaceError("UUID_GENERATOR_UNAVAILABLE");
    };
    if (!client || typeof client.from !== "function" || !client.storage) {
      throw marketplaceError("SUPABASE_CLIENT_REQUIRED");
    }

    async function signedMedia(rows) {
      const paths = [];
      (rows || []).forEach(function (listing) {
        (listing.media || []).forEach(function (media) {
          if (media.storage_path) paths.push(media.storage_path);
        });
      });
      if (!paths.length) return rows || [];
      const signed = await client.storage.from("listing-media").createSignedUrls(paths, 900);
      const signedRows = assertClientResult(signed, "MEDIA_SIGNING_FAILED") || [];
      const urlMap = new Map(signedRows.map(function (entry) { return [entry.path, entry.signedUrl]; }));
      return (rows || []).map(function (listing) {
        return Object.assign({}, listing, {
          media: (listing.media || []).map(function (media) {
            return Object.assign({}, media, { url: urlMap.get(media.storage_path) || "" });
          })
        });
      });
    }

    async function listPublic(filters) {
      const input = filters || {};
      let query = client
        .from("vvip_marketplace_listings")
        .select("listing_id,active_market_country,sector,title,summary,specifications,price_minor,currency_code,location_label,contact_phone,whatsapp_enabled,published_at,media:vvip_marketplace_listing_media(media_id,storage_path,mime_type,width,height,position,is_cover,alt_text)")
        .eq("status", "ACTIVE")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(Math.max(1, Math.min(60, Number(input.limit) || 30)));
      if (input.countryCode) query = query.eq("active_market_country", text(input.countryCode, 2).toUpperCase());
      if (input.sector && input.sector !== "all") query = query.eq("sector", text(input.sector, 32));
      const search = text(input.search, 80);
      if (search) query = query.ilike("title", "%" + search.replace(/[%,]/g, "") + "%");
      const rows = assertClientResult(await query, "LISTINGS_READ_FAILED") || [];
      return signedMedia(rows);
    }

    async function listMine() {
      const owner = actorId(clerk);
      const result = await client
        .from("vvip_marketplace_listings")
        .select("listing_id,active_market_country,sector,title,summary,price_minor,currency_code,location_label,status,rejection_reason,created_at,updated_at")
        .eq("owner_subject", owner)
        .order("updated_at", { ascending: false })
        .limit(100);
      return assertClientResult(result, "MY_LISTINGS_READ_FAILED") || [];
    }

    async function createDraft(input) {
      actorId(clerk);
      const payload = normalizeDraft(input, config);
      const result = await client.from("vvip_marketplace_listings").insert(payload).select("*").single();
      return assertClientResult(result, "LISTING_CREATE_FAILED");
    }

    async function uploadMedia(listingId, images) {
      const owner = actorId(clerk);
      const list = Array.from(images || []);
      if (list.length > 7) throw marketplaceError("MEDIA_LIMIT_EXCEEDED");
      const uploaded = [];
      try {
        const rows = [];
        for (let index = 0; index < list.length; index += 1) {
          const image = list[index];
          const blob = image && image.blob;
          const mime = String((image && (image.mimeType || image.type)) || (blob && blob.type) || "");
          if (!blob || typeof blob.size !== "number") throw marketplaceError("MEDIA_BLOB_REQUIRED");
          const extension = extensionForMime(mime);
          const path = owner + "/" + listingId + "/" + ids() + "." + extension;
          const upload = await client.storage.from("listing-media").upload(path, blob, {
            contentType: mime,
            upsert: false,
            cacheControl: "31536000"
          });
          assertClientResult(upload, "MEDIA_UPLOAD_FAILED");
          uploaded.push(path);
          rows.push({
            listing_id: listingId,
            owner_subject: owner,
            storage_path: path,
            mime_type: mime,
            byte_size: blob.size,
            width: Number(image.width),
            height: Number(image.height),
            position: index,
            is_cover: Boolean(image.isCover) || index === 0,
            alt_text: text(image.altText || "صورة الإعلان", 160)
          });
        }
        if (rows.length) {
          const inserted = await client.from("vvip_marketplace_listing_media").insert(rows).select("*");
          return assertClientResult(inserted, "MEDIA_METADATA_INSERT_FAILED") || [];
        }
        return [];
      } catch (error) {
        if (uploaded.length) {
          try { await client.storage.from("listing-media").remove(uploaded); } catch (_) { /* best-effort rollback */ }
        }
        throw error;
      }
    }

    async function submitForReview(listingId) {
      actorId(clerk);
      const result = await client
        .from("vvip_marketplace_listings")
        .update({ status: "PENDING_REVIEW" })
        .eq("listing_id", listingId)
        .select("*")
        .single();
      return assertClientResult(result, "LISTING_SUBMIT_FAILED");
    }

    async function createAndSubmit(input, images) {
      const draft = await createDraft(input);
      try {
        await uploadMedia(draft.listing_id, images);
        return await submitForReview(draft.listing_id);
      } catch (error) {
        try {
          await client.from("vvip_marketplace_listings").delete().eq("listing_id", draft.listing_id);
        } catch (_) { /* RLS-safe cleanup attempt */ }
        throw error;
      }
    }

    async function toggleFavorite(listingId, favorite) {
      const owner = actorId(clerk);
      if (favorite) {
        const result = await client.from("vvip_marketplace_favorites").upsert({
          owner_subject: owner,
          listing_id: listingId
        });
        assertClientResult(result, "FAVORITE_WRITE_FAILED");
        return true;
      }
      const result = await client
        .from("vvip_marketplace_favorites")
        .delete()
        .eq("owner_subject", owner)
        .eq("listing_id", listingId);
      assertClientResult(result, "FAVORITE_DELETE_FAILED");
      return false;
    }

    async function reviewListing(listingId, decision, reason) {
      actorId(clerk);
      const result = await client.rpc("vvip_marketplace_review_listing", {
        target_listing: listingId,
        decision: decision,
        decision_reason: reason || null
      });
      return assertClientResult(result, "LISTING_REVIEW_FAILED");
    }

    return Object.freeze({
      listPublic,
      listMine,
      createDraft,
      uploadMedia,
      submitForReview,
      createAndSubmit,
      toggleFavorite,
      reviewListing
    });
  }

  return Object.freeze({
    createMarketplaceRepository,
    normalizeDraft,
    normalizePriceMinor,
    extensionForMime,
    marketplaceError
  });
});
