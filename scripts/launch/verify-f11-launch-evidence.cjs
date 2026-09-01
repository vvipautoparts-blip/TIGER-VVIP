'use strict';

const { verifyPhaseEvidence } = require('./verify-phase-evidence.cjs');

const REQUIRED_CHECKS = Object.freeze([
  'nativeThinShells',
  'android20of20',
  'ios20of20',
  'physicalDeviceEvidence',
  'protectedExactHead'
]);

function verifyF11LaunchEvidence(evidence, context = {}) {
  return verifyPhaseEvidence(evidence, {
    phase: 'F11',
    schemaVersion: 'TIGER_F11_LAUNCH_EVIDENCE_V1',
    requiredChecks: REQUIRED_CHECKS,
    currentHeadSha: context.currentHeadSha,
    validatePassMetrics(metrics) {
      if (
        metrics.androidRequired !== 20 ||
        metrics.androidPassed !== 20 ||
        metrics.iosRequired !== 20 ||
        metrics.iosPassed !== 20 ||
        metrics.physicalDevices !== true
      ) return 'F11_REQUIRES_ANDROID_20_AND_IOS_20_PHYSICAL';
      return null;
    }
  });
}

module.exports = Object.freeze({ REQUIRED_CHECKS, verifyF11LaunchEvidence });
