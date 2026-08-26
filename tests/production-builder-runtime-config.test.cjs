'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const BUILDER_PATH = path.join(
  __dirname,
  '..',
  '.github',
  'workflows',
  'production-release-artifact.yml',
);

const builder = fs.readFileSync(BUILDER_PATH, 'utf8');

test('Production builder injects the complete public runtime configuration contract', () => {
  const requiredBindings = [
    'TIGER_CLERK_PUBLISHABLE_KEY: ${{ secrets.TIGER_CLERK_PUBLISHABLE_KEY }}',
    'TIGER_SUPABASE_URL: ${{ secrets.TIGER_SUPABASE_URL }}',
    'TIGER_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.TIGER_SUPABASE_PUBLISHABLE_KEY }}',
    'TIGER_DEFAULT_COUNTRY_CODE: ${{ vars.TIGER_DEFAULT_COUNTRY_CODE }}',
    'TIGER_MEDIA_FINALIZER_URL: ${{ vars.TIGER_MEDIA_FINALIZER_URL }}',
  ];

  for (const binding of requiredBindings) {
    assert.ok(builder.includes(binding), `missing Production runtime binding: ${binding}`);
  }
});
