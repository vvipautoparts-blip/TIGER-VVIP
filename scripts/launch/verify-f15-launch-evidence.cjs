'use strict';
const REQUIRED_SECTIONS=Object.freeze(['deletionBaseline','exactTreeScan','releaseArtifactDiff','rollbackEvidence','protectedExactHead']);
const ALLOWED_STATUS=new Set(['PASS','IN_PROGRESS','FOUNDATION_EXISTS','NOT_EVIDENCED','BLOCKED']);
function isHex(v,n){return typeof v==='string'&&new RegExp(`^[0-9a-f]{${n}}$`,'i').test(v);}
function evidenceOk(v){return Array.isArray(v)&&v.length>0&&v.every(x=>typeof x==='string'&&x.trim());}
function verifyF15LaunchEvidence(record,context={}){
 const errors=[],blockingSections=[];
 if(!record||typeof record!=='object'||Array.isArray(record))return Object.freeze({ok:false,launchGatePass:false,blockingSections:Object.freeze([...REQUIRED_SECTIONS]),errors:Object.freeze(['F15_EVIDENCE_OBJECT_REQUIRED'])});
 if(record.schemaVersion!=='TIGER_F15_LAUNCH_EVIDENCE_V1')errors.push('F15_EVIDENCE_SCHEMA_INVALID');
 for(const n of REQUIRED_SECTIONS){const s=record[n];if(!s||typeof s!=='object'||Array.isArray(s)){errors.push(`F15_MISSING_SECTION:${n}`);blockingSections.push(n);continue;}if(!ALLOWED_STATUS.has(s.status)){errors.push(`F15_INVALID_SECTION_STATUS:${n}`);blockingSections.push(n);continue;}if(s.status==='PASS'){if(!evidenceOk(s.evidence))errors.push(`F15_PASS_SECTION_REQUIRES_EVIDENCE:${n}`);}else blockingSections.push(n);}
 const scan=record.exactTreeScan||{};if(scan.status==='PASS'&&scan.scanOk!==true)errors.push('F15_TREE_SCAN_PASS_REQUIRES_CLEAN_SCAN');
 const protectedSection=record.protectedExactHead||{};if(protectedSection.status==='PASS'&&protectedSection.runnerExecuted!==true)errors.push('F15_PROTECTED_PASS_REQUIRES_RUNNER_EXECUTION');
 const release=record.release&&typeof record.release==='object'?record.release:{};const releaseIdentity=isHex(release.sha,40)&&isHex(release.artifactSha256,64);
 const allPass=REQUIRED_SECTIONS.every(n=>record[n]&&record[n].status==='PASS'&&evidenceOk(record[n].evidence));
 if((record.status==='PASS'||record.launchGatePass===true)&&!releaseIdentity)errors.push('F15_PASS_REQUIRES_RELEASE_IDENTITY');
 if((record.status==='PASS'||record.launchGatePass===true)&&!allPass)errors.push('F15_PASS_REQUIRES_ALL_SECTIONS_PASS');
 if(protectedSection.status==='PASS'&&releaseIdentity&&protectedSection.sha!==release.sha)errors.push('F15_PROTECTED_SHA_MUST_MATCH_RELEASE');
 if(releaseIdentity&&context.currentHeadSha&&release.sha!==context.currentHeadSha)errors.push('F15_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD');
 const computed=allPass&&releaseIdentity&&scan.scanOk===true&&protectedSection.runnerExecuted===true&&protectedSection.sha===release.sha;
 if(computed&&record.status!=='PASS')errors.push('F15_STATUS_MUST_MATCH_EVIDENCE');if(computed&&record.launchGatePass!==true)errors.push('F15_LAUNCH_GATE_FLAG_MUST_MATCH_EVIDENCE');
 return Object.freeze({ok:errors.length===0,launchGatePass:computed&&record.status==='PASS'&&record.launchGatePass===true&&errors.length===0,blockingSections:Object.freeze([...new Set(blockingSections)]),errors:Object.freeze(errors)});
}
module.exports=Object.freeze({REQUIRED_SECTIONS,verifyF15LaunchEvidence});
