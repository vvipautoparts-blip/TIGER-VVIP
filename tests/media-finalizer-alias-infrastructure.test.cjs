'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'infra', 'media-finalizer', 'template.yaml');
const GUARD_PATH = path.join(ROOT, 'infra', 'media-finalizer', 'guard', 'media-finalizer.guard');

function read(file) {
  assert.equal(fs.existsSync(file), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8').replace(/\r/g, '');
}

test('media finalizer publishes each release behind one stable live alias without early cutover', () => {
  const template = read(TEMPLATE_PATH);

  assert.match(template, /^  ReleaseSha:\s*$/m, 'RELEASE_SHA_PARAMETER_REQUIRED');
  assert.match(template, /ReleaseSha:[\s\S]{0,220}AllowedPattern:[^\n]*\[0-9a-f\][^\n]*40/i, 'RELEASE_SHA_MUST_BE_EXACT_GIT_SHA');
  assert.match(template, /^  StableAliasVersion:\s*$/m, 'STABLE_ALIAS_VERSION_PARAMETER_REQUIRED');
  assert.match(template, /^Conditions:\s*$/m, 'ALIAS_BOOTSTRAP_CONDITION_REQUIRED');
  assert.match(template, /UseRequestedStableVersion/);

  assert.match(template, /^  MediaFinalizerVersion:\s*$/m);
  assert.match(template, /MediaFinalizerVersion:[\s\S]{0,420}Type:\s*AWS::Lambda::Version/);
  assert.match(template, /MediaFinalizerVersion:[\s\S]{0,420}FunctionName:[\s\S]{0,120}MediaFinalizerFunction/);
  assert.match(template, /MediaFinalizerVersion:[\s\S]{0,420}ReleaseSha/);

  assert.match(template, /^  MediaFinalizerLiveAlias:\s*$/m);
  assert.match(template, /MediaFinalizerLiveAlias:[\s\S]{0,620}Type:\s*AWS::Lambda::Alias/);
  assert.match(template, /MediaFinalizerLiveAlias:[\s\S]{0,620}Name:\s*live\s*$/m);
  assert.match(template, /MediaFinalizerLiveAlias:[\s\S]{0,620}FunctionVersion:[\s\S]{0,280}UseRequestedStableVersion/);
  assert.match(template, /MediaFinalizerLiveAlias:[\s\S]{0,620}StableAliasVersion/);
  assert.match(template, /MediaFinalizerLiveAlias:[\s\S]{0,620}MediaFinalizerVersion/);

  assert.match(template, /MediaFinalizerFunctionUrl:[\s\S]{0,520}Qualifier:\s*live\s*$/m, 'FUNCTION_URL_MUST_TARGET_LIVE_ALIAS');
  assert.match(template, /MediaFinalizerFunctionUrl:[\s\S]{0,520}DependsOn:[\s\S]{0,120}MediaFinalizerLiveAlias/);
  assert.match(template, /MediaFinalizerCloudFrontInvokeUrlPermission:[\s\S]{0,520}FunctionName:[\s\S]{0,120}MediaFinalizerLiveAlias/);
  assert.match(template, /MediaFinalizerCloudFrontInvokeFunctionPermission:[\s\S]{0,560}FunctionName:[\s\S]{0,120}MediaFinalizerLiveAlias/);

  assert.match(template, /^  PublishedVersion:\s*$/m, 'PUBLISHED_VERSION_OUTPUT_REQUIRED');
  assert.match(template, /PublishedVersion:[\s\S]{0,220}MediaFinalizerVersion/);
  assert.match(template, /^  LiveAliasArn:\s*$/m, 'LIVE_ALIAS_OUTPUT_REQUIRED');
  assert.match(template, /LiveAliasArn:[\s\S]{0,180}MediaFinalizerLiveAlias/);
});

test('CloudFormation Guard independently requires published version, stable alias, and alias-qualified Function URL', () => {
  const guard = read(GUARD_PATH);

  assert.match(guard, /AWS::Lambda::Version/);
  assert.match(guard, /AWS::Lambda::Alias/);
  assert.match(guard, /lambda_versions/);
  assert.match(guard, /lambda_aliases/);
  assert.match(guard, /Properties\.Name\s*==\s*'live'/);
  assert.match(guard, /Properties\.Qualifier\s*==\s*'live'/);
});
