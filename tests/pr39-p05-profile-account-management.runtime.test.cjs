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

function createStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(String(key)) ? data.get(String(key)) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(String(key));
    }
  };
}

function createContext() {
  const clipboard = { text: "", writeText(value) { this.text = String(value); return Promise.resolve(); } };
  const location = {
    href: "http://localhost:800/public-profile-p05.html",
    hostname: "localhost",
    search: "",
    replacedTo: "",
    replace(target) {
      this.replacedTo = String(target);
    }
  };
  const contextObject = {
    window: {},
    document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } },
    localStorage: createStorage(),
    location,
    navigator: { clipboard },
    URL,
    URLSearchParams,
    console,
    setTimeout,
    clearTimeout,
    Event,
    matchMedia() {
      return { matches: false, addEventListener() {}, removeEventListener() {} };
    }
  };
  contextObject.window = contextObject;
  return { context: vm.createContext(contextObject), ctx: contextObject };
}

function runScript(relativePath, context) {
  vm.runInContext(read(relativePath), context, { filename: relativePath });
}

(function main() {
  const pack = createContext();
  const context = pack.context;
  const ctx = pack.ctx;

  runScript("scripts/onboarding/pr38-account-types.js", context);
  runScript("scripts/onboarding/pr38-account-summary.js", context);
  runScript("scripts/profile/pr39-profile-contract.js", context);
  runScript("scripts/profile/pr39-profile-preview.js", context);
  runScript("scripts/profile/pr39-profile-editor.js", context);
  runScript("scripts/profile/pr39-account-management.js", context);
  runScript("scripts/profile/pr39-profile-controller.js", context);

  const contract = ctx.window.VVIP_PR39_PROFILE_CONTRACT;
  const preview = ctx.window.VVIP_PR39_PROFILE_PREVIEW;
  const editor = ctx.window.VVIP_PR39_PROFILE_EDITOR;
  const management = ctx.window.VVIP_PR39_ACCOUNT_MANAGEMENT;
  const controller = ctx.window.VVIP_PR39_PROFILE_CONTROLLER;

  assert(contract, "contract API missing");
  assert(preview, "preview API missing");
  assert(editor, "editor API missing");
  assert(management, "management API missing");
  assert(controller, "controller API missing");

  const ownerSubject = contract.createProfileSubject({
    sessionUser: { id: "u1" },
    subjectUserId: "u1",
    profileSource: { displayName: "Owner", publicUsername: "owner_user", accountType: "personal-vip" }
  });
  assert(ownerSubject.isOwner === true, "owner mode must be true when identities match");
  assert(ownerSubject.mode === "OWNER_VIEW", "owner must use OWNER_VIEW");
  assert(ownerSubject.canEdit === true, "owner should be able to edit");

  const memberSubject = contract.createProfileSubject({
    sessionUser: { id: "u1" },
    subjectUserId: "u2",
    profileSource: { displayName: "Member", accountType: "buyer-standard" }
  });
  assert(memberSubject.isOwner === false, "member view must not receive owner privileges");
  assert(memberSubject.mode === "AUTHORIZED_MEMBER_VIEW", "signed-in non-owner must use authorized member view");
  assert(memberSubject.canManageAccount === false, "member must not manage another account");

  const authRequired = contract.createProfileSubject({
    sessionUser: null,
    subjectUserId: "u2",
    profileSource: { displayName: "Hidden", accountType: "buyer-standard" }
  });
  assert(authRequired.mode === "AUTH_REQUIRED", "missing session must fail closed to AUTH_REQUIRED");
  assert(authRequired.canMessage === false, "unauthenticated actor must not get messaging capability");

  const buyerViewer = contract.createProfileSubject({
    sessionUser: { id: "u1" },
    subjectUserId: "u2",
    profileSource: { accountType: "buyer-viewer", accountStatus: "active" }
  });
  assert(buyerViewer.canMessage === false, "buyer-viewer must not get chat button");

  const withDraft = contract.createProfileSubject({
    sessionUser: { id: "u1" },
    subjectUserId: "u1",
    profileSource: { displayName: "X" },
    accountTypeDraft: { accountTypeId: "personal-vip", publishingPermission: "none", official: false }
  });
  assert(withDraft.accountType === "personal-vip", "draft account type should be used when profile type missing");
  assert(withDraft.publishingPermission === "none", "publishingPermission must remain none");

  const stored = preview.writeSafeDraft({
    displayName: "Ali",
    publicUsername: "ali_1",
    publicBio: "bio",
    publicLocation: "Amman"
  }, { hostname: "localhost", preview: "profile" }, ctx.localStorage);
  assert(stored.ok === true, "safe preview draft should save on local preview");
  const rawDraft = ctx.localStorage.getItem(preview.storageKey);
  assert(rawDraft && rawDraft.includes("displayName"), "draft should be saved");
  assert(!rawDraft.includes("email"), "PII fields must not be stored");

  const rejectedDraft = preview.writeSafeDraft({ displayName: "Ali" }, { hostname: "vvipautoparts.com", preview: "profile" }, ctx.localStorage);
  assert(rejectedDraft.ok === false, "preview draft must be blocked on production host");

  const blockedUrl = contract.sanitizePublicUrl("javascript:alert(1)");
  assert(blockedUrl === "", "javascript URLs must be blocked");

  const safeReturn = contract.safeReturnPath("public-profile-p05.html");
  assert(safeReturn === "public-profile-p05.html", "safe return path expected");
  const blockedReturn = contract.safeReturnPath("https://evil.example");
  assert(blockedReturn === "index.html", "open redirect should be blocked");

  const ownerMenu = controller.createMenuModel(withDraft);
  assert(ownerMenu.items.includes("copy"), "menu should include copy");
  assert(ownerMenu.items.includes("settings"), "owner menu should include settings");
  assert(ownerMenu.items.includes("viewAsVisitor") === false, "owner menu must not expose visitor preview");

  const memberMenu = controller.createMenuModel(memberSubject);
  assert(memberMenu.items.includes("report"), "member menu should include report");
  assert(memberMenu.items.includes("settings") === false, "member menu must not include settings");

  const viewState = controller.createViewState(withDraft);
  assert(viewState.activeMode === "OWNER_VIEW", "owner view state must stay OWNER_VIEW");
  assert(typeof controller.setVisitorPreview === "undefined", "visitor preview API must be removed");

  let signOutCalls = 0;
  const logoutResult = controller.logoutSessionOnly({
    signOut() {
      signOutCalls += 1;
      return Promise.resolve();
    }
  }, ctx.location);

  Promise.resolve(logoutResult).then(() => {
    assert(signOutCalls === 1, "logout must call signOut once");
    assert(ctx.location.replacedTo === "index.html", "logout must return to index.html");

    const failedLogout = controller.logoutSessionOnly({
      signOut() {
        return Promise.reject(new Error("failed"));
      }
    }, ctx.location);

    return Promise.resolve(failedLogout).then((result) => {
      assert(result.ok === false, "logout failure should return safe failure");
      assert(/تعذر/.test(result.message), "logout failure should return Arabic safe message");

      const editState = editor.createEditorState(withDraft);
      const canceled = editor.cancelEdit(editState, withDraft);
      assert(canceled.publicBio === withDraft.publicBio, "cancel should rollback edits");

      const saveNoBackend = editor.saveEdits(editState, { backendAvailable: false, hostname: "localhost" }, ctx.localStorage);
      assert(saveNoBackend.ok === false, "save should not fake success without backend");
      assert(/غير متاح/.test(saveNoBackend.message), "save message must be truthful");

      const deactivation = management.requestTemporaryDeactivation({ backendAvailable: false });
      assert(deactivation.ok === false, "deactivation should stay non-destructive without backend");

      const deletion = management.requestAccountDeletion({ backendAvailable: false });
      assert(deletion.ok === false, "deletion should stay non-destructive without backend");
      assert(/الحذف الرسمي|الرسمية|المعتمدة/.test(deletion.message), "deletion message should stay truthful");

      assert(read("scripts/profile/pr39-profile-controller.js").indexOf("user.delete(") < 0, "must not call user.delete");
      assert(read("scripts/profile/pr39-account-management.js").indexOf("user.delete(") < 0, "must not call user.delete in management");

      console.log("PR39 RUNTIME CONTRACT TEST PASS");
    });
  }).catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
}());
