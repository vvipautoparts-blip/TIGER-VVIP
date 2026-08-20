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
  const profileHtml = read("public-profile-p05.html");
  const controller = read("scripts/profile/pr39-profile-controller.js");
  const contract = read("scripts/profile/pr39-profile-contract.js");

  const executable = [profileHtml, controller, contract].join("\n");

  assert(!/\bVISITOR_MODE\b/.test(executable), "VISITOR_MODE must not remain in executable profile code");
  assert(!/\bforcedVisitor\b/.test(executable), "forcedVisitor must not remain in executable profile code");
  assert(!/\bsetVisitorPreview\b/.test(executable), "setVisitorPreview must be removed");
  assert(!/\bviewAsVisitor\b/.test(executable), "viewAsVisitor must be removed");
  assert(!/visitor-subject/.test(executable), "visitor-subject fallback must be removed");
  assert(!/data-pr39-view-as-visitor/.test(profileHtml), "View-as-visitor control must be removed from profile HTML");
  assert(!/data-pr39-visitor-tools/.test(profileHtml), "Visitor tools container must be removed from profile HTML");
  assert(!/عرض كزائر/.test(profileHtml), "Arabic View as Visitor UI must be removed");

  assert(/AUTHORIZED_MEMBER_VIEW/.test(contract), "profile contract must expose AUTHORIZED_MEMBER_VIEW");
  assert(/AUTH_REQUIRED/.test(contract), "profile contract must expose AUTH_REQUIRED");
  assert(/OWNER_VIEW/.test(contract), "profile contract must expose OWNER_VIEW");

  console.log("NO VISITOR MODE CONTRACT PASS");
}());
