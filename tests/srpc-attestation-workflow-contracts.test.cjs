'use strict';
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');
const workflowPath=path.join(__dirname,'..','.github','workflows','srpc-phase-b-attest.yml');
function source(){assert.equal(fs.existsSync(workflowPath),true,'SRPC attestation workflow must exist');return fs.readFileSync(workflowPath,'utf8');}

test('attestation workflow is isolated to control-plane push',()=>{const y=source();assert.match(y,/push:\s*[\s\S]*branches:\s*[\s\S]*feat\/srpc-v1-control-plane-20260809/);assert.doesNotMatch(y,/workflow_dispatch\s*:/);assert.doesNotMatch(y,/pull_request\s*:/);});
test('attestation workflow has only required signing permissions and no secrets',()=>{const y=source();for(const p of ['contents: read','id-token: write','attestations: write','artifact-metadata: write']) assert.match(y,new RegExp(p.replace('-','\\-')));assert.doesNotMatch(y,/secrets\s*\./i);assert.doesNotMatch(y,/contents:\s*write/i);});
test('attestation workflow locks control SHA and frozen H0 and reruns static proof',()=>{const y=source();assert.match(y,/ref:\s*\$\{\{\s*github\.sha\s*\}\}/);assert.match(y,/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/);assert.match(y,/git\s+-C\s+control\s+rev-parse\s+HEAD/);assert.match(y,/node\s+--test\s+source\/tests\/global-launch-phase-b-marketplace-convergence\.test\.cjs/);assert.match(y,/GLOBAL_LAUNCH_PHASE_B_SHA256/);});
test('attestation workflow uses full pinned actions including actions attest',()=>{const y=source();const uses=[...y.matchAll(/^\s*-?\s*uses:\s*([^\s]+)\s*$/gm)].map(m=>m[1]);assert.ok(uses.length>=6);for(const use of uses) assert.match(use,/^[^@]+@[0-9a-f]{40}$/);assert.match(y,/actions\/attest@508db95dd578ae2727ebd6217d5ba78e4fbda05d/g);});
test('attestation workflow creates provenance and VVIP custom predicate on same capsule',()=>{const y=source();assert.match(y,/subject-path:\s*\$\{\{\s*runner\.temp\s*\}\}\/srpc-attest\/phase-b-sovereign-release-capsule\.tar\.gz/);assert.match(y,/predicate-type:\s*https:\/\/vvip\.tiger\/attestation\/staging-promotion\/v1/);assert.match(y,/predicate-path:\s*\$\{\{\s*runner\.temp\s*\}\}\/srpc-attest\/vvip-staging-predicate\.json/);});
test('attestation workflow verifies local bundles against signer workflow and source digest',()=>{const y=source();assert.match(y,/gh\s+attestation\s+verify/);assert.match(y,/--bundle/);assert.match(y,/--signer-workflow/);assert.match(y,/--source-digest\s+"\$GITHUB_SHA"/);assert.match(y,/--predicate-type\s+https:\/\/slsa\.dev\/provenance\/v1/);assert.match(y,/--predicate-type\s+https:\/\/vvip\.tiger\/attestation\/staging-promotion\/v1/);});
test('attestation workflow contains no database or policy mutation primitive',()=>{const y=source();for(const f of [/supabase\s+db\s+push/i,/apply_migration/i,/psql\b/i,/scan-dangerous-sql\.sh.*>/i,/git\s+push/i,/steel.*pin/i]) assert.doesNotMatch(y,f);});
