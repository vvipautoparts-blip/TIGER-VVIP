#!/usr/bin/env node
// VVIP TIGER — Security Headers Test
'use strict';
const assert = require('assert');
const { VVIP_SECURITY_HEADERS, REQUIRED_SECURITY_HEADERS, validateSecurityHeaders } = require('../scripts/security/vvip-security-headers.js');

// All required headers must be defined
for (const header of REQUIRED_SECURITY_HEADERS) {
  assert.ok(
    VVIP_SECURITY_HEADERS[header],
    `Security header must be defined: ${header}`
  );
}

// X-Frame-Options must be DENY (prevent clickjacking)
assert.strictEqual(VVIP_SECURITY_HEADERS['X-Frame-Options'], 'DENY', 'X-Frame-Options must be DENY');

// CSP must include required directives
const csp = VVIP_SECURITY_HEADERS['Content-Security-Policy'];
assert.ok(csp.includes("default-src 'self'"), 'CSP must restrict default-src');
assert.ok(csp.includes("frame-src 'none'"), 'CSP must block frames');
assert.ok(csp.includes("object-src 'none'"), 'CSP must block object embeds');
assert.ok(csp.includes("form-action 'self'"), 'CSP must restrict form actions');

// HSTS must have long max-age
const hsts = VVIP_SECURITY_HEADERS['Strict-Transport-Security'];
assert.ok(hsts.includes('max-age=31536000'), 'HSTS must have 1-year max-age');
assert.ok(hsts.includes('includeSubDomains'), 'HSTS must include subdomains');

// Validate function: valid response
const validResponse = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'"
};
const valid = validateSecurityHeaders(validResponse);
assert.ok(valid.valid, 'Valid response must pass: ' + JSON.stringify(valid.missing));
assert.strictEqual(valid.missing.length, 0);

// Validate function: missing headers
const partial = { 'X-Frame-Options': 'DENY' };
const partial_result = validateSecurityHeaders(partial);
assert.ok(!partial_result.valid, 'Partial headers must fail validation');
assert.ok(partial_result.missing.length > 0, 'Must report missing headers');
assert.ok(partial_result.missing.includes('Content-Security-Policy'), 'Must report missing CSP');

// Case-insensitive header matching
const lowerCase = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'self'"
};
const lcResult = validateSecurityHeaders(lowerCase);
assert.ok(lcResult.valid, 'Header validation must be case-insensitive');

console.log('PASS: Security headers configuration and validation — all checks passed');
