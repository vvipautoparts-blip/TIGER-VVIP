'use strict';

const TOKEN = /^[A-Za-z0-9._:-]{1,96}$/;

function fail() {
  const error = new Error('media_fortress_unavailable');
  error.code = 'media_fortress_unavailable';
  throw error;
}

function validToken(value) {
  return typeof value === 'string' && TOKEN.test(value);
}

function createMediaFortressV2(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail();

  const { codecWorker } = options;
  if (!codecWorker || typeof codecWorker !== 'object' || Array.isArray(codecWorker)) fail();
  if (!validToken(codecWorker.backend) || !validToken(codecWorker.version)) fail();
  if (typeof codecWorker.decode !== 'function' || typeof codecWorker.encode !== 'function') fail();

  async function inspect() {
    fail();
  }

  async function rewrite() {
    fail();
  }

  return Object.freeze({
    backend: codecWorker.backend,
    version: codecWorker.version,
    inspect,
    rewrite,
  });
}

exports.createMediaFortressV2 = createMediaFortressV2;
Object.freeze(module.exports);
