(function () {
  "use strict";

  /*
    ميثاق داخلي: الأمانة والعدل والستر والخصوصية توجه أقل قدر من
    البيانات وأوضح fallback، بينما تبقى الحماية التقنية قائمة على allowlists.
  */
  const ALLOWED_TARGETS = new Set([
    "index.html",
    "/index.html",
    "./index.html",
    "index.html#marketplace",
    "index.html#search",
    "private-profile-p03.html",
    "/private-profile-p03.html",
    "./private-profile-p03.html",
    "#marketplace",
    "#search"
  ]);
  const KNOWN_ACTIONS = [
    "[data-open-create-listing]",
    "[data-create-sector]",
    "[data-create-next]",
    "[data-create-back]",
    "[data-create-close]",
    "[data-save-local-draft]",
    "[data-preview-local-draft]",
    "[data-delete-local-draft]",
    "[data-create-confirm-cancel]",
    "[data-create-confirm-accept]",
    "[data-vvip-draft-resume-action]",
    "[data-vvip-draft-delete-action]",
    "[data-draft-preview-open]",
    "[data-draft-preview-close]",
    "[data-vvip-safe-publish-action]",
    "[data-vvip-readiness-open]",
    "[data-vvip-readiness-close]",
    "[data-coming-soon]",
    "[data-sector-filter]",
    "[data-listing-details]",
    "[data-listing-interest]",
    "[data-listing-contact]",
    "[data-listing-private-share]",
    "[data-sheet-close]",
    "[data-reset-listings]",
    "[data-account-action]",
    "[data-scroll-target]",
    "[data-preview-listing]",
    "[data-close-sheet]",
    "[data-open-signout]",
    "[data-confirm-signout]",
    "[data-cancel-signout]"
  ].join(",");
  const RECOVERY_MESSAGE =
    "حدث تعذر مؤقت. يمكنك المتابعة من السوق أو الرجوع للرئيسية.";
  const OFFLINE_MESSAGE =
    "الاتصال ضعيف أو غير متاح. يمكنك متابعة التصفح المحلي مؤقتًا.";

  let feedbackTimer = 0;

  function isLocalPreviewHost() {
    return location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "::1" ||
      location.hostname === "[::1]" ||
      location.hostname === "0.0.0.0";
  }

  function showFeedback(message) {
    const toast = document.querySelector("[data-app-toast], [data-toast]");
    if (!toast) return;
    window.clearTimeout(feedbackTimer);
    toast.textContent = message || RECOVERY_MESSAGE;
    toast.hidden = false;
    feedbackTimer = window.setTimeout(function () {
      toast.hidden = true;
    }, 3600);
  }

  function isSafeTarget(target) {
    if (typeof target !== "string") return false;
    const value = target.trim();
    if (!value || value.startsWith("//")) return false;
    if (/^[a-z][a-z\d+.-]*:/i.test(value)) return false;
    if (ALLOWED_TARGETS.has(value)) return true;
    if (!/^#[a-z][\w:-]*$/i.test(value)) return false;
    return Boolean(document.getElementById(value.slice(1)));
  }

  function localPreviewTarget(target) {
    if (!isLocalPreviewHost()) return target;
    const preview = new URLSearchParams(location.search).get("preview");
    const isIndex = target === "index.html" ||
      target === "/index.html" ||
      target === "./index.html";
    const isAccount = target === "private-profile-p03.html" ||
      target === "/private-profile-p03.html" ||
      target === "./private-profile-p03.html";

    if (preview === "home" && isIndex) {
      return "index.html?preview=home";
    }
    if (preview === "home" && isAccount) {
      return "private-profile-p03.html?preview=account";
    }
    if (preview === "account" && isIndex) {
      return "index.html?preview=home";
    }
    if (preview === "account" && target === "index.html#marketplace") {
      return "index.html?preview=home#marketplace";
    }
    return target;
  }

  function safeNavigate(target, fallback) {
    const safeFallback = isSafeTarget(fallback) ? fallback : "index.html";
    if (!isSafeTarget(target)) {
      showFeedback(RECOVERY_MESSAGE);
      window.setTimeout(function () {
        location.assign(localPreviewTarget(safeFallback));
      }, 180);
      return false;
    }
    location.assign(localPreviewTarget(target.trim()));
    return true;
  }

  function guardAction(event) {
    const safeLink = event.target.closest("[data-safe-nav]");
    if (safeLink) {
      event.preventDefault();
      safeNavigate(
        safeLink.dataset.navTarget || safeLink.getAttribute("href"),
        safeLink.dataset.navFallback || "index.html"
      );
      return;
    }

    const button = event.target.closest("button");
    if (!button || button.closest("#clerk-main-auth")) return;
    if (button.matches(KNOWN_ACTIONS)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    showFeedback(RECOVERY_MESSAGE);
  }

  function updateNetworkNotice() {
    const notice = document.querySelector("[data-network-notice]");
    if (!notice) return;
    notice.textContent = OFFLINE_MESSAGE;
    notice.hidden = navigator.onLine;
  }

  document.addEventListener("click", guardAction, true);
  window.addEventListener("offline", updateNetworkNotice);
  window.addEventListener("online", updateNetworkNotice);
  window.addEventListener("error", function () {
    console.warn("VVIP_RESILIENCE_RECOVERY");
    showFeedback(RECOVERY_MESSAGE);
  });
  window.addEventListener("unhandledrejection", function (event) {
    event.preventDefault();
    console.warn("VVIP_RESILIENCE_RECOVERY");
    showFeedback(RECOVERY_MESSAGE);
  });

  updateNetworkNotice();

  window.VVIP_PR30 = Object.freeze({
    isSafeTarget: isSafeTarget,
    safeNavigate: safeNavigate,
    showFeedback: showFeedback
  });
})();
