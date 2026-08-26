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

function shellRunBodies(source) {
  const lines = source.split('\n');
  const bodies = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(\s*)run:\s*\|\s*$/);
    if (!match) continue;

    const runIndent = match[1].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j];
      if (line.trim() === '') {
        body.push(line);
        continue;
      }
      const indent = line.match(/^\s*/)[0].length;
      if (indent <= runIndent) break;
      body.push(line);
    }
    bodies.push(body.join('\n'));
  }

  return bodies.join('\n');
}

test('AWS OIDC runtime proof is manual, environment-bound, and minimally privileged', () => {
  const source = workflow();
  assert.match(source, /on:\s*\n\s*workflow_dispatch:\s*\{\}/);
  assert.doesNotMatch(source, /\b(push|pull_request|schedule|workflow_run):/);
  assert.match(source, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(source, /environment:\s*production-build/);
  assert.match(source, /id-token:\s*write/);
  const writePermissions = [...source.matchAll(/^\s*([A-Za-z0-9_-]+):\s*write\s*$/gm)]
    .map(([, permission]) => permission);
  assert.deepEqual(writePermissions, ['id-token']);
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
  assert.doesNotMatch(source, /\b(deploy|publish|sync|put-object|create-|update-|delete-)\b/i);
});

test('AWS OIDC runtime proof shell permits only STS GetCallerIdentity', () => {
  const shell = shellRunBodies(workflow());
  const awsCommands = [...shell.matchAll(/\baws\s+([a-z0-9-]+)\s+([a-z0-9-]+)/gi)]
    .map(([, service, operation]) => `${service.toLowerCase()} ${operation.toLowerCase()}`);
  assert.deepEqual(awsCommands, ['sts get-caller-identity']);
});

test('AWS OIDC runtime proof has no jq dependency and uses AWS CLI-native identity extraction', () => {
  const source = workflow();
  assert.doesNotMatch(source, /\bjq\b/);
  assert.match(source, /aws sts get-caller-identity[^\n]*--query\s+['"]?\[Account,Arn\]['"]?[^\n]*--output\s+text/);
});
