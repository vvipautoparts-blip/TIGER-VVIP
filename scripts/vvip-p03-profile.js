(function () {
  "use strict";

  const store = window.VVIP_P03_PROFILE_STORE;
  const routes = window.VVIP_P03_ROUTES || {};

  if (!store) {
    throw new Error("VVIP_PROFILE_STORE_MISSING");
  }

  const MOTION_KEY = "vvip:p03:profile-motion";
  const LIKE_PREFIX = "vvip:p03:private-like:";
  const PREVIEW_SHARE_KEY = "vvip:p03:preview-private-shares";
  const MAX_SHARE_RECIPIENTS = 20;

  const PAGE_MODE = document.body.dataset.profileMode;
  const toast = document.querySelector("[data-toast]");
  const authGate = document.querySelector("[data-auth-gate]");
  const protectedApp = document.querySelector("[data-auth-protected]");
  const PRIVATE_AUTH_RETURN_URL =
    "index.html?reason=session_required&return_to=private-profile-p03.html";

  const LISTINGS = Object.freeze({
    brakes: {
      title: "قطع فرامل أصلية بحالة ممتازة",
      price: "45 د.أ",
      sector: "السيارات والخدمات",
      category: "قطع غيار",
      location: "عمّان",
      description:
        "قطع فرامل أصلية، تمت معاينتها وتجهيزها للعرض داخل المنصة.",
      fields: [
        ["العلامة", "هيونداي"],
        ["الموديل", "متعدد الموديلات"],
        ["السنة", "حسب المركبة"],
        ["نوع القطعة", "نظام فرامل"],
        ["الحالة", "ممتازة"],
        ["التوفر", "متوفر"]
      ]
    },

    materials: {
      title: "مواد تشطيب داخلية للمشاريع",
      price: "120 د.أ",
      sector: "المواد والمستلزمات",
      category: "مواد بناء",
      location: "الزرقاء",
      description:
        "مواد تشطيب داخلية مناسبة للمشاريع، مع تحديد الكمية المطلوبة قبل التواصل.",
      fields: [
        ["نوع المادة", "تشطيبات داخلية"],
        ["طريقة البيع", "جملة أو مفرق"],
        ["الوحدة", "حسب الصنف"],
        ["أقل كمية", "تُحدد عند التواصل"],
        ["الحالة", "جديدة"],
        ["التوفر", "متوفر"]
      ]
    },

    apartment: {
      title: "شقة واسعة ضمن منطقة هادئة",
      price: "68,000 د.أ",
      sector: "العقارات",
      category: "شقق",
      location: "الفحيص",
      description:
        "شقة سكنية واسعة ضمن منطقة هادئة، مع عرض التفاصيل الأساسية قبل التواصل.",
      fields: [
        ["نوع العقار", "شقة سكنية"],
        ["المساحة", "160 م²"],
        ["الغرف", "3"],
        ["الحمامات", "2"],
        ["الغرض", "بيع"],
        ["الحالة", "متاحة"]
      ]
    }
  });

  let identity = null;
  let metadata = null;
  let userId = "";
  let currentObjectUrls = [];
  let activeSheet = null;
  let activeShareResource = null;
  let selectedFriendIds = new Set();
  let remoteMediaState = {
    available: false,
    avatar: false,
    cover: false,
    offline: false
  };

  let toastTimer = null;

  function showAuthGate(message) {
    if (!authGate) return;

    authGate.hidden = false;
    authGate.textContent =
      message || "جاري التحقق من الجلسة الآمنة...";
  }

  function revealProtectedApp() {
    if (authGate) {
      authGate.hidden = true;
    }

    if (protectedApp) {
      protectedApp.hidden = false;
    }
  }

  function redirectToAuthGate() {
    window.location.replace(PRIVATE_AUTH_RETURN_URL);
  }

  function classifyClerkAuthError(error) {
    const message = String(
      (error && error.message) || error || ""
    ).toLowerCase();

    if (
      /origin|domain|unauthorized|forbidden|not allowed/.test(
        message
      )
    ) {
      return "CLERK_DASHBOARD_ORIGIN_CONFIG_REQUIRED";
    }

    if (/network|fetch/.test(message)) {
      return "CLERK_NETWORK_UNAVAILABLE";
    }

    if (/timeout/.test(message)) {
      return "CLERK_LOAD_TIMEOUT";
    }

    return "CLERK_AUTH_UNAVAILABLE";
  }

  async function waitForPrivateClerkSession(
    timeout = 7000
  ) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      if (
        window.Clerk &&
        typeof window.Clerk.load === "function"
      ) {
        try {
          await Promise.race([
            window.Clerk.load(),
            new Promise((resolve) => {
              window.setTimeout(resolve, 1200);
            })
          ]);
        } catch (error) {
          const code = classifyClerkAuthError(error);
          window.__VVIP_PRIVATE_AUTH_STATUS = code;

          console.error("VVIP_PRIVATE_AUTH_CLERK_LOAD_FAILED", {
            code,
            message:
              error && error.message
                ? error.message
                : String(error)
          });

          throw new Error(code);
        }

        if (window.Clerk.loaded) {
          const hasUser = Boolean(window.Clerk.user);
          const hasSession = Boolean(window.Clerk.session);

          if (hasUser && hasSession) {
            return {
              ok: true,
              user: window.Clerk.user,
              session: window.Clerk.session
            };
          }
        }
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 120);
      });
    }

    return { ok: false, reason: "SESSION_MISSING" };
  }

  async function enforcePrivateAuthGate() {
    if (PAGE_MODE !== "private") {
      revealProtectedApp();
      return true;
    }

    showAuthGate("جاري التحقق من الجلسة الآمنة...");

    try {
      const session = await waitForPrivateClerkSession();

      if (!session.ok) {
        showAuthGate("يلزم تسجيل الدخول للمتابعة.");
        window.setTimeout(redirectToAuthGate, 180);
        return false;
      }

      revealProtectedApp();
      window.__VVIP_PRIVATE_AUTH_STATUS = "AUTH_OK";
      return true;
    } catch (error) {
      const code = classifyClerkAuthError(error);
      window.__VVIP_PRIVATE_AUTH_STATUS = code;

      if (
        code ===
        "CLERK_DASHBOARD_ORIGIN_CONFIG_REQUIRED"
      ) {
        showAuthGate(
          "تعذر تفعيل تسجيل الدخول على هذا الرابط. يرجى التحقق من إعدادات النطاق ثم إعادة المحاولة."
        );
      } else {
        showAuthGate(
          "تعذر التحقق من الجلسة الآن. سيتم تحويلك لبوابة الدخول."
        );
      }

      window.setTimeout(redirectToAuthGate, 450);
      return false;
    }
  }

  function showToast(message) {
    if (!toast) return;

    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;

    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  function initials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return "م";

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("");
  }

  function revokeRenderedUrls() {
    currentObjectUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    currentObjectUrls = [];
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value || "";
    });
  }

  async function renderProcessedImage(
    imageType,
    imageSelector,
    fallbackSelector
  ) {
    const record = await store.getProcessedImage(
      userId,
      imageType
    );

    let source = "";

    const allowLocalRecord =
      remoteMediaState.offline ||
      Boolean(remoteMediaState[imageType]);

    if (
      allowLocalRecord &&
      record &&
      record.blob instanceof Blob
    ) {
      source = URL.createObjectURL(record.blob);
      currentObjectUrls.push(source);
    }

    document.querySelectorAll(imageSelector).forEach((image) => {
      if (source) {
        image.src = source;
        image.hidden = false;
      } else {
        image.removeAttribute("src");
        image.hidden = true;
      }
    });

    document.querySelectorAll(fallbackSelector).forEach((fallback) => {
      fallback.hidden = Boolean(source);
    });
  }

  async function renderProfile() {
    revokeRenderedUrls();

    const displayName =
      String(metadata.name || "").trim() ||
      String(identity && identity.name || "").trim() ||
      "مستخدم";

    const bio = String(metadata.bio || "").trim();
    const work = String(metadata.work || "").trim();
    const education = String(metadata.education || "").trim();
    const location = String(metadata.location || "").trim();
    setText("[data-profile-name]", displayName);
    setText("[data-profile-initials]", initials(displayName));
    setText("[data-profile-bio]", bio);
    setText("[data-profile-work]", work);
    setText("[data-profile-education]", education);
    setText("[data-profile-location]", location);

    document
      .querySelectorAll("[data-profile-bio]")
      .forEach((element) => {
        element.hidden = !bio;
      });

    document
      .querySelectorAll("[data-profile-verified]")
      .forEach((element) => {
        element.hidden = !metadata.verified;
      });

    await Promise.all([
      renderProcessedImage(
        "avatar",
        "[data-profile-avatar-image]",
        "[data-profile-avatar-fallback]"
      ),

      renderProcessedImage(
        "cover",
        "[data-profile-cover-image]",
        "[data-profile-cover-fallback]"
      )
    ]);
  }

  function applyEntryMotion() {
    const motion = sessionStorage.getItem(MOTION_KEY);

    if (!motion) return;

    const className =
      motion === "back"
        ? "vvip-profile-enter-back"
        : "vvip-profile-enter-forward";

    document.body.classList.add(className);

    window.setTimeout(() => {
      document.body.classList.remove(className);
      sessionStorage.removeItem(MOTION_KEY);
    }, 430);
  }

  function openSheet(sheet) {
    if (!sheet || !sheet.hidden) return;

    activeSheet = sheet;
    sheet.hidden = false;
    document.body.style.overflow = "hidden";

    window.history.pushState(
      { vvipOverlay: sheet.dataset.sheetName || "profile-sheet" },
      ""
    );
  }

  function closeSheetWithoutHistory() {
    if (!activeSheet) return;

    activeSheet.hidden = true;
    activeSheet = null;
    document.body.style.overflow = "";
  }

  function requestCloseSheet() {
    if (!activeSheet) return;

    if (
      window.history.state &&
      window.history.state.vvipOverlay
    ) {
      window.history.back();
      return;
    }

    closeSheetWithoutHistory();
  }

  function bindTabs() {
    const tabs = Array.from(
      document.querySelectorAll("[data-profile-tab]")
    );

    const panels = Array.from(
      document.querySelectorAll("[data-profile-panel]")
    );

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.profileTab;

        tabs.forEach((item) => {
          item.setAttribute(
            "aria-selected",
            item === tab ? "true" : "false"
          );
        });

        panels.forEach((panel) => {
          panel.hidden =
            panel.dataset.profilePanel !== target;
        });
      });
    });
  }

  function bindNavigation() {
    document
      .querySelectorAll("[data-profile-back]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          if (window.history.length > 1) {
            window.history.back();
            return;
          }

          window.location.assign("index.html");
        });
      });

    document.querySelectorAll("[data-route]").forEach((button) => {
      button.addEventListener("click", () => {
        const route = routes[button.dataset.route];

        if (!route) {
          showToast("المسار غير معروف.");
          return;
        }

        if (!route.available) {
          showToast(`${route.label}: سيتم ربطها في مرحلة لاحقة.`);
          return;
        }

        window.location.assign(route.href);
      });
    });
  }

  function bindPrivateProfileEditor() {
    const editSheet = document.querySelector(
      "[data-profile-edit-sheet]"
    );

    const form = document.querySelector(
      "[data-profile-edit-form]"
    );

    document
      .querySelectorAll("[data-open-profile-editor]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          if (!form || !editSheet) return;

          form.elements.name.value = metadata.name;
          form.elements.bio.value = metadata.bio;
          form.elements.work.value = metadata.work;
          form.elements.education.value = metadata.education;
          form.elements.location.value = metadata.location;

          openSheet(editSheet);
        });
      });

    document
      .querySelectorAll("[data-save-profile-editor]")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          if (!form) return;

          const data = new FormData(form);
          const nextName = String(data.get("name") || "").trim();

          if (!nextName) {
            showToast("الاسم مطلوب.");
            return;
          }

          metadata = {
            ...metadata,
            name: nextName,
            bio: String(data.get("bio") || "").trim(),
            work: String(data.get("work") || "").trim(),
            education: String(data.get("education") || "").trim(),
            location: String(data.get("location") || "").trim()
          };

          store.saveMetadata(userId, metadata);
          await renderProfile();
          requestCloseSheet();
          showToast("تم حفظ معلومات الملف في المعاينة.");
        });
      });
  }

  function pendingMediaSyncKey(kind) {
    return `vvip:p03:pending-profile-media:${userId}:${kind}`;
  }

  function clearMediaSyncPending(kind) {
    try {
      localStorage.removeItem(
        pendingMediaSyncKey(kind)
      );
    } catch (error) {
      console.warn(
        "VVIP_PENDING_MEDIA_SYNC_CLEAR_FAILED",
        error
      );
    }
  }

  async function retryPendingProfileMediaSync() {
    const remote =
      window.VVIP_P03_PROFILE_REMOTE_SYNC;

    if (
      !remote ||
      typeof remote.upload !== "function"
    ) {
      return;
    }

    for (const kind of ["avatar", "cover"]) {
      let pending = false;

      try {
        pending =
          localStorage.getItem(
            pendingMediaSyncKey(kind)
          ) === "1";
      } catch (error) {
        pending = false;
      }

      if (!pending) continue;

      const record =
        await store.getProcessedImage(
          userId,
          kind
        );

      if (
        !record ||
        !(record.blob instanceof Blob)
      ) {
        clearMediaSyncPending(kind);
        continue;
      }

      try {
        await remote.upload({
          userId,
          kind,
          blob: record.blob
        });

        clearMediaSyncPending(kind);

        showToast(
          kind === "cover"
            ? "تمت مزامنة صورة الغلاف مع الحساب."
            : "تمت مزامنة الصورة الشخصية مع الحساب."
        );
      } catch (error) {
        console.warn(
          "VVIP_PENDING_PROFILE_MEDIA_SYNC_FAILED",
          kind,
          error?.code || error?.message || error
        );
      }
    }
  }
  function bindListingDetails() {
    const sheet = document.querySelector(
      "[data-listing-details-sheet]"
    );

    document
      .querySelectorAll("[data-open-listing-details]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const listing =
            LISTINGS[button.dataset.openListingDetails];

          if (!listing || !sheet) return;

          setText("[data-detail-title]", listing.title);
          setText("[data-detail-price]", listing.price);
          setText("[data-detail-sector]", listing.sector);
          setText("[data-detail-category]", listing.category);
          setText("[data-detail-location]", listing.location);
          setText(
            "[data-detail-description]",
            listing.description
          );

          const list = document.querySelector(
            "[data-detail-fields]"
          );

          if (list) {
            list.textContent = "";

            listing.fields.forEach(([label, value]) => {
              const row = document.createElement("div");
              const term = document.createElement("dt");
              const description = document.createElement("dd");

              term.textContent = label;
              description.textContent = value;

              row.append(term, description);
              list.appendChild(row);
            });
          }

          openSheet(sheet);
        });
      });
  }

  function previewFriends() {
    return [
      {
        id: "preview-friend-1",
        name: "صديق للمعاينة 1"
      },
      {
        id: "preview-friend-2",
        name: "صديق للمعاينة 2"
      },
      {
        id: "preview-friend-3",
        name: "صديق للمعاينة 3"
      }
    ];
  }

  async function listFriends() {
    if (
      window.VVIP_PROFILE_API &&
      typeof window.VVIP_PROFILE_API.listFriends === "function"
    ) {
      return window.VVIP_PROFILE_API.listFriends();
    }

    const isLocalPreview = [
      "127.0.0.1",
      "localhost"
    ].includes(window.location.hostname);

    return isLocalPreview ? previewFriends() : [];
  }

  function updateShareCounter() {
    const counter = document.querySelector(
      "[data-share-selected-count]"
    );

    if (counter) {
      counter.textContent =
        `${selectedFriendIds.size} / ${MAX_SHARE_RECIPIENTS}`;
    }
  }

  async function openShareSheet(resource) {
    const sheet = document.querySelector(
      "[data-private-share-sheet]"
    );

    const list = document.querySelector(
      "[data-friend-list]"
    );

    if (!sheet || !list) return;

    activeShareResource = resource;
    selectedFriendIds = new Set();

    setText("[data-share-resource-title]", resource.title);

    list.textContent = "";

    const friends = await listFriends();

    if (!friends.length) {
      const empty = document.createElement("p");
      empty.className = "vvip-share-empty";
      empty.textContent =
        "لا توجد بيانات أصدقاء مرتبطة حاليًا. ستظهر هنا الحسابات المسموح بمشاركتها بعد ربط خدمة المتابعة.";
      list.appendChild(empty);
    }

    friends.forEach((friend) => {
      const label = document.createElement("label");
      label.className = "vvip-friend-option";

      const avatar = document.createElement("span");
      avatar.className = "vvip-friend-avatar";
      avatar.textContent = initials(friend.name);

      const copy = document.createElement("span");
      copy.textContent = friend.name;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = friend.id;

      checkbox.addEventListener("change", () => {
        if (
          checkbox.checked &&
          selectedFriendIds.size >= MAX_SHARE_RECIPIENTS
        ) {
          checkbox.checked = false;
          showToast("الحد الأقصى 20 صديقًا في الجلسة.");
          return;
        }

        if (checkbox.checked) {
          selectedFriendIds.add(friend.id);
        } else {
          selectedFriendIds.delete(friend.id);
        }

        updateShareCounter();
      });

      label.append(avatar, copy, checkbox);
      list.appendChild(label);
    });

    updateShareCounter();
    openSheet(sheet);
  }

  async function submitPrivateShare() {
    if (!activeShareResource) return;

    if (!selectedFriendIds.size) {
      showToast("اختر صديقًا واحدًا على الأقل.");
      return;
    }

    const payload = {
      resourceType: activeShareResource.type,
      resourceId: activeShareResource.id,
      recipientIds: Array.from(selectedFriendIds),
      channel: "one-to-one-private",
      createdAt: new Date().toISOString()
    };

    if (
      window.VVIP_PROFILE_API &&
      typeof window.VVIP_PROFILE_API.sharePrivate === "function"
    ) {
      try {
        await window.VVIP_PROFILE_API.sharePrivate(payload);
        requestCloseSheet();
        showToast("تمت المشاركة الخاصة.");
      } catch (error) {
        showToast("تعذر إتمام المشاركة الخاصة.");
      }

      return;
    }

    const isLocalPreview = [
      "127.0.0.1",
      "localhost"
    ].includes(window.location.hostname);

    if (!isLocalPreview) {
      showToast("خدمة المشاركة الآمنة غير مرتبطة بالخادم بعد.");
      return;
    }

    const previous = JSON.parse(
      sessionStorage.getItem(PREVIEW_SHARE_KEY) || "[]"
    );

    previous.push(payload);

    sessionStorage.setItem(
      PREVIEW_SHARE_KEY,
      JSON.stringify(previous)
    );

    requestCloseSheet();

    showToast(
      "تم اختبار المشاركة محليًا فقط؛ لم تُرسل إلى خادم إنتاجي."
    );
  }

  function bindPrivateSharing() {
    document
      .querySelectorAll("[data-share-profile]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          openShareSheet({
            type: "profile",
            id: userId,
            title: `الملف الخاص: ${metadata.name}`
          });
        });
      });

    document
      .querySelectorAll("[data-share-listing]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const listingId = button.dataset.shareListing;
          const listing = LISTINGS[listingId];

          if (!listing) return;

          openShareSheet({
            type: "listing",
            id: listingId,
            title: listing.title
          });
        });
      });

    document
      .querySelectorAll("[data-submit-private-share]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          submitPrivateShare
        );
      });
  }

  function likeStorageKey(resourceId) {
    return `${LIKE_PREFIX}${userId}:${resourceId}`;
  }

  function renderLikeButton(button) {
    const active =
      localStorage.getItem(
        likeStorageKey(button.dataset.privateLike)
      ) === "1";

    button.setAttribute(
      "aria-pressed",
      active ? "true" : "false"
    );

    const label = button.querySelector("span");

    if (label) {
      label.textContent =
        active ? "تم الإعجاب" : "أعجبني";
    }
  }

  function bindPrivateLikes() {
    document
      .querySelectorAll("[data-private-like]")
      .forEach((button) => {
        renderLikeButton(button);

        button.addEventListener("click", async () => {
          const resourceId = button.dataset.privateLike;
          const currentlyActive =
            button.getAttribute("aria-pressed") === "true";

          const nextActive = !currentlyActive;

          if (
            window.VVIP_PROFILE_API &&
            typeof window.VVIP_PROFILE_API.setPrivateLike === "function"
          ) {
            try {
              await window.VVIP_PROFILE_API.setPrivateLike({
                resourceId,
                active: nextActive
              });
            } catch (error) {
              showToast("تعذر تحديث الإعجاب.");
              return;
            }
          }

          localStorage.setItem(
            likeStorageKey(resourceId),
            nextActive ? "1" : "0"
          );

          renderLikeButton(button);

          showToast(
            nextActive
              ? "الإعجاب ظاهر لك ولصاحب المنشور فقط."
              : "تم إلغاء الإعجاب."
          );
        });
      });
  }

  function bindMoreMenu() {
    const sheet = document.querySelector(
      "[data-profile-more-sheet]"
    );

    document
      .querySelectorAll("[data-open-profile-more]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          openSheet(sheet);
        });
      });
  }

  function bindMessaging() {
    document
      .querySelectorAll("[data-private-message]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          if (
            window.VVIP_PROFILE_API &&
            typeof window.VVIP_PROFILE_API.openConversation === "function"
          ) {
            window.VVIP_PROFILE_API.openConversation({
              profileId: userId
            });

            return;
          }

          showToast(
            "سيتم فتح المحادثة الفردية بعد ربط خدمة التواصل."
          );
        });
      });
  }

  function bindSheetClosing() {
    document
      .querySelectorAll("[data-close-sheet]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          requestCloseSheet
        );
      });

    document
      .querySelectorAll("[data-sheet-backdrop]")
      .forEach((backdrop) => {
        backdrop.addEventListener("click", (event) => {
          if (event.target === backdrop) {
            requestCloseSheet();
          }
        });
      });

    window.addEventListener("popstate", () => {
      if (activeSheet) {
        closeSheetWithoutHistory();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeSheet) {
        requestCloseSheet();
      }
    });
  }

  async function initialize() {
    if (!(await enforcePrivateAuthGate())) {
      return;
    }

    bindTabs();
    bindNavigation();
    bindPrivateProfileEditor();
    bindMoreMenu();
    bindSheetClosing();
    bindListingDetails();
    bindPrivateSharing();
    bindPrivateLikes();
    bindMessaging();

    identity = await store.resolveIdentity();
    userId = identity.userId;

    if (
      typeof store.migrateLegacyProfileState === "function"
    ) {
      await store.migrateLegacyProfileState(userId);
    }

    metadata = store.loadMetadata(userId);

    /* P03 REMOTE MEDIA SYNC — INITIAL LOAD */
    if (window.VVIP_P03_PROFILE_REMOTE_SYNC) {
      try {
        remoteMediaState = await window
          .VVIP_P03_PROFILE_REMOTE_SYNC
          .syncDown({
            userId,
            store
          });

        if (remoteMediaState.available) {
          if (!remoteMediaState.avatar) {
            await store.removeProcessedImage(
              userId,
              "avatar"
            );
          }

          if (!remoteMediaState.cover) {
            await store.removeProcessedImage(
              userId,
              "cover"
            );
          }
        }
      } catch (error) {
        const offlineClassifier = window
          .VVIP_P03_PROFILE_REMOTE_SYNC
          .isOfflineError;
        const isOfflineError = typeof offlineClassifier === "function"
          ? offlineClassifier(error)
          : navigator.onLine === false;
        remoteMediaState = {
          available: false,
          avatar: false,
          cover: false,
          offline: isOfflineError
        };

        console.warn(
          "VVIP_PROFILE_REMOTE_SYNC_DOWN_FAILED",
          error?.code || error?.message || error
        );
      }
    }

    if (
      identity.name &&
      (
        !String(metadata.name || "").trim() ||
        !metadata.name
      )
    ) {
      metadata.name = identity.name;
    }

    store.saveMetadata(userId, metadata);

    await renderProfile();

    /*
      إعادة محاولة أي صورة اعتمدت سابقًا
      ولم تكتمل مزامنتها المركزية.
    */
    void retryPendingProfileMediaSync();

    applyEntryMotion();
  }

  initialize().catch(() => {
    showToast("تعذر تهيئة بيانات الملف.");
  });

  window.addEventListener("beforeunload", () => {
    revokeRenderedUrls();
  });
})();
