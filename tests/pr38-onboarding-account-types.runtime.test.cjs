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
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    key(index) {
      return Array.from(store.keys())[index] || null;
    },
    _dump() {
      return Array.from(store.entries());
    }
  };
}

function createElement(tagName = "div") {
  return {
    tagName,
    hidden: false,
    disabled: false,
    checked: false,
    value: "",
    textContent: "",
    dataset: {},
    attributes: {},
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    focus() {},
    closest() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function createDocumentMock() {
  return {
    body: createElement("body"),
    addEventListener() {},
    removeEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
    createElement
  };
}

function runInBrowserLikeContext(relativePath, context) {
  const code = read(relativePath);
  vm.runInContext(code, context, { filename: relativePath });
}

const storage = createStorage();
const locationState = {
  href: "http://localhost:8000/onboarding-p04.html?preview=onboarding",
  search: "?preview=onboarding",
  hostname: "localhost",
  replacedTo: null,
  replace(target) {
    this.replacedTo = target;
  }
};

const contextObject = {
  window: {},
  document: createDocumentMock(),
  localStorage: storage,
  location: locationState,
  URL,
  URLSearchParams,
  console,
  setTimeout,
  clearTimeout
};

contextObject.window = contextObject;
const context = vm.createContext(contextObject);

runInBrowserLikeContext("scripts/onboarding/pr38-account-types.js", context);
runInBrowserLikeContext("scripts/onboarding/pr38-account-summary.js", context);
runInBrowserLikeContext("scripts/onboarding/pr38-onboarding.js", context);

const typesApi = context.window.VVIP_PR38_ACCOUNT_TYPES;
const summaryApi = context.window.VVIP_PR38_ACCOUNT_SUMMARY;
const onboardingApi = context.window.VVIP_PR38_ONBOARDING;

assert(typesApi && typeof typesApi.getAll === "function", "types API missing");
assert(summaryApi && typeof summaryApi.buildDraftSummary === "function", "summary API missing");
assert(onboardingApi && onboardingApi.testHooks, "onboarding test hooks missing");

const allTypes = typesApi.getAll();
assert(Array.isArray(allTypes), "types list must be an array");
assert(allTypes.length === 17, "must include exactly 17 account types");

const ids = allTypes.map((item) => item.id);
const unique = new Set(ids);
assert(unique.size === ids.length, "duplicate account type IDs are not allowed");

const expected = [
  "buyer-viewer",
  "buyer-standard",
  "individual-seller",
  "parts-shop",
  "maintenance-center",
  "electrical-hybrid-center",
  "general-service-center",
  "distributor",
  "importer",
  "wholesaler",
  "supplier",
  "retailer",
  "company-institution",
  "office",
  "broker",
  "service-provider",
  "personal-vip"
];
for (const id of expected) {
  assert(typesApi.isValidId(id), `missing approved account type: ${id}`);
}

const summary = summaryApi.buildDraftSummary("office", "ar");
assert(summary.accountTypeId === "office", "summary accountTypeId mismatch");
assert(summary.publishingPermission === "none", "publishingPermission must stay none");
assert(summary.official === false, "official must remain false");

const hooks = onboardingApi.testHooks;
assert(typeof hooks.readDraft === "function", "readDraft hook missing");
assert(typeof hooks.saveDraft === "function", "saveDraft hook missing");
assert(typeof hooks.clearDraft === "function", "clearDraft hook missing");
assert(typeof hooks.sanitizeDraft === "function", "sanitizeDraft hook missing");

assert(hooks.readDraft() === null, "draft should be empty at start");

const saved = hooks.saveDraft("buyer-standard");
assert(saved.accountTypeId === "buyer-standard", "saved draft id mismatch");
assert(saved.publishingPermission === "none", "saved publishingPermission mismatch");
assert(saved.official === false, "saved official mismatch");

const loaded = hooks.readDraft();
assert(loaded && loaded.accountTypeId === "buyer-standard", "reading draft failed");
assert(loaded.publishingPermission === "none", "loaded publishingPermission mismatch");
assert(loaded.official === false, "loaded official mismatch");

const parsedBadExtraField = hooks.sanitizeDraft({
  version: "1",
  accountTypeId: "office",
  publishingPermission: "none",
  official: false,
  updatedAt: "2026-01-01T00:00:00.000Z",
  email: "secret@example.com"
});
assert(parsedBadExtraField === null, "payload with extra fields must be rejected");

storage.setItem(
  hooks.storageKey,
  JSON.stringify({
    version: "1",
    accountTypeId: "office",
    publishingPermission: "approved",
    official: true,
    updatedAt: "2026-01-01T00:00:00.000Z"
  })
);
assert(hooks.readDraft() === null, "invalid draft values must be rejected and removed");
assert(storage.getItem(hooks.storageKey) === null, "invalid draft must be deleted");

hooks.saveDraft("office");
hooks.cancelOnboarding();
const afterCancel = hooks.readDraft();
assert(afterCancel && afterCancel.accountTypeId === "office", "cancel must not save new data");

hooks.completeToHome();
assert(locationState.replacedTo === "index.html", "completion must redirect to unified Home");

const onboardingHtml = read("onboarding-p04.html");
assert(/<html[^>]+lang=["']ar["'][^>]+dir=["']rtl["']/i.test(onboardingHtml), "RTL contract missing");
assert(/<meta[^>]+name=["']viewport["']/i.test(onboardingHtml), "viewport missing");
assert(/<fieldset[\s\S]*?<legend/i.test(onboardingHtml), "fieldset and legend are required");
assert(!/(name|id|data-[\w-]*)=["'][^"']*sector/i.test(onboardingHtml), "sector field must not exist");

const mergedSources = [
  read("scripts/onboarding/pr38-account-types.js"),
  read("scripts/onboarding/pr38-account-summary.js"),
  read("scripts/onboarding/pr38-onboarding.js"),
  onboardingHtml
].join("\n");

for (const forbidden of ["service_role", "sb_secret_", ".from(", ".rpc(", "getToken(", "accessToken", "eyJ"]) {
  assert(!mergedSources.includes(forbidden), `forbidden content found: ${forbidden}`);
}

assert(!/innerHTML\s*=/.test(mergedSources), "innerHTML assignment is forbidden");

const scopeStatus = require("child_process")
  .execSync("git diff --name-only", { cwd: root, encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const allowedScope = new Set([
  "private-profile-p03.html",
  "onboarding-p04.html",
  "styles/vvip-pr38-onboarding.css",
  "scripts/onboarding/pr38-account-types.js",
  "scripts/onboarding/pr38-account-summary.js",
  "scripts/onboarding/pr38-onboarding.js",
  "tests/pr38-onboarding-account-types.test.py",
  "tests/pr38-onboarding-account-types.runtime.test.cjs",
  "docs/change-control/20260715-pr38-onboarding-account-types.json"
]);

for (const changed of scopeStatus) {
  assert(allowedScope.has(changed), `out-of-scope changed file detected: ${changed}`);
}

console.log("PR38 RUNTIME CONTRACT TEST PASS");
