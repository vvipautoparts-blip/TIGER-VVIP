'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createPreviewServer } = require('../tools/f05-preview-server.cjs');

function request(port, pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks)
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('F05 preview server is static-only, isolated, and serves WASM with browser-isolation headers', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-f05-preview-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>F05 Preview</title>');
  fs.mkdirSync(path.join(root, 'workers', 'media'), { recursive: true });
  fs.writeFileSync(path.join(root, 'workers', 'media', 'decoder.wasm'), Buffer.from([0x00, 0x61, 0x73, 0x6d]));

  const server = createPreviewServer({
    rootDir: root,
    source: {
      repository: 'vvipautoparts-blip/TIGER-VVIP',
      branch: 'feat/f05-hybrid-heic-local-media-isolated-20260814',
      sha: '0123456789abcdef0123456789abcdef01234567'
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;

  const page = await request(port, '/');
  assert.equal(page.statusCode, 200);
  assert.equal(page.headers['cross-origin-opener-policy'], 'same-origin');
  assert.equal(page.headers['cross-origin-embedder-policy'], 'require-corp');
  assert.match(page.headers['content-type'], /^text\/html/);

  const wasm = await request(port, '/workers/media/decoder.wasm');
  assert.equal(wasm.statusCode, 200);
  assert.equal(wasm.headers['content-type'], 'application/wasm');
  assert.equal(wasm.headers['cross-origin-opener-policy'], 'same-origin');
  assert.equal(wasm.headers['cross-origin-embedder-policy'], 'require-corp');

  const meta = await request(port, '/__f05_preview_meta');
  assert.equal(meta.statusCode, 200);
  assert.equal(meta.headers['content-type'], 'application/json; charset=utf-8');
  assert.deepEqual(JSON.parse(meta.body.toString('utf8')), {
    repository: 'vvipautoparts-blip/TIGER-VVIP',
    branch: 'feat/f05-hybrid-heic-local-media-isolated-20260814',
    sha: '0123456789abcdef0123456789abcdef01234567'
  });

  const post = await request(port, '/upload-heic', 'POST');
  assert.equal(post.statusCode, 405);
  assert.equal(post.body.toString('utf8'), 'method_not_allowed');

  const traversal = await request(port, '/../.env');
  assert.ok([400, 404].includes(traversal.statusCode));
});
