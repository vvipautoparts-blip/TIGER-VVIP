(function (window, document) {
  "use strict";

  const contract = window.VVIP_PR39_PROFILE_CONTRACT;
  const pr38Summary = window.VVIP_PR38_ACCOUNT_SUMMARY;

  function createViewState(subject) {
    return {
      subject: subject,
      forcedVisitor: false,
      activeMode: subject.isOwner ? contract.OWNER_MODE : contract.VISITOR_MODE
    };
  }

  function setVisitorPreview(state, enabled) {
    state.forcedVisitor = !!enabled;
    if (!state.subject.isOwner) {
      state.activeMode = contract.VISITOR_MODE;
      return state.activeMode;
    }
    state.activeMode = enabled ? contract.VISITOR_MODE : contract.OWNER_MODE;
    return state.activeMode;
  }

  function createMenuModel(subject, forcedVisitor) {
    const ownerVisible = !!(subject.isOwner && !forcedVisitor);
    return {
      ownerVisible: ownerVisible,
      items: contract.createOwnerMenuItems(ownerVisible)
    };
  }

  async function logoutSessionOnly(clerk, locationRef) {
    try {
      if (!clerk || typeof clerk.signOut !== "function") {
        return { ok: false, message: "تعذر إنهاء الجلسة الحالية الآن." };
      }
      await clerk.signOut();
      locationRef.replace("index.html");
      return { ok: true, message: "تم إنهاء الجلسة الحالية." };
    } catch (error) {
      return { ok: false, message: "تعذر إنهاء الجلسة الحالية الآن. حاول مرة أخرى." };
    }
  }

  function setText(node, value) {
    if (node) node.textContent = String(value || "");
  }

  function show(node, visible) {
    if (!node) return;
    node.hidden = !visible;
  }

  function draftAccountTypeInfo() {
    if (!pr38Summary || typeof pr38Summary.readDraftFromStorage !== "function") {
      return { name: "غير محدد", isDraft: false };
    }
    const draft = pr38Summary.readDraftFromStorage(window.localStorage);
    if (!draft || !draft.accountTypeId) {
      return { name: "غير محدد", isDraft: false };
    }
    const summary = pr38Summary.buildDraftSummary(draft.accountTypeId, "ar");
    if (!summary) return { name: "غير محدد", isDraft: false };
    return {
      name: summary.name,
      isDraft: draft.official !== true
    };
  }

  function applyMenuInteractions(menuButton, menuPanel) {
    if (!menuButton || !menuPanel) return;

    const closeMenu = function () {
      menuPanel.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
    };

    const openMenu = function () {
      menuPanel.hidden = false;
      menuButton.setAttribute("aria-expanded", "true");
    };

    menuButton.addEventListener("click", function () {
      if (menuPanel.hidden) {
        openMenu();
      } else {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    document.addEventListener("click", function (event) {
      if (!menuPanel.contains(event.target) && !menuButton.contains(event.target)) {
        closeMenu();
      }
    });
  }

  function syncMenuItems(root, menuItems) {
    const allItems = root.querySelectorAll("[data-pr39-menu-item]");
    allItems.forEach(function (itemNode) {
      const key = String(itemNode.getAttribute("data-pr39-menu-item") || "");
      itemNode.hidden = menuItems.indexOf(key) < 0;
    });
  }

  function buildSubjectFromRuntime() {
    let sessionUser = null;
    if (window.Clerk && window.Clerk.user && window.Clerk.user.id) {
      sessionUser = { id: String(window.Clerk.user.id) };
    }

    const params = new URLSearchParams(window.location.search);
    const subjectUserId = String(params.get("subject") || (sessionUser && sessionUser.id) || "visitor-subject");

    const draft = pr38Summary && pr38Summary.readDraftFromStorage ? pr38Summary.readDraftFromStorage(window.localStorage) : null;

    return contract.createProfileSubject({
      sessionUser: sessionUser,
      subjectUserId: subjectUserId,
      profileSource: {
        displayName: "مستخدم VVIP",
        publicUsername: "",
        publicBio: "نبذة عامة ستظهر بعد التفعيل الرسمي.",
        publicLocation: "",
        accountType: "",
        publishingPermission: "none",
        accountStatus: "active"
      },
      accountTypeDraft: draft
    });
  }

  function bootstrapPublicProfile() {
    const root = document.querySelector("[data-pr39-public-profile]");
    if (!root || !contract) return;

    const subject = buildSubjectFromRuntime();
    const state = createViewState(subject);

    const accountType = draftAccountTypeInfo();
    setText(root.querySelector("[data-pr39-name]"), subject.displayName);
    setText(root.querySelector("[data-pr39-username]"), subject.publicUsername ? "@" + subject.publicUsername : "@");
    setText(root.querySelector("[data-pr39-bio]"), subject.publicBio);
    setText(root.querySelector("[data-pr39-location]"), subject.publicLocation || "الموقع العام غير متاح حاليًا.");
    setText(root.querySelector("[data-pr39-account-type]"), accountType.name);
    setText(root.querySelector("[data-pr39-account-type-status]"), accountType.isDraft ? "اختيار غير مفعّل رسميًا بعد." : "موثق رسميًا.");
    setText(root.querySelector("[data-pr39-permission]"), subject.publishingPermission === "none" ? "النشر غير مفعّل." : subject.publishingPermission);

    const ownerTools = root.querySelector("[data-pr39-owner-tools]");
    const visitorTools = root.querySelector("[data-pr39-visitor-tools]");
    const messageButton = root.querySelector("[data-pr39-message]");
    show(messageButton, subject.canMessage);

    const applyMode = function () {
      const ownerVisible = state.activeMode === contract.OWNER_MODE;
      show(ownerTools, ownerVisible);
      show(visitorTools, !ownerVisible);
      root.querySelectorAll("[data-pr39-owner-nav]").forEach(function (node) {
        show(node, ownerVisible);
      });
      const backOwner = root.querySelector("[data-pr39-back-owner]");
      if (backOwner) {
        show(backOwner, subject.isOwner && !ownerVisible);
      }
      root.setAttribute("data-mode", state.activeMode);
      const menu = createMenuModel(subject, !ownerVisible);
      setText(root.querySelector("[data-pr39-menu-summary]"), menu.items.join(" | "));
      syncMenuItems(root, menu.items);
    };

    const viewAsVisitorButton = root.querySelector("[data-pr39-view-as-visitor]");
    if (viewAsVisitorButton) {
      viewAsVisitorButton.addEventListener("click", function () {
        setVisitorPreview(state, true);
        applyMode();
      });
    }

    const backToOwnerButton = root.querySelector("[data-pr39-back-owner]");
    if (backToOwnerButton) {
      backToOwnerButton.addEventListener("click", function () {
        setVisitorPreview(state, false);
        applyMode();
      });
    }

    const copyButton = root.querySelector("[data-pr39-copy-link]");
    if (copyButton) {
      copyButton.addEventListener("click", function () {
        const url = new URL("public-profile-p05.html", window.location.origin + "/").href;
        if (window.navigator && window.navigator.clipboard && typeof window.navigator.clipboard.writeText === "function") {
          window.navigator.clipboard.writeText(url).catch(function () {
            // Intentionally silent to avoid noisy logs with profile data.
          });
        }
      });
    }

    const menuButton = root.querySelector("[data-pr39-menu-trigger]");
    const menuPanel = root.querySelector("[data-pr39-menu]");
    applyMenuInteractions(menuButton, menuPanel);

    if (menuPanel) {
      menuPanel.addEventListener("click", function (event) {
        const item = event.target.closest("[data-pr39-menu-item]");
        if (!item) return;
        const action = item.getAttribute("data-pr39-menu-item");
        if (action === "viewAsVisitor") {
          setVisitorPreview(state, true);
          applyMode();
          return;
        }
        if (action === "settings") {
          window.location.href = "account-settings-p05.html";
          return;
        }
        if (action === "tigerCare") {
          if (status) status.textContent = "تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.";
          return;
        }
      });
    }

    const logoutButton = root.querySelector("[data-pr39-logout]");
    const status = root.querySelector("[data-pr39-status]");
    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        logoutSessionOnly(window.Clerk, window.location).then(function (result) {
          if (status) status.textContent = result.message;
        });
      });
    }

    applyMode();
  }

  if (document && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", bootstrapPublicProfile);
  }

  window.VVIP_PR39_PROFILE_CONTROLLER = Object.freeze({
    createViewState: createViewState,
    setVisitorPreview: setVisitorPreview,
    createMenuModel: createMenuModel,
    logoutSessionOnly: logoutSessionOnly,
    syncMenuItems: syncMenuItems
  });
}(window, document));
