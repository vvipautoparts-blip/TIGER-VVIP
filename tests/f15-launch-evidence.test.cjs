'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const verifierPath = path.join(root, 'scripts/launch/verify-f15-launch-evidence.cjs');
const evidencePath = path.join(root, 'config/launch/evidence/f15-runtime-vacuum.json');
function load(){return JSON.parse(fs.readFileSync(evidencePath,'utf8'));}
function complete(){
 const e=load(); e.status='PASS'; e.release={sha:'a'.repeat(40),artifactSha256:'b'.repeat(64)};
 for(const n of ['deletionBaseline','exactTreeScan','releaseArtifactDiff','rollbackEvidence','protectedExactHead']){e[n].status='PASS';e[n].evidence=['proof'];}
 e.exactTreeScan.scanOk=true; e.protectedExactHead.runnerExecuted=true;e.protectedExactHead.sha=e.release.sha;e.launchGatePass=true;return e;
}
test('current F15 evidence remains fail-closed',()=>{const {verifyF15LaunchEvidence}=require(verifierPath);const r=verifyF15LaunchEvidence(load(),{});assert.equal(r.ok,true,r.errors.join('\n'));assert.equal(r.launchGatePass,false);assert.ok(r.blockingSections.includes('exactTreeScan'));assert.ok(r.blockingSections.includes('protectedExactHead'));});
test('F15 exact tree PASS requires successful runtime vacuum scan',()=>{const {verifyF15LaunchEvidence}=require(verifierPath);const e=complete();e.exactTreeScan.scanOk=false;const r=verifyF15LaunchEvidence(e,{currentHeadSha:e.release.sha});assert.equal(r.ok,false);assert.ok(r.errors.includes('F15_TREE_SCAN_PASS_REQUIRES_CLEAN_SCAN'));});
test('F15 protected PASS requires runner execution',()=>{const {verifyF15LaunchEvidence}=require(verifierPath);const e=complete();e.protectedExactHead.runnerExecuted=false;const r=verifyF15LaunchEvidence(e,{currentHeadSha:e.release.sha});assert.equal(r.ok,false);assert.ok(r.errors.includes('F15_PROTECTED_PASS_REQUIRES_RUNNER_EXECUTION'));});
test('F15 cannot claim PASS without all sections and release identity',()=>{const {verifyF15LaunchEvidence}=require(verifierPath);const e=load();e.status='PASS';e.launchGatePass=true;const r=verifyF15LaunchEvidence(e,{});assert.equal(r.ok,false);assert.ok(r.errors.includes('F15_PASS_REQUIRES_RELEASE_IDENTITY'));assert.ok(r.errors.includes('F15_PASS_REQUIRES_ALL_SECTIONS_PASS'));});
test('fully evidenced F15 exact release can pass',()=>{const {verifyF15LaunchEvidence}=require(verifierPath);const e=complete();const r=verifyF15LaunchEvidence(e,{currentHeadSha:e.release.sha});assert.equal(r.ok,true,r.errors.join('\n'));assert.equal(r.launchGatePass,true);});
