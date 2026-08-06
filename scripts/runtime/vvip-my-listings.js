(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else api.mount();
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const STATUS_LABELS = Object.freeze({
    DRAFT: "مسودة",
    PENDING_REVIEW: "قيد المراجعة",
    ACTIVE: "نشط",
    PAUSED: "متوقف مؤقتًا",
    EXPIRED: "منتهي",
    REJECTED: "مرفوض",
    BLOCKED: "محظور",
    ARCHIVED: "مؤرشف"
  });

  function statusLabel(value) {
    return STATUS_LABELS[String(value || "").toUpperCase()] || "غير معروف";
  }

  function safeText(value, maximum) {
    return String(value == null ? "" : value)
      .replace(/<[^>]*>/g, " ")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maximum || 160);
  }

  function mount() {
    if (!root.document) return;
    const doc = root.document;
    let modal = null;
    let repository = null;

    function close() {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }

    function ensureModal() {
      if (modal && doc.contains(modal)) return modal;
      modal = doc.createElement("div");
      modal.className = "vvip-production-modal";
      modal.dataset.myListingsModal = "true";
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML = '<button type="button" class="vvip-production-backdrop" data-my-listings-close aria-label="إغلاق"></button>' +
        '<section role="dialog" aria-modal="true" aria-labelledby="my-listings-title" class="vvip-production-dialog">' +
        '<button type="button" class="vvip-production-close" data-my-listings-close aria-label="إغلاق">×</button>' +
        '<h2 id="my-listings-title">إعلاناتي</h2><div class="vvip-my-listings" data-my-listings-content></div></section>';
      doc.body.appendChild(modal);
      return modal;
    }

    function renderRows(rows) {
      const node = ensureModal();
      const host = node.querySelector("[data-my-listings-content]");
      host.replaceChildren();
      if (!rows.length) {
        const empty = doc.createElement("p");
        empty.textContent = "لا توجد إعلانات محفوظة في حسابك.";
        host.appendChild(empty);
        return;
      }
      rows.forEach(function (item) {
        const card = doc.createElement("article");
        const title = doc.createElement("h3");
        title.textContent = safeText(item.title, 80) || "إعلان بدون عنوان";
        const state = doc.createElement("strong");
        state.textContent = statusLabel(item.status);
        state.dataset.listingState = String(item.status || "UNKNOWN");
        const location = doc.createElement("p");
        location.textContent = safeText(item.location_label, 120) || "—";
        card.append(title, state, location);
        if (item.rejection_reason) {
          const reason = doc.createElement("p");
          reason.textContent = "السبب: " + safeText(item.rejection_reason, 500);
          card.appendChild(reason);
        }
        host.appendChild(card);
      });
    }

    async function open() {
      const node = ensureModal();
      const host = node.querySelector("[data-my-listings-content]");
      host.textContent = "جاري تحميل إعلاناتك…";
      node.hidden = false;
      node.setAttribute("aria-hidden", "false");
      const runtime = await Promise.resolve(root.VVIPRuntimeReady);
      if (!runtime || !runtime.clerk || !runtime.clerk.isSignedIn) {
        host.textContent = "سجّل الدخول للوصول إلى إعلاناتك.";
        return;
      }
      if (!repository) {
        repository = root.VVIP_MARKETPLACE_REPOSITORY.createMarketplaceRepository({
          client: runtime.supabase,
          clerk: runtime.clerk,
          config: runtime.config
        });
      }
      try {
        renderRows(await repository.listMine());
      } catch (error) {
        console.warn("VVIP_MY_LISTINGS_RECOVERY", error && error.code);
        host.textContent = "تعذر تحميل إعلاناتك الآن. حاول مرة أخرى.";
      }
    }

    doc.addEventListener("click", function (event) {
      const account = event.target.closest('[data-account-route],a[href$="private-profile-p03.html"]');
      if (account && root.__VVIP_RUNTIME_CONFIG__) {
        event.preventDefault();
        event.stopImmediatePropagation();
        open();
        return;
      }
      if (event.target.closest("[data-my-listings-close]")) {
        event.preventDefault();
        close();
      }
    }, true);
  }

  return Object.freeze({ mount, statusLabel, safeText });
});
