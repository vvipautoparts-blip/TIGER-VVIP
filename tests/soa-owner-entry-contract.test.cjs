'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const htmlPath=path.join(root,'owner-control.html');
const entryPath=path.join(root,'scripts/security/soa/owner-entry.js');
const edgePath=path.join(root,'supabase/functions/tiger-sovereign-owner-access/index.ts');

test('owner-control uses only SOA entry in production bootstrap path',()=>{
  assert.equal(fs.existsSync(htmlPath),true,'owner-control.html must exist');
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(html,/scripts\/security\/soa\/owner-entry\.js/);
  assert.doesNotMatch(html,/scripts\/pr35\/pr35-bootstrap\.js/);
  assert.doesNotMatch(html,/vvip-ai-owner-console|vvip-ai-command-center/);
  assert.match(html,/meta\s+name=["']tiger-soa-owner-access-endpoint["']/);
  assert.match(html,/data-soa-owner-name/);
  assert.match(html,/data-soa-owner-protection/);
});

test('SOA owner entry never uses legacy browser authority in production path',()=>{
  const source=fs.readFileSync(entryPath,'utf8');
  assert.match(source,/localPreview\(locationLike\)/);
  assert.match(source,/loadLocalPreview/);
  assert.match(source,/decision\.mode === 'READY'/);
  assert.doesNotMatch(source,/__VVIP_PR35_IDENTITY__/);
  assert.doesNotMatch(source,/localStorage|sessionStorage|console\.(?:log|debug|info|warn|error)/);
});

test('owner access Edge Function is authentication-bound and private-vault blind',()=>{
  assert.equal(fs.existsSync(edgePath),true,'SOA owner Edge Function must exist');
  const source=fs.readFileSync(edgePath,'utf8');
  assert.match(source,/Authorization/);
  assert.match(source,/X-Tiger-Verification-Purpose["']?:?\s*["']sovereign-owner/);
  assert.match(source,/soa_owner_authority_bindings/);
  assert.match(source,/soa_owner_security_state/);
  assert.match(source,/soa_owner_public_profiles/);
  assert.doesNotMatch(source,/soa_owner_private_vault/);
  assert.match(source,/Cache-Control["']?:?\s*["']no-store/);
  assert.match(source,/source:\s*["']SOA_SERVER_VERIFIED["']/);
  assert.doesNotMatch(source,/roles\.includes\(["']OWNER["']\)/);
});
