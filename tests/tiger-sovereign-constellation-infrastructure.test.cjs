'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const files = {
  foundation: 'infra/media-finalizer/foundation/template.yaml',
  foundationGuard: 'infra/media-finalizer/foundation/guard.guard',
  regional: 'infra/media-finalizer/regional/template.yaml',
  regionalGuard: 'infra/media-finalizer/regional/guard.guard',
  edge: 'infra/media-finalizer/edge/template.yaml',
  edgeGuard: 'infra/media-finalizer/edge/guard.guard',
};
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r/g, '');

test('Sovereign Constellation infrastructure authorities are physically split', () => {
  for (const relative of Object.values(files)) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), true, `MISSING_AUTHORITY:${relative}`);
  }
});

test('Seoul foundation owns ECR/KMS/build OIDC authority only', () => {
  const yaml = read(files.foundation);
  assert.match(yaml, /AWS::KMS::Key/);
  assert.match(yaml, /AWS::ECR::Repository/);
  assert.match(yaml, /EncryptionType:\s*KMS/);
  assert.match(yaml, /ImageTagMutability:\s*IMMUTABLE/);
  assert.match(yaml, /TIGER-VVIP-GitHub-MediaBuild/);
  assert.match(yaml, /token\.actions\.githubusercontent\.com/);
  assert.match(yaml, /repository_owner_id/);
  assert.match(yaml, /repository_id/);
  assert.match(yaml, /environment/);
  assert.match(yaml, /media-build/);
  assert.match(yaml, /DeletionPolicy:\s*Retain/);
  assert.match(yaml, /UpdateReplacePolicy:\s*Retain/);
  assert.match(yaml, /kms:GenerateDataKey/);
  assert.match(yaml, /kms:Decrypt/);
  assert.match(yaml, /ecr:GetAuthorizationToken/);
  assert.match(yaml, /ecr:GetRegistryScanningConfiguration/);
  assert.doesNotMatch(yaml, /ecr:PutRegistryScanningConfiguration/);
  for (const action of [
    'ecr:BatchCheckLayerAvailability',
    'ecr:GetDownloadUrlForLayer',
    'ecr:BatchGetImage',
    'ecr:InitiateLayerUpload',
    'ecr:UploadLayerPart',
    'ecr:CompleteLayerUpload',
    'ecr:PutImage',
    'ecr:DescribeImages',
    'ecr:DescribeImageScanFindings',
    'ecr:DescribeRepositories',
  ]) assert.match(yaml, new RegExp(action.replace(':', '\\:')));
  assert.doesNotMatch(yaml, /Action:\s*['"]?\*['"]?/);
  assert.doesNotMatch(yaml, /AdministratorAccess/);
  assert.doesNotMatch(yaml, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY/);
  assert.doesNotMatch(yaml, /AWS::Lambda::Function/);
  assert.doesNotMatch(yaml, /AWS::CloudFront::Distribution/);
  assert.doesNotMatch(yaml, /AWS::WAFv2::WebACL/);
});

test('foundation Guard requires scanning proof read authority and forbids mutation authority', () => {
  const guard = read(files.foundationGuard);
  assert.match(guard, /ecr:GetRegistryScanningConfiguration/);
  assert.match(guard, /ecr:PutRegistryScanningConfiguration/);
  assert.match(guard, /not\s+.*PutRegistryScanningConfiguration|PutRegistryScanningConfiguration.*empty/s);
});

test('Seoul regional runtime excludes edge and ECR ownership', () => {
  const yaml = read(files.regional);
  assert.match(yaml, /AWS::Lambda::Function/);
  assert.match(yaml, /AWS::Lambda::Url/);
  assert.match(yaml, /AuthType:\s*AWS_IAM/);
  assert.match(yaml, /AWS::SQS::Queue/);
  assert.match(yaml, /AWS::CloudWatch::Alarm/);
  assert.match(yaml, /CloudFrontDistributionArn/);
  assert.match(yaml, /ImageUri/);
  assert.match(yaml, /sha256:\[0-9a-f\]\{64\}/);
  assert.match(yaml, /MemorySize:\s*2048/);
  assert.match(yaml, /Timeout:\s*30/);
  assert.match(yaml, /ReservedConcurrentExecutions:\s*8/);
  assert.match(yaml, /AWS::Lambda::Version/);
  assert.match(yaml, /AWS::Lambda::Alias/);
  assert.match(yaml, /Name:\s*live/);
  assert.match(yaml, /AWS::Lambda::Permission/);
  assert.match(yaml, /Principal:\s*cloudfront\.amazonaws\.com/);
  assert.match(yaml, /FunctionUrlAuthType:\s*AWS_IAM/);
  assert.match(yaml, /InvokedViaFunctionUrl:\s*true/);
  assert.doesNotMatch(yaml, /AdditionalVersionWeights/);
  assert.doesNotMatch(yaml, /Principal:\s*['"]?\*['"]?/);
  assert.doesNotMatch(yaml, /AWS::ECR::Repository/);
  assert.doesNotMatch(yaml, /AWS::CloudFront::Distribution/);
  assert.doesNotMatch(yaml, /AWS::WAFv2::WebACL/);
  assert.doesNotMatch(yaml, /AWS::CertificateManager::Certificate/);
});

test('global edge owns custom TLS, CloudFront, OAC and CLOUDFRONT WAF only', () => {
  const yaml = read(files.edge);
  assert.match(yaml, /AWS::CertificateManager::Certificate/);
  assert.match(yaml, /AWS::CloudFront::Distribution/);
  assert.match(yaml, /AWS::CloudFront::OriginAccessControl/);
  assert.match(yaml, /AWS::WAFv2::WebACL/);
  assert.match(yaml, /Scope:\s*CLOUDFRONT/);
  assert.match(yaml, /HttpVersion:\s*http2and3/);
  assert.match(yaml, /IPV6Enabled:\s*true/);
  assert.match(yaml, /PriceClass:\s*PriceClass_All/);
  assert.match(yaml, /TLSv1\.2_2025/);
  assert.match(yaml, /SslSupportMethod:\s*sni-only/);
  assert.match(yaml, /ViewerProtocolPolicy:\s*https-only/);
  assert.match(yaml, /OriginAccessControlOriginType:\s*lambda/);
  assert.match(yaml, /SigningBehavior:\s*always/);
  assert.match(yaml, /SigningProtocol:\s*sigv4/);
  assert.match(yaml, /AWSManagedRulesCommonRuleSet/);
  assert.match(yaml, /AWSManagedRulesKnownBadInputsRuleSet/);
  assert.match(yaml, /AWSManagedRulesAmazonIpReputationList/);
  assert.match(yaml, /RateBasedStatement/);
  assert.match(yaml, /DefaultTTL:\s*0/);
  assert.match(yaml, /MaxTTL:\s*0/);
  assert.match(yaml, /MinTTL:\s*0/);
  assert.match(yaml, /OversizeHandling:\s*MATCH/);
  assert.match(yaml, /content-type/i);
  assert.doesNotMatch(yaml, /CloudFrontDefaultCertificate:\s*true/);
  assert.doesNotMatch(yaml, /AWS::Lambda::Function/);
  assert.doesNotMatch(yaml, /AWS::ECR::Repository/);
});
