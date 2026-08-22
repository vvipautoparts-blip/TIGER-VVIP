(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGEROneFieldPostCommit = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function frozen(value) {
    return Object.freeze(value);
  }

  function failure(code, semantic) {
    return frozen({
      ok: false,
      code,
      publication: null,
      semantic: semantic || frozen({ status: "not-run", code: null, capsule: null }),
    });
  }

  function canonicalDraft(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("ONE_FIELD_SOCIAL_DRAFT_REQUIRED");
    }
    return frozen({ body: input.body, audience: input.audience });
  }

  function createDualLanePostCommit(options) {
    const authorize = options && options.authorize;
    const enrich = options && options.enrich;
    const publish = options && options.publish;

    if (typeof authorize !== "function") throw new TypeError("ONE_FIELD_AUTHORIZE_REQUIRED");
    if (typeof enrich !== "function") throw new TypeError("ONE_FIELD_ENRICH_REQUIRED");
    if (typeof publish !== "function") throw new TypeError("ONE_FIELD_PUBLISH_REQUIRED");

    async function commit(input) {
      const draft = canonicalDraft(input && input.draft);
      const authority = input && input.authority;

      let authorization;
      try {
        authorization = await authorize(authority);
      } catch (_) {
        return failure("ONE_FIELD_POSTING_AS_AUTHORIZATION_FAILED");
      }

      if (!authorization || authorization.allowed !== true) {
        return failure((authorization && authorization.code) || "PERSONA_AUTHORITY_DENIED");
      }

      let semantic;
      try {
        const capsule = await enrich({
          canonicalDraft: draft,
          personaId: authorization.personaId || null,
        });
        semantic = frozen({ status: "ready", code: null, capsule: capsule || null });
      } catch (_) {
        semantic = frozen({
          status: "degraded",
          code: "ONE_FIELD_SEMANTIC_ENRICHMENT_UNAVAILABLE",
          capsule: null,
        });
      }

      let publication;
      try {
        publication = await publish(draft);
      } catch (_) {
        publication = null;
      }

      if (!publication || publication.ok !== true) {
        return failure((publication && publication.code) || "SOCIAL_POST_PUBLISH_FAILED", semantic);
      }

      return frozen({
        ok: true,
        code: "ONE_FIELD_SOCIAL_POST_PUBLISHED",
        publication: publication.value || null,
        semantic,
      });
    }

    return frozen({ commit });
  }

  return frozen({ createDualLanePostCommit });
});
