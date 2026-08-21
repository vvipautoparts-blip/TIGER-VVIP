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
  const UNAVAILABLE_AUTHOR = "عضو غير متاح";

  function failure(code) {
    return Object.freeze({ ok: false, code });
  }

  function validResourceId(value) {
    return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
  }

  function validProfileId(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function validDisplayName(value) {
    return typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 160;
  }

  function validAvatarUrl(value) {
    return value === null || (typeof value === "string" && value.length <= 2048);
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

    if (typeof input.author_available !== "boolean") {
      return failure("SOCIAL_FEED_INVALID_AUTHOR");
    }

    if (input.author_available) {
      if (!validProfileId(input.author_profile_id)
          || !validDisplayName(input.author_display_name)
          || !validAvatarUrl(input.author_avatar_url)) {
        return failure("SOCIAL_FEED_INVALID_AUTHOR");
      }
    } else if (input.author_profile_id !== null
      || input.author_display_name !== UNAVAILABLE_AUTHOR
      || input.author_avatar_url !== null) {
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
        authorProfileId: input.author_profile_id,
        authorDisplayName: input.author_display_name,
        authorAvatarUrl: input.author_avatar_url,
        authorAvailable: input.author_available,
        body,
        audience: input.audience,
        createdAt: input.created_at,
        updatedAt: input.updated_at,
      }),
    });
  }

  function normalizePreferenceProfiles(value) {
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter(validProfileId));
  }

  function normalizeSnoozes(value) {
    const snoozes = new Map();
    if (!value || typeof value !== "object" || Array.isArray(value)) return snoozes;

    for (const [profileId, until] of Object.entries(value)) {
      if (validProfileId(profileId) && Number.isFinite(until)) {
        snoozes.set(profileId, until);
      }
    }
    return snoozes;
  }

  function applyFeedPreferences(authorizedItems, preferences, nowEpochMs) {
    if (!Array.isArray(authorizedItems)) return Object.freeze([]);

    const source = authorizedItems.filter((entry) => {
      if (!entry || typeof entry !== "object") return false;
      if (entry.authorAvailable === false) return entry.authorProfileId === null;
      return entry.authorAvailable === true && validProfileId(entry.authorProfileId);
    });
    const options = preferences && typeof preferences === "object" && !Array.isArray(preferences)
      ? preferences
      : {};
    const mutedAuthors = normalizePreferenceProfiles(options.mutedAuthors);
    const snoozedUntilByAuthor = normalizeSnoozes(options.snoozedUntilByAuthor);
    const preferredAuthors = normalizePreferenceProfiles(options.preferredAuthors);
    const deprioritizedAuthors = normalizePreferenceProfiles(options.deprioritizedAuthors);
    const now = Number.isFinite(nowEpochMs) ? nowEpochMs : 0;

    const preferred = [];
    const normal = [];
    const deprioritized = [];

    for (const entry of source) {
      const profileId = entry.authorAvailable ? entry.authorProfileId : null;
      if (profileId && mutedAuthors.has(profileId)) continue;

      const snoozedUntil = profileId ? snoozedUntilByAuthor.get(profileId) : null;
      if (Number.isFinite(snoozedUntil) && snoozedUntil > now) continue;

      if (profileId && preferredAuthors.has(profileId)) {
        preferred.push(entry);
      } else if (profileId && deprioritizedAuthors.has(profileId)) {
        deprioritized.push(entry);
      } else {
        normal.push(entry);
      }
    }

    return Object.freeze(preferred.concat(normal, deprioritized));
  }

  function normalizeLimit(options) {
    const limit = options && Object.hasOwn(options, "limit") ? options.limit : DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return null;
    return limit;
  }

  function createSocialFeedReadModel(options) {
    const runtime = options && options.runtime;
    const preferences = options && options.preferences;
    const now = options && typeof options.now === "function" ? options.now : Date.now;

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
        for (const row of response.value) {
          const normalized = normalizeFeedPost(row);
          if (!normalized.ok) return failure("SOCIAL_FEED_INVALID_ROW");
          items.push(normalized.value);
        }

        const presentedItems = applyFeedPreferences(items, preferences, now());
        return Object.freeze({
          ok: true,
          items: presentedItems,
          empty: presentedItems.length === 0,
        });
      },
    });
  }

  return Object.freeze({
    applyFeedPreferences,
    createSocialFeedReadModel,
    normalizeFeedPost,
  });
});
