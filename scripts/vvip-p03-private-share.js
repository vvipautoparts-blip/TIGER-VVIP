(function () {
  "use strict";

  const page =
    window.location.pathname.split("/").pop() || "home.html";

  let activePayload = null;
  let toastTimer = null;

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function firstText(root, selectors, fallback = "") {
    for (const selector of selectors) {
      const element = root.querySelector(selector);

      if (!element) continue;

      const value = normalizeText(element.textContent);

      if (value) return value;
    }

    return fallback;
  }

  function firstAttribute(root, selectors, attribute) {
    for (const selector of selectors) {
      const element = root.querySelector(selector);

      if (!element) continue;

      const value = element.getAttribute(attribute);

      if (value) return value;
    }

    return "";
  }

  function extractPhone(root) {
    const configured =
      root.dataset.ownerPhone ||
      root.dataset.phone ||
      "";

    if (configured) return configured;

    const text = normalizeText(root.textContent);
    const match = text.match(/(?:\+962|00962|07)\d{8,9}/);

    return match ? match[0] : "";
  }

  function unwrapBrokenHeader() {
    document
      .querySelectorAll(".vvip-home-search-avatar-row")
      .forEach((wrapper) => {
        const parent = wrapper.parentNode;

        if (!parent) return;

        while (wrapper.firstChild) {
          parent.insertBefore(wrapper.firstChild, wrapper);
        }

        wrapper.remove();
      });

    document
      .querySelectorAll(".vvip-home-avatar-trigger")
      .forEach((element) => element.remove());
  }

  async function ensureHomeAvatar() {
    if (page !== "home.html") return;

    unwrapBrokenHeader();

    const topbar = document.querySelector(".vvip-topbar");

    if (!topbar) return;

    let button = topbar.querySelector(
      ".vvip-home-profile-avatar"
    );

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className =
        "vvip-home-profile-avatar vvip-home-avatar-fixed";
      button.setAttribute(
        "aria-label",
        "فتح البروفايل الخاص"
      );

      const fallback = document.createElement("span");
      fallback.textContent = "ح";
      button.appendChild(fallback);

      topbar.appendChild(button);

      try {
        const store = window.VVIP_P03_PROFILE_STORE;

        if (store) {
          const identity = await store.resolveIdentity();
          const metadata = store.loadMetadata(identity.userId);

          const record = await store.getProcessedImage(
            identity.userId,
            "avatar"
          );

          const source =
            record && record.blob instanceof Blob
              ? URL.createObjectURL(record.blob)
              : metadata.authAvatarUrl ||
                identity.avatarUrl ||
                "";

          if (source) {
            button.textContent = "";

            const image = document.createElement("img");
            image.src = source;
            image.alt = "";
            button.appendChild(image);
          }
        }
      } catch (error) {
        /* يبقى fallback دون كسر الصفحة. */
      }
    }

    button.classList.add("vvip-home-avatar-fixed");

    button.addEventListener(
      "click",
      () => {
        window.location.assign(
          "private-profile-p03.html"
        );
      },
      { once: true }
    );
  }

  function cardCandidates() {
    const selectors = [
      "[data-listing-card]",
      ".vvip-listing-card",
      ".listing-card",
      ".market-card",
      ".discover-card",
      ".vvip-profile-post-card"
    ];

    return Array.from(
      document.querySelectorAll(selectors.join(","))
    );
  }

  function cardIsListing(card) {
    const hasImage = Boolean(
      card.querySelector(
        "img, [data-listing-image], .vvip-listing-image, .vvip-profile-listing-image"
      )
    );

    const text = normalizeText(card.textContent);

    const hasPrice =
      /د\.?\s*أ|دينار|JOD|JD/i.test(text) ||
      Boolean(card.querySelector("[data-price], .price"));

    return hasImage && hasPrice;
  }

  function payloadFromCard(card) {
    const title = firstText(
      card,
      [
        "[data-listing-title]",
        "[data-title]",
        ".vvip-listing-title",
        ".listing-title",
        ".card-title",
        "h3",
        "h2"
      ],
      "إعلان على VVIP TIGER"
    );

    const price = firstText(
      card,
      [
        "[data-listing-price]",
        "[data-price]",
        ".vvip-listing-price",
        ".listing-price",
        ".price"
      ]
    );

    const locationText = firstText(
      card,
      [
        "[data-location]",
        ".vvip-listing-location",
        ".listing-location",
        ".location"
      ]
    );

    const sector = firstText(
      card,
      [
        "[data-sector]",
        ".vvip-sector-badge",
        ".sector",
        ".badge"
      ]
    );

    const image =
      firstAttribute(card, ["img"], "src") ||
      firstAttribute(card, ["img"], "data-src");

    const listingId =
      card.dataset.listingId ||
      card.id ||
      `listing-${Math.abs(title.length * 97)}`;

    const url = new URL(window.location.href);
    url.hash = `listing=${encodeURIComponent(listingId)}`;

    return {
      type: "listing",
      id: listingId,
      title,
      price,
      location: locationText,
      sector,
      image,
      phone: extractPhone(card),
      url: url.toString()
    };
  }

  function shareText(payload) {
    const lines = [
      payload.title || "مشاركة من VVIP TIGER"
    ];

    if (payload.price) {
      lines.push(`السعر: ${payload.price}`);
    }

    if (payload.sector) {
      lines.push(`القسم: ${payload.sector}`);
    }

    if (payload.location) {
      lines.push(`الموقع: ${payload.location}`);
    }

    lines.push(payload.url);

    return lines.join("\n");
  }

  function ensureShareUi() {
    if (
      document.querySelector(
        "[data-vvip-direct-share-backdrop]"
      )
    ) {
      return;
    }

    const backdrop = document.createElement("div");

    backdrop.className = "vvip-direct-share-backdrop";
    backdrop.dataset.vvipDirectShareBackdrop = "";
    backdrop.hidden = true;

    backdrop.innerHTML = `
      <section
        class="vvip-direct-share-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vvip-direct-share-title"
        dir="rtl"
      >
        <div class="vvip-direct-share-handle"></div>

        <header class="vvip-direct-share-header">
          <div>
            <h2 id="vvip-direct-share-title">
              مشاركة الإعلان
            </h2>

            <p>
              اختر طريقة مشاركة خاصة ومباشرة.
            </p>
          </div>

          <button
            class="vvip-direct-share-close"
            type="button"
            aria-label="إغلاق"
            data-close-direct-share
          >
            ×
          </button>
        </header>

        <div class="vvip-direct-share-preview">
          <img alt="" data-direct-share-image>

          <div>
            <strong data-direct-share-title></strong>
            <span data-direct-share-meta></span>
          </div>
        </div>

        <div class="vvip-direct-share-actions">
          <button
            class="vvip-direct-share-action primary"
            type="button"
            data-direct-share-action="device"
          >
            مشاركة الجهاز
          </button>

          <button
            class="vvip-direct-share-action"
            type="button"
            data-direct-share-action="whatsapp"
          >
            واتساب
          </button>

          <button
            class="vvip-direct-share-action"
            type="button"
            data-direct-share-action="sms"
          >
            رسالة SMS
          </button>

          <button
            class="vvip-direct-share-action"
            type="button"
            data-direct-share-action="copy"
          >
            نسخ الرابط
          </button>

          <button
            class="vvip-direct-share-action"
            type="button"
            data-direct-share-action="call"
          >
            اتصال
          </button>

          <button
            class="vvip-direct-share-action"
            type="button"
            data-direct-share-action="internal"
          >
            صديق داخل VVIP TIGER
          </button>
        </div>

        <p class="vvip-direct-share-policy">
          المشاركة داخل VVIP TIGER خاصة من شخص إلى شخص فقط،
          دون مجموعات أو نشر عام. لن تُعتبر مرسلة إنتاجيًا
          قبل ربط واجهة التواصل الاجتماعي وسياسات RLS.
        </p>
      </section>
    `;

    backdrop.addEventListener("click", (event) => {
      if (
        event.target === backdrop ||
        event.target.closest(
          "[data-close-direct-share]"
        )
      ) {
        closeShareSheet();
      }
    });

    backdrop.addEventListener("click", (event) => {
      const button = event.target.closest(
        "[data-direct-share-action]"
      );

      if (!button || !activePayload) return;

      handleAction(
        button.dataset.directShareAction,
        activePayload
      );
    });

    document.body.appendChild(backdrop);

    const toast = document.createElement("div");
    toast.className = "vvip-direct-share-toast";
    toast.dataset.vvipDirectShareToast = "";
    toast.hidden = true;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    document.body.appendChild(toast);
  }

  function showToast(message) {
    const toast = document.querySelector(
      "[data-vvip-direct-share-toast]"
    );

    if (!toast) return;

    window.clearTimeout(toastTimer);

    toast.textContent = message;
    toast.hidden = false;

    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2700);
  }

  function openShareSheet(payload) {
    ensureShareUi();

    activePayload = payload;

    const backdrop = document.querySelector(
      "[data-vvip-direct-share-backdrop]"
    );

    if (!backdrop) return;

    const image = backdrop.querySelector(
      "[data-direct-share-image]"
    );

    const title = backdrop.querySelector(
      "[data-direct-share-title]"
    );

    const meta = backdrop.querySelector(
      "[data-direct-share-meta]"
    );

    const callButton = backdrop.querySelector(
      '[data-direct-share-action="call"]'
    );

    if (image) {
      if (payload.image) {
        image.src = payload.image;
        image.hidden = false;
      } else {
        image.removeAttribute("src");
        image.hidden = true;
      }
    }

    if (title) {
      title.textContent = payload.title;
    }

    if (meta) {
      meta.textContent = [
        payload.price,
        payload.sector,
        payload.location
      ].filter(Boolean).join(" • ");
    }

    if (callButton) {
      callButton.disabled = !payload.phone;
    }

    backdrop.hidden = false;
    document.body.style.overflow = "hidden";

    window.history.pushState(
      {
        ...(window.history.state || {}),
        vvipOverlay: "direct-share"
      },
      ""
    );
  }

  function closeShareSheet(skipHistory = false) {
    const backdrop = document.querySelector(
      "[data-vvip-direct-share-backdrop]"
    );

    if (backdrop) {
      backdrop.hidden = true;
    }

    activePayload = null;
    document.body.style.overflow = "";

    if (
      !skipHistory &&
      window.history.state &&
      window.history.state.vvipOverlay ===
        "direct-share"
    ) {
      window.history.back();
    }
  }

  async function handleAction(action, payload) {
    const text = shareText(payload);
    const encodedText = encodeURIComponent(text);

    if (action === "device") {
      if (!navigator.share) {
        showToast(
          "مشاركة الجهاز غير متاحة. استخدم واتساب أو نسخ الرابط."
        );

        return;
      }

      try {
        await navigator.share({
          title: payload.title,
          text,
          url: payload.url
        });

        closeShareSheet();
      } catch (error) {
        if (error && error.name !== "AbortError") {
          showToast("تعذر فتح مشاركة الجهاز.");
        }
      }

      return;
    }

    if (action === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodedText}`,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    if (action === "sms") {
      window.location.href =
        `sms:?&body=${encodedText}`;

      return;
    }

    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(text);
        showToast("تم نسخ الإعلان والرابط.");
      } catch (error) {
        showToast("تعذر النسخ تلقائيًا.");
      }

      return;
    }

    if (action === "call") {
      if (!payload.phone) {
        showToast(
          "رقم الاتصال غير متاح أو لم يسمح صاحبه بعرضه."
        );

        return;
      }

      window.location.href = `tel:${payload.phone}`;
      return;
    }

    if (action === "internal") {
      const api = window.VVIP_PROFILE_API;

      if (
        api &&
        typeof api.openFriendShare === "function"
      ) {
        api.openFriendShare({
          resourceType: payload.type,
          resourceId: payload.id,
          title: payload.title,
          url: payload.url
        });

        closeShareSheet();
        return;
      }

      showToast(
        "مشاركة الأصدقاء الداخلية تنتظر ربط API الاجتماعي وRLS."
      );
    }
  }

  function injectShareButtons() {
    cardCandidates().forEach((card) => {
      if (
        card.dataset.vvipDirectShareReady === "1" ||
        !cardIsListing(card)
      ) {
        return;
      }

      card.dataset.vvipDirectShareReady = "1";

      const row = document.createElement("div");
      row.className = "vvip-listing-share-row";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "vvip-listing-share-button";

      button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <path d="m8.6 10.6 6.8-4.2"></path>
          <path d="m8.6 13.4 6.8 4.2"></path>
        </svg>

        <span>مشاركة الإعلان</span>
      `;

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        openShareSheet(payloadFromCard(card));
      });

      row.appendChild(button);
      card.appendChild(row);
    });
  }

  function initialize() {
    ensureShareUi();
    ensureHomeAvatar();
    injectShareButtons();

    const observer = new MutationObserver(() => {
      ensureHomeAvatar();
      injectShareButtons();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener(
      "popstate",
      () => {
        const backdrop = document.querySelector(
          "[data-vvip-direct-share-backdrop]"
        );

        if (backdrop && !backdrop.hidden) {
          closeShareSheet(true);
        }
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();
