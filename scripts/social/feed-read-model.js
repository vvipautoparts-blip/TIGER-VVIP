(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialFeed = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
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

    if (typeof input.body !== "string") {
      return failure("SOCIAL_FEED_INVALID_BODY");
    }

    const body = input.body.trim();
    if (!body || body.length > 5000) {
      return failure("SOCIAL_FEED_INVALID_BODY");
    }

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
        body,
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

  function normalizeCursor(options) {
    if (!options || !Object.hasOwn(options, "cursor") || options.cursor === null) return null;
    if (typeof options.cursor !== "string" || options.cursor.length < 1 || options.cursor.length > 2048) {
      return undefined;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(options.cursor)) return undefined;
    return options.cursor;
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

        const cursor = normalizeCursor(loadOptions);
        if (cursor === undefined) return failure("SOCIAL_FEED_INVALID_CURSOR");

        let response;
        try {
          const request = { limit };
          if (cursor !== null) request.cursor = cursor;
          response = await runtime.posts.readFeed(request);
        } catch (_) {
          return failure("SOCIAL_FEED_READ_FAILED");
        }

        if (!response || response.ok !== true) {
          return failure("SOCIAL_FEED_READ_FAILED");
        }

        const legacyPayload = Array.isArray(response.value);
        const rows = legacyPayload ? response.value : response.value && response.value.items;
        const nextCursor = legacyPayload ? null : response.value && response.value.next_cursor;
        if (!Array.isArray(rows)) {
          return failure("SOCIAL_FEED_INVALID_PAYLOAD");
        }
        if (nextCursor !== null && (
          typeof nextCursor !== "string"
          || nextCursor.length < 1
          || nextCursor.length > 2048
          || !/^[A-Za-z0-9_-]+$/.test(nextCursor)
        )) return failure("SOCIAL_FEED_INVALID_PAYLOAD");

        const items = [];
        for (const row of rows) {
          const normalized = normalizeFeedPost(row);
          if (!normalized.ok) return failure("SOCIAL_FEED_INVALID_ROW");
          items.push(normalized.value);
        }

        const frozenItems = Object.freeze(items);
        const result = {
          ok: true,
          items: frozenItems,
          empty: frozenItems.length === 0,
        };
        if (!legacyPayload) result.nextCursor = nextCursor;
        return Object.freeze(result);
      },
    });
  }

  return Object.freeze({
    createSocialFeedReadModel,
    normalizeFeedPost,
  });
});
