const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.join(__dirname, '..', 'scripts', 'media', 'f05a-hybrid-intake.js');
function loadIntake() { return require(modulePath); }
const M = 1024 * 1024;
function file(type, size = 1024, name = 'asset.bin') { return Object.freeze({ type, size, name }); }

test('F05A preserves the exact PR36 limits and local MIME contract', () => {
  const { PR36_LIMITS, LOCAL_PR36_MIMES } = loadIntake();
  assert.deepEqual(PR36_LIMITS, { maxPhotos: 7, maxFileBytes: 15 * M, maxTotalBytes: 60 * M });
  assert.deepEqual(LOCAL_PR36_MIMES, ['image/jpeg', 'image/png', 'image/webp']);
});

test('F05A routes local media to PR36 and HEIC family only to server quarantine', () => {
  const { routeMediaFile, HEIC_SERVER_MIMES } = loadIntake();
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.deepEqual(routeMediaFile(file(type)), { route:'PR36_LOCAL', requiresServerValidation:false, originalPublicUploadAllowed:false });
  assert.deepEqual(HEIC_SERVER_MIMES, ['image/heic','image/heif','image/heic-sequence','image/heif-sequence']);
  for (const type of HEIC_SERVER_MIMES) assert.deepEqual(routeMediaFile(file(type)), { route:'SERVER_QUARANTINE', requiresServerValidation:true, originalPublicUploadAllowed:false });
  assert.throws(() => routeMediaFile(file('image/gif')), /F05_MEDIA_TYPE_DENIED/);
});

test('F05A selection enforces 7 photos, 15MiB per file and 60MiB total across both routes', () => {
  const { validateHybridSelection } = loadIntake();
  assert.equal(validateHybridSelection(Array.from({length:7}, (_,i) => file(i%2?'image/heic':'image/jpeg', 8*M))).length, 7);
  assert.throws(() => validateHybridSelection(Array.from({length:8}, () => file('image/jpeg'))), /F05_TOO_MANY_PHOTOS/);
  assert.throws(() => validateHybridSelection([file('image/heic', 15*M+1)]), /F05_SOURCE_TOO_LARGE/);
  assert.throws(() => validateHybridSelection(Array.from({length:5}, () => file('image/jpeg', 13*M))), /F05_SELECTION_TOTAL_TOO_LARGE/);
});

test('F05A never trusts file extension or missing metadata', () => {
  const { validateHybridSelection } = loadIntake();
  assert.throws(() => validateHybridSelection([file('', 1000, 'photo.heic')]), /F05_MEDIA_TYPE_DENIED/);
  assert.throws(() => validateHybridSelection([{type:'image/heic',size:0,name:'x.heic'}]), /F05_FILE_METADATA_INVALID/);
});

test('F05A HEIC quarantine request is metadata-only and requires the full private processing pipeline', () => {
  const { buildQuarantineRequest } = loadIntake();
  const request = buildQuarantineRequest(file('image/heic', 2*M, 'IMG_0001.HEIC'));
  assert.equal(request.schemaVersion, 'F05_HEIC_QUARANTINE_V1');
  assert.equal(request.route, 'PRIVATE_QUARANTINE');
  assert.equal(request.publicVisibility, false);
  assert.equal(request.originalPublicUploadAllowed, false);
  assert.equal(request.requiresServerValidation, true);
  assert.equal(request.result, 'PENDING_SERVER_VALIDATION');
  assert.deepEqual(request.processingStages, ['DECODE','VALIDATE','MALWARE_POLYGLOT_CHECK','COLOR_MANAGEMENT','METADATA_SANITIZATION','CONTENT_ADAPTIVE_ENCODING','DERIVATIVES','STORAGE_COMMIT']);
  assert.throws(() => buildQuarantineRequest(file('image/jpeg')), /F05_QUARANTINE_ROUTE_REQUIRED/);
});