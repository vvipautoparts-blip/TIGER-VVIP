const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPostIntent, isAudience } = require('../scripts/social/post-domain.js');

test('post audience is bounded to the first Social Core privacy states', () => {
  for (const audience of ['public', 'friends', 'only_me']) {
    assert.equal(isAudience(audience), true);
  }
  for (const audience of ['everyone', 'followers', 'admin', '', null]) {
    assert.equal(isAudience(audience), false);
  }
});

test('text post intent is normalized but never minted as a published post client-side', () => {
  assert.deepEqual(buildPostIntent({
    authorId: 'user_123',
    body: '  مرحباً من TIGER  ',
    audience: 'friends',
    media: [],
  }), {
    ok: true,
    intent: {
      action: 'create_social_post',
      authorId: 'user_123',
      body: 'مرحباً من TIGER',
      audience: 'friends',
      media: [],
    },
  });
});

test('image references are accepted only as bounded finalized references', () => {
  assert.deepEqual(buildPostIntent({
    authorId: 'user_123',
    body: '',
    audience: 'public',
    media: [
      { id: 'media_a', kind: 'image', state: 'finalized' },
      { id: 'media_b', kind: 'image', state: 'finalized' },
    ],
  }), {
    ok: true,
    intent: {
      action: 'create_social_post',
      authorId: 'user_123',
      body: '',
      audience: 'public',
      media: [
        { id: 'media_a', kind: 'image', state: 'finalized' },
        { id: 'media_b', kind: 'image', state: 'finalized' },
      ],
    },
  });
});

test('invalid identity audience empty content oversized text and unsupported media fail closed', () => {
  const cases = [
    [{ authorId: '', body: 'x', audience: 'public', media: [] }, 'invalid_post_author'],
    [{ authorId: 'user_1', body: 'x', audience: 'everyone', media: [] }, 'invalid_post_audience'],
    [{ authorId: 'user_1', body: '   ', audience: 'public', media: [] }, 'empty_post'],
    [{ authorId: 'user_1', body: 'x'.repeat(5001), audience: 'public', media: [] }, 'post_body_too_large'],
    [{ authorId: 'user_1', body: '', audience: 'public', media: [{ id: 'm1', kind: 'video', state: 'finalized' }] }, 'invalid_post_media'],
    [{ authorId: 'user_1', body: '', audience: 'public', media: [{ id: 'm1', kind: 'image', state: 'draft' }] }, 'invalid_post_media'],
  ];

  for (const [input, error] of cases) {
    const result = buildPostIntent(input);
    assert.equal(result.ok, false);
    assert.equal(result.error, error);
    assert.equal(Object.hasOwn(result, 'post'), false);
  }
});

test('post intent limits image count and rejects mutable or malformed media structures', () => {
  const tooMany = Array.from({ length: 11 }, (_, index) => ({
    id: `media_${index}`,
    kind: 'image',
    state: 'finalized',
  }));

  assert.equal(buildPostIntent({ authorId: 'user_1', body: '', audience: 'public', media: tooMany }).error, 'too_many_post_media');
  assert.equal(buildPostIntent({ authorId: 'user_1', body: '', audience: 'public', media: null }).error, 'invalid_post_media');
  assert.equal(buildPostIntent({ authorId: 'user_1', body: '', audience: 'public', media: [{ id: '', kind: 'image', state: 'finalized' }] }).error, 'invalid_post_media');
});
