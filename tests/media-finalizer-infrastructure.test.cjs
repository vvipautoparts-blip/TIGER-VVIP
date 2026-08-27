const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'infra/media-finalizer/template.yaml');
const GUARD_PATH = path.join(ROOT, 'infra/media-finalizer/guard/media-finalizer.guard');

function readRequiredFile(filePath) {
  assert.equal(fs.existsSync(filePath), true, `required infrastructure file is missing: ${path.relative(ROOT, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

function compact(value) {
  return value.replace(/\r/g, '');
}

test('sealed media infrastructure is fail-closed and digest-addressed', () => {
  const template = compact(readRequiredFile(TEMPLATE_PATH));

  assert.match(template, /AWSTemplateFormatVersion\s*:/);

  // Immutable ECR authority with scan-on-push.
  assert.match(template, /AWS::ECR::Repository/);
  assert.match(template, /ImageTagMutability\s*:\s*IMMUTABLE/);
  assert.match(template, /ScanOnPush\s*:\s*true/);

  // Lambda image must enter the stack by immutable OCI digest, never a mutable tag.
  assert.match(template, /PackageType\s*:\s*Image/);
  assert.match(template, /ImageUri\s*:/);
  assert.match(template, /AllowedPattern\s*:[^\n]*sha256/);
  assert.match(template, /\[0-9a-f\]\{64\}/);

  // The Lambda Function URL is IAM-only; CloudFront OAC is its public ingress authority.
  assert.match(template, /AWS::Lambda::Url/);
  assert.match(template, /AuthType\s*:\s*AWS_IAM/);
  assert.match(template, /AWS::CloudFront::OriginAccessControl/);
  assert.match(template, /OriginAccessControlOriginType\s*:\s*lambda/i);
  assert.match(template, /SigningBehavior\s*:\s*always/i);
  assert.match(template, /SigningProtocol\s*:\s*sigv4/i);

  // Finalizer requests are never cached and forward only the explicit application headers.
  assert.match(template, /AWS::CloudFront::CachePolicy/);
  assert.match(template, /DefaultTTL\s*:\s*0/);
  assert.match(template, /MaxTTL\s*:\s*0/);
  assert.match(template, /MinTTL\s*:\s*0/);
  assert.match(template, /AWS::CloudFront::OriginRequestPolicy/);
  assert.match(template, /X-Tiger-Session/);
  assert.match(template, /x-amz-content-sha256/);
  assert.match(template, /Content-Type/);
  const allowedMethods = template.match(/AllowedMethods\s*:\s*\[([^\]]+)\]/s);
  assert.ok(allowedMethods, 'CloudFront AllowedMethods must be an explicit list');
  assert.match(allowedMethods[1], /\bPOST\b/);
  assert.match(allowedMethods[1], /\bOPTIONS\b/);

  // WAF must provide managed-rule coverage plus an explicit rate-based rule.
  assert.match(template, /AWS::WAFv2::WebACL/);
  assert.match(template, /AWSManagedRulesCommonRuleSet/);
  assert.match(template, /RateBasedStatement/);

  // Logs are retained explicitly and alarms exist for operational failure visibility.
  assert.match(template, /AWS::Logs::LogGroup/);
  assert.match(template, /RetentionInDays\s*:/);
  assert.match(template, /AWS::CloudWatch::Alarm/);

  // Runtime identity may read exactly the configured secret ARN, never wildcard Secrets Manager access.
  assert.match(template, /secretsmanager:GetSecretValue/);
  assert.match(template, /^  SupabaseSecretArn:\s*$/m);
  assert.doesNotMatch(template, /secretsmanager:\*/i);
  assert.doesNotMatch(template, /Resource\s*:\s*["']?\*["']?\s*$/m);

  // CloudFormation accepts only a secret ARN reference. It never accepts or emits secret bytes.
  const parameters = template.match(/Parameters:\s*\n([\s\S]*?)\nResources:/);
  assert.ok(parameters, 'CloudFormation Parameters block must be explicit');
  assert.doesNotMatch(parameters[1], /NoEcho\s*:\s*true/i);
  assert.doesNotMatch(parameters[1], /^\s{2}(?:ServiceRoleKey|SecretValue|SupabaseApiKey|SUPABASE_SERVICE_ROLE_KEY)\s*:/im);
  assert.doesNotMatch(template, /^\s+(?:SecretString|SecretBinary)\s*:/im);

  // No public Function URL permission is permitted in this stack.
  assert.doesNotMatch(template, /AWS::Lambda::Permission[\s\S]{0,500}Principal\s*:\s*["']?\*["']?/i);
  assert.doesNotMatch(template, /FunctionUrlAuthType\s*:\s*NONE/i);
  assert.match(template, /Principal\s*:\s*cloudfront\.amazonaws\.com/);
  assert.match(template, /cloudfront::\$\{AWS::AccountId\}:distribution\/\$\{DistributionId\}/);
});

test('CloudFormation Guard independently enforces the critical invariants', () => {
  const guard = compact(readRequiredFile(GUARD_PATH));

  assert.match(guard, /AWS::ECR::Repository/);
  assert.match(guard, /ImageTagMutability/);
  assert.match(guard, /IMMUTABLE/);
  assert.match(guard, /ScanOnPush/);
  assert.match(guard, /AWS::Lambda::Function/);
  assert.match(guard, /PackageType/);
  assert.match(guard, /Image/);
  assert.match(guard, /AWS::Lambda::Url/);
  assert.match(guard, /AWS_IAM/);
  assert.match(guard, /AWS::CloudFront::OriginAccessControl/);
  assert.match(guard, /always/i);
  assert.match(guard, /sigv4/i);
  assert.match(guard, /AWS::WAFv2::WebACL/);
  assert.match(guard, /AWS::Logs::LogGroup/);
  assert.match(guard, /RetentionInDays/);
  assert.match(guard, /secretsmanager:GetSecretValue/);
});
