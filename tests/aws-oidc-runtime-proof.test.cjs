'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'aws-oidc-runtime-proof.yml');
const trustPath = path.join(process.cwd(), 'infra', 'aws', 'iam', 'github-oidc-proof-trust.json');
const ROLE_ARN = 'arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-OIDCProof';
const ACTION_SHA = 'e6de054238d6b7531b4efff3b6587d9aade6a06c';
const EXPECTED_SUB = 'repo:vvipautoparts-blip/TIGER-VVIP:ref:refs/heads/main';

function workflow() {
  assert.equal(fs.existsSync(workflowPath), true, 'AWS OIDC identity proof workflow must exist');
  return fs.readFileSync(workflowPath, 'utf8');
}

function trustPolicy() {
  assert.equal(fs.existsSync(trustPath), true, 'canonical OIDCProof trust policy must exist');
  return JSON.parse(fs.readFileSync(trustPath, 'utf8'));
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

test('AWS OIDC identity proof runs on protected main and manual dispatch without a Production environment', () => {
  const source = workflow();
  assert.match(source, /on:\s*\n[\s\S]*?push:\s*\n\s*branches:\s*\n\s*-\s*main/);
  assert.match(source, /workflow_dispatch:\s*\{\}/);
  assert.doesNotMatch(source, /\benvironment\s*:/);
  assert.match(source, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(source, /id-token:\s*write/);
  const writePermissions = [...source.matchAll(/^\s*([A-Za-z0-9_-]+):\s*write\s*$/gm)]
    .map(([, permission]) => permission);
  assert.deepEqual(writePermissions, ['id-token']);
});

test('AWS OIDC identity proof isolates duplicate runs by exact SHA', () => {
  const source = workflow();
  assert.match(source, /group:\s*aws-oidc-identity-proof-\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(source, /cancel-in-progress:\s*true/);
});

test('AWS OIDC identity proof assumes only the zero-permission proof role through a pinned action', () => {
  const source = workflow();
  assert.match(source, new RegExp(`aws-actions\\/configure-aws-credentials@${ACTION_SHA}`));
  assert.ok(source.includes(`role-to-assume: ${ROLE_ARN}`));
  assert.match(source, /aws-region:\s*us-east-1/);
  assert.match(source, /allowed-account-ids:\s*['"]?211579682376['"]?/);
  assert.match(source, /role-duration-seconds:\s*900/);
  assert.match(source, /unset-current-credentials:\s*true/);
});

test('canonical OIDCProof trust policy is exact, main-bound, and wildcard-free', () => {
  const policy = trustPolicy();
  assert.equal(policy.Version, '2012-10-17');
  assert.equal(policy.Statement.length, 1);
  const statement = policy.Statement[0];
  assert.equal(statement.Effect, 'Allow');
  assert.equal(statement.Action, 'sts:AssumeRoleWithWebIdentity');
  assert.equal(
    statement.Principal.Federated,
    'arn:aws:iam::211579682376:oidc-provider/token.actions.githubusercontent.com',
  );
  assert.deepEqual(statement.Condition.StringEquals, {
    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    'token.actions.githubusercontent.com:sub': EXPECTED_SUB,
    'token.actions.githubusercontent.com:repository_id': '1273805565',
    'token.actions.githubusercontent.com:repository_owner_id': '294954557',
    'token.actions.githubusercontent.com:ref': 'refs/heads/main',
  });
  const serialized = JSON.stringify(policy);
  assert.doesNotMatch(serialized, /\*/);
  assert.doesNotMatch(serialized, /"Resource"|"NotResource"/);
});

test('AWS OIDC identity proof contains only identity proof and forbids standing credentials or deployment', () => {
  const source = workflow();
  assert.match(source, /aws sts get-caller-identity/);
  assert.match(source, /assumed-role\/TIGER-VVIP-GitHub-OIDCProof\//);
  assert.match(source, /AWS_OIDC_IDENTITY_PROOF=PASS/);
  assert.doesNotMatch(source, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|secrets\./);
  assert.doesNotMatch(source, /\b(deploy|publish|sync|put-object|create-|update-|delete-)\b/i);
});

test('AWS OIDC identity proof shell permits only STS GetCallerIdentity', () => {
  const shell = shellRunBodies(workflow());
  const awsCommands = [...shell.matchAll(/\baws\s+([a-z0-9-]+)\s+([a-z0-9-]+)/gi)]
    .map(([, service, operation]) => `${service.toLowerCase()} ${operation.toLowerCase()}`);
  assert.deepEqual(awsCommands, ['sts get-caller-identity']);
});

test('AWS OIDC identity proof has no jq dependency and uses AWS CLI-native identity extraction', () => {
  const source = workflow();
  assert.doesNotMatch(source, /\bjq\b/);
  assert.match(source, /aws sts get-caller-identity[^\n]*--query\s+['"]?\[Account,Arn\]['"]?[^\n]*--output\s+text/);
});
