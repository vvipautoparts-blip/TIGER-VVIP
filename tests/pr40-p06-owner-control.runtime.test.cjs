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

function contextPack() {
  const nodes = new Map();

  function makeNode(selector) {
    return {
      selector,
      textContent: "",
      hidden: false,
      dataset: {},
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
  }

  const documentMock = {
    addEventListener() {},
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, makeNode(selector));
      return nodes.get(selector);
    },
    querySelectorAll() {
      return [];
    }
  };

  const ctxObj = {
    window: {},
    document: documentMock,
    console,
    setTimeout,
    clearTimeout,
    fetch: async () => ({ ok: true, json: async () => ({ phases: [] }) })
  };
  ctxObj.window = ctxObj;
  return { context: vm.createContext(ctxObj), ctxObj };
}

(function main() {
  const { context, ctxObj } = contextPack();

  vm.runInContext(read("scripts/p06/p06-owner-control-readonly.js"), context, {
    filename: "scripts/p06/p06-owner-control-readonly.js"
  });

  const api = ctxObj.window.VVIP_P06_OWNER_CONTROL;
  assert(api, "missing owner control API");
  assert(typeof api.renderPhaseSummary === "function", "missing renderPhaseSummary");
  assert(typeof api.buildStatusBadge === "function", "missing buildStatusBadge");
  assert(typeof api.safeReadOnlyFallback === "function", "missing safe fallback");

  const badge = api.buildStatusBadge("blocked");
  assert(/blocked/i.test(badge.key), "blocked badge key expected");

  const summary = api.renderPhaseSummary({
    current_phase: "P06",
    next_authorized_phase: "P06",
    phases: [
      { id: "P05", status: "completed" },
      { id: "P06", status: "planning" }
    ]
  });
  assert(summary.current === "P06", "current phase mismatch");

  const fallback = api.safeReadOnlyFallback();
  assert(fallback.mode === "read_only", "must remain read-only");

  console.log("PR40 P06 RUNTIME TEST PASS");
}());
