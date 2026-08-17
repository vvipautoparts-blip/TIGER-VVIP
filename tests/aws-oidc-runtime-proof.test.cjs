'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'aws-oidc-runtime-proof.yml');
const ROLE_ARN = 'arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-ProductionDeploy';
const ACTION_SHA = 'e6de054238d6b7531b4efff3b6587d9aade6a06c';

function workflow() {
  assert.equal(fs.existsSync(workflowPath), true, 'AWS OIDC runtime proof workflow must exist');
  return fs.readFileSync(workflowPath, 'utf8');
}

test('AWS OIDC runtime proof is manual, environment-bound, and minimally privileged', () => {
  const source = workflow();
  assert.match(source, /on:\s*\n\s*workflow_dispatch:\s*\{\}/);
  assert.doesNotMatch(source, /\b(push|pull_request|schedule|workflow_run):/);
  assert.match(source, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(source, /environment:\s*production-build/);
  assert.match(source, /id-token:\s*write/);
  assert.doesNotMatch(source, /\b(contents|actions|deployments|packages|security-events):\s*write\b/);
});

test('AWS OIDC runtime proof assumes only the approved role through a pinned action', () => {
  const source = workflow();
  assert.match(source, new RegExp(`aws-actions\\/configure-aws-credentials@${ACTION_SHA}`));
  assert.ok(source.includes(`role-to-assume: ${ROLE_ARN}`));
  assert.match(source, /aws-region:\s*us-east-1/);
  assert.match(source, /allowed-account-ids:\s*['"]?211579682376['"]?/);
  assert.match(source, /role-duration-seconds:\s*900/);
  assert.match(source, /unset-current-credentials:\s*true/);
});

test('AWS OIDC runtime proof contains only identity proof and forbids standing credentials or deployment', () => {
  const source = workflow();
  assert.match(source, /aws sts get-caller-identity/);
  assert.match(source, /assumed-role\/TIGER-VVIP-GitHub-ProductionDeploy\//);
  assert.doesNotMatch(source, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|secrets\./);
  assert.doesNotMatch(source, /aws\s+(amplify|s3|s3api|lambda|apigateway|apigatewayv2|cloudfront|route53|iam|cloudformation|cdk|sam)\b/i);
  assert.doesNotMatch(source, /\b(deploy|publish|sync|put-object|create-|update-|delete-)\b/i);
});

test('AWS OIDC runtime proof has no jq dependency and uses AWS CLI-native identity extraction', () => {
  const source = workflow();
  assert.doesNotMatch(source, /\bjq\b/);
  assert.match(source, /aws sts get-caller-identity[^\n]*--query\s+['"]?\[Account,Arn\]['"]?[^\n]*--output\s+text/);
});
