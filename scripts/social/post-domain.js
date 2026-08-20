(() => {
  'use strict';

  const AUDIENCES = Object.freeze(['public', 'friends', 'only_me']);
  const AUDIENCE_PRIVACY_RANK = Object.freeze({ public: 0, friends: 1, only_me: 2 });
  const SOCIAL_REPLAY_KINDS = new Set(['bookmark_set', 'follow_set', 'repost_commit']);
  const MAX_BODY_LENGTH = 5000;
  const MAX_MEDIA = 10;

  function isAudience(value) {
    return typeof value === 'string' && AUDIENCES.includes(value);
  }

  function validIdentifier(value) {
    return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
  }

  function validateMedia(media) {
    if (!Array.isArray(media)) return { ok: false, error: 'invalid_post_media' };
    if (media.length > MAX_MEDIA) return { ok: false, error: 'too_many_post_media' };

    const normalized = [];
    for (const item of media) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { ok: false, error: 'invalid_post_media' };
      }
      if (!validIdentifier(item.id) || item.kind !== 'image' || item.state !== 'finalized') {
        return { ok: false, error: 'invalid_post_media' };
      }
      normalized.push(Object.freeze({ id: item.id, kind: 'image', state: 'finalized' }));
    }

    return { ok: true, media: Object.freeze(normalized) };
  }

  function fail(error) {
    return Object.freeze({ ok: false, error });
  }

  function buildPostIntent(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return fail('invalid_post_input');
    }

    if (!validIdentifier(input.authorId)) {
      return fail('invalid_post_author');
    }

    if (!isAudience(input.audience)) {
      return fail('invalid_post_audience');
    }

    if (typeof input.body !== 'string') {
      return fail('invalid_post_body');
    }

    const body = input.body.trim();
    if (body.length > MAX_BODY_LENGTH) {
      return fail('post_body_too_large');
    }

    const mediaResult = validateMedia(input.media);
    if (!mediaResult.ok) return fail(mediaResult.error);

    if (!body && mediaResult.media.length === 0) {
      return fail('empty_post');
    }

    const intent = Object.freeze({
      action: 'create_social_post',
      authorId: input.authorId,
      body,
      audience: input.audience,
      media: mediaResult.media,
    });

    return Object.freeze({ ok: true, intent });
  }

  function buildRepostIntent(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return fail('invalid_repost_input');
    }

    if (!validIdentifier(input.actorId)) {
      return fail('invalid_repost_actor');
    }

    if (!validIdentifier(input.originalPostId)) {
      return fail('invalid_repost_post');
    }

    if (!isAudience(input.originalAudience) || !isAudience(input.requestedAudience)) {
      return fail('invalid_repost_audience');
    }

    if (AUDIENCE_PRIVACY_RANK[input.requestedAudience] < AUDIENCE_PRIVACY_RANK[input.originalAudience]) {
      return fail('repost_audience_widening_forbidden');
    }

    const intent = Object.freeze({
      action: 'repost_social_post',
      actorId: input.actorId,
      originalPostId: input.originalPostId,
      audience: input.requestedAudience,
    });

    return Object.freeze({ ok: true, intent });
  }

  function sameReplayMutation(left, right) {
    return left.sequence === right.sequence
      && left.kind === right.kind
      && left.value === right.value
      && left.applied === right.applied;
  }

  function reconcileSocialReplay(initialState, mutations) {
    if (!initialState || typeof initialState !== 'object' || Array.isArray(initialState)
      || typeof initialState.bookmarked !== 'boolean'
      || typeof initialState.following !== 'boolean'
      || !Number.isSafeInteger(initialState.repostCount)
      || initialState.repostCount < 0
      || !Array.isArray(mutations)) {
      return fail('invalid_social_replay_input');
    }

    const unique = new Map();
    for (const mutation of mutations) {
      if (!mutation || typeof mutation !== 'object' || Array.isArray(mutation)
        || !validIdentifier(mutation.mutationId)
        || !Number.isSafeInteger(mutation.sequence)
        || mutation.sequence < 0
        || !SOCIAL_REPLAY_KINDS.has(mutation.kind)
        || typeof mutation.value !== 'boolean'
        || typeof mutation.applied !== 'boolean') {
        return fail('invalid_social_replay_mutation');
      }

      const normalized = Object.freeze({
        mutationId: mutation.mutationId,
        sequence: mutation.sequence,
        kind: mutation.kind,
        value: mutation.value,
        applied: mutation.applied,
      });
      const existing = unique.get(normalized.mutationId);
      if (existing) {
        if (!sameReplayMutation(existing, normalized)) {
          return fail('social_replay_idempotency_conflict');
        }
        continue;
      }
      unique.set(normalized.mutationId, normalized);
    }

    const ordered = [...unique.values()].sort((left, right) => {
      if (left.sequence !== right.sequence) return left.sequence - right.sequence;
      return left.mutationId.localeCompare(right.mutationId);
    });

    const state = {
      bookmarked: initialState.bookmarked,
      following: initialState.following,
      repostCount: initialState.repostCount,
    };
    const appliedMutationIds = [];

    for (const mutation of ordered) {
      if (!mutation.applied) continue;

      if (mutation.kind === 'bookmark_set') {
        state.bookmarked = mutation.value;
      } else if (mutation.kind === 'follow_set') {
        state.following = mutation.value;
      } else if (mutation.kind === 'repost_commit' && mutation.value) {
        state.repostCount += 1;
      }
      appliedMutationIds.push(mutation.mutationId);
    }

    return Object.freeze({
      ok: true,
      state: Object.freeze(state),
      appliedMutationIds: Object.freeze(appliedMutationIds),
    });
  }

  const api = Object.freeze({
    AUDIENCES,
    MAX_BODY_LENGTH,
    MAX_MEDIA,
    isAudience,
    buildPostIntent,
    buildRepostIntent,
    reconcileSocialReplay,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.TIGERSocialPostDomain = api;
  }
})();
