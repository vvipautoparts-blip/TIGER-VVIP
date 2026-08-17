'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('creates a frozen Media Fortress V2 engine behind the existing F05 image-engine ports', () => {
  const { createMediaFortressV2 } = require('../scripts/media/server/aws/f05-media-fortress-v2.js');

  const codecWorker = Object.freeze({
    backend: 'isolated-test-codec',
    version: '1.0.0',
    async decode() { throw new Error('not used'); },
    async encode() { throw new Error('not used'); },
  });

  const engine = createMediaFortressV2({ codecWorker });

  assert.equal(Object.isFrozen(engine), true);
  assert.equal(engine.backend, 'isolated-test-codec');
  assert.equal(engine.version, '1.0.0');
  assert.equal(typeof engine.inspect, 'function');
  assert.equal(typeof engine.rewrite, 'function');
  assert.equal(typeof engine.decodeHeic, 'undefined');
  assert.equal(typeof engine.decodeHeif, 'undefined');
});
