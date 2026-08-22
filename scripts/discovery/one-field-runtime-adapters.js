(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGEROneFieldRuntimeAdapters = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function frozen(value) {
    return Object.freeze(value);
  }

  function cleanText(value, maximum) {
    return String(value == null ? "" : value)
      .replace(/<[^>]*>/g, " ")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maximum);
  }

  function stableId(value) {
    const id = cleanText(value, 128);
    return /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id) ? id : "";
  }

  function normalizePhone(value) {
    const source = cleanText(value, 32);
    if (!source) return null;
    const hasPlus = source.startsWith("+");
    const digits = source.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return null;
    return (hasPlus ? "+" : "") + digits;
  }

  function intentText(intent) {
    const source = intent && typeof intent === "object" ? intent : {};
    return cleanText(source.text || source.normalizedQuery || source.query || "", 160);
  }

  function adapterError() {
    const error = new Error("ONE_FIELD_SOCIAL_SEARCH_UNAVAILABLE");
    error.code = "ONE_FIELD_SOCIAL_SEARCH_UNAVAILABLE";
    return error;
  }

  function projectMarketplaceRow(row) {
    const source = row && typeof row === "object" && !Array.isArray(row) ? row : {};
    const id = stableId(source.listing_id);
    const label = cleanText(source.title, 160);
    if (!id || !label) return null;

    const phone = normalizePhone(source.contact_phone);
    const sector = source.sector == null ? null : cleanText(source.sector, 64) || null;

    return frozen({
      id: id,
      source: "marketplace",
      kind: "listing",
      label: label,
      summary: cleanText(source.summary, 2000),
      facts: frozen({
        sector: sector,
        country: cleanText(source.active_market_country, 16) || null,
        location: cleanText(source.location_label, 120) || null,
        priceMinor: Number.isSafeInteger(source.price_minor) && source.price_minor > 0 ? source.price_minor : null,
        currencyCode: /^[A-Z]{3}$/.test(cleanText(source.currency_code, 3).toUpperCase())
          ? cleanText(source.currency_code, 3).toUpperCase()
          : null
      }),
      contact: phone ? frozen({ kind: "phone", value: phone }) : null,
      sponsored: false
    });
  }

  function projectSocialPerson(row) {
    const source = row && typeof row === "object" && !Array.isArray(row) ? row : {};
    const id = stableId(source.profile_id);
    const label = cleanText(source.display_name, 160);
    if (!id || !label) return null;

    const businessName = cleanText(source.business_name, 160);
    const specialization = cleanText(source.specialization, 160);
    const summary = [businessName, specialization].filter(Boolean).join(" · ");

    return frozen({
      id: id,
      source: "social_people",
      kind: "person",
      label: label,
      summary: summary,
      facts: frozen({
        businessName: businessName || null,
        specialization: specialization || null,
        location: cleanText(source.location, 120) || null
      }),
      contact: null,
      sponsored: false
    });
  }

  function projectSocialPost(row) {
    const source = row && typeof row === "object" && !Array.isArray(row) ? row : {};
    const id = stableId(source.post_id);
    const label = cleanText(source.author_display_name, 160);
    if (!id || !label) return null;

    return frozen({
      id: id,
      source: "social_posts",
      kind: "post",
      label: label,
      summary: cleanText(source.body, 2000),
      facts: frozen({
        authorDisplayName: label
      }),
      contact: null,
      sponsored: false
    });
  }

  function createMarketplaceCandidateAdapter(repository) {
    if (!repository || typeof repository.listPublic !== "function") {
      throw new TypeError("ONE_FIELD_MARKETPLACE_REPOSITORY_REQUIRED");
    }

    async function discover(request) {
      const input = request && typeof request === "object" ? request : {};
      const query = intentText(input.intent);
      if (!query) return frozen([]);

      const rows = await repository.listPublic({ search: query, limit: 60 });
      if (!Array.isArray(rows)) return frozen([]);

      return frozen(rows
        .slice(0, 60)
        .map(projectMarketplaceRow)
        .filter(Boolean));
    }

    return frozen({
      name: "marketplace",
      discover: discover
    });
  }

  function createSocialSearchCandidateAdapter(searchApi, mode) {
    const kind = mode === "people" ? "people" : mode === "posts" ? "posts" : null;
    if (!kind || !searchApi || typeof searchApi[kind] !== "function") {
      throw new TypeError("ONE_FIELD_SOCIAL_SEARCH_ADAPTER_REQUIRED");
    }

    async function discover(request) {
      const input = request && typeof request === "object" ? request : {};
      const query = intentText(input.intent);
      if (!query) return frozen([]);

      let result;
      try {
        result = await searchApi[kind](query, { limit: 20 });
      } catch (_) {
        throw adapterError();
      }

      if (!result || result.ok !== true || !result.value || !Array.isArray(result.value.items)) {
        throw adapterError();
      }

      const projector = kind === "people" ? projectSocialPerson : projectSocialPost;
      return frozen(result.value.items
        .slice(0, 20)
        .map(projector)
        .filter(Boolean));
    }

    return frozen({
      name: kind === "people" ? "social_people" : "social_posts",
      discover: discover
    });
  }

  return frozen({
    createMarketplaceCandidateAdapter: createMarketplaceCandidateAdapter,
    createSocialSearchCandidateAdapter: createSocialSearchCandidateAdapter
  });
});
