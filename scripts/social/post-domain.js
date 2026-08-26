(() => {
  'use strict';

  const textContract = typeof module !== 'undefined' && module.exports
    ? require('./text-contract.js')
    : (typeof globalThis !== 'undefined' ? globalThis.TIGERSocialTextContract : null);

  const AUDIENCES = Object.freeze(['public', 'friends', 'only_me']);
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

    if (!textContract
      || typeof textContract.trimEdgeWhitespace !== 'function'
      || typeof textContract.codePointLength !== 'function') {
      return fail('invalid_post_body');
    }

    const body = textContract.trimEdgeWhitespace(input.body);
    if (textContract.codePointLength(body) > MAX_BODY_LENGTH) {
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

  const api = Object.freeze({
    AUDIENCES,
    MAX_BODY_LENGTH,
    MAX_MEDIA,
    isAudience,
    buildPostIntent,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.TIGERSocialPostDomain = api;
  }
})();
