(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.VVIP_LISTING_CONTRACT = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const MAX_IMAGES = 7;
  const PAGINATION_DEFAULT_LIMIT = 20;
  const PAGINATION_MAX_LIMIT = 50;
  const STATUSES = Object.freeze(["draft", "ready", "published", "paused", "expired", "deleted"]);
  const CATEGORIES = Object.freeze({
    automotive: Object.freeze(["parts", "supplies", "tires", "oils", "batteries", "maintenance-tools", "maintenance", "electrical-hybrid", "roadside-service"]),
    materials: Object.freeze(["suppliers", "traders", "importers", "distributors", "wholesale", "retail", "markets", "materials-supplies", "other"]),
    "real-estate": Object.freeze(["house", "apartment", "land", "villa", "shop", "office", "warehouse", "farm", "commercial-property"])
  });
  const FIELD_ORDER = Object.freeze([
    "listingId", "ownerClerkUserId", "sector", "category", "title", "description",
    "numericPrice", "currency", "country", "city", "area", "sectorAttributes",
    "status", "images", "coverImageId", "createdAt", "updatedAt", "publishedAt",
    "expiresAt", "idempotencyKey", "schemaVersion"
  ]);
  const ERROR_MESSAGES = Object.freeze({
    required: "field_required", invalid_identifier: "invalid_identifier", invalid_sector: "invalid_sector",
    invalid_category: "invalid_category", invalid_title: "invalid_title", invalid_description: "invalid_description",
    invalid_price: "invalid_positive_price", invalid_currency: "invalid_currency", invalid_location: "invalid_location",
    invalid_attributes: "invalid_sector_attributes", invalid_status: "invalid_status", invalid_images: "invalid_images",
    too_many_images: "too_many_images", invalid_image_order: "invalid_image_order", invalid_cover_image: "invalid_cover_image",
    invalid_timestamp: "invalid_timestamp", invalid_idempotency_key: "invalid_idempotency_key", invalid_schema_version: "invalid_schema_version"
  });

  function normalizeDigits(value) {
    return String(value == null ? "" : value)
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  }

  function normalizePriceInput(value) {
    return normalizeDigits(value).replace(/[٬,\s]/g, "").replace(/٫/g, ".").trim();
  }

  function validatePrice(value) {
    const normalized = normalizePriceInput(value);
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return { valid: false, value: null };
    const numeric = Number(normalized);
    return Number.isSafeInteger(Math.round(numeric * 100)) && numeric > 0 && numeric <= 999999999999.99
      ? { valid: true, value: numeric }
      : { valid: false, value: null };
  }

  function sanitizeText(value, maxLength) {
    return String(value == null ? "" : value)
      .normalize("NFKC")
      .replace(/<(script|style|svg|iframe|object|template)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function normalizeTitle(value) {
    return sanitizeText(value, 80).toLocaleLowerCase("ar").replace(/[\u064b-\u065f\u0670]/g, "");
  }

  function sanitizeAttributes(value) {
    const result = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return result;
    Object.keys(value).sort().slice(0, 30).forEach((key) => {
      const safeKey = String(key).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
      const rawValue = value[key];
      if (!safeKey || !["string", "number", "boolean"].includes(typeof rawValue)) return;
      if (typeof rawValue === "number" && !Number.isFinite(rawValue)) return;
      const safeValue = typeof rawValue === "string" ? sanitizeText(rawValue, 140) : rawValue;
      if (safeValue !== "") result[safeKey] = safeValue;
    });
    return result;
  }

  function error(field, code) {
    return Object.freeze({ field, code, message: ERROR_MESSAGES[code] || code });
  }

  function identifierValid(value, max) {
    return typeof value === "string" && value.length >= 3 && value.length <= max && /^[A-Za-z0-9_-]+$/.test(value);
  }

  function timestampValid(value, nullable) {
    if (nullable && value == null) return true;
    return typeof value === "string" && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
  }

  function sanitizeImages(images) {
    if (!Array.isArray(images)) return [];
    return images.map((image) => ({
      imageId: sanitizeText(image && image.imageId, 100),
      position: image && image.position,
      altText: sanitizeText(image && image.altText, 140),
      mimeType: sanitizeText(image && image.mimeType, 40),
      width: Number.isInteger(image && image.width) ? image.width : null,
      height: Number.isInteger(image && image.height) ? image.height : null,
      sizeBytes: Number.isInteger(image && image.sizeBytes) ? image.sizeBytes : null
    }));
  }

  function validateListing(input) {
    const source = input && typeof input === "object" ? input : {};
    const errors = [];
    if (!identifierValid(source.listingId, 100)) errors.push(error("listingId", source.listingId ? "invalid_identifier" : "required"));
    if (!identifierValid(source.ownerClerkUserId, 200)) errors.push(error("ownerClerkUserId", source.ownerClerkUserId ? "invalid_identifier" : "required"));
    if (!Object.hasOwn(CATEGORIES, source.sector)) errors.push(error("sector", "invalid_sector"));
    if (!CATEGORIES[source.sector] || !CATEGORIES[source.sector].includes(source.category)) errors.push(error("category", "invalid_category"));
    const title = sanitizeText(source.title, 80);
    if (title.length < 2) errors.push(error("title", source.title ? "invalid_title" : "required"));
    const description = sanitizeText(source.description, 2000);
    if (description.length < 2) errors.push(error("description", source.description ? "invalid_description" : "required"));
    if (!validatePrice(source.numericPrice).valid) errors.push(error("numericPrice", "invalid_price"));
    if (typeof source.currency !== "string" || !/^[A-Z]{3}$/.test(source.currency)) errors.push(error("currency", "invalid_currency"));
    ["country", "city", "area"].forEach((field) => {
      if (sanitizeText(source[field], 100).length < 2) errors.push(error(field, source[field] ? "invalid_location" : "required"));
    });
    if (!source.sectorAttributes || typeof source.sectorAttributes !== "object" || Array.isArray(source.sectorAttributes)) errors.push(error("sectorAttributes", "invalid_attributes"));
    if (!STATUSES.includes(source.status)) errors.push(error("status", "invalid_status"));
    const imageInput = source.images === undefined ? [] : source.images;
    const images = sanitizeImages(imageInput);
    if (source.images !== undefined && !Array.isArray(source.images)) errors.push(error("images", "invalid_images"));
    else if (images.length > MAX_IMAGES) errors.push(error("images", "too_many_images"));
    const ids = new Set();
    const ordered = images.every((image, index) => identifierValid(image.imageId, 100) && image.position === index && !ids.has(image.imageId) && ids.add(image.imageId));
    if (images.length && !ordered) errors.push(error("images", "invalid_image_order"));
    if ((images.length && !ids.has(source.coverImageId)) || (!images.length && source.coverImageId != null)) errors.push(error("coverImageId", "invalid_cover_image"));
    ["createdAt", "updatedAt"].forEach((field) => { if (source[field] != null && !timestampValid(source[field], false)) errors.push(error(field, "invalid_timestamp")); });
    ["publishedAt", "expiresAt"].forEach((field) => { if (!timestampValid(source[field], true)) errors.push(error(field, "invalid_timestamp")); });
    if (!identifierValid(source.idempotencyKey, 200)) errors.push(error("idempotencyKey", source.idempotencyKey ? "invalid_idempotency_key" : "required"));
    if (source.schemaVersion !== SCHEMA_VERSION) errors.push(error("schemaVersion", "invalid_schema_version"));
    errors.sort((a, b) => FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field));
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function createListing(input, options) {
    const now = options && options.now ? options.now : new Date().toISOString();
    const source = Object.assign({}, input, {
      createdAt: input && input.createdAt ? input.createdAt : now,
      updatedAt: input && input.updatedAt ? input.updatedAt : now,
      publishedAt: input && input.publishedAt ? input.publishedAt : null,
      expiresAt: input && input.expiresAt ? input.expiresAt : null
    });
    const validation = validateListing(source);
    if (!validation.valid) return Object.freeze({ ok: false, errors: validation.errors });
    const listing = {
      listingId: source.listingId, ownerClerkUserId: source.ownerClerkUserId,
      sector: source.sector, category: source.category,
      title: sanitizeText(source.title, 80), normalizedTitle: normalizeTitle(source.title),
      description: sanitizeText(source.description, 2000), numericPrice: validatePrice(source.numericPrice).value,
      currency: source.currency, country: sanitizeText(source.country, 100), city: sanitizeText(source.city, 100), area: sanitizeText(source.area, 100),
      sectorAttributes: sanitizeAttributes(source.sectorAttributes), status: source.status,
      images: sanitizeImages(source.images).map(Object.freeze), coverImageId: source.coverImageId == null ? null : source.coverImageId,
      createdAt: source.createdAt, updatedAt: source.updatedAt, publishedAt: source.publishedAt, expiresAt: source.expiresAt,
      idempotencyKey: source.idempotencyKey, schemaVersion: source.schemaVersion
    };
    return Object.freeze({ ok: true, value: Object.freeze(listing) });
  }

  function normalizePagination(input) {
    const source = input && typeof input === "object" ? input : {};
    const parsed = Number.isInteger(source.limit) ? source.limit : PAGINATION_DEFAULT_LIMIT;
    return Object.freeze({
      limit: Math.max(1, Math.min(PAGINATION_MAX_LIMIT, parsed)),
      cursor: typeof source.cursor === "string" && source.cursor.length <= 200 ? source.cursor : null
    });
  }

  return Object.freeze({
    SCHEMA_VERSION, MAX_IMAGES, PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT, STATUSES, CATEGORIES,
    normalizeDigits, normalizePriceInput, validatePrice, sanitizeText, normalizeTitle, sanitizeAttributes,
    validateListing, createListing, normalizePagination
  });
});
