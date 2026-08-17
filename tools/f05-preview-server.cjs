'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPOSITORY = 'vvipautoparts-blip/TIGER-VVIP';
const SHA_RE = /^[0-9a-f]{40}$/;

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
});

function isolationHeaders(contentType) {
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  };
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
}

function send(res, statusCode, body, contentType, method) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  res.writeHead(statusCode, {
    ...isolationHeaders(contentType),
    'Content-Length': String(payload.length)
  });
  if (method === 'HEAD') return res.end();
  res.end(payload);
}

function normalizedSource(source) {
  if (!source || source.repository !== REPOSITORY) {
    throw new Error('preview_source_repository_invalid');
  }
  if (typeof source.branch !== 'string' || !source.branch.trim()) {
    throw new Error('preview_source_branch_invalid');
  }
  if (!SHA_RE.test(String(source.sha || ''))) {
    throw new Error('preview_source_sha_invalid');
  }
  return Object.freeze({
    repository: REPOSITORY,
    branch: source.branch.trim(),
    sha: source.sha
  });
}

function resolveStaticPath(rootDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { error: 400 };
  }
  if (decoded.includes('\0')) return { error: 400 };
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some(segment => segment === '..' || segment.startsWith('.'))) {
    return { error: 404 };
  }
  const relative = segments.length === 0 ? 'index.html' : segments.join(path.sep);
  const candidate = path.resolve(rootDir, relative);
  const normalizedRoot = path.resolve(rootDir);
  if (candidate !== normalizedRoot && !candidate.startsWith(normalizedRoot + path.sep)) {
    return { error: 404 };
  }
  return { candidate };
}

function createPreviewServer({ rootDir, source }) {
  const normalizedRoot = path.resolve(rootDir || '.');
  const normalized = normalizedSource(source);

  return http.createServer((req, res) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      return send(res, 405, 'method_not_allowed', 'text/plain; charset=utf-8', method);
    }

    let requestUrl;
    try {
      requestUrl = new URL(req.url || '/', 'http://f05-preview.invalid');
    } catch {
      return send(res, 400, 'bad_request', 'text/plain; charset=utf-8', method);
    }

    if (requestUrl.pathname === '/__f05_preview_meta') {
      const body = JSON.stringify(normalized);
      return send(res, 200, body, 'application/json; charset=utf-8', method);
    }

    const resolved = resolveStaticPath(normalizedRoot, requestUrl.pathname);
    if (resolved.error) {
      return send(res, resolved.error, 'not_found', 'text/plain; charset=utf-8', method);
    }

    fs.stat(resolved.candidate, (statError, stat) => {
      if (statError || !stat.isFile()) {
        return send(res, 404, 'not_found', 'text/plain; charset=utf-8', method);
      }
      fs.readFile(resolved.candidate, (readError, body) => {
        if (readError) {
          return send(res, 500, 'read_failed', 'text/plain; charset=utf-8', method);
        }
        const extension = path.extname(resolved.candidate).toLowerCase();
        const contentType = MIME_TYPES[extension] || 'application/octet-stream';
        send(res, 200, body, contentType, method);
      });
    });
  });
}

function gitValue(rootDir, args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

function directSource(rootDir) {
  const sha = String(process.env.VVIP_PREVIEW_SHA || gitValue(rootDir, ['rev-parse', 'HEAD'])).trim();
  const branch = String(process.env.VVIP_PREVIEW_BRANCH || gitValue(rootDir, ['branch', '--show-current'])).trim();
  return normalizedSource({ repository: REPOSITORY, branch, sha });
}

function parsePort(value) {
  const port = Number(value || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('preview_port_invalid');
  return port;
}

if (require.main === module) {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const source = directSource(rootDir);
    const port = parsePort(process.env.PORT);
    const server = createPreviewServer({ rootDir, source });
    server.listen(port, '0.0.0.0', () => {
      process.stdout.write(`F05_PREVIEW_READY sha=${source.sha} port=${port}\n`);
    });
  } catch (error) {
    process.stderr.write(`F05_PREVIEW_START_FAILED ${error && error.message ? error.message : 'unknown'}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({ createPreviewServer });
