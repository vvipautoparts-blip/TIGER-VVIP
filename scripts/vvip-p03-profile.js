(function () {
  "use strict";

  const authGate = document.querySelector("[data-auth-gate]");
  const protectedApp = document.querySelector("[data-auth-protected]");
  const toast = document.querySelector("[data-toast]");
  const sheet = document.querySelector("[data-account-sheet]");
  const sheetPanel = sheet && sheet.querySelector(".account-sheet");
  const sheetContent = document.querySelector("[data-account-sheet-content]");

  const previews = {
    "account-auto": {
      sector: "قطع وخدمات السيارات",
      title: "طقم فرامل أصلي",
      price: "1,240 ر.س",
      location: "جدة",
      summary: "إعلان إداري محفوظ ضمن حسابك.",
      visualClass: "managed-visual--auto",
      specs: ["نشط", "أصلي", "تركيب متاح"]
    },
    "account-office": {
      sector: "عقارات",
      title: "مكتب جاهز للأعمال",
      price: "145,000 ر.س / سنة",
      location: "جدة — الروضة",
      summary: "مسودة إعلان محفوظة ويمكن استكمالها لاحقًا.",
      visualClass: "managed-visual--estate",
      specs: ["مسودة", "180 م²", "مؤثث"]
    }
  };

  const comingSoonMessages = {
    edit: "تعديل الإعلان قيد التجهيز.",
    pause: "إيقاف الإعلان قيد التجهيز.",
    notifications: "الإشعارات قيد التجهيز ضمن VVIP TIGER."
  };

  let toastTimer;
  let lastFocusedElement = null;

  function previewAllowed() {
    const preview = new URLSearchParams(location.search).get("preview");
    const isLocalHost = location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "::1" ||
      location.hostname === "[::1]" ||
      location.hostname === "0.0.0.0";
    return isLocalHost && preview === "account";
  }

  function applyLocalPreviewRoutes() {
    if (!previewAllowed()) return;
    document.querySelectorAll("[data-account-home]").forEach(function (link) {
      const suffix = link.dataset.accountHome === "marketplace"
        ? "#marketplace"
        : "";
      link.href = "index.html?preview=home" + suffix;
    });
  }

  function showToast(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, 3200);
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    return parts.length
      ? parts.slice(0, 2).map(function (part) { return part.charAt(0); }).join("")
      : "م";
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(function (node) {
      node.textContent = value;
    });
  }

  function renderAccount(user) {
    const email = user && user.primaryEmailAddress &&
      user.primaryEmailAddress.emailAddress || "غير مضاف";
    const phone = user && user.primaryPhoneNumber &&
      user.primaryPhoneNumber.phoneNumber || "غير مضاف";
    const suppliedName = user &&
      (user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" "));
    const name = suppliedName || email.split("@")[0] || "مستخدم";

    setText("[data-profile-name]", name);
    setText("[data-profile-initials]", initials(name));
    setText("[data-account-email]", email);
    setText("[data-account-phone]", phone);
  }

  function reveal() {
    if (authGate) authGate.hidden = true;
    if (protectedApp) protectedApp.hidden = false;
  }

  function redirect() {
    location.replace("index.html?return_to=private-profile-p03.html");
  }

  async function guard() {
    if (previewAllowed()) {
      renderAccount({
        fullName: "مستخدم VVIP",
        primaryEmailAddress: { emailAddress: "member@example.com" },
        primaryPhoneNumber: null
      });
      reveal();
      return;
    }

    try {
      if (!window.Clerk) throw new Error("CLERK_MISSING");
      await window.Clerk.load();
      if (!window.Clerk.user || !window.Clerk.session) {
        redirect();
        return;
      }
      renderAccount(window.Clerk.user);
      reveal();
    } catch (error) {
      console.warn("VVIP_ACCOUNT_AUTH_RECOVERY");
      if (authGate) {
        authGate.textContent = "تعذر التحقق من الجلسة. سيتم تحويلك لبوابة الدخول.";
      }
      setTimeout(redirect, 500);
    }
  }

  function focusSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("is-highlighted");
    target.focus({ preventScroll: true });
    setTimeout(function () {
      target.classList.remove("is-highlighted");
    }, 1600);
  }

  function setSheetVisibility(visible) {
    if (!sheet) return;
    sheet.hidden = !visible;
    sheet.setAttribute("aria-hidden", visible ? "false" : "true");
    document.body.classList.toggle("account-sheet-open", visible);
  }

  function openPreview(id) {
    const item = previews[id];
    if (!item || !sheetContent || !sheetPanel) return;
    const chips = item.specs.map(function (spec) {
      return `<span>${spec}</span>`;
    }).join("");

    lastFocusedElement = document.activeElement;
    sheetContent.innerHTML = `<div class="account-preview-visual ${item.visualClass}" aria-hidden="true"><span>${item.sector}</span></div>
      <span class="account-kicker">${item.sector}</span>
      <h2 id="account-sheet-title">${item.title}</h2>
      <strong class="sheet-price">${item.price}</strong>
      <p>${item.location}</p>
      <p>${item.summary}</p>
      <div class="account-preview-specs">${chips}</div>
      <button class="account-button account-button--quiet" type="button" data-close-sheet>إغلاق</button>`;
    setSheetVisibility(true);
    sheetPanel.focus();
  }

  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    setSheetVisibility(false);
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  document.addEventListener("click", function (event) {
    const scroll = event.target.closest("[data-scroll-target]");
    if (scroll) {
      focusSection(scroll.dataset.scrollTarget);
      return;
    }

    const preview = event.target.closest("[data-preview-listing]");
    if (preview) {
      openPreview(preview.dataset.previewListing);
      return;
    }

    if (event.target.closest("[data-close-sheet]")) {
      closeSheet();
      return;
    }

    const action = event.target.closest("[data-account-action]");
    if (action && action.dataset.accountAction === "care") {
      showToast("Tiger Care قيد التجهيز.");
      return;
    }

    const coming = event.target.closest("[data-coming-soon]");
    if (coming) {
      const key = coming.dataset.comingSoon || coming.dataset.accountAction;
      showToast(comingSoonMessages[key] || "هذه الميزة قيد التجهيز ضمن VVIP TIGER.");
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeSheet();
  });

  applyLocalPreviewRoutes();
  guard();
})();
