'use strict';

const policy = require('./policy.js');

function sharpApi() {
  return require('sharp');
}

async function canonicalize(source, mime, timeoutSeconds) {
  policy.assertStrictContainer(source, mime);
  const sharp = sharpApi();
  const metadata = await sharp(source, {
    limitInputPixels: policy.MAX_PIXELS,
    animated: false
  }).metadata();
  policy.assertDecodedMetadata(metadata, mime);

  let pipeline = sharp(source, {
    limitInputPixels: policy.MAX_PIXELS,
    animated: false
  })
    .rotate()
    .toColourspace('srgb');

  if (mime === 'image/jpeg') {
    pipeline = pipeline.jpeg({
      quality: 86,
      chromaSubsampling: '4:4:4',
      progressive: true
    });
  } else {
    pipeline = pipeline.webp({
      quality: 84,
      effort: 4,
      smartSubsample: true
    });
  }

  const seconds = Math.max(1, Math.min(20, Number(timeoutSeconds) || 8));
  const output = await pipeline
    .timeout({ seconds })
    .toBuffer({ resolveWithObject: true });

  policy.assertStrictContainer(output.data, mime);
  policy.assertDecodedMetadata({
    format: output.info.format,
    width: output.info.width,
    height: output.info.height,
    pages: 1
  }, mime);

  return Object.freeze({
    data: output.data,
    info: Object.freeze({
      format: output.info.format,
      width: output.info.width,
      height: output.info.height
    })
  });
}

module.exports = Object.freeze({ canonicalize });
