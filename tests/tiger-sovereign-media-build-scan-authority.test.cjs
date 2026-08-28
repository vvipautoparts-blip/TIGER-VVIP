'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'infra', 'media-finalizer', 'foundation', 'template.yaml');
const GUARD = path.join(ROOT, 'infra', 'media-finalizer', 'foundation', 'guard.guard');

const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r/g, '');

test('MediaBuildRole can prove registry scan mode but cannot mutate scanning configuration', () => {
  const template = read(TEMPLATE);
  const guard = read(GUARD);
  assert.match(template, /ecr:GetRegistryScanningConfiguration/);
  assert.match(guard, /ecr:GetRegistryScanningConfiguration/);
  assert.doesNotMatch(template, /ecr:PutRegistryScanningConfiguration/);
  assert.doesNotMatch(template, /ecr:DeleteRegistryPolicy|ecr:PutRegistryPolicy/);
  assert.match(
    template,
    /Action:[\s\S]*ecr:GetAuthorizationToken[\s\S]*ecr:GetRegistryScanningConfiguration[\s\S]*Resource:\s*['"]\*['"]/,
  );
});
