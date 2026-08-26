(function (root, factory) {
  "use strict";

  const textContract = root && root.TIGERSocialTextContract
    ? root.TIGERSocialTextContract
    : (typeof module === "object" && module.exports ? require("./text-contract.js") : null);
  const api = factory(textContract);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialFeed = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (textContract) {
  "use strict";

  const SOCIAL_AUDIENCES = new Set(["public", "friends", "only_me"]);
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;

  function failure(code) {
    return Object.freeze({ ok: false, code });
  }

  function validResourceId(value) {
    return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
  }

  function validUserSubject(value) {
    return typeof value === "string" && /^user_[A-Za-z0-9._:-]{1,122}$/.test(value);
  }

  function validTimestamp(value) {
    return typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
  }

  function normalizeFeedPost(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return failure("SOCIAL_FEED_INVALID_ROW");
    }

    if (!validResourceId(input.post_id)) {
      return failure("SOCIAL_FEED_INVALID_POST_ID");
    }

    if (!validUserSubject(input.author_subject)) {
      return failure("SOCIAL_FEED_INVALID_AUTHOR");
    }

    if (!textContract || typeof textContract.normalizeText !== "function") {
      return failure("SOCIAL_FEED_INVALID_BODY");
    }

    const body = textContract.normalizeText(input.body, 5000, "SOCIAL_FEED_INVALID_BODY");
    if (!body.ok) return failure(body.code);
    if (body.value !== input.body) return failure("SOCIAL_FEED_INVALID_BODY");

    if (!SOCIAL_AUDIENCES.has(input.audience)) {
      return failure("SOCIAL_FEED_INVALID_AUDIENCE");
    }

    if (!validTimestamp(input.created_at)) {
      return failure("SOCIAL_FEED_INVALID_CREATED_AT");
    }

    if (!validTimestamp(input.updated_at)) {
      return failure("SOCIAL_FEED_INVALID_UPDATED_AT");
    }

    return Object.freeze({
      ok: true,
      value: Object.freeze({
        id: input.post_id,
        authorSubject: input.author_subject,
        body: body.value,
        audience: input.audience,
        createdAt: input.created_at,
        updatedAt: input.updated_at,
      }),
    });
  }

  function normalizeLimit(options) {
    const limit = options && Object.hasOwn(options, "limit") ? options.limit : DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return null;
    return limit;
  }

  function createSocialFeedReadModel(options) {
    const runtime = options && options.runtime;

    return Object.freeze({
      load: async function (loadOptions) {
        if (!runtime || !runtime.posts || typeof runtime.posts.readFeed !== "function") {
          return failure("SOCIAL_FEED_RUNTIME_UNAVAILABLE");
        }

        const limit = normalizeLimit(loadOptions);
        if (limit === null) return failure("SOCIAL_FEED_INVALID_LIMIT");

        let response;
        try {
          response = await runtime.posts.readFeed({ limit });
        } catch (_) {
          return failure("SOCIAL_FEED_READ_FAILED");
        }

        if (!response || response.ok !== true) {
          return failure("SOCIAL_FEED_READ_FAILED");
        }

        if (!Array.isArray(response.value)) {
          return failure("SOCIAL_FEED_INVALID_PAYLOAD");
        }

        const items = [];
        let rejectedCount = 0;
        const boundedRows = response.value.slice(0, limit);
        rejectedCount += Math.max(0, response.value.length - boundedRows.length);
        for (const row of boundedRows) {
          const normalized = normalizeFeedPost(row);
          if (!normalized.ok) {
            rejectedCount += 1;
            continue;
          }
          items.push(normalized.value);
        }

        const frozenItems = Object.freeze(items);
        return Object.freeze({
          ok: true,
          items: frozenItems,
          empty: frozenItems.length === 0,
          rejectedCount,
        });
      },
    });
  }

  return Object.freeze({
    createSocialFeedReadModel,
    normalizeFeedPost,
  });
});
