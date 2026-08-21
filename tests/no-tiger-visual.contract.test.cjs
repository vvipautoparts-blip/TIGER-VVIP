"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(function main() {
  const retiredTigerVisual = path.join(root, "icons", "tiger-logo.png");
  const indexHtml = read("index.html");
  const manifest = read("manifest.webmanifest");
  const identityCss = read("vvip-identity.css");
  const socialCss = read("styles/tiger-social/core-shell.css");
  const enhancedCss = read("enhanced-components.css");
  const serviceWorker = read("sw-vvip-static.js");

  assert(!fs.existsSync(retiredTigerVisual), "tiger visual asset must not exist: icons/tiger-logo.png");

  const activeVisualRefs = [
    indexHtml,
    manifest,
    identityCss,
    socialCss,
    enhancedCss,
    serviceWorker
  ].join("\n");

  assert(!/icons\/tiger-logo\.png/i.test(activeVisualRefs), "active UI/runtime must not reference the retired tiger image");
  assert(/VVIP TIGER/.test(indexHtml), "textual VVIP TIGER brand is allowed and must not be confused with tiger imagery");

  console.log("NO TIGER VISUAL CONTRACT PASS");
}());
