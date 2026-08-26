(() => {
  'use strict';

  const RELATIONSHIP_STATES = Object.freeze([
    'none',
    'request_sent',
    'request_received',
    'friends',
  ]);

  const RELATIONSHIP_ACTIONS = Object.freeze([
    'send_request',
    'cancel_request',
    'accept_request',
    'decline_request',
    'remote_accept',
    'unfriend',
  ]);

  const TRANSITIONS = Object.freeze({
    none: Object.freeze({
      send_request: Object.freeze({ state: 'request_sent', effect: 'request_friendship' }),
    }),
    request_sent: Object.freeze({
      cancel_request: Object.freeze({ state: 'none', effect: 'cancel_friend_request' }),
      remote_accept: Object.freeze({ state: 'friends', effect: null }),
    }),
    request_received: Object.freeze({
      accept_request: Object.freeze({ state: 'friends', effect: 'accept_friend_request' }),
      decline_request: Object.freeze({ state: 'none', effect: 'decline_friend_request' }),
    }),
    friends: Object.freeze({
      unfriend: Object.freeze({ state: 'none', effect: 'remove_friendship' }),
    }),
  });

  function isRelationshipState(value) {
    return typeof value === 'string' && RELATIONSHIP_STATES.includes(value);
  }

  function isRelationshipAction(value) {
    return typeof value === 'string' && RELATIONSHIP_ACTIONS.includes(value);
  }

  function transitionRelationship(currentState, action) {
    if (!isRelationshipState(currentState)) {
      return Object.freeze({
        ok: false,
        previous: null,
        state: null,
        error: 'invalid_relationship_state',
      });
    }

    if (!isRelationshipAction(action)) {
      return Object.freeze({
        ok: false,
        previous: currentState,
        state: currentState,
        error: 'invalid_relationship_action',
      });
    }

    const transition = TRANSITIONS[currentState][action];
    if (!transition) {
      return Object.freeze({
        ok: false,
        previous: currentState,
        state: currentState,
        error: 'invalid_relationship_transition',
      });
    }

    return Object.freeze({
      ok: true,
      previous: currentState,
      state: transition.state,
      effect: transition.effect,
    });
  }

  const api = Object.freeze({
    RELATIONSHIP_STATES,
    RELATIONSHIP_ACTIONS,
    isRelationshipState,
    isRelationshipAction,
    transitionRelationship,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.TIGERSocialGraph = api;
  }
})();
