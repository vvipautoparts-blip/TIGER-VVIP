(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialRuntime = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
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
  const RELATIONSHIP_SELECT = "relationship_id,requester_subject,addressee_subject,relationship_state,created_at,updated_at";
  const SOCIAL_RATE_LIMIT_RETRY_MS = 5000;
  const SOCIAL_SEARCH_DEFAULT_LIMIT = 20;
  const SOCIAL_SEARCH_MAX_LIMIT = 50;
  const SOCIAL_SEARCH_MAX_QUERY_LENGTH = 160;
  const SOCIAL_SEARCH_MAX_RAW_QUERY_LENGTH = 512;
  const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
  const TATWEEL = /\u0640/gu;
  const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
  const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

  function frozenFailure(code) {
    return Object.freeze({ ok: false, code });
  }

  function frozenRateLimitFailure() {
    return Object.freeze({
      ok: false,
      code: "SOCIAL_RATE_LIMITED",
      retryAfterMs: SOCIAL_RATE_LIMIT_RETRY_MS,
    });
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
    if (typeof value !== "string") {
      return { ok: false, code: "SOCIAL_INVALID_COMMENT_BODY" };
    }
    const body = value.trim();
    if (!body || body.length > 2000) {
      return { ok: false, code: "SOCIAL_INVALID_COMMENT_BODY" };
    }
    return { ok: true, value: body };
  }

  function normalizePost(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return { ok: false, code: "SOCIAL_INVALID_POST" };
    }

    if (typeof input.body !== "string") {
      return { ok: false, code: "SOCIAL_INVALID_POST_BODY" };
    }

    const body = input.body.trim();
    if (!body || body.length > 5000) {
      return { ok: false, code: "SOCIAL_INVALID_POST_BODY" };
    }

    if (!validAudience(input.audience)) {
      return { ok: false, code: "SOCIAL_INVALID_POST_AUDIENCE" };
    }

    return {
      ok: true,
      payload: Object.freeze({ body, audience: input.audience }),
    };
  }

  function normalizeLimit(options) {
    const value = options && Object.hasOwn(options, "limit") ? options.limit : 20;
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      return { ok: false, code: "SOCIAL_INVALID_FEED_LIMIT" };
    }
    return { ok: true, value };
  }

  function normalizeFeedCursor(options) {
    if (!options || !Object.hasOwn(options, "cursor") || options.cursor === null || options.cursor === undefined) {
      return { ok: true, value: null };
    }

    const cursor = options.cursor;
    if (typeof cursor !== "string"
        || cursor.length < 8
        || cursor.length > 2048
        || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
      return { ok: false, code: "SOCIAL_INVALID_FEED_CURSOR" };
    }

    return { ok: true, value: cursor };
  }

  function normalizeSearchDigits(value) {
    return value.replace(/[٠-٩۰-۹]/gu, (digit) => {
      const arabicIndex = ARABIC_INDIC.indexOf(digit);
      if (arabicIndex >= 0) return String(arabicIndex);
      return String(PERSIAN_DIGITS.indexOf(digit));
    });
  }

  function normalizeSearchArabicLetters(value) {
    return value
      .replace(/[إأآٱ]/gu, "ا")
      .replace(/ى/gu, "ي")
      .replace(/ؤ/gu, "و")
      .replace(/ئ/gu, "ي");
  }

  function normalizeSocialSearchQuery(input) {
    if (typeof input !== "string" || input.length > SOCIAL_SEARCH_MAX_RAW_QUERY_LENGTH) {
      return { ok: false, code: "SOCIAL_INVALID_SEARCH_QUERY" };
    }

    const value = normalizeSearchArabicLetters(
      normalizeSearchDigits(
        input.normalize("NFKC").replace(TATWEEL, "").replace(ARABIC_DIACRITICS, "")
      )
    )
      .toLocaleLowerCase("en-US")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/gu, " ");

    if (value.length < 2 || value.length > SOCIAL_SEARCH_MAX_QUERY_LENGTH) {
      return { ok: false, code: "SOCIAL_INVALID_SEARCH_QUERY" };
    }

    return { ok: true, value };
  }

  function normalizeSearchOptions(options) {
    const safe = options && typeof options === "object" && !Array.isArray(options) ? options : {};
    const limit = Object.hasOwn(safe, "limit") ? safe.limit : SOCIAL_SEARCH_DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > SOCIAL_SEARCH_MAX_LIMIT) {
      return { ok: false, code: "SOCIAL_INVALID_SEARCH_LIMIT" };
    }

    const cursor = Object.hasOwn(safe, "cursor") ? safe.cursor : null;
    if (cursor !== null && cursor !== undefined) {
      if (typeof cursor !== "string"
          || cursor.length < 8
          || cursor.length > 2048
          || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
        return { ok: false, code: "SOCIAL_INVALID_SEARCH_CURSOR" };
      }
    }

    return { ok: true, value: Object.freeze({ cursor: cursor || null, limit }) };
  }

  function validMessageSequence(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function normalizeMessageListOptions(options) {
    const afterSequence = options && Object.hasOwn(options, "afterSequence")
      ? options.afterSequence
      : 0;
    const limit = options && Object.hasOwn(options, "limit") ? options.limit : 50;

    if (!validMessageSequence(afterSequence)) {
      return { ok: false, code: "SOCIAL_INVALID_MESSAGE_CURSOR" };
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return { ok: false, code: "SOCIAL_INVALID_MESSAGE_LIMIT" };
    }

    return {
      ok: true,
      value: Object.freeze({ afterSequence, limit }),
    };
  }

  function normalizeMessageBody(value) {
    if (typeof value !== "string") {
      return { ok: false, code: "SOCIAL_INVALID_MESSAGE_BODY" };
    }
    const body = value.trim();
    if (!body || body.length > 4000) {
      return { ok: false, code: "SOCIAL_INVALID_MESSAGE_BODY" };
    }
    return { ok: true, value: body };
  }

  function responseStatus(responseOrError) {
    if (!responseOrError || typeof responseOrError !== "object") return null;
    for (const key of ["status", "statusCode"]) {
      if (Number.isInteger(responseOrError[key])) return responseOrError[key];
    }
    if (typeof responseOrError.code === "string" && /^\d{3}$/.test(responseOrError.code)) {
      return Number(responseOrError.code);
    }
    return null;
  }

  function isRateLimited(response, error) {
    return responseStatus(response) === 429 || responseStatus(error) === 429;
  }

  function errorMessage(error) {
    return error && typeof error.message === "string" ? error.message : "";
  }

  function classifyFeedFailure(response, thrown) {
    const error = thrown || (response && response.error);
    if (isRateLimited(response, error)) return frozenRateLimitFailure();

    const message = errorMessage(error);
    if (message === "GATE5_CURSOR_INVALID" || message === "GATE5_CURSOR_CONTEXT_MISMATCH") {
      return frozenFailure("SOCIAL_FEED_STALE_CURSOR");
    }
    if (message === "SOCIAL_PROFILE_INACTIVE" || message === "SOCIAL_AUTH_REQUIRED") {
      return frozenFailure("SOCIAL_FEED_SESSION_STALE");
    }

    const status = responseStatus(response) || responseStatus(error);
    if (thrown || (Number.isInteger(status) && status >= 500 && status <= 599)) {
      return frozenFailure("SOCIAL_FEED_RETRYABLE");
    }

    return frozenFailure("SOCIAL_PERSISTENCE_FAILED");
  }

  function classifySearchFailure(response, thrown) {
    const error = thrown || (response && response.error);
    const message = errorMessage(error);

    if (isRateLimited(response, error) || message === "SOCIAL_SEARCH_RATE_LIMITED") {
      return frozenRateLimitFailure();
    }
    if (message === "GATE5_CURSOR_INVALID" || message === "GATE5_CURSOR_CONTEXT_MISMATCH") {
      return frozenFailure("SOCIAL_SEARCH_STALE_CURSOR");
    }
    if (message === "SOCIAL_PROFILE_INACTIVE" || message === "SOCIAL_AUTH_REQUIRED") {
      return frozenFailure("SOCIAL_SEARCH_SESSION_STALE");
    }

    const status = responseStatus(response) || responseStatus(error);
    if (thrown || (Number.isInteger(status) && status >= 500 && status <= 599)) {
      return frozenFailure("SOCIAL_SEARCH_RETRYABLE");
    }

    return frozenFailure("SOCIAL_PERSISTENCE_FAILED");
  }

  async function execute(operation, requireConfirmation) {
    try {
      const response = await operation();
      if (!response || response.error) {
        if (isRateLimited(response, response && response.error)) return frozenRateLimitFailure();
        return frozenFailure("SOCIAL_PERSISTENCE_FAILED");
      }
      if (requireConfirmation && (response.data === null || response.data === undefined)) {
        return frozenFailure("SOCIAL_PERSISTENCE_UNCONFIRMED");
      }
      return frozenSuccess(response.data);
    } catch (error) {
      if (isRateLimited(null, error)) return frozenRateLimitFailure();
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
        if (!hasRpcClient(client)) return unavailable();

        const limit = normalizeLimit(options);
        if (!limit.ok) return frozenFailure(limit.code);

        const cursor = normalizeFeedCursor(options);
        if (!cursor.ok) return frozenFailure(cursor.code);

        let response;
        try {
          response = await client.rpc("vvip_social_feed_read_keyset", {
            p_cursor: cursor.value,
            p_limit: limit.value,
          });
        } catch (error) {
          return classifyFeedFailure(null, error);
        }

        if (!response || response.error) {
          return classifyFeedFailure(response, null);
        }

        return frozenSuccess(response.data);
      },

      create: async function (input) {
        if (!hasRpcClient(client)) return unavailable();

        const post = normalizePost(input);
        if (!post.ok) return frozenFailure(post.code);

        return execute(
          () => client.rpc("vvip_social_post_create", {
            p_body: post.payload.body,
            p_audience: post.payload.audience,
          }),
          true
        );
      },
    });

    async function runSearch(rpcName, queryInput, optionInput) {
      const query = normalizeSocialSearchQuery(queryInput);
      if (!query.ok) return frozenFailure(query.code);

      const normalizedOptions = normalizeSearchOptions(optionInput);
      if (!normalizedOptions.ok) return frozenFailure(normalizedOptions.code);

      if (!hasRpcClient(client)) return unavailable();

      let response;
      try {
        response = await client.rpc(rpcName, {
          p_query: query.value,
          p_cursor: normalizedOptions.value.cursor,
          p_limit: normalizedOptions.value.limit,
        });
      } catch (error) {
        return classifySearchFailure(null, error);
      }

      if (!response || response.error) {
        return classifySearchFailure(response, null);
      }
      return frozenSuccess(response.data);
    }

    const search = Object.freeze({
      people: function (query, options) {
        return runSearch("vvip_social_search_people", query, options);
      },
      posts: function (query, options) {
        return runSearch("vvip_social_search_posts", query, options);
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
      list: async function (postId) {
        if (!validPostUuid(postId)) {
          return frozenFailure("SOCIAL_INVALID_POST_ID");
        }
        if (!hasRpcClient(client)) return unavailable();
        return execute(
          () => client.rpc("vvip_social_comment_list", { p_post_id: postId }),
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

    const messaging = Object.freeze({
      open: async function (peerProfileId) {
        if (!validPostUuid(peerProfileId)) {
          return frozenFailure("SOCIAL_INVALID_MESSAGE_PEER_PROFILE_ID");
        }
        if (!hasRpcClient(client)) return unavailable();

        return execute(
          () => client.rpc("vvip_social_open_direct_conversation", {
            p_peer_profile_id: peerProfileId,
            p_idempotency_key: null,
          }),
          true
        );
      },

      list: async function (conversationId, options) {
        if (!validPostUuid(conversationId)) {
          return frozenFailure("SOCIAL_INVALID_MESSAGE_CONVERSATION_ID");
        }
        const normalized = normalizeMessageListOptions(options);
        if (!normalized.ok) return frozenFailure(normalized.code);
        if (!hasRpcClient(client)) return unavailable();

        return execute(
          () => client.rpc("vvip_social_list_messages", {
            p_conversation_id: conversationId,
            p_after_sequence: normalized.value.afterSequence,
            p_limit: normalized.value.limit,
          }),
          true
        );
      },

      send: async function (conversationId, input) {
        if (!validPostUuid(conversationId)) {
          return frozenFailure("SOCIAL_INVALID_MESSAGE_CONVERSATION_ID");
        }
        if (!input || typeof input !== "object" || Array.isArray(input)) {
          return frozenFailure("SOCIAL_INVALID_MESSAGE_INPUT");
        }
        if (!validPostUuid(input.clientMessageId)) {
          return frozenFailure("SOCIAL_INVALID_MESSAGE_CLIENT_ID");
        }
        const body = normalizeMessageBody(input.body);
        if (!body.ok) return frozenFailure(body.code);
        if (!hasRpcClient(client)) return unavailable();

        return execute(
          () => client.rpc("vvip_social_send_message", {
            p_conversation_id: conversationId,
            p_client_message_id: input.clientMessageId,
            p_body: body.value,
          }),
          true
        );
      },

      markRead: async function (conversationId, sequence) {
        if (!validPostUuid(conversationId)) {
          return frozenFailure("SOCIAL_INVALID_MESSAGE_CONVERSATION_ID");
        }
        if (!validMessageSequence(sequence)) {
          return frozenFailure("SOCIAL_INVALID_MESSAGE_SEQUENCE");
        }
        if (!hasRpcClient(client)) return unavailable();

        return execute(
          () => client.rpc("vvip_social_mark_read", {
            p_conversation_id: conversationId,
            p_sequence: sequence,
          }),
          true
        );
      },

      getChannelTicket: async function (conversationId) {
        if (!validPostUuid(conversationId)) {
          return frozenFailure("SOCIAL_INVALID_MESSAGE_CONVERSATION_ID");
        }
        if (!hasRpcClient(client)) return unavailable();

        return execute(
          () => client.rpc("vvip_social_get_channel_ticket", {
            p_conversation_id: conversationId,
          }),
          true
        );
      },
    });

    return Object.freeze({ posts, search, relationships, reactions, comments, messaging });
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
    normalizeSocialSearchQuery,
    createSocialRuntimeAdapters,
    createCurrentSocialRuntime,
  });
});