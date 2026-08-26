const test = require('node:test');
const assert = require('node:assert/strict');

const { transitionRelationship, isRelationshipState } = require('../scripts/social/social-graph.js');

test('Social Graph recognizes only bounded relationship states', () => {
  for (const state of ['none', 'request_sent', 'request_received', 'friends']) {
    assert.equal(isRelationshipState(state), true);
  }

  for (const state of ['', null, undefined, 'admin', 'blocked', 'friends_forever']) {
    assert.equal(isRelationshipState(state), false);
  }
});

test('friend request sender can send and cancel without minting friendship locally', () => {
  assert.deepEqual(transitionRelationship('none', 'send_request'), {
    ok: true,
    previous: 'none',
    state: 'request_sent',
    effect: 'request_friendship',
  });

  assert.deepEqual(transitionRelationship('request_sent', 'cancel_request'), {
    ok: true,
    previous: 'request_sent',
    state: 'none',
    effect: 'cancel_friend_request',
  });
});

test('received request can be accepted or declined through explicit trusted effects', () => {
  assert.deepEqual(transitionRelationship('request_received', 'accept_request'), {
    ok: true,
    previous: 'request_received',
    state: 'friends',
    effect: 'accept_friend_request',
  });

  assert.deepEqual(transitionRelationship('request_received', 'decline_request'), {
    ok: true,
    previous: 'request_received',
    state: 'none',
    effect: 'decline_friend_request',
  });
});

test('remote acceptance is a distinct confirmation path for the original sender', () => {
  assert.deepEqual(transitionRelationship('request_sent', 'remote_accept'), {
    ok: true,
    previous: 'request_sent',
    state: 'friends',
    effect: null,
  });
});

test('friends can unfriend but invalid and unknown transitions fail closed', () => {
  assert.deepEqual(transitionRelationship('friends', 'unfriend'), {
    ok: true,
    previous: 'friends',
    state: 'none',
    effect: 'remove_friendship',
  });

  assert.deepEqual(transitionRelationship('none', 'accept_request'), {
    ok: false,
    previous: 'none',
    state: 'none',
    error: 'invalid_relationship_transition',
  });

  assert.deepEqual(transitionRelationship('friends', 'send_request'), {
    ok: false,
    previous: 'friends',
    state: 'friends',
    error: 'invalid_relationship_transition',
  });

  assert.deepEqual(transitionRelationship('owner', 'send_request'), {
    ok: false,
    previous: null,
    state: null,
    error: 'invalid_relationship_state',
  });

  assert.deepEqual(transitionRelationship('none', 'make_admin'), {
    ok: false,
    previous: 'none',
    state: 'none',
    error: 'invalid_relationship_action',
  });
});
