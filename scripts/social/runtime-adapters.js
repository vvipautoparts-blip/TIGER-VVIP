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
    root.TIGERSocialRuntime = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (textContract) {
  "use strict";

  const SOCIAL_POSTS_TABLE = "vvip_social_posts";
  const SOCIAL_RELATIONSHIPS_TABLE = "vvip_social_relationships";
  const SOCIAL_AUDIENCES = Object.freeze(["public", "friends", "only_me"]);
  const SOCIAL_REACTION_TYPES = Object.freeze([
    "like",
    "love",
    "support",
    "haha",
    "wow",
    "sad",
    "angry",
  ]);
  const POST_SELECT = "post_id,author_subject,body,audience,created_at,updated_at";
  const RELATIONSHIP_SELECT = "relationship_id,requester_subject,addressee_subject,relationship_state,created_at,updated_at";
  const COMMENT_PAGE_LIMIT = 20;

  function frozenFailure(code) {
    return Object.freeze({ ok: false, code });
  }

  function frozenSuccess(value) {
    return Object.freeze({ ok: true, value });
  }

  function hasClient(client) {
    return Boolean(client && typeof client.from === "function");
  }

  function hasRpcClient(client) {
    return Boolean(client && typeof client.rpc === "function");
  }

  function validAudience(value) {
    return typeof value === "string" && SOCIAL_AUDIENCES.includes(value);
  }

  function validReactionType(value) {
    return typeof value === "string" && SOCIAL_REACTION_TYPES.includes(value);
  }

  function validUserSubject(value) {
    return typeof value === "string" && /^user_[A-Za-z0-9._:-]{1,122}$/.test(value);
  }

  function validResourceId(value) {
    return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
  }

  function validPostUuid(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function normalizeCommentBody(value) {
    if (!textContract || typeof textContract.normalizeText !== "function") {
      return { ok: false, code: "SOCIAL_INVALID_COMMENT_BODY" };
    }
    return textContract.normalizeText(value, 2000, "SOCIAL_INVALID_COMMENT_BODY");
  }

  function normalizePost(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return { ok: false, code: "SOCIAL_INVALID_POST" };
    }

    if (!textContract || typeof textContract.normalizeText !== "function") {
      return { ok: false, code: "SOCIAL_INVALID_POST_BODY" };
    }

    const body = textContract.normalizeText(input.body, 5000, "SOCIAL_INVALID_POST_BODY");
    if (!body.ok) return body;

    if (!validAudience(input.audience)) {
      return { ok: false, code: "SOCIAL_INVALID_POST_AUDIENCE" };
    }

    return {
      ok: true,
      payload: Object.freeze({ body: body.value, audience: input.audience }),
    };
  }

  function normalizeCommentPageOptions(options) {
    if (options !== undefined && (!options || typeof options !== "object" || Array.isArray(options))) {
      return { ok: false, code: "SOCIAL_INVALID_COMMENT_PAGE" };
    }

    const parentCommentId = options && Object.hasOwn(options, "parentCommentId")
      ? options.parentCommentId
      : null;
    if (parentCommentId !== null && !validPostUuid(parentCommentId)) {
      return { ok: false, code: "SOCIAL_INVALID_COMMENT_ID" };
    }

    const requestedLimit = options && Object.hasOwn(options, "limit") ? options.limit : COMMENT_PAGE_LIMIT;
    if (!Number.isInteger(requestedLimit)) {
      return { ok: false, code: "SOCIAL_INVALID_COMMENT_PAGE" };
    }
    const limit = Math.min(COMMENT_PAGE_LIMIT, Math.max(1, requestedLimit));

    const cursor = options && Object.hasOwn(options, "cursor") ? options.cursor : null;
    if (cursor === null || cursor === undefined) {
      return { ok: true, parentCommentId, cursorCreatedAt: null, cursorCommentId: null, limit };
    }
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)
      || typeof cursor.createdAt !== "string" || !Number.isFinite(Date.parse(cursor.createdAt))
      || !validPostUuid(cursor.commentId)) {
      return { ok: false, code: "SOCIAL_INVALID_COMMENT_CURSOR" };
    }

    return {
      ok: true,
      parentCommentId,
      cursorCreatedAt: cursor.createdAt,
      cursorCommentId: cursor.commentId,
      limit,
    };
  }

  function normalizeLimit(options) {
    const value = options && Object.hasOwn(options, "limit") ? options.limit : 20;
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      return { ok: false, code: "SOCIAL_INVALID_FEED_LIMIT" };
    }
    return { ok: true, value };
  }

  async function execute(operation, requireConfirmation) {
    try {
      const response = await operation();
      if (!response || response.error) {
        return frozenFailure("SOCIAL_PERSISTENCE_FAILED");
      }
      if (requireConfirmation && (response.data === null || response.data === undefined)) {
        return frozenFailure("SOCIAL_PERSISTENCE_UNCONFIRMED");
      }
      return frozenSuccess(response.data);
    } catch (_) {
      return frozenFailure("SOCIAL_PERSISTENCE_FAILED");
    }
  }

  function createSocialRuntimeAdapters(options) {
    const client = options && options.client;

    function unavailable() {
      return Promise.resolve(frozenFailure("SOCIAL_RUNTIME_UNAVAILABLE"));
    }

    const posts = Object.freeze({
      readFeed: async function (options) {
        if (!hasClient(client)) return unavailable();

        const limit = normalizeLimit(options);
        if (!limit.ok) return frozenFailure(limit.code);

        return execute(
          () => client
            .from(SOCIAL_POSTS_TABLE)
            .select(POST_SELECT)
            .order("created_at", { ascending: false })
            .limit(limit.value),
          false
        );
      },

      create: async function (input) {
        if (!hasClient(client)) return unavailable();

        const post = normalizePost(input);
        if (!post.ok) return frozenFailure(post.code);

        return execute(
          () => client
            .from(SOCIAL_POSTS_TABLE)
            .insert(post.payload)
            .select(POST_SELECT)
            .single(),
          true
        );
      },
    });

    const relationships = Object.freeze({
      readMine: async function () {
        if (!hasClient(client)) return unavailable();

        return execute(
          () => client
            .from(SOCIAL_RELATIONSHIPS_TABLE)
            .select(RELATIONSHIP_SELECT)
            .order("updated_at", { ascending: false })
            .limit(100),
          false
        );
      },

      send: async function (addresseeSubject) {
        if (!hasClient(client)) return unavailable();
        if (!validUserSubject(addresseeSubject)) {
          return frozenFailure("SOCIAL_INVALID_ADDRESSEE");
        }

        return execute(
          () => client
            .from(SOCIAL_RELATIONSHIPS_TABLE)
            .insert({ addressee_subject: addresseeSubject })
            .select(RELATIONSHIP_SELECT)
            .single(),
          true
        );
      },

      accept: async function (relationshipId) {
        if (!hasClient(client)) return unavailable();
        if (!validResourceId(relationshipId)) {
          return frozenFailure("SOCIAL_INVALID_RELATIONSHIP_ID");
        }

        return execute(
          () => client
            .from(SOCIAL_RELATIONSHIPS_TABLE)
            .update({ relationship_state: "friends" })
            .eq("relationship_id", relationshipId)
            .select(RELATIONSHIP_SELECT)
            .single(),
          true
        );
      },

      remove: async function (relationshipId) {
        if (!hasClient(client)) return unavailable();
        if (!validResourceId(relationshipId)) {
          return frozenFailure("SOCIAL_INVALID_RELATIONSHIP_ID");
        }

        return execute(
          () => client
            .from(SOCIAL_RELATIONSHIPS_TABLE)
            .delete()
            .eq("relationship_id", relationshipId)
            .select("relationship_id")
            .single(),
          true
        );
      },
    });

    const reactions = Object.freeze({
      summary: async function (postId) {
        if (!validPostUuid(postId)) {
          return frozenFailure("SOCIAL_INVALID_POST_ID");
        }
        if (!hasRpcClient(client)) return unavailable();
        return execute(
          () => client.rpc("vvip_social_reaction_summary", { p_post_id: postId }),
          true
        );
      },

      set: async function (postId, reactionType) {
        if (!validPostUuid(postId)) {
          return frozenFailure("SOCIAL_INVALID_POST_ID");
        }
        if (!validReactionType(reactionType)) {
          return frozenFailure("SOCIAL_INVALID_REACTION_TYPE");
        }
        if (!hasRpcClient(client)) return unavailable();
        return execute(
          () => client.rpc("vvip_social_set_reaction", {
            p_post_id: postId,
            p_reaction_type: reactionType,
          }),
          true
        );
      },

      remove: async function (postId) {
        if (!validPostUuid(postId)) {
          return frozenFailure("SOCIAL_INVALID_POST_ID");
        }
        if (!hasRpcClient(client)) return unavailable();
        return execute(
          () => client.rpc("vvip_social_remove_reaction", { p_post_id: postId }),
          true
        );
      },
    });

    const comments = Object.freeze({
      list: async function (postId, options) {
        if (!validPostUuid(postId)) {
          return frozenFailure("SOCIAL_INVALID_POST_ID");
        }
        const page = normalizeCommentPageOptions(options);
        if (!page.ok) return frozenFailure(page.code);
        if (!hasRpcClient(client)) return unavailable();
        return execute(
          () => client.rpc("vvip_social_comment_list", {
            p_post_id: postId,
            p_parent_comment_id: page.parentCommentId,
            p_cursor_created_at: page.cursorCreatedAt,
            p_cursor_comment_id: page.cursorCommentId,
            p_limit: page.limit,
          }),
          true
        );
      },

      create: async function (postId, input) {
        if (!validPostUuid(postId)) {
          return frozenFailure("SOCIAL_INVALID_POST_ID");
        }
        const body = normalizeCommentBody(input && input.body);
        if (!body.ok) return frozenFailure(body.code);

        const parentCommentId = input && Object.hasOwn(input, "parentCommentId")
          ? input.parentCommentId
          : null;
        if (parentCommentId !== null && parentCommentId !== undefined && !validPostUuid(parentCommentId)) {
          return frozenFailure("SOCIAL_INVALID_COMMENT_ID");
        }
        if (!hasRpcClient(client)) return unavailable();

        return execute(
          () => client.rpc("vvip_social_comment_create", {
            p_post_id: postId,
            p_body: body.value,
            p_parent_comment_id: parentCommentId || null,
          }),
          true
        );
      },

      update: async function (commentId, bodyInput) {
        if (!validPostUuid(commentId)) {
          return frozenFailure("SOCIAL_INVALID_COMMENT_ID");
        }
        const body = normalizeCommentBody(bodyInput);
        if (!body.ok) return frozenFailure(body.code);
        if (!hasRpcClient(client)) return unavailable();

        return execute(
          () => client.rpc("vvip_social_comment_update", {
            p_comment_id: commentId,
            p_body: body.value,
          }),
          true
        );
      },

      remove: async function (commentId) {
        if (!validPostUuid(commentId)) {
          return frozenFailure("SOCIAL_INVALID_COMMENT_ID");
        }
        if (!hasRpcClient(client)) return unavailable();
        return execute(
          () => client.rpc("vvip_social_comment_remove", { p_comment_id: commentId }),
          true
        );
      },
    });

    return Object.freeze({ posts, relationships, reactions, comments });
  }

  function createCurrentSocialRuntime(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    return createSocialRuntimeAdapters({
      client: runtimeRoot && runtimeRoot.VVIP_SUPABASE,
    });
  }

  return Object.freeze({
    SOCIAL_POSTS_TABLE,
    SOCIAL_RELATIONSHIPS_TABLE,
    SOCIAL_AUDIENCES,
    SOCIAL_REACTION_TYPES,
    createSocialRuntimeAdapters,
    createCurrentSocialRuntime,
  });
});
