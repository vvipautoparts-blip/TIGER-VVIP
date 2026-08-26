(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialProfile = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PROFILE_KEYS = new Set([
    "profile_id",
    "display_name",
    "avatar_url",
    "business_name",
    "location",
    "specialization",
    "business_description",
    "viewer_is_owner",
    "friends_count",
    "followers_count",
    "following_count",
    "posts_count",
    "is_friend",
    "can_message",
  ]);

  function validUuid(value) {
    return typeof value === "string" && UUID_PATTERN.test(value);
  }

  function validText(value, maximum) {
    return value === null
      || (typeof value === "string" && value.trim().length > 0 && value.length <= maximum);
  }

  function validCount(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function hasOnlyKeys(value, keys) {
    return Object.keys(value).every((key) => keys.has(key))
      && keys.size === Object.keys(value).length;
  }

  function normalizeLoadedProfile(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (!hasOnlyKeys(value, PROFILE_KEYS)) return null;
    if (!validUuid(value.profile_id)) return null;
    if (!validText(value.display_name, 160) || value.display_name === null) return null;
    if (!validText(value.avatar_url, 2048)
        || !validText(value.business_name, 200)
        || !validText(value.location, 200)
        || !validText(value.specialization, 200)
        || !validText(value.business_description, 2000)) {
      return null;
    }
    if (typeof value.viewer_is_owner !== "boolean"
        || typeof value.is_friend !== "boolean"
        || typeof value.can_message !== "boolean") {
      return null;
    }
    if (!validCount(value.friends_count)
        || !validCount(value.followers_count)
        || !validCount(value.following_count)
        || !validCount(value.posts_count)) {
      return null;
    }
    if (value.viewer_is_owner && (value.is_friend || value.can_message)) return null;
    if (value.can_message && !value.is_friend) return null;

    return Object.freeze({
      profile_id: value.profile_id,
      display_name: value.display_name,
      avatar_url: value.avatar_url,
      business_name: value.business_name,
      location: value.location,
      specialization: value.specialization,
      business_description: value.business_description,
      viewer_is_owner: value.viewer_is_owner,
      friends_count: value.friends_count,
      followers_count: value.followers_count,
      following_count: value.following_count,
      posts_count: value.posts_count,
      is_friend: value.is_friend,
      can_message: value.can_message,
    });
  }

  function normalizeProfileSurface(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.ok !== true) return null;
    if (!Object.hasOwn(value, "ok") || !Object.hasOwn(value, "status") || !Object.hasOwn(value, "profile")) return null;
    if (Object.keys(value).length !== 3) return null;

    if (value.status === "profile_unavailable" && value.profile === null) {
      return Object.freeze({ ok: true, status: "profile_unavailable", profile: null });
    }
    if (value.status !== "profile_loaded") return null;

    const profile = normalizeLoadedProfile(value.profile);
    if (!profile) return null;
    return Object.freeze({ ok: true, status: "profile_loaded", profile });
  }

  return Object.freeze({ normalizeProfileSurface });
});
