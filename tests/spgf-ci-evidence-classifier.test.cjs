'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyCiJob } = require('../scripts/release/ci-evidence-classifier.cjs');
test('runner_id zero and zero steps is BLOCKED_RUNNER even when GitHub conclusion is failure', () => {
  const state = classifyCiJob({status:'completed', conclusion:'failure', runner_id:0, runner_name:'', steps:[]});
  assert.equal(state, 'BLOCKED_RUNNER');
});
test('executed success is GREEN only with assigned runner and steps', () => {
  assert.equal(classifyCiJob({status:'completed', conclusion:'success', runner_id:42, steps:[{name:'test',conclusion:'success'}]}), 'EXECUTED_GREEN');
  assert.equal(classifyCiJob({status:'completed', conclusion:'success', runner_id:0, steps:[]}), 'BLOCKED_RUNNER');
});
test('executed failure can be classified by gate domain', () => {
  const job = {status:'completed', conclusion:'failure', runner_id:42, steps:[{name:'test',conclusion:'failure'}]};
  assert.equal(classifyCiJob(job,{domain:'security'}), 'EXECUTED_SECURITY_RED');
  assert.equal(classifyCiJob(job,{domain:'policy'}), 'EXECUTED_POLICY_RED');
  assert.equal(classifyCiJob(job,{domain:'code'}), 'EXECUTED_CODE_RED');
});
test('provider/account diagnostics override generic unverified states but never fake green', () => {
  assert.equal(classifyCiJob({status:'completed',conclusion:'failure',runner_id:0,steps:[]},{diagnostic:'BLOCKED_ACCOUNT'}), 'BLOCKED_ACCOUNT');
  assert.equal(classifyCiJob({status:'completed',conclusion:'failure',runner_id:0,steps:[]},{diagnostic:'BLOCKED_PROVIDER'}), 'BLOCKED_PROVIDER');
});
