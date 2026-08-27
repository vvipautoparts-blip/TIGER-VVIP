'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'infra', 'media-finalizer', 'template.yaml');
const GUARD = path.join(ROOT, 'infra', 'media-finalizer', 'guard', 'media-finalizer.guard');

function read(file) {
  assert.equal(fs.existsSync(file), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8').replace(/\r/g, '');
}

test('approved Lambda runtime capacity is exact and fail-closed', () => {
  const template = read(TEMPLATE);
  const fn = template.match(/^  MediaFinalizerFunction:\s*$([\s\S]*?)(?=^  MediaFinalizerVersion:\s*$)/m);
  assert.ok(fn, 'MEDIA_FINALIZER_FUNCTION_BLOCK_REQUIRED');
  assert.match(fn[1], /^      MemorySize:\s*2048\s*$/m);
  assert.match(fn[1], /^      Timeout:\s*30\s*$/m);
  assert.match(fn[1], /^      ReservedConcurrentExecutions:\s*8\s*$/m);
  assert.match(fn[1], /^      DeadLetterConfig:\s*$/m);
  assert.match(fn[1], /TargetArn:[\s\S]{0,160}MediaFinalizerDeadLetterQueue[\s\S]{0,80}- Arn/);
});

test('dedicated SQS DLQ is encrypted, retained long enough for incident recovery, and narrowly writable', () => {
  const template = read(TEMPLATE);
  const queue = template.match(/^  MediaFinalizerDeadLetterQueue:\s*$([\s\S]*?)(?=^  MediaFinalizerFunction:\s*$)/m);
  assert.ok(queue, 'MEDIA_FINALIZER_DLQ_REQUIRED');
  assert.match(queue[1], /Type:\s*AWS::SQS::Queue/);
  assert.match(queue[1], /^      SqsManagedSseEnabled:\s*true\s*$/m);
  assert.match(queue[1], /^      MessageRetentionPeriod:\s*1209600\s*$/m);

  assert.match(template, /PolicyName:\s*media-finalizer-dlq[\s\S]{0,500}sqs:SendMessage/);
  assert.match(template, /sqs:SendMessage[\s\S]{0,260}MediaFinalizerDeadLetterQueue[\s\S]{0,80}- Arn/);
  assert.doesNotMatch(template, /sqs:\*/i);
});

test('CloudFormation Guard independently enforces capacity and DLQ invariants', () => {
  const guard = read(GUARD);
  assert.match(guard, /AWS::SQS::Queue/);
  assert.match(guard, /Properties\.MemorySize\s*==\s*2048/);
  assert.match(guard, /Properties\.Timeout\s*==\s*30/);
  assert.match(guard, /Properties\.ReservedConcurrentExecutions\s*==\s*8/);
  assert.match(guard, /Properties\.DeadLetterConfig\.TargetArn\s+exists/);
  assert.match(guard, /Properties\.SqsManagedSseEnabled\s*==\s*true/);
  assert.match(guard, /Properties\.MessageRetentionPeriod\s*==\s*1209600/);
  assert.match(guard, /sqs:SendMessage/);
});
