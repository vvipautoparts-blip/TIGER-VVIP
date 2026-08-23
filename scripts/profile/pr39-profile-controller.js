(function (window, document) {
  "use strict";

  const contract = window.VVIP_PR39_PROFILE_CONTRACT;
  const pr38Summary = window.VVIP_PR38_ACCOUNT_SUMMARY;
  const permissionsControl = window.VVIP_PERMISSIONS_CONTROL;
  const PROFILE_SURFACE = "PROFILE_MORE_MENU";

  function createViewState(subject) {
    return {
      subject: subject,
      activeMode: subject.mode
    };
  }

  function createMenuModel(subject) {
    const ownerVisible = subject && subject.mode === contract.OWNER_VIEW;
    const memberVisible = subject && subject.mode === contract.AUTHORIZED_MEMBER_VIEW;
    return {
      ownerVisible: !!ownerVisible,
      memberVisible: !!memberVisible,
      items: subject && subject.mode !== contract.AUTH_REQUIRED ? contract.createOwnerMenuItems(!!ownerVisible) : []
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

  function hidePermissionsSurface(permissionsItem, managementNode) {
    show(permissionsItem, false);
    if (managementNode) {
      managementNode.textContent = "";
      show(managementNode, false);
    }
  }

  function createPermissionsRuntimeAdapter(options) {
    const input = options && typeof options === "object" ? options : {};
    const targetId = typeof input.targetId === "string" ? input.targetId.trim() : "";
    const permissionsItem = input.permissionsItem || null;
    const managementNode = input.managementNode || null;
    const modelBuilder = input.permissionsControl;
    const loadCapabilitySnapshot = input.loadCapabilitySnapshot;

    async function prepareForMenuOpen() {
      hidePermissionsSurface(permissionsItem, managementNode);
      if (!targetId
        || !modelBuilder
        || typeof modelBuilder.buildPermissionsControlModel !== "function"
        || typeof loadCapabilitySnapshot !== "function") {
        return null;
      }

      try {
        const snapshot = await loadCapabilitySnapshot({
          target_id: targetId,
          surface: PROFILE_SURFACE
        });
        const model = modelBuilder.buildPermissionsControlModel({
          snapshot: snapshot,
          target_id: targetId
        });
        const readyModel = Object.freeze(Object.assign({}, model, {
          integration: Object.freeze(Object.assign({}, model.integration || {}, {
            surface: PROFILE_SURFACE,
            dom_ready: true,
            reason: "AUTHORIZATION_RUNTIME_ADAPTER_WIRED"
          }))
        }));

        if (model.can_view || model.can_manage) {
          if (permissionsItem) {
            permissionsItem.textContent = "الصلاحيات";
            show(permissionsItem, true);
          }
        }

        if (model.can_manage && managementNode) {
          managementNode.textContent = (model.management_controls || []).map(function (item) {
            return item && item.label ? String(item.label) : "";
          }).filter(Boolean).join(" · ");
          show(managementNode, true);
        }

        return readyModel;
      } catch (error) {
        hidePermissionsSurface(permissionsItem, managementNode);
        return null;
      }
    }

    return Object.freeze({
      prepareForMenuOpen: prepareForMenuOpen
    });
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

  function applyMenuInteractions(menuButton, menuPanel, onOpen) {
    if (!menuButton || !menuPanel) return;

    const closeMenu = function () {
      menuPanel.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
    };

    const openMenu = function () {
      menuPanel.hidden = false;
      menuButton.setAttribute("aria-expanded", "true");
      if (typeof onOpen === "function") {
        Promise.resolve(onOpen()).catch(function () {
          // Fail closed inside the permissions adapter; do not surface security details.
        });
      }
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

  function runtimeTargetId() {
    let sessionUserId = "";
    if (window.Clerk && window.Clerk.user && window.Clerk.user.id) {
      sessionUserId = String(window.Clerk.user.id);
    }
    const params = new URLSearchParams(window.location.search);
    return String(params.get("subject") || sessionUserId || "").trim();
  }

  function buildSubjectFromRuntime() {
    let sessionUser = null;
    if (window.Clerk && window.Clerk.user && window.Clerk.user.id) {
      sessionUser = { id: String(window.Clerk.user.id) };
    }

    const subjectUserId = runtimeTargetId();
    const draft = pr38Summary && pr38Summary.readDraftFromStorage ? pr38Summary.readDraftFromStorage(window.localStorage) : null;

    return contract.createProfileSubject({
      sessionUser: sessionUser,
      subjectUserId: subjectUserId,
      profileSource: {
        displayName: "مستخدم VVIP",
        publicUsername: "",
        publicBio: "نبذة العضو ستظهر بعد التفعيل الرسمي.",
        publicLocation: "",
        accountType: "",
        publishingPermission: "none",
        accountStatus: "active"
      },
      accountTypeDraft: draft
    });
  }

  function bootstrapMemberProfile() {
    const root = document.querySelector("[data-pr39-member-profile]");
    if (!root || !contract) return;

    const subject = buildSubjectFromRuntime();
    if (subject.mode === contract.AUTH_REQUIRED) {
      window.location.replace("index.html");
      return;
    }

    const state = createViewState(subject);
    const accountType = draftAccountTypeInfo();
    setText(root.querySelector("[data-pr39-name]"), subject.displayName);
    setText(root.querySelector("[data-pr39-username]"), subject.publicUsername ? "@" + subject.publicUsername : "@");
    setText(root.querySelector("[data-pr39-bio]"), subject.publicBio);
    setText(root.querySelector("[data-pr39-location]"), subject.publicLocation || "الموقع المسموح بعرضه غير متاح حاليًا.");
    setText(root.querySelector("[data-pr39-account-type]"), accountType.name);
    setText(root.querySelector("[data-pr39-account-type-status]"), accountType.isDraft ? "اختيار غير مفعّل رسميًا بعد." : "موثق رسميًا.");
    setText(root.querySelector("[data-pr39-permission]"), subject.publishingPermission === "none" ? "النشر غير مفعّل." : subject.publishingPermission);

    const ownerTools = root.querySelector("[data-pr39-owner-tools]");
    const memberTools = root.querySelector("[data-pr39-member-tools]");
    const messageButton = root.querySelector("[data-pr39-message]");
    show(messageButton, subject.canMessage);

    const applyMode = function () {
      const ownerVisible = state.activeMode === contract.OWNER_VIEW;
      const memberVisible = state.activeMode === contract.AUTHORIZED_MEMBER_VIEW;
      show(ownerTools, ownerVisible);
      show(memberTools, memberVisible);
      root.querySelectorAll("[data-pr39-owner-nav]").forEach(function (node) {
        show(node, ownerVisible);
      });
      root.setAttribute("data-mode", state.activeMode);
      const menu = createMenuModel(subject);
      setText(root.querySelector("[data-pr39-menu-summary]"), menu.items.join(" | "));
      syncMenuItems(root, menu.items);
    };

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
    const permissionsItem = root.querySelector("[data-pr39-permissions-item]");
    const permissionsManagement = root.querySelector("[data-pr39-permissions-management]");
    const authorizationRuntime = window.VVIP_AUTHORIZATION_RUNTIME;
    const runtimeAdapter = createPermissionsRuntimeAdapter({
      targetId: runtimeTargetId(),
      permissionsItem: permissionsItem,
      managementNode: permissionsManagement,
      permissionsControl: permissionsControl,
      loadCapabilitySnapshot: authorizationRuntime && typeof authorizationRuntime.loadCapabilitySnapshot === "function"
        ? authorizationRuntime.loadCapabilitySnapshot.bind(authorizationRuntime)
        : null
    });
    applyMenuInteractions(menuButton, menuPanel, runtimeAdapter.prepareForMenuOpen);

    if (menuPanel) {
      menuPanel.addEventListener("click", function (event) {
        const item = event.target.closest("[data-pr39-menu-item]");
        if (!item) return;
        const action = item.getAttribute("data-pr39-menu-item");
        if (action === "settings") {
          window.location.href = "account-settings-p05.html";
          return;
        }
        if (action === "tigerCare") {
          if (status) status.textContent = "تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.";
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
    document.addEventListener("DOMContentLoaded", bootstrapMemberProfile);
  }

  window.VVIP_PR39_PROFILE_CONTROLLER = Object.freeze({
    createViewState: createViewState,
    createMenuModel: createMenuModel,
    createPermissionsRuntimeAdapter: createPermissionsRuntimeAdapter,
    logoutSessionOnly: logoutSessionOnly,
    syncMenuItems: syncMenuItems,
    buildSubjectFromRuntime: buildSubjectFromRuntime
  });
}(window, document));
