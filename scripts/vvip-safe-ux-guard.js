/*
  VVIP TIGER — Safe UX Guard
  Purpose:
  - Prevent raw technical error text from appearing in visible user-facing error areas.
  - Keep internal console/debug behavior untouched for developers.
  - Do not connect to Supabase, RPC, RLS, Clerk, or any backend.
*/

(function () {
  "use strict";

  var SAFE_AR = "نجهّز صفحتك الآن. حسابك آمن، ويمكنك المحاولة بعد قليل.";
  var SAFE_EN = "We are preparing your page. Your account is safe, please try again shortly.";

  var RAW_TECH_PATTERN = /\b(Supabase|PostgREST|RPC|RLS|JWT|token|service_role|apikey|TypeError|ReferenceError|SyntaxError|stack trace|failed to fetch|NetworkError|AuthApiError|ClerkAPIResponseError)\b/i;

  var ERROR_SELECTOR = [
    "[role='alert']",
    "[data-error]",
    ".error",
    ".error-message",
    ".alert-error",
    ".status-error",
    ".vvip-error",
    "#error",
    "#error-message"
  ].join(",");

  function isArabicPage() {
    var lang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    var dir = (document.documentElement.getAttribute("dir") || "").toLowerCase();
    return lang.indexOf("ar") === 0 || dir === "rtl";
  }

  function safeText() {
    return isArabicPage() ? SAFE_AR : SAFE_EN;
  }

  function shouldSkip(node) {
    if (!node || !node.closest) return true;
    return Boolean(node.closest("script, style, template, code, pre, textarea"));
  }

  function sanitizeElement(el) {
    if (!el || shouldSkip(el)) return;

    var text = (el.innerText || el.textContent || "").trim();
    if (!text || !RAW_TECH_PATTERN.test(text)) return;

    el.classList.add("vvip-safe-message");
    el.setAttribute("data-vvip-sanitized-error", "true");
    el.textContent = safeText();
  }

  function sanitizeVisibleErrorAreas(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll(ERROR_SELECTOR);
    nodes.forEach(sanitizeElement);
  }

  function installErrorListeners() {
    window.addEventListener("error", function () {
      setTimeout(function () {
        sanitizeVisibleErrorAreas(document);
      }, 0);
    });

    window.addEventListener("unhandledrejection", function () {
      setTimeout(function () {
        sanitizeVisibleErrorAreas(document);
      }, 0);
    });
  }

  function installObserver() {
    if (!("MutationObserver" in window)) return;

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;

            if (node.matches && node.matches(ERROR_SELECTOR)) {
              sanitizeElement(node);
            }

            sanitizeVisibleErrorAreas(node);
          });
        }

        if (mutation.type === "characterData" && mutation.target && mutation.target.parentElement) {
          var parent = mutation.target.parentElement;
          if (parent.matches && parent.matches(ERROR_SELECTOR)) {
            sanitizeElement(parent);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function boot() {
    document.documentElement.classList.add("vvip-visual-trust-ready");
    sanitizeVisibleErrorAreas(document);
    installErrorListeners();
    installObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
