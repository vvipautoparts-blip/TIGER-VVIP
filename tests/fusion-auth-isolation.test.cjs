'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'auth-clerk-index.js'), 'utf8');
const fusionCss = fs.readFileSync(path.join(root, 'styles', 'fusion', 'f02-single-surface.css'), 'utf8');
const controllerPath = path.join(root, 'scripts', 'fusion', 'single-surface-controller.js');

test('FUSION shell keeps the existing Clerk gate and isolated marketplace styling', () => {
  assert.match(index, /data-vvip-auth-gate/);
  assert.match(index, /id="clerk-main-auth"/);
  assert.match(index, /styles\/fusion\/f02-single-surface\.css/);
  assert.doesNotMatch(fusionCss, /\.auth-gate\b/);
  assert.doesNotMatch(fusionCss, /#clerk-main-auth/);
  assert.doesNotMatch(fusionCss, /#clerk-sign-in/);
});

test('auth runtime delegates public-home presentation to FUSION without transferring auth authority', () => {
  assert.match(auth, /VVIPFusionSurface/);
  assert.match(auth, /showHome/);
  assert.match(auth, /requireAuth/);
  assert.match(auth, /continueWithoutSignIn/);
});

test('FUSION presentation controller cannot become a parallel Clerk authority', () => {
  const controller = fs.readFileSync(controllerPath, 'utf8');
  assert.doesNotMatch(controller, /mountSignIn/);
  assert.doesNotMatch(controller, /isSignedIn/);
  assert.doesNotMatch(controller, /data-vvip-auth-gate/);
  assert.doesNotMatch(controller, /clerk/i);
  assert.match(controller, /showHome/);
  assert.match(controller, /data-vvip-fusion-authoritative/);
});
