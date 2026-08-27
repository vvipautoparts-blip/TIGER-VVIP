'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, '.github', 'workflows', 'media-finalizer-build.yml');
const DEPLOY = path.join(ROOT, '.github', 'workflows', 'media-finalizer-deploy.yml');
const MASTER_SPEC = 'docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md';

function readRequired(file) {
  assert.equal(fs.existsSync(file), true, `REQUIRED_WORKFLOW_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8').replace(/\r/g, '');
}

test('sovereign sealed-build workflow restores build-only authority without deployment mutation', () => {
  const workflow = readRequired(BUILD);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /attestations:\s*write/);
  assert.match(workflow, /environment:\s*media-build/);
  assert.doesNotMatch(workflow, /SOVEREIGN_CONSTELLATION_SUPERSEDED/);
  assert.doesNotMatch(workflow, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN/);
  assert.doesNotMatch(workflow, /aws\s+cloudformation\s+(?:create-change-set|execute-change-set|deploy)/i);
  assert.doesNotMatch(workflow, /aws\s+(?:lambda|wafv2|cloudfront|acm|iam|secretsmanager)\s+[^\n]*(?:create|update|put|delete)/i);
  assert.doesNotMatch(workflow, /infra\/media-finalizer\/template\.yaml/);
});

test('superseded deploy workflow remains quarantined fail-closed', () => {
  const workflow = readRequired(DEPLOY);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /SOVEREIGN_CONSTELLATION_SUPERSEDED/);
  assert.match(workflow, new RegExp(MASTER_SPEC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(workflow, /exit\s+1/);
  assert.doesNotMatch(workflow, /id-token:\s*write/);
  assert.doesNotMatch(workflow, /configure-aws-credentials/i);
  assert.doesNotMatch(workflow, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN/);
  assert.doesNotMatch(workflow, /docker\s+(?:build|push)/i);
  assert.doesNotMatch(workflow, /aws\s+cloudformation\s+(?:create-change-set|execute-change-set|deploy)/i);
  assert.doesNotMatch(workflow, /aws\s+(?:lambda|ecr|wafv2|cloudfront|acm)\s+[^\n]*(?:create|update|put|delete|push)/i);
  assert.doesNotMatch(workflow, /infra\/media-finalizer\/template\.yaml/);
});
