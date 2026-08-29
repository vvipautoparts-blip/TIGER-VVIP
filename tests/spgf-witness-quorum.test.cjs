'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyWitnessQuorum } = require('../scripts/release/witness-quorum.cjs');
const release = 'sha256:'+'a'.repeat(64);
test('current governance requires GitHub executed green', () => {
  const result = verifyWitnessQuorum({releaseDigest:release,github:{state:'EXECUTED_GREEN',releaseDigest:release},independent:[]},{requireGithubExecutedGreen:true,allowProviderOutageSubstitution:false});
  assert.equal(result.ok,true);
});
test('independent witnesses cannot bypass #346 GitHub requirement', () => {
  const result = verifyWitnessQuorum({releaseDigest:release,github:{state:'BLOCKED_RUNNER',releaseDigest:release},independent:[{state:'VERIFIED',releaseDigest:release},{state:'VERIFIED',releaseDigest:release}]},{requireGithubExecutedGreen:true,allowProviderOutageSubstitution:false,predecessorPullRequest:346});
  assert.equal(result.ok,false);
  assert.equal(result.code,'WITNESS_GITHUB_EXECUTED_GREEN_REQUIRED');
});
test('witness release mismatch fails closed', () => {
  const result = verifyWitnessQuorum({releaseDigest:release,github:{state:'EXECUTED_GREEN',releaseDigest:'sha256:'+'b'.repeat(64)},independent:[]},{requireGithubExecutedGreen:true,allowProviderOutageSubstitution:false});
  assert.equal(result.code,'WITNESS_RELEASE_MISMATCH');
});
