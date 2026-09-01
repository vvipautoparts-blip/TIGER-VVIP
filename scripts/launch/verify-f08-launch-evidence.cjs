'use strict';

const REQUIRED_SECTIONS = Object.freeze(['implementation','focusedTests','isolatedRehearsal','protectedExactHead']);
const ALLOWED_STATUS = new Set(['PASS','IN_PROGRESS','FOUNDATION_EXISTS','NOT_EVIDENCED','BLOCKED']);

function isHex(value, size) {
  return typeof value === 'string' && new RegExp(`^[0-9a-f]{${size}}$`, 'i').test(value);
}
function evidenceOk(value) {
  return Array.isArray(value) && value.length > 0 && value.every(x => typeof x === 'string' && x.trim());
}

function verifyF08LaunchEvidence(record, context = {}) {
  const errors = [];
  const blockingSections = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return Object.freeze({ ok:false, launchGatePass:false, blockingSections:Object.freeze([...REQUIRED_SECTIONS]), errors:Object.freeze(['F08_EVIDENCE_OBJECT_REQUIRED']) });
  }
  if (record.schemaVersion !== 'TIGER_F08_LAUNCH_EVIDENCE_V1') errors.push('F08_EVIDENCE_SCHEMA_INVALID');
  for (const name of REQUIRED_SECTIONS) {
    const section = record[name];
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      errors.push(`F08_MISSING_SECTION:${name}`); blockingSections.push(name); continue;
    }
    if (!ALLOWED_STATUS.has(section.status)) {
      errors.push(`F08_INVALID_SECTION_STATUS:${name}`); blockingSections.push(name); continue;
    }
    if (section.status === 'PASS') {
      if (!evidenceOk(section.evidence)) errors.push(`F08_PASS_SECTION_REQUIRES_EVIDENCE:${name}`);
    } else blockingSections.push(name);
  }

  const rehearsal = record.isolatedRehearsal || {};
  if (rehearsal.status === 'PASS' && (rehearsal.objectCount !== 25000 || rehearsal.validationOk !== true)) {
    errors.push('F08_REHEARSAL_PASS_REQUIRES_EXACTLY_25000_VALIDATED_OBJECTS');
  }
  const protectedSection = record.protectedExactHead || {};
  if (protectedSection.status === 'PASS' && protectedSection.runnerExecuted !== true) {
    errors.push('F08_PROTECTED_PASS_REQUIRES_RUNNER_EXECUTION');
  }

  const release = record.release && typeof record.release === 'object' ? record.release : {};
  const releaseIdentity = isHex(release.sha,40) && isHex(release.artifactSha256,64);
  const allPass = REQUIRED_SECTIONS.every(name => record[name] && record[name].status === 'PASS' && evidenceOk(record[name].evidence));
  if ((record.status === 'PASS' || record.launchGatePass === true) && !releaseIdentity) errors.push('F08_PASS_REQUIRES_RELEASE_IDENTITY');
  if ((record.status === 'PASS' || record.launchGatePass === true) && !allPass) errors.push('F08_PASS_REQUIRES_ALL_SECTIONS_PASS');
  if (protectedSection.status === 'PASS' && releaseIdentity && protectedSection.sha !== release.sha) errors.push('F08_PROTECTED_SHA_MUST_MATCH_RELEASE');
  if (releaseIdentity && context.currentHeadSha && release.sha !== context.currentHeadSha) errors.push('F08_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD');

  const computed = allPass && releaseIdentity && rehearsal.objectCount === 25000 && rehearsal.validationOk === true && protectedSection.runnerExecuted === true && protectedSection.sha === release.sha;
  if (computed && record.status !== 'PASS') errors.push('F08_STATUS_MUST_MATCH_EVIDENCE');
  if (computed && record.launchGatePass !== true) errors.push('F08_LAUNCH_GATE_FLAG_MUST_MATCH_EVIDENCE');

  return Object.freeze({ ok:errors.length===0, launchGatePass:computed && record.status==='PASS' && record.launchGatePass===true && errors.length===0, blockingSections:Object.freeze([...new Set(blockingSections)]), errors:Object.freeze(errors) });
}
module.exports = Object.freeze({ REQUIRED_SECTIONS, verifyF08LaunchEvidence });
