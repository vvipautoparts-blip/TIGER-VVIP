(function (root, factory) {
  "use strict";
  const base = typeof module === "object" && module.exports
    ? require("./vvip-marketplace-repository.js")
    : root.VVIP_MARKETPLACE_REPOSITORY;
  const api = factory(root, base);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VVIP_MARKETPLACE_REPOSITORY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root, base) {
  "use strict";

  const PUBLIC_FEED_SELECT = "listing_id,active_market_country,sector,title,summary,price_minor,currency_code,location_label,contact_phone,whatsapp_enabled,media:vvip_marketplace_listing_media(canonical_storage_path,finalization_state,position,is_cover,alt_text)";

  if (!base || typeof base.createMarketplaceRepository !== "function") {
    throw new Error("MARKETPLACE_BASE_REPOSITORY_REQUIRED");
  }

  function hardeningError(code, cause) {
    const error = new Error(code);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function assertResult(result, code) {
    if (result && result.error) throw hardeningError(code, result.error);
    return result ? result.data : null;
  }

  function finalizerUrl(options) {
    const config = (options && options.config) || {};
    const raw = String(config.mediaFinalizerUrl || (root.__VVIP_RUNTIME_CONFIG__ && root.__VVIP_RUNTIME_CONFIG__.mediaFinalizerUrl) || "").trim();
    if (!raw) throw hardeningError("MEDIA_FINALIZER_URL_REQUIRED");
    let parsed;
    try { parsed = new URL(raw); } catch (_) { throw hardeningError("MEDIA_FINALIZER_URL_INVALID"); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) {
      throw hardeningError("MEDIA_FINALIZER_URL_INVALID");
    }
    return parsed.toString();
  }

  function requestFetch(options) {
    const fn = (options && options.fetch) || root.fetch;
    if (typeof fn !== "function") throw hardeningError("MEDIA_FINALIZER_TRANSPORT_REQUIRED");
    return fn.bind ? fn.bind(root) : fn;
  }

  async function finalizeMediaRow(options, mediaId) {
    const client = options && options.client;
    if (!client || typeof client.rpc !== "function") throw hardeningError("SUPABASE_CLIENT_REQUIRED");
    const grantResult = await client.rpc("vvip_marketplace_request_media_finalization", { target_media: mediaId });
    const grantData = assertResult(grantResult, "MEDIA_FINALIZATION_GRANT_FAILED");
    const grant = Array.isArray(grantData) ? grantData[0] : grantData;
    if (!grant || grant.media_id !== mediaId || !/^[0-9a-f]{64}$/.test(String(grant.finalization_token || ""))) {
      throw hardeningError("MEDIA_FINALIZATION_GRANT_INVALID");
    }

    const response = await requestFetch(options)(finalizerUrl(options), {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      body: JSON.stringify({ mediaId: mediaId, finalizationToken: grant.finalization_token })
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) { payload = null; }
    if (!response.ok || !payload || payload.ok !== true || payload.mediaId !== mediaId || payload.state !== "CANONICAL") {
      throw hardeningError("MEDIA_SERVER_FINALIZATION_FAILED");
    }
    return payload;
  }

  async function canonicalPublicList(options, filters) {
    const client = options && options.client;
    const source = filters && typeof filters === "object" ? filters : {};
    const country = String(source.countryCode || "").trim().toUpperCase().slice(0, 2);
    const sector = String(source.sector || "").trim().slice(0, 32);
    const search = String(source.search || "").trim().replace(/[%,]/g, "").slice(0, 80);
    const limit = Math.max(1, Math.min(60, Number(source.limit) || 30));

    let query = client
      .from("vvip_marketplace_listings")
      .select(PUBLIC_FEED_SELECT)
      .eq("status", "ACTIVE")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (country) query = query.eq("active_market_country", country);
    if (sector && sector.toLowerCase() !== "all") query = query.eq("sector", sector);
    if (search) query = query.ilike("title", "%" + search + "%");
    const rows = assertResult(await query, "LISTINGS_READ_FAILED") || [];

    const paths = [];
    rows.forEach(function (listing) {
      (listing.media || []).forEach(function (media) {
        if (media && media.finalization_state === "CANONICAL" && media.canonical_storage_path) {
          paths.push(media.canonical_storage_path);
        }
      });
    });
    const uniquePaths = Array.from(new Set(paths));
    let urlMap = new Map();
    if (uniquePaths.length) {
      const signed = await client.storage.from("listing-media-canonical").createSignedUrls(uniquePaths, 900);
      const signedRows = assertResult(signed, "MEDIA_SIGNING_FAILED") || [];
      urlMap = new Map(signedRows.map(function (entry) { return [entry.path, entry.signedUrl]; }));
    }

    return rows.map(function (listing) {
      return Object.assign({}, listing, {
        media: (listing.media || []).map(function (media) {
          const path = media && media.finalization_state === "CANONICAL" ? media.canonical_storage_path : null;
          return Object.assign({}, media, { url: path ? (urlMap.get(path) || "") : "" });
        })
      });
    });
  }

  function hardenRepository(repository, options) {
    if (!repository || typeof repository.createDraftWithMedia !== "function" || typeof repository.prepareForPublication !== "function") {
      throw hardeningError("MARKETPLACE_TRUSTED_PUBLICATION_API_REQUIRED");
    }
    if (typeof repository.submitForReview === "function" || typeof repository.createAndSubmit === "function") {
      throw hardeningError("MARKETPLACE_LEGACY_PUBLICATION_BYPASS_PRESENT");
    }

    const hardenedCreateDraftWithMedia = async function (input, images) {
      const draft = await repository.createDraftWithMedia(input, images);
      const client = options && options.client;
      const mediaResult = await client
        .from("vvip_marketplace_listing_media")
        .select("media_id,storage_path,position")
        .eq("listing_id", draft.listing_id)
        .order("position", { ascending: true });
      const mediaRows = assertResult(mediaResult, "MEDIA_FINALIZATION_ROWS_READ_FAILED") || [];
      try {
        for (const media of mediaRows) {
          await finalizeMediaRow(options, media.media_id);
        }
        return draft;
      } catch (error) {
        const rawPaths = mediaRows.map(function (media) { return media.storage_path; }).filter(Boolean);
        if (rawPaths.length) {
          try { await client.storage.from("listing-media").remove(rawPaths); } catch (_) { /* inaccessible canonical objects remain private orphans */ }
        }
        try { await client.from("vvip_marketplace_listings").delete().eq("listing_id", draft.listing_id); } catch (_) { /* fail closed */ }
        throw error;
      }
    };

    return Object.freeze(Object.assign({}, repository, {
      createDraftWithMedia: hardenedCreateDraftWithMedia,
      listPublic: function (filters) { return canonicalPublicList(options, filters); }
    }));
  }

  function createMarketplaceRepository(options) {
    return hardenRepository(base.createMarketplaceRepository(options), options || {});
  }

  return Object.freeze(Object.assign({}, base, {
    createMarketplaceRepository: createMarketplaceRepository,
    hardenRepository: hardenRepository,
    finalizeMediaRow: finalizeMediaRow
  }));
});
