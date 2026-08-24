(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialProfileController = api;
    if (root.document && typeof root.addEventListener === "function") {
      api.installCurrentSocialProfile(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const CURSOR_PATTERN = /^[A-Za-z0-9_-]{8,2048}$/;
  const EDIT_INTENT = Object.freeze({ name: "SOCIAL_PROFILE_EDIT" });

  function frozen(value) {
    return Object.freeze(value);
  }

  function failure(code) {
    return frozen({ ok: false, code });
  }

  function validProfileId(value) {
    return typeof value === "string" && UUID_PATTERN.test(value);
  }

  function optionalText(value) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    return text || null;
  }

  function statusText(node, message) {
    if (node) node.textContent = message;
  }

  function textNode(documentObject, tagName, className, text) {
    const node = documentObject.createElement(tagName);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function createProfileController(options) {
    const documentObject = options && options.document;
    const runtime = options && options.runtime;
    const readModel = options && options.readModel;
    const shell = options && options.shell;
    const heading = options && options.heading;
    const avatar = options && options.avatar;
    const details = options && options.details;
    const counts = options && options.counts;
    const timeline = options && options.timeline;
    const unavailable = options && options.unavailable;
    const status = options && options.status;
    const editButton = options && options.editButton;
    const editForm = options && options.editForm;
    const displayName = options && options.displayName;
    const avatarUrl = options && options.avatarUrl;
    const businessName = options && options.businessName;
    const location = options && options.location;
    const specialization = options && options.specialization;
    const businessDescription = options && options.businessDescription;
    const saveButton = options && options.saveButton;
    const messageButton = options && options.messageButton;
    const auth = options && options.auth;
    const onProfileNavigate = options && options.onProfileNavigate;
    const onMessage = options && options.onMessage;
    const onPostsRendered = options && options.onPostsRendered;
    const renderPost = options && options.renderPost;

    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_PROFILE_DOCUMENT_REQUIRED");
    }
    if (!runtime || !runtime.profiles
        || typeof runtime.profiles.get !== "function"
        || typeof runtime.profiles.listPosts !== "function"
        || typeof runtime.profiles.save !== "function") {
      throw new TypeError("SOCIAL_PROFILE_RUNTIME_REQUIRED");
    }
    if (!readModel || typeof readModel.normalizeProfileSurface !== "function") {
      throw new TypeError("SOCIAL_PROFILE_READ_MODEL_REQUIRED");
    }
    if (!shell || !heading || !details || !counts || !timeline || !status) {
      throw new TypeError("SOCIAL_PROFILE_NODES_REQUIRED");
    }
    if (typeof renderPost !== "function") {
      throw new TypeError("SOCIAL_PROFILE_POST_RENDERER_REQUIRED");
    }

    let generation = 0;
    let currentProfile = null;
    let requestedProfileId = null;
    let nextCursor = null;
    let renderedPostIds = new Set();

    function clearSurface(view) {
      shell.dataset.socialProfileView = view;
      heading.textContent = "";
      details.replaceChildren();
      counts.replaceChildren();
      timeline.replaceChildren();
      if (avatar) {
        avatar.replaceChildren?.();
        avatar.textContent = "V";
      }
      if (editButton) editButton.hidden = true;
      if (editForm) editForm.hidden = true;
      if (messageButton) messageButton.hidden = true;
      if (unavailable) unavailable.hidden = view !== "unavailable";
      currentProfile = null;
      nextCursor = null;
      renderedPostIds = new Set();
    }

    function populateEditor(profile) {
      if (displayName) displayName.value = profile.display_name;
      if (avatarUrl) avatarUrl.value = profile.avatar_url || "";
      if (businessName) businessName.value = profile.business_name || "";
      if (location) location.value = profile.location || "";
      if (specialization) specialization.value = profile.specialization || "";
      if (businessDescription) businessDescription.value = profile.business_description || "";
    }

    function renderProfile(profile) {
      currentProfile = profile;
      shell.dataset.socialProfileView = profile.viewer_is_owner ? "own" : "public";
      heading.textContent = profile.display_name;
      statusText(status, "");
      if (unavailable) unavailable.hidden = true;

      if (avatar) {
        avatar.replaceChildren?.();
        if (profile.avatar_url) {
          const image = documentObject.createElement("img");
          image.src = profile.avatar_url;
          image.alt = "";
          image.loading = "lazy";
          image.referrerPolicy = "no-referrer";
          avatar.append(image);
        } else {
          avatar.textContent = profile.display_name.trim().slice(0, 1).toUpperCase() || "V";
        }
      }

      const presentation = [
        ["social-profile__business", profile.business_name],
        ["social-profile__location", profile.location],
        ["social-profile__specialization", profile.specialization],
        ["social-profile__description", profile.business_description],
      ];
      details.replaceChildren(...presentation
        .filter((entry) => entry[1])
        .map((entry) => textNode(documentObject, "p", entry[0], entry[1])));

      const countEntries = [
        [profile.posts_count, "منشور"],
        [profile.friends_count, "صديق"],
        [profile.followers_count, "متابع"],
        [profile.following_count, "يتابع"],
      ];
      counts.replaceChildren(...countEntries.map((entry) => {
        const node = documentObject.createElement("div");
        node.className = "social-profile-count";
        node.append(
          textNode(documentObject, "strong", "social-profile-count__value", String(entry[0])),
          textNode(documentObject, "span", "social-profile-count__label", entry[1])
        );
        return node;
      }));

      if (editButton) editButton.hidden = !profile.viewer_is_owner;
      if (editForm) editForm.hidden = true;
      if (messageButton) messageButton.hidden = profile.viewer_is_owner || !profile.can_message;
      if (profile.viewer_is_owner) populateEditor(profile);
    }

    function renderTimelineState(message, state) {
      const node = textNode(documentObject, "p", "social-feed-state", message);
      node.setAttribute("data-social-feed-state", state);
      node.setAttribute("role", "status");
      timeline.replaceChildren(node);
    }

    function appendPage(rows, reset) {
      const nodes = [];
      for (const row of rows) {
        if (!row || typeof row !== "object" || typeof row.post_id !== "string") return false;
        if (renderedPostIds.has(row.post_id)) continue;
        const node = renderPost(row, function (profileId) {
          if (validProfileId(profileId) && typeof onProfileNavigate === "function") {
            onProfileNavigate(profileId);
          }
        });
        if (!node) return false;
        renderedPostIds.add(row.post_id);
        nodes.push(node);
      }

      const existing = reset ? [] : Array.from(timeline.children || []).filter((node) => (
        !node.getAttribute || node.getAttribute("data-social-profile-load-more") === null
      ));
      const combined = existing.concat(nodes);
      if (nextCursor) {
        const more = documentObject.createElement("button");
        more.type = "button";
        more.className = "social-feed-load-more";
        more.setAttribute("data-social-profile-load-more", "");
        more.textContent = "تحميل المزيد";
        more.addEventListener("click", function () { void loadNext(); });
        combined.push(more);
      }
      timeline.replaceChildren(...combined);
      if (typeof onPostsRendered === "function") onPostsRendered(nodes);
      return true;
    }

    async function readTimeline(profileId, cursor, reset, expectedGeneration) {
      let response;
      try {
        response = await runtime.profiles.listPosts(profileId, { cursor, limit: 20 });
      } catch (_) {
        response = null;
      }
      if (expectedGeneration !== generation) return failure("SOCIAL_PROFILE_LOAD_SUPERSEDED");
      const value = response && response.ok === true ? response.value : null;
      if (!value || value.ok !== true || !Array.isArray(value.items)) {
        renderTimelineState("تعذر تحميل منشورات الملف الآن.", "error");
        return failure("SOCIAL_PROFILE_TIMELINE_FAILED");
      }
      const cursorValue = value.next_cursor === null || value.next_cursor === undefined
        ? null
        : value.next_cursor;
      if (cursorValue !== null && (typeof cursorValue !== "string" || !CURSOR_PATTERN.test(cursorValue))) {
        renderTimelineState("تعذر تحميل منشورات الملف الآن.", "error");
        return failure("SOCIAL_PROFILE_TIMELINE_INVALID");
      }
      nextCursor = cursorValue;
      if (value.items.length === 0 && reset && !nextCursor) {
        renderTimelineState("لا توجد منشورات متاحة في هذا الملف.", "empty");
        return frozen({ ok: true, count: 0, empty: true });
      }
      if (!appendPage(value.items, reset)) {
        renderTimelineState("تعذر تحميل منشورات الملف الآن.", "error");
        return failure("SOCIAL_PROFILE_TIMELINE_INVALID");
      }
      return frozen({ ok: true, count: value.items.length, hasMore: Boolean(nextCursor) });
    }

    async function load(profileId) {
      if (profileId !== null && profileId !== undefined && !validProfileId(profileId)) {
        return failure("SOCIAL_INVALID_PROFILE_ID");
      }
      generation += 1;
      const loadGeneration = generation;
      requestedProfileId = profileId === null || profileId === undefined ? null : profileId;
      clearSurface("loading");
      statusText(status, "جارٍ تحميل الملف الشخصي…");

      let response;
      try {
        response = await runtime.profiles.get(requestedProfileId === null ? undefined : requestedProfileId);
      } catch (_) {
        response = null;
      }
      if (loadGeneration !== generation) return failure("SOCIAL_PROFILE_LOAD_SUPERSEDED");

      const surface = response && response.ok === true
        ? readModel.normalizeProfileSurface(response.value)
        : null;
      if (!surface) {
        clearSurface("error");
        statusText(status, "تعذر تحميل الملف الشخصي الآن.");
        return failure("SOCIAL_PROFILE_LOAD_FAILED");
      }
      if (surface.status === "profile_unavailable") {
        clearSurface("unavailable");
        statusText(status, "هذا الملف غير متاح.");
        return frozen({ ok: true, status: "profile_unavailable" });
      }

      renderProfile(surface.profile);
      renderTimelineState("جارٍ تحميل المنشورات…", "loading");
      const timelineResult = await readTimeline(surface.profile.profile_id, null, true, loadGeneration);
      if (!timelineResult.ok) return timelineResult;
      return frozen({ ok: true, status: "profile_loaded", profileId: surface.profile.profile_id });
    }

    async function loadNext() {
      if (!currentProfile || !nextCursor) return frozen({ ok: true, count: 0, hasMore: false });
      return readTimeline(currentProfile.profile_id, nextCursor, false, generation);
    }

    async function save() {
      if (!currentProfile || !currentProfile.viewer_is_owner) {
        return failure("SOCIAL_PROFILE_OWNER_REQUIRED");
      }
      if (!auth || typeof auth.requireAuth !== "function") {
        return failure("SOCIAL_PROFILE_AUTH_REQUIRED");
      }

      const draft = {
        displayName: optionalText(displayName && displayName.value),
        avatarUrl: optionalText(avatarUrl && avatarUrl.value),
        businessName: optionalText(businessName && businessName.value),
        location: optionalText(location && location.value),
        specialization: optionalText(specialization && specialization.value),
        businessDescription: optionalText(businessDescription && businessDescription.value),
      };
      if (!draft.displayName) {
        statusText(status, "الاسم مطلوب.");
        return failure("SOCIAL_INVALID_PROFILE_DRAFT");
      }

      let result = null;
      let granted = false;
      if (saveButton) saveButton.disabled = true;
      statusText(status, "جارٍ حفظ الملف…");
      try {
        granted = await auth.requireAuth(EDIT_INTENT, async function () {
          result = await runtime.profiles.save(draft);
          return result;
        });
      } catch (_) {
        result = null;
      }
      if (saveButton) saveButton.disabled = false;
      if (!granted || !result || result.ok !== true) {
        statusText(status, "تعذر حفظ الملف. بقيت تعديلاتك ويمكنك المحاولة مرة أخرى.");
        return failure("SOCIAL_PROFILE_SAVE_FAILED");
      }
      statusText(status, "تم حفظ الملف.");
      return load(requestedProfileId);
    }

    async function message() {
      if (!currentProfile || currentProfile.viewer_is_owner || !currentProfile.can_message
          || typeof onMessage !== "function") {
        return failure("SOCIAL_PROFILE_MESSAGE_UNAVAILABLE");
      }
      return onMessage(currentProfile.profile_id);
    }

    function openEditor() {
      if (!currentProfile || !currentProfile.viewer_is_owner || !editForm) return false;
      editForm.hidden = false;
      if (displayName && typeof displayName.focus === "function") displayName.focus();
      return true;
    }

    return frozen({ load, loadNext, save, message, openEditor });
  }

  function mountCurrentSocialProfile(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    const runtimeApi = runtimeRoot && runtimeRoot.TIGERSocialRuntime;
    const profileModel = runtimeRoot && runtimeRoot.TIGERSocialProfile;
    const feedModel = runtimeRoot && runtimeRoot.TIGERSocialFeed;
    const feedController = runtimeRoot && runtimeRoot.TIGERSocialFeedController;
    if (!documentObject || !runtimeApi || !profileModel || !feedModel || !feedController
        || typeof runtimeApi.createCurrentSocialRuntime !== "function"
        || typeof feedModel.normalizeFeedPost !== "function"
        || typeof feedController.createSocialPostNode !== "function") {
      return null;
    }

    const query = (selector) => documentObject.querySelector(selector);
    const controller = createProfileController({
      document: documentObject,
      runtime: runtimeApi.createCurrentSocialRuntime(runtimeRoot),
      readModel: profileModel,
      shell: query("[data-social-profile]"),
      heading: query("[data-social-profile-name]"),
      avatar: query("[data-social-profile-avatar]"),
      details: query("[data-social-profile-details]"),
      counts: query("[data-social-profile-counts]"),
      timeline: query("[data-social-profile-timeline]"),
      unavailable: query("[data-social-profile-unavailable]"),
      status: query("[data-social-profile-status]"),
      editButton: query("[data-social-profile-edit]"),
      editForm: query("[data-social-profile-edit-form]"),
      displayName: query("[data-social-profile-display-name]"),
      avatarUrl: query("[data-social-profile-avatar-url]"),
      businessName: query("[data-social-profile-business-name]"),
      location: query("[data-social-profile-location]"),
      specialization: query("[data-social-profile-specialization]"),
      businessDescription: query("[data-social-profile-description]"),
      saveButton: query("[data-social-profile-save]"),
      messageButton: query("[data-social-profile-message]"),
      auth: runtimeRoot.VVIP_AUTH,
      renderPost: function (row) {
        const normalized = feedModel.normalizeFeedPost(row);
        return normalized && normalized.ok === true
          ? feedController.createSocialPostNode(documentObject, normalized.value)
          : null;
      },
      onProfileNavigate: function (profileId) {
        if (runtimeRoot.TIGERSocialShell && typeof runtimeRoot.TIGERSocialShell.openProfile === "function") {
          runtimeRoot.TIGERSocialShell.openProfile(profileId);
        }
      },
      onMessage: async function (profileId) {
        const messaging = runtimeRoot.TIGERSocialMessagingCurrent;
        if (!messaging || typeof messaging.startConversation !== "function") {
          return failure("SOCIAL_PROFILE_MESSAGE_UNAVAILABLE");
        }
        const result = await messaging.startConversation(profileId);
        if (result && result.ok && runtimeRoot.TIGERSocialShell) {
          runtimeRoot.TIGERSocialShell.showDestination("messages");
        }
        return result;
      },
      onPostsRendered: function () {
        const reactions = runtimeRoot.TIGERSocialReactions;
        const comments = runtimeRoot.TIGERSocialComments;
        if (reactions && typeof reactions.mountCurrentSocialReactions === "function") {
          reactions.mountCurrentSocialReactions(runtimeRoot);
        }
        if (comments && typeof comments.mountCurrentSocialComments === "function") {
          comments.mountCurrentSocialComments(runtimeRoot);
        }
        if (typeof runtimeRoot.CustomEvent === "function") {
          documentObject.dispatchEvent(new runtimeRoot.CustomEvent("vvip:social-posts-rendered"));
        }
      },
    });

    query("[data-social-profile-edit]")?.addEventListener("click", function () {
      controller.openEditor();
    });
    query("[data-social-profile-edit-form]")?.addEventListener("submit", function (event) {
      event.preventDefault();
      void controller.save();
    });
    query("[data-social-profile-message]")?.addEventListener("click", function () {
      void controller.message();
    });
    runtimeRoot.TIGERSocialProfileCurrent = controller;
    return controller;
  }

  function installCurrentSocialProfile(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    if (!documentObject || typeof runtimeRoot.addEventListener !== "function") {
      return frozen({ installed: false });
    }

    let resolveReady;
    const readyController = new Promise((resolve) => { resolveReady = resolve; });
    runtimeRoot.TIGERSocialProfileReady = readyController;
    let started = false;
    const mount = function () {
      let controller = null;
      try {
        controller = mountCurrentSocialProfile(runtimeRoot);
      } catch (_) {
        statusText(documentObject.querySelector("[data-social-profile-status]"), "تعذر تجهيز الملف الشخصي الآن.");
      }
      resolveReady(controller);
      return controller;
    };
    const start = function () {
      if (started) return;
      started = true;
      const ready = runtimeRoot.VVIPRuntimeReady;
      if (ready && typeof ready.then === "function") {
        ready.then(mount).catch(function () { resolveReady(null); });
      } else if (runtimeRoot.VVIP_SUPABASE) {
        mount();
      } else {
        runtimeRoot.addEventListener("vvip:runtime-ready", mount, { once: true });
        runtimeRoot.addEventListener("vvip:runtime-error", function () { resolveReady(null); }, { once: true });
      }
    };

    if (documentObject.readyState === "loading") {
      runtimeRoot.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
    return frozen({ installed: true, start, ready: readyController });
  }

  return frozen({
    createProfileController,
    mountCurrentSocialProfile,
    installCurrentSocialProfile,
  });
});
