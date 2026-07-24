/**
 * VVIP TIGER — Security Headers Configuration
 * Apply these headers in your server/hosting/CDN layer.
 * Content-Security-Policy, HSTS, X-Frame-Options, etc.
 *
 * Usage: export or serve this configuration to your deployment.
 */
'use strict';

const VVIP_SECURITY_HEADERS = Object.freeze({
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME-type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable browser XSS auditor (legacy but harmless)
  'X-XSS-Protection': '1; mode=block',

  // HTTPS only for 1 year, include subdomains
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy — deny unused powerful features
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',

  // Content Security Policy
  // NOTE: Update 'accurate-mule-28.clerk.accounts.dev' to your production Clerk domain
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://clerk.accounts.dev https://*.clerk.accounts.dev https://js.clerk.dev https://*.clerk.dev https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.clerk.dev https://*.clerk.com",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.clerk.accounts.dev https://api.clerk.dev https://*.clerk.dev wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; '),

  // Cross-origin isolation
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-origin'
});

// Headers that MUST be present for security compliance
const REQUIRED_SECURITY_HEADERS = Object.freeze([
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Strict-Transport-Security',
  'Referrer-Policy',
  'Content-Security-Policy'
]);

/**
 * Validate that a response headers object contains all required security headers
 * @param {object} headers - Response headers to validate
 * @returns {{ valid: boolean, missing: string[] }}
 */
function validateSecurityHeaders(headers) {
  const normalized = {};
  for (const [k, v] of Object.entries(headers || {})) {
    normalized[k.toLowerCase()] = v;
  }
  const missing = REQUIRED_SECURITY_HEADERS.filter(h => !normalized[h.toLowerCase()]);
  return { valid: missing.length === 0, missing };
}

module.exports = {
  VVIP_SECURITY_HEADERS,
  REQUIRED_SECURITY_HEADERS,
  validateSecurityHeaders
};
