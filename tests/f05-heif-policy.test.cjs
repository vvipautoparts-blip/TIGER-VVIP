"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(__dirname, "../scripts/media/f05-heif-policy.js");
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadPolicy() {
  return import(`${moduleUrl}?f05-policy=${Date.now()}-${Math.random()}`);
}

const MiB = 1024 * 1024;

test("F05 admission publishes the exact resource ceilings", async () => {
  const { F05_LIMITS } = await loadPolicy();
  assert.deepEqual(F05_LIMITS, {
    maxDecodedPixels: 40_000_000,
    maxWasmMemoryBytes: 384 * MiB,
    maxHeifConcurrency: 1,
    minWidth: 320,
    minHeight: 240,
    workingBytesPerPixel: 12,
    workingOverheadBytes: 32 * MiB
  });
  assert.equal(Object.isFrozen(F05_LIMITS), true);
});

test("F05 admits an HEVC still only when its conservative working set fits", async () => {
  const { admitHeifDecode } = await loadPolicy();
  const result = admitHeifDecode(
    { codec:"hevc", width:4000, height:3000, isStill:true },
    { activeHeifWorkers:0 }
  );
  assert.equal(result.ok, true);
  assert.equal(result.estimatedWorkingSetBytes, 177_554_432);
  assert.equal(Object.isFrozen(result), true);
});

test("F05 treats 40MP as a content ceiling not a memory-fit promise", async () => {
  const { admitHeifDecode } = await loadPolicy();
  const exactly40Mp = admitHeifDecode(
    { codec:"hevc", width:8000, height:5000, isStill:true },
    { activeHeifWorkers:0 }
  );
  assert.deepEqual(exactly40Mp, { ok:false, code:"heif_memory_limit" });

  const over40Mp = admitHeifDecode(
    { codec:"hevc", width:8001, height:5000, isStill:true },
    { activeHeifWorkers:0 }
  );
  assert.deepEqual(over40Mp, { ok:false, code:"heif_dimensions_invalid" });
});

test("F05 denies non-HEVC, sequence, undersized and concurrent HEIF work", async () => {
  const { admitHeifDecode } = await loadPolicy();
  assert.deepEqual(admitHeifDecode({codec:"av1",width:1600,height:1200,isStill:true},{activeHeifWorkers:0}), {ok:false,code:"heif_codec_unsupported"});
  assert.deepEqual(admitHeifDecode({codec:"hevc",width:1600,height:1200,isStill:false},{activeHeifWorkers:0}), {ok:false,code:"heif_sequence_denied"});
  assert.deepEqual(admitHeifDecode({codec:"hevc",width:319,height:240,isStill:true},{activeHeifWorkers:0}), {ok:false,code:"heif_dimensions_invalid"});
  assert.deepEqual(admitHeifDecode({codec:"hevc",width:1600,height:1200,isStill:true},{activeHeifWorkers:1}), {ok:false,code:"heif_memory_limit"});
});

test("F05 fails closed on unsafe arithmetic or a tighter runtime memory budget", async () => {
  const { admitHeifDecode } = await loadPolicy();
  assert.deepEqual(admitHeifDecode({codec:"hevc",width:Number.MAX_SAFE_INTEGER,height:2,isStill:true},{activeHeifWorkers:0}), {ok:false,code:"heif_dimensions_invalid"});
  assert.deepEqual(
    admitHeifDecode({codec:"hevc",width:4000,height:3000,isStill:true},{activeHeifWorkers:0,memoryBudgetBytes:160*MiB}),
    {ok:false,code:"heif_memory_limit"}
  );
});
