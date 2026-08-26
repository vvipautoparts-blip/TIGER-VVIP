(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialTextContract = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Binding Social Core text contract. PostgreSQL mirrors this exact edge set
  // and counts Unicode code points with char_length(). No NFC/NFKC rewrite is
  // performed because user-authored spelling must remain intact.
  const EDGE_WHITESPACE = /^[\u0009-\u000D\u0020\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+|[\u0009-\u000D\u0020\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+$/gu;

  function trimEdgeWhitespace(value) {
    return value.replace(EDGE_WHITESPACE, "");
  }

  function codePointLength(value) {
    return Array.from(value).length;
  }

  function normalizeText(value, maximum, code) {
    if (typeof value !== "string" || !Number.isInteger(maximum) || maximum < 1) {
      return Object.freeze({ ok: false, code });
    }

    const normalized = trimEdgeWhitespace(value);
    const length = codePointLength(normalized);
    if (length < 1 || length > maximum) {
      return Object.freeze({ ok: false, code });
    }

    return Object.freeze({ ok: true, value: normalized, length });
  }

  return Object.freeze({ trimEdgeWhitespace, codePointLength, normalizeText });
});
