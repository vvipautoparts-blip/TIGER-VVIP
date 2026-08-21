"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(function main() {
  const contextObject = {
    window: {},
    URL,
    console
  };
  contextObject.window = contextObject;
  const context = vm.createContext(contextObject);
  vm.runInContext(read("scripts/profile/pr39-profile-contract.js"), context, {
    filename: "scripts/profile/pr39-profile-contract.js"
  });

  const contract = contextObject.window.VVIP_PR39_PROFILE_CONTRACT;
  assert(contract, "profile contract missing");

  assert(contract.AUTH_REQUIRED === "AUTH_REQUIRED", "AUTH_REQUIRED mode missing");
  assert(contract.AUTHORIZED_MEMBER_VIEW === "AUTHORIZED_MEMBER_VIEW", "AUTHORIZED_MEMBER_VIEW mode missing");
  assert(contract.OWNER_VIEW === "OWNER_VIEW", "OWNER_VIEW mode missing");
  assert(!Object.prototype.hasOwnProperty.call(contract, "VISITOR_MODE"), "VISITOR_MODE must not be exported");

  const owner = contract.createProfileSubject({
    sessionUser: { id: "u1" },
    subjectUserId: "u1",
    profileSource: { displayName: "Owner", accountType: "personal-vip", accountStatus: "active" }
  });
  assert(owner.mode === "OWNER_VIEW", "matching authenticated identity must use OWNER_VIEW");
  assert(owner.isOwner === true, "owner identity must remain proven");

  const member = contract.createProfileSubject({
    sessionUser: { id: "u1" },
    subjectUserId: "u2",
    profileSource: { displayName: "Member", accountType: "buyer-standard", accountStatus: "active" }
  });
  assert(member.mode === "AUTHORIZED_MEMBER_VIEW", "signed-in non-owner must use AUTHORIZED_MEMBER_VIEW");
  assert(member.isOwner === false, "member view must not receive owner privileges");

  const unauthenticated = contract.createProfileSubject({
    sessionUser: null,
    subjectUserId: "u2",
    profileSource: { displayName: "Hidden", accountType: "buyer-standard", accountStatus: "active" }
  });
  assert(unauthenticated.mode === "AUTH_REQUIRED", "missing session must fail closed to AUTH_REQUIRED");
  assert(unauthenticated.canMessage === false, "unauthenticated actor must not receive messaging capability");

  console.log("NO VISITOR PROFILE RUNTIME CONTRACT PASS");
}());
