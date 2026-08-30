'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const authModule = require('../auth-clerk-index.js');
const repositoryModule = require('../scripts/runtime/vvip-marketplace-repository.js');

const LISTING_ID = '11111111-1111-4111-8111-111111111111';
const MEDIA_ID = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'a'.repeat(64);
const SESSION_TOKEN = 'session-token-fixture';

function mutationClient() {
  const calls = { rpc: [], uploads: [], removes: [], mediaRows: [] };
  const client = {
    from(table) {
      if (table === 'vvip_marketplace_listings') {
        return {
          insert() {
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({
                      data: {
                        listing_id: LISTING_ID,
                        active_market_country: 'JO',
                        sector: 'automotive'
                      },
                      error: null
                    });
                  }
                };
              }
            };
          },
          delete() {
            return {
              eq() { return Promise.resolve({ data: null, error: null }); }
            };
          }
        };
      }
      if (table === 'vvip_marketplace_listing_media') {
        return {
          insert(rows) {
            calls.mediaRows.push(...rows);
            return Promise.resolve({ data: null, error: null });
          }
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, 'listing-media');
        return {
          upload(path) {
            calls.uploads.push(path);
            return Promise.resolve({ data: { path }, error: null });
          },
          remove(paths) {
            calls.removes.push(paths.slice());
            return Promise.resolve({ data: paths, error: null });
          }
        };
      }
    },
    rpc(name, args) {
      calls.rpc.push([name, args]);
      if (name !== 'vvip_marketplace_request_media_finalization') {
        throw new Error(`unexpected rpc: ${name}`);
      }
      return Promise.resolve({
        data: { media_id: MEDIA_ID, finalization_token: TOKEN },
        error: null
      });
    }
  };
  return { client, calls };
}

function digestArrayBuffer(bytes) {
  const digest = createHash('sha256').update(Buffer.from(bytes)).digest();
  return digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength);
}

test('auth adapter exposes a fresh non-persistent Clerk session token boundary', () => {
  assert.equal(typeof authModule.getSessionToken, 'function');
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'auth-clerk-index.js'), 'utf8');
  assert.doesNotMatch(source, /localStorage[^\n]*getSessionToken|getSessionToken[^\n]*localStorage/s);
  assert.doesNotMatch(source, /sessionStorage[^\n]*getSessionToken|getSessionToken[^\n]*sessionStorage/s);
});

test('marketplace finalization sends the fresh session and SHA-256 of the exact JSON body', async () => {
  const { client } = mutationClient();
  const fetchCalls = [];
  let authCalls = 0;
  let digestCalls = 0;

  const auth = {
    async getSessionToken() {
      authCalls += 1;
      return SESSION_TOKEN;
    },
    async requireAuth() {
      throw new Error('requireAuth fallback must not be needed for an active Clerk user');
    }
  };
  const cryptoApi = {
    randomUUID() { return MEDIA_ID; },
    subtle: {
      async digest(algorithm, bytes) {
        digestCalls += 1;
        assert.equal(algorithm, 'SHA-256');
        return digestArrayBuffer(bytes);
      }
    }
  };

  const repository = repositoryModule.createMarketplaceRepository({
    client,
    clerk: { user: { id: 'user_owner' } },
    auth,
    crypto: cryptoApi,
    config: {
      defaultCountryCode: 'JO',
      mediaFinalizerUrl: 'https://media.example.test/finalize'
    },
    randomUUID: () => MEDIA_ID,
    fetch: async (url, options) => {
      fetchCalls.push([url, options]);
      return {
        ok: true,
        json: async () => ({ ok: true, mediaId: MEDIA_ID, state: 'CANONICAL' })
      };
    }
  });

  await repository.createDraftWithMedia({
    sector: 'automotive',
    title: 'سيارة موثوقة',
    location: 'Amman',
    priceMinor: 1000,
    currencyCode: 'JOD'
  }, [{
    blob: { size: 4, type: 'image/jpeg' },
    mimeType: 'image/jpeg',
    width: 800,
    height: 600
  }]);

  assert.equal(fetchCalls.length, 1);
  assert.equal(authCalls, 1, 'finalization must obtain one fresh Clerk session token');
  assert.equal(digestCalls, 1, 'the exact request body must be hashed once');

  const [, options] = fetchCalls[0];
  assert.equal(options.credentials, 'omit');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.deepEqual(JSON.parse(options.body), { mediaId: MEDIA_ID, finalizationToken: TOKEN });
  assert.equal(options.headers['X-Tiger-Session'], SESSION_TOKEN);
  assert.equal(
    options.headers['x-amz-content-sha256'],
    createHash('sha256').update(options.body, 'utf8').digest('hex'),
    'body digest header must cover the exact serialized bytes sent by fetch'
  );
});

test('browser finalization contract contains no insecure unauthenticated fallback', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'scripts/runtime/vvip-marketplace-repository.js'),
    'utf8'
  );
  assert.match(source, /X-Tiger-Session/);
  assert.match(source, /x-amz-content-sha256/);
  assert.match(source, /subtle\.digest\s*\(\s*['"]SHA-256['"]/);
});
