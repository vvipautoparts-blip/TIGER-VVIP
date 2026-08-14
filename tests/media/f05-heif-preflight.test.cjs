"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(__dirname, "../../scripts/media/f05-heif-preflight.js");
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadModule() {
  return import(`${moduleUrl}?f05-preflight=${Date.now()}-${Math.random()}`);
}

function ascii(value) {
  return [...Buffer.from(value, "ascii")];
}

function u32(value) {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
}

function ftyp(major, compatible = []) {
  const brands = [major, ...compatible];
  const size = 16 + compatible.length * 4;
  return Uint8Array.from([
    ...u32(size), ...ascii("ftyp"), ...ascii(major), 0, 0, 0, 0,
    ...compatible.flatMap(ascii)
  ]);
}

test("F05 preflight recognizes bounded HEIC/HEIF still-family ftyp brands", async () => {
  const { probeHeifHeader, MAX_HEIF_HEADER_BYTES } = await loadModule();
  assert.equal(MAX_HEIF_HEADER_BYTES, 262144);

  const heic = probeHeifHeader(ftyp("heic", ["mif1"]));
  assert.equal(heic.ok, true);
  assert.equal(heic.family, "heic");
  assert.equal(heic.majorBrand, "heic");
  assert.deepEqual(heic.brands, ["heic", "mif1"]);

  const heif = probeHeifHeader(ftyp("mif1", ["heic"]));
  assert.equal(heif.ok, true);
  assert.equal(heif.family, "heif");
});

test("F05 preflight rejects AVIF-only unknown and generic non-HEIF containers", async () => {
  const { probeHeifHeader } = await loadModule();
  assert.deepEqual(probeHeifHeader(ftyp("avif", ["mif1"])), { ok:false, code:"heif_codec_unsupported" });
  assert.deepEqual(probeHeifHeader(ftyp("isom", ["iso2"])), { ok:false, code:"heif_container_invalid" });
  assert.deepEqual(probeHeifHeader(new Uint8Array()), { ok:false, code:"heif_container_invalid" });
});

test("F05 preflight fails closed on truncated impossible and overflowing box lengths", async () => {
  const { probeHeifHeader } = await loadModule();
  assert.equal(probeHeifHeader(Uint8Array.from([...u32(32), ...ascii("ftyp"), ...ascii("heic")])).ok, false);
  assert.equal(probeHeifHeader(Uint8Array.from([0,0,0,4, ...ascii("ftyp"), ...ascii("heic"),0,0,0,0])).ok, false);
  assert.equal(probeHeifHeader(Uint8Array.from([0,0,0,1, ...ascii("ftyp"), 0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff])).ok, false);
});

test("F05 preflight rejects sequence brands and contradictory AVIF authority", async () => {
  const { probeHeifHeader } = await loadModule();
  assert.deepEqual(probeHeifHeader(ftyp("hevc", ["heic"])), { ok:false, code:"heif_sequence_denied" });
  assert.deepEqual(probeHeifHeader(ftyp("avis", ["heic"])), { ok:false, code:"heif_sequence_denied" });
  assert.deepEqual(probeHeifHeader(ftyp("avif", ["heic"])), { ok:false, code:"heif_codec_unsupported" });
});

test("F05 preflight is filename/MIME independent and returns deeply frozen bounded facts", async () => {
  const { probeHeifHeader } = await loadModule();
  const result = probeHeifHeader(ftyp("heix", ["heic", "mif1"]));
  assert.equal(result.ok, true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.brands), true);
  assert.equal("filename" in result, false);
  assert.equal("mimeType" in result, false);
  assert.equal("bytes" in result, false);
});
