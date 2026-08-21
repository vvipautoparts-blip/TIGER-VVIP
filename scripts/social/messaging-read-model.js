(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERMessagingReadModel = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const UNAVAILABLE_MEMBER = "عضو غير متاح";
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
  const INTERNAL_IDENTITY_KEY = /(?:^|_)subject$/i;

  function validUuid(value) {
    return typeof value === "string" && UUID_PATTERN.test(value);
  }

  function validTimestamp(value) {
    return typeof value === "string"
      && TIMESTAMP_PATTERN.test(value)
      && Number.isFinite(Date.parse(value));
  }

  function containsInternalIdentity(row) {
    return Object.keys(row).some((key) => INTERNAL_IDENTITY_KEY.test(key));
  }

  function validActivePresentation(row) {
    return validUuid(row.sender_profile_id)
      && typeof row.sender_display_name === "string"
      && row.sender_display_name.trim().length > 0
      && row.sender_display_name.length <= 200
      && (row.sender_avatar_url === null
        || (typeof row.sender_avatar_url === "string" && row.sender_avatar_url.length <= 2048));
  }

  function normalizeMessageRow(row) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    if (containsInternalIdentity(row)) return null;
    if (!validUuid(row.message_id) || !validUuid(row.conversation_id)) return null;
    if (!Number.isSafeInteger(row.sequence) || row.sequence < 1) return null;
    if (typeof row.body !== "string" || row.body.length < 1 || row.body.length > 4000) return null;
    if (!validTimestamp(row.created_at)) return null;
    if (typeof row.sender_available !== "boolean" || typeof row.viewer_is_sender !== "boolean") return null;

    if (row.sender_available && !validActivePresentation(row)) return null;

    return Object.freeze({
      message_id: row.message_id,
      conversation_id: row.conversation_id,
      sequence: row.sequence,
      sender_profile_id: row.sender_available ? row.sender_profile_id : null,
      sender_display_name: row.sender_available ? row.sender_display_name : UNAVAILABLE_MEMBER,
      sender_avatar_url: row.sender_available ? row.sender_avatar_url : null,
      sender_available: row.sender_available,
      viewer_is_sender: row.viewer_is_sender,
      body: row.body,
      created_at: row.created_at,
    });
  }

  function normalizeMessageRows(rows) {
    if (!Array.isArray(rows)) return null;

    const normalized = [];
    for (const row of rows) {
      const message = normalizeMessageRow(row);
      if (!message) return null;
      normalized.push(message);
    }

    return Object.freeze(normalized);
  }

  return Object.freeze({
    UNAVAILABLE_MEMBER,
    normalizeMessageRow,
    normalizeMessageRows,
  });
});
