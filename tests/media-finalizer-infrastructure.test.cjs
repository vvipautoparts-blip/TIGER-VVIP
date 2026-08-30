'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const paths = {
  foundation: 'infra/media-finalizer/foundation/template.yaml',
  foundationGuard: 'infra/media-finalizer/foundation/guard.guard',
  regional: 'infra/media-finalizer/regional/template.yaml',
  regionalGuard: 'infra/media-finalizer/regional/guard.guard',
  edge: 'infra/media-finalizer/edge/template.yaml',
  edgeGuard: 'infra/media-finalizer/edge/guard.guard',
};
function read(relative) {
  const absolute = path.join(ROOT, relative);
  assert.equal(fs.existsSync(absolute), true, `REQUIRED_SPLIT_INFRA_MISSING:${relative}`);
  return fs.readFileSync(absolute, 'utf8').replace(/\r/g, '');
}

test('media build foundation is retained, KMS-encrypted, immutable, and runtime-free', () => {
  const yaml = read(paths.foundation);
  assert.match(yaml, /AWS::KMS::Key/);
  assert.match(yaml, /AWS::ECR::Repository/);
  assert.match(yaml, /DeletionPolicy:\s*Retain/);
  assert.match(yaml, /UpdateReplacePolicy:\s*Retain/);
  assert.match(yaml, /EncryptionType:\s*KMS/);
  assert.match(yaml, /ImageTagMutability:\s*IMMUTABLE/);
  assert.match(yaml, /ScanOnPush:\s*true/);
  assert.match(yaml, /RoleName:\s*TIGER-VVIP-GitHub-MediaBuild/);
  assert.match(yaml, /sts:AssumeRoleWithWebIdentity/);
  assert.match(yaml, /repository_owner_id/);
  assert.match(yaml, /repository_id/);
  assert.match(yaml, /media-build/);
  assert.doesNotMatch(yaml, /AWS::Lambda::Function|AWS::CloudFront::Distribution|AWS::WAFv2::WebACL/);
  assert.doesNotMatch(yaml, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AdministratorAccess/);
});

test('Seoul regional runtime is digest-only, IAM-only, bounded, and has exact edge binding', () => {
  const yaml = read(paths.regional);
  assert.match(yaml, /AllowedPattern:[^\n]*sha256/);
  assert.match(yaml, /sha256:\[0-9a-f\]\{64\}/);
  assert.match(yaml, /PackageType:\s*Image/);
  assert.match(yaml, /MemorySize:\s*2048/);
  assert.match(yaml, /Timeout:\s*30/);
  assert.match(yaml, /ReservedConcurrentExecutions:\s*8/);
  assert.match(yaml, /AWS::Lambda::Url/);
  assert.match(yaml, /AuthType:\s*AWS_IAM/);
  assert.match(yaml, /secretsmanager:GetSecretValue/);
  assert.match(yaml, /Ref:\s*SupabaseSecretArn/);
  assert.match(yaml, /SqsManagedSseEnabled:\s*true/);
  assert.match(yaml, /CloudFrontDistributionArn/);
  assert.match(yaml, /Principal:\s*cloudfront\.amazonaws\.com/);
  assert.match(yaml, /FunctionUrlAuthType:\s*AWS_IAM/);
  assert.match(yaml, /InvokedViaFunctionUrl:\s*true/);
  assert.doesNotMatch(yaml, /FunctionUrlAuthType:\s*NONE|AuthType:\s*NONE/);
  assert.doesNotMatch(yaml, /Principal:\s*['"]?\*['"]?/);
  assert.doesNotMatch(yaml, /^\s+(?:SecretString|SecretBinary)\s*:/im);
  assert.doesNotMatch(yaml, /AWS::ECR::Repository|AWS::CloudFront::Distribution|AWS::WAFv2::WebACL|AWS::CertificateManager::Certificate/);
});

test('Global Edge is custom-TLS, SigV4 OAC, no-cache, layered WAF, and runtime-free', () => {
  const yaml = read(paths.edge);
  assert.match(yaml, /AWS::CertificateManager::Certificate/);
  assert.match(yaml, /AWS::CloudFront::Distribution/);
  assert.match(yaml, /AWS::CloudFront::OriginAccessControl/);
  assert.match(yaml, /OriginAccessControlOriginType:\s*lambda/);
  assert.match(yaml, /SigningBehavior:\s*always/);
  assert.match(yaml, /SigningProtocol:\s*sigv4/);
  assert.match(yaml, /DefaultTTL:\s*0/);
  assert.match(yaml, /MaxTTL:\s*0/);
  assert.match(yaml, /MinTTL:\s*0/);
  assert.match(yaml, /X-Tiger-Session/);
  assert.match(yaml, /x-amz-content-sha256/);
  assert.match(yaml, /Content-Type/);
  assert.match(yaml, /Scope:\s*CLOUDFRONT/);
  assert.match(yaml, /AWSManagedRulesCommonRuleSet/);
  assert.match(yaml, /AWSManagedRulesKnownBadInputsRuleSet/);
  assert.match(yaml, /AWSManagedRulesAmazonIpReputationList/);
  assert.match(yaml, /RateBasedStatement/);
  assert.match(yaml, /TLSv1\.2_2025/);
  assert.match(yaml, /PriceClass:\s*PriceClass_All/);
  assert.doesNotMatch(yaml, /CloudFrontDefaultCertificate:\s*true/);
  assert.doesNotMatch(yaml, /AWS::Lambda::Function|AWS::ECR::Repository/);
});

test('CloudFormation Guard independently encodes each authority boundary', () => {
  const foundation = read(paths.foundationGuard);
  const regional = read(paths.regionalGuard);
  const edge = read(paths.edgeGuard);
  assert.match(foundation, /AWS::ECR::Repository/);
  assert.match(foundation, /AWS::KMS::Key/);
  assert.match(foundation, /IMMUTABLE/);
  assert.match(foundation, /media-build/);
  assert.match(regional, /AWS::Lambda::Function/);
  assert.match(regional, /AWS::Lambda::Url/);
  assert.match(regional, /AWS_IAM/);
  assert.match(regional, /cloudfront\.amazonaws\.com/);
  assert.match(edge, /AWS::CloudFront::Distribution/);
  assert.match(edge, /AWS::CloudFront::OriginAccessControl/);
  assert.match(edge, /AWS::WAFv2::WebACL/);
  assert.match(edge, /TLSv1\.2_2025/);
});
