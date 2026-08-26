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
  const UNAVAILABLE_AUTHOR = "عضو غير متاح";
  const DEFAULT_RATE_LIMIT_MS = 5000;
  const MAX_RATE_LIMIT_MS = 60000;
  const BOUNDED_READ_FAILURES = new Set([
    "SOCIAL_FEED_STALE_CURSOR",
    "SOCIAL_FEED_SESSION_STALE",
    "SOCIAL_FEED_RETRYABLE",
  ]);
  const FEED_RANK_MODES = new Set(["normal", "prefer", "deprioritize"]);

  function failure(code) {
    return Object.freeze({ ok: false, code });
  }

  function rateLimitFailure(retryAfterMs) {
    const bounded = Number.isFinite(retryAfterMs)
      && retryAfterMs > 0
      && retryAfterMs <= MAX_RATE_LIMIT_MS
      ? Math.floor(retryAfterMs)
      : DEFAULT_RATE_LIMIT_MS;
    return Object.freeze({
      ok: false,
      code: "SOCIAL_RATE_LIMITED",
      retryAfterMs: bounded,
    });
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

  function validOpaqueCursor(value) {
    return typeof value === "string"
      && value.length >= 8
      && value.length <= 2048
      && /^[A-Za-z0-9_-]+$/.test(value);
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
        authorProfileId: input.author_profile_id,
        authorDisplayName: input.author_display_name,
        authorAvatarUrl: input.author_avatar_url,
        authorAvailable: input.author_available,
        body: body.value,
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

  function normalizeFeedPreferencesPayload(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)
        || Object.keys(input).some((key) => !["ok", "items"].includes(key))
        || input.ok !== true || !Array.isArray(input.items) || input.items.length > 500) {
      return failure("SOCIAL_FEED_PREFERENCES_INVALID");
    }

    const seen = new Set();
    const preferences = {
      mutedAuthors: [],
      snoozedUntilByAuthor: {},
      preferredAuthors: [],
      deprioritizedAuthors: [],
    };
    for (const row of input.items) {
      if (!row || typeof row !== "object" || Array.isArray(row)
          || Object.keys(row).length !== 4
          || !Object.hasOwn(row, "profile_id")
          || !Object.hasOwn(row, "muted")
          || !Object.hasOwn(row, "snoozed_until")
          || !Object.hasOwn(row, "rank_mode")
          || !validProfileId(row.profile_id) || seen.has(row.profile_id)
          || typeof row.muted !== "boolean"
          || (row.snoozed_until !== null && !validTimestamp(row.snoozed_until))
          || !FEED_RANK_MODES.has(row.rank_mode)) {
        return failure("SOCIAL_FEED_PREFERENCES_INVALID");
      }
      seen.add(row.profile_id);
      if (row.muted) preferences.mutedAuthors.push(row.profile_id);
      if (row.snoozed_until !== null) {
        preferences.snoozedUntilByAuthor[row.profile_id] = Date.parse(row.snoozed_until);
      }
      if (row.rank_mode === "prefer") preferences.preferredAuthors.push(row.profile_id);
      if (row.rank_mode === "deprioritize") preferences.deprioritizedAuthors.push(row.profile_id);
    }
    return Object.freeze({ ok: true, value: Object.freeze(preferences) });
  }

  function normalizeLimit(options) {
    const limit = options && Object.hasOwn(options, "limit") ? options.limit : DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return null;
    return limit;
  }

  function normalizeCursor(options) {
    if (!options || !Object.hasOwn(options, "cursor") || options.cursor === null || options.cursor === undefined) {
      return null;
    }
    return validOpaqueCursor(options.cursor) ? options.cursor : false;
  }

  function normalizeReadFailure(response) {
    if (!response || response.ok !== false || typeof response.code !== "string") {
      return failure("SOCIAL_FEED_READ_FAILED");
    }
    if (response.code === "SOCIAL_RATE_LIMITED") {
      return rateLimitFailure(response.retryAfterMs);
    }
    if (BOUNDED_READ_FAILURES.has(response.code)) {
      return failure(response.code);
    }
    return failure("SOCIAL_FEED_READ_FAILED");
  }

  function createSocialFeedReadModel(options) {
    const runtime = options && options.runtime;
    const preferences = options && options.preferences;
    const loadPreferences = options && typeof options.loadPreferences === "function"
      ? options.loadPreferences
      : null;
    const now = options && typeof options.now === "function" ? options.now : Date.now;

    return Object.freeze({
      load: async function (loadOptions) {
        if (!runtime || !runtime.posts || typeof runtime.posts.readFeed !== "function") {
          return failure("SOCIAL_FEED_RUNTIME_UNAVAILABLE");
        }

        const limit = normalizeLimit(loadOptions);
        if (limit === null) return failure("SOCIAL_FEED_INVALID_LIMIT");

        const cursor = normalizeCursor(loadOptions);
        if (cursor === false) return failure("SOCIAL_FEED_INVALID_CURSOR");

        let currentPreferences = preferences;
        if (loadPreferences) {
          let preferenceResponse;
          try {
            preferenceResponse = await loadPreferences();
          } catch (_) {
            preferenceResponse = null;
          }
          const preferenceValue = preferenceResponse && preferenceResponse.ok === true
            ? normalizeFeedPreferencesPayload(preferenceResponse.value)
            : null;
          if (!preferenceValue || preferenceValue.ok !== true) {
            return failure("SOCIAL_FEED_PREFERENCES_FAILED");
          }
          currentPreferences = preferenceValue.value;
        }

        let response;
        try {
          response = await runtime.posts.readFeed({ limit, cursor });
        } catch (_) {
          return failure("SOCIAL_FEED_READ_FAILED");
        }

        if (!response || response.ok !== true) {
          return normalizeReadFailure(response);
        }

        if (!response.value || typeof response.value !== "object" || Array.isArray(response.value)) {
          return failure("SOCIAL_FEED_INVALID_PAYLOAD");
        }

        const rows = response.value.items;
        const nextCursor = response.value.next_cursor === null || response.value.next_cursor === undefined
          ? null
          : response.value.next_cursor;

        if (!Array.isArray(rows) || (nextCursor !== null && !validOpaqueCursor(nextCursor))) {
          return failure("SOCIAL_FEED_INVALID_PAYLOAD");
        }

        const items = [];
        let rejectedCount = 0;
        const boundedRows = rows.slice(0, limit);
        rejectedCount += Math.max(0, rows.length - boundedRows.length);
        for (const row of boundedRows) {
          const normalized = normalizeFeedPost(row);
          if (!normalized.ok) {
            rejectedCount += 1;
            continue;
          }
          items.push(normalized.value);
        }

        const presentedItems = applyFeedPreferences(items, currentPreferences, now());
        return Object.freeze({
          ok: true,
          items: presentedItems,
          empty: presentedItems.length === 0 && nextCursor === null,
          nextCursor,
          rejectedCount,
        });
      },
    });
  }

  return Object.freeze({
    applyFeedPreferences,
    createSocialFeedReadModel,
    normalizeFeedPreferencesPayload,
    normalizeFeedPost,
  });
});
