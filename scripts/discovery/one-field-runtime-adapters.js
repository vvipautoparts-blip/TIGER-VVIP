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

  function normalizeEvidenceText(value) {
    return cleanText(value, 2200)
      .normalize("NFKC")
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
      .replace(/\u0640/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function noAddedSugarEvidence() {
    const text = normalizeEvidenceText(Array.from(arguments).filter(Boolean).join(" "));
    if (!text) return null;

    if (/(?:بدون|من\s+دون)\s+(?:سكر|السكر)|خال(?:ي|ية|يه)\s+من\s+(?:سكر|السكر)|غير\s+محلا(?:ة|ه)?/u.test(text)) {
      return true;
    }

    if (/(?:يحتوي|تحتوي)\s+(?:على\s+)?(?:سكر|السكر)|سكر\s+مضاف|محلا(?:ة|ه)?/u.test(text)) {
      return false;
    }

    return null;
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

    const summary = cleanText(source.summary, 2000);
    const phone = normalizePhone(source.contact_phone);
    const sector = source.sector == null ? null : cleanText(source.sector, 64) || null;

    return frozen({
      id: id,
      source: "marketplace",
      kind: "listing",
      label: label,
      summary: summary,
      facts: frozen({
        sector: sector,
        country: cleanText(source.active_market_country, 16) || null,
        location: cleanText(source.location_label, 120) || null,
        priceMinor: Number.isSafeInteger(source.price_minor) && source.price_minor > 0 ? source.price_minor : null,
        currencyCode: /^[A-Z]{3}$/.test(cleanText(source.currency_code, 3).toUpperCase())
          ? cleanText(source.currency_code, 3).toUpperCase()
          : null,
        noAddedSugar: noAddedSugarEvidence(label, summary)
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
        location: cleanText(source.location, 120) || null,
        noAddedSugar: noAddedSugarEvidence(summary)
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

    const summary = cleanText(source.body, 2000);
    return frozen({
      id: id,
      source: "social_posts",
      kind: "post",
      label: label,
      summary: summary,
      facts: frozen({
        authorDisplayName: label,
        noAddedSugar: noAddedSugarEvidence(summary)
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
