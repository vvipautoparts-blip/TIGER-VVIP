'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.resolve(__dirname, '../../scripts/nexus/proofview.js')).href;

async function loadSubject() {
  return import(moduleUrl);
}

test('qualifies exactly one billable unit only after the full ProofView policy is satisfied', async () => {
  const { qualifyProofView } = await loadSubject();
  const result = qualifyProofView({
    viewportRatio: 0.75,
    continuousMs: 2400,
    foreground: true,
    placementEligible: true,
    objectEligible: true,
    reservationValid: true,
    invalidTraffic: false,
    duplicate: false
  });
  assert.deepEqual(result, {
    qualified: true,
    code: 'PROOFVIEW_QUALIFIED',
    consumeUnits: 1,
    policyVersion: 'PROOFVIEW_V1'
  });
});

test('returns zero burn for fast scroll, background, invalid traffic, duplicates, and failed reservation', async () => {
  const { qualifyProofView } = await loadSubject();
  const base = {
    viewportRatio: 0.75,
    continuousMs: 2400,
    foreground: true,
    placementEligible: true,
    objectEligible: true,
    reservationValid: true,
    invalidTraffic: false,
    duplicate: false
  };

  for (const [patch, code] of [
    [{ continuousMs: 1999 }, 'PROOFVIEW_MIN_TIME_NOT_MET'],
    [{ viewportRatio: 0.49 }, 'PROOFVIEW_MIN_VIEWPORT_NOT_MET'],
    [{ foreground: false }, 'PROOFVIEW_BACKGROUND'],
    [{ invalidTraffic: true }, 'PROOFVIEW_INVALID_TRAFFIC'],
    [{ duplicate: true }, 'PROOFVIEW_DUPLICATE'],
    [{ reservationValid: false }, 'PROOFVIEW_RESERVATION_INVALID'],
    [{ placementEligible: false }, 'PROOFVIEW_PLACEMENT_INELIGIBLE'],
    [{ objectEligible: false }, 'PROOFVIEW_OBJECT_INELIGIBLE']
  ]) {
    const result = qualifyProofView({ ...base, ...patch });
    assert.equal(result.qualified, false);
    assert.equal(result.consumeUnits, 0);
    assert.equal(result.code, code);
    assert.equal(result.policyVersion, 'PROOFVIEW_V1');
  }
});

test('fails closed for malformed evidence', async () => {
  const { qualifyProofView } = await loadSubject();
  assert.deepEqual(qualifyProofView(null), {
    qualified: false,
    code: 'PROOFVIEW_EVIDENCE_INVALID',
    consumeUnits: 0,
    policyVersion: 'PROOFVIEW_V1'
  });
  assert.equal(qualifyProofView({ viewportRatio: 2 }).code, 'PROOFVIEW_EVIDENCE_INVALID');
});
