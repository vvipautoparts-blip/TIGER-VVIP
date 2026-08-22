const test = require('node:test');
const assert = require('node:assert/strict');

const postDomain = require('../scripts/social/post-domain.js');

test('repost intent preserves the original privacy ceiling and never widens audience', () => {
  assert.equal(typeof postDomain.buildRepostIntent, 'function', 'buildRepostIntent must exist');

  assert.deepEqual(postDomain.buildRepostIntent({
    actorId: 'user_200',
    originalPostId: 'post_100',
    originalAudience: 'friends',
    requestedAudience: 'friends',
  }), {
    ok: true,
    intent: {
      action: 'repost_social_post',
      actorId: 'user_200',
      originalPostId: 'post_100',
      audience: 'friends',
    },
  });

  assert.deepEqual(postDomain.buildRepostIntent({
    actorId: 'user_200',
    originalPostId: 'post_100',
    originalAudience: 'public',
    requestedAudience: 'friends',
  }), {
    ok: true,
    intent: {
      action: 'repost_social_post',
      actorId: 'user_200',
      originalPostId: 'post_100',
      audience: 'friends',
    },
  });

  assert.deepEqual(postDomain.buildRepostIntent({
    actorId: 'user_200',
    originalPostId: 'post_100',
    originalAudience: 'friends',
    requestedAudience: 'public',
  }), {
    ok: false,
    error: 'repost_audience_widening_forbidden',
  });

  assert.deepEqual(postDomain.buildRepostIntent({
    actorId: 'user_200',
    originalPostId: 'post_100',
    originalAudience: 'only_me',
    requestedAudience: 'friends',
  }), {
    ok: false,
    error: 'repost_audience_widening_forbidden',
  });
});

test('repost intent rejects malformed identifiers and unsupported audiences', () => {
  assert.deepEqual(postDomain.buildRepostIntent({
    actorId: 'bad actor',
    originalPostId: 'post_100',
    originalAudience: 'public',
    requestedAudience: 'public',
  }), { ok: false, error: 'invalid_repost_actor' });

  assert.deepEqual(postDomain.buildRepostIntent({
    actorId: 'user_200',
    originalPostId: '',
    originalAudience: 'public',
    requestedAudience: 'public',
  }), { ok: false, error: 'invalid_repost_post' });

  assert.deepEqual(postDomain.buildRepostIntent({
    actorId: 'user_200',
    originalPostId: 'post_100',
    originalAudience: 'unknown',
    requestedAudience: 'public',
  }), { ok: false, error: 'invalid_repost_audience' });
});
